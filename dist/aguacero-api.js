class A {
  constructor() {
    this.callbacks = {};
  }
  on(e, t) {
    this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t);
  }
  emit(e, t) {
    let r = this.callbacks[e];
    r && r.forEach((o) => o(t));
  }
}
class T {
  constructor(e) {
    this.id = e, this.type = "custom", this.renderingMode = "2d", this.map = null, this.gl = null, this.program = null, this.opacity = 1, this.dataRange = [0, 1], this.vertexBuffer = null, this.indexBuffer = null, this.indexCount = 0, this.dataTexture = null, this.colormapTexture = null, this.encoding = null, this.textureWidth = 0, this.textureHeight = 0;
  }
  onAdd(e, t) {
    this.map = e, this.gl = t;
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
            }`, a = t.createShader(t.VERTEX_SHADER);
    t.shaderSource(a, r), t.compileShader(a);
    const s = t.createShader(t.FRAGMENT_SHADER);
    t.shaderSource(s, o), t.compileShader(s), this.program = t.createProgram(), t.attachShader(this.program, a), t.attachShader(this.program, s), t.linkProgram(this.program), this.a_position = t.getAttribLocation(this.program, "a_position"), this.a_texCoord = t.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = t.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = t.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = t.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = t.getUniformLocation(this.program, "u_opacity"), this.u_data_range = t.getUniformLocation(this.program, "u_data_range"), this.u_scale = t.getUniformLocation(this.program, "u_scale"), this.u_offset = t.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = t.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = t.getUniformLocation(this.program, "u_texture_size"), this.vertexBuffer = t.createBuffer(), this.indexBuffer = t.createBuffer(), this.dataTexture = t.createTexture(), this.colormapTexture = t.createTexture(), this.updateGeometry();
  }
  updateGeometry(e = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const t = this.gl;
    if (!t) return;
    const r = 120, o = [], a = [], s = 89.5;
    for (let n = 0; n <= r; n++)
      for (let d = 0; d <= r; d++) {
        const p = d / r, h = n / r, u = e.lon_tl + p * (e.lon_tr - e.lon_tl);
        let l = e.lat_tl + h * (e.lat_bl - e.lat_tl);
        l = Math.max(-s, Math.min(s, l));
        const f = mapboxgl.MercatorCoordinate.fromLngLat({ lon: u, lat: l }), _ = p, y = h;
        o.push(f.x, f.y, _, y);
      }
    for (let n = 0; n < r; n++)
      for (let d = 0; d < r; d++) {
        const p = n * (r + 1) + d, h = p + 1, u = (n + 1) * (r + 1) + d, l = u + 1;
        a.push(p, u, h, h, u, l);
      }
    t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, new Float32Array(o), t.STATIC_DRAW), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.bufferData(t.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), t.STATIC_DRAW), this.indexCount = a.length;
  }
  updateDataTexture(e, t, r, o) {
    const a = this.gl;
    if (!a) return;
    this.encoding = t, this.textureWidth = r, this.textureHeight = o;
    const s = new Uint8Array(e.length);
    for (let n = 0; n < e.length; n++) {
      const d = e[n] > 127 ? e[n] - 256 : e[n];
      s[n] = d + 128;
    }
    a.bindTexture(a.TEXTURE_2D, this.dataTexture), a.pixelStorei(a.UNPACK_ALIGNMENT, 1), a.texImage2D(a.TEXTURE_2D, 0, a.LUMINANCE, r, o, 0, a.LUMINANCE, a.UNSIGNED_BYTE, s), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
  }
  updateColormapTexture(e) {
    const t = this.gl;
    if (!t) return;
    const r = 256, o = new Uint8Array(r * 4), a = [];
    for (let l = 0; l < e.length; l += 2)
      a.push({ value: e[l], color: e[l + 1] });
    if (a.length === 0) return;
    const s = a[0].value, d = a[a.length - 1].value - s, p = (l) => [parseInt(l.slice(1, 3), 16), parseInt(l.slice(3, 5), 16), parseInt(l.slice(5, 7), 16)], h = (l, f, _) => [Math.round(l[0] * (1 - _) + f[0] * _), Math.round(l[1] * (1 - _) + f[1] * _), Math.round(l[2] * (1 - _) + f[2] * _)];
    let u = 0;
    for (let l = 0; l < r; l++) {
      const f = s + l / (r - 1) * d;
      for (; u < a.length - 2 && f > a[u + 1].value; )
        u++;
      const _ = a[u], y = a[u + 1], v = (f - _.value) / (y.value - _.value), b = h(p(_.color), p(y.color), v);
      o[l * 4] = b[0], o[l * 4 + 1] = b[1], o[l * 4 + 2] = b[2], o[l * 4 + 3] = 255;
    }
    t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, r, 1, 0, t.RGBA, t.UNSIGNED_BYTE, o), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE);
  }
  updateStyle({ opacity: e, dataRange: t }) {
    e !== void 0 && (this.opacity = e), t !== void 0 && (this.dataRange = t);
  }
  render(e, t) {
    !this.program || !this.encoding || !this.vertexBuffer || !this.indexBuffer || (e.useProgram(this.program), e.uniformMatrix4fv(this.u_matrix, !1, t), e.uniform1f(this.u_opacity, this.opacity), e.uniform2f(this.u_data_range, this.dataRange[0], this.dataRange[1]), e.uniform1f(this.u_scale, this.encoding.scale), e.uniform1f(this.u_offset, this.encoding.offset), e.uniform1f(this.u_missing_quantized, this.encoding.missing_quantized || 127), e.uniform2f(this.u_texture_size, this.textureWidth, this.textureHeight), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.dataTexture), e.uniform1i(this.u_data_texture, 0), e.activeTexture(e.TEXTURE1), e.bindTexture(e.TEXTURE_2D, this.colormapTexture), e.uniform1i(this.u_colormap_texture, 1), e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.enableVertexAttribArray(this.a_position), e.vertexAttribPointer(this.a_position, 2, e.FLOAT, !1, 16, 0), e.enableVertexAttribArray(this.a_texCoord), e.vertexAttribPointer(this.a_texCoord, 2, e.FLOAT, !1, 16, 8), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.indexBuffer), e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.drawElements(e.TRIANGLES, this.indexCount, e.UNSIGNED_SHORT, 0));
  }
  onRemove() {
    this.gl && (this.program && this.gl.deleteProgram(this.program), this.vertexBuffer && this.gl.deleteBuffer(this.vertexBuffer), this.indexBuffer && this.gl.deleteBuffer(this.indexBuffer), this.dataTexture && this.gl.deleteTexture(this.dataTexture), this.colormapTexture && this.gl.deleteTexture(this.colormapTexture));
  }
}
const R = {
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
function M(i, e) {
  const t = i?.[e];
  if (!t) return null;
  const r = Object.keys(t).sort((o, a) => a.localeCompare(o));
  for (const o of r) {
    const a = t[o];
    if (!a) continue;
    const s = Object.keys(a).sort((n, d) => d.localeCompare(n));
    if (s.length > 0) return { date: o, run: s[0] };
  }
  return null;
}
class F extends A {
  /**
   * Creates an instance of FillLayerManager.
   * @param {mapboxgl.Map} map - The Mapbox GL map instance.
   * @param {object} [options={}] - Configuration options.
   * @param {string} [options.id='weather-layer'] - A unique ID for the map layer.
   * @param {object} [options.layerOptions] - Base options for the weather layer (model, variable, etc.).
   * @param {'on-demand'|'preload'} [options.loadStrategy='on-demand'] - The data loading strategy.
   */
  constructor(e, t = {}) {
    if (super(), !e) throw new Error("A Mapbox GL map instance is required.");
    if (this.map = e, this.layers = /* @__PURE__ */ new Map(), this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker(), this.statusUrl = "https://d3dc62msmxkrd7.cloudfront.net/model-status", this.modelStatus = null, this.gridDataCache = /* @__PURE__ */ new Map(), this.loadStrategy = t.loadStrategy || "on-demand", !["on-demand", "preload"].includes(this.loadStrategy))
      throw new Error(`Invalid loadStrategy: "${this.loadStrategy}". Must be 'on-demand' or 'preload'.`);
    this.layerId = t.id || "weather-layer", this.baseLayerOptions = t.layerOptions || {}, this.state = {
      model: t.layerOptions.model || "gfs",
      date: null,
      run: null,
      forecastHour: 0,
      visible: !0,
      opacity: 0.7
    }, this.autoRefreshEnabled = t.autoRefresh ?? !1, this.autoRefreshIntervalSeconds = t.autoRefreshInterval ?? 60, this.autoRefreshIntervalId = null;
  }
  /**
   * Creates the data decompression web worker.
   * @private
   */
  createWorker() {
    const e = `
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
        `, t = new Blob([e], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(t), { type: "module" });
  }
  async _preloadCurrentRun() {
    const { model: e, date: t, run: r } = this.state, o = this.modelStatus?.[e]?.[t]?.[r];
    if (!o || o.length === 0)
      return;
    console.log(`Preloading ${o.length} forecast hours for ${e} ${t}/${r}Z...`);
    const a = o.map((s) => {
      const n = { ...this.state, forecastHour: s };
      return this._loadGridData(n);
    });
    await Promise.all(a), console.log("Preloading complete.");
  }
  /**
   * Fetches and caches the model status data.
   * @param {boolean} [force=false] - If true, bypasses the cache and fetches fresh data.
   */
  async fetchModelStatus(e = !1) {
    if (!this.modelStatus || e) {
      e && console.log("Forcing model status refresh...");
      try {
        const t = await fetch(this.statusUrl);
        if (!t.ok) throw new Error(`HTTP error! Status: ${t.status}`);
        this.modelStatus = (await t.json()).models;
      } catch (t) {
        console.error("Could not load model status:", t), this.modelStatus = null;
      }
    }
    return this.modelStatus;
  }
  startAutoRefresh(e) {
    const t = e ?? this.autoRefreshIntervalSeconds ?? 60;
    this.stopAutoRefresh(), console.log(`[FillLayerManager] Starting auto-refresh every ${t} second(s).`), this.autoRefreshIntervalId = setInterval(async () => {
      console.log("[FillLayerManager] Auto-refresh triggered: fetching latest model status."), await this.fetchModelStatus(!0), this.emit("state:change", this.state);
    }, t * 1e3);
  }
  stopAutoRefresh() {
    this.autoRefreshIntervalId && (clearInterval(this.autoRefreshIntervalId), this.autoRefreshIntervalId = null, console.log("[FillLayerManager] Auto-refresh stopped."));
  }
  clearCache() {
    this.gridDataCache.clear();
  }
  /**
   * Loads grid data from the cache or fetches it from the network.
   * @private
   * @returns {Promise<Uint8Array|null>} The decompressed grid data.
   */
  async _loadGridData(e) {
    const { model: t, date: r, run: o, forecastHour: a, variable: s, smoothing: n } = { ...this.baseLayerOptions, ...e }, d = `${t}-${r}-${o}-${a}-${s}-${n}`;
    if (this.gridDataCache.has(d))
      return this.gridDataCache.get(d);
    const p = `${this.baseUrl}/${t}/${r}/${o}/${a}/${s}/${n}`;
    try {
      const h = await fetch(p);
      if (!h.ok) throw new Error(`HTTP ${h.status}`);
      const { data: u, encoding: l } = await h.json(), f = Uint8Array.from(atob(u), (_) => _.charCodeAt(0));
      return new Promise((_) => {
        const y = (v) => {
          if (this.worker.removeEventListener("message", y), v.data.success) {
            const b = {
              data: v.data.decompressedData,
              encoding: l
            };
            this.gridDataCache.set(d, b), _(b);
          } else
            console.error("Worker failed:", v.data.error), _(null);
        };
        this.worker.addEventListener("message", y), this.worker.postMessage({ compressedData: f, encoding: l }, [f.buffer]);
      });
    } catch {
      return null;
    }
  }
  /**
   * Renders a grid layer on the map using the provided data.
   * @private
   */
  _renderLayer(e, t, r, o) {
    this.removeLayer(e);
    const { model: a, colormap: s, opacity: n = 1, visible: d = !0 } = t, p = R[a];
    if (!p) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const h = p.grid_params, u = new T(e);
    this.map.addLayer(u), this.layers.set(e, { id: e, shaderLayer: u, options: t, visible: d }), u.updateDataTexture(r, o, h.nx, h.ny), u.updateColormapTexture(s);
    const l = [s[0], s[s.length - 2]];
    u.updateStyle({ opacity: d ? n : 0, dataRange: l }), this.map.triggerRepaint();
  }
  _updateOrCreateLayer(e, t, r, o) {
    const { model: a, colormap: s, opacity: n = 1, visible: d = !0 } = t, p = R[a];
    if (!p) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const h = p.grid_params, u = [s[0], s[s.length - 2]];
    if (this.layers.has(e)) {
      const f = this.layers.get(e).shaderLayer;
      f.updateDataTexture(r, o, h.nx, h.ny), f.updateStyle({ opacity: d ? n : 0, dataRange: u });
    } else {
      const l = new T(e), f = "AML_-_terrain";
      this.map.getLayer(f) ? this.map.addLayer(l, f) : (console.warn(`AguaceroAPI: Layer '${f}' not found. Adding weather layer to the top.`), this.map.addLayer(l)), this.layers.set(e, { id: e, shaderLayer: l, options: t, visible: d }), l.updateDataTexture(r, o, h.nx, h.ny), l.updateColormapTexture(s), l.updateStyle({ opacity: d ? n : 0, dataRange: u });
    }
    this.map.triggerRepaint();
  }
  /**
   * Updates the manager's state, triggers data loading and rendering.
   * @param {object} newState - The new state properties to apply.
   */
  async setState(e) {
    Object.assign(this.state, e);
    const t = await this._loadGridData(this.state);
    if (t && t.data) {
      const r = { ...this.baseLayerOptions, ...this.state };
      this._updateOrCreateLayer(this.layerId, r, t.data, t.encoding);
    } else
      this.removeLayer(this.layerId);
    this.emit("state:change", this.state);
  }
  /**
   * Initializes the manager by fetching the latest model run and rendering the first frame.
   */
  async initialize(e = {}) {
    const t = await this.fetchModelStatus(), r = M(t, this.state.model);
    if (r ? await this.setState({ ...r, forecastHour: 0 }) : (console.error(`Could not initialize. No runs found for model "${this.state.model}".`), this.emit("state:change", this.state)), e.autoRefresh ?? this.autoRefreshEnabled) {
      const a = e.refreshInterval ?? this.autoRefreshIntervalSeconds;
      this.startAutoRefresh(a);
    }
  }
  /**
   * Removes a layer from the map.
   * @param {string} id - The ID of the layer to remove.
   */
  removeLayer(e) {
    this.layers.has(e) && (this.map.getLayer(e) && this.map.removeLayer(e), this.layers.delete(e));
  }
}
const I = {
  landOcean: {
    landColor: "#f0f0f0",
    oceanColor: "#a8d8ea",
    waterDepth: {
      visible: !0,
      color: "#97c7d9"
    },
    nationalPark: {
      visible: !0,
      color: "#d4e6d4"
    }
  },
  transportation: {
    roads: { visible: !0, color: "#d3d3d3", width: 0.7 },
    airports: { visible: !0, color: "#d3d3d3", width: 0.7 }
  },
  boundaries: {
    countries: { visible: !0, color: "#000000", width: 1.5, lineType: "solid" },
    states: { visible: !0, color: "#000000", width: 1.5, lineType: "solid" },
    counties: { visible: !0, color: "#515151", width: 1.2, lineType: "solid" }
  },
  waterFeatures: {
    waterways: { visible: !0, color: "#a8d8ea", width: 0.7 }
  },
  labels: {
    countries: { visible: !1, fontFamily: "Open Sans Regular", fontSize: 14, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 },
    states: { visible: !1, fontFamily: "Open Sans Regular", fontSize: 12, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 },
    cities: {
      major: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 12, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 },
      minor: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 10, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 }
    },
    airports: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 11, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 },
    poi: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 10, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 },
    continents: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 16, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1.5 },
    waterLabels: { visible: !0, fontFamily: "Open Sans Italic", fontSize: 10, color: "#0077be", outlineColor: "#ffffff", outlineWidth: 1 },
    naturalLabels: { visible: !0, fontFamily: "Open Sans Italic", fontSize: 10, color: "#2E8B57", outlineColor: "#ffffff", outlineWidth: 1 },
    subdivisionLabels: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 11, color: "#000000", outlineColor: "#ffffff", outlineWidth: 1 }
  },
  terrain: {
    visible: !0,
    intensity: 0.15,
    shadowColor: "#b0b0b0",
    highlightColor: "#ffffff",
    accentColor: "#b0b0b0"
  },
  oceanOnTop: !1
}, P = {
  landOcean: {
    landColor: "#242424",
    oceanColor: "#252525",
    waterDepth: {
      visible: !0,
      color: "#000000"
    },
    nationalPark: {
      visible: !0,
      color: "#202020"
    }
  },
  transportation: {
    roads: { visible: !0, color: "#4f4f4f", width: 0.5 },
    airports: { visible: !0, color: "#4f4f4f", width: 0.6 }
  },
  boundaries: {
    countries: { visible: !0, color: "#ffffff", width: 1.5, lineType: "solid" },
    states: { visible: !0, color: "#ffffff", width: 1.5, lineType: "solid" },
    counties: { visible: !0, color: "#a2a2a2", width: 1.2, lineType: "solid" }
  },
  waterFeatures: {
    waterways: { visible: !0, color: "#333333", width: 0.5 }
  },
  labels: {
    countries: { visible: !1, fontFamily: "Open Sans Regular", fontSize: 14, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 },
    states: { visible: !1, fontFamily: "Open Sans Regular", fontSize: 12, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 },
    cities: {
      major: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 12, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 },
      minor: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 10, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 }
    },
    airports: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 11, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 },
    poi: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 10, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 },
    continents: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 16, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1.5 },
    waterLabels: { visible: !0, fontFamily: "Open Sans Italic", fontSize: 10, color: "#a8d8ea", outlineColor: "#000000", outlineWidth: 1 },
    naturalLabels: { visible: !0, fontFamily: "Open Sans Italic", fontSize: 10, color: "#90ee90", outlineColor: "#000000", outlineWidth: 1 },
    subdivisionLabels: { visible: !0, fontFamily: "Open Sans Regular", fontSize: 11, color: "#ffffff", outlineColor: "#000000", outlineWidth: 1 }
  },
  terrain: {
    visible: !0,
    intensity: 0.2,
    shadowColor: "#000000",
    highlightColor: "#FFFFFF",
    accentColor: "#000000"
  },
  oceanOnTop: !1
}, S = {
  light: I,
  dark: P
}, c = {
  // Background and water layers
  landColor: { layerId: "AML_-_land" },
  oceanColor: { layerId: "AML_-_water" },
  waterDepth: { layerId: "AML_-_water-depth" },
  nationalPark: { layerId: "AML_-_national-park" },
  // Line layers
  roads: { layerId: "AML_-_roads" },
  airports: { layerId: "AML_-_airports" },
  countries: { layerId: "AML_-_countries" },
  states: { layerId: "AML_-_states" },
  counties: { layerId: "AML_-_counties" },
  waterways: { layerId: "AML_-_waterway" },
  // Symbol (label) layers
  continents: { layerId: "AML_-_continent-label" },
  countriesLabels: { layerId: "AML_-_country-label" },
  statesLabels: { layerId: "AML_-_state-label" },
  citiesMajor: { layerId: "AML_-_major-city-label" },
  citiesMinor: { layerId: "AML_-_minor-city-label" },
  airportsLabels: { layerId: "AML_-_airport-label" },
  poi: { layerId: "AML_-_poi-label" },
  waterLabels: { layerId: "AML_-_water-point-label" },
  // Assuming point label for general water
  naturalLabels: { layerId: "AML_-_natural-point-label" },
  // Assuming point label for natural features
  subdivisionLabels: { layerId: "AML_-_subdivision-label" }
};
function g(i) {
  return typeof i == "string" && i.startsWith("#") && i.length === 9 ? i.substring(0, 7) : i;
}
const x = (i, e, t) => {
  if (i.getLayer(e) && (i.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), i.setPaintProperty(e, "line-color", g(t.color)), i.setPaintProperty(e, "line-width", t.width), t.lineType)) {
    const r = { dashed: [2, 2], dotted: [0, 2], solid: [] };
    i.setPaintProperty(e, "line-dasharray", r[t.lineType] || []);
  }
}, m = (i, e, t) => {
  i.getLayer(e) && (i.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), i.setPaintProperty(e, "text-color", g(t.color)), i.setPaintProperty(e, "text-halo-color", g(t.outlineColor)), i.setPaintProperty(e, "text-halo-width", t.outlineWidth), i.setLayoutProperty(e, "text-size", t.fontSize), i.setLayoutProperty(e, "text-font", [t.fontFamily]));
};
function w(i, e, t, r) {
  r && i.getLayer(e) && (r.color && i.setPaintProperty(e, t, g(r.color)), r.visible !== void 0 && i.setLayoutProperty(e, "visibility", r.visible ? "visible" : "none"));
}
function C(i, e) {
  if (!(!i || !i.isStyleLoaded())) {
    if (e.landOcean) {
      const { landColor: t, oceanColor: r, waterDepth: o, nationalPark: a } = e.landOcean;
      i.getLayer(c.landColor.layerId) && i.setPaintProperty(c.landColor.layerId, "background-color", g(t)), i.getLayer(c.oceanColor.layerId) && i.setPaintProperty(c.oceanColor.layerId, "fill-color", g(r)), w(i, c.waterDepth.layerId, "fill-color", o), w(i, c.nationalPark.layerId, "fill-color", a);
    }
    e.transportation && (x(i, c.roads.layerId, e.transportation.roads), x(i, c.airports.layerId, e.transportation.airports)), e.boundaries && (x(i, c.countries.layerId, e.boundaries.countries), x(i, c.states.layerId, e.boundaries.states), x(i, c.counties.layerId, e.boundaries.counties)), e.waterFeatures && x(i, c.waterways.layerId, e.waterFeatures.waterways), e.labels && (m(i, c.continents.layerId, e.labels.continents), m(i, c.countriesLabels.layerId, e.labels.countries), m(i, c.statesLabels.layerId, e.labels.states), m(i, c.citiesMajor.layerId, e.labels.cities.major), m(i, c.citiesMinor.layerId, e.labels.cities.minor), m(i, c.airportsLabels.layerId, e.labels.airports), m(i, c.poi.layerId, e.labels.poi), m(i, c.waterLabels.layerId, e.labels.waterLabels), m(i, c.naturalLabels.layerId, e.labels.naturalLabels), m(i, c.subdivisionLabels.layerId, e.labels.subdivisionLabels)), e.terrain && i.getSource("mapbox-dem") && (e.terrain.visible ? (i.setTerrain({ source: "mapbox-dem", exaggeration: 1 }), i.getLayer("hillshade") && (i.setPaintProperty("hillshade", "hillshade-exaggeration", e.terrain.intensity), i.setPaintProperty("hillshade", "hillshade-shadow-color", g(e.terrain.shadowColor)), i.setPaintProperty("hillshade", "hillshade-highlight-color", g(e.terrain.highlightColor)), i.setPaintProperty("hillshade", "hillshade-accent-color", g(e.terrain.accentColor)))) : i.setTerrain(null));
  }
}
function L(i, e) {
  const t = { ...i };
  return E(i) && E(e) && Object.keys(e).forEach((r) => {
    E(e[r]) ? r in i ? t[r] = L(i[r], e[r]) : Object.assign(t, { [r]: e[r] }) : Object.assign(t, { [r]: e[r] });
  }), t;
}
function E(i) {
  return i && typeof i == "object" && !Array.isArray(i);
}
const D = "mapbox://styles/aguacerowx/cmfvox8mq004u01qm5nlg7qkt";
class O extends A {
  constructor(e, t = {}) {
    if (super(), !e || !t.accessToken)
      throw new Error("A container ID and a Mapbox access token are required.");
    mapboxgl.accessToken = t.accessToken;
    let r = JSON.parse(JSON.stringify(S.light)), o = JSON.parse(JSON.stringify(S.dark));
    t.customStyles && (console.log("[MapManager] Custom styles provided. Merging..."), t.customStyles.light && (r = L(r, t.customStyles.light)), t.customStyles.dark && (o = L(o, t.customStyles.dark)), console.log("[MapManager] Final merged dark theme:", o)), this.themes = {
      light: r,
      dark: o
    };
    const a = t.defaultTheme || "light";
    this.currentCustomizations = this.themes[a], this.currentThemeName = a, this.weatherLayerManagers = /* @__PURE__ */ new Map(), this.map = new mapboxgl.Map({
      container: e,
      style: D,
      center: [-98, 39],
      zoom: 3.5,
      ...t.mapOptions
    }), this.map.on("load", () => {
      console.log("[MapManager] Map loaded. Applying initial theme:", a), C(this.map, this.currentCustomizations), this.emit("style:applied", {
        themeName: this.currentThemeName,
        styles: this.currentCustomizations
      });
    });
  }
  // The rest of the methods (setTheme, setLabelGroupVisibility, etc.) are correct and remain unchanged...
  setTheme(e) {
    if (!this.themes[e]) {
      console.error(`[MapManager] Theme "${e}" does not exist.`);
      return;
    }
    const t = JSON.parse(JSON.stringify(this.themes[e])), r = this.currentCustomizations.labels;
    if (r)
      for (const o in r) {
        r[o]?.hasOwnProperty("visible") && t.labels[o] && (t.labels[o].visible = r[o].visible);
        for (const a in r[o])
          r[o][a]?.hasOwnProperty("visible") && t.labels[o]?.[a] && (t.labels[o][a].visible = r[o][a].visible);
      }
    this.currentCustomizations = t, this.currentThemeName = e, C(this.map, this.currentCustomizations), this.emit("style:applied", {
      themeName: this.currentThemeName,
      styles: this.currentCustomizations
    });
  }
  setLabelGroupVisibility(e, t) {
    const r = `labels.${e}.visible`;
    let o = this.currentCustomizations;
    const a = r.split(".");
    for (let d = 0; d < a.length - 1; d++)
      if (o = o[a[d]], !o) {
        console.error(`Invalid label group key: ${e}`);
        return;
      }
    o[a[a.length - 1]] = t;
    const s = e.replace(/\.(.)/g, (d, p) => p.toUpperCase()), n = c[s]?.layerId;
    n && this.map.getLayer(n) ? (this.map.setLayoutProperty(n, "visibility", t ? "visible" : "none"), console.log(`[MapManager] Set visibility for ${n} to ${t}`)) : console.warn(`[MapManager] Could not find layer for label group key: ${e} (mapped to ${s})`);
  }
  addWeatherManager(e) {
    this.weatherLayerManagers.set(e.layerId, e);
  }
  getMap() {
    return this.map;
  }
}
class U {
  /**
   * Creates an instance of RunSelectorPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   * @param {function(string, string): string} [options.runFormatter] - A function to format the display text in the dropdown.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.selectElement = null, this.options = {
      label: t.label || `Model Run (${this.manager.state.model.toUpperCase()})`,
      runFormatter: t.runFormatter || this._defaultFormatRunDisplay
    };
  }
  /**
   * The default formatter for displaying date/run combinations.
   * @param {string} date - Date in YYYYMMDD format.
   * @param {string} run - Run hour in HH format.
   * @returns {string} - Formatted string like "2025-09-28 (18Z)".
   * @private
   */
  _defaultFormatRunDisplay(e, t) {
    const r = e.substring(0, 4), o = e.substring(4, 6), a = e.substring(6, 8);
    return `${r}-${o}-${a} (${t}Z)`;
  }
  /**
   * Populates the select dropdown with available runs from the manager's state.
   * @private
   */
  _populate() {
    const e = this.manager.modelStatus, t = this.manager.state.model;
    if (!e || !this.selectElement) return;
    const r = e[t];
    if (!r) {
      this.selectElement.innerHTML = "<option>Model offline</option>", this.selectElement.disabled = !0;
      return;
    }
    const o = [];
    for (const a in r)
      for (const s in r[a])
        o.push({ date: a, run: s });
    o.sort((a, s) => {
      const n = s.date.localeCompare(a.date);
      return n !== 0 ? n : s.run.localeCompare(a.run);
    }), this.selectElement.innerHTML = "", o.forEach(({ date: a, run: s }) => {
      const n = document.createElement("option");
      n.value = `${a}:${s}`, n.textContent = this.options.runFormatter(a, s), this.selectElement.appendChild(n);
    }), this.selectElement.value = `${this.manager.state.date}:${this.manager.state.run}`, this.selectElement.disabled = !1;
  }
  /**
   * Renders the panel and appends it to a target DOM element.
   * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
   * @returns {this} The instance for chaining.
   */
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    if (!t)
      throw new Error(`AguaceroAPI Error: The target element "${e}" for RunSelectorPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-run-selector", this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}</label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `, this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (r) => {
      const [o, a] = r.target.value.split(":");
      this.manager.setState({ date: o, run: a, forecastHour: 0 });
    }), this.manager.on("state:change", () => this._populate()), t.appendChild(this.element), this;
  }
}
class j {
  /**
   * Creates an instance of ForecastSliderPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.sliderElement = null, this.displayElement = null, this.pendingUpdate = !1, this.latestForecastHour = null, this.options = {
      label: t.label || "Forecast Hour"
    };
  }
  /**
   * Updates the slider's range and value based on the manager's current state.
   * @private
   */
  _update() {
    const { model: e, date: t, run: r, forecastHour: o } = this.manager.state, a = this.manager.modelStatus?.[e]?.[t]?.[r];
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
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    if (!t)
      throw new Error(`AguaceroAPI Error: The target element "${e}" for ForecastSliderPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-slider", this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}: +<span class="aguacero-slider-display">0</span>hr</label>
            <input type="range" class="aguacero-slider-input" min="0" max="0" value="0" step="1" disabled>
        `, this.sliderElement = this.element.querySelector("input"), this.displayElement = this.element.querySelector("span"), this.sliderElement.addEventListener("input", (r) => {
      const { model: o, date: a, run: s } = this.manager.state, n = this.manager.modelStatus[o][a][s];
      if (!n) return;
      const d = n[parseInt(r.target.value, 10)];
      this.displayElement.textContent = d, this.latestForecastHour = d, this.pendingUpdate || (this.pendingUpdate = !0, requestAnimationFrame(() => this._performUpdate()));
    }), this.manager.on("state:change", () => this._update()), t.appendChild(this.element), this;
  }
}
class z {
  constructor(e) {
    this.manager = e, this.element = null;
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-theme-control", this.element.innerHTML = `
            <div class="aguacero-panel-label">Map Theme</div>
            <div class="aguacero-button-group">
                <button data-theme="light" class="aguacero-button">Light</button>
                <button data-theme="dark" class="aguacero-button">Dark</button>
            </div>
        `, this.buttons = this.element.querySelectorAll("button"), this.buttons.forEach((r) => {
      r.addEventListener("click", (o) => {
        this.manager.setTheme(o.target.dataset.theme);
      });
    }), this.manager.on("style:applied", ({ themeName: r }) => {
      this.buttons.forEach((o) => {
        o.classList.toggle("active", o.dataset.theme === r);
      });
    }), t.appendChild(this.element), this;
  }
}
class k {
  constructor(e, t = {}) {
    this.manager = e, this.labels = t.labels || [], this.element = null;
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-label-control", this.element.innerHTML = '<div class="aguacero-panel-label">Labels</div>', this.labels.forEach((r) => {
      const o = document.createElement("div");
      o.className = "aguacero-toggle-row";
      const a = `label-toggle-${r.key.replace(".", "-")}`;
      o.innerHTML = `
                <label for="${a}">${r.label}</label>
                <input type="checkbox" id="${a}" data-key="${r.key}">
            `, o.querySelector("input").addEventListener("change", (n) => {
        this.manager.setLabelGroupVisibility(n.target.dataset.key, n.target.checked);
      }), this.element.appendChild(o);
    }), this.manager.on("style:applied", ({ styles: r }) => {
      this.element.querySelectorAll('input[type="checkbox"]').forEach((o) => {
        const [a, s] = o.dataset.key.split("."), n = r.labels?.[a]?.[s]?.visible;
        n !== void 0 && (o.checked = n);
      });
    }), this.buttons.forEach((r) => {
      r.addEventListener("click", (o) => {
        const a = o.target.dataset.theme;
        console.log(`[ThemeControlPanel] Button clicked. Requesting theme: "${a}"`), this.manager.setTheme(a);
      });
    }), t.appendChild(this.element), this;
  }
}
export {
  F as FillLayerManager,
  j as ForecastSliderPanel,
  k as LabelControlPanel,
  O as MapManager,
  U as RunSelectorPanel,
  z as ThemeControlPanel
};
