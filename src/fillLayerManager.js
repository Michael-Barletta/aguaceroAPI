// aguacero-api/src/FillLayerManager.js

import { EventEmitter } from './events.js';
import { GridRenderLayer } from './GridRenderLayer.js';
import { COORDINATE_CONFIGS } from './coordinate_configs.js';

/**
 * Finds the latest available date and run for a specific model from the model status data.
 * @param {object} modelsData - The 'models' object from the model-status API response.
 * @param {string} modelName - The name of the model (e.g., 'gfs').
 * @returns {{date: string, run: string}|null} - The latest date and run, or null if not found.
 * @private
 */
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
    /**
     * Creates an instance of FillLayerManager.
     * @param {mapboxgl.Map} map - The Mapbox GL map instance.
     * @param {object} [options={}] - Configuration options.
     * @param {string} [options.id='weather-layer'] - A unique ID for the map layer.
     * @param {object} [options.layerOptions] - Base options for the weather layer (model, variable, etc.).
     * @param {'on-demand'|'preload'} [options.loadStrategy='on-demand'] - The data loading strategy.
     */
    constructor(map, options = {}) {
        super();
        if (!map) throw new Error('A Mapbox GL map instance is required.');

        this.map = map;
        this.layers = new Map();
        this.baseUrl = 'https://d3dc62msmxkrd7.cloudfront.net/grids';
        this.worker = this.createWorker();
        this.statusUrl = 'https://d3dc62msmxkrd7.cloudfront.net/model-status';
        this.modelStatus = null;
        
        // Caching and Loading Strategy
        this.cache = new Map();
        this.loadStrategy = options.loadStrategy || 'on-demand';
        if (!['on-demand', 'preload'].includes(this.loadStrategy)) {
            throw new Error(`Invalid loadStrategy: "${this.loadStrategy}". Must be 'on-demand' or 'preload'.`);
        }

        this.layerId = options.id || 'weather-layer';
        this.baseLayerOptions = options.layerOptions || {};
        
        this.state = {
            model: options.layerOptions.model || 'gfs',
            date: null,
            run: null,
            forecastHour: 0,
            visible: true,
            opacity: 0.7,
        };
        this.autoRefreshInterval = null;
    }

    /**
     * Creates the data decompression web worker.
     * @private
     */
    createWorker() {
        const workerCode = `
            import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';
            self.onmessage = async (e) => {
                const { compressedData, encoding } = e.data;
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
                    self.postMessage({ success: true, decompressedData: finalData }, [finalData.buffer]);
                } catch (error) {
                    console.error('[WORKER] Data processing failed!', error);
                    self.postMessage({ success: false, error: error.message });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }

    /**
     * Fetches and caches the model status data.
     * @param {boolean} [force=false] - If true, bypasses the cache and fetches fresh data.
     */
    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) {
            if (force) console.log("Forcing model status refresh...");
            try {
                const response = await fetch(this.statusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                this.modelStatus = (await response.json()).models;
            } catch (error) {
                console.error("Could not load model status:", error);
                this.modelStatus = null;
            }
        }
        return this.modelStatus;
    }

    /**
     * Starts an interval to automatically refresh the model status data.
     * @param {number} [intervalMinutes=1] - The refresh interval in minutes.
     */
    startAutoRefresh(intervalMinutes = 1) {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(async () => {
            await this.fetchModelStatus(true);
            this.emit('state:change', this.state);
        }, intervalMinutes * 60 * 1000);
    }

    /**
     * Stops the automatic refresh interval.
     */
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    /**
     * Generates a unique cache key for a given set of parameters.
     * @private
     */
    _getCacheKey(state) {
        const { model, date, run, forecastHour, variable } = { ...this.baseLayerOptions, ...state };
        return `${model}-${date}-${run}-${forecastHour}-${variable}`;
    }

    /**
     * Loads grid data from the cache or fetches it from the network.
     * @private
     * @returns {Promise<Uint8Array|null>} The decompressed grid data.
     */
    async _loadGridData(state) {
        const cacheKey = this._getCacheKey(state);
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey); // Cache now returns { data, encoding }
        }

        const { model, date, run, forecastHour, variable, smoothing } = { ...this.baseLayerOptions, ...state };
        const dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`;

        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            // Capture the encoding provided by the API for this specific grid
            const { data: b64Data, encoding } = await response.json();
            const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));

            return new Promise((resolve) => {
                const handleWorkerMessage = (e) => {
                    this.worker.removeEventListener('message', handleWorkerMessage);
                    if (e.data.success) {
                        // Create a result object that includes the network encoding
                        const result = {
                            data: e.data.decompressedData,
                            encoding: encoding 
                        };
                        this.cache.set(cacheKey, result); // Cache the complete result
                        resolve(result);
                    } else {
                        console.error("Worker failed:", e.data.error);
                        resolve(null);
                    }
                };
                this.worker.addEventListener('message', handleWorkerMessage);
                // Pass the encoding to the worker (it doesn't use it, but this is good practice)
                this.worker.postMessage({ compressedData, encoding }, [compressedData.buffer]);
            });
        } catch (error) {
            console.error(`Failed to fetch data for ${cacheKey}:`, error);
            return null;
        }
    }

    /**
     * Renders a grid layer on the map using the provided data.
     * @private
     */
    _renderLayer(id, options, decompressedData, encoding) {
        this.removeLayer(id);

        const { model, colormap, opacity = 1, visible = true } = options;
        const gridConfig = COORDINATE_CONFIGS[model];
        if (!gridConfig) {
            console.error(`No grid configuration found for model: ${model}`);
            return;
        }
        const grid = gridConfig.grid_params;
        
        const shaderLayer = new GridRenderLayer(id);
        this.map.addLayer(shaderLayer);
        this.layers.set(id, { id, shaderLayer, options, visible });

        // Use the encoding that was passed in, which came from the network
        shaderLayer.updateDataTexture(decompressedData, encoding, grid.nx, grid.ny);
        shaderLayer.updateColormapTexture(colormap);
        const dataRange = [colormap[0], colormap[colormap.length - 2]];
        shaderLayer.updateStyle({ opacity: visible ? opacity : 0, dataRange });
        this.map.triggerRepaint();
    }
    
    /**
     * Updates the manager's state, triggers data loading and rendering.
     * @param {object} newState - The new state properties to apply.
     */
    async setState(newState) {
        const oldState = { ...this.state };
        Object.assign(this.state, newState);

        const runChanged = oldState.date !== this.state.date || oldState.run !== this.state.run;

        if (runChanged && this.loadStrategy === 'preload') {
            console.log(`Preloading all forecast hours for ${this.state.date}/${this.state.run}Z...`);
            const forecastHours = this.modelStatus?.[this.state.model]?.[this.state.date]?.[this.state.run] || [];
            
            Promise.all(forecastHours.map(hour => {
                const stateForHour = { ...this.state, forecastHour: hour };
                return this._loadGridData(stateForHour);
            }));
        }

        const grid = await this._loadGridData(this.state);
        
        if (grid && grid.data) {
            const fullOptions = { ...this.baseLayerOptions, ...this.state };
            // Pass both the data and the encoding to the renderer
            this._renderLayer(this.layerId, fullOptions, grid.data, grid.encoding);
        } else {
            this.removeLayer(this.layerId);
        }
        
        this.emit('state:change', this.state);
    }
    
    /**
     * Initializes the manager by fetching the latest model run and rendering the first frame.
     */
    async initialize() {
        const modelStatus = await this.fetchModelStatus();
        const latestRun = findLatestModelRun(modelStatus, this.state.model);
        if (latestRun) {
            await this.setState({ ...latestRun, forecastHour: 0 });
        } else {
            console.error(`Could not initialize. No runs found for model "${this.state.model}".`);
            this.emit('state:change', this.state); // Emit to render empty UI state
        }
    }

    /**
     * Removes a layer from the map.
     * @param {string} id - The ID of the layer to remove.
     */
    removeLayer(id) {
        if (this.layers.has(id)) {
            if (this.map.getLayer(id)) this.map.removeLayer(id);
            this.layers.delete(id);
        }
    }
}