import { GridRenderLayer as w } from "./GridRenderLayer.js";
class b {
  constructor(e) {
    if (!e) throw new Error("A Mapbox GL map instance is required.");
    this.map = e, this.layers = /* @__PURE__ */ new Map(), this.worker = this.createWorker();
  }
  createWorker() {
    const e = `
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
    `, t = new Blob([e], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(t), { type: "module" });
  }
  async addLayer(e, t, r) {
    if (this.layers.has(e)) {
      console.warn(`Layer with ID "${e}" already exists.`);
      return;
    }
    const { url: a, grid: i, colormap: s, opacity: h = 1, visible: d = !0 } = t;
    if (!a || !i || !s)
      throw new Error("Missing required options.");
    const o = new w(e);
    this.map.addLayer(o, r);
    const m = { id: e, shaderLayer: o, options: t, visible: d };
    this.layers.set(e, m);
    try {
      const c = await fetch(a);
      if (!c.ok) throw new Error(`HTTP error! Status: ${c.status}`);
      const { data: f, encoding: l } = await c.json(), p = Uint8Array.from(atob(f), (n) => n.charCodeAt(0));
      this.worker.postMessage({ compressedData: p, encoding: l, grid: i }, [p.buffer]);
      const y = (n) => {
        if (this.worker.removeEventListener("message", y), n.data.success) {
          const { decompressedData: u } = n.data;
          o.updateDataTexture(u, l, i.nx, i.ny), o.updateColormapTexture(s);
          const g = [s[0], s[s.length - 2]];
          o.updateStyle({ opacity: d ? h : 0, dataRange: g }), this.map.triggerRepaint();
        } else
          console.error("[MAIN] Worker failed to process data:", n.data.error);
      };
      this.worker.addEventListener("message", y);
    } catch (c) {
      console.error(`Failed to load data for layer "${e}":`, c);
    }
  }
  updateLayer(e, t) {
    const r = this.layers.get(e);
    if (!r) return;
    const { shaderLayer: a } = r;
    t.colormap && (a.updateColormapTexture(t.colormap), r.options.colormap = t.colormap), t.opacity !== void 0 && (r.options.opacity = t.opacity, r.visible && a.updateStyle({ opacity: t.opacity })), this.map.triggerRepaint();
  }
  setVisible(e, t) {
    const r = this.layers.get(e);
    if (!r) return;
    r.visible = t;
    const a = t ? r.options.opacity : 0;
    r.shaderLayer.updateStyle({ opacity: a }), this.map.triggerRepaint();
  }
  removeLayer(e) {
    if (this.layers.has(e)) {
      const { shaderLayer: t } = this.layers.get(e);
      this.map.getLayer(e) && this.map.removeLayer(e), this.layers.delete(e);
    }
  }
  destroy() {
    this.worker && this.worker.terminate();
  }
}
export {
  b as FillLayerManager
};
