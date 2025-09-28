class x {
  constructor() {
    this.callbacks = {};
  }
  on(e, t) {
    this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t);
  }
  emit(e, t) {
    let o = this.callbacks[e];
    o && o.forEach((r) => r(t));
  }
}
class y {
  constructor(e) {
    this.id = e, this.type = "custom", this.renderingMode = "2d", this.map = null, this.gl = null, this.program = null, this.opacity = 1, this.dataRange = [0, 1], this.vertexBuffer = null, this.indexBuffer = null, this.indexCount = 0, this.dataTexture = null, this.colormapTexture = null, this.encoding = null, this.textureWidth = 0, this.textureHeight = 0;
  }
  onAdd(e, t) {
    this.map = e, this.gl = t;
    const o = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_matrix;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }`, r = `
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
    t.shaderSource(a, o), t.compileShader(a);
    const s = t.createShader(t.FRAGMENT_SHADER);
    t.shaderSource(s, r), t.compileShader(s), this.program = t.createProgram(), t.attachShader(this.program, a), t.attachShader(this.program, s), t.linkProgram(this.program), this.a_position = t.getAttribLocation(this.program, "a_position"), this.a_texCoord = t.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = t.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = t.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = t.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = t.getUniformLocation(this.program, "u_opacity"), this.u_data_range = t.getUniformLocation(this.program, "u_data_range"), this.u_scale = t.getUniformLocation(this.program, "u_scale"), this.u_offset = t.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = t.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = t.getUniformLocation(this.program, "u_texture_size"), this.vertexBuffer = t.createBuffer(), this.indexBuffer = t.createBuffer(), this.dataTexture = t.createTexture(), this.colormapTexture = t.createTexture(), this.updateGeometry();
  }
  updateGeometry(e = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const t = this.gl;
    if (!t) return;
    const o = 120, r = [], a = [], s = 89.5;
    for (let i = 0; i <= o; i++)
      for (let l = 0; l <= o; l++) {
        const _ = l / o, u = i / o, d = e.lon_tl + _ * (e.lon_tr - e.lon_tl);
        let n = e.lat_tl + u * (e.lat_bl - e.lat_tl);
        n = Math.max(-s, Math.min(s, n));
        const h = mapboxgl.MercatorCoordinate.fromLngLat({ lon: d, lat: n }), c = _, m = u;
        r.push(h.x, h.y, c, m);
      }
    for (let i = 0; i < o; i++)
      for (let l = 0; l < o; l++) {
        const _ = i * (o + 1) + l, u = _ + 1, d = (i + 1) * (o + 1) + l, n = d + 1;
        a.push(_, d, u, u, d, n);
      }
    t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, new Float32Array(r), t.STATIC_DRAW), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.bufferData(t.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), t.STATIC_DRAW), this.indexCount = a.length;
  }
  updateDataTexture(e, t, o, r) {
    const a = this.gl;
    if (!a) return;
    this.encoding = t, this.textureWidth = o, this.textureHeight = r;
    const s = new Uint8Array(e.length);
    for (let i = 0; i < e.length; i++) {
      const l = e[i] > 127 ? e[i] - 256 : e[i];
      s[i] = l + 128;
    }
    a.bindTexture(a.TEXTURE_2D, this.dataTexture), a.pixelStorei(a.UNPACK_ALIGNMENT, 1), a.texImage2D(a.TEXTURE_2D, 0, a.LUMINANCE, o, r, 0, a.LUMINANCE, a.UNSIGNED_BYTE, s), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
  }
  updateColormapTexture(e) {
    const t = this.gl;
    if (!t) return;
    const o = 256, r = new Uint8Array(o * 4), a = [];
    for (let n = 0; n < e.length; n += 2)
      a.push({ value: e[n], color: e[n + 1] });
    if (a.length === 0) return;
    const s = a[0].value, l = a[a.length - 1].value - s, _ = (n) => [parseInt(n.slice(1, 3), 16), parseInt(n.slice(3, 5), 16), parseInt(n.slice(5, 7), 16)], u = (n, h, c) => [Math.round(n[0] * (1 - c) + h[0] * c), Math.round(n[1] * (1 - c) + h[1] * c), Math.round(n[2] * (1 - c) + h[2] * c)];
    let d = 0;
    for (let n = 0; n < o; n++) {
      const h = s + n / (o - 1) * l;
      for (; d < a.length - 2 && h > a[d + 1].value; )
        d++;
      const c = a[d], m = a[d + 1], g = (h - c.value) / (m.value - c.value), f = u(_(c.color), _(m.color), g);
      r[n * 4] = f[0], r[n * 4 + 1] = f[1], r[n * 4 + 2] = f[2], r[n * 4 + 3] = 255;
    }
    t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, o, 1, 0, t.RGBA, t.UNSIGNED_BYTE, r), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE);
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
const E = {
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
function v(p, e) {
  const t = p?.[e];
  if (!t) return null;
  const o = Object.keys(t).sort((r, a) => a.localeCompare(r));
  for (const r of o) {
    const a = t[r];
    if (!a) continue;
    const s = Object.keys(a).sort((i, l) => l.localeCompare(i));
    if (s.length > 0) return { date: r, run: s[0] };
  }
  return null;
}
class T extends x {
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
    if (this.map = e, this.layers = /* @__PURE__ */ new Map(), this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker(), this.statusUrl = "https://d3dc62msmxkrd7.cloudfront.net/model-status", this.modelStatus = null, this.cache = /* @__PURE__ */ new Map(), this.loadStrategy = t.loadStrategy || "on-demand", !["on-demand", "preload"].includes(this.loadStrategy))
      throw new Error(`Invalid loadStrategy: "${this.loadStrategy}". Must be 'on-demand' or 'preload'.`);
    this.layerId = t.id || "weather-layer", this.baseLayerOptions = t.layerOptions || {}, this.state = {
      model: t.layerOptions.model || "gfs",
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
  /**
   * Starts an interval to automatically refresh the model status data.
   * @param {number} [intervalMinutes=1] - The refresh interval in minutes.
   */
  startAutoRefresh(e = 1) {
    this.stopAutoRefresh(), this.autoRefreshInterval = setInterval(async () => {
      await this.fetchModelStatus(!0), this.emit("state:change", this.state);
    }, e * 60 * 1e3);
  }
  /**
   * Stops the automatic refresh interval.
   */
  stopAutoRefresh() {
    this.autoRefreshInterval && (clearInterval(this.autoRefreshInterval), this.autoRefreshInterval = null);
  }
  /**
   * Generates a unique cache key for a given set of parameters.
   * @private
   */
  _getCacheKey(e) {
    const { model: t, date: o, run: r, forecastHour: a, variable: s } = { ...this.baseLayerOptions, ...e };
    return `${t}-${o}-${r}-${a}-${s}`;
  }
  /**
   * Loads grid data from the cache or fetches it from the network.
   * @private
   * @returns {Promise<Uint8Array|null>} The decompressed grid data.
   */
  async _loadGridData(e) {
    const t = this._getCacheKey(e);
    if (this.cache.has(t))
      return this.cache.get(t);
    const { model: o, date: r, run: a, forecastHour: s, variable: i, smoothing: l } = { ...this.baseLayerOptions, ...e }, _ = `${this.baseUrl}/${o}/${r}/${a}/${s}/${i}/${l}`;
    try {
      const u = await fetch(_);
      if (!u.ok) throw new Error(`HTTP ${u.status}`);
      const { data: d, encoding: n } = await u.json(), h = Uint8Array.from(atob(d), (c) => c.charCodeAt(0));
      return new Promise((c) => {
        const m = (g) => {
          if (this.worker.removeEventListener("message", m), g.data.success) {
            const f = {
              data: g.data.decompressedData,
              encoding: n
            };
            this.cache.set(t, f), c(f);
          } else
            console.error("Worker failed:", g.data.error), c(null);
        };
        this.worker.addEventListener("message", m), this.worker.postMessage({ compressedData: h, encoding: n }, [h.buffer]);
      });
    } catch (u) {
      return console.error(`Failed to fetch data for ${t}:`, u), null;
    }
  }
  /**
   * Renders a grid layer on the map using the provided data.
   * @private
   */
  _renderLayer(e, t, o, r) {
    this.removeLayer(e);
    const { model: a, colormap: s, opacity: i = 1, visible: l = !0 } = t, _ = E[a];
    if (!_) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const u = _.grid_params, d = new y(e);
    this.map.addLayer(d), this.layers.set(e, { id: e, shaderLayer: d, options: t, visible: l }), d.updateDataTexture(o, r, u.nx, u.ny), d.updateColormapTexture(s);
    const n = [s[0], s[s.length - 2]];
    d.updateStyle({ opacity: l ? i : 0, dataRange: n }), this.map.triggerRepaint();
  }
  /**
   * Updates the manager's state, triggers data loading and rendering.
   * @param {object} newState - The new state properties to apply.
   */
  async setState(e) {
    const t = { ...this.state };
    if (Object.assign(this.state, e), (t.date !== this.state.date || t.run !== this.state.run) && this.loadStrategy === "preload") {
      console.log(`Preloading all forecast hours for ${this.state.date}/${this.state.run}Z...`);
      const a = this.modelStatus?.[this.state.model]?.[this.state.date]?.[this.state.run] || [];
      Promise.all(a.map((s) => {
        const i = { ...this.state, forecastHour: s };
        return this._loadGridData(i);
      }));
    }
    const r = await this._loadGridData(this.state);
    if (r && r.data) {
      const a = { ...this.baseLayerOptions, ...this.state };
      this._renderLayer(this.layerId, a, r.data, r.encoding);
    } else
      this.removeLayer(this.layerId);
    this.emit("state:change", this.state);
  }
  /**
   * Initializes the manager by fetching the latest model run and rendering the first frame.
   */
  async initialize() {
    const e = await this.fetchModelStatus(), t = v(e, this.state.model);
    t ? await this.setState({ ...t, forecastHour: 0 }) : (console.error(`Could not initialize. No runs found for model "${this.state.model}".`), this.emit("state:change", this.state));
  }
  /**
   * Removes a layer from the map.
   * @param {string} id - The ID of the layer to remove.
   */
  removeLayer(e) {
    this.layers.has(e) && (this.map.getLayer(e) && this.map.removeLayer(e), this.layers.delete(e));
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
    const o = e.substring(0, 4), r = e.substring(4, 6), a = e.substring(6, 8);
    return `${o}-${r}-${a} (${t}Z)`;
  }
  /**
   * Populates the select dropdown with available runs from the manager's state.
   * @private
   */
  _populate() {
    const e = this.manager.modelStatus, t = this.manager.state.model;
    if (!e || !this.selectElement) return;
    const o = e[t];
    if (!o) {
      this.selectElement.innerHTML = "<option>Model offline</option>", this.selectElement.disabled = !0;
      return;
    }
    const r = [];
    for (const a in o)
      for (const s in o[a])
        r.push({ date: a, run: s });
    r.sort((a, s) => {
      const i = s.date.localeCompare(a.date);
      return i !== 0 ? i : s.run.localeCompare(a.run);
    }), this.selectElement.innerHTML = "", r.forEach(({ date: a, run: s }) => {
      const i = document.createElement("option");
      i.value = `${a}:${s}`, i.textContent = this.options.runFormatter(a, s), this.selectElement.appendChild(i);
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
        `, this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (o) => {
      const [r, a] = o.target.value.split(":");
      this.manager.setState({ date: r, run: a, forecastHour: 0 });
    }), this.manager.on("state:change", () => this._populate()), t.appendChild(this.element), this;
  }
}
class b {
  /**
   * Creates an instance of ForecastSliderPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.sliderElement = null, this.displayElement = null, this.options = {
      label: t.label || "Forecast Hour"
    };
  }
  /**
   * Updates the slider's range and value based on the manager's current state.
   * @private
   */
  _update() {
    const { model: e, date: t, run: o, forecastHour: r } = this.manager.state, a = this.manager.modelStatus?.[e]?.[t]?.[o];
    if (!a || a.length === 0) {
      this.sliderElement.disabled = !0, this.sliderElement.max = 0, this.displayElement.textContent = "N/A";
      return;
    }
    const s = a.indexOf(r);
    this.sliderElement.max = a.length - 1, this.sliderElement.value = s >= 0 ? s : 0, this.displayElement.textContent = r, this.sliderElement.disabled = !1;
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
        `, this.sliderElement = this.element.querySelector("input"), this.displayElement = this.element.querySelector("span"), this.sliderElement.addEventListener("input", (o) => {
      const { model: r, date: a, run: s } = this.manager.state, l = this.manager.modelStatus[r][a][s][parseInt(o.target.value, 10)];
      this.displayElement.textContent = l, this.manager.setState({ forecastHour: l });
    }), this.manager.on("state:change", () => this._update()), t.appendChild(this.element), this;
  }
}
export {
  T as FillLayerManager,
  b as ForecastSliderPanel,
  R as RunSelectorPanel
};
