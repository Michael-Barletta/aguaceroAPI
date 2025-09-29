class E {
  constructor() {
    this.callbacks = {};
  }
  on(t, e) {
    this.callbacks[t] || (this.callbacks[t] = []), this.callbacks[t].push(e);
  }
  emit(t, e) {
    let r = this.callbacks[t];
    r && r.forEach((o) => o(e));
  }
}
class x {
  constructor(t) {
    this.id = t, this.type = "custom", this.renderingMode = "2d", this.map = null, this.gl = null, this.program = null, this.opacity = 1, this.dataRange = [0, 1], this.vertexBuffer = null, this.indexBuffer = null, this.indexCount = 0, this.dataTexture = null, this.colormapTexture = null, this.encoding = null, this.textureWidth = 0, this.textureHeight = 0;
  }
  onAdd(t, e) {
    this.map = t, this.gl = e;
    const r = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_matrix;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }`, o = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_data_texture;
            uniform sampler2D u_colormap_texture;
            uniform float u_scale;
            uniform float u_offset;
            uniform float u_missing_quantized;
            uniform float u_opacity;
            uniform vec2 u_data_range;

            // NEW: Uniform for the dimensions of the data grid
            uniform vec2 u_texture_size;

            // Helper function to get the signed quantized value at a specific texture coordinate
            float get_value(vec2 coord) {
                float value_0_to_255 = texture2D(u_data_texture, coord).r * 255.0;
                // Return a special high value for missing data to ignore it during interpolation
                if (abs((value_0_to_255 - 128.0) - u_missing_quantized) < 0.5) {
                    return 9999.0;
                }
                return value_0_to_255 - 128.0;
            }

            void main() {
                // --- BILINEAR INTERPOLATION LOGIC ---
                // 1. Calculate the coordinates of the pixel in the texture grid
                vec2 tex_coord_in_texels = v_texCoord * u_texture_size;
                vec2 pixel_floor = floor(tex_coord_in_texels - 0.5);
                vec2 pixel_fract = fract(tex_coord_in_texels - 0.5);

                // 2. Get the texture coordinates for the 4 surrounding data points
                vec2 texel_size = 1.0 / u_texture_size;
                vec2 v00_coord = (pixel_floor + vec2(0.5, 0.5)) * texel_size; // Bottom-left
                vec2 v10_coord = (pixel_floor + vec2(1.5, 0.5)) * texel_size; // Bottom-right
                vec2 v01_coord = (pixel_floor + vec2(0.5, 1.5)) * texel_size; // Top-left
                vec2 v11_coord = (pixel_floor + vec2(1.5, 1.5)) * texel_size; // Top-right

                // 3. Sample the quantized value at each of the 4 points
                float v00 = get_value(v00_coord);
                float v10 = get_value(v10_coord);
                float v01 = get_value(v01_coord);
                float v11 = get_value(v11_coord);
                
                // 4. Perform weighted average, ignoring any missing data points
                float total_weight = 0.0;
                float total_value = 0.0;
                if (v00 < 9000.0) { float w = (1.0 - pixel_fract.x) * (1.0 - pixel_fract.y); total_value += v00 * w; total_weight += w; }
                if (v10 < 9000.0) { float w = pixel_fract.x * (1.0 - pixel_fract.y); total_value += v10 * w; total_weight += w; }
                if (v01 < 9000.0) { float w = (1.0 - pixel_fract.x) * pixel_fract.y; total_value += v01 * w; total_weight += w; }
                if (v11 < 9000.0) { float w = pixel_fract.x * pixel_fract.y; total_value += v11 * w; total_weight += w; }

                // If all 4 points were missing, discard the pixel
                if (total_weight <= 0.0) {
                    discard;
                }

                // The final interpolated quantized value
                float quantized_value = total_value / total_weight;

                // --- END INTERPOLATION ---

                // The rest of the logic remains the same
                float physical_value_celsius = quantized_value * u_scale + u_offset;
                float physical_value_fahrenheit = physical_value_celsius * 1.8 + 32.0;
                float colormap_coord = clamp((physical_value_fahrenheit - u_data_range.x) / (u_data_range.y - u_data_range.x), 0.0, 1.0);
                vec4 color = texture2D(u_colormap_texture, vec2(colormap_coord, 0.5));
                if (color.a < 0.1) discard;
                gl_FragColor = vec4(color.rgb, color.a * u_opacity);
            }`, a = e.createShader(e.VERTEX_SHADER);
    e.shaderSource(a, r), e.compileShader(a);
    const s = e.createShader(e.FRAGMENT_SHADER);
    e.shaderSource(s, o), e.compileShader(s), this.program = e.createProgram(), e.attachShader(this.program, a), e.attachShader(this.program, s), e.linkProgram(this.program), this.a_position = e.getAttribLocation(this.program, "a_position"), this.a_texCoord = e.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = e.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = e.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = e.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = e.getUniformLocation(this.program, "u_opacity"), this.u_data_range = e.getUniformLocation(this.program, "u_data_range"), this.u_scale = e.getUniformLocation(this.program, "u_scale"), this.u_offset = e.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = e.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = e.getUniformLocation(this.program, "u_texture_size"), this.vertexBuffer = e.createBuffer(), this.indexBuffer = e.createBuffer(), this.dataTexture = e.createTexture(), this.colormapTexture = e.createTexture(), this.updateGeometry();
  }
  updateGeometry(t = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const e = this.gl;
    if (!e) return;
    const r = 120, o = [], a = [], s = 89.5;
    for (let i = 0; i <= r; i++)
      for (let l = 0; l <= r; l++) {
        const _ = l / r, c = i / r, d = t.lon_tl + _ * (t.lon_tr - t.lon_tl);
        let n = t.lat_tl + c * (t.lat_bl - t.lat_tl);
        n = Math.max(-s, Math.min(s, n));
        const h = mapboxgl.MercatorCoordinate.fromLngLat({ lon: d, lat: n }), u = _, m = c;
        o.push(h.x, h.y, u, m);
      }
    for (let i = 0; i < r; i++)
      for (let l = 0; l < r; l++) {
        const _ = i * (r + 1) + l, c = _ + 1, d = (i + 1) * (r + 1) + l, n = d + 1;
        a.push(_, d, c, c, d, n);
      }
    e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.bufferData(e.ARRAY_BUFFER, new Float32Array(o), e.STATIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.indexBuffer), e.bufferData(e.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), e.STATIC_DRAW), this.indexCount = a.length;
  }
  updateDataTexture(t, e, r, o) {
    const a = this.gl;
    if (!a) return;
    this.encoding = e, this.textureWidth = r, this.textureHeight = o;
    const s = new Uint8Array(t.length);
    for (let i = 0; i < t.length; i++) {
      const l = t[i] > 127 ? t[i] - 256 : t[i];
      s[i] = l + 128;
    }
    a.bindTexture(a.TEXTURE_2D, this.dataTexture), a.pixelStorei(a.UNPACK_ALIGNMENT, 1), a.texImage2D(a.TEXTURE_2D, 0, a.LUMINANCE, r, o, 0, a.LUMINANCE, a.UNSIGNED_BYTE, s), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
  }
  updateColormapTexture(t) {
    const e = this.gl;
    if (!e) return;
    const r = 256, o = new Uint8Array(r * 4), a = [];
    for (let n = 0; n < t.length; n += 2)
      a.push({ value: t[n], color: t[n + 1] });
    if (a.length === 0) return;
    const s = a[0].value, l = a[a.length - 1].value - s, _ = (n) => [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)], c = (n, h, u) => [Math.round(n[0] * (1 - u) + h[0] * u), Math.round(n[1] * (1 - u) + h[1] * u), Math.round(n[2] * (1 - u) + h[2] * u)];
    let d = 0;
    for (let n = 0; n < r; n++) {
      const h = s + n / (r - 1) * l;
      for (; d < a.length - 2 && h > a[d + 1].value; )
        d++;
      const u = a[d], m = a[d + 1], g = (h - u.value) / (m.value - u.value), f = c(_(u.color), _(m.color), g);
      o[n * 4] = f[0], o[n * 4 + 1] = f[1], o[n * 4 + 2] = f[2], o[n * 4 + 3] = 255;
    }
    e.bindTexture(e.TEXTURE_2D, this.colormapTexture), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, r, 1, 0, e.RGBA, e.UNSIGNED_BYTE, o), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE);
  }
  updateStyle({ opacity: t, dataRange: e }) {
    t !== void 0 && (this.opacity = t), e !== void 0 && (this.dataRange = e);
  }
  render(t, e) {
    !this.program || !this.encoding || !this.vertexBuffer || !this.indexBuffer || (t.useProgram(this.program), t.uniformMatrix4fv(this.u_matrix, !1, e), t.uniform1f(this.u_opacity, this.opacity), t.uniform2f(this.u_data_range, this.dataRange[0], this.dataRange[1]), t.uniform1f(this.u_scale, this.encoding.scale), t.uniform1f(this.u_offset, this.encoding.offset), t.uniform1f(this.u_missing_quantized, this.encoding.missing_quantized || 127), t.uniform2f(this.u_texture_size, this.textureWidth, this.textureHeight), t.activeTexture(t.TEXTURE0), t.bindTexture(t.TEXTURE_2D, this.dataTexture), t.uniform1i(this.u_data_texture, 0), t.activeTexture(t.TEXTURE1), t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.uniform1i(this.u_colormap_texture, 1), t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.enableVertexAttribArray(this.a_position), t.vertexAttribPointer(this.a_position, 2, t.FLOAT, !1, 16, 0), t.enableVertexAttribArray(this.a_texCoord), t.vertexAttribPointer(this.a_texCoord, 2, t.FLOAT, !1, 16, 8), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.enable(t.BLEND), t.blendFunc(t.SRC_ALPHA, t.ONE_MINUS_SRC_ALPHA), t.drawElements(t.TRIANGLES, this.indexCount, t.UNSIGNED_SHORT, 0));
  }
  onRemove() {
    this.gl && (this.program && this.gl.deleteProgram(this.program), this.vertexBuffer && this.gl.deleteBuffer(this.vertexBuffer), this.indexBuffer && this.gl.deleteBuffer(this.indexBuffer), this.dataTexture && this.gl.deleteTexture(this.dataTexture), this.colormapTexture && this.gl.deleteTexture(this.colormapTexture));
  }
}
const y = {
  arome1: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 2801,
      ny: 1791,
      dx_degrees: 0.01,
      dy_degrees: 0.01,
      lon_first: 348,
      lat_first: 55.4,
      lon_last: 16,
      lat_last: 37.5
    }
  },
  arome25: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1121,
      ny: 717,
      dx_degrees: 0.025,
      dy_degrees: 0.025,
      lon_first: 348,
      lat_first: 55.4,
      lon_last: 16,
      lat_last: 37.5
    }
  },
  arpegeeu: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 741,
      ny: 521,
      dx_degrees: 0.1,
      dy_degrees: 0.1,
      lon_first: 328,
      lat_first: 72,
      lon_last: 42,
      lat_last: 20
    }
  },
  arw: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 1473,
      ny: 1025,
      dx: 5079,
      dy: -5079,
      x_origin: -4228646497e-3,
      y_origin: 4370737239e-3
    }
  },
  ecmwf: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1440,
      ny: 721,
      dx_degrees: 0.25,
      dy_degrees: 0.25,
      lon_first: 180,
      lat_first: 90,
      lon_last: 179.75,
      lat_last: -90
    }
  },
  gefs: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 720,
      ny: 361,
      dx_degrees: 0.5,
      dy_degrees: 0.5,
      lon_first: 0,
      lat_first: 90,
      lon_last: 359.5,
      lat_last: -90
    }
  },
  gem: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 2400,
      ny: 1201,
      dx_degrees: 0.15,
      dy_degrees: 0.15,
      lon_first: 180,
      lat_first: -90,
      lon_last: 179.85,
      lat_last: 90
    }
  },
  gfs: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1440,
      ny: 721,
      dx_degrees: 0.25,
      dy_degrees: 0.25,
      lon_first: 0,
      lat_first: -90,
      lon_last: 359.75,
      lat_last: 90
    }
  },
  hrdps: {
    type: "rotated_latlon",
    proj_params: {
      proj: "ob_tran",
      o_proj: "longlat",
      o_lat_p: 53.91148,
      o_lon_p: 245.305142,
      lon_0: 0,
      datum: "WGS84"
    },
    grid_params: {
      nx: 2540,
      ny: 1290,
      dx_degrees: 0.0225,
      dy_degrees: -0.0225,
      lon_first: -14.83247,
      lat_first: 16.711251,
      lon_last: 42.317533,
      lat_last: -12.313751
    }
  },
  hrrr: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 38.5,
      lat_2: 38.5,
      lat_0: 38.5,
      lon_0: -97.5,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 1799,
      ny: 1059,
      dx: 3e3,
      dy: -3e3,
      x_origin: -269902014252193e-8,
      y_origin: 1.5881938474433357e6
    }
  },
  icond2: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1215,
      ny: 746,
      dx_degrees: 0.02,
      dy_degrees: 0.02,
      lon_first: 356.06,
      lat_first: 43.18,
      lon_last: 20.34,
      lat_last: 58.08
    }
  },
  iconeu: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1377,
      ny: 657,
      dx_degrees: 0.0625,
      dy_degrees: 0.0625,
      lon_first: 336.5,
      lat_first: 29.5,
      lon_last: 62.5,
      lat_last: 70.5
    }
  },
  nam: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 50,
      lat_2: 50,
      lat_0: 50,
      lon_0: -107,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 349,
      ny: 277,
      dx: 32463,
      dy: -32463,
      x_origin: -5648899364e-3,
      y_origin: 4363452854e-3
    }
  },
  rap: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 451,
      ny: 337,
      dx: 13545,
      dy: -13545,
      x_origin: -3338927789e-3,
      y_origin: 3968999735e-3
    }
  },
  rgem: {
    type: "polar_stereographic",
    proj_params: {
      proj: "stere",
      lat_ts: 60,
      lon_0: -111,
      x_0: 0,
      y_0: 0,
      R: 6371229,
      units: "m"
    },
    grid_params: {
      nx: 935,
      ny: 824,
      dx: 1e4,
      dy: -1e4,
      x_origin: -4556441403e-3,
      y_origin: 920682.141
    }
  },
  hwrf: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 601,
      ny: 601,
      dx_degrees: 0.015,
      dy_degrees: 0.015
    }
  },
  hmon: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 450,
      ny: 375,
      dx_degrees: 0.02,
      dy_degrees: 0.02
    }
  },
  hfsa: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1001,
      ny: 801,
      dx_degrees: 0.019999,
      dy_degrees: 0.019999
    }
  },
  hfsb: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 1001,
      ny: 801,
      dx_degrees: 0.019999,
      dy_degrees: 0.019999
    }
  },
  rtma: {
    type: "lambert_conformal_conic",
    proj_params: {
      proj: "lcc",
      lat_1: 25,
      lat_2: 25,
      lat_0: 25,
      lon_0: -95,
      x_0: 0,
      y_0: 0,
      R: 6371200
    },
    grid_params: {
      nx: 2345,
      ny: 1597,
      dx: 2539.703,
      dy: -2539.703,
      x_origin: -3272421457e-3,
      y_origin: 3790842106e-3
    }
  },
  mrms: {
    type: "latlon",
    proj_params: {
      proj: "longlat",
      datum: "WGS84"
    },
    grid_params: {
      nx: 7e3,
      ny: 3500,
      dx_degrees: 0.01,
      dy_degrees: 0.01,
      lon_first: 230.005,
      lat_first: 54.995,
      lon_last: 299.994998,
      lat_last: 20.005001
    }
  }
};
function v(p, t) {
  const e = p?.[t];
  if (!e) return null;
  const r = Object.keys(e).sort((o, a) => a.localeCompare(o));
  for (const o of r) {
    const a = e[o];
    if (!a) continue;
    const s = Object.keys(a).sort((i, l) => l.localeCompare(i));
    if (s.length > 0) return { date: o, run: s[0] };
  }
  return null;
}
class T extends E {
  /**
   * Creates an instance of FillLayerManager.
   * @param {mapboxgl.Map} map - The Mapbox GL map instance.
   * @param {object} [options={}] - Configuration options.
   * @param {string} [options.id='weather-layer'] - A unique ID for the map layer.
   * @param {object} [options.layerOptions] - Base options for the weather layer (model, variable, etc.).
   * @param {'on-demand'|'preload'} [options.loadStrategy='on-demand'] - The data loading strategy.
   */
  constructor(t, e = {}) {
    if (super(), !t) throw new Error("A Mapbox GL map instance is required.");
    if (this.map = t, this.layers = /* @__PURE__ */ new Map(), this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker(), this.statusUrl = "https://d3dc62msmxkrd7.cloudfront.net/model-status", this.modelStatus = null, this.gridDataCache = /* @__PURE__ */ new Map(), this.loadStrategy = e.loadStrategy || "on-demand", !["on-demand", "preload"].includes(this.loadStrategy))
      throw new Error(`Invalid loadStrategy: "${this.loadStrategy}". Must be 'on-demand' or 'preload'.`);
    this.layerId = e.id || "weather-layer", this.baseLayerOptions = e.layerOptions || {}, this.state = {
      model: e.layerOptions.model || "gfs",
      date: null,
      run: null,
      forecastHour: 0,
      visible: !0,
      opacity: 0.7
    }, this.autoRefreshInterval = null;
  }
  /**
   * Creates the data decompression web worker.
   * @private
   */
  createWorker() {
    const t = `
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
        `, e = new Blob([t], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(e), { type: "module" });
  }
  async _preloadCurrentRun() {
    const { model: t, date: e, run: r } = this.state, o = this.modelStatus?.[t]?.[e]?.[r];
    if (!o || o.length === 0)
      return;
    console.log(`Preloading ${o.length} forecast hours for ${t} ${e}/${r}Z...`);
    const a = o.map((s) => {
      const i = { ...this.state, forecastHour: s };
      return this._loadGridData(i);
    });
    await Promise.all(a), console.log("Preloading complete.");
  }
  /**
   * Fetches and caches the model status data.
   * @param {boolean} [force=false] - If true, bypasses the cache and fetches fresh data.
   */
  async fetchModelStatus(t = !1) {
    if (!this.modelStatus || t) {
      t && console.log("Forcing model status refresh...");
      try {
        const e = await fetch(this.statusUrl);
        if (!e.ok) throw new Error(`HTTP error! Status: ${e.status}`);
        this.modelStatus = (await e.json()).models;
      } catch (e) {
        console.error("Could not load model status:", e), this.modelStatus = null;
      }
    }
    return this.modelStatus;
  }
  /**
   * Starts an interval to automatically refresh the model status data.
   * @param {number} [intervalMinutes=1] - The refresh interval in minutes.
   */
  startAutoRefresh(t = 1) {
    this.stopAutoRefresh(), this.autoRefreshInterval = setInterval(async () => {
      await this.fetchModelStatus(!0), this.emit("state:change", this.state);
    }, t * 60 * 1e3);
  }
  /**
   * Stops the automatic refresh interval.
   */
  stopAutoRefresh() {
    this.autoRefreshInterval && (clearInterval(this.autoRefreshInterval), this.autoRefreshInterval = null);
  }
  clearCache() {
    this.gridDataCache.clear();
  }
  /**
   * Loads grid data from the cache or fetches it from the network.
   * @private
   * @returns {Promise<Uint8Array|null>} The decompressed grid data.
   */
  async _loadGridData(t) {
    const { model: e, date: r, run: o, forecastHour: a, variable: s, smoothing: i } = { ...this.baseLayerOptions, ...t }, l = `${e}-${r}-${o}-${a}-${s}-${i}`;
    if (this.gridDataCache.has(l))
      return this.gridDataCache.get(l);
    const _ = `${this.baseUrl}/${e}/${r}/${o}/${a}/${s}/${i}`;
    try {
      const c = await fetch(_);
      if (!c.ok) throw new Error(`HTTP ${c.status}`);
      const { data: d, encoding: n } = await c.json(), h = Uint8Array.from(atob(d), (u) => u.charCodeAt(0));
      return new Promise((u) => {
        const m = (g) => {
          if (this.worker.removeEventListener("message", m), g.data.success) {
            const f = {
              data: g.data.decompressedData,
              encoding: n
            };
            this.gridDataCache.set(l, f), u(f);
          } else
            console.error("Worker failed:", g.data.error), u(null);
        };
        this.worker.addEventListener("message", m), this.worker.postMessage({ compressedData: h, encoding: n }, [h.buffer]);
      });
    } catch {
      return null;
    }
  }
  /**
   * Renders a grid layer on the map using the provided data.
   * @private
   */
  _renderLayer(t, e, r, o) {
    this.removeLayer(t);
    const { model: a, colormap: s, opacity: i = 1, visible: l = !0 } = e, _ = y[a];
    if (!_) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const c = _.grid_params, d = new x(t);
    this.map.addLayer(d), this.layers.set(t, { id: t, shaderLayer: d, options: e, visible: l }), d.updateDataTexture(r, o, c.nx, c.ny), d.updateColormapTexture(s);
    const n = [s[0], s[s.length - 2]];
    d.updateStyle({ opacity: l ? i : 0, dataRange: n }), this.map.triggerRepaint();
  }
  _updateOrCreateLayer(t, e, r, o) {
    const { model: a, colormap: s, opacity: i = 1, visible: l = !0 } = e, _ = y[a];
    if (!_) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const c = _.grid_params, d = [s[0], s[s.length - 2]];
    if (this.layers.has(t)) {
      const h = this.layers.get(t).shaderLayer;
      h.updateDataTexture(r, o, c.nx, c.ny), h.updateStyle({ opacity: l ? i : 0, dataRange: d });
    } else {
      const n = new x(t);
      this.map.addLayer(n), this.layers.set(t, { id: t, shaderLayer: n, options: e, visible: l }), n.updateDataTexture(r, o, c.nx, c.ny), n.updateColormapTexture(s), n.updateStyle({ opacity: l ? i : 0, dataRange: d });
    }
    this.map.triggerRepaint();
  }
  /**
   * Updates the manager's state, triggers data loading and rendering.
   * @param {object} newState - The new state properties to apply.
   */
  async setState(t) {
    Object.assign(this.state, t);
    const e = await this._loadGridData(this.state);
    if (e && e.data) {
      const r = { ...this.baseLayerOptions, ...this.state };
      this._updateOrCreateLayer(this.layerId, r, e.data, e.encoding);
    } else
      this.removeLayer(this.layerId);
    this.emit("state:change", this.state);
  }
  /**
   * Initializes the manager by fetching the latest model run and rendering the first frame.
   */
  async initialize() {
    const t = await this.fetchModelStatus(), e = v(t, this.state.model);
    e ? await this.setState({ ...e, forecastHour: 0 }) : (console.error(`Could not initialize. No runs found for model "${this.state.model}".`), this.emit("state:change", this.state));
  }
  /**
   * Removes a layer from the map.
   * @param {string} id - The ID of the layer to remove.
   */
  removeLayer(t) {
    this.layers.has(t) && (this.map.getLayer(t) && this.map.removeLayer(t), this.layers.delete(t));
  }
}
class R {
  /**
   * Creates an instance of RunSelectorPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   * @param {function(string, string): string} [options.runFormatter] - A function to format the display text in the dropdown.
   */
  constructor(t, e = {}) {
    this.manager = t, this.element = null, this.selectElement = null, this.options = {
      label: e.label || `Model Run (${this.manager.state.model.toUpperCase()})`,
      runFormatter: e.runFormatter || this._defaultFormatRunDisplay
    };
  }
  /**
   * The default formatter for displaying date/run combinations.
   * @param {string} date - Date in YYYYMMDD format.
   * @param {string} run - Run hour in HH format.
   * @returns {string} - Formatted string like "2025-09-28 (18Z)".
   * @private
   */
  _defaultFormatRunDisplay(t, e) {
    const r = t.substring(0, 4), o = t.substring(4, 6), a = t.substring(6, 8);
    return `${r}-${o}-${a} (${e}Z)`;
  }
  /**
   * Populates the select dropdown with available runs from the manager's state.
   * @private
   */
  _populate() {
    const t = this.manager.modelStatus, e = this.manager.state.model;
    if (!t || !this.selectElement) return;
    const r = t[e];
    if (!r) {
      this.selectElement.innerHTML = "<option>Model offline</option>", this.selectElement.disabled = !0;
      return;
    }
    const o = [];
    for (const a in r)
      for (const s in r[a])
        o.push({ date: a, run: s });
    o.sort((a, s) => {
      const i = s.date.localeCompare(a.date);
      return i !== 0 ? i : s.run.localeCompare(a.run);
    }), this.selectElement.innerHTML = "", o.forEach(({ date: a, run: s }) => {
      const i = document.createElement("option");
      i.value = `${a}:${s}`, i.textContent = this.options.runFormatter(a, s), this.selectElement.appendChild(i);
    }), this.selectElement.value = `${this.manager.state.date}:${this.manager.state.run}`, this.selectElement.disabled = !1;
  }
  /**
   * Renders the panel and appends it to a target DOM element.
   * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
   * @returns {this} The instance for chaining.
   */
  addTo(t) {
    const e = typeof t == "string" ? document.querySelector(t) : t;
    if (!e)
      throw new Error(`AguaceroAPI Error: The target element "${t}" for RunSelectorPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-run-selector", this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}</label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `, this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (r) => {
      const [o, a] = r.target.value.split(":");
      this.manager.setState({ date: o, run: a, forecastHour: 0 });
    }), this.manager.on("state:change", () => this._populate()), e.appendChild(this.element), this;
  }
}
class b {
  /**
   * Creates an instance of ForecastSliderPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   */
  constructor(t, e = {}) {
    this.manager = t, this.element = null, this.sliderElement = null, this.displayElement = null, this.pendingUpdate = !1, this.latestForecastHour = null, this.options = {
      label: e.label || "Forecast Hour"
    };
  }
  /**
   * Updates the slider's range and value based on the manager's current state.
   * @private
   */
  _update() {
    const { model: t, date: e, run: r, forecastHour: o } = this.manager.state, a = this.manager.modelStatus?.[t]?.[e]?.[r];
    if (!a || a.length === 0) {
      this.sliderElement.disabled = !0, this.sliderElement.max = 0, this.displayElement.textContent = "N/A";
      return;
    }
    const s = a.indexOf(o);
    this.sliderElement.max = a.length - 1, this.sliderElement.value = s >= 0 ? s : 0, this.displayElement.textContent = o, this.sliderElement.disabled = !1;
  }
  /**
   * The function that performs the expensive state update.
   * It is called by requestAnimationFrame to run only once per frame.
   * @private
   */
  _performUpdate() {
    this.pendingUpdate && (this.pendingUpdate = !1, this.manager.setState({ forecastHour: this.latestForecastHour }));
  }
  /**
   * Renders the panel and appends it to a target DOM element.
   * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
   * @returns {this} The instance for chaining.
   */
  addTo(t) {
    const e = typeof t == "string" ? document.querySelector(t) : t;
    if (!e)
      throw new Error(`AguaceroAPI Error: The target element "${t}" for ForecastSliderPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-slider", this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}: +<span class="aguacero-slider-display">0</span>hr</label>
            <input type="range" class="aguacero-slider-input" min="0" max="0" value="0" step="1" disabled>
        `, this.sliderElement = this.element.querySelector("input"), this.displayElement = this.element.querySelector("span"), this.sliderElement.addEventListener("input", (r) => {
      const { model: o, date: a, run: s } = this.manager.state, i = this.manager.modelStatus[o][a][s];
      if (!i) return;
      const l = i[parseInt(r.target.value, 10)];
      this.displayElement.textContent = l, this.latestForecastHour = l, this.pendingUpdate || (this.pendingUpdate = !0, requestAnimationFrame(() => this._performUpdate()));
    }), this.manager.on("state:change", () => this._update()), e.appendChild(this.element), this;
  }
}
export {
  T as FillLayerManager,
  b as ForecastSliderPanel,
  R as RunSelectorPanel
};
