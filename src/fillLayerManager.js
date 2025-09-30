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
        this.mrmsStatus = null; // ADD THIS
        this.loadStrategy = options.loadStrategy || 'on-demand';
        this.dataCache = new Map();
        this.isPlaying = false;
        this.playIntervalId = null;
        this.playbackSpeed = options.playbackSpeed || 500;
        this.customColormaps = options.customColormaps || {};
        
        const userLayerOptions = options.layerOptions || {};
        const initialVariable = userLayerOptions.variable || null;
        
        let colormap, baseUnit;
        if (initialVariable) {
            const colormapData = this._getColormapForVariable(initialVariable);
            colormap = colormapData.colormap;
            baseUnit = colormapData.baseUnit;
        }
        
        this.baseLayerOptions = { 
            ...userLayerOptions, 
            variable: initialVariable, 
            colormap, 
            colormapBaseUnit: baseUnit 
        };
        
        this.state = { 
            model: userLayerOptions.model || 'gfs',
            isMRMS: false, // ADD THIS
            mrmsTimestamp: null, // ADD THIS
            variable: initialVariable, 
            date: null, 
            run: null, 
            forecastHour: 0, 
            visible: true, 
            opacity: userLayerOptions.opacity ?? 1, 
            units: options.initialUnit || 'imperial' 
        };
        
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
        const startTime = performance.now();
        console.log('[_updateLayerData] START (fallback path)');

        if (!state.variable) return;
        
        const loadStart = performance.now();
        const grid = await this._loadGridData(state);
        console.log('[_updateLayerData] Load grid data took:', (performance.now() - loadStart).toFixed(2), 'ms');

        const layer = this.layers.get(this.layerId);

        if (grid && grid.data && layer) {
            const updateStart = performance.now();
            const { shaderLayer } = layer;
            const gridModel = state.isMRMS ? 'mrms' : state.model;
            const gridDef = this._getGridCornersAndDef(gridModel).gridDef;

            shaderLayer.updateDataTexture(
                grid.data, 
                grid.encoding, 
                gridDef.grid_params.nx, 
                gridDef.grid_params.ny
            );
            
            shaderLayer.updateStyle({ opacity: this.state.opacity });
            this.map.triggerRepaint();
            console.log('[_updateLayerData] Update operations took:', (performance.now() - updateStart).toFixed(2), 'ms');
        }

        console.log('[_updateLayerData] COMPLETE - Total time:', (performance.now() - startTime).toFixed(2), 'ms');
    }

    async setOpacity(newOpacity) {
        // Clamp opacity between 0 and 1
        const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
        
        if (clampedOpacity === this.state.opacity) return;
        
        await this.setState({ opacity: clampedOpacity });
    }
    async setState(newState) {
        const startTime = performance.now();
        console.log('[setState] START', { 
            newState, 
            currentState: this.state 
        });

        const modelChanged = newState.model && newState.model !== this.state.model;
        const runChanged = newState.date && newState.run && (newState.date !== this.state.date || newState.run !== this.state.run);
        const variableChanged = newState.variable !== undefined && newState.variable !== this.state.variable;
        const hourChanged = newState.forecastHour !== undefined && newState.forecastHour !== this.state.forecastHour;
        const mrmsTimestampChanged = newState.mrmsTimestamp !== undefined && newState.mrmsTimestamp !== this.state.mrmsTimestamp;
        const modeChanged = newState.isMRMS !== undefined && newState.isMRMS !== this.state.isMRMS;

        console.log('[setState] Change detection:', {
            modelChanged,
            runChanged,
            variableChanged,
            hourChanged,
            mrmsTimestampChanged,
            modeChanged
        });

        const shouldClearCache = variableChanged || (modeChanged && newState.variable !== null);
        const isOnlyTimeChange = (hourChanged || mrmsTimestampChanged) && !modelChanged && !runChanged && !variableChanged && !modeChanged;

        console.log('[setState] Optimization flags:', {
            shouldClearCache,
            isOnlyTimeChange
        });

        const previousState = { ...this.state };
        Object.assign(this.state, newState);

        if (shouldClearCache) {
            console.log('[setState] Clearing cache and hiding layer');
            if (this.layers.has(this.layerId)) {
                this.layers.get(this.layerId).shaderLayer.updateStyle({ opacity: 0 });
                this.map.triggerRepaint();
            }
            this.dataCache.clear();
        }

        const colormapStart = performance.now();
        let displayColormap = [];
        let toUnit = '';
        
        if (this.state.variable && this.baseLayerOptions.colormap) {
            const baseColormap = this.baseLayerOptions.colormap;
            const fromUnit = this.baseLayerOptions.colormapBaseUnit;
            toUnit = this._getTargetUnit(fromUnit, this.state.units);
            displayColormap = this._convertColormapUnits(baseColormap, fromUnit, toUnit);
        }
        console.log('[setState] Colormap processing took:', (performance.now() - colormapStart).toFixed(2), 'ms');

        let availableTimestamps = [];
        if (this.state.isMRMS && this.state.variable && this.mrmsStatus) {
            const timestamps = this.mrmsStatus[this.state.variable] || [];
            availableTimestamps = [...timestamps].reverse();
        }

        const emitStart = performance.now();
        this.emit('state:change', {
            ...this.state,
            availableModels: this.modelStatus ? Object.keys(this.modelStatus).sort() : [],
            availableRuns: this.modelStatus?.[this.state.model] || {},
            availableHours: this.state.isMRMS ? [] : (this.modelStatus?.[this.state.model]?.[this.state.date]?.[this.state.run] || []),
            availableVariables: this.getAvailableVariables(this.state.isMRMS ? 'mrms' : this.state.model),
            availableTimestamps: availableTimestamps,
            isPlaying: this.isPlaying,
            colormap: displayColormap,
            colormapBaseUnit: toUnit,
        });
        console.log('[setState] Event emission took:', (performance.now() - emitStart).toFixed(2), 'ms');

        const renderStart = performance.now();
        if (isOnlyTimeChange) {
            console.log('[setState] Using FAST PATH for time-only change');
            await this._updateLayerDataFast(this.state);
        } else if (shouldClearCache || !this.layers.has(this.layerId)) {
            console.log('[setState] Using FULL PATH for layer recreation');
            await this._loadAndRenderGrid(this.state);
        }
        console.log('[setState] Render path took:', (performance.now() - renderStart).toFixed(2), 'ms');
        
        if (shouldClearCache && this.loadStrategy === 'preload' && this.state.variable) {
            console.log('[setState] Triggering preload in background');
            if (this.state.isMRMS) {
                setTimeout(() => this._preloadMRMSVariable(), 0);
            } else {
                setTimeout(() => this._preloadCurrentRun(), 0);
            }
        }

        console.log('[setState] COMPLETE - Total time:', (performance.now() - startTime).toFixed(2), 'ms');
    }

    async _updateLayerDataFast(state) {
        const startTime = performance.now();
        console.log('[_updateLayerDataFast] START', { state });

        if (!state.variable) {
            console.log('[_updateLayerDataFast] No variable selected, exiting');
            return;
        }
        
        const layer = this.layers.get(this.layerId);
        if (!layer) {
            console.log('[_updateLayerDataFast] No layer found, exiting');
            return;
        }

        const keyStart = performance.now();
        const { model, date, run, forecastHour, variable, smoothing = 0, isMRMS, mrmsTimestamp } = state;
        let dataUrlIdentifier;
        
        if (isMRMS) {
            if (!mrmsTimestamp) {
                console.log('[_updateLayerDataFast] No MRMS timestamp, exiting');
                return;
            }
            dataUrlIdentifier = `mrms-${mrmsTimestamp}-${variable}-${smoothing || ''}`;
        } else {
            dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${smoothing || ''}`;
        }
        console.log('[_updateLayerDataFast] Cache key:', dataUrlIdentifier);
        console.log('[_updateLayerDataFast] Key generation took:', (performance.now() - keyStart).toFixed(2), 'ms');

        const cacheCheckStart = performance.now();
        const cachedData = this.dataCache.get(dataUrlIdentifier);
        console.log('[_updateLayerDataFast] Cache check took:', (performance.now() - cacheCheckStart).toFixed(2), 'ms');
        
        if (!cachedData) {
            console.warn('[_updateLayerDataFast] ⚠️ Data NOT in cache! Falling back to full load');
            console.log('[_updateLayerDataFast] Current cache keys:', Array.from(this.dataCache.keys()));
            await this._updateLayerData(state);
            return;
        }

        console.log('[_updateLayerDataFast] ✓ Data found in cache');
        
        const awaitStart = performance.now();
        const grid = await cachedData;
        console.log('[_updateLayerDataFast] Await cached data took:', (performance.now() - awaitStart).toFixed(2), 'ms');
        
        if (grid && grid.data) {
            const textureStart = performance.now();
            const { shaderLayer } = layer;
            const gridModel = state.isMRMS ? 'mrms' : state.model;
            const gridDef = this._getGridCornersAndDef(gridModel).gridDef;

            console.log('[_updateLayerDataFast] Grid data size:', grid.data.length, 'bytes');
            console.log('[_updateLayerDataFast] Grid dimensions:', gridDef.grid_params.nx, 'x', gridDef.grid_params.ny);

            shaderLayer.updateDataTexture(
                grid.data, 
                grid.encoding, 
                gridDef.grid_params.nx, 
                gridDef.grid_params.ny
            );
            console.log('[_updateLayerDataFast] Texture update took:', (performance.now() - textureStart).toFixed(2), 'ms');
            
            const repaintStart = performance.now();
            this.map.triggerRepaint();
            console.log('[_updateLayerDataFast] Trigger repaint took:', (performance.now() - repaintStart).toFixed(2), 'ms');
        } else {
            console.error('[_updateLayerDataFast] ❌ Grid data is null or missing');
        }

        console.log('[_updateLayerDataFast] COMPLETE - Total time:', (performance.now() - startTime).toFixed(2), 'ms');
    }

    async _loadAndRenderGrid(state) {
        // Don't load anything if no variable is selected
        if (!state.variable) {
            this.removeLayer(this.layerId);
            return;
        }
        
        const grid = await this._loadGridData(state);
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...state };
            this._updateOrCreateLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
    }
        
    setVariable(variable) {
        const { colormap, baseUnit } = this._getColormapForVariable(variable);
        this.setState({ 
            variable,
            colormap: colormap,
            colormapBaseUnit: baseUnit
        });
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
        await this.fetchMRMSStatus(true); // ADD THIS
        
        const latestRun = findLatestModelRun(this.modelStatus, this.state.model);
        let initialState = this.state;
        if (latestRun && !this.state.isMRMS) {
            initialState = { ...this.state, ...latestRun, forecastHour: 0 };
        }
        await this.setState(initialState);
        if (options.autoRefresh ?? this.autoRefreshEnabled) {
            this.startAutoRefresh(options.refreshInterval ?? this.autoRefreshIntervalSeconds);
        }
    }

    _getColormapForVariable(variable) {
        // Default the key to the variable name itself.
        let colormapKey = variable;

        // Check if an alias exists in our static mapping.
        if (DICTIONARIES.variable_cmap[variable]) {
            colormapKey = DICTIONARIES.variable_cmap[variable];
            console.log(`[DEBUG] _getColormap: Mapped "${variable}" to colormap key "${colormapKey}".`);
        }

        // Use the final key to look up the colormap data.
        const colormapData = this.customColormaps[colormapKey];

        if (colormapData && colormapData.colormap) {
            return {
                colormap: colormapData.colormap,
                baseUnit: colormapData.baseUnit || ''
            };
        }

        // Return a safe, empty default if no colormap is found to prevent crashes.
        console.warn(`[DEBUG] _getColormap: Colormap NOT found for variable "${variable}" (resolved key: "${colormapKey}").`);
        return { colormap: [], baseUnit: '' };
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
        // In the original code, this line was: const { model, ... } = options;
        // We adjust it to explicitly get isMRMS as well.
        const { model, colormap, opacity = 1, visible = true, units, variable, isMRMS } = options;
        
        // ADD THIS LINE: Determine the correct model to use for the geometry lookup.
        const gridModel = isMRMS ? 'mrms' : model;
        // EDIT THIS LINE: Use the new gridModel variable.
        const geometry = this._getGridCornersAndDef(gridModel);
        if (!geometry) {
            console.error(`Could not generate geometry for model: ${gridModel}`);
            return;
        }
        const { corners, gridDef } = geometry;

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
        
        shaderLayer.updateGeometry(corners, gridDef);
        shaderLayer.updateDataTexture(decompressedData, encoding, gridDef.grid_params.nx, gridDef.grid_params.ny);
        shaderLayer.updateColormapTexture(finalColormap);
        
        // Apply the current opacity from state
        shaderLayer.updateStyle({ opacity: visible ? this.state.opacity : 0, dataRange });
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

    async fetchMRMSStatus(force = false) {
        const mrmsStatusUrl = 'https://h3dfvh5pq6euq36ymlpz4zqiha0obqju.lambda-url.us-east-2.on.aws';
        
        if (!this.mrmsStatus || force) {
            try {
                const response = await fetch(mrmsStatusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                const statusData = await response.json();
                this.mrmsStatus = statusData;
            } catch (error) {
                console.error('[FillLayerManager] Failed to fetch MRMS status:', error);
                this.mrmsStatus = null;
            }
        }
        return this.mrmsStatus;
    }

    /**
     * Sets the active MRMS variable, prepares the state, and triggers preloading.
     * Includes detailed logging for debugging.
     *
     * @param {string} variable - The MRMS variable code.
     */
    async setMRMSVariable(variable) {
        const sortedTimestamps = [...(this.mrmsStatus[variable] || [])].sort((a, b) => a - b);
        const initialTimestamp = sortedTimestamps.length > 0 ? sortedTimestamps[sortedTimestamps.length - 1] : null;

        // Use the new helper to get colormap info.
        const { colormap, baseUnit } = this._getColormapForVariable(variable);

        const newState = {
            variable,
            isMRMS: true,
            mrmsTimestamp: initialTimestamp,
            availableTimestamps: sortedTimestamps,
            colormap: colormap,
            colormapBaseUnit: baseUnit,
        };
        
        console.log('[DEBUG] setMRMSVariable: Setting new state:', newState);
        this.setState(newState);

        await this._preloadMRMSVariable();
    }

    /**
     * Preloads all grid data for the currently selected MRMS variable.
     * Includes logging to confirm execution.
     */
    async _preloadMRMSVariable() {
        const { variable } = this.state;
        if (!this.mrmsStatus || !variable) {
            console.log('[DEBUG] _preloadMRMSVariable: Aborting, no variable selected.');
            return;
        }

        const timestamps = this.mrmsStatus[variable] || [];
        console.log(`[DEBUG] _preloadMRMSVariable: Starting preload for ${timestamps.length} timestamps for variable "${variable}".`);

        // We assume the data loading happens inside _loadGridData.
        const preloadPromises = timestamps.map(timestamp => {
            const stateForTimestamp = { ...this.state, mrmsTimestamp: timestamp };
            // This is the function that actually fetches data. We expect it to have its own logs.
            return this._loadGridData(stateForTimestamp);
        });

        await Promise.all(preloadPromises);
        console.log(`[DEBUG] _preloadMRMSVariable: Preload finished for variable "${variable}".`);
    }

    async setMRMSTimestamp(timestamp) {
        if (!this.state.isMRMS) return;
        await this.setState({ mrmsTimestamp: timestamp });
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
        const startTime = performance.now();
        console.log('[_loadGridData] START', { state });

        const { model, date, run, forecastHour, variable, smoothing = 0, isMRMS, mrmsTimestamp } = { ...this.baseLayerOptions, ...state };

        let dataUrlIdentifier;
        let dataUrl;

        if (isMRMS) {
            if (!mrmsTimestamp) {
                console.error("[_loadGridData] Cannot fetch MRMS data without a timestamp.");
                return null;
            }
            const mrmsDate = new Date(mrmsTimestamp * 1000);
            const year = mrmsDate.getUTCFullYear();
            const month = (mrmsDate.getUTCMonth() + 1).toString().padStart(2, '0');
            const day = mrmsDate.getUTCDate().toString().padStart(2, '0');
            const mrmsDateStr = `${year}${month}${day}`;
            
            const effectiveModel = 'mrms';
            dataUrlIdentifier = `${effectiveModel}-${mrmsTimestamp}-${variable}-${smoothing || ''}`;
            dataUrl = `${this.baseUrl}/${effectiveModel}/${mrmsDateStr}/${mrmsTimestamp}/0/${variable}/${smoothing}`;
        } else {
            dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${smoothing || ''}`;
            dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`;
        }

        console.log('[_loadGridData] Data URL:', dataUrl);
        console.log('[_loadGridData] Cache identifier:', dataUrlIdentifier);

        if (this.dataCache.has(dataUrlIdentifier)) {
            console.log('[_loadGridData] ✓ Returning from cache');
            const cached = this.dataCache.get(dataUrlIdentifier);
            console.log('[_loadGridData] COMPLETE (cached) - Total time:', (performance.now() - startTime).toFixed(2), 'ms');
            return cached;
        }

        console.log('[_loadGridData] Cache MISS - fetching from network');

        const loadPromise = new Promise(async (resolve, reject) => {
            try {
                const fetchStart = performance.now();
                const response = await fetch(dataUrl);
                console.log('[_loadGridData] Network fetch took:', (performance.now() - fetchStart).toFixed(2), 'ms');

                if (!response.ok) throw new Error(`HTTP ${response.status} for ${dataUrl}`);
                
                const jsonStart = performance.now();
                const { data: b64Data, encoding } = await response.json();
                console.log('[_loadGridData] JSON parse took:', (performance.now() - jsonStart).toFixed(2), 'ms');
                
                const decodeStart = performance.now();
                const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
                console.log('[_loadGridData] Base64 decode took:', (performance.now() - decodeStart).toFixed(2), 'ms');
                console.log('[_loadGridData] Compressed size:', compressedData.length, 'bytes');

                const workerStart = performance.now();
                const requestId = this.workerRequestId++;
                this.workerResolvers.set(requestId, { resolve, reject });
                console.log('[_loadGridData] Sending to worker, requestId:', requestId);
                this.worker.postMessage({ requestId, compressedData, encoding }, [compressedData.buffer]);
                console.log('[_loadGridData] Worker message sent in:', (performance.now() - workerStart).toFixed(2), 'ms');
            } catch (error) {
                console.error('[_loadGridData] ❌ Error:', error);
                reject(error);
            }
        })
        .then(result => {
            console.log('[_loadGridData] Worker returned successfully');
            this.dataCache.set(dataUrlIdentifier, result);
            console.log('[_loadGridData] COMPLETE (new fetch) - Total time:', (performance.now() - startTime).toFixed(2), 'ms');
            return result;
        })
        .catch(error => {
            console.error(`[_loadGridData] Failed to load from ${dataUrl}:`, error);
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