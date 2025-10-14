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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
export class FillLayerManager extends EventEmitter {
    constructor(map, options = {}) {
        super();
        if (!map) throw new Error('A Mapbox GL map instance is required.');

        this.map = map;
        this.timeLayers = new Map();
        this.activeTimeKey = null; 

        this.layerId = options.id || `weather-layer-${Math.random().toString(36).substr(2, 9)}`;
        this.apiKey = options.apiKey;
        this.baseGridUrl = 'https://d3dc62msmxkrd7.cloudfront.net';
        this.worker = this.createWorker();
        this.workerRequestId = 0;
        this.workerResolvers = new Map();
        this.worker.addEventListener('message', this._handleWorkerMessage.bind(this));
        this.statusUrl = 'https://d3dc62msmxkrd7.cloudfront.net/model-status';
        this.modelStatus = null;
        this.mrmsStatus = null;
        this.dataCache = new Map();
        this.isPlaying = false;
        this.playIntervalId = null;
        this.playbackSpeed = options.playbackSpeed || 500;
        this.customColormaps = options.customColormaps || {};
        
        const userLayerOptions = options.layerOptions || {};
        const initialVariable = userLayerOptions.variable || null;
        
        this.state = { 
            model: userLayerOptions.model || 'gfs',
            isMRMS: false,
            mrmsTimestamp: null,
            variable: initialVariable, 
            date: null, 
            run: null, 
            forecastHour: 0, 
            visible: true, 
            opacity: userLayerOptions.opacity ?? 0.85, 
            units: options.initialUnit || 'imperial',
            shaderSmoothingEnabled: true
        };
        
        this.autoRefreshEnabled = options.autoRefresh ?? false;
        this.autoRefreshIntervalSeconds = options.autoRefreshInterval ?? 60;
        this.autoRefreshIntervalId = null;

        this.PRELOAD_BATCH_SIZE = 5; 
    }

    async _updateLayerData(state) {
        if (!this.shaderLayer || !state.variable) return;

        const grid = await this._loadGridData(state);

        if (grid && grid.data) {
            const gridModel = state.isMRMS ? 'mrms' : state.model;
            const gridDef = this._getGridCornersAndDef(gridModel).gridDef;
            
            // Remove the hardcoded useNearestFilter logic - smoothing handles this now
            this.shaderLayer.updateDataTexture(
                grid.data, 
                grid.encoding, 
                gridDef.grid_params.nx, 
                gridDef.grid_params.ny,
                { useNearestFilter: state.smoothing === 0 } 
            );
            this.map.triggerRepaint();
        }
    }

    _updateLayerStyle(state) {
        if (!this.shaderLayer || !state.variable) return;

        const gridModel = state.isMRMS ? 'mrms' : state.model;
        const geometry = this._getGridCornersAndDef(gridModel);
        if (!geometry) return;

        const { corners, gridDef } = geometry;
        const { colormap, baseUnit } = this._getColormapForVariable(state.variable);
        const toUnit = this._getTargetUnit(baseUnit, state.units);
        
        const finalColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);

        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        
        const dataNativeUnit = (DICTIONARIES.fld[state.variable] || {}).defaultUnit || 'none';

        this.shaderLayer.updateGeometry(corners, gridDef);
        this.shaderLayer.updateColormapTexture(finalColormap);
        this.shaderLayer.updateStyle({ opacity: state.opacity, dataRange });
        this.shaderLayer.setUnitConversion(dataNativeUnit, state.units);
        
        this.map.triggerRepaint();
    }

    async setState(newState) {
        const previousState = { ...this.state };
        Object.assign(this.state, newState);

        const variableChanged = 'variable' in newState && newState.variable !== previousState.variable;
        const runChanged = ('date' in newState && 'run' in newState) && (newState.date !== previousState.date || newState.run !== previousState.run);
        const modelChanged = 'model' in newState && newState.model !== previousState.model;
        const modeChanged = 'isMRMS' in newState && newState.isMRMS !== previousState.isMRMS;
        const unitsChanged = 'units' in newState && newState.units !== previousState.units;
        
        // Check for changes in BOTH smoothing controls using the correct names
        const serverSmoothingChanged = 'smoothing' in newState && newState.smoothing !== previousState.smoothing;
        const shaderSmoothingChanged = 'shaderSmoothingEnabled' in newState && newState.shaderSmoothingEnabled !== previousState.shaderSmoothingEnabled;

        // Use the dedicated boolean state to control the shader
        if (this.shaderLayer && typeof this.shaderLayer.setSmoothing === 'function') {
            // The shader's method expects a 'noSmoothing' flag, so we invert our boolean state
            this.shaderLayer.setSmoothing(!this.state.shaderSmoothingEnabled);
        }

        // If the SERVER smoothing value changes, we must refetch all data.
        const needsFullRebuild = variableChanged || runChanged || modelChanged || modeChanged || serverSmoothingChanged;
        const onlyTimeChanged = !needsFullRebuild && ('forecastHour' in newState || 'mrmsTimestamp' in newState);

        if (needsFullRebuild) {
            await this._rebuildLayerAndPreload(this.state);
        } else if (onlyTimeChanged) {
            await this._updateLayerData(this.state);
        } else if (unitsChanged) {
            this._updateLayerStyle(this.state);
        }

        // If only the client-side shader smoothing changed, we just need to trigger a repaint
        if (shaderSmoothingChanged && this.map) {
            this.map.triggerRepaint();
        }

        this._emitStateChange();
    }

    async _rebuildLayerAndPreload(state) {
        // 1. Clean up old layers and cache
        if (this.shaderLayer) {
            this.map.removeLayer(this.shaderLayer.id);
            this.shaderLayer = null;
        }
        this.dataCache.clear();
        if (!state.variable) return;

        // 2. Set up the new layer's visual style
        this.shaderLayer = new GridRenderLayer(this.layerId);
        this.map.addLayer(this.shaderLayer, 'AML_-_terrain');
        this._updateLayerStyle(state);

        // 3. CRITICAL: Initiate the load for the visible frame.
        // The 'await' is REMOVED. This is now fire-and-forget.
        this._updateLayerData(state); 
        
        // 4. CRITICAL: Immediately initiate the preload for all other frames.
        // This is also fire-and-forget and will run at the same time as the call above.
        this._preloadAllTimeSteps(state); 
    }
    
    _preloadAllTimeSteps(state) {
        const timeSteps = state.isMRMS
            ? (this.mrmsStatus?.[state.variable] || [])
            : (this.modelStatus?.[state.model]?.[state.date]?.[state.run] || []);

        if (!timeSteps || timeSteps.length <= 1) {
            return; // Nothing to preload
        }

        // Get all time steps EXCEPT the one for the visible frame (which was started above)
        const currentFrameTime = state.isMRMS ? state.mrmsTimestamp : state.forecastHour;
        const stepsToPreload = timeSteps.filter(time => time !== currentFrameTime);

        // Use a simple forEach loop to fire all requests immediately and concurrently.
        stepsToPreload.forEach(time => {
            const stateForTime = { ...state, [state.isMRMS ? 'mrmsTimestamp' : 'forecastHour']: time };
            
            // This call just populates the cache.
            this._loadGridData(stateForTime)
                .catch(e => console.warn(`Failed to preload frame for time ${time}`, e));
        });
    }

    // --- NO OTHER CHANGES BELOW THIS LINE ---

    async _initializeLayersForVariable(state) {
        this.timeLayers.forEach(shaderLayer => {
            if (this.map.getLayer(shaderLayer.id)) {
                this.map.removeLayer(shaderLayer.id);
            }
        });
        this.timeLayers.clear();
        this.activeTimeKey = null;

        if (!state.variable) {
            this.map.triggerRepaint();
            return;
        }

        const timeSteps = state.isMRMS
            ? (this.mrmsStatus?.[state.variable] || [])
            : (this.modelStatus?.[state.model]?.[state.date]?.[state.run] || []);

        if (timeSteps.length === 0) return;

        const gridModel = state.isMRMS ? 'mrms' : state.model;
        const geometry = this._getGridCornersAndDef(gridModel);
        if (!geometry) return;
        
        const { corners, gridDef } = geometry;
        const { colormap, baseUnit } = this._getColormapForVariable(state.variable);
        const toUnit = this._getTargetUnit(baseUnit, state.units);
        const finalColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);
        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        const dataNativeUnit = (DICTIONARIES.fld[state.variable] || {}).defaultUnit || 'none';

        timeSteps.forEach(time => {
            const layerId = `${this.layerId}-${time}`;
            const shaderLayer = new GridRenderLayer(layerId);
            
            this.map.addLayer(shaderLayer, 'AML_-_terrain');
            this.timeLayers.set(time, shaderLayer);

            shaderLayer.updateGeometry(corners, gridDef);
            shaderLayer.updateColormapTexture(finalColormap);
            shaderLayer.updateStyle({ opacity: 0, dataRange });
            shaderLayer.setUnitConversion(dataNativeUnit, state.units);

            const stateForTime = { ...state, [state.isMRMS ? 'mrmsTimestamp' : 'forecastHour']: time };
            
            this._loadGridData(stateForTime).then(grid => {
                if (grid && grid.data && this.timeLayers.has(time)) {
                    shaderLayer.updateDataTexture(
                        grid.data, 
                        grid.encoding, 
                        gridDef.grid_params.nx, 
                        gridDef.grid_params.ny
                    );
                }
            }).catch(err => {
                console.error(`Failed to load data for time ${time}:`, err);
            });
        });

        this._setActiveTimeLayer(state);
    }

    _setActiveTimeLayer(state) {
        const timeKey = state.isMRMS ? state.mrmsTimestamp : state.forecastHour;

        if (this.activeTimeKey !== null && this.timeLayers.has(this.activeTimeKey)) {
            this.timeLayers.get(this.activeTimeKey).updateStyle({ opacity: 0 });
        }
        
        if (this.timeLayers.has(timeKey)) {
            const newActiveLayer = this.timeLayers.get(timeKey);
            newActiveLayer.updateStyle({ opacity: this.state.opacity });
            this.activeTimeKey = timeKey;
        } else {
            this.activeTimeKey = null;
        }

        this.map.triggerRepaint();
    }

    async setShaderSmoothing(enabled) {
        if (typeof enabled !== 'boolean' || enabled === this.state.shaderSmoothingEnabled) return;
        
        await this.setState({ shaderSmoothingEnabled: enabled });
    }
    
    async setOpacity(newOpacity) {
        const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
        if (clampedOpacity === this.state.opacity) return;

        this.state.opacity = clampedOpacity;
        if (this.shaderLayer) {
            this.shaderLayer.updateStyle({ opacity: clampedOpacity });
            this.map.triggerRepaint();
        }

        this._emitStateChange();
    }
    
    _emitStateChange() {
        const { colormap, baseUnit } = this._getColormapForVariable(this.state.variable);
        const toUnit = this._getTargetUnit(baseUnit, this.state.units);
        const displayColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);

        let availableTimestamps = [];
        if (this.state.isMRMS && this.state.variable && this.mrmsStatus) {
            const timestamps = this.mrmsStatus[this.state.variable] || [];
            availableTimestamps = [...timestamps].reverse();
        }

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
    }

    destroy() {
        this.pause();
        this.stopAutoRefresh();
        this.timeLayers.forEach(shaderLayer => {
            if (this.map.getLayer(shaderLayer.id)) {
                this.map.removeLayer(shaderLayer.id);
            }
        });
        this.timeLayers.clear();
        this.dataCache.clear();
        this.worker.terminate();
        this.callbacks = {};
        console.log(`FillLayerManager with id "${this.layerId}" has been destroyed.`);
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
                resolve({ data: decompressedData, encoding });
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

    togglePlay() { this.isPlaying ? this.pause() : this.play(); }

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
    
    setVariable(variable) {
        this.setState({ variable });
    }
    
    async setModel(modelName) {
        if (modelName === this.state.model || !this.modelStatus?.[modelName]) return;
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
    
    async setMRMSVariable(variable) {
        const sortedTimestamps = [...(this.mrmsStatus[variable] || [])].sort((a, b) => b - a);
        const initialTimestamp = sortedTimestamps.length > 0 ? sortedTimestamps[0] : null;

        await this.setState({
            variable,
            isMRMS: true,
            mrmsTimestamp: initialTimestamp,
        });
    }

    async setMRMSTimestamp(timestamp) {
        if (!this.state.isMRMS) return;
        await this.setState({ mrmsTimestamp: timestamp });
    }

    async initialize(options = {}) {
        await this.fetchModelStatus(true);
        await this.fetchMRMSStatus(true);
        
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

    async _loadGridData(state) {
        const { model, date, run, forecastHour, variable, isMRMS, mrmsTimestamp } = state;

        // --- START OF EDITED CODE ---

        // Default smoothing to 0.
        let effectiveSmoothing = 0;

        // Check for variable-specific settings in the custom colormaps object.
        const customVariableSettings = this.customColormaps[variable];

        // If settings for this variable exist and a 'smoothing' property is defined, use it.
        if (customVariableSettings && typeof customVariableSettings.smoothing === 'number') {
            effectiveSmoothing = customVariableSettings.smoothing;
        }

        // --- END OF EDITED CODE ---

        let resourcePath;
        let dataUrlIdentifier;

        if (isMRMS) {
            if (!mrmsTimestamp) return null;
            const mrmsDate = new Date(mrmsTimestamp * 1000);
            const y = mrmsDate.getUTCFullYear(), m = (mrmsDate.getUTCMonth() + 1).toString().padStart(2, '0'), d = mrmsDate.getUTCDate().toString().padStart(2, '0');
            
            // Use the 'effectiveSmoothing' value in the URL and cache key.
            dataUrlIdentifier = `mrms-${mrmsTimestamp}-${variable}-${effectiveSmoothing}`;
            resourcePath = `/grids/mrms/${y}${m}${d}/${mrmsTimestamp}/0/${variable}/${effectiveSmoothing}`;
        } else {
            // Use the 'effectiveSmoothing' value in the URL and cache key.
            dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${effectiveSmoothing}`;
            resourcePath = `/grids/${model}/${date}/${run}/${forecastHour}/${variable}/${effectiveSmoothing}`;
        }

        if (this.dataCache.has(dataUrlIdentifier)) {
            return this.dataCache.get(dataUrlIdentifier);
        }

        const loadPromise = (async () => {
            if (!this.apiKey) {
                throw new Error('API key is not configured. Please provide an apiKey in the FillLayerManager options.');
            }

            try {
                const directUrl = `${this.baseGridUrl}${resourcePath}?apiKey=${this.apiKey}`;
                
                const response = await fetch(directUrl, {
                    headers: {
                        'x-api-key': this.apiKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch grid data: ${response.status} ${response.statusText}`);
                }
                
                const { data: b64Data, encoding } = await response.json();
                const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
                
                const requestId = this.workerRequestId++;
                const workerPromise = new Promise((resolve, reject) => {
                    this.workerResolvers.set(requestId, { resolve, reject });
                });
                
                this.worker.postMessage({ requestId, compressedData, encoding }, [compressedData.buffer]);
                return workerPromise;

            } catch (error) {
                console.error(`Failed to load data for path ${resourcePath}:`, error);
                this.dataCache.delete(dataUrlIdentifier);
                return null;
            }
        })();
        
        this.dataCache.set(dataUrlIdentifier, loadPromise);
        return loadPromise;
    }

    _getColormapForVariable(variable) {
        if (!variable) return { colormap: [], baseUnit: '' };

        if (this.customColormaps[variable] && this.customColormaps[variable].colormap) {
            return {
                colormap: this.customColormaps[variable].colormap,
                baseUnit: this.customColormaps[variable].baseUnit || ''
            };
        }

        const colormapKey = DICTIONARIES.variable_cmap[variable] || variable;

        const customColormap = this.customColormaps[colormapKey];
        if (customColormap && customColormap.colormap) {
            return {
                colormap: customColormap.colormap,
                baseUnit: customColormap.baseUnit || ''
            };
        }

        const defaultColormapData = DEFAULT_COLORMAPS[colormapKey];
        if (defaultColormapData && defaultColormapData.units) {
            const availableUnits = Object.keys(defaultColormapData.units);
            if (availableUnits.length > 0) {
                const baseUnit = availableUnits[0];
                const unitData = defaultColormapData.units[baseUnit];
                if (unitData && unitData.colormap) {
                    return { colormap: unitData.colormap, baseUnit: baseUnit };
                }
            }
        }

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

    _getGridCornersAndDef(model) {
        const gridDef = { ...COORDINATE_CONFIGS[model], modelName: model };
        if (!gridDef) return null;

        const { nx, ny } = gridDef.grid_params;
        const gridType = gridDef.type;
        let corners;

        if (gridType === 'latlon') {
            let { lon_first, lat_first, lat_last, lon_last, dx_degrees, dy_degrees } = gridDef.grid_params;
            corners = {
                lon_tl: lon_first, lat_tl: lat_first,
                lon_tr: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees), lat_tr: lat_first,
                lon_bl: lon_first, lat_bl: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
                lon_br: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees), lat_br: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
            };
        } else if (gridType === 'rotated_latlon') {
            const [lon_tl, lat_tl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first);
            const [lon_tr, lat_tr] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first);
            const [lon_bl, lat_bl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            const [lon_br, lat_br] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else if (gridType === 'lambert_conformal_conic' || gridType === 'polar_ stereographic') {
            let projString = Object.entries(gridDef.proj_params).map(([k,v]) => `+${k}=${v}`).join(' ');
            if(gridType === 'polar_stereographic') projString += ' +lat_0=90';
            const { x_origin, y_origin, dx, dy } = gridDef.grid_params;
            const [lon_tl, lat_tl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin]);
            const [lon_tr, lat_tr] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin]);
            const [lon_bl, lat_bl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin + (ny - 1) * dy]);
            const [lon_br, lat_br] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin + (ny - 1) * dy]);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else {
            return null;
        }
        return { corners, gridDef };
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

    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) {
            try {
                const response = await fetch(this.statusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                this.modelStatus = (await response.json()).models;
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
                this.mrmsStatus = await response.json();
            } catch (error) {
                this.mrmsStatus = null;
            }
        }
        return this.mrmsStatus;
    }

    startAutoRefresh(intervalSeconds) {
        this.stopAutoRefresh();
        this.autoRefreshIntervalId = setInterval(async () => {
            await this.fetchModelStatus(true);
            this._emitStateChange();
        }, (intervalSeconds || 60) * 1000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshIntervalId) {
            clearInterval(this.autoRefreshIntervalId);
            this.autoRefreshIntervalId = null;
        }
    }
}