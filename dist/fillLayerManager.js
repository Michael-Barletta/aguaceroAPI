import { GridRenderLayer as x } from "./GridRenderLayer.js";
import { COORDINATE_CONFIGS as $ } from "./coordinate_configs.js";
class A {
  constructor(e) {
    if (!e) throw new Error("A Mapbox GL map instance is required.");
    this.map = e, this.layers = /* @__PURE__ */ new Map(), this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker();
  }
  createWorker() {
    const e = `
      import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';
      
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
    `, r = new Blob([e], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(r), { type: "module" });
  }
  async addLayer(e, r, t) {
    if (this.layers.has(e)) {
      console.warn(`Layer with ID "${e}" already exists.`);
      return;
    }
    const {
      model: a,
      date: i,
      run: d,
      forecastHour: l,
      variable: p,
      smoothing: m,
      colormap: s,
      opacity: L = 1,
      visible: f = !0
    } = r;
    if (!a || !i || !d || l === void 0 || !p || m === void 0 || !s)
      throw new Error("Missing required options. You must provide model, date, run, forecastHour, variable, smoothing, and colormap.");
    const h = $[a];
    if (!h)
      throw new Error(`Model "${a}" not found in coordinate configurations.`);
    const y = h.grid_params, u = `${this.baseUrl}/${a}/${i}/${d}/${l}/${p}/${m}`, o = new x(e);
    this.map.addLayer(o, t);
    const b = { id: e, shaderLayer: o, options: r, visible: f };
    this.layers.set(e, b);
    try {
      const n = await fetch(u);
      if (!n.ok) throw new Error(`HTTP error! Status: ${n.status} for URL: ${u}`);
      const { data: k, encoding: g } = await n.json(), w = Uint8Array.from(atob(k), (c) => c.charCodeAt(0));
      this.worker.postMessage({ compressedData: w, encoding: g }, [w.buffer]);
      const D = (c) => {
        if (this.worker.removeEventListener("message", D), c.data.success) {
          const { decompressedData: v } = c.data;
          o.updateDataTexture(v, g, y.nx, y.ny), o.updateColormapTexture(s);
          const R = [s[0], s[s.length - 2]];
          o.updateStyle({ opacity: f ? L : 0, dataRange: R }), this.map.triggerRepaint();
        } else
          console.error("[MAIN] Worker failed to process data:", c.data.error);
      };
      this.worker.addEventListener("message", D);
    } catch (n) {
      console.error(`Failed to load data for layer "${e}":`, n);
    }
  }
  updateLayer(e, r) {
    const t = this.layers.get(e);
    if (!t) return;
    const { shaderLayer: a } = t;
    r.colormap && (a.updateColormapTexture(r.colormap), t.options.colormap = r.colormap), r.opacity !== void 0 && (t.options.opacity = r.opacity, t.visible && a.updateStyle({ opacity: r.opacity })), this.map.triggerRepaint();
  }
  setVisible(e, r) {
    const t = this.layers.get(e);
    if (!t) return;
    t.visible = r;
    const a = r ? t.options.opacity : 0;
    t.shaderLayer.updateStyle({ opacity: a }), this.map.triggerRepaint();
  }
  removeLayer(e) {
    this.layers.has(e) && (this.map.getLayer(e) && this.map.removeLayer(e), this.layers.delete(e));
  }
  destroy() {
    this.worker && this.worker.terminate();
    for (const e of this.layers.keys())
      this.removeLayer(e);
  }
}
export {
  A as FillLayerManager
};
