// aguacero-api/src/FillLayerManager.js

import { EventEmitter } from './events.js';
import { GridRenderLayer } from './GridRenderLayer.js';
import { COORDINATE_CONFIGS } from './coordinate_configs.js';
import { getUnitConversionFunction } from './unitConversions.js';
import { DICTIONARIES } from './model-definitions.js';
import { DEFAULT_COLORMAPS } from './default-colormaps.js';
// At the top of FillLayerManager.js, add this import
import { MODEL_CONFIGS } from './model-definitions.js';

// Then add this method to the FillLayerManager class:

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
        
        // --- Playback State ---
        this.isPlaying = false;
        this.playIntervalId = null;
        this.playbackSpeed = options.playbackSpeed || 500;

        // --- Data & Style Configuration ---
        this.customColormaps = options.customColormaps || {};
        const userLayerOptions = options.layerOptions || {};
        const initialVariable = userLayerOptions.variable || '2t_2';
        const { colormap, baseUnit } = this._getColormapForVariable(initialVariable);

        this.baseLayerOptions = {
            ...userLayerOptions,
            variable: initialVariable,
            colormap: colormap,
            colormapBaseUnit: baseUnit,
        };

        this.state = {
            model: userLayerOptions.model || 'gfs',
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

    /**
     * Gets the available variables for a specific model
     * @param {string} modelName - The model to get variables for
     * @returns {Array<string>} Array of variable codes
     */
    getAvailableVariables(modelName = null) {
        const model = modelName || this.state.model;
        return MODEL_CONFIGS[model]?.vars || [];
    }

    /**
     * Gets a human-readable name for a variable
     * @param {string} variableCode - The variable code (e.g., '2t_2')
     * @returns {string} Human-readable name
     */
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

    // ========================================================================
    // --- PUBLIC API METHODS ---
    // ========================================================================

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

    async setState(newState) {
        const modelChanged = newState.model && newState.model !== this.state.model;
        const runChanged = newState.date && newState.run && (newState.date !== this.state.date || newState.run !== this.state.run);
        const variableChanged = newState.variable && newState.variable !== this.state.variable;

        // Apply new state changes to the internal state object
        Object.assign(this.state, newState);

        if (modelChanged || runChanged || variableChanged) {
            // Fade out the old layer while new data loads
            if (this.layers.has(this.layerId)) {
                this.layers.get(this.layerId).shaderLayer.updateStyle({ opacity: 0 });
                this.map.triggerRepaint();
            }
            this.dataCache.clear();
        }

        // --- START OF LEGEND FIX ---
        // After every state change, recalculate the colormap for the UI based on current units.
        const baseColormap = this.baseLayerOptions.colormap;
        const fromUnit = this.baseLayerOptions.colormapBaseUnit;
        const toUnit = this._getTargetUnit(fromUnit, this.state.units);
        
        // This is the colormap the legend should display, with correctly converted values.
        const displayColormap = this._convertColormapUnits(baseColormap, fromUnit, toUnit);
        // --- END OF LEGEND FIX ---

        // Emit the 'state:change' event with all data the UI needs, including the corrected colormap.
        const { model, date, run } = this.state;
        this.emit('state:change', {
            ...this.state,
            availableModels: this.modelStatus ? Object.keys(this.modelStatus).sort() : [],
            availableRuns: this.modelStatus?.[model] || {},
            availableHours: this.modelStatus?.[model]?.[date]?.[run] || [],
            availableVariables: this.getAvailableVariables(),
            isPlaying: this.isPlaying,
            colormap: displayColormap, // Use the converted colormap
            colormapBaseUnit: toUnit, // And its corresponding unit name
        });

        // Now, load the grid data in the background. The UI is already responsive.
        this._loadAndRenderGrid(this.state);
        
        if ((modelChanged || runChanged || variableChanged) && this.loadStrategy === 'preload') {
            setTimeout(() => this._preloadCurrentRun(), 0);
        }
    }

    /**
     * A helper method to consolidate loading and rendering logic.
     * @private
     */
    async _loadAndRenderGrid(state) {
        const grid = await this._loadGridData(state);
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...state };
            this._updateOrCreateLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
    }
        
    /**
     * Sets the active weather variable for the layer.
     * @param {string} newVariable - The name of the variable to display (e.g., 'refc_0').
     */
    async setVariable(newVariable) {
        if (newVariable === this.state.variable) return;

        // 1. Get the new base colormap and unit for the selected variable.
        const { colormap, baseUnit } = this._getColormapForVariable(newVariable);
        
        // 2. Update the base options that will be used for all subsequent calculations.
        this.baseLayerOptions.variable = newVariable;
        this.baseLayerOptions.colormap = colormap;
        this.baseLayerOptions.colormapBaseUnit = baseUnit;
        
        // 3. Trigger the main state update. The updated `setState` will use these
        //    new base options to calculate the display colormap and emit it.
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
    
    async setRun(runString) { // e.g., "20250929:12"
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
        
        // This single call to setState will handle everything:
        // 1. It will update the internal state.
        // 2. It will calculate the correct display colormap.
        // 3. It will emit the complete state to the UI.
        // 4. It will load the map data in the background.
        await this.setState(initialState);
        
        if (options.autoRefresh ?? this.autoRefreshEnabled) {
            this.startAutoRefresh(options.refreshInterval ?? this.autoRefreshIntervalSeconds);
        }
    }

    // ========================================================================
    // --- PRIVATE HELPER METHODS ---
    // ========================================================================

    _getColormapForVariable(variableName) {
        const customMap = this.customColormaps[variableName];

        // 1. Check for a user-defined custom colormap.
        if (customMap) {
            // --- NEW: Check for the advanced, unit-specific structure first ---
            if (customMap.units) {
                const currentSystem = this.state.units; // 'imperial' or 'metric'
                
                // Determine which key to look for in the user's definition
                let targetUnitKey;
                if (currentSystem === 'imperial') targetUnitKey = 'fahrenheit';
                if (currentSystem === 'metric') targetUnitKey = 'celsius';
                
                // If the user provided a specific map for the current unit system, use it.
                if (targetUnitKey && customMap.units[targetUnitKey]?.colormap) {
                    return {
                        colormap: customMap.units[targetUnitKey].colormap,
                        baseUnit: targetUnitKey // The base unit IS the target unit, so no conversion will be needed
                    };
                }
            }

            // --- Fallback to the simple custom colormap structure ---
            if (customMap.colormap && customMap.baseUnit) {
                return {
                    colormap: customMap.colormap,
                    baseUnit: customMap.baseUnit
                };
            }
        }

        // 2. If no custom map, look in the API's defaults.
        // ... (this part is unchanged)
        const cmapKey = DICTIONARIES.variable_cmap?.[variableName] || variableName;
        const defaultColormapSet = DEFAULT_COLORMAPS[cmapKey];
        if (defaultColormapSet) {
            const baseUnit = Object.keys(defaultColormapSet.units)[0];
            return {
                colormap: defaultColormapSet.units[baseUnit].colormap,
                baseUnit: baseUnit
            };
        }

        // 3. If no default is found, return a safe fallback.
        // ... (this part is unchanged)
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

    _updateOrCreateLayer(id, options, decompressedData, encoding) {
        const { model, colormap, opacity = 1, visible = true, units, variable } = options;
        const gridConfig = COORDINATE_CONFIGS[model];
        if (!gridConfig) {
            console.error(`No grid configuration found for model: ${model}`);
            return;
        }

        // --- START OF CORRECTED LOGIC ---
        const fromUnit = options.colormapBaseUnit; // The unit of the colormap we received (e.g., '°C')
        const variableInfo = DICTIONARIES.fld[variable] || {};
        
        // Determine the target unit for the DISPLAY based on the current system (e.g., 'fahrenheit')
        const toUnit = this._getTargetUnit(fromUnit, units);

        // AUTOMATIC CONVERSION: If the colormap's native unit is different from the target
        // display unit, convert its values.
        const finalColormap = this._convertColormapUnits(colormap, fromUnit, toUnit);
        
        // The dataRange is now derived from the correctly-converted colormap.
        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        // --- END OF CORRECTED LOGIC ---

        const dataNativeUnit = variableInfo.defaultUnit || 'none';

        const layerExists = this.layers.has(id);
        const shaderLayer = layerExists ? this.layers.get(id).shaderLayer : new GridRenderLayer(id);

        if (!layerExists) {
            this.map.addLayer(shaderLayer, 'AML_-_terrain');
            this.layers.set(id, { id, shaderLayer, options, visible });
        }

        shaderLayer.updateDataTexture(decompressedData, encoding, gridConfig.grid_params.nx, gridConfig.grid_params.ny);
        shaderLayer.updateColormapTexture(finalColormap); // Use the converted colormap
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
        const { model, date, run, forecastHour, variable, smoothing = 0 } = { ...this.baseLayerOptions, ...state };
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
    removeLayer(id) {
        if (this.layers.has(id)) { if (this.map.getLayer(id)) this.map.removeLayer(id); this.layers.delete(id); }
    }
    /**
     * Cleans up all resources used by the manager.
     * Removes the layer from the map, stops timers, and clears caches.
     */
    destroy() {
        this.pause(); // Stop any playback intervals
        this.stopAutoRefresh(); // Stop any refresh intervals
        this.removeLayer(this.layerId); // Remove the layer from the map
        this.dataCache.clear();
        this.worker.terminate(); // Terminate the web worker
        this.callbacks = {}; // Clear all event listeners
        console.log(`FillLayerManager with id "${this.layerId}" has been destroyed.`);
    }
}