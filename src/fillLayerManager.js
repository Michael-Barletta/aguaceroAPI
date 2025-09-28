// aguaceroAPI/src/FillLayerManager.js

import { GridRenderLayer } from './GridRenderLayer.js';

export class FillLayerManager {
  constructor(map) {
    if (!map) throw new Error('A Mapbox GL map instance is required.');
    this.map = map;
    this.layers = new Map();
    this.worker = this.createWorker();
  }

  createWorker() {
    const workerCode = `
      import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';
      
        // This code goes inside the worker blob in FillLayerManager.js

        self.onmessage = async (e) => {
            const { compressedData, encoding } = e.data;
            
            try {
                // Step 1: Decompress the raw bytes
                const decompressedDeltas = decompress(compressedData);

                // Step 2: Reconstruct the full data array from the deltas
                const expectedLength = encoding.length;
                const reconstructedData = new Int8Array(expectedLength);

                if (decompressedDeltas.length > 0 && expectedLength > 0) {
                    reconstructedData[0] = decompressedDeltas[0] > 127 ? decompressedDeltas[0] - 256 : decompressedDeltas[0];
                    for (let i = 1; i < expectedLength; i++) {
                        const delta = decompressedDeltas[i] > 127 ? decompressedDeltas[i] - 256 : decompressedDeltas[i];
                        reconstructedData[i] = reconstructedData[i - 1] + delta;
                    }
                }
                
                // The data is now correct and in its original 0-360 longitude order.
                // Recast to a Uint8Array for transferring the buffer.
                const finalData = new Uint8Array(reconstructedData.buffer);

                self.postMessage({
                    success: true,
                    decompressedData: finalData,
                }, [finalData.buffer]);
                
            } catch (error) {
                console.error('[WORKER] Data processing failed!', error);
                self.postMessage({ success: false, error: error.message });
            }
        };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob), { type: 'module' });
  }

  async addLayer(id, options, beforeId) {
    if (this.layers.has(id)) {
      console.warn(`Layer with ID "${id}" already exists.`);
      return;
    }
    const { url, grid, colormap, opacity = 1, visible = true } = options;
    if (!url || !grid || !colormap) {
      throw new Error('Missing required options.');
    }
    const shaderLayer = new GridRenderLayer(id);
    this.map.addLayer(shaderLayer, beforeId);
    const layerState = { id, shaderLayer, options, visible };
    this.layers.set(id, layerState);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const { data: b64Data, encoding } = await response.json();
      const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
      
      // We no longer need to pass the grid to the worker.
      // NEW, CORRECTED CODE
        this.worker.postMessage({ compressedData, encoding, grid }, [compressedData.buffer]);
      
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
          console.error("[MAIN] Worker failed to process data:", e.data.error);
        }
      };
      
      this.worker.addEventListener('message', handleWorkerMessage);
    } catch (error) {
      console.error(`Failed to load data for layer "${id}":`, error);
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
      const { shaderLayer } = this.layers.get(id);
      if (this.map.getLayer(id)) this.map.removeLayer(id);
      this.layers.delete(id);
    }
  }

  destroy() {
    if (this.worker) this.worker.terminate();
  }
}