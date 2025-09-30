import { EventEmitter } from './events.js';
import { GridRenderLayer } from './GridRenderLayer.js';
import { COORDINATE_CONFIGS } from './coordinate_configs.js';
import { getUnitConversionFunction } from './unitConversions.js';
import { DICTIONARIES, MODEL_CONFIGS } from './model-definitions.js';
import { DEFAULT_COLORMAPS } from './default-colormaps.js';
import proj4 from 'proj4';

// Helper function from your provided code
function hrdpsObliqueTransform(rotated_lon, rotated_lat) {
    const o_lat_p = 53.91148; const o_lon_p = 245.305142;
    const DEG_TO_RAD = Math.PI / 180.0; const RAD_TO_DEG = 180.0 / Math.PI;
    const o_lat_p_rad = o_lat_p * DEG_TO_RAD;
    const rot_lon_rad = rotated_lon * DEG_TO_RAD;
    const rot_lat_rad = rotated_lat * DEG_TO_RAD;
    const sin_rot_lat = Math.sin(rot_lat_rad); const cos_rot_lat = Math.cos(rot_lat_rad);
    const sin_rot_lon = Math.sin(rot_lon_rad); const cos_rot_lon = Math.cos(rot_lon_rad);
    const sin_o_lat_p = Math.sin(o_lat_p_rad); const cos_o_lat_p = Math.cos(o_lat_p_rad);
    const sin_lat = cos_o_lat_p * sin_rot_lat + sin_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lat = Math.asin(sin_lat) * RAD_TO_DEG;
    const sin_lon_num = cos_rot_lat * sin_rot_lon;
    const sin_lon_den = -sin_o_lat_p * sin_rot_lat + cos_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lon = Math.atan2(sin_lon_num, sin_lon_den) * RAD_TO_DEG + o_lon_p;
    if (lon > 180) lon -= 360; else if (lon < -180) lon += 360;
    return [lon, lat];
}

function findLatestModelRun(modelsData, modelName) {
    const model = modelsData?.[modelName];
    if (!model) return null;
    const availableDates = Object.keys(model).sort((a, b) => b.localeCompare(a));
    for (const date of availableDates) {
        const runs = model[date];
        if (!runs) continue;
        const availableRuns = Object.keys(runs).sort((a, b) => b.localeCompare(a));
        if (availableRuns.length > 0) return { date: date, run: availableRuns[0] };
    }
    return null;
}

export class FillLayerManager extends EventEmitter {
    constructor(map, options = {}) {
        super();
        if (!map) throw new Error('A Mapbox GL map instance is required.');

        this.map = map;
        this.layers = new Map();
        this.layerId = options.id || `weather-layer-${Math.random().toString(36).substr(2, 9)}`;
        this.baseUrl = 'https://d3dc62msmxkrd7.cloudfront.net/grids';
        this.worker = this.createWorker();
        this.workerRequestId = 0;
        this.workerResolvers = new Map();
        this.worker.addEventListener('message', this._handleWorkerMessage.bind(this));
        this.statusUrl = 'https://d3dc62msmxkrd7.cloudfront.net/model-status';
        this.modelStatus = null;
        this.loadStrategy = options.loadStrategy || 'on-demand';
        this.dataCache = new Map();
        this.isPlaying = false;
        this.playIntervalId = null;
        this.playbackSpeed = options.playbackSpeed || 500;
        this.customColormaps = options.customColormaps || {};
        const userLayerOptions = options.layerOptions || {};
        const initialVariable = userLayerOptions.variable || '2t_2';
        const { colormap, baseUnit } = this._getColormapForVariable(initialVariable);
        this.baseLayerOptions = { ...userLayerOptions, variable: initialVariable, colormap, colormapBaseUnit: baseUnit };
        this.state = { model: userLayerOptions.model || 'gfs', variable: initialVariable, date: null, run: null, forecastHour: 0, visible: true, opacity: userLayerOptions.opacity ?? 1, units: options.initialUnit || 'imperial' };
        this.autoRefreshEnabled = options.autoRefresh ?? false;
        this.autoRefreshIntervalSeconds = options.autoRefreshInterval ?? 60;
        this.autoRefreshIntervalId = null;
    }

    getAvailableVariables(modelName = null) {
        const model = modelName || this.state.model;
        return MODEL_CONFIGS[model]?.vars || [];
    }

    getVariableDisplayName(variableCode) {
        const varInfo = DICTIONARIES.fld[variableCode];
        return varInfo?.displayName || varInfo?.name || variableCode;
    }

    _handleWorkerMessage(e) {
        const { success, requestId, decompressedData, encoding, error } = e.data;
        if (this.workerResolvers.has(requestId)) {
            const { resolve, reject } = this.workerResolvers.get(requestId);
            if (success) {
                const result = { data: decompressedData, encoding: encoding };
                resolve(result);
            } else {
                reject(new Error(error));
            }
            this.workerResolvers.delete(requestId);
        }
    }

    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        clearInterval(this.playIntervalId);
        this.playIntervalId = setInterval(() => { this.step(1); }, this.playbackSpeed);
        this.emit('playback:start', { speed: this.playbackSpeed });
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearInterval(this.playIntervalId);
        this.playIntervalId = null;
        this.emit('playback:stop');
    }

    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    }

    step(direction = 1) {
        const { model, date, run, forecastHour } = this.state;
        const forecastHours = this.modelStatus?.[model]?.[date]?.[run];
        if (!forecastHours || forecastHours.length === 0) return;
        const currentIndex = forecastHours.indexOf(forecastHour);
        if (currentIndex === -1) return;
        const maxIndex = forecastHours.length - 1;
        let nextIndex = currentIndex + direction;
        if (nextIndex > maxIndex) nextIndex = 0;
        if (nextIndex < 0) nextIndex = maxIndex;
        this.setState({ forecastHour: forecastHours[nextIndex] });
    }
    
    setPlaybackSpeed(speed) {
        if (speed > 0) {
            this.playbackSpeed = speed;
            if (this.isPlaying) this.play();
        }
    }

    /**
     * Lightweight update path for when only the forecast hour changes.
     * This method fetches new grid data and updates the GPU texture without
     * recalculating the underlying map geometry.
     * @private
     */
    async _updateLayerData(state) {
        const grid = await this._loadGridData(state);
        const layer = this.layers.get(this.layerId);

        if (grid && grid.data && layer) {
            const { shaderLayer } = layer;
            const gridDef = this._getGridCornersAndDef(state.model).gridDef;

            // 1. Update ONLY the data texture
            shaderLayer.updateDataTexture(
                grid.data, 
                grid.encoding, 
                gridDef.grid_params.nx, 
                gridDef.grid_params.ny
            );
            
            // 2. Ensure opacity is correct
            shaderLayer.updateStyle({ opacity: this.state.opacity });
            
            // 3. Trigger a repaint
            this.map.triggerRepaint();
        }
    }

    async setState(newState) {
        const modelChanged = newState.model && newState.model !== this.state.model;
        const runChanged = newState.date && newState.run && (newState.date !== this.state.date || newState.run !== this.state.run);
        const variableChanged = newState.variable && newState.variable !== this.state.variable;
        const hourChanged = newState.forecastHour !== undefined && newState.forecastHour !== this.state.forecastHour;

        // *** NEW LOGIC: Determine if this is a lightweight update ***
        const isOnlyTimeChange = hourChanged && !modelChanged && !runChanged && !variableChanged;

        // Update the internal state immediately
        const previousState = { ...this.state };
        Object.assign(this.state, newState);

        // If the model or run changed, clear the cache as the data is no longer relevant
        if (modelChanged || runChanged || variableChanged) {
            if (this.layers.has(this.layerId)) {
                // Immediately hide the old layer to prevent showing stale data
                this.layers.get(this.layerId).shaderLayer.updateStyle({ opacity: 0 });
                this.map.triggerRepaint();
            }
            this.dataCache.clear();
        }

        // --- Emit state change event for the UI (this part remains the same) ---
        const baseColormap = this.baseLayerOptions.colormap;
        const fromUnit = this.baseLayerOptions.colormapBaseUnit;
        const toUnit = this._getTargetUnit(fromUnit, this.state.units);
        const displayColormap = this._convertColormapUnits(baseColormap, fromUnit, toUnit);
        this.emit('state:change', {
            /* ... all the state properties for the UI ... */
            ...this.state,
            availableModels: this.modelStatus ? Object.keys(this.modelStatus).sort() : [],
            availableRuns: this.modelStatus?.[this.state.model] || {},
            availableHours: this.modelStatus?.[this.state.model]?.[this.state.date]?.[this.state.run] || [],
            isPlaying: this.isPlaying,
            colormap: displayColormap,
            colormapBaseUnit: toUnit,
        });
        // --- End of UI state emission ---

        // *** HERE IS THE CRITICAL FORK IN LOGIC ***
        if (isOnlyTimeChange) {
            // Lightweight path: Only update the texture data
            await this._updateLayerData(this.state);
        } else {
            // Heavy path: Re-evaluate the entire layer, including geometry
            await this._loadAndRenderGrid(this.state);
        }
        
        // Preloading logic can remain the same
        if ((modelChanged || runChanged || variableChanged) && this.loadStrategy === 'preload') {
            setTimeout(() => this._preloadCurrentRun(), 0);
        }
    }

    async _loadAndRenderGrid(state) {
        const grid = await this._loadGridData(state);
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...state };
            this._updateOrCreateLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
    }
        
    async setVariable(newVariable) {
        if (newVariable === this.state.variable) return;
        const { colormap, baseUnit } = this._getColormapForVariable(newVariable);
        this.baseLayerOptions.variable = newVariable;
        this.baseLayerOptions.colormap = colormap;
        this.baseLayerOptions.colormapBaseUnit = baseUnit;
        await this.setState({ variable: newVariable, forecastHour: 0 });
    }
    
    async setModel(modelName) {
        if (modelName === this.state.model) return;
        if (!this.modelStatus || !this.modelStatus[modelName]) return;
        const latestRun = findLatestModelRun(this.modelStatus, modelName);
        if (latestRun) {
            await this.setState({ model: modelName, date: latestRun.date, run: latestRun.run, forecastHour: 0 });
        }
    }
    
    async setRun(runString) {
        const [date, run] = runString.split(':');
        if (date !== this.state.date || run !== this.state.run) {
            await this.setState({ date, run, forecastHour: 0 });
        }
    }

    async setUnits(newUnits) {
        if (newUnits === this.state.units || !['metric', 'imperial'].includes(newUnits)) return;
        await this.setState({ units: newUnits });
    }

    async initialize(options = {}) {
        await this.fetchModelStatus(true);
        const latestRun = findLatestModelRun(this.modelStatus, this.state.model);
        let initialState = this.state;
        if (latestRun) {
            initialState = { ...this.state, ...latestRun, forecastHour: 0 };
        }
        await this.setState(initialState);
        if (options.autoRefresh ?? this.autoRefreshEnabled) {
            this.startAutoRefresh(options.refreshInterval ?? this.autoRefreshIntervalSeconds);
        }
    }

    _getColormapForVariable(variableName) {
        const customMap = this.customColormaps[variableName];
        if (customMap) {
            if (customMap.units) {
                const currentSystem = this.state.units;
                let targetUnitKey;
                if (currentSystem === 'imperial') targetUnitKey = 'fahrenheit';
                if (currentSystem === 'metric') targetUnitKey = 'celsius';
                if (targetUnitKey && customMap.units[targetUnitKey]?.colormap) {
                    return {
                        colormap: customMap.units[targetUnitKey].colormap,
                        baseUnit: targetUnitKey
                    };
                }
            }
            if (customMap.colormap && customMap.baseUnit) {
                return {
                    colormap: customMap.colormap,
                    baseUnit: customMap.baseUnit
                };
            }
        }

        const cmapKey = DICTIONARIES.variable_cmap?.[variableName] || variableName;
        const defaultColormapSet = DEFAULT_COLORMAPS[cmapKey];
        if (defaultColormapSet) {
            const baseUnit = Object.keys(defaultColormapSet.units)[0];
            return {
                colormap: defaultColormapSet.units[baseUnit].colormap,
                baseUnit: baseUnit
            };
        }

        console.warn(`[Manager] No custom or default colormap found for variable "${variableName}". Using fallback.`);
        return {
            colormap: [0, '#000000', 1, '#ffffff'],
            baseUnit: 'unknown'
        };
    }

    _convertColormapUnits(colormap, fromUnits, toUnits) {
        if (fromUnits === toUnits) return colormap;
        const conversionFunc = getUnitConversionFunction(fromUnits, toUnits);
        if (!conversionFunc) return colormap;
        const newColormap = [];
        for (let i = 0; i < colormap.length; i += 2) {
            newColormap.push(conversionFunc(colormap[i]), colormap[i + 1]);
        }
        return newColormap;
    }

    /**
     * NEW: Replaces the old corner calculation with the more robust logic from your code.
     * @private
     */
    _getGridCornersAndDef(model) {
        const gridDef = { ...COORDINATE_CONFIGS[model], modelName: model };
        if (!gridDef) return null;

        const { nx, ny } = gridDef.grid_params;
        const gridType = gridDef.type;
        let corners;

        if (gridType === 'latlon') {
            let { lon_first, lat_first, lat_last, lon_last, dx_degrees, dy_degrees } = gridDef.grid_params;
            corners = {
                lon_tl: lon_first,
                lat_tl: lat_first,
                lon_tr: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees),
                lat_tr: lat_first,
                lon_bl: lon_first,
                lat_bl: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
                lon_br: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees),
                lat_br: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
            };
        } else if (gridType === 'rotated_latlon') {
            const [lon_tl, lat_tl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first);
            const [lon_tr, lat_tr] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first);
            const [lon_bl, lat_bl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            const [lon_br, lat_br] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else if (gridType === 'lambert_conformal_conic' || gridType === 'polar_stereographic') {
            let projString = Object.entries(gridDef.proj_params).map(([k,v]) => `+${k}=${v}`).join(' ');
            if(gridType === 'polar_stereographic') projString += ' +lat_0=90';
            const { x_origin, y_origin, dx, dy } = gridDef.grid_params;
            const [lon_tl, lat_tl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin]);
            const [lon_tr, lat_tr] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin]);
            const [lon_bl, lat_bl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin + (ny - 1) * dy]);
            const [lon_br, lat_br] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin + (ny - 1) * dy]);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else {
            return null; // Unsupported type
        }
        return { corners, gridDef };
    }

    _updateOrCreateLayer(id, options, decompressedData, encoding) {
        const { model, colormap, opacity = 1, visible = true, units, variable } = options;
        
        // --- START OF FIX ---
        const geometry = this._getGridCornersAndDef(model);
        if (!geometry) {
            console.error(`Could not generate geometry for model: ${model}`);
            return;
        }
        const { corners, gridDef } = geometry;
        // --- END OF FIX ---

        const fromUnit = options.colormapBaseUnit;
        const variableInfo = DICTIONARIES.fld[variable] || {};
        const toUnit = this._getTargetUnit(fromUnit, units);
        const finalColormap = this._convertColormapUnits(colormap, fromUnit, toUnit);
        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        const dataNativeUnit = variableInfo.defaultUnit || 'none';

        const layerExists = this.layers.has(id);
        const shaderLayer = layerExists ? this.layers.get(id).shaderLayer : new GridRenderLayer(id);

        if (!layerExists) {
            this.map.addLayer(shaderLayer, 'AML_-_terrain'); 
            this.layers.set(id, { id, shaderLayer, options, visible });
        }
        
        // --- START OF FIX ---
        // Pass both corners and the grid definition to the new, more powerful updateGeometry method
        shaderLayer.updateGeometry(corners, gridDef);
        // --- END OF FIX ---

        shaderLayer.updateDataTexture(decompressedData, encoding, gridDef.grid_params.nx, gridDef.grid_params.ny);
        shaderLayer.updateColormapTexture(finalColormap);
        shaderLayer.updateStyle({ opacity: visible ? opacity : 0, dataRange });
        shaderLayer.setUnitConversion(dataNativeUnit, units);

        this.map.triggerRepaint();
    }
    
    _getTargetUnit(defaultUnit, system) {
        if (system === 'metric') {
            if (['°F', '°C'].includes(defaultUnit)) return 'celsius';
            if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'km/h';
            if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'mm';
        }
        if (['°F', '°C'].includes(defaultUnit)) return 'fahrenheit';
        if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'mph';
        if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'in';
        return defaultUnit;
    }

    createWorker() {
        const workerCode = `
            import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';
            self.onmessage = async (e) => {
                const { requestId, compressedData, encoding } = e.data;
                try {
                    const decompressedDeltas = decompress(compressedData);
                    const expectedLength = encoding.length;
                    const reconstructedData = new Int8Array(expectedLength);
                    if (decompressedDeltas.length > 0 && expectedLength > 0) {
                        reconstructedData[0] = decompressedDeltas[0] > 127 ? decompressedDeltas[0] - 256 : decompressedDeltas[0];
                        for (let i = 1; i < expectedLength; i++) {
                            const delta = decompressedDeltas[i] > 127 ? decompressedDeltas[i] - 256 : decompressedDeltas[i];
                            reconstructedData[i] = reconstructedData[i - 1] + delta;
                        }
                    }
                    const finalData = new Uint8Array(reconstructedData.buffer);
                    self.postMessage({ 
                        success: true, 
                        requestId: requestId, 
                        decompressedData: finalData,
                        encoding: encoding 
                    }, [finalData.buffer]);
                } catch (error) {
                    self.postMessage({ 
                        success: false, 
                        requestId: requestId, 
                        error: error.message 
                    });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }

    async _preloadCurrentRun() {
        const { model, date, run } = this.state;
        const forecastHours = this.modelStatus?.[model]?.[date]?.[run];
        if (!forecastHours || forecastHours.length === 0) return;
        const preloadPromises = forecastHours.map(hour => {
            const stateForHour = { ...this.state, forecastHour: hour };
            return this._loadGridData(stateForHour);
        });
        await Promise.all(preloadPromises);
    }

    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) {
            try {
                const response = await fetch(this.statusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const statusData = await response.json();
                this.modelStatus = statusData.models;
            } catch (error) {
                this.modelStatus = null;
            }
        }
        return this.modelStatus;
    }

    startAutoRefresh(intervalSeconds) {
        const interval = intervalSeconds ?? this.autoRefreshIntervalSeconds ?? 60;
        this.stopAutoRefresh();
        this.autoRefreshIntervalId = setInterval(async () => {
            await this.fetchModelStatus(true);
            this.emit('state:change', this.state);
        }, interval * 1000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshIntervalId) {
            clearInterval(this.autoRefreshIntervalId);
            this.autoRefreshIntervalId = null;
        }
    }
    
    async _loadGridData(state) {
        const { model, date, run, forecastHour, variable, smoothing = 0 } = { ...this.baseLayerOptions, ...state };
        const dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${smoothing || ''}`;

        if (this.dataCache.has(dataUrlIdentifier)) {
            return this.dataCache.get(dataUrlIdentifier);
        }

        const loadPromise = new Promise(async (resolve, reject) => {
            const dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`;
            try {
                const response = await fetch(dataUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status} for ${dataUrl}`);
                const { data: b64Data, encoding } = await response.json();
                const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
                const requestId = this.workerRequestId++;
                this.workerResolvers.set(requestId, { resolve, reject });
                this.worker.postMessage({ requestId, compressedData, encoding }, [compressedData.buffer]);
            } catch (error) {
                reject(error);
            }
        })
        .then(result => {
            this.dataCache.set(dataUrlIdentifier, result);
            return result;
        })
        .catch(error => {
            this.dataCache.delete(dataUrlIdentifier);
            return null;
        });
        
        this.dataCache.set(dataUrlIdentifier, loadPromise);
        return loadPromise;
    }

    removeLayer(id) {
        if (this.layers.has(id)) {
            if (this.map.getLayer(id)) this.map.removeLayer(id);
            this.layers.delete(id);
        }
    }

    destroy() {
        this.pause();
        this.stopAutoRefresh();
        this.removeLayer(this.layerId);
        this.dataCache.clear();
        this.worker.terminate();
        this.callbacks = {};
        console.log(`FillLayerManager with id "${this.layerId}" has been destroyed.`);
    }
}