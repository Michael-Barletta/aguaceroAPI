// aguacero-api/src/FillLayerManager.js

import { EventEmitter } from './events.js';
import { GridRenderLayer } from './GridRenderLayer.js';
// Import the model configurations from the separate file
import { COORDINATE_CONFIGS } from './coordinate_configs.js';


// Internal helper function, not exported
function findLatestModelRun(modelsData, modelName) {
    const model = modelsData[modelName];
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

    createWorker() {
        // ... (This function is exactly the same as in your provided file)
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

    async setState(newState) {
        const oldState = { ...this.state };
        Object.assign(this.state, newState);

        const dataChanged = oldState.date !== this.state.date ||
                              oldState.run !== this.state.run ||
                              oldState.forecastHour !== this.state.forecastHour;

        if (dataChanged) {
            this.removeLayer(this.layerId);
            if (this.state.date && this.state.run) {
                const fullOptions = { ...this.baseLayerOptions, ...this.state };
                await this.addLayer(this.layerId, fullOptions);
            }
        }
        
        this.emit('state:change', this.state);
    }

    async initialize() {
        const modelStatus = await this.fetchModelStatus();
        const latestRun = findLatestModelRun(modelStatus, this.state.model);
        await this.setState({ ...latestRun, forecastHour: 0 });
    }

    startAutoRefresh(intervalMinutes = 1) {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(async () => {
            await this.fetchModelStatus(true);
            this.emit('state:change', this.state);
        }, intervalMinutes * 60 * 1000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }

    async addLayer(id, options) {
        const { model, date, run, forecastHour, variable, smoothing, colormap, opacity = 1, visible = true } = options;
        const gridConfig = COORDINATE_CONFIGS[model];
        if (!gridConfig) throw new Error(`Model "${model}" not found.`);
        
        const grid = gridConfig.grid_params;
        const dataUrl = `${this.baseUrl}/${model}/${date}/${run}/${forecastHour}/${variable}/${smoothing}`;
        const shaderLayer = new GridRenderLayer(id);
        
        this.map.addLayer(shaderLayer);
        this.layers.set(id, { id, shaderLayer, options, visible });

        try {
            const response = await fetch(dataUrl);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const { data: b64Data, encoding } = await response.json();
            const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
            
            const handleWorkerMessage = (e) => {
                this.worker.removeEventListener('message', handleWorkerMessage);
                if (e.data.success) {
                    const { decompressedData } = e.data;
                    shaderLayer.updateDataTexture(decompressedData, encoding, grid.nx, grid.ny);
                    shaderLayer.updateColormapTexture(colormap);
                    const dataRange = [colormap[0], colormap[colormap.length - 2]];
                    shaderLayer.updateStyle({ opacity: visible ? opacity : 0, dataRange });
                    this.map.triggerRepaint();
                } else {
                    console.error("Worker failed:", e.data.error);
                }
            };
            this.worker.addEventListener('message', handleWorkerMessage);
            this.worker.postMessage({ compressedData, encoding }, [compressedData.buffer]);
        } catch (error) {
            console.error(`Failed to load data for layer "${id}":`, error);
            this.removeLayer(id);
        }
    }

  updateLayer(id, options) {
    const layerState = this.layers.get(id);
    if (!layerState) return;
    const { shaderLayer } = layerState;
    if (options.colormap) {
      shaderLayer.updateColormapTexture(options.colormap);
      layerState.options.colormap = options.colormap;
    }
    if (options.opacity !== undefined) {
      layerState.options.opacity = options.opacity;
      if (layerState.visible) {
        shaderLayer.updateStyle({ opacity: options.opacity });
      }
    }
    // Note: To update the data (e.g., change the forecast hour), you should remove the layer and add a new one.
    this.map.triggerRepaint();
  }

  setVisible(id, visible) {
    const layerState = this.layers.get(id);
    if (!layerState) return;
    layerState.visible = visible;
    const newOpacity = visible ? layerState.options.opacity : 0;
    layerState.shaderLayer.updateStyle({ opacity: newOpacity });
    this.map.triggerRepaint();
  }

removeLayer(id) {
    if (this.layers.has(id)) {
        if (this.map.getLayer(id)) this.map.removeLayer(id);
        this.layers.delete(id);
    }
}

  destroy() {
    // Terminate the worker to free up resources
    if (this.worker) this.worker.terminate();
    // Remove all layers managed by this instance
    for (const id of this.layers.keys()) {
        this.removeLayer(id);
    }
  }
}