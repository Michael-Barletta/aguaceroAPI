class b {
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
class S {
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
    for (let n = 0; n <= r; n++)
      for (let l = 0; l <= r; l++) {
        const _ = l / r, m = n / r, d = t.lon_tl + _ * (t.lon_tr - t.lon_tl);
        let i = t.lat_tl + m * (t.lat_bl - t.lat_tl);
        i = Math.max(-s, Math.min(s, i));
        const u = mapboxgl.MercatorCoordinate.fromLngLat({ lon: d, lat: i }), c = _, h = m;
        o.push(u.x, u.y, c, h);
      }
    for (let n = 0; n < r; n++)
      for (let l = 0; l < r; l++) {
        const _ = n * (r + 1) + l, m = _ + 1, d = (n + 1) * (r + 1) + l, i = d + 1;
        a.push(_, d, m, m, d, i);
      }
    e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.bufferData(e.ARRAY_BUFFER, new Float32Array(o), e.STATIC_DRAW), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.indexBuffer), e.bufferData(e.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), e.STATIC_DRAW), this.indexCount = a.length;
  }
  updateDataTexture(t, e, r, o) {
    const a = this.gl;
    if (!a) return;
    this.encoding = e, this.textureWidth = r, this.textureHeight = o;
    const s = new Uint8Array(t.length);
    for (let n = 0; n < t.length; n++) {
      const l = t[n] > 127 ? t[n] - 256 : t[n];
      s[n] = l + 128;
    }
    a.bindTexture(a.TEXTURE_2D, this.dataTexture), a.pixelStorei(a.UNPACK_ALIGNMENT, 1), a.texImage2D(a.TEXTURE_2D, 0, a.LUMINANCE, r, o, 0, a.LUMINANCE, a.UNSIGNED_BYTE, s), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
  }
  updateColormapTexture(t) {
    const e = this.gl;
    if (!e) return;
    const r = 256, o = new Uint8Array(r * 4), a = [];
    for (let i = 0; i < t.length; i += 2)
      a.push({ value: t[i], color: t[i + 1] });
    if (a.length === 0) return;
    const s = a[0].value, l = a[a.length - 1].value - s, _ = (i) => [parseInt(i.slice(1, 3), 16), parseInt(i.slice(3, 5), 16), parseInt(i.slice(5, 7), 16)], m = (i, u, c) => [Math.round(i[0] * (1 - c) + u[0] * c), Math.round(i[1] * (1 - c) + u[1] * c), Math.round(i[2] * (1 - c) + u[2] * c)];
    let d = 0;
    for (let i = 0; i < r; i++) {
      const u = s + i / (r - 1) * l;
      for (; d < a.length - 2 && u > a[d + 1].value; )
        d++;
      const c = a[d], h = a[d + 1], p = (u - c.value) / (h.value - c.value), g = m(_(c.color), _(h.color), p);
      o[i * 4] = g[0], o[i * 4 + 1] = g[1], o[i * 4 + 2] = g[2], o[i * 4 + 3] = 255;
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
const A = {
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
function L(f, t) {
  const e = f[t];
  if (!e) return null;
  const r = Object.keys(e).sort((o, a) => a.localeCompare(o));
  for (const o of r) {
    const a = e[o];
    if (!a) continue;
    const s = Object.keys(a).sort((n, l) => l.localeCompare(n));
    if (s.length > 0) return { date: o, run: s[0] };
  }
  return null;
}
class w extends b {
  constructor(t, e = {}) {
    if (super(), !t) throw new Error("A Mapbox GL map instance is required.");
    this.map = t, this.layers = /* @__PURE__ */ new Map(), this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker(), this.statusUrl = "https://d3dc62msmxkrd7.cloudfront.net/model-status", this.modelStatus = null, this.layerId = e.id || "weather-layer", this.baseLayerOptions = e.layerOptions || {}, this.state = {
      model: e.layerOptions.model || "gfs",
      date: null,
      run: null,
      forecastHour: 0,
      visible: !0,
      opacity: 0.7
    }, this.autoRefreshInterval = null;
  }
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
  async setState(t) {
    const e = { ...this.state };
    if (Object.assign(this.state, t), (e.date !== this.state.date || e.run !== this.state.run || e.forecastHour !== this.state.forecastHour) && (this.removeLayer(this.layerId), this.state.date && this.state.run)) {
      const o = { ...this.baseLayerOptions, ...this.state };
      await this.addLayer(this.layerId, o);
    }
    this.emit("state:change", this.state);
  }
  async initialize() {
    const t = await this.fetchModelStatus(), e = L(t, this.state.model);
    await this.setState({ ...e, forecastHour: 0 });
  }
  startAutoRefresh(t = 1) {
    this.stopAutoRefresh(), this.autoRefreshInterval = setInterval(async () => {
      await this.fetchModelStatus(!0), this.emit("state:change", this.state);
    }, t * 60 * 1e3);
  }
  stopAutoRefresh() {
    this.autoRefreshInterval && (clearInterval(this.autoRefreshInterval), this.autoRefreshInterval = null);
  }
  async addLayer(t, e) {
    const { model: r, date: o, run: a, forecastHour: s, variable: n, smoothing: l, colormap: _, opacity: m = 1, visible: d = !0 } = e, i = A[r];
    if (!i) throw new Error(`Model "${r}" not found.`);
    const u = i.grid_params, c = `${this.baseUrl}/${r}/${o}/${a}/${s}/${n}/${l}`, h = new S(t);
    this.map.addLayer(h), this.layers.set(t, { id: t, shaderLayer: h, options: e, visible: d });
    try {
      const p = await fetch(c);
      if (!p.ok) throw new Error(`HTTP error! Status: ${p.status}`);
      const { data: g, encoding: y } = await p.json(), E = Uint8Array.from(atob(g), (x) => x.charCodeAt(0)), v = (x) => {
        if (this.worker.removeEventListener("message", v), x.data.success) {
          const { decompressedData: T } = x.data;
          h.updateDataTexture(T, y, u.nx, u.ny), h.updateColormapTexture(_);
          const R = [_[0], _[_.length - 2]];
          h.updateStyle({ opacity: d ? m : 0, dataRange: R }), this.map.triggerRepaint();
        } else
          console.error("Worker failed:", x.data.error);
      };
      this.worker.addEventListener("message", v), this.worker.postMessage({ compressedData: E, encoding: y }, [E.buffer]);
    } catch (p) {
      console.error(`Failed to load data for layer "${t}":`, p), this.removeLayer(t);
    }
  }
  updateLayer(t, e) {
    const r = this.layers.get(t);
    if (!r) return;
    const { shaderLayer: o } = r;
    e.colormap && (o.updateColormapTexture(e.colormap), r.options.colormap = e.colormap), e.opacity !== void 0 && (r.options.opacity = e.opacity, r.visible && o.updateStyle({ opacity: e.opacity })), this.map.triggerRepaint();
  }
  setVisible(t, e) {
    const r = this.layers.get(t);
    if (!r) return;
    r.visible = e;
    const o = e ? r.options.opacity : 0;
    r.shaderLayer.updateStyle({ opacity: o }), this.map.triggerRepaint();
  }
  removeLayer(t) {
    this.layers.has(t) && (this.map.getLayer(t) && this.map.removeLayer(t), this.layers.delete(t));
  }
  destroy() {
    this.worker && this.worker.terminate();
    for (const t of this.layers.keys())
      this.removeLayer(t);
  }
}
class D {
  constructor(t) {
    this.manager = t, this.element = null, this.selectElement = null;
  }
  _formatRunDisplay(t, e) {
    const r = t.substring(0, 4), o = t.substring(4, 6), a = t.substring(6, 8);
    return `${r}-${o}-${a} (${e}Z)`;
  }
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
      const n = s.date.localeCompare(a.date);
      return n !== 0 ? n : s.run.localeCompare(a.run);
    }), this.selectElement.innerHTML = "", o.forEach(({ date: a, run: s }) => {
      const n = document.createElement("option");
      n.value = `${a}:${s}`, n.textContent = this._formatRunDisplay(a, s), this.selectElement.appendChild(n);
    }), this.selectElement.value = `${this.manager.state.date}:${this.manager.state.run}`, this.selectElement.disabled = !1;
  }
  addTo(t) {
    const e = typeof t == "string" ? document.querySelector(t) : t;
    if (!e)
      throw new Error(`AguaceroAPI Error: The target element "${t}" for RunSelectorPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.innerHTML = `
            <label for="run-selector-api">Model Run (${this.manager.state.model.toUpperCase()})</label>
            <select id="run-selector-api" disabled><option>Loading...</option></select>
        `, this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (r) => {
      const [o, a] = r.target.value.split(":");
      this.manager.setState({ date: o, run: a, forecastHour: 0 });
    }), this.manager.on("state:change", () => this._populate()), e.appendChild(this.element), this;
  }
}
class U {
  constructor(t) {
    this.manager = t, this.element = null, this.sliderElement = null, this.displayElement = null;
  }
  _update() {
    const { model: t, date: e, run: r, forecastHour: o } = this.manager.state, a = this.manager.modelStatus?.[t]?.[e]?.[r];
    if (!a || a.length === 0) {
      this.sliderElement.disabled = !0, this.sliderElement.max = 0, this.displayElement.textContent = "N/A";
      return;
    }
    const s = a.indexOf(o);
    this.sliderElement.max = a.length - 1, this.sliderElement.value = s >= 0 ? s : 0, this.displayElement.textContent = o, this.sliderElement.disabled = !1;
  }
  addTo(t) {
    const e = typeof t == "string" ? document.querySelector(t) : t;
    if (!e)
      throw new Error(`AguaceroAPI Error: The target element "${t}" for ForecastSliderPanel could not be found in the DOM.`);
    return this.element = document.createElement("div"), this.element.innerHTML = `
            <label for="hour-slider-api">Forecast Hour: +<span>0</span>hr</label>
            <input type="range" id="hour-slider-api" min="0" max="0" value="0" step="1" disabled>
        `, this.sliderElement = this.element.querySelector("input"), this.displayElement = this.element.querySelector("span"), this.sliderElement.addEventListener("input", (r) => {
      const { model: o, date: a, run: s } = this.manager.state, l = this.manager.modelStatus[o][a][s][parseInt(r.target.value, 10)];
      this.displayElement.textContent = l, this.manager.setState({ forecastHour: l });
    }), this.manager.on("state:change", () => this._update()), e.appendChild(this.element), this;
  }
}
export {
  w as FillLayerManager,
  U as ForecastSliderPanel,
  D as RunSelectorPanel
};
