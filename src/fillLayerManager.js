// aguacero-api/src/FillLayerManager.js

import { EventEmitter } from './events.js';
import { GridRenderLayer } from './GridRenderLayer.js';
import { COORDINATE_CONFIGS } from './coordinate_configs.js';
import { getUnitConversionFunction } from './unitConversions.js';
// NEW IMPORTS
import { DICTIONARIES } from './model-definitions.js';
import { DEFAULT_COLORMAPS } from './default-colormaps.js';

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
        this.baseUrl = 'https://d3dc62msmxkrd7.cloudfront.net/grids';
        this.worker = this.createWorker();
        this.statusUrl = 'https://d3dc62msmxkrd7.cloudfront.net/model-status';
        this.modelStatus = null;
        this.gridDataCache = new Map();
        this.loadStrategy = options.loadStrategy || 'on-demand';

        // --- START OF CORRECTED LOGIC ---

        // 1. Set the layerId immediately and ensure it's never undefined.
        this.layerId = options.id || `weather-layer-${Math.random().toString(36).substr(2, 9)}`;

        // 2. Safely get the user-provided layer options, defaulting to an empty object.
        const userLayerOptions = options.layerOptions || {};

        // 3. Determine if a custom colormap was provided.
        const hasCustomColormap = !!userLayerOptions.colormap;

        // 4. Initialize baseLayerOptions, which will hold the colormap and other static settings.
        this.baseLayerOptions = {
            ...userLayerOptions,
            customColormap: hasCustomColormap,
            colormapBaseUnit: userLayerOptions.colormapBaseUnit || 'fahrenheit',
        };

        // 5. If no custom colormap was provided, look up the default one for the initial variable.
        //    This makes removing the hardcoded colormap from app.js work correctly on startup.
        if (!hasCustomColormap) {
            const initialVariable = userLayerOptions.variable || '2t_2';
            const cmapKey = DICTIONARIES.variable_cmap?.[initialVariable] || initialVariable;
            const defaultColormapSet = DEFAULT_COLORMAPS[cmapKey];

            if (defaultColormapSet) {
                const baseUnit = Object.keys(defaultColormapSet.units)[0];
                this.baseLayerOptions.colormap = defaultColormapSet.units[baseUnit].colormap;
                this.baseLayerOptions.colormapBaseUnit = baseUnit;
            } else {
                 console.warn(`[Manager] No default colormap found for initial variable "${initialVariable}".`);
                 // Provide a simple black-to-white fallback colormap to prevent crashes.
                 this.baseLayerOptions.colormap = [0, '#000000', 1, '#ffffff'];
            }
        }

        // 6. Initialize the dynamic state object that will be updated throughout the app's life.
        this.state = {
            model: userLayerOptions.model || 'gfs',
            variable: userLayerOptions.variable || '2t_2',
            date: null,
            run: null,
            forecastHour: 0,
            visible: true,
            opacity: userLayerOptions.opacity ?? 1,
            units: options.initialUnit || 'imperial'
        };

        // --- END OF CORRECTED LOGIC ---

        this.autoRefreshEnabled = options.autoRefresh ?? false;
        this.autoRefreshIntervalSeconds = options.autoRefreshInterval ?? 60;
        this.autoRefreshIntervalId = null;
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

    _updateOrCreateLayer(id, options, decompressedData, encoding) {
        const { model, colormap, opacity = 1, visible = true, units, variable } = options;
        const gridConfig = COORDINATE_CONFIGS[model];
        if (!gridConfig) {
            console.error(`No grid configuration found for model: ${model}`);
            return;
        }

        const baseUnit = options.colormapBaseUnit || 'fahrenheit';
        const variableInfo = DICTIONARIES.fld[variable] || {};
        const targetUnit = this._getTargetUnit(variableInfo.defaultUnit, units);
        
        const convertedColormap = this._convertColormapUnits(colormap, baseUnit, targetUnit);
        const dataRange = [convertedColormap[0], convertedColormap[convertedColormap.length - 2]];

        // MODIFIED: Provide a fallback of 'none' if defaultUnit is missing.
        const dataNativeUnit = variableInfo.defaultUnit || 'none';

        const layerExists = this.layers.has(id);
        const shaderLayer = layerExists ? this.layers.get(id).shaderLayer : new GridRenderLayer(id);

        if (!layerExists) {
            const beforeId = 'AML_-_terrain';
            if (this.map.getLayer(beforeId)) {
                this.map.addLayer(shaderLayer, beforeId);
            } else {
                this.map.addLayer(shaderLayer);
            }
            this.layers.set(id, { id, shaderLayer, options, visible });
        }

        shaderLayer.updateDataTexture(decompressedData, encoding, gridConfig.grid_params.nx, gridConfig.grid_params.ny);
        shaderLayer.updateColormapTexture(convertedColormap);
        shaderLayer.updateStyle({ opacity: visible ? opacity : 0, dataRange });
        shaderLayer.setUnitConversion(dataNativeUnit, units);

        this.map.triggerRepaint();
    }
    
    /**
     * Helper to determine the target unit string for a given system.
     * @private
     */
    _getTargetUnit(defaultUnit, system) {
        if (system === 'metric') {
            if (['°F', '°C'].includes(defaultUnit)) return 'celsius';
            if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'km/h';
            if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'mm';
        }
        // Imperial defaults
        if (['°F', '°C'].includes(defaultUnit)) return 'fahrenheit';
        if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'mph';
        if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'in';
        return defaultUnit; // Fallback
    }

    // ========================================================================
    // --- THIS ENTIRE FUNCTION WAS MISSING IN THE PREVIOUS RESPONSE ---
    // ========================================================================
    /**
     * Sets the active weather variable for the layer.
     * @param {string} newVariable - The name of the variable to display (e.g., 'refc_0').
     */
    async setVariable(newVariable) {
        if (newVariable === this.state.variable) return;

        // Add this log to check the state of the 'customColormap' flag
        console.log(`[Manager.setVariable] Called for variable: "${newVariable}". Custom colormap flag is:`, this.baseLayerOptions.customColormap);

        // If the user did NOT provide a custom colormap on initialization...
        if (!this.baseLayerOptions.customColormap) {
            // This is the code we EXPECT to run
            console.log('[Manager.setVariable] Proceeding to look up default colormap.');
            
            const cmapKey = DICTIONARIES.variable_cmap[newVariable] || newVariable;
            const defaultColormapSet = DEFAULT_COLORMAPS[cmapKey];

            if (defaultColormapSet) {
                const baseUnit = Object.keys(defaultColormapSet.units)[0];
                this.baseLayerOptions.colormap = defaultColormapSet.units[baseUnit].colormap;
                this.baseLayerOptions.colormapBaseUnit = baseUnit;
                
                // Add this log to confirm the new colormap was found and set
                console.log('[Manager.setVariable] SUCCESSFULLY updated baseLayerOptions. New colormap:', this.baseLayerOptions.colormap);
            } else {
                console.warn(`[Manager] No default colormap found for variable "${newVariable}".`);
            }
        }
        
        this.baseLayerOptions.variable = newVariable;
        await this.setState({ variable: newVariable });
    }

    async setState(newState) {
        const modelChanged = newState.model && newState.model !== this.state.model;
        const runChanged = newState.date && newState.run && (newState.date !== this.state.date || newState.run !== this.state.run);
        if (modelChanged || runChanged) {
            this.clearCache();
        }

        Object.assign(this.state, newState);

        const grid = await this._loadGridData(this.state);
        
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...this.state };
            this._updateOrCreateLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
        
        this.emit('state:change', this.state);
        
        if ((modelChanged || runChanged) && this.loadStrategy === 'preload') {
            setTimeout(() => this._preloadCurrentRun(), 0);
        }
    }

    async setModel(modelName) {
        if (modelName === this.state.model) return;
        if (!this.modelStatus || !this.modelStatus[modelName]) {
            console.error(`[Manager] Model "${modelName}" is not available.`);
            return;
        }

        const latestRun = findLatestModelRun(this.modelStatus, modelName);

        if (latestRun) {
            await this.setState({
                model: modelName,
                date: latestRun.date,
                run: latestRun.run,
                forecastHour: 0
            });
        } else {
            console.error(`[Manager] No runs found for model "${modelName}".`);
        }
    }

    // ... (All other methods like initialize, loadGridData, createWorker, etc., are unchanged) ...
    createWorker() {
        const workerCode = ` import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1'; self.onmessage = async (e) => { const { compressedData, encoding } = e.data; try { const decompressedDeltas = decompress(compressedData); const expectedLength = encoding.length; const reconstructedData = new Int8Array(expectedLength); if (decompressedDeltas.length > 0 && expectedLength > 0) { reconstructedData[0] = decompressedDeltas[0] > 127 ? decompressedDeltas[0] - 256 : decompressedDeltas[0]; for (let i = 1; i < expectedLength; i++) { const delta = decompressedDeltas[i] > 127 ? decompressedDeltas[i] - 256 : decompressedDeltas[i]; reconstructedData[i] = reconstructedData[i - 1] + delta; } } const finalData = new Uint8Array(reconstructedData.buffer); self.postMessage({ success: true, decompressedData: finalData }, [finalData.buffer]); } catch (error) { console.error('[WORKER] Data processing failed!', error); self.postMessage({ success: false, error: error.message }); } }; `; const blob = new Blob([workerCode], { type: 'application/javascript' }); return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }
    async _preloadCurrentRun() {
        const { model, date, run } = this.state; const forecastHours = this.modelStatus?.[model]?.[date]?.[run]; if (!forecastHours || forecastHours.length === 0) return; console.log(`[Preload] Starting preload of ${forecastHours.length} forecast hours for ${model} ${date}/${run}Z...`); const preloadPromises = forecastHours.map(forecastHour => { const tempState = { ...this.state, forecastHour }; return this._loadGridData(tempState); }); await Promise.all(preloadPromises); console.log("[Preload] Preloading complete.");
    }
    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) { if (force) console.log("Forcing model status refresh..."); try { const response = await fetch(this.statusUrl); if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`); this.modelStatus = (await response.json()).models; } catch (error) { console.error("Could not load model status:", error); this.modelStatus = null; } } return this.modelStatus;
    }
    startAutoRefresh(intervalSeconds) {
        const interval = intervalSeconds ?? this.autoRefreshIntervalSeconds ?? 60; this.stopAutoRefresh(); console.log(`[FillLayerManager] Starting auto-refresh every ${interval} second(s).`); this.autoRefreshIntervalId = setInterval(async () => { console.log('[FillLayerManager] Auto-refresh triggered: fetching latest model status.'); await this.fetchModelStatus(true); this.emit('state:change', this.state); }, interval * 1000);
    }
    stopAutoRefresh() {
        if (this.autoRefreshIntervalId) { clearInterval(this.autoRefreshIntervalId); this.autoRefreshIntervalId = null; console.log('[FillLayerManager] Auto-refresh stopped.'); }
    }
    clearCache() {
        this.gridDataCache.clear(); console.log('[Cache] Grid data cache cleared.');
    }
    async _loadGridData(state) {
        const { model, date, run, forecastHour, variable, smoothing } = { ...this.baseLayerOptions, ...state }; const cacheKey = `${model}-${date}-${run}-${forecastHour}-${variable}-${smoothing}`; if (this.gridDataCache.has(cacheKey)) { return this.gridDataCache.get(cacheKey); } const dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`; try { const response = await fetch(dataUrl); if (!response.ok) throw new Error(`HTTP ${response.status}`); const { data: b64Data, encoding } = await response.json(); const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0)); return new Promise((resolve) => { const handleWorkerMessage = (e) => { this.worker.removeEventListener('message', handleWorkerMessage); if (e.data.success) { const result = { data: e.data.decompressedData, encoding: encoding }; this.gridDataCache.set(cacheKey, result); resolve(result); } else { console.error("Worker failed:", e.data.error); resolve(null); } }; this.worker.addEventListener('message', handleWorkerMessage); this.worker.postMessage({ compressedData, encoding }, [compressedData.buffer]); }); } catch (error) { console.warn(`Failed to fetch data for ${cacheKey}:`, error.message); return null; }
    }
    async setUnits(newUnits) {
        if (newUnits === this.state.units || !['metric', 'imperial'].includes(newUnits)) { return; } await this.setState({ units: newUnits });
    }
    async initialize(options = {}) {
        const modelStatus = await this.fetchModelStatus(); const latestRun = findLatestModelRun(modelStatus, this.state.model); if (latestRun) { await this.setState({ ...latestRun, forecastHour: 0 }); } else { console.error(`Could not initialize. No runs found for model "${this.state.model}".`); this.emit('state:change', this.state); } const startRefresh = options.autoRefresh ?? this.autoRefreshEnabled; if (startRefresh) { const interval = options.refreshInterval ?? this.autoRefreshIntervalSeconds; this.startAutoRefresh(interval); }
    }
    removeLayer(id) {
        if (this.layers.has(id)) { if (this.map.getLayer(id)) this.map.removeLayer(id); this.layers.delete(id); }
    }
}