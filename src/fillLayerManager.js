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
        this.loadStrategy = options.loadStrategy || 'on-demand';
        this.dataCache = new Map();
        this.workerRequestId = 0; // A counter for unique request IDs.
        this.workerResolvers = new Map(); // Stores the promises waiting for a worker response.
        // Set up ONE central listener to route all worker messages.
        this.worker.addEventListener('message', this._handleWorkerMessage.bind(this));

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

    // --- START OF FIX ---
    /**
     * NEW METHOD: A central router for all messages coming from the web worker.
     * It uses the requestId to resolve the correct promise.
     * @private
     */
    _handleWorkerMessage(e) {
        const { success, requestId, decompressedData, encoding, error } = e.data;

        // Check if there's a promise waiting for this ID.
        if (this.workerResolvers.has(requestId)) {
            const { resolve, reject } = this.workerResolvers.get(requestId);
            
            if (success) {
                // IMPORTANT: The worker returns the decompressed data and the original encoding object.
                const result = { data: decompressedData, encoding: encoding };
                resolve(result);
            } else {
                reject(new Error(error));
            }
            
            // Clean up the resolver map.
            this.workerResolvers.delete(requestId);
        } 
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
        // If the user did NOT provide a custom colormap on initialization...
        if (!this.baseLayerOptions.customColormap) {
            
            const cmapKey = DICTIONARIES.variable_cmap[newVariable] || newVariable;
            const defaultColormapSet = DEFAULT_COLORMAPS[cmapKey];

            if (defaultColormapSet) {
                const baseUnit = Object.keys(defaultColormapSet.units)[0];
                this.baseLayerOptions.colormap = defaultColormapSet.units[baseUnit].colormap;
                this.baseLayerOptions.colormapBaseUnit = baseUnit;
                
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
        const variableChanged = newState.variable && newState.variable !== this.state.variable;

        if (modelChanged || runChanged || variableChanged) {
            this.dataCache.clear();
        }
        // --- END OF FIX ---

        Object.assign(this.state, newState);

        const grid = await this._loadGridData(this.state);
        
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...this.state };
            this._updateOrCreateLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
        
        this.emit('state:change', this.state);
        
        // --- START OF FIX ---
        // 3. Trigger the preload if the context has changed and the strategy is 'preload'.
        if ((modelChanged || runChanged || variableChanged) && this.loadStrategy === 'preload') {
            setTimeout(() => this._preloadCurrentRun(), 0);
        }
        // --- END OF FIX ---
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

        createWorker() {
        // --- START OF FIX ---
        // The worker code MUST now handle the `requestId` and pass it back.
        // It also needs to pass the `encoding` object through untouched.
        const workerCode = `
            import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';

            self.onmessage = async (e) => {
                const { requestId, compressedData, encoding } = e.data;
                try {
                    const decompressedDeltas = decompress(compressedData);
                    const expectedLength = encoding.length;
                    const reconstructedData = new Int8Array(expectedLength);

                    if (decompressedDeltas.length > 0 && expectedLength > 0) {
                        reconstructedData[0] = decompressedDeltas[0] > 127 
                            ? decompressedDeltas[0] - 256 
                            : decompressedDeltas[0];
                        for (let i = 1; i < expectedLength; i++) {
                            const delta = decompressedDeltas[i] > 127 
                                ? decompressedDeltas[i] - 256 
                                : decompressedDeltas[i];
                            reconstructedData[i] = reconstructedData[i - 1] + delta;
                        }
                    }

                    const finalData = new Uint8Array(reconstructedData.buffer);
                    
                    // Respond with the ID, the result, and the original encoding object.
                    self.postMessage({ 
                        success: true, 
                        requestId: requestId, 
                        decompressedData: finalData,
                        encoding: encoding 
                    }, [finalData.buffer]);

                } catch (error) {
                    // If it fails, still include the ID so the main thread knows which request failed.
                    self.postMessage({ 
                        success: false, 
                        requestId: requestId, 
                        error: error.message 
                    });
                }
            };
        `;
        // --- END OF FIX ---
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }

    /**
     * Preloads all forecast hour data for the currently selected model run.
     * This is used by the 'preload' load strategy.
     * @private
     */
    // Replace the existing _preloadCurrentRun method with this one.
    async _preloadCurrentRun() {
        const { model, date, run } = this.state;
        const forecastHours = this.modelStatus?.[model]?.[date]?.[run];

        if (!forecastHours || forecastHours.length === 0) {
            return;
        }

        // --- CRITICAL FIX ---
        // Instead of using .map directly on the state, we create a new state object
        // for each iteration to avoid closure-related bugs.
        const preloadPromises = forecastHours.map(hour => {
            const stateForHour = { ...this.state, forecastHour: hour };
            // We call _loadGridData, which will either start a fetch or return an existing promise.
            return this._loadGridData(stateForHour);
        });
        
        // We wait for all preloading promises to settle.
        await Promise.all(preloadPromises);
    }

    /**
     * Fetches the model status JSON file from the server.
     * @param {boolean} [force=false] - If true, fetches new data even if it's already loaded.
     * @returns {Promise<object|null>} The model status data, or null on failure.
     */
    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) {
            try {
                const response = await fetch(this.statusUrl);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const statusData = await response.json();
                this.modelStatus = statusData.models;
            } catch (error) {
                this.modelStatus = null;
            }
        }
        return this.modelStatus;
    }

    /**
     * Starts a timer to automatically poll for the latest model status.
     * @param {number} [intervalSeconds] - The refresh interval in seconds.
     */
    startAutoRefresh(intervalSeconds) {
        const interval = intervalSeconds ?? this.autoRefreshIntervalSeconds ?? 60;
        this.stopAutoRefresh(); // Ensure no multiple intervals are running

        this.autoRefreshIntervalId = setInterval(async () => {
            await this.fetchModelStatus(true); // Force a refresh
            this.emit('state:change', this.state);
        }, interval * 1000);
    }

    /**
     * Stops the automatic polling for model status updates.
     */
    stopAutoRefresh() {
        if (this.autoRefreshIntervalId) {
            clearInterval(this.autoRefreshIntervalId);
            this.autoRefreshIntervalId = null;
        }
    }
    async _loadGridData(state) {
        const { model, date, run, forecastHour, variable, smoothing } = { ...this.baseLayerOptions, ...state };
        const dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${smoothing || ''}`;

        if (this.dataCache.has(dataUrlIdentifier)) {
            const cachedItem = this.dataCache.get(dataUrlIdentifier);
            return cachedItem;
        }

        const loadPromise = new Promise(async (resolve, reject) => {
            const dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`;

            try {
                const response = await fetch(dataUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status} for ${dataUrl}`);
                
                const { data: b64Data, encoding } = await response.json();
                const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
                
                // --- START OF FIX ---
                // This is the core change. We no longer add a listener here.
                // We create a unique ID, store the promise's resolve/reject functions,
                // and post the message with the ID. The central router will handle the response.
                const requestId = this.workerRequestId++;
                this.workerResolvers.set(requestId, { resolve, reject });
                this.worker.postMessage({ requestId, compressedData, encoding }, [compressedData.buffer]);
                // --- END OF FIX ---

            } catch (error) {
                reject(error); // Reject the main promise on fetch failure.
            }
        })
        .then(result => {
            // This runs when the worker promise resolves successfully.
            this.dataCache.set(dataUrlIdentifier, result);
            return result;
        })
        .catch(error => {
            // This runs if either the fetch or the worker promise rejects.
            this.dataCache.delete(dataUrlIdentifier); // Allow a retry.
            return null; // Resolve with null to prevent crashing the app.
        });
        
        this.dataCache.set(dataUrlIdentifier, loadPromise);
        return loadPromise;
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