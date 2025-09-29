class E {
  constructor() {
    this.callbacks = {};
  }
  on(e, t) {
    this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t);
  }
  emit(e, t) {
    let i = this.callbacks[e];
    i && i.forEach((n) => n(t));
  }
}
class I {
  constructor(e) {
    this.id = e, this.type = "custom", this.renderingMode = "2d", this.map = null, this.gl = null, this.program = null, this.opacity = 1, this.dataRange = [0, 1], this.vertexBuffer = null, this.indexBuffer = null, this.indexCount = 0, this.dataTexture = null, this.colormapTexture = null, this.encoding = null, this.textureWidth = 0, this.textureHeight = 0, this.u_conversion_type = null, this.currentConversion = {
      type: 2
      // Default to Imperial (Celsius -> Fahrenheit)
    };
  }
  onAdd(e, t) {
    this.map = e, this.gl = t;
    const i = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_matrix;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }`, n = `
            precision highp float;
            varying vec2 v_texCoord;
            uniform sampler2D u_data_texture;
            uniform sampler2D u_colormap_texture;
            uniform float u_scale;
            uniform float u_offset;
            uniform float u_missing_quantized;
            uniform float u_opacity;
            uniform vec2 u_data_range;
            uniform vec2 u_texture_size;
            uniform int u_conversion_type;

            float get_value(vec2 coord) {
                float value_0_to_255 = texture2D(u_data_texture, coord).r * 255.0;
                if (abs((value_0_to_255 - 128.0) - u_missing_quantized) < 0.5) {
                    return 9999.0;
                }
                return value_0_to_255 - 128.0;
            }

            float convert_units(float raw_value_celsius) {
                if (u_conversion_type == 1) return raw_value_celsius;
                if (u_conversion_type == 2) return raw_value_celsius * 1.8 + 32.0;
                return raw_value_celsius;
            }

            void main() {
                // Bilinear interpolation logic (unchanged)
                vec2 tex_coord_in_texels = v_texCoord * u_texture_size;
                vec2 pixel_floor = floor(tex_coord_in_texels - 0.5);
                vec2 pixel_fract = fract(tex_coord_in_texels - 0.5);
                vec2 texel_size = 1.0 / u_texture_size;
                vec2 v00_coord = (pixel_floor + vec2(0.5, 0.5)) * texel_size;
                vec2 v10_coord = (pixel_floor + vec2(1.5, 0.5)) * texel_size;
                vec2 v01_coord = (pixel_floor + vec2(0.5, 1.5)) * texel_size;
                vec2 v11_coord = (pixel_floor + vec2(1.5, 1.5)) * texel_size;
                float v00 = get_value(v00_coord);
                float v10 = get_value(v10_coord);
                float v01 = get_value(v01_coord);
                float v11 = get_value(v11_coord);
                float total_weight = 0.0;
                float total_value = 0.0;
                if (v00 < 9000.0) { float w = (1.0 - pixel_fract.x) * (1.0 - pixel_fract.y); total_value += v00 * w; total_weight += w; }
                if (v10 < 9000.0) { float w = pixel_fract.x * (1.0 - pixel_fract.y); total_value += v10 * w; total_weight += w; }
                if (v01 < 9000.0) { float w = (1.0 - pixel_fract.x) * pixel_fract.y; total_value += v01 * w; total_weight += w; }
                if (v11 < 9000.0) { float w = pixel_fract.x * pixel_fract.y; total_value += v11 * w; total_weight += w; }
                if (total_weight <= 0.0) {
                    discard;
                }
                float quantized_value = total_value / total_weight;

                float raw_value = quantized_value * u_scale + u_offset;
                float converted_value = convert_units(raw_value);

                // --- THIS IS THE FIX ---
                // Before coloring, check if the value is within the colormap's valid range.
                // u_data_range.x is the minimum (5) and u_data_range.y is the maximum (80).
                if (converted_value < u_data_range.x || converted_value > u_data_range.y) {
                    discard; // This makes the pixel transparent.
                }
                // --- END OF FIX ---

                // Calculate the position on the colormap (a value from 0.0 to 1.0).
                float colormap_coord = (converted_value - u_data_range.x) / (u_data_range.y - u_data_range.x);

                vec4 color = texture2D(u_colormap_texture, vec2(colormap_coord, 0.5));
                if (color.a < 0.1) discard;
                gl_FragColor = vec4(color.rgb, color.a * u_opacity);
            }`, r = t.createShader(t.VERTEX_SHADER);
    t.shaderSource(r, i), t.compileShader(r);
    const o = t.createShader(t.FRAGMENT_SHADER);
    t.shaderSource(o, n), t.compileShader(o), t.getShaderParameter(o, t.COMPILE_STATUS) || console.error("Fragment shader failed to compile:", t.getShaderInfoLog(o)), this.program = t.createProgram(), t.attachShader(this.program, r), t.attachShader(this.program, o), t.linkProgram(this.program), t.getProgramParameter(this.program, t.LINK_STATUS) || console.error("Shader program failed to link:", t.getProgramInfoLog(this.program)), this.a_position = t.getAttribLocation(this.program, "a_position"), this.a_texCoord = t.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = t.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = t.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = t.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = t.getUniformLocation(this.program, "u_opacity"), this.u_data_range = t.getUniformLocation(this.program, "u_data_range"), this.u_scale = t.getUniformLocation(this.program, "u_scale"), this.u_offset = t.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = t.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = t.getUniformLocation(this.program, "u_texture_size"), this.u_conversion_type = t.getUniformLocation(this.program, "u_conversion_type"), this.vertexBuffer = t.createBuffer(), this.indexBuffer = t.createBuffer(), this.dataTexture = t.createTexture(), this.colormapTexture = t.createTexture(), this.updateGeometry();
  }
  // This method remains unchanged
  updateGeometry(e = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const t = this.gl;
    if (!t) return;
    const i = 120, n = [], r = [], o = 89.5;
    for (let s = 0; s <= i; s++)
      for (let c = 0; c <= i; c++) {
        const _ = c / i, m = s / i, p = e.lon_tl + _ * (e.lon_tr - e.lon_tl);
        let l = e.lat_tl + m * (e.lat_bl - e.lat_tl);
        l = Math.max(-o, Math.min(o, l));
        const f = mapboxgl.MercatorCoordinate.fromLngLat({ lon: p, lat: l }), u = _, h = m;
        n.push(f.x, f.y, u, h);
      }
    for (let s = 0; s < i; s++)
      for (let c = 0; c < i; c++) {
        const _ = s * (i + 1) + c, m = _ + 1, p = (s + 1) * (i + 1) + c, l = p + 1;
        r.push(_, p, m, m, p, l);
      }
    t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, new Float32Array(n), t.STATIC_DRAW), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.bufferData(t.ELEMENT_ARRAY_BUFFER, new Uint16Array(r), t.STATIC_DRAW), this.indexCount = r.length;
  }
  // This method remains unchanged
  updateDataTexture(e, t, i, n) {
    const r = this.gl;
    if (!r) return;
    this.encoding = t, this.textureWidth = i, this.textureHeight = n;
    const o = new Uint8Array(e.length);
    for (let s = 0; s < e.length; s++) {
      const c = e[s] > 127 ? e[s] - 256 : e[s];
      o[s] = c + 128;
    }
    r.bindTexture(r.TEXTURE_2D, this.dataTexture), r.pixelStorei(r.UNPACK_ALIGNMENT, 1), r.texImage2D(r.TEXTURE_2D, 0, r.LUMINANCE, i, n, 0, r.LUMINANCE, r.UNSIGNED_BYTE, o), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MIN_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_MAG_FILTER, r.LINEAR), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_S, r.CLAMP_TO_EDGE), r.texParameteri(r.TEXTURE_2D, r.TEXTURE_WRAP_T, r.CLAMP_TO_EDGE);
  }
  // This method remains unchanged
  updateColormapTexture(e) {
    const t = this.gl;
    if (!t) return;
    const i = 256, n = new Uint8Array(i * 4), r = [];
    for (let l = 0; l < e.length; l += 2)
      r.push({ value: e[l], color: e[l + 1] });
    if (r.length === 0) return;
    const o = r[0].value, c = r[r.length - 1].value - o, _ = (l) => [parseInt(l.slice(1, 3), 16), parseInt(l.slice(3, 5), 16), parseInt(l.slice(5, 7), 16)], m = (l, f, u) => [Math.round(l[0] * (1 - u) + f[0] * u), Math.round(l[1] * (1 - u) + f[1] * u), Math.round(l[2] * (1 - u) + f[2] * u)];
    let p = 0;
    for (let l = 0; l < i; l++) {
      const f = o + l / (i - 1) * c;
      for (; p < r.length - 2 && f > r[p + 1].value; )
        p++;
      const u = r[p], h = r[p + 1], y = (f - u.value) / (h.value - u.value), v = m(_(u.color), _(h.color), y);
      n[l * 4] = v[0], n[l * 4 + 1] = v[1], n[l * 4 + 2] = v[2], n[l * 4 + 3] = 255;
    }
    t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, i, 1, 0, t.RGBA, t.UNSIGNED_BYTE, n), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE);
  }
  // This method remains unchanged
  updateStyle({ opacity: e, dataRange: t }) {
    e !== void 0 && (this.opacity = e), t !== void 0 && (this.dataRange = t);
  }
  /**
   * NEW METHOD: Sets the unit conversion mode for the shader.
   * @param {string} fromUnit - The native unit of the data (e.g., 'kelvin').
   * @param {'metric'|'imperial'} targetSystem - The target display system.
   */
  setUnitConversion(e, t) {
    let i = 0;
    const n = (e || "").toLowerCase();
    n.includes("c") || n.includes("f") ? t === "metric" ? i = 1 : t === "imperial" && (i = 2) : n === "kts" && (t === "imperial" ? i = 8 : t === "metric" && (i = 15)), this.currentConversion.type = i, this.map && this.map.triggerRepaint();
  }
  render(e, t) {
    !this.program || !this.encoding || !this.vertexBuffer || !this.indexBuffer || (e.useProgram(this.program), e.uniformMatrix4fv(this.u_matrix, !1, t), e.uniform1f(this.u_opacity, this.opacity), e.uniform2f(this.u_data_range, this.dataRange[0], this.dataRange[1]), e.uniform1f(this.u_scale, this.encoding.scale), e.uniform1f(this.u_offset, this.encoding.offset), e.uniform1f(this.u_missing_quantized, this.encoding.missing_quantized || 127), e.uniform2f(this.u_texture_size, this.textureWidth, this.textureHeight), e.uniform1i(this.u_conversion_type, this.currentConversion.type), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, this.dataTexture), e.uniform1i(this.u_data_texture, 0), e.activeTexture(e.TEXTURE1), e.bindTexture(e.TEXTURE_2D, this.colormapTexture), e.uniform1i(this.u_colormap_texture, 1), e.bindBuffer(e.ARRAY_BUFFER, this.vertexBuffer), e.enableVertexAttribArray(this.a_position), e.vertexAttribPointer(this.a_position, 2, e.FLOAT, !1, 16, 0), e.enableVertexAttribArray(this.a_texCoord), e.vertexAttribPointer(this.a_texCoord, 2, e.FLOAT, !1, 16, 8), e.bindBuffer(e.ELEMENT_ARRAY_BUFFER, this.indexBuffer), e.enable(e.BLEND), e.blendFunc(e.SRC_ALPHA, e.ONE_MINUS_SRC_ALPHA), e.drawElements(e.TRIANGLES, this.indexCount, e.UNSIGNED_SHORT, 0));
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
}, F = {
  kelvin_to_celsius: (a) => a - 273.15,
  kelvin_to_fahrenheit: (a) => (a - 273.15) * 9 / 5 + 32,
  kelvin_to_c: (a) => a - 273.15,
  kelvin_to_f: (a) => (a - 273.15) * 9 / 5 + 32,
  k_to_celsius: (a) => a - 273.15,
  k_to_fahrenheit: (a) => (a - 273.15) * 9 / 5 + 32,
  k_to_c: (a) => a - 273.15,
  k_to_f: (a) => (a - 273.15) * 9 / 5 + 32,
  celsius_to_fahrenheit: (a) => a * 9 / 5 + 32,
  celsius_to_f: (a) => a * 9 / 5 + 32,
  c_to_fahrenheit: (a) => a * 9 / 5 + 32,
  c_to_f: (a) => a * 9 / 5 + 32,
  fahrenheit_to_celsius: (a) => (a - 32) * 5 / 9,
  fahrenheit_to_c: (a) => (a - 32) * 5 / 9,
  f_to_celsius: (a) => (a - 32) * 5 / 9,
  f_to_c: (a) => (a - 32) * 5 / 9,
  meters_to_feet: (a) => a * 3.28084,
  meters_to_km: (a) => a / 1e3,
  m_to_feet: (a) => a * 3.28084,
  m_to_ft: (a) => a * 3.28084,
  m_to_km: (a) => a / 1e3,
  kts_to_mph: (a) => a * 1.15078,
  mph_to_kts: (a) => a / 1.15078,
  kts_to_ms: (a) => a / 1.94384449,
  mph_to_ms: (a) => a / 2.23693629,
  ms_to_mph: (a) => a * 2.23694,
  ms_to_kts: (a) => a * 1.94384,
  kts_to_kmh: (a) => a * 1.852,
  mph_to_kmh: (a) => a * 1.60934,
  ms_to_kmh: (a) => a * 3.6,
  kmh_to_kts: (a) => a / 1.852,
  kmh_to_mph: (a) => a / 1.60934,
  kmh_to_ms: (a) => a / 3.6,
  inches_to_mm: (a) => a * 25.4,
  inches_to_cm: (a) => a * 2.54,
  in_to_mm: (a) => a * 25.4,
  in_to_cm: (a) => a * 2.54,
  mm_to_in: (a) => a / 25.4,
  mm_to_inches: (a) => a / 25.4,
  cm_to_in: (a) => a / 2.54,
  cm_to_inches: (a) => a / 2.54,
  inhr_to_mmhr: (a) => a * 25.4,
  inhr_to_cmhr: (a) => a * 2.54,
  in_hr_to_mm_hr: (a) => a * 25.4,
  in_hr_to_cm_hr: (a) => a * 2.54,
  mmhr_to_inhr: (a) => a / 25.4,
  cmhr_to_inhr: (a) => a / 2.54,
  mm_hr_to_in_hr: (a) => a / 25.4,
  cm_hr_to_in_hr: (a) => a / 2.54,
  mmhr_to_cmhr: (a) => a / 10,
  cmhr_to_mmhr: (a) => a * 10,
  mm_hr_to_cm_hr: (a) => a / 10,
  cm_hr_to_mm_hr: (a) => a * 10
};
function z(a, e) {
  const t = {
    "°c": "c",
    "°f": "f",
    "°k": "k",
    celsius: "c",
    fahrenheit: "f",
    kelvin: "k",
    c: "c",
    f: "f",
    k: "k",
    "°F": "f",
    "°C": "c",
    kts: "kts",
    "m/s": "ms",
    mph: "mph",
    "km/h": "kmh",
    knots: "kts",
    ft: "ft",
    feet: "ft",
    km: "km",
    mm: "mm",
    cm: "cm",
    m: "m",
    meters: "m",
    "in/hr": "inhr",
    "mm/hr": "mmhr",
    "cm/hr": "cmhr",
    in: "in",
    inches: "in"
  }, i = (s) => {
    if (!s) return "";
    const c = s.toLowerCase().trim();
    return t[c] || c;
  }, n = i(a), r = i(e), o = `${n}_to_${r}`;
  return F[o] || null;
}
const H = {
  mrms: {
    vars: [
      "MergedReflectivityQCComposite_00.50",
      "CREF_1HR_MAX_00.50",
      "MergedZdr_04.00",
      "MergedRhoHV_04.00",
      "RotationTrackML60min_00.50",
      "RotationTrackML360min_00.50",
      "RotationTrackML30min_00.50",
      "RotationTrackML240min_00.50",
      "RotationTrackML1440min_00.50",
      "RotationTrackML120min_00.50",
      "RotationTrack60min_00.50",
      "RotationTrack360min_00.50",
      "RotationTrack30min_00.50",
      "RotationTrack240min_00.50",
      "RotationTrack1440min_00.50",
      "RotationTrack120min_00.50",
      "MESH_Max_60min_00.50",
      "MESH_Max_360min_00.50",
      "MESH_Max_30min_00.50",
      "MESH_Max_240min_00.50",
      "MESH_Max_1440min_00.50",
      "MESH_Max_120min_00.50",
      "MESH_00.50",
      "FLASH_QPE_ARIMAX_00.00",
      "FLASH_QPE_ARI30M_00.00",
      "FLASH_QPE_ARI24H_00.00",
      "FLASH_QPE_ARI12H_00.00",
      "FLASH_QPE_ARI06H_00.00",
      "FLASH_QPE_ARI03H_00.00",
      "FLASH_QPE_ARI01H_00.00",
      "LightningProbabilityNext60minGrid_scale_1",
      "LightningProbabilityNext30minGrid_scale_1",
      "VIL_Max_1440min_00.50",
      "VIL_Max_120min_00.50",
      "VIL_Density_00.50",
      "VIL_00.50",
      "LVL3_HighResVIL_00.50"
    ],
    name: "MRMS"
  },
  arome1: {
    bounds: [-12, 37.5, 16, 55.4],
    max_zoom: 7,
    vars: ["csnow_total", "gust_runmax", "rainRefl", "snowRefl", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "irsat", "refc_0", "hcc_0", "mcc_0", "lcc_0", "thetaE", "atemp", "vo_10", "2t_2", "gust_0", "moistureConvergence", "cape_25500", "2d_2", "2r_2", "wind_speed_10", "wind_direction_10"],
    category: "Mesoscale",
    name: "AROME 1km",
    skewt: !1,
    pressureLvls: [],
    order: 12
  },
  arome25: {
    bounds: [-12, 37.5, 16, 55.4],
    max_zoom: 7,
    vars: ["csnow_total", "gust_runmax", "rainRefl", "snowRefl", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "d_850", "d_925", "fgen_700", "fgen_850", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "lapse_rates_500700", "mslma_0", "t_700", "t_850", "t_925", "tadv_700", "tadv_850", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "refc_500", "hcc_0", "mcc_0", "lcc_0", "thetaE", "atemp", "vo_10", "2t_2", "moistureConvergence", "cape_25500", "2d_2", "2r_2", "wind_speed_10", "wind_direction_10"],
    category: "Mesoscale",
    name: "AROME 2.5km",
    skewt: !0,
    pressureLvls: [
      100,
      125,
      150,
      175,
      200,
      225,
      250,
      275,
      300,
      350,
      400,
      450,
      500,
      550,
      600,
      650,
      700,
      750,
      800,
      850,
      900,
      925,
      950,
      1e3
    ],
    order: 13
  },
  arw: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "mxrefc_1000", "gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "2d_2", "2r_2", "2t_2", "atemp", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cin_0", "cin_9000", "ehi_1000", "ehi_3000", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "hcc_0", "hlcy_1000", "hlcy_3000", "lapse_rates_500700", "lcc_0", "lcl", "lftx_500", "ltng_0", "mcc_0", "moistureConvergence", "mslma_0", "mxuphl_3000", "mxuphl_3000_runmax", "mxuphl_5000", "mxuphl_5000_runmax", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "refc_0", "stp", "supercellComposite", "t_700", "t_700iso0", "t_850", "t_850iso0", "t_925", "t_925iso0", "tcc_0", "thetaE", "thickness", "tp_0_total", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Mesoscale",
    name: "WRF-ARW",
    skewt: !0,
    pressureLvls: [
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      725,
      750,
      775,
      800,
      825,
      850,
      875,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 5
  },
  arw2: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "mxrefc_1000", "gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "2d_2", "2r_2", "2t_2", "atemp", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cin_0", "cin_9000", "ehi_1000", "ehi_3000", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "hcc_0", "hlcy_1000", "hlcy_3000", "lapse_rates_500700", "lcc_0", "lcl", "lftx_500", "ltng_0", "mcc_0", "moistureConvergence", "mslma_0", "mxuphl_3000", "mxuphl_3000_runmax", "mxuphl_5000", "mxuphl_5000_runmax", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "refc_0", "stp", "supercellComposite", "t_700", "t_700iso0", "t_850", "t_850iso0", "t_925", "t_925iso0", "tcc_0", "thetaE", "thickness", "tp_0_total", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Mesoscale",
    name: "WRF-ARW2",
    skewt: !0,
    pressureLvls: [
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      725,
      750,
      775,
      800,
      825,
      850,
      875,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 6
  },
  fv3: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "mxrefc_1000", "gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "2d_2", "2r_2", "2t_2", "atemp", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cin_0", "cin_9000", "ehi_1000", "ehi_3000", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "hcc_0", "hlcy_1000", "hlcy_3000", "lapse_rates_500700", "lcc_0", "lcl", "lftx_500", "ltng_0", "mcc_0", "moistureConvergence", "mslma_0", "mxuphl_3000", "mxuphl_3000_runmax", "mxuphl_5000", "mxuphl_5000_runmax", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "refc_0", "stp", "supercellComposite", "t_700", "t_700iso0", "t_850", "t_850iso0", "t_925", "t_925iso0", "tcc_0", "thetaE", "thickness", "tp_0_total", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Mesoscale",
    name: "HRW FV3",
    skewt: !0,
    pressureLvls: [
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      725,
      750,
      775,
      800,
      825,
      850,
      875,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 4
  },
  hrdps: {
    bounds: [-152.730672, 27.284598, -40.70856, 70.61148],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "prate", "rainRate", "snowRate", "icepRate", "frzrRate", "mslma_0", "gh_850", "tcc_0", "wind_speed_10", "2t_2", "gh_700", "lcl", "crain", "csnow", "cicep", "cfrzr", "t_850", "t_850iso0", "wind_speed_925", "t_925", "t_925iso0", "gh_500", "2d_2", "wind_speed_700", "cape_0", "thickness", "atemp", "wind_speed_500", "gust_0", "lapse_rates_500700", "gh_925", "2r_2", "wind_speed_850", "t_500", "thetaE", "t_700", "t_700iso0", "wind_direction_10"],
    category: "Mesoscale",
    name: "HRDPS",
    skewt: !1,
    order: 11
  },
  hrrr: {
    bounds: [-134.09547, 21.138123, -60.91719, 52.6156533],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "mxrefc_1000", "gust_runmax", "skewt", "slr", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "bulk_shear_speed_0-6000", "gh_500", "irsat", "lcl", "stp", "t_850", "t_850iso0", "cape_0", "gh_700", "gh_925", "supercellComposite", "lcc_0", "lftx_500", "ltng_0", "mslma_0", "thetaE", "hcc_0", "t_700", "t_700iso0", "w_850", "cape_0-3000", "atemp", "wind_speed_925", "t_925", "t_925iso0", "w_700", "tts", "crain", "csnow", "cicep", "cfrzr", "wind_speed_700", "refc_0", "tehi", "2t_2", "mxuphl_5000", "mxuphl_5000_runmax", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_500", "wind_speed_850", "tcc_0", "cin_0", "ehi_3000", "mcc_0", "cin_25500", "gh_850", "vo_10", "2r_2", "tadv_700", "moistureConvergence", "hlcy_3000", "lapse_rates_500700", "gust_0", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "hlcy_1000", "pwat_0", "cin_9000", "cape_9000", "ehi_1000", "wind_speed_10", "2d_2", "cape_25500", "thickness", "tadv_850", "bulk_shear_speed_0-1000"],
    category: "Mesoscale",
    name: "HRRR",
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    skewt: !0,
    order: 1
  },
  hrrrsub: {
    bounds: [-134.09547, 21.138123, -60.91719, 52.6156533],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "gust_runmax", "uphl_5000", "2t_2", "2d_2", "irsat", "wind_speed_10", "gust_0", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "refc_0", "atemp"],
    category: "Mesoscale",
    name: "HRRR Sub-Hourly",
    pressureLvls: [],
    skewt: !1,
    order: 2
  },
  icond2: {
    bounds: [-3.9399999999999977, 43.18, 20.34, 58.08],
    max_zoom: 7,
    vars: ["bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "avg_prate_3hr", "csnow_total", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_3", "tp_6", "tp_12", "tp_24", "lcc_0", "2t_2", "t_500", "hcc_0", "wind_speed_700", "mslma_0", "atemp", "t_700", "t_700iso0", "cape_9000", "lcl", "2d_2", "mcc_0", "wind_speed_10", "lapse_rates_500700", "2r_2", "crain", "csnow", "cicep", "cfrzr", "tcc_0", "wind_speed_850", "t_850", "t_850iso0", "wind_speed_500", "thetaE"],
    category: "Mesoscale",
    name: "ICON-D2",
    skewt: !1,
    order: 14
  },
  mpashn: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-HN",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 7
  },
  mpasht: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-HT",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 8
  },
  mpasrt: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-RT",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 9
  },
  mpasrn: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-RN",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 7
  },
  mpasrn3: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-RN3",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 8
  },
  mpasht2: {
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "hlcy_3000", "wind_speed_925", "t_925", "t_925iso0", "mxuphl_500", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "bulk_shear_speed_0-1000", "cin_25500", "pwat_0", "10v_10", "2t_2", "tcc_0", "gh_925", "gh_850", "wind_speed_850", "ehi_3000", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_10", "cape_9000", "t_850", "t_850iso0", "lapse_rates_500700", "bulk_shear_speed_0-6000", "cape_25500", "2d_2", "gh_700", "ltng_2", "mcc_0", "stp", "crain", "csnow", "cicep", "cfrzr", "atemp", "2r_2", "cin_9000", "thickness", "ehi_1000", "thetaE", "lcl", "hcc_0", "mxuphl_5000", "mxuphl_5000_runmax", "wind_speed_500", "cape_0", "10u_10", "wind_speed_700", "gh_500", "supercellComposite", "gust_0", "mslma_0", "lcc_0", "mxuphl_1000", "refc_0", "cin_0", "lftx_500", "d_all_lvls", "t_700", "t_700iso0", "hlcy_1000", "moistureConvergence"],
    category: "Mesoscale",
    name: "NSSL MPAS-HTPO",
    skewt: !1,
    pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1e3],
    order: 9
  },
  namnest: {
    bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
    max_zoom: 7,
    vars: ["refd_1000", "vis_0", "mxrefc_1000", "gust_runmax", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "2d_2", "2r_2", "2t_2", "atemp", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cape_25500", "cin_9000", "cin_25500", "d_850", "d_925", "ehi_1000", "ehi_3000", "fgen_700", "fgen_850", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gust_0", "hcc_0", "hlcy_1000", "hlcy_3000", "irsat", "ivt", "lapse_rates_500700", "lcc_0", "lcl", "lftx_500", "mcc_0", "mean700300mbRH", "mslma_0", "mxuphl_3000", "mxuphl_3000_runmax", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "r_700", "r_850", "r_925", "refc_0", "stp", "supercellComposite", "t_500", "t_700", "t_700iso0", "t_850", "t_850iso0", "t_925", "t_925iso0", "tadv_700", "tadv_850", "thetaE", "thickness", "vo_10", "vo_500", "vo_700", "vo_850", "w_700", "w_850", "wind_speed_10", "wind_speed_200", "wind_speed_300", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Mesoscale",
    name: "NAM 3km CONUS",
    skewt: !0,
    pressureLvls: [
      100,
      125,
      150,
      175,
      200,
      225,
      250,
      275,
      300,
      325,
      350,
      375,
      400,
      425,
      450,
      475,
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      725,
      750,
      775,
      800,
      825,
      850,
      875,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 3
  },
  rrfs: {
    bounds: [-134.09547, 21.138123, -60.91719, 52.6156533],
    max_zoom: 7,
    vars: ["vis_0", "gust_runmax", "tts", "tehi", "cape_0-3000", "slr", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "bulk_shear_speed_0-6000", "gh_500", "irsat", "lcl", "stp", "t_850", "t_850iso0", "cape_0", "gh_700", "gh_925", "supercellComposite", "lcc_0", "lftx_500", "mslma_0", "thetaE", "hcc_0", "t_700", "t_700iso0", "atemp", "wind_speed_925", "t_925", "t_925iso0", "crain", "csnow", "cicep", "cfrzr", "wind_speed_700", "refc_0", "2t_2", "mxuphl_3000", "mxuphl_3000_runmax", "wind_speed_500", "wind_speed_850", "tcc_0", "cin_0", "ehi_3000", "mcc_0", "cin_25500", "gh_850", "vo_10", "2r_2", "tadv_700", "moistureConvergence", "hlcy_3000", "lapse_rates_500700", "gust_0", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "hlcy_1000", "pwat_0", "cin_9000", "cape_9000", "ehi_1000", "wind_speed_10", "2d_2", "cape_25500", "thickness", "tadv_850", "bulk_shear_speed_0-1000"],
    category: "Mesoscale",
    name: "RRFS A",
    skewt: !0,
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    order: 10
  },
  arpege: {
    bounds: [-180, -90, 180, 90],
    max_zoom: 3,
    vars: ["mslma_0", "atemp", "2t_2", "tcc_0", "2d_2", "2r_2", "wind_speed_10", "gust_0", "gust_runmax"],
    category: "Global",
    name: "ARPEGE",
    skewt: !1,
    pressureLvls: [],
    order: 5
  },
  ecmwf: {
    max_zoom: 3,
    vars: ["gust_runmax", "gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_3", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "prate", "rainRate", "snowRate", "icepRate", "frzrRate", "r_850", "lapse_rates_500700", "vo_850", "thickness", "wind_speed_700", "d_850", "2t_2", "gh_925", "r_925", "w_500", "lcl", "tadv_850", "divergence_200", "crain", "csnow", "cicep", "cfrzr", "vo_500", "d_700", "gh_500", "gh_850", "w_925", "cape_25500", "mean700300mbRH", "t_925", "t_925iso0", "tadv_300", "fgen_700", "wind_speed_925", "vo_700", "d_925", "d_all_lvls", "gh_300", "wind_speed_500", "r_300", "wind_speed_10", "fgen_850", "2d_2", "mslma_0", "r_500", "gh_700", "wind_speed_200", "wind_speed_300", "ivt", "thetaE", "2r_2", "t_500", "t_700", "t_700iso0", "tadv_700", "wind_speed_850", "t_850", "t_850iso0", "divergence_850", "w_700", "gh_200", "w_850", "r_200", "r_700", "gust_0", "atemp"],
    category: "Global",
    name: "ECMWF",
    bounds: [-180, -90, 180, 90],
    skewt: !1,
    pressureLvls: [
      100,
      150,
      200,
      250,
      300,
      400,
      500,
      600,
      700,
      850,
      925,
      1e3
    ],
    order: 2
  },
  ecmwfaifs: {
    max_zoom: 3,
    vars: ["gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "avg_prate_6hr", "tp_0_total", "tp_6", "tp_12", "tp_24", "tp_48", "tadv_850", "wind_speed_500", "fgen_700", "wind_speed_10", "atemp", "tp_0_total", "tadv_300", "lapse_rates_500700", "t_700", "t_700iso0", "thetaE", "wind_speed_200", "wind_speed_700", "wind_speed_925", "ivt", "vo_700", "divergence_200", "2r_2", "fgen_850", "d_all_lvls", "2d_2", "tadv_700", "t_925", "t_925iso0", "vo_850", "gh_700", "2t_2", "mslma_0", "r_925", "lcl", "gh_925", "t_850", "t_850iso0", "w_850", "gh_500", "w_925", "gh_850", "t_500", "mean700300mbRH", "divergence_850", "thickness", "w_500", "r_700", "wind_speed_850", "wind_speed_300", "vo_500", "r_850", "w_700"],
    category: "Global",
    name: "ECMWF-AIFS",
    bounds: [-180, -90, 180, 90],
    skewt: !1,
    pressureLvls: [
      100,
      150,
      200,
      250,
      300,
      400,
      500,
      600,
      700,
      850,
      925,
      1e3
    ],
    order: 7
  },
  gem: {
    max_zoom: 3,
    vars: ["gust_runmax", "gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_3", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "prate", "rainRate", "snowRate", "icepRate", "frzrRate", "fgen_850", "cape_0", "r_500", "crain", "csnow", "cicep", "cfrzr", "gh_500", "wind_speed_700", "d_925", "gust_0", "gh_300", "thickness", "wind_speed_925", "d_850", "2r_2", "mslma_0", "wind_speed_300", "t_500", "w_850", "vo_500", "wind_speed_200", "r_700", "gh_925", "divergence_850", "vo_850", "2t_2", "tadv_700", "t_925", "t_925iso0", "tadv_850", "gh_700", "wind_speed_10", "r_925", "w_700", "vo_700", "atemp", "lapse_rates_500700", "gh_850", "2d_2", "gh_200", "r_850", "tcc_0", "w_500", "cin_0", "wind_speed_500", "wind_speed_850", "t_850", "t_850iso0", "thetaE", "d_700", "lcl", "divergence_200", "fgen_700", "t_700"],
    category: "Global",
    name: "GDPS",
    bounds: [-180, -90, 180, 90],
    skewt: !1,
    order: 3
  },
  gfs: {
    max_zoom: 3,
    vars: ["refd_1000", "vis_0", "gust_runmax", "gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_3", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "cin_0", "wind_speed_700", "wind_speed_200", "divergence_200", "d_925", "tadv_300", "w_850", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "2t_2", "lftx_0", "refc_0", "fgen_850", "hcc_0", "r_700", "t_850", "t_850iso0", "r_850", "tcc_0", "hlcy_3000", "thickness", "vo_850", "wind_direction_2000", "r_500", "gh_500", "wind_speed_500", "2d_2", "cape_25500", "mcc_0", "w_500", "pwat_0", "divergence_850", "t_500", "wind_speed_850", "lcl", "cape_0", "tadv_850", "tadv_700", "theta2PVU", "wind_speed_2000", "lapse_rates_500700", "vo_500", "irsat", "t_700", "t_700iso0", "cin_25500", "ehi_3000", "lcc_0", "gh_850", "wind_speed_925", "gh_200", "wind_speed_300", "fgen_700", "vo_700", "d_850", "thetaE", "pres2PVU", "d_700", "crain", "csnow", "cicep", "cfrzr", "w_700", "gust_0", "ivt", "atemp", "cape_9000", "r_925", "mslma_0", "w_925", "cin_9000", "mean700300mbRH", "wind_speed_10", "t_925", "t_925iso0", "gh_925", "gh_700", "gh_300", "2r_2"],
    category: "Global",
    name: "GFS",
    bounds: [-180, -90, 180, 90],
    skewt: !0,
    pressureLvls: [
      100,
      150,
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      550,
      600,
      650,
      700,
      750,
      800,
      850,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 1
  },
  graphcastgfs: {
    max_zoom: 3,
    vars: ["gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "avg_prate_6hr", "tp_6", "tp_12", "tp_24", "tp_48", "gh_700", "mean700300mbRH", "d_925", "gh_300", "ivt", "gh_925", "mslma_0", "lapse_rates_500700", "tadv_300", "fgen_700", "r_500", "wind_speed_700", "wind_speed_850", "fgen_850", "w_500", "t_700", "t_700iso0", "gh_200", "w_925", "tadv_850", "tadv_700", "2t_2", "r_700", "d_all_lvls", "wind_speed_300", "d_700", "divergence_850", "t_500", "vo_850", "w_850", "vo_500", "wind_speed_925", "t_925", "t_925iso0", "tp_0_total", "r_850", "r_925", "w_700", "t_850", "t_850iso0", "gh_500", "wind_speed_200", "wind_speed_500", "gh_850", "d_850", "thickness", "divergence_200", "vo_700"],
    category: "Global",
    name: "Graphcast GFS",
    bounds: [-180, -90, 180, 90],
    skewt: !1,
    pressureLvls: [
      100,
      150,
      200,
      250,
      300,
      400,
      500,
      600,
      700,
      850,
      925,
      1e3
    ],
    order: 6
  },
  gefs: {
    max_zoom: 3,
    vars: ["gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_6", "tp_12", "tp_24", "tp_48", "cin_9000", "r_850", "gh_500", "fgen_700", "fgen_850", "t_500", "wind_speed_850", "wind_speed_300", "lapse_rates_500700", "cape_9000", "t_925", "t_925iso0", "gh_850", "2r_2", "gh_200", "atemp", "irsat", "gh_300", "crain", "csnow", "cicep", "cfrzr", "wind_speed_10", "tcc_0", "wind_speed_700", "d_850", "gh_700", "gh_925", "wind_speed_500", "2t_2", "lcl", "tadv_850", "divergence_850", "pwat_0", "r_700", "tadv_700", "divergence_200", "thickness", "t_850", "t_850iso0", "r_500", "w_850", "t_700", "t_700iso0", "thetaE", "wind_speed_200", "r_925", "wind_speed_925", "2d_2", "d_925", "d_700"],
    category: "Ensemble",
    name: "GEFS",
    bounds: [-180, -90, 180, 90],
    skewt: !1,
    order: 1
  },
  nbm: {
    bounds: [-138.3732681539599, 19.229000000000003, -59.04219006004567, 57.088589282434306],
    max_zoom: 7,
    vars: ["2t_2iso0", "2d_2", "2r_2", "2t_2", "atemp", "cape_0", "gust_0", "lcl"],
    category: "Ensemble",
    name: "NBM",
    skewt: !1,
    order: 2
  },
  href: {
    interval: 1,
    bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
    max_zoom: 7,
    vars: ["vis_0", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "mslma_0", "tadv_850", "hlcy_3000", "d_700", "lcc_0", "cape_0", "wind_speed_700", "crain", "csnow", "cicep", "cfrzr", "gh_500", "gh_700", "wind_speed_850", "pwat_0", "fgen_850", "d_925", "wind_speed_925", "t_850", "t_850iso0", "fgen_700", "lcl", "2t_2", "mcc_0", "t_925", "t_925iso0", "wind_speed_500", "w_700", "cape_9000", "hcc_0", "cin_0", "tcc_0", "cin_9000", "tadv_700", "gh_850", "t_500", "d_850", "ehi_3000", "t_700"],
    category: "Ensemble",
    name: "HREF",
    skewt: !1,
    order: 3
  },
  iconeu: {
    bounds: [-23.5, 29.5, 62.5, 70.5],
    max_zoom: 7,
    vars: ["bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "avg_prate_3hr", "csnow_total", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "lapse_rates_500700", "2d_2", "t_850", "t_850iso0", "wind_speed_500", "wind_speed_925", "crain", "csnow", "cicep", "cfrzr", "wind_speed_850", "tcc_0", "t_925", "t_925iso0", "thetaE", "t_700", "t_700iso0", "2t_2", "t_500", "cape_9000", "hcc_0", "atemp", "lcc_0", "wind_speed_10", "lcl", "mslma_0", "mcc_0", "2r_2", "wind_speed_700", "wind_direction_850"],
    category: "Regional",
    name: "ICON-EU",
    skewt: !1,
    order: 4
  },
  nam: {
    bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
    max_zoom: 3,
    vars: ["refd_1000", "vis_0", "gust_runmax", "gh_tendency_500", "ehi_1000", "hlcy_1000", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "2d_2", "2r_2", "2t_2", "atemp", "cape_25500", "cin_25500", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cin_0", "cin_9000", "d_850", "d_925", "ehi_3000", "fgen_700", "fgen_850", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "hlcy_3000", "ivt", "lapse_rates_500700", "lcl", "lftx_500", "ltng_0", "mean700300mbRH", "mslma_0", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "r_700", "r_850", "r_925", "refc_0", "stp", "t_500", "t_700", "t_700iso0", "t_850", "t_850iso0", "supercellComposite", "t_925", "t_925iso0", "tadv_700", "tadv_850", "tcc_0", "thetaE", "thickness", "vo_500", "vo_700", "vo_850", "w_700", "w_850", "wind_speed_10", "wind_speed_200", "wind_speed_300", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Regional",
    name: "NAM",
    skewt: !1,
    pressureLvls: [
      100,
      125,
      150,
      175,
      200,
      225,
      250,
      275,
      300,
      325,
      350,
      375,
      400,
      425,
      450,
      475,
      500,
      525,
      550,
      575,
      600,
      625,
      650,
      675,
      700,
      725,
      750,
      775,
      800,
      825,
      850,
      875,
      900,
      925,
      950,
      975,
      1e3
    ],
    order: 2
  },
  arpegeeu: {
    bounds: [-32, 20, 42, 72],
    max_zoom: 3,
    vars: ["canosw_total", "gust_0", "gust_runmax", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "d_850", "d_925", "fgen_700", "fgen_850", "gh_500", "gh_300", "gh_200", "gh_700", "gh_850", "gh_925", "gust_0", "lapse_rates_500700", "mslma_0", "t_700", "t_850", "t_925", "tadv_700", "tadv_850", "wind_speed_200", "wind_speed_300", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "thetaE", "atemp", "vo_10", "2t_2", "moistureConvergence", "cape_25500", "2d_2", "2r_2", "wind_speed_10"],
    category: "Regional",
    name: "ARPEGE EU",
    skewt: !0,
    pressureLvls: [
      100,
      125,
      150,
      175,
      200,
      225,
      250,
      275,
      300,
      350,
      400,
      450,
      500,
      550,
      600,
      650,
      700,
      750,
      800,
      850,
      900,
      925,
      950,
      1e3
    ],
    order: 5
  },
  rap: {
    bounds: [-139.85612183699237, 16.281000000000002, -57.381070045718054, 58.365355471156114],
    max_zoom: 3,
    vars: ["refd_1000", "vis_0", "gust_runmax", "gh_tendency_500", "slr", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_12", "cicep_24", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "2d_2", "2r_2", "2t_2", "atemp", "bulk_shear_speed_0-6000", "cape_0", "cape_9000", "cape_25500", "cin_0", "cin_9000", "cin_25500", "d_850", "d_925", "ehi_1000", "ehi_3000", "fgen_700", "fgen_850", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "gust_0", "hcc_0", "hlcy_1000", "hlcy_3000", "ivt", "lapse_rates_500700", "lcc_0", "lcl", "lftx_500", "ltng_0", "mcc_0", "mean700300mbRH", "moistureConvergence", "mslma_0", "crain", "csnow", "cicep", "cfrzr", "rainRefl", "icepRefl", "snowRefl", "frzrRefl", "pwat_0", "r_700", "r_850", "r_925", "refc_0", "stp", "supercellComposite", "t_500", "t_700", "t_700iso0", "t_850", "t_850iso0", "t_925", "t_925iso0", "tadv_700", "tadv_850", "tcc_0", "tehi", "thetaE", "thickness", "tts", "vo_500", "vo_700", "vo_850", "w_700", "w_850", "wind_speed_10", "wind_speed_200", "wind_speed_300", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925"],
    category: "Regional",
    name: "RAP",
    skewt: !0,
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    order: 1
  },
  rgem: {
    bounds: [-179.99976765517718, 17.34272612431937, -50, 89.95612441273688],
    max_zoom: 3,
    vars: ["gust_runmax", "gh_tendency_500", "bulk_shear_speedmb_500", "bulk_shear_speedmb_700", "bulk_shear_speedmb_850", "bulk_shear_speedmb_925", "2t_2iso0", "crain_total", "crain_1", "crain_3", "crain_6", "crain_12", "crain_24", "crain_48", "cicep_total", "cicep_1", "cicep_3", "cicep_6", "cicep_12", "cicep_24", "cicep_48", "cfrzr_total", "cfrzr_1", "cfrzr_3", "cfrzr_6", "cfrzr_12", "cfrzr_24", "cfrzr_48", "csnow_total", "csnow_1", "csnow_3", "csnow_6", "csnow_12", "csnow_24", "csnow_48", "tp_0_total", "tp_0_1", "tp_3", "tp_6", "tp_12", "tp_24", "tp_48", "prate", "rainRate", "snowRate", "icepRate", "frzrRate", "2t_2", "gh_300", "mslma_0", "lcl", "r_925", "cape_0", "crain", "csnow", "cicep", "cfrzr", "wind_speed_500", "wind_speed_700", "vo_850", "tcc_0", "2r_2", "gh_850", "tadv_850", "gh_200", "r_700", "gh_500", "r_500", "thickness", "wind_speed_10", "thetaE", "w_700", "vo_700", "fgen_700", "wind_speed_200", "t_925", "t_925iso0", "wind_speed_300", "w_850", "d_925", "2d_2", "lapse_rates_500700", "wind_speed_925", "d_700", "fgen_850", "gh_925", "t_500", "vo_500", "r_850", "wind_speed_850", "cin_0", "atemp", "w_500", "tadv_700", "t_850", "t_850iso0", "gh_700", "t_700", "t_700iso0", "d_850", "gust_0"],
    category: "Regional",
    name: "RGEM",
    skewt: !1,
    order: 3
  },
  rtma: {
    bounds: [-134.09547, 21.138123, -60.91719, 52.6156533],
    max_zoom: 7,
    vars: ["mslma_0", "2t_2iso0", "2d_2", "2r_2", "2t_2", "atemp", "gust_0", "moistureConvergence", "thetaE", "wind_speed_10"],
    name: "RTMA"
  },
  hwrf: {
    bounds: [-180, -90, 180, 90],
    max_zoom: 7,
    vars: ["2t_2", "hlcy_3000", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "ivt", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "2r_2", "mean700300mbRH", "r_500", "r_700", "r_850", "r_925", "mslma_0", "pwat_0", "refc_0", "vo_500", "vo_700", "vo_850"],
    category: "Hurricane",
    name: "HWRF",
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    skewt: !0,
    order: 1
  },
  hfsa: {
    bounds: [-180, -90, 180, 90],
    max_zoom: 7,
    vars: ["gust_0", "2t_2", "hlcy_3000", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "ivt", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "2r_2", "mean700300mbRH", "r_500", "r_700", "r_850", "r_925", "mslma_0", "pwat_0", "refc_0", "vo_500", "vo_700", "vo_850"],
    category: "Hurricane",
    name: "HAFS-A",
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 524, 550, 575, 600, 625, 650, 657, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    skewt: !0,
    order: 3
  },
  hfsb: {
    bounds: [-180, -90, 180, 90],
    max_zoom: 7,
    vars: ["gust_0", "2t_2", "hlcy_3000", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "ivt", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "2r_2", "mean700300mbRH", "r_500", "r_700", "r_850", "r_925", "mslma_0", "pwat_0", "refc_0", "vo_500", "vo_700", "vo_850"],
    category: "Hurricane",
    name: "HAFS-B",
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 524, 550, 575, 600, 625, 650, 657, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    skewt: !0,
    order: 4
  },
  hmon: {
    bounds: [-180, -90, 180, 90],
    max_zoom: 7,
    vars: ["2t_2", "hlcy_3000", "wind_speed_10", "wind_speed_500", "wind_speed_700", "wind_speed_850", "wind_speed_925", "ivt", "gh_200", "gh_300", "gh_500", "gh_700", "gh_850", "gh_925", "2r_2", "mean700300mbRH", "r_500", "r_700", "r_850", "r_925", "mslma_0", "pwat_0", "refc_0", "vo_500", "vo_700", "vo_850"],
    category: "Hurricane",
    name: "HMON",
    pressureLvls: [100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1e3],
    skewt: !0,
    order: 2
  }
}, R = {
  fld: {
    "": {
      category: "",
      subCategory: "",
      variable: "",
      shortname: "",
      units: {
        "": {
          min: 0,
          max: 0,
          intervals: []
        }
      },
      description: ""
    },
    mslma_0: {
      category: "Surface",
      subCategory: "Mean Sea Level Pressure",
      variable: "MSLP",
      shortname: "MSLP",
      units: {
        hPa: {
          min: 800,
          max: 1100,
          intervals: [2]
        }
      },
      description: ""
    },
    "2t_2": {
      category: "Surface",
      subCategory: "Temperature",
      variable: "2m Temperature",
      shortname: "2m Temp.",
      units: {
        "°F": {
          min: -130,
          max: 150,
          intervals: [2]
        },
        "°C": {
          min: -70,
          max: 70,
          intervals: [2]
        }
      },
      defaultUnit: "°C",
      description: ""
    },
    "2t_2iso0": {
      category: "Surface",
      subCategory: "Temperature",
      variable: "2m 0°C Isotherm",
      shortname: "2m 0°C",
      units: {
        "°C": {
          min: 0,
          max: 0,
          intervals: [1]
        }
      },
      description: ""
    },
    wet_bulb_2: {
      category: "Surface",
      subCategory: "Temperature",
      variable: "2m Wet Bulb Temperature",
      shortname: "2m Wb. Temp.",
      units: {
        "°C": {
          min: -50,
          max: 50,
          intervals: [2]
        },
        "°F": {
          min: -60,
          max: 120,
          intervals: [2]
        }
      },
      description: ""
    },
    "2d_2": {
      category: "Surface",
      subCategory: "Thermodynamics",
      variable: "2m Dewpoint",
      shortname: "2m Dpt.",
      units: {
        "°F": {
          min: -80,
          max: 90,
          intervals: [2]
        },
        "°C": {
          min: -70,
          max: 50,
          intervals: [2]
        }
      },
      defaultUnit: "°C",
      description: "Dewpoint temperature is the temperature at which air becomes saturdates with water vapor."
    },
    d_925: {
      category: "Upper Air",
      subCategory: "Dewpoint",
      variable: "925mb Dewpoint",
      shortname: "925mb Dpt.",
      units: {
        "°C": {
          min: -70,
          max: 70,
          intervals: [2]
        }
      },
      description: "Dewpoint temperature is the temperature at which air becomes saturdates with water vapor."
    },
    d_850: {
      category: "Upper Air",
      subCategory: "Dewpoint",
      variable: "850mb Dewpoint",
      shortname: "850mb Dpt.",
      units: {
        "°C": {
          min: -70,
          max: 70,
          intervals: [2]
        }
      },
      description: "Dewpoint temperature is the temperature at which air becomes saturdates with water vapor."
    },
    d_700: {
      category: "Upper Air",
      subCategory: "Dewpoint",
      variable: "700mb Dewpoint",
      shortname: "700mb Dpt.",
      units: {
        "°C": {
          min: -70,
          max: 70,
          intervals: [2]
        }
      },
      description: "Dewpoint temperature is the temperature at which air becomes saturdates with water vapor."
    },
    "2r_2": {
      category: "Surface",
      subCategory: "Thermodynamics",
      variable: "2m Relative Humidity",
      shortname: "2m RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [5]
        }
      },
      description: "Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100."
    },
    cape_0: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Surface Based CAPE",
      shortname: "SBCAPE",
      units: {
        "J kg⁻¹": {
          min: 100,
          max: 1e4,
          intervals: [250]
        }
      },
      description: "Surface Based Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to the equilibrium level. It represents the potential for thunderstorms."
    },
    "cape_0-3000": {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "0-3km AGL CAPE",
      shortname: "3km CAPE",
      units: {
        "J kg⁻¹": {
          min: 5,
          max: 500,
          intervals: [50]
        }
      },
      description: "3km Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to 3km."
    },
    cape_25500: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Most Unstable CAPE",
      shortname: "MUCAPE",
      units: {
        "J kg⁻¹": {
          min: 100,
          max: 1e4,
          intervals: [250]
        }
      },
      description: "Most Unstable Convective Available Potential Energy calculated using a the a parcel from the layer with highest instability."
    },
    cape_9000: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Mixed Layer CAPE",
      shortname: "MLCAPE",
      units: {
        "J kg⁻¹": {
          min: 100,
          max: 1e4,
          intervals: [250]
        }
      },
      description: "Mixed Layer Convective Available Potential Energy calculated using a parcel lifted from the mixed layer, typically the layer of air between the surface and a point where the temperature inversion (cap) begins."
    },
    cin_0: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Surface Based CIN",
      shortname: "SBCIN",
      units: {
        "J kg⁻¹": {
          min: -1e3,
          max: -50,
          intervals: [50]
        }
      },
      description: "Surface Based Convective Inhibition is the amount of energy that prevents an air parcel lifted from the surface from rising freely, acting as a cap on convection. It represents the negative buoyancy that must be overcome for convection to initiate."
    },
    cin_25500: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Most Unstable CIN",
      shortname: "MUCIN",
      units: {
        "J kg⁻¹": {
          min: -1e3,
          max: -50,
          intervals: [50]
        }
      },
      description: "Most Unstable Convective Inhibition is the amount of energy that prevents an air parcel lifted from the most unstable layer from rising freely."
    },
    cin_9000: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Mixed Layer CIN",
      shortname: "MLCIN",
      units: {
        "J kg⁻¹": {
          min: -1e3,
          max: -50,
          intervals: [50]
        }
      },
      description: "Mixed Layer Convective Inhibition is the amount of energy that prevents the most unstabel air parcel lifted from the mixed layer from rising freely. Typically extends from the surface to a capping invesion."
    },
    hcc_0: {
      category: "Upper Air",
      subCategory: "Clouds",
      variable: "High Cloud Cover",
      shortname: "High Cloud %",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Percentage of clouds in the high cloud layer."
    },
    lcc_0: {
      category: "Upper Air",
      subCategory: "Clouds",
      variable: "Low Cloud Cover",
      shortname: "Low Cloud %",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Percentage of clouds in thelow cloud layer."
    },
    mcc_0: {
      category: "Upper Air",
      subCategory: "Clouds",
      variable: "Middle Cloud Cover",
      shortname: "Mid. Cloud %",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Percentage of clouds in the middle cloud layer."
    },
    tcc_0: {
      category: "Upper Air",
      subCategory: "Clouds",
      variable: "Total Cloud Cover",
      shortname: "Total Cloud %",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Percentage of clouds across all layers of the atmosphere."
    },
    atemp: {
      category: "Surface",
      subCategory: "Temperature",
      variable: "Apparent Temperature",
      shortname: "ATemp.",
      units: {
        "°F": {
          min: -90,
          max: 150,
          intervals: [5]
        },
        "°C": {
          min: -70,
          max: 70,
          intervals: [3]
        }
      },
      defaultUnit: "°F",
      description: "Index that represents how temperature feels to the human body considering factors like humidity and wind speed."
    },
    tp_0_total: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "Total Precipitation",
      shortname: "Total Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_0_1: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "1 Hour Precipitation",
      shortname: "1hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        cm: {
          min: 0.025,
          max: 25,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_3: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "3 Hour Precipitation",
      shortname: "3hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_6: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "6 Hour Precipitation",
      shortname: "6hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_12: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "12 Hour Precipitation",
      shortname: "12hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_24: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "24 Hour Precipitation",
      shortname: "24hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    tp_48: {
      category: "Precipitation",
      subCategory: "QPF",
      variable: "48 Hour Precipitation",
      shortname: "48hr Precip.",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    prate: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Instantaneous Precipitation Rate",
      shortname: "Precip. Rate",
      units: {
        "in/hr": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr": {
          min: 0.1,
          max: 42,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr",
      description: ""
    },
    avg_prate_6hr: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Average Precipitation Rate 6hr",
      shortname: "Avg. Precip. Rate 6hr",
      units: {
        "in/hr": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr": {
          min: 0.1,
          max: 42,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr",
      description: ""
    },
    avg_prate_3hr: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Average Precipitation Rate 3hr",
      shortname: "Avg. Precip Rate 3hr",
      units: {
        "in/hr": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr": {
          min: 0.1,
          max: 42,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr",
      description: ""
    },
    snowRate: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Instantaneous Snow Rate",
      shortname: "Snow Rate",
      units: {
        "in/hr [10:1]": {
          min: 0.05,
          max: 30,
          intervals: [1]
        },
        "cm/hr [10:1]": {
          min: 0.1,
          max: 36,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr [10:1]",
      description: "Rate of snowfall given precipitation rate and where the model depicts snow falling, assuming a 10:1 ratio."
    },
    rainRate: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Instantaneous Rain Rate",
      shortname: "Rain Rate",
      units: {
        "in/hr": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr": {
          min: 0.1,
          max: 42,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr",
      description: "Rate of rainfall given precipitation rate and where the model depicts rain falling."
    },
    icepRate: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Instantaneous Ice Pellets Rate",
      shortname: "Icep Rate",
      units: {
        "in/hr [3:1]": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr [3:1]": {
          min: 0.1,
          max: 36,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr [3:1]",
      description: "Rate of ice pellets given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio."
    },
    frzrRate: {
      category: "Precipitation",
      subCategory: "Precipitation Rate",
      variable: "Instantaneous Freezing Rain Rate",
      shortname: "FRZR Rate",
      units: {
        "in/hr [3:1]": {
          min: 5e-3,
          max: 3,
          intervals: [1]
        },
        "mm/hr [3:1]": {
          min: 0.1,
          max: 36,
          intervals: [1]
        }
      },
      defaultUnit: "in/hr [QPF]",
      description: "Rate of freezing rain given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio."
    },
    csnow_total: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "Total Snow",
      shortname: "Total Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_1: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "1 Hour Snow",
      shortname: "1hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 10,
          intervals: [0.5]
        },
        "cm [10:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_3: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "3 Hour Snow",
      shortname: "3hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_6: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "6 Hour Snow",
      shortname: "6hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_12: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "12 Hour Snow",
      shortname: "12hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_24: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "24 Hour Snow",
      shortname: "24hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    csnow_48: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "48 Hour Snow",
      shortname: "48hr Snow",
      units: {
        "in [10:1]": {
          min: 0.1,
          max: 300,
          intervals: [1]
        },
        "cm [10:1]": {
          min: 0.25,
          max: 750,
          intervals: [1]
        },
        "mm [10:1]": {
          min: 2.5,
          max: 7500,
          intervals: [10]
        }
      },
      defaultUnit: "in [10:1]",
      description: ""
    },
    cfrzr_total: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "Total Freezing Rain",
      shortname: "Total FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_1: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "1 Hour Freezing Rain",
      shortname: "1hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 2,
          intervals: [0.1]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 5,
          intervals: [0.2]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 50,
          intervals: [2]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_3: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "3 Hour Freezing Rain",
      shortname: "3hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_6: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "6 Hour Freezing Rain",
      shortname: "6hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_12: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "12 Hour Freezing Rain",
      shortname: "12hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_24: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "24 Hour Freezing Rain",
      shortname: "24hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cfrzr_48: {
      category: "Precipitation",
      subCategory: "Freezing Rain",
      variable: "48 Hour Freezing Rain",
      shortname: "48hr FRZR",
      units: {
        "in [QPF]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [QPF]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [QPF]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [QPF]",
      description: ""
    },
    cicep_total: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "Total Sleet",
      shortname: "Total Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_1: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "1 Hour Sleet",
      shortname: "1hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 2,
          intervals: [0.1]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 5,
          intervals: [0.2]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 50,
          intervals: [2]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_3: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "3 Hour Sleet",
      shortname: "3hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_6: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "6 Hour Sleet",
      shortname: "6hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_12: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "12 Hour Sleet",
      shortname: "12hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_24: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "24 Hour Sleet",
      shortname: "24hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    cicep_48: {
      category: "Precipitation",
      subCategory: "Ice Pellets",
      variable: "48 Hour Sleet",
      shortname: "48hr Sleet",
      units: {
        "in [3:1]": {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        "cm [3:1]": {
          min: 0.02,
          max: 25,
          intervals: [1]
        },
        "mm [3:1]": {
          min: 0.2,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in [3:1]",
      description: ""
    },
    crain_total: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "Total Rain",
      shortname: "Total Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_1: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "1 Hour Rain",
      shortname: "1hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 10,
          intervals: [0.5]
        },
        cm: {
          min: 0.01,
          max: 25,
          intervals: [1]
        },
        mm: {
          min: 0.1,
          max: 250,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_3: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "3 Hour Rain",
      shortname: "3hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_6: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "6 Hour Rain",
      shortname: "6hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.25,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_12: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "12 Hour Rain",
      shortname: "12hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.25,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_24: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "24 Hour Rain",
      shortname: "24hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    crain_48: {
      category: "Precipitation",
      subCategory: "Rain",
      variable: "48 Hour Rain",
      shortname: "48hr Rain",
      units: {
        in: {
          min: 0.01,
          max: 100,
          intervals: [1]
        },
        cm: {
          min: 0.025,
          max: 250,
          intervals: [1]
        },
        mm: {
          min: 0.25,
          max: 2500,
          intervals: [10]
        }
      },
      defaultUnit: "in",
      description: ""
    },
    "bulk_shear_speed_0-1000": {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "0-1km Bulk Shear",
      shortname: "1km Bulk Shear",
      units: {
        kts: {
          min: 10,
          max: 90,
          intervals: [5]
        },
        "m/s": {
          min: 5,
          max: 45,
          intervals: [2]
        }
      },
      defaultUnit: "kts",
      description: "1km Bulk Shear is the difference in wind vectors between the surface and 1km. It can help determine the potential for rotating supercells."
    },
    "bulk_shear_speed_0-6000": {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "0-6km Bulk Shear",
      shortname: "6km Bulk Shear",
      units: {
        kts: {
          min: 20,
          max: 180,
          intervals: [10]
        },
        "m/s": {
          min: 10,
          max: 90,
          intervals: [4]
        }
      },
      defaultUnit: "kts",
      description: "6km Bulk Shear is the difference in wind vectors between the surface and 6km. It can help determine the potential for rotating supercells."
    },
    bulk_shear_speedmb_500: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "Sfc-500mb Bulk Shear",
      shortname: "500mb Bulk Shear",
      units: {
        kts: {
          min: 20,
          max: 180,
          intervals: [10]
        },
        "m/s": {
          min: 10,
          max: 90,
          intervals: [4]
        }
      },
      defaultUnit: "kts",
      description: "500mb Bulk Shear is the difference in wind vectors between the surface and 500mb. It can help determine the potential for rotating supercells."
    },
    bulk_shear_speedmb_700: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "Sfc-700mb Bulk Shear",
      shortname: "700mb Bulk Shear",
      units: {
        kts: {
          min: 20,
          max: 180,
          intervals: [10]
        },
        "m/s": {
          min: 10,
          max: 90,
          intervals: [4]
        }
      },
      defaultUnit: "kts",
      description: "700mb Bulk Shear is the difference in wind vectors between the surface and 700mb. It can help determine the potential for rotating supercells."
    },
    bulk_shear_speedmb_850: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "Sfc-850mb Bulk Shear",
      shortname: "850mb Bulk Shear",
      units: {
        kts: {
          min: 10,
          max: 90,
          intervals: [5]
        },
        "m/s": {
          min: 5,
          max: 45,
          intervals: [2]
        }
      },
      defaultUnit: "kts",
      description: "850mb Bulk Shear is the difference in wind vectors between the surface and 850mb. It can help determine the potential for rotating supercells."
    },
    bulk_shear_speedmb_925: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "Sfc-925mb Bulk Shear",
      shortname: "925mb Bulk Shear",
      units: {
        kts: {
          min: 10,
          max: 90,
          intervals: [5]
        },
        "m/s": {
          min: 5,
          max: 45,
          intervals: [2]
        }
      },
      defaultUnit: "kts",
      description: "500mb Bulk Shear is the difference in wind vectors between the surface and 925mb. It can help determine the potential for rotating supercells."
    },
    divergence_200: {
      category: "Upper Air",
      subCategory: "Forcing",
      variable: "200mb Divergence",
      shortname: "200mb Divergence",
      units: {
        "s⁻¹": {
          min: -30,
          max: 30,
          intervals: [2]
        }
      },
      description: "Divergence is the outward flow of air from a region of the atmosphere. 200mb divergence is associated with rising air at the surface."
    },
    divergence_850: {
      category: "Upper Air",
      subCategory: "Forcing",
      variable: "850mb Divergence",
      shortname: "850mb Divergence",
      units: {
        "s⁻¹": {
          min: -30,
          max: 30,
          intervals: [2]
        }
      },
      description: "Divergence is the outward flow of air from a region of the atmosphere. 850mb divergence is associated with sinking air at the surface."
    },
    ehi_1000: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "1km Energy Helicity Index",
      shortname: "1km EHI",
      units: {
        None: {
          min: -20,
          max: 20,
          intervals: [2]
        }
      },
      description: "1km Energy Helicity Index (EHI) combines SBCAPE and 1km SRH to quantify the likelihood of tornadoes or low-level mesocyclones."
    },
    ehi_3000: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "3km Energy Helicity Index",
      shortname: "3km EHI",
      units: {
        None: {
          min: -20,
          max: 20,
          intervals: [2]
        }
      },
      description: "3km Energy Helicity Index (EHI) combines SBCAPE and 3km SRH to quantify the likelihood of supercell thunderstorms and helps asses potential for updraft rotation."
    },
    fgen_700: {
      category: "Upper Air",
      subCategory: "Forcing",
      variable: "700mb Frontogenesis",
      shortname: "700mb FGEN.",
      units: {
        "°C/100km/3hr": {
          min: 1,
          max: 60,
          intervals: [2]
        }
      },
      description: "Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift."
    },
    fgen_850: {
      category: "Upper Air",
      subCategory: "Forcing",
      variable: "850mb Frontogenesis",
      shortname: "850mb FGEN.",
      units: {
        "°C/100km/3hr": {
          min: 1,
          max: 60,
          intervals: [2]
        }
      },
      description: "Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift."
    },
    gh_tendency_500: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "12 Hour 500mb Geopotential Height Tendency",
      shortname: "12hr 500mb Height Tendency",
      units: {
        dam: {
          min: -60,
          max: 60,
          intervals: [5]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_200: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "200mb Geopotential Heights",
      shortname: "200mb Geo. Height",
      units: {
        dam: {
          min: 1080,
          max: 1290,
          intervals: [6]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_250: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "250mb Geopotential Heights",
      shortname: "250mb Geo. Height",
      units: {
        dam: {
          min: 1080,
          max: 1290,
          intervals: [6]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_300: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "300mb Geopotential Heights",
      shortname: "300mb Geo. Height",
      units: {
        dam: {
          min: 768,
          max: 1e3,
          intervals: [6]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_500: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "500mb Geopotential Heights",
      shortname: "500mb Geo. Height",
      units: {
        dam: {
          min: 438,
          max: 650,
          intervals: [3]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_700: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "700mb Geopotential Heights",
      shortname: "700mb Geo. Height",
      units: {
        dam: {
          min: 249,
          max: 350,
          intervals: [3]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_850: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "850mb Geopotential Heights",
      shortname: "850mb Geo. Height",
      units: {
        dam: {
          min: 120,
          max: 170,
          intervals: [3]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gh_925: {
      category: "Upper Air",
      subCategory: "Heights",
      variable: "925mb Geopotential Heights",
      shortname: "925mb Geo. Height",
      units: {
        dam: {
          min: 48,
          max: 120,
          intervals: [3]
        }
      },
      description: "Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs)."
    },
    gust_0: {
      category: "Surface",
      subCategory: "Wind",
      variable: "Wind Gusts",
      shortname: "Wind Gusts",
      units: {
        mph: {
          min: 20,
          max: 200,
          intervals: [5]
        },
        kts: {
          min: 15,
          max: 150,
          intervals: [5]
        },
        "m/s": {
          min: 10,
          max: 80,
          intervals: [2]
        },
        "km/h": {
          min: 30,
          max: 320,
          intervals: [10]
        }
      },
      defaultUnit: "mph",
      description: ""
    },
    gust_runmax: {
      category: "Surface",
      subCategory: "Wind",
      variable: "Accumulated Max Wind Gusts",
      shortname: "Accum. Max Wind Gusts",
      units: {
        mph: {
          min: 20,
          max: 200,
          intervals: [5]
        },
        kts: {
          min: 15,
          max: 150,
          intervals: [5]
        },
        "m/s": {
          min: 10,
          max: 80,
          intervals: [2]
        },
        "km/h": {
          min: 30,
          max: 320,
          intervals: [10]
        }
      },
      defaultUnit: "mph",
      description: ""
    },
    uphl_5000: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "5-2km Updraft Helicity",
      shortname: "5km UPHL",
      units: {
        "m²/s²": {
          min: -1500,
          max: 1500,
          intervals: [50]
        }
      },
      description: ""
    },
    hlcy_3000: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "3km Storm Relative Helicity",
      shortname: "3km SRH",
      units: {
        "m²/s²": {
          min: -1500,
          max: 1500,
          intervals: [50]
        }
      },
      description: "Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-3km is most relavent to diagnose overall storm organization."
    },
    hlcy_1000: {
      category: "Wind Shear",
      subCategory: "Severe",
      variable: "1km Storm Relative Helicity",
      shortname: "1km SRH",
      units: {
        "m²/s²": {
          min: -1500,
          max: 1500,
          intervals: [50]
        }
      },
      description: "Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-1km is most relavent to diagnose tornado potential."
    },
    irsat: {
      category: "Upper Air",
      subCategory: "Temperature",
      variable: "Simulated IR Brightness Temperature",
      shortname: "IRSAT",
      units: {
        "°C": {
          min: -100,
          max: 60,
          intervals: [5]
        }
      },
      description: "IR Birhgtness Temperature represents the radiative temperature of an object as inferred from infared satellite measurements. Colder brightness temperatures typically indicate high cloud tops, while warmer temepratures suggest lower clouds or clear skies."
    },
    ivt: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "Integrated Water Vapor Transport",
      shortname: "IVT",
      units: {
        "kg m⁻¹ s⁻¹": {
          min: 250,
          max: 2e3,
          intervals: [50]
        }
      },
      description: "Integrated Water Vapor Transport (IVT) is a measure of the total amount of water vapor being transported through the atmosphere by wind. It is calculated by integrating the specific humidity and wind speed over a vertical column of the atmosphere. Higher IVT values lead to stronger moisture transport indicated a higher threat for heavy precipitation."
    },
    lapse_rates_500700: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "700-500mb Lapse Rate",
      shortname: "700-500mb Lapse Rate",
      units: {
        "°C km⁻¹": {
          min: 1,
          max: 15,
          intervals: [1]
        }
      },
      description: "500-700mb Lapse rate describes the rate at which temperature decreases from 700mb to 500mb. Higher lapse rates indicate higher instability and potential for convection."
    },
    lcl: {
      category: "Thermodynamics",
      subCategory: "Severe",
      variable: "Lifted Condensation Level Height",
      shortname: "LCL Height",
      units: {
        m: {
          min: 100,
          max: 9e3,
          intervals: [100]
        },
        ft: {
          min: 500,
          max: 3e4,
          intervals: [500]
        }
      },
      defaultUnit: "m",
      description: "Lifted Condensation Level (LCL) height is the altitude at which an air parcel, when lifted adiabatically, cools to its dew point and becomes saturated, leading to cloud formation. It is calculated using temperature and dewpoint: 125x(T-Td)"
    },
    lftx_0: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "Surface Lifted Index",
      shortname: "Surface Lifted Idx.",
      units: {
        "°C": {
          min: -20,
          max: -1,
          intervals: [1]
        }
      },
      description: "Surface Lifted Index is the temperature between an air parcel lifted from the surface and the environment at 500 hPa. More negative values indicate greater instability and higher potential for thunderstorms."
    },
    lftx_500: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "500mb Lifted Index",
      shortname: "500mb Lifted Idx.",
      units: {
        "°C": {
          min: -20,
          max: -1,
          intervals: [1]
        }
      },
      description: "500mb Lifted Index is the temperature between an air parcel lifted from 500mb. Useful for diagnosing mid-level instability and elevated convection not rooted at the surface."
    },
    ltng_0: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "Lightning",
      shortname: "Lightning",
      units: {
        "flashes km⁻²/5 min": {
          min: 0.01,
          max: 25,
          intervals: [1]
        }
      },
      description: "Model dervived lightning strikes in km⁻²/5 min."
    },
    ltng_2: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "Lightning",
      shortname: "Lightning",
      units: {
        "flashes km⁻²/5 min": {
          min: 0.01,
          max: 25,
          intervals: [1]
        }
      },
      description: "Model dervived lightning strikes in km⁻²/5 min."
    },
    mean700300mbRH: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "Mean 700-300mb Relative Humidity",
      shortname: "Mean 700-300mb RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Relative humidity averaged between 700-300mb. Ueful indicator for diagnosing the ability for cloud formation, deep convection, or precipitation."
    },
    moistureConvergence: {
      category: "Surface",
      subCategory: "Forcing",
      variable: "Moisture Convergence",
      shortname: "Moisture Convergence",
      units: {
        "s⁻¹": {
          min: 5,
          max: 50,
          intervals: [5]
        }
      },
      description: "Surface Moisture Convergence refers to the accumulation of water vapor near the surface due to converging airflows. Higher values are associated with rising air and heavy precipitation. It is calculated as the product of moisture content and horizontal wind convergence."
    },
    mxuphl_3000: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "0-3km Maximum Updraft Helicity",
      shortname: "3km Max Updraft Helicity",
      units: {
        "m²/s²": {
          min: 2,
          max: 300,
          intervals: [5]
        }
      },
      description: "3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones."
    },
    mxuphl_5000: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "2-5km Maximum Updraft Helicity",
      shortname: "2-5km Max Updraft Helicity",
      units: {
        "m²/s²": {
          min: 2,
          max: 560,
          intervals: [5]
        }
      },
      description: "2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization."
    },
    mxuphl_3000_runmax: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "0-3km Maximum Updraft Helicity (Run Max)",
      shortname: "3km Max Updraft Helicity (Max)",
      units: {
        "m²/s²": {
          min: 3,
          max: 300,
          intervals: [5]
        }
      },
      description: "3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones."
    },
    mxuphl_5000_runmax: {
      category: "Mesoscale",
      subCategory: "Severe",
      variable: "2-5km Maximum Updraft Helicity (Run Max)",
      shortname: "2-5km Max Updraft Helicity (Run)",
      units: {
        "m²/s²": {
          min: 3,
          max: 560,
          intervals: [5]
        }
      },
      description: "2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization."
    },
    pres2PVU: {
      category: "Upper Air",
      subCategory: "Pressure",
      variable: "Dynamic Tropopause Pressure",
      shortname: "2PVU Pres.",
      units: {
        hPa: {
          min: 20,
          max: 850,
          intervals: [15]
        }
      },
      description: "Dynamic Tropopause Pressure is calculated by analyzing the pressure at the 2PVU level. It asses at what pressure level the tropopause lies."
    },
    csnow: {
      category: "Precipitation",
      subCategory: "Categorical",
      variable: "Categorical Snow",
      shortname: "Categorical Snow",
      units: {
        None: {
          min: 0,
          max: 1,
          intervals: [1]
        }
      },
      description: "Categorical Snow is a binary model field that show whether or not it is snowing at a particular point."
    },
    cfrzr: {
      category: "Precipitation",
      subCategory: "Categorical",
      variable: "Categorical Freezing Rain",
      shortname: "Categorical FRZR.",
      units: {
        None: {
          min: 0,
          max: 1,
          intervals: [1]
        }
      },
      description: "Categorical Freezing Rain is a binary model field that show whether or not there is freezing rain at a particular point."
    },
    crain: {
      category: "Precipitation",
      subCategory: "Categorical",
      variable: "Categorical Rain",
      shortname: "Categorical Rain",
      units: {
        None: {
          min: 0,
          max: 1,
          intervals: [1]
        }
      },
      description: "Categorical Rain is a binary model field that show whether or not there is rain at a particular point."
    },
    cicep: {
      category: "Precipitation",
      subCategory: "Categorical",
      variable: "Categorical Ice Pellets",
      shortname: "Categorical ICEP.",
      units: {
        None: {
          min: 0,
          max: 1,
          intervals: [1]
        }
      },
      description: "Categorical Ice Pellets is a binary model field that show whether or not there is ice pellets at a particular point."
    },
    rainRefl: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Rain Composite Reflectivity",
      shortname: "Rain Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Composite Rain shows reflectivity where the model shows categorical rain."
    },
    snowRefl: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Snow Composite Reflectivity",
      shortname: "Snow Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Composite Snow shows reflectivity where the model shows categorical snow."
    },
    icepRefl: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Ice Pellets Composite Reflectivity",
      shortname: "ICEP. Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Composite Ice Pellets shows reflectivity where the model shows categorical ice pellets."
    },
    frzrRefl: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Freezing Rain Composite Reflectivity",
      shortname: "FRZR. Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Composite Freezing Rain shows reflectivity where the model shows categorical freezing rain."
    },
    pwat_0: {
      category: "Precipitation",
      subCategory: "Moisture",
      variable: "Precipitable Water",
      shortname: "PWAT",
      units: {
        in: {
          min: 0,
          max: 4,
          intervals: [0.25]
        },
        mm: {
          min: 0,
          max: 90,
          intervals: [5]
        }
      },
      defaultUnit: "in",
      description: "Precipitable Water (PWAT) is the total amount of water vapor in a verticalcolumn of the atmosphere, expressed as the depth of water that would result if all the moisture in the column were to condense. High PWAT values indicate more moisture in the atmosphere, suggesting higher potential for heavy precipitation."
    },
    r_500: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "500mb Relative Humidity",
      shortname: "500mb RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100."
    },
    r_700: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "700mb Relative Humidity",
      shortname: "700mb RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100."
    },
    r_850: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "850mb Relative Humidity",
      shortname: "850mb RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100."
    },
    r_925: {
      category: "Upper Air",
      subCategory: "Moisture",
      variable: "925mb Relative Humidity",
      shortname: "925mb RH",
      units: {
        "%": {
          min: 0,
          max: 100,
          intervals: [10]
        }
      },
      description: "Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100."
    },
    vis_0: {
      category: "Surface",
      subCategory: "Visibility",
      variable: "Visibility",
      shortname: "Vis.",
      units: {
        mi: {
          min: 0,
          max: 10,
          intervals: [0.1]
        },
        km: {
          min: 0,
          max: 10,
          intervals: [0.1]
        }
      },
      description: "Visibility"
    },
    mxrefc_1000: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Max Reflectivity (1 hr.)",
      shortname: "Max Composite Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Simulated Radar."
    },
    refd_1000: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "1km Base Reflectivity",
      shortname: "1km Base Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Simulated Radar."
    },
    refc_0: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Composite Reflectivity",
      shortname: "Composite Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Simulated Radar."
    },
    refc_500: {
      category: "Precipitation",
      subCategory: "Radar",
      variable: "Composite Reflectivity 500m",
      shortname: "Composite Refl.",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: "Simulated Radar."
    },
    stp: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "Significant Tornado Parameter",
      shortname: "STP",
      units: {
        None: {
          min: 1,
          max: 20,
          intervals: [1]
        }
      },
      description: "Significant Tornado Parameter (STP) is a composite index used to assess the likelihood of sifniciant tornadoes. It is calculated using SBCAPE, LCL height, 1km SRH and 6km Bulk Shear."
    },
    supercellComposite: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "Supercell Composite",
      shortname: "Supercell Composite",
      units: {
        None: {
          min: 1,
          max: 50,
          intervals: [1]
        }
      },
      description: "Supercell Composite is a composite index used to evaluated the potential for supercell thunderstorms. It is calculated using MUCAPE Effective SRH and Effective Shear."
    },
    t_500: {
      category: "Upper Air",
      subCategory: "Temperature",
      variable: "500mb Temperature",
      shortname: "500mb Temp.",
      units: {
        "°C": {
          min: -60,
          max: 50,
          intervals: [2, 4]
        }
      },
      description: ""
    },
    t_700: {
      category: "Upper Air",
      subCategory: "Temperature",
      variable: "700mb Temperature",
      shortname: "700mb Temp.",
      units: {
        "°C": {
          min: -60,
          max: 50,
          intervals: [2, 4]
        }
      },
      description: ""
    },
    t_850: {
      category: "Upper Air",
      subCategory: "Temperature",
      variable: "850mb Temperature",
      shortname: "850mb Temp.",
      units: {
        "°C": {
          min: -60,
          max: 50,
          intervals: [2, 4]
        }
      },
      description: ""
    },
    t_925: {
      category: "Upper Air",
      subCategory: "Temperature",
      variable: "925mb Temperature",
      shortname: "925mb Temp.",
      units: {
        "°C": {
          min: -60,
          max: 50,
          intervals: [2, 4]
        }
      },
      description: ""
    },
    t_925iso0: {
      category: "Upper Air",
      subCategory: "Isotherm",
      variable: "925mb 0°C Isotherm",
      shortname: "925mb 0°C",
      units: {
        "°C": {
          min: 0,
          max: 0,
          intervals: [1]
        }
      },
      description: ""
    },
    t_850iso0: {
      category: "Upper Air",
      subCategory: "Isotherm",
      variable: "850mb 0°C Isotherm",
      shortname: "850mb 0°C",
      units: {
        "°C": {
          min: 0,
          max: 0,
          intervals: [1]
        }
      },
      description: ""
    },
    t_700iso0: {
      category: "Upper Air",
      subCategory: "Isotherm",
      variable: "700mb 0°C Isotherm",
      shortname: "700mb 0°C",
      units: {
        "°C": {
          min: 0,
          max: 0,
          intervals: [1]
        }
      },
      description: ""
    },
    t_500iso0: {
      category: "Upper Air",
      subCategory: "Isotherm",
      variable: "500mb 0°C Isotherm",
      shortname: "500mb 0°C",
      units: {
        "°C": {
          min: 0,
          max: 0,
          intervals: [1]
        }
      },
      description: ""
    },
    tadv_300: {
      category: "Upper Air",
      subCategory: "Thermodynamics",
      variable: "300mb Temperature Advection",
      shortname: "300mb Temp. Adv.",
      units: {
        "°C h⁻¹": {
          min: -20,
          max: 20,
          intervals: [2]
        }
      },
      description: "300mb Temperature Advection is useful for determining the sign of the secnd term of the QG height tendency equation. Strong Cold (Warm) air advection at 300mb is associated with 500mb geopotential height increases (decreases)."
    },
    tadv_700: {
      category: "Upper Air",
      subCategory: "Thermodynamics",
      variable: "700mb Temperature Advection",
      shortname: "700mb Temp. Adv.",
      units: {
        "°C h⁻¹": {
          min: -20,
          max: 20,
          intervals: [1]
        }
      },
      description: "Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion."
    },
    tadv_850: {
      category: "Upper Air",
      subCategory: "Thermodynamics",
      variable: "850mb Temperature Advection",
      shortname: "850mb Temp. Adv.",
      units: {
        "°C h⁻¹": {
          min: -20,
          max: 20,
          intervals: [1]
        }
      },
      description: "Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion."
    },
    tehi: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "Tornadic Energy Helicity Index",
      shortname: "TEHI",
      units: {
        None: {
          min: 1,
          max: 20,
          intervals: [1]
        }
      },
      description: "Tornadic Energy helicity Index (TEHI) is a parameter used to asses the potential for tornadoes. This parameter consolidates EHI to more percisely define areas that support tornadic supercells. It is calculated using 1km SRH, MLCAPE, 3km CAPE, 6km Bulk Shear, LCL height and MLCIN.."
    },
    tts: {
      category: "Composite Indices",
      subCategory: "Severe",
      variable: "Tornadic Tilting and Stretching",
      shortname: "TTS",
      units: {
        None: {
          min: 1,
          max: 20,
          intervals: [1]
        }
      },
      description: "Tornadic Tiling and Strecthing (TTS) is a paramter used to asses the potential for tornadoes, specifically in low CAPE, high shear environments during the cool season. The parameter picks out areas of tilting and strecthing or horizontal, streamwise vorticity in updrafts. It is calculated using 1km SRH, MLCAPE, 3km CAOE, 6km Bulk Shear, LCL height and MLCIN."
    },
    thetaE: {
      category: "Surface",
      subCategory: "Thermodynamics",
      variable: "2m Theta-E",
      shortname: "2m Theta-E",
      units: {
        "°K": {
          min: 230,
          max: 370,
          intervals: [5]
        }
      },
      description: "2m Theta-E (Equivalent Potential Temperature) represents the potential temperature of a parcel of air has been lifted from the surface and all its water vapor has been condensed. It is useful for determining air parcel stability, with higher values indicating more moisture and greater instability."
    },
    theta2PVU: {
      category: "Upper Air",
      subCategory: "Isentropic",
      variable: "Dynamic Tropopause Theta-E",
      shortname: "2PVU Theta-E",
      units: {
        "°K": {
          min: 230,
          max: 495,
          intervals: [5]
        }
      },
      description: "Dynamic Tropopause Theta-E is the potential temperature along the 2PVU surface. It can help identify strong thermal gradients which can be associated with jet streams. Lower values indicate the tropopause is closer to the surface."
    },
    thickness: {
      category: "Upper Air",
      subCategory: "Thickness",
      variable: "1000-500mb Thickness",
      shortname: "Thickness",
      units: {
        dam: {
          min: 438,
          max: 630,
          intervals: [6]
        }
      },
      description: "1000-500mb Thickness subtracts the geopotential height from 1000mb and 500mb to get a vertical distance between the two layers. Higher (lower) thickness values are associated with warmer (colder) air."
    },
    vo_10: {
      category: "Surface",
      subCategory: "Forcing",
      variable: "Surface Relative Vorticity",
      shortname: "Surface Rel. Vort.",
      units: {
        "s⁻¹": {
          min: -80,
          max: 150,
          intervals: [4]
        }
      },
      description: "Relative Vorticity at the surface refers to the rotation of the wind field at 10m. It is used to analyze low-level atmospheric rotation. It is generally used to help indentify fronts or triple points."
    },
    vo_500: {
      category: "Upper Air",
      subCategory: "Vorticity",
      variable: "500mb Relative Vorticity",
      shortname: "500mb Rel. Vort.",
      units: {
        "s⁻¹": {
          min: -80,
          max: 150,
          intervals: [4]
        }
      },
      description: "Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation."
    },
    vo_700: {
      category: "Upper Air",
      subCategory: "Vorticity",
      variable: "700mb Relative Vorticity",
      shortname: "700mb Rel. Vort.",
      units: {
        "s⁻¹": {
          min: -80,
          max: 150,
          intervals: [4]
        }
      },
      description: "Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation."
    },
    vo_850: {
      category: "Upper Air",
      subCategory: "Vorticity",
      variable: "850mb Relative Vorticity",
      shortname: "850mb Rel. Vort.",
      units: {
        "s⁻¹": {
          min: -80,
          max: 150,
          intervals: [4]
        }
      },
      description: "Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation."
    },
    w_500: {
      category: "Upper Air",
      subCategory: "Vertical Velocity",
      variable: "500mb Vertical Velocity",
      shortname: "500mb VVEL",
      units: {
        "Pa/s": {
          min: -200,
          max: 200,
          intervals: [5]
        }
      },
      description: "Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion."
    },
    w_700: {
      category: "Upper Air",
      subCategory: "Vertical Velocity",
      variable: "700mb Vertical Velocity",
      shortname: "700mb VVEL",
      units: {
        "Pa/s": {
          min: -200,
          max: 200,
          intervals: [5]
        }
      },
      description: "Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion."
    },
    w_850: {
      category: "Upper Air",
      subCategory: "Vertical Velocity",
      variable: "850mb Vertical Velocity",
      shortname: "850mb VVEL",
      units: {
        "Pa/s": {
          min: -200,
          max: 200,
          intervals: [5]
        }
      },
      description: "Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion."
    },
    w_925: {
      category: "Upper Air",
      subCategory: "Vertical Velocity",
      variable: "925mb Vertical Velocity",
      shortname: "925mb VVEL",
      units: {
        "Pa/s": {
          min: -200,
          max: 200,
          intervals: [5]
        }
      },
      description: "Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion."
    },
    wind_speed_10: {
      category: "Surface",
      subCategory: "Wind",
      variable: "10m Wind Speed",
      shortname: "10m Wind",
      units: {
        mph: {
          min: 0,
          max: 200,
          intervals: [5]
        },
        kts: {
          min: 0,
          max: 150,
          intervals: [5]
        },
        "m/s": {
          min: 0,
          max: 80,
          intervals: [2]
        },
        "km/h": {
          min: 0,
          max: 300,
          intervals: [10]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_2000: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "Dynamic Tropopause Wind Speed",
      shortname: "2PVU Wind",
      units: {
        kts: {
          min: 0,
          max: 250,
          intervals: [10]
        },
        mph: {
          min: 0,
          max: 290,
          intervals: [10]
        },
        "m/s": {
          min: 0,
          max: 130,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 460,
          intervals: [20]
        }
      },
      defaultUnit: "m/s",
      description: "Dynamic Tropopause Wind Speed is the wind speed along the 2PVU surface. It is used to analyze jet stream and large-scale circulation patterns."
    },
    wind_speed_200: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "200mb Wind Speed",
      shortname: "200mb Wind",
      units: {
        kts: {
          min: 0,
          max: 250,
          intervals: [10]
        },
        mph: {
          min: 0,
          max: 290,
          intervals: [10]
        },
        "m/s": {
          min: 0,
          max: 130,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 460,
          intervals: [20]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_250: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "250mb Wind Speed",
      shortname: "250mb Wind",
      units: {
        kts: {
          min: 0,
          max: 250,
          intervals: [10]
        },
        mph: {
          min: 0,
          max: 290,
          intervals: [10]
        },
        "m/s": {
          min: 0,
          max: 130,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 460,
          intervals: [20]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_300: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "300mb Wind Speed",
      shortname: "300mb Wind",
      units: {
        kts: {
          min: 0,
          max: 250,
          intervals: [10]
        },
        mph: {
          min: 0,
          max: 290,
          intervals: [10]
        },
        "m/s": {
          min: 0,
          max: 130,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 460,
          intervals: [20]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_500: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "500mb Wind Speed",
      shortname: "500mb Wind",
      units: {
        kts: {
          min: 0,
          max: 155,
          intervals: [5]
        },
        mph: {
          min: 0,
          max: 180,
          intervals: [5]
        },
        "m/s": {
          min: 0,
          max: 80,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 290,
          intervals: [10]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_700: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "700mb Wind Speed",
      shortname: "700mb Wind",
      units: {
        kts: {
          min: 0,
          max: 155,
          intervals: [5]
        },
        mph: {
          min: 0,
          max: 180,
          intervals: [5]
        },
        "m/s": {
          min: 0,
          max: 80,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 290,
          intervals: [10]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_850: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "850mb Wind Speed",
      shortname: "850mb Wind",
      units: {
        kts: {
          min: 0,
          max: 155,
          intervals: [5]
        },
        mph: {
          min: 0,
          max: 180,
          intervals: [5]
        },
        "m/s": {
          min: 0,
          max: 80,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 290,
          intervals: [10]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    wind_speed_925: {
      category: "Upper Air",
      subCategory: "Wind",
      variable: "925mb Wind Speed",
      shortname: "925mb Wind",
      units: {
        kts: {
          min: 0,
          max: 155,
          intervals: [5]
        },
        mph: {
          min: 0,
          max: 180,
          intervals: [5]
        },
        "m/s": {
          min: 0,
          max: 80,
          intervals: [5]
        },
        "km/h": {
          min: 0,
          max: 290,
          intervals: [10]
        }
      },
      defaultUnit: "m/s",
      description: ""
    },
    height_pbl: {
      category: "Surface",
      subCategory: "Thermodynamics",
      variable: "Planetary Boundary Layer Height",
      shortname: "PBL Height",
      units: {
        m: {
          min: 100,
          max: 9e3,
          intervals: [100]
        },
        ft: {
          min: 500,
          max: 3e4,
          intervals: [500]
        }
      },
      defaultUnit: "m",
      description: "Planetary Boundary Layer Height (PBL) is the height in which the planetary boundary is located, owing to surface inversions or frontal passages"
    },
    slr: {
      category: "Precipitation",
      subCategory: "Snow",
      variable: "Snow Liquid Ratio",
      shortname: "SLR",
      units: {
        "in. Snow/in. Liquid": {
          min: 1,
          max: 50,
          intervals: [1]
        }
      },
      description: 'Snow Liquid Ratio refers to how many inches of snow there would be if 1" of liquid fell. this paramater is used by calculating the ratio between the model ASNOW paramater and QPF 10:1 snowfall.'
    },
    "MergedReflectivityQCComposite_00.50": {
      category: "Composite Reflectivity",
      variable: "Merged Reflectivity",
      shortname: "REFC",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: ""
    },
    "CREF_1HR_MAX_00.50": {
      category: "Composite Reflectivity",
      variable: "1-Hour Max Composite Reflectivity",
      shortname: "1hr Max REFC",
      units: {
        dBZ: {
          min: 5,
          max: 80,
          intervals: [5]
        }
      },
      description: ""
    },
    "MergedZdr_04.00": {
      category: "Dual-Polarization",
      variable: "Differential Reflectivity",
      shortname: "ZDR",
      units: {
        dB: {
          min: -4,
          max: 20,
          intervals: [0.5]
        }
      },
      description: ""
    },
    "MergedRhoHV_04.00": {
      category: "Dual-Polarization",
      variable: "Correlation Coefficient",
      shortname: "CC",
      units: {
        None: {
          min: 0.2,
          max: 3,
          intervals: [0.1]
        }
      },
      description: ""
    },
    "RotationTrackML30min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (30 min)",
      shortname: "30Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrackML60min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (60 min)",
      shortname: "60Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrackML120min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (120 min)",
      shortname: "120Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrackML240min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (240 min)",
      shortname: "240Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrackML360min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (360 min)",
      shortname: "360Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrackML1440min_00.50": {
      category: "Rotation",
      variable: "ML Rotation Track (1440 min)",
      shortname: "1440Min ML Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack30min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (30 min)",
      shortname: "30Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack60min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (60 min)",
      shortname: "60Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack120min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (120 min)",
      shortname: "120Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack240min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (240 min)",
      shortname: "240Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack360min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (360 min)",
      shortname: "360Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "RotationTrack1440min_00.50": {
      category: "Rotation",
      variable: "Rotation Track (1440 min)",
      shortname: "1440Min Rotation",
      units: {
        "s⁻¹": {
          min: 3e-3,
          max: 0.02,
          intervals: [1e-3]
        }
      },
      description: ""
    },
    "MESH_Max_30min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (30 min)",
      shortname: "Max Hail Size (30 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_Max_60min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (60 min)",
      shortname: "Max Hail Size (60 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_Max_120min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (120 min)",
      shortname: "Max Hail Size (120 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_Max_240min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (240 min)",
      shortname: "Max Hail Size (240 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_Max_360min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (360 min)",
      shortname: "Max Hail Size (360 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_Max_1440min_00.50": {
      category: "Hail",
      variable: "Max Hail Size (1440 min)",
      shortname: "Max Hail Size (1440 min)",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "MESH_00.50": {
      category: "Hail",
      variable: "Max Hail Size",
      shortname: "Max Hail Size",
      units: {
        mm: {
          min: 1,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARIMAX_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (Max)",
      shortname: "FF ARI (Max)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI30M_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (30 Min)",
      shortname: "FF ARI (30 Min)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI01H_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (1hr)",
      shortname: "FF ARI (1hr)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI03H_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (3hr)",
      shortname: "FF ARI (3hr)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI06H_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (6hr)",
      shortname: "FF ARI (6hr)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI12H_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (12hr)",
      shortname: "FF ARI (12hr)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    "FLASH_QPE_ARI24H_00.00": {
      category: "Flash Flood",
      variable: "Flash Flood ARI (24hr)",
      shortname: "FF ARI (24hr)",
      units: {
        year: {
          min: 1,
          max: 500,
          intervals: [5]
        }
      },
      description: ""
    },
    LightningProbabilityNext30minGrid_scale_1: {
      category: "Lightning",
      variable: "Lightning Probability (30 Min)",
      shortname: "Lightning Prob (30 Min)",
      units: {
        "%": {
          min: 5,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    LightningProbabilityNext60minGrid_scale_1: {
      category: "Lightning",
      variable: "Lightning Probability (60 Min)",
      shortname: "Lightning Prob (60 Min)",
      units: {
        "%": {
          min: 5,
          max: 100,
          intervals: [5]
        }
      },
      description: ""
    },
    "VIL_Max_1440min_00.50": {
      category: "Vertically Integrated Liquid",
      variable: "Max Vertically Integrated Liquid (1440 Min)",
      shortname: "Max VIL (1440 Min)",
      units: {
        "kg/m²": {
          min: 0.1,
          max: 100,
          intervals: [2]
        }
      },
      description: ""
    },
    "VIL_Max_120min_00.50": {
      category: "Vertically Integrated Liquid",
      variable: "Max Vertically Integrated Liquid (120 Min)",
      shortname: "Max VIL (120 Min)",
      units: {
        "kg/m²": {
          min: 0.1,
          max: 100,
          intervals: [2]
        }
      },
      description: ""
    },
    "VIL_00.50": {
      category: "Vertically Integrated Liquid",
      variable: "Vertically Integrated Liquid",
      shortname: "VIL",
      units: {
        "kg/m²": {
          min: 0.1,
          max: 100,
          intervals: [2]
        }
      },
      description: ""
    }
  },
  variable_cmap: {
    //mrms
    "MergedReflectivityQCComposite_00.50": "refc_0",
    "CREF_1HR_MAX_00.50": "refc_0",
    "RotationTrackML60min_00.50": "rotation",
    "RotationTrackML360min_00.50": "rotation",
    "RotationTrackML30min_00.50": "rotation",
    "RotationTrackML240min_00.50": "rotation",
    "RotationTrackML1440min_00.50": "rotation",
    "RotationTrackML120min_00.50": "rotation",
    "RotationTrack60min_00.50": "rotation",
    "RotationTrack360min_00.50": "rotation",
    "RotationTrack30min_00.50": "rotation",
    "RotationTrack240min_00.50": "rotation",
    "RotationTrack1440min_00.50": "rotation",
    "RotationTrack120min_00.50": "rotation",
    "MESH_Max_60min_00.50": "hail",
    "MESH_Max_360min_00.50": "hail",
    "MESH_Max_30min_00.50": "hail",
    "MESH_Max_240min_00.50": "hail",
    "MESH_Max_1440min_00.50": "hail",
    "MESH_Max_120min_00.50": "hail",
    "MESH_00.50": "hail",
    "FLASH_QPE_ARIMAX_00.00": "ff_ari",
    "FLASH_QPE_ARI30M_00.00": "ff_ari",
    "FLASH_QPE_ARI24H_00.00": "ff_ari",
    "FLASH_QPE_ARI12H_00.00": "ff_ari",
    "FLASH_QPE_ARI06H_00.00": "ff_ari",
    "FLASH_QPE_ARI03H_00.00": "ff_ari",
    "FLASH_QPE_ARI01H_00.00": "ff_ari",
    LightningProbabilityNext60minGrid_scale_1: "lightning_prob",
    LightningProbabilityNext30minGrid_scale_1: "lightning_prob",
    "VIL_Max_1440min_00.50": "vil",
    "VIL_Max_120min_00.50": "vil",
    "VIL_Density_00.50": "vil",
    "VIL_00.50": "vil",
    "LVL3_HighResVIL_00.50": "vil",
    // "PrecipFlag_00.00": 'ptype'
    //model
    wind_speed_200: "wind_speed_upper",
    wind_speed_250: "wind_speed_upper",
    wind_speed_300: "wind_speed_upper",
    wind_speed_2pvu: "wind_speed_upper",
    wind_speed_2000: "wind_speed_upper",
    wind_speed_500: "wind_speed_mid",
    wind_speed_700: "wind_speed_mid",
    wind_speed_850: "wind_speed_mid",
    wind_speed_925: "wind_speed_mid",
    bulk_shear_speedmb_500: "bulk_shear_speed_upper",
    bulk_shear_speedmb_700: "bulk_shear_speed_upper",
    "bulk_shear_speed_0-6000": "bulk_shear_speed_upper",
    bulk_shear_speedmb_850: "bulk_shear_speed_lower",
    bulk_shear_speedmb_925: "bulk_shear_speed_lower",
    "bulk_shear_speed_0-1000": "bulk_shear_speed_lower",
    cape_9000: "cape_0",
    cape_25500: "cape_0",
    cin_9000: "cin_0",
    cin_25500: "cin_0",
    tadv_300: "tadv",
    tadv_700: "tadv",
    tadv_850: "tadv",
    r_500: "r",
    r_700: "r",
    r_850: "r",
    r_925: "r",
    w_500: "w",
    w_700: "w",
    w_850: "w",
    w_925: "w",
    t_500: "t",
    t_700: "t",
    t_850: "t",
    t_925: "t",
    refc_500: "refc_0",
    refd_1000: "refc_0",
    mxrefc_1000: "refc_0",
    d_700: "d",
    d_850: "d",
    d_925: "d",
    vo_500: "vo",
    vo_700: "vo",
    vo_850: "vo",
    vo_10: "vo",
    hlcy_3000: "hlcy",
    hlcy_1000: "hlcy",
    uphl_5000: "mxuphl_5000",
    ehi_3000: "ehi",
    ehi_1000: "ehi",
    mxuphl_5000_runmax: "mxuphl_5000",
    mxuphl_3000_runmax: "mxuphl_3000",
    gust_runmax: "gust_0",
    height_pbl: "cape_0",
    lftx_500: "lftx_0",
    ltng_0: "ltng",
    ltng_2: "ltng",
    divergence_850: "divergence",
    divergence_200: "divergence",
    fgen_850: "fgen",
    fgen_700: "fgen",
    avg_prate_6hr: "prate",
    avg_prate_3hr: "prate",
    csnow_3: "csnow_total",
    csnow_6: "csnow_total",
    csnow_12: "csnow_total",
    csnow_24: "csnow_total",
    csnow_48: "csnow_total",
    csnow_total: "csnow_total",
    cfrzr_3: "cfrzr_total",
    cfrzr_6: "cfrzr_total",
    cfrzr_12: "cfrzr_total",
    cfrzr_24: "cfrzr_total",
    cfrzr_48: "cfrzr_total",
    cfrzr_total: "cfrzr_total",
    crain_3: "crain_total",
    crain_6: "crain_total",
    crain_12: "crain_total",
    crain_24: "crain_total",
    crain_48: "crain_total",
    crain_total: "crain_total",
    cicep_3: "cicep_total",
    cicep_6: "cicep_total",
    cicep_12: "cicep_total",
    cicep_24: "cicep_total",
    cicep_48: "cicep_total",
    cicep_total: "cicep_total",
    tp_3: "tp_0_total",
    tp_6: "tp_0_total",
    tp_12: "tp_0_total",
    tp_24: "tp_0_total",
    tp_48: "tp_0_total",
    gh_tendency_500: "gh_tendency",
    atemp: "2t_2",
    t_500iso0: "t_iso",
    t_700iso0: "t_iso",
    t_850iso0: "t_iso",
    t_925iso0: "t_iso",
    "2t_2iso0": "t_iso"
  }
}, U = {
  "MergedZdr_04.00": {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dB: {
        colormap: [
          -4,
          "#404040",
          -2,
          "#808080",
          -0.5,
          "#c0c0c0",
          0,
          "#e0e0e0",
          0.3,
          "#9966cc",
          0.6,
          "#000080",
          1,
          "#0066cc",
          1.5,
          "#00cccc",
          2,
          "#00ff00",
          2.5,
          "#ffff00",
          3,
          "#ff9900",
          4,
          "#ff0000",
          5,
          "#cc0000",
          6,
          "#ff66cc",
          8,
          "#ffffff",
          20,
          "#800080"
        ],
        breakpoints: [
          -4,
          -2,
          -0.5,
          0,
          0.3,
          0.6,
          1,
          1.5,
          2,
          2.5,
          3,
          4,
          5,
          6,
          8,
          20
        ]
      }
    }
  },
  "MergedRhoHV_04.00": {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0.2,
          "#c0c0c0",
          0.45,
          "#c0c0c0",
          0.65,
          "#000080",
          0.75,
          "#0000ff",
          0.8,
          "#8066ff",
          0.85,
          "#00ff00",
          0.9,
          "#80ff00",
          0.93,
          "#ffff00",
          0.95,
          "#ffcc00",
          0.96,
          "#ff9900",
          0.97,
          "#ff6600",
          0.98,
          "#ff0000",
          0.99,
          "#cc0000",
          1,
          "#800080",
          1.05,
          "#ffccff",
          3,
          "#800080"
        ],
        breakpoints: [
          0.2,
          0.45,
          0.65,
          0.75,
          0.8,
          0.85,
          0.9,
          0.93,
          0.95,
          0.96,
          0.97,
          0.98,
          0.99,
          1,
          1.05,
          3
        ]
      }
    }
  },
  rotation: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "s⁻¹": {
        colormap: [
          0,
          "#e0e0e0",
          3e-3,
          "#c0c0c0",
          4e-3,
          "#a0a0a0",
          5e-3,
          "#808080",
          6e-3,
          "#666600",
          7e-3,
          "#999900",
          8e-3,
          "#cccc00",
          9e-3,
          "#ffff00",
          0.01,
          "#ffff00",
          0.011,
          "#cc0000",
          0.012,
          "#cc0000",
          0.013,
          "#ff0000",
          0.014,
          "#ff0000",
          0.015,
          "#ff0000",
          0.02,
          "#00ffff"
        ],
        breakpoints: [
          0,
          3e-3,
          4e-3,
          5e-3,
          6e-3,
          7e-3,
          8e-3,
          9e-3,
          0.01,
          0.011,
          0.012,
          0.013,
          0.014,
          0.015,
          0.02
        ]
      }
    }
  },
  hail: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      mm: {
        colormap: [
          0,
          "#00ffff",
          1,
          "#00ffff",
          2,
          "#0099ff",
          4,
          "#0066ff",
          6,
          "#00ff00",
          8,
          "#00ff00",
          10,
          "#00ff00",
          15,
          "#ffff00",
          20,
          "#ffcc00",
          30,
          "#ff9900",
          40,
          "#ff0000",
          50,
          "#ff0000",
          75,
          "#ff00ff",
          100,
          "#8000ff"
        ],
        breakpoints: [
          0,
          1,
          2,
          4,
          6,
          8,
          10,
          15,
          20,
          30,
          40,
          50,
          75,
          100
        ]
      }
    }
  },
  ff_ari: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      year: {
        colormap: [
          0,
          "#e0e0e0",
          1,
          "#00ff00",
          2,
          "#00ff00",
          3,
          "#ffff00",
          4,
          "#ffff00",
          6,
          "#ffcc00",
          8,
          "#ff9900",
          10,
          "#ff9900",
          20,
          "#ff0000",
          30,
          "#ff0000",
          40,
          "#ff0000",
          50,
          "#ff0000",
          75,
          "#ff00ff",
          100,
          "#ff00ff",
          200,
          "#8000ff"
        ],
        breakpoints: [
          0,
          1,
          2,
          3,
          4,
          6,
          8,
          10,
          20,
          30,
          40,
          50,
          75,
          100,
          200
        ]
      }
    }
  },
  lightning_prob: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          10,
          "#00ccff",
          20,
          "#0066ff",
          30,
          "#00ff00",
          40,
          "#00ff00",
          50,
          "#00ff00",
          60,
          "#ffff00",
          70,
          "#ff9900",
          80,
          "#ffccff",
          90,
          "#ff00ff",
          100,
          "#ffffff"
        ],
        breakpoints: [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      }
    }
  },
  vil: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "kg/m²": {
        colormap: [
          0.1,
          "#00ffff",
          1,
          "#00ffff",
          2,
          "#0099ff",
          3,
          "#0066ff",
          4,
          "#00ff00",
          5,
          "#00ff00",
          6,
          "#00ff00",
          7,
          "#ffff00",
          8,
          "#ffcc00",
          10,
          "#ff9900",
          12,
          "#ff0000",
          15,
          "#ff0000",
          18,
          "#ff00ff",
          25,
          "#8000ff",
          30,
          "#8000ff",
          40,
          "#ffffff",
          50,
          "#e0e0e0",
          60,
          "#c0c0c0",
          70,
          "#606060"
        ],
        breakpoints: [
          0.1,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          10,
          12,
          15,
          18,
          25,
          30,
          40,
          50,
          60,
          70
        ]
      }
    }
  },
  gh_tendency: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          -60,
          "#0000cc",
          -30,
          "#0000cc",
          0,
          "#ffffff",
          30,
          "#e60000",
          60,
          "#e60000"
        ],
        breakpoints: [
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60
        ]
      }
    }
  },
  refc_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dBZ: {
        colormap: [
          5,
          "#2980dc",
          15,
          "#00b2d4",
          20,
          "#00cc99",
          25,
          "#00e07f",
          30,
          "#8fd42a",
          35,
          "#ffcc00",
          40,
          "#ff8c00",
          45,
          "#ff6633",
          50,
          "#ff3333",
          55,
          "#cc3399",
          60,
          "#a020f0",
          65,
          "#8822ee",
          70,
          "#7425e6",
          75,
          "#cc33cc",
          80,
          "#ff66dd"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ]
      }
    }
  },
  mslma_0: {
    type: "line",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      hPa: {
        colormap: [
          900,
          "#0033ff",
          1e3,
          "#00d5ff",
          1002,
          "#ff6666",
          1060,
          "#ff0000"
        ],
        breakpoints: [
          870,
          872,
          874,
          876,
          878,
          880,
          882,
          884,
          886,
          888,
          890,
          892,
          894,
          896,
          898,
          900,
          902,
          904,
          906,
          908,
          910,
          912,
          914,
          916,
          918,
          920,
          922,
          924,
          926,
          928,
          930,
          932,
          934,
          936,
          938,
          940,
          942,
          944,
          946,
          948,
          950,
          952,
          954,
          956,
          958,
          960,
          962,
          964,
          966,
          968,
          970,
          972,
          974,
          976,
          978,
          980,
          982,
          984,
          986,
          988,
          990,
          992,
          994,
          996,
          998,
          1e3,
          1002,
          1004,
          1006,
          1008,
          1010,
          1012,
          1014,
          1016,
          1018,
          1020,
          1022,
          1024,
          1026,
          1028,
          1030,
          1032,
          1034,
          1036,
          1038,
          1040,
          1042,
          1044,
          1046,
          1048,
          1050,
          1052,
          1054,
          1056,
          1058,
          1060,
          1062,
          1064,
          1066,
          1068,
          1070,
          1072,
          1074,
          1076,
          1078,
          1080,
          1082,
          1084,
          1086,
          1088,
          1090
        ]
      }
    }
  },
  pres2PVU: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      hPa: {
        colormap: [
          20,
          "#cc3333",
          150,
          "#ff9933",
          210,
          "#ffdd00",
          375,
          "#33cc66",
          390,
          "#3366cc",
          510,
          "#4d88ff",
          570,
          "#66e6ff",
          645,
          "#ff99ff",
          750,
          "#cc33cc"
        ],
        breakpoints: [
          30,
          45,
          60,
          75,
          90,
          105,
          120,
          135,
          150,
          165,
          180,
          195,
          210,
          225,
          240,
          255,
          270,
          285,
          300,
          315,
          330,
          345,
          360,
          375,
          390,
          405,
          420,
          435,
          450,
          465,
          480,
          495,
          510,
          525,
          540,
          555,
          570,
          585,
          600,
          615,
          630,
          645,
          660,
          675,
          690,
          705,
          720,
          735,
          750,
          765,
          780,
          795,
          810,
          825,
          840
        ]
      }
    }
  },
  theta2PVU: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°K": {
        colormap: [
          260,
          "#cc66cc",
          300,
          "#cc0066",
          320,
          "#66ccff",
          345,
          "#3366cc",
          350,
          "#00cc33",
          375,
          "#ffee00",
          450,
          "#ff3333"
        ],
        breakpoints: [
          260,
          265,
          270,
          275,
          280,
          285,
          290,
          295,
          300,
          305,
          310,
          315,
          320,
          325,
          330,
          335,
          340,
          345,
          350,
          355,
          360,
          365,
          370,
          375,
          380,
          385,
          390,
          395,
          400,
          405,
          410,
          415,
          420,
          425,
          430,
          435,
          440,
          445,
          450,
          455,
          460,
          465,
          470,
          475,
          480,
          485,
          490,
          495
        ]
      }
    }
  },
  vo: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "s⁻¹": {
        colormap: [
          -80,
          "#444444",
          -40,
          "#444444",
          0,
          "#dddddd",
          4,
          "#ffee66",
          12,
          "#ff9933",
          20,
          "#ff6600",
          32,
          "#cc3366",
          40,
          "#9933aa",
          60,
          "#3333ff",
          72,
          "#333399",
          80,
          "#00ffff",
          150,
          "#ffffffff"
        ],
        breakpoints: [
          -80,
          -76,
          -72,
          -68,
          -64,
          -60,
          -56,
          -52,
          -48,
          -44,
          -40,
          -36,
          -32,
          -28,
          -24,
          -20,
          -16,
          -12,
          -8,
          -4,
          0,
          4,
          8,
          12,
          16,
          20,
          24,
          28,
          32,
          36,
          40,
          44,
          48,
          52,
          56,
          60,
          64,
          68,
          72,
          76,
          80,
          84,
          88,
          92,
          96,
          100,
          104,
          108,
          112,
          114,
          118,
          122,
          126,
          130,
          134,
          138,
          142,
          146,
          150
        ]
      }
    }
  },
  bulk_shear_speed_upper: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      kts: {
        colormap: [
          20,
          "#99ffff",
          40,
          "#7733cc",
          50,
          "#ff66cc",
          60,
          "#ff3377",
          70,
          "#993399",
          80,
          "#ff3333",
          90,
          "#cc0000",
          100,
          "#ff9900",
          120,
          "#ffdd00",
          140,
          "#ff8800"
        ],
        breakpoints: [
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          120,
          130,
          140,
          150,
          160,
          170,
          180
        ]
      },
      "m/s": {
        colormap: [
          10,
          "#99ffff",
          22,
          "#7733cc",
          26,
          "#ff66cc",
          30,
          "#ff3377",
          38,
          "#993399",
          42,
          "#ff3333",
          46,
          "#cc0000",
          50,
          "#ff9900",
          62,
          "#ffdd00",
          70,
          "#ff8800"
        ],
        breakpoints: [
          10,
          14,
          18,
          22,
          26,
          30,
          34,
          38,
          42,
          46,
          50,
          54,
          58,
          62,
          66,
          70,
          74,
          78,
          82,
          86,
          90
        ]
      }
    }
  },
  bulk_shear_speed_lower: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      kts: {
        colormap: [
          10,
          "#99ffff",
          20,
          "#ff66cc",
          30,
          "#ff3377",
          40,
          "#993399",
          50,
          "#ff3333",
          60,
          "#ff9900",
          70,
          "#ffdd00",
          80,
          "#ff8800"
        ],
        breakpoints: [
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90
        ]
      },
      "m/s": {
        colormap: [
          5,
          "#99ffff",
          11,
          "#ff66cc",
          15,
          "#ff3377",
          21,
          "#993399",
          25,
          "#ff3333",
          31,
          "#ff9900",
          35,
          "#ffdd00",
          41,
          "#ff8800"
        ],
        breakpoints: [
          5,
          7,
          9,
          11,
          13,
          15,
          17,
          19,
          21,
          23,
          25,
          27,
          29,
          31,
          33,
          35,
          37,
          39,
          41,
          43,
          45
        ]
      }
    }
  },
  hlcy: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "m²/s²": {
        colormap: [
          -1e3,
          "#33007a",
          0,
          "#dddddd",
          50,
          "#888888",
          100,
          "#3377cc",
          150,
          "#66bbff",
          200,
          "#ffdd00",
          300,
          "#ffcc00",
          350,
          "#ff0000",
          400,
          "#cc0066",
          450,
          "#8800cc",
          500,
          "#cc66ff",
          600,
          "#ffbbbb",
          1500,
          "#ff8800"
        ],
        breakpoints: [
          -1500,
          -1450,
          -1400,
          -1350,
          -1300,
          -1250,
          -1200,
          -1150,
          -1100,
          -1050,
          -1e3,
          -950,
          -900,
          -850,
          -800,
          -750,
          -700,
          -650,
          -600,
          -550,
          -500,
          -450,
          -400,
          -350,
          -300,
          -250,
          -200,
          -150,
          -100,
          -50,
          0,
          50,
          100,
          150,
          200,
          250,
          300,
          350,
          400,
          450,
          500,
          550,
          600,
          650,
          700,
          750,
          800,
          850,
          900,
          950,
          1e3,
          1050,
          1100,
          1150,
          1200,
          1250,
          1300,
          1350,
          1400,
          1450,
          1500
        ]
      }
    }
  },
  mxuphl_5000: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "m²/s²": {
        colormap: [
          2,
          "#99ffff",
          90,
          "#0077ff",
          100,
          "#ffee00",
          200,
          "#ff66ff",
          400,
          "#8800ee"
        ],
        breakpoints: [
          2,
          5,
          10,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260,
          280,
          300,
          320,
          340,
          360,
          380,
          400,
          440,
          480,
          520,
          560
        ]
      }
    }
  },
  mxuphl_3000: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "m²/s²": {
        colormap: [
          2,
          "#99ffff",
          90,
          "#0077ff",
          100,
          "#ffee00",
          200,
          "#ff66ff",
          300,
          "#8800ee"
        ],
        breakpoints: [
          2,
          5,
          10,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          120,
          130,
          140,
          150,
          160,
          170,
          180,
          190,
          200,
          220,
          240,
          260,
          280,
          300
        ]
      }
    }
  },
  ehi: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          -20,
          "#33007a",
          0,
          "#dddddd",
          1,
          "#3377cc",
          2,
          "#ffee00",
          6,
          "#cc0066",
          8,
          "#8800cc",
          20,
          "#ffbbbb"
        ],
        breakpoints: [
          -20,
          -19.5,
          -19,
          -18.5,
          -18,
          -17.5,
          -17,
          -16.5,
          -16,
          -15.5,
          -15,
          -14.5,
          -14,
          -13.5,
          -13,
          -12.5,
          -12,
          -11.5,
          -11,
          -10.5,
          -10,
          -9.5,
          -9,
          -8.5,
          -8,
          -7.5,
          -7,
          -6.5,
          -6,
          -5.5,
          -5,
          -4.5,
          -4,
          -3.5,
          -3,
          -2.5,
          -2,
          -1.5,
          -1,
          -0.5,
          0,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9,
          9.5,
          10,
          10.5,
          11,
          11.5,
          12,
          12.5,
          13,
          13.5,
          14,
          14.5,
          15,
          15.5,
          16,
          16.5,
          17,
          17.5,
          18,
          18.5,
          19,
          19.5,
          20
        ]
      }
    }
  },
  slr: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in. Snow/in. Liquid": {
        colormap: [
          1,
          "#ccffff",
          7,
          "#0088ff",
          9,
          "#7733cc",
          10,
          "#ff66ff",
          15,
          "#ffcc99",
          50,
          "#ff8800"
        ],
        breakpoints: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          31,
          32,
          33,
          34,
          35,
          36,
          37,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          46,
          47,
          48,
          49,
          50
        ]
      }
    }
  },
  "2t_2": {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "°F": {
        colormap: [
          -90,
          "#FFFFFF",
          -60,
          "#d9c2ff",
          -30,
          "#cc0088",
          0,
          "#8822ee",
          32,
          "#0077ff",
          33,
          "#00cccc",
          50,
          "#00dd66",
          60,
          "#ffbb00",
          80,
          "#ff5500",
          100,
          "#ff0066",
          120,
          "#cc0088",
          150,
          "#FFFFFF"
        ],
        breakpoints: [
          -90,
          -88,
          -86,
          -84,
          -82,
          -80,
          -78,
          -76,
          -74,
          -72,
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70,
          72,
          74,
          76,
          78,
          80,
          82,
          84,
          86,
          88,
          90,
          92,
          94,
          96,
          98,
          100,
          102,
          104,
          106,
          108,
          110,
          112,
          114,
          116,
          118,
          120,
          122,
          124,
          126,
          128,
          130,
          132,
          134,
          136,
          138,
          140,
          142,
          144,
          146,
          148,
          150
        ]
      },
      "°C": {
        colormap: [
          -70,
          "#FFFFFF",
          -40,
          "#d9c2ff",
          -31,
          "#cc0088",
          -13,
          "#8822ee",
          0,
          "#0077ff",
          1,
          "#00cccc",
          10,
          "#00dd66",
          15,
          "#ffbb00",
          25,
          "#ff5500",
          40,
          "#ff0066",
          50,
          "#cc0088",
          70,
          "#FFFFFF"
        ],
        breakpoints: [
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70
        ]
      }
    }
  },
  t_iso: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°C": {
        colormap: [0, "#0033ff"],
        breakpoints: [0]
      }
    }
  },
  "2d_2": {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°F": {
        colormap: [
          -80,
          "#ff0000",
          -60,
          "#ff5500",
          -20,
          "#ffaa00",
          32,
          "#dddddd",
          33,
          "#66dd88",
          50,
          "#00cc66",
          60,
          "#0077ff",
          80,
          "#66aaff",
          90,
          "#ffffff"
        ],
        breakpoints: [
          -80,
          -78,
          -76,
          -74,
          -72,
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70,
          72,
          74,
          76,
          78,
          80,
          82,
          84,
          86,
          88,
          90
        ]
      },
      "°C": {
        colormap: [
          -70,
          "#ff0000",
          -50,
          "#ff5500",
          -30,
          "#ffaa00",
          0,
          "#dddddd",
          1,
          "#66dd88",
          10,
          "#00cc66",
          20,
          "#0077ff",
          30,
          "#66aaff",
          40,
          "#ffffff"
        ],
        breakpoints: [
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50
        ]
      }
    }
  },
  d: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°C": {
        colormap: [
          -70,
          "#FFFFFF",
          -40,
          "#d9c2ff",
          -31,
          "#cc0088",
          -13,
          "#8822ee",
          0,
          "#0077ff",
          1,
          "#00cccc",
          10,
          "#00dd66",
          15,
          "#ffbb00",
          25,
          "#ff5500",
          40,
          "#ff0066",
          50,
          "#cc0088",
          70,
          "#FFFFFF"
        ],
        breakpoints: [
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70
        ]
      }
    }
  },
  t: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "°C": {
        colormap: [
          -50,
          "#ffffff",
          -35,
          "#cc0088",
          -20,
          "#8822ee",
          0,
          "#0077ff",
          1,
          "#00cccc",
          10,
          "#00dd66",
          15,
          "#ffbb00",
          25,
          "#ff5500",
          40,
          "#ff0066",
          50,
          "#cc0088"
        ],
        breakpoints: [
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50
        ]
      }
    }
  },
  wind_speed_10: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      kts: {
        colormap: [
          5,
          "#dddddd",
          10,
          "#99ccff",
          15,
          "#0088ff",
          35,
          "#8822ee",
          50,
          "#ff0088",
          70,
          "#ff8800",
          120,
          "#ffff00"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150
        ]
      },
      mph: {
        colormap: [
          5,
          "#dddddd",
          10,
          "#99ccff",
          20,
          "#0088ff",
          40,
          "#8822ee",
          55,
          "#ff0088",
          80,
          "#ff8800",
          150,
          "#ffff00"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150,
          155,
          160,
          165,
          170,
          175,
          180,
          185,
          190,
          195,
          200
        ]
      },
      "m/s": {
        colormap: [
          2,
          "#dddddd",
          10,
          "#0088ff",
          20,
          "#8822ee",
          24,
          "#ff0088",
          36,
          "#ff8800",
          60,
          "#ffff00"
        ],
        breakpoints: [
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70,
          72,
          74,
          76,
          78,
          80
        ]
      },
      "km/h": {
        colormap: [
          10,
          "#dddddd",
          20,
          "#99ccff",
          35,
          "#0088ff",
          70,
          "#8822ee",
          90,
          "#ff0088",
          130,
          "#ff8800",
          220,
          "#ffff00"
        ],
        breakpoints: [
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150,
          155,
          160,
          165,
          170,
          175,
          180,
          185,
          190,
          195,
          200,
          205,
          210,
          215,
          220,
          225,
          230,
          235,
          240,
          245,
          250,
          255,
          260,
          265,
          270,
          275,
          280,
          285,
          290,
          295,
          300
        ]
      }
    }
  },
  wind_speed_upper: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      kts: {
        colormap: [
          50,
          "#99ffff",
          60,
          "#00cccc",
          70,
          "#00dd66",
          90,
          "#ffee00",
          120,
          "#ff9900",
          130,
          "#ff3333",
          140,
          "#9933cc",
          180,
          "#ff99ff",
          200,
          "#ff6666",
          250,
          "#ff0000"
        ],
        breakpoints: [
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          120,
          130,
          140,
          150,
          160,
          170,
          180,
          190,
          200,
          210,
          220,
          230,
          240,
          250
        ]
      },
      mph: {
        colormap: [
          55,
          "#99ffff",
          70,
          "#00cccc",
          80,
          "#00dd66",
          105,
          "#ffee00",
          140,
          "#ff9900",
          150,
          "#ff3333",
          160,
          "#9933cc",
          205,
          "#ff99ff",
          230,
          "#ff6666",
          290,
          "#ff0000"
        ],
        breakpoints: [
          10,
          25,
          35,
          45,
          55,
          70,
          80,
          90,
          105,
          115,
          125,
          140,
          150,
          160,
          170,
          185,
          195,
          205,
          220,
          230,
          240,
          255,
          265,
          275,
          290
        ]
      },
      "m/s": {
        colormap: [
          25,
          "#99ffff",
          30,
          "#00cccc",
          36,
          "#00dd66",
          46,
          "#ffee00",
          62,
          "#ff9900",
          67,
          "#ff3333",
          72,
          "#9933cc",
          93,
          "#ff99ff",
          103,
          "#ff6666",
          129,
          "#ff0000"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          36,
          41,
          46,
          51,
          57,
          62,
          67,
          72,
          77,
          82,
          88,
          93,
          98,
          103,
          108,
          113,
          118,
          124,
          129
        ]
      },
      "km/h": {
        colormap: [
          95,
          "#99ffff",
          110,
          "#00cccc",
          130,
          "#00dd66",
          165,
          "#ffee00",
          220,
          "#ff9900",
          240,
          "#ff3333",
          260,
          "#9933cc",
          335,
          "#ff99ff",
          370,
          "#ff6666",
          460,
          "#ff0000"
        ],
        breakpoints: [
          20,
          35,
          55,
          75,
          95,
          110,
          130,
          150,
          165,
          185,
          205,
          220,
          240,
          260,
          280,
          295,
          315,
          335,
          350,
          370,
          390,
          410,
          425,
          445,
          460
        ]
      }
    }
  },
  wind_speed_mid: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      kts: {
        colormap: [
          10,
          "#ccddee",
          20,
          "#99ffff",
          30,
          "#00cccc",
          35,
          "#00dd66",
          45,
          "#ffee00",
          55,
          "#ff9900",
          65,
          "#9933cc",
          100,
          "#ff99ff",
          120,
          "#ff6666",
          155,
          "#ff0000"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150,
          155,
          160,
          165,
          170,
          175,
          180,
          185,
          190,
          195,
          200,
          205,
          210,
          215,
          220,
          225,
          230,
          235,
          240,
          245,
          250
        ]
      },
      mph: {
        colormap: [
          10,
          "#ccddee",
          25,
          "#99ffff",
          35,
          "#00cccc",
          40,
          "#00dd66",
          50,
          "#ffee00",
          65,
          "#ff9900",
          75,
          "#9933cc",
          115,
          "#ff99ff",
          140,
          "#ff6666",
          180,
          "#ff0000"
        ],
        breakpoints: [
          5,
          10,
          15,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          65,
          70,
          75,
          80,
          85,
          90,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          140,
          145,
          150,
          155,
          160,
          165,
          170,
          180,
          185,
          190,
          195,
          200,
          205,
          210,
          220,
          225,
          230,
          235,
          240,
          245,
          250,
          260,
          265,
          270,
          275,
          280,
          285,
          290
        ]
      },
      "m/s": {
        colormap: [
          5,
          "#ccddee",
          10,
          "#99ffff",
          15,
          "#00cccc",
          18,
          "#00dd66",
          23,
          "#ffee00",
          28,
          "#ff9900",
          33,
          "#9933cc",
          51,
          "#ff99ff",
          62,
          "#ff6666",
          80,
          "#ff0000"
        ],
        breakpoints: [
          2,
          5,
          8,
          10,
          13,
          15,
          18,
          20,
          23,
          26,
          28,
          31,
          33,
          36,
          38,
          41,
          44,
          46,
          49,
          51,
          54,
          57,
          59,
          62,
          64,
          67,
          69,
          72,
          74,
          77,
          80,
          82,
          85,
          87,
          90,
          92,
          95,
          97,
          100,
          103,
          105,
          108,
          110,
          113,
          115,
          118,
          120,
          123,
          125,
          128
        ]
      },
      "km/h": {
        colormap: [
          20,
          "#ccddee",
          35,
          "#99ffff",
          55,
          "#00cccc",
          65,
          "#00dd66",
          85,
          "#ffee00",
          100,
          "#ff9900",
          120,
          "#9933cc",
          185,
          "#ff99ff",
          220,
          "#ff6666",
          290,
          "#ff0000"
        ],
        breakpoints: [
          10,
          20,
          25,
          35,
          45,
          55,
          65,
          75,
          85,
          95,
          100,
          110,
          120,
          130,
          140,
          150,
          160,
          165,
          175,
          185,
          195,
          205,
          210,
          220,
          230,
          240,
          250,
          260,
          270,
          280,
          290,
          300,
          310,
          315,
          325,
          335,
          345,
          355,
          365,
          370,
          380,
          390,
          395,
          405,
          415,
          425,
          435,
          445,
          455,
          465
        ]
      }
    }
  },
  pwat_0: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      mm: {
        colormap: [
          0,
          "#ff5500",
          10,
          "#ff9933",
          25,
          "#ffcc99",
          35,
          "#cc99ff",
          55,
          "#8866ff",
          65,
          "#5555ff",
          75,
          "#3333aa"
        ],
        breakpoints: [
          1,
          3,
          5,
          7,
          9,
          11,
          13,
          15,
          17,
          19,
          21,
          23,
          25,
          27,
          29,
          31,
          33,
          35,
          37,
          39,
          41,
          43,
          45,
          47,
          49,
          51,
          53,
          55,
          57,
          59,
          61,
          63,
          65,
          67,
          69,
          71,
          73,
          75,
          77,
          79,
          81,
          83,
          85,
          87,
          89
        ]
      },
      in: {
        colormap: [
          0,
          "#ff5500",
          0.5,
          "#ff9933",
          1,
          "#ffcc99",
          1.5,
          "#cc99ff",
          2,
          "#8866ff",
          2.5,
          "#5555ff",
          3,
          "#3333aa"
        ],
        breakpoints: [
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5,
          3.75,
          4
        ]
      }
    }
  },
  thetaE: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "°K": {
        colormap: [
          230,
          "#995522",
          300,
          "#ffbb77",
          320,
          "#99ff66",
          325,
          "#33cc00",
          330,
          "#00eeff",
          335,
          "#0099aa",
          340,
          "#8800ff",
          355,
          "#ff0000",
          360,
          "#ff0088",
          370,
          "#ffaaaa"
        ],
        breakpoints: [
          230,
          235,
          240,
          245,
          250,
          255,
          260,
          265,
          270,
          275,
          280,
          285,
          290,
          295,
          300,
          305,
          310,
          315,
          320,
          325,
          330,
          335,
          340,
          345,
          350,
          355,
          360,
          365,
          370
        ]
      }
    }
  },
  gust_0: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      mph: {
        colormap: [
          20,
          "#6699ff",
          30,
          "#00ffff",
          35,
          "#00cc33",
          45,
          "#99ff66",
          50,
          "#ffdd00",
          65,
          "#ff0000",
          70,
          "#cc6600",
          85,
          "#ffbbbb",
          100,
          "#ff3333",
          120,
          "#ff8800",
          200,
          "#999999"
        ],
        breakpoints: [
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150,
          155,
          160,
          165,
          170,
          175,
          180,
          185,
          190,
          195,
          200
        ]
      },
      kts: {
        colormap: [
          15,
          "#6699ff",
          25,
          "#00ffff",
          30,
          "#00cc33",
          40,
          "#99ff66",
          50,
          "#ffdd00",
          55,
          "#ff0000",
          60,
          "#cc6600",
          70,
          "#ffbbbb",
          90,
          "#ff3333",
          100,
          "#ff8800",
          150,
          "#999999"
        ],
        breakpoints: [
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150
        ]
      },
      "m/s": {
        colormap: [
          10,
          "#6699ff",
          14,
          "#00ffff",
          16,
          "#00cc33",
          20,
          "#99ff66",
          24,
          "#ffdd00",
          30,
          "#ff0000",
          32,
          "#cc6600",
          38,
          "#ffbbbb",
          44,
          "#ff3333",
          52,
          "#ff8800",
          80,
          "#999999"
        ],
        breakpoints: [
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60,
          62,
          64,
          66,
          68,
          70,
          72,
          74,
          76,
          78,
          80
        ]
      },
      "km/h": {
        colormap: [
          30,
          "#6699ff",
          50,
          "#00ffff",
          55,
          "#00cc33",
          70,
          "#99ff66",
          80,
          "#ffdd00",
          105,
          "#ff0000",
          115,
          "#cc6600",
          135,
          "#ffbbbb",
          160,
          "#ff3333",
          195,
          "#ff8800",
          320,
          "#999999"
        ],
        breakpoints: [
          30,
          40,
          50,
          55,
          65,
          70,
          80,
          90,
          95,
          105,
          115,
          120,
          130,
          135,
          145,
          150,
          160,
          170,
          175,
          185,
          195,
          200,
          210,
          215,
          225,
          235,
          240,
          250,
          255,
          265,
          270,
          280,
          290,
          295,
          305,
          315,
          320
        ]
      }
    }
  },
  ltng: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "flashes km⁻²/5 min": {
        colormap: [
          0.01,
          "#dddddd",
          0.75,
          "#ffff00",
          1,
          "#ff9999",
          2,
          "#ff66bb",
          3,
          "#cc66cc",
          5,
          "#ff66ff",
          6,
          "#cc66ff",
          15,
          "#ff3399",
          21,
          "#ff9933"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          17,
          19,
          21
        ]
      }
    }
  },
  cape_0: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "J kg⁻¹": {
        colormap: [
          100,
          "#4dbb6a",
          250,
          "#4dbb6a",
          1e3,
          "#ffca3a",
          2e3,
          "#ff9a3c",
          3e3,
          "#ff5e7d",
          6e3,
          "#9c3fe4"
        ],
        breakpoints: [
          100,
          250,
          500,
          750,
          1e3,
          1250,
          1500,
          1750,
          2e3,
          2250,
          2500,
          2750,
          3e3,
          3250,
          3500,
          3750,
          4e3,
          4250,
          4500,
          4750,
          5e3,
          5250,
          5500,
          5750,
          6e3,
          6250,
          6500,
          6750,
          7e3,
          7250,
          7500,
          7750,
          8e3,
          8250,
          8500,
          8750,
          9e3,
          9250,
          9500,
          9750,
          1e4
        ]
      }
    }
  },
  "cape_0-3000": {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "J kg⁻¹": {
        colormap: [
          5,
          "#4dbb6a",
          100,
          "#ffca3a",
          200,
          "#ff9a3c",
          300,
          "#ff5e7d",
          500,
          "#9c3fe4"
        ],
        breakpoints: [
          5,
          25,
          50,
          75,
          100,
          125,
          150,
          175,
          200,
          225,
          250,
          275,
          300,
          325,
          350,
          375,
          400,
          425,
          450,
          475,
          500
        ]
      }
    }
  },
  stp: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0.1,
          "#b3b3b3",
          1,
          "#4d80b3",
          2,
          "#ffaa00",
          3,
          "#ff3366",
          4,
          "#cc33ff",
          5,
          "#ff66cc",
          6,
          "#ff6633",
          9,
          "#ffaa66",
          30,
          "#00cccc"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9,
          9.5,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          35,
          40
        ]
      }
    }
  },
  supercellComposite: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0.1,
          "#b3b3b3",
          1,
          "#4d80b3",
          2,
          "#ffaa00",
          3,
          "#ff3366",
          4,
          "#cc33ff",
          5,
          "#ff66cc",
          6,
          "#ff6633",
          9,
          "#ffaa66",
          20,
          "#00cccc",
          50,
          "white"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9,
          9.5,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50
        ]
      }
    }
  },
  tts: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0.1,
          "#b3b3b3",
          1,
          "#4d80b3",
          2,
          "#ffaa00",
          3,
          "#ff3366",
          4,
          "#cc33ff",
          5,
          "#ff66cc",
          6,
          "#ff6633",
          9,
          "#ffaa66",
          30,
          "#00cccc"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9,
          9.5,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          35,
          40
        ]
      }
    }
  },
  tehi: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0.1,
          "#b3b3b3",
          1,
          "#4d80b3",
          2,
          "#ffaa00",
          3,
          "#ff3366",
          4,
          "#cc33ff",
          5,
          "#ff66cc",
          6,
          "#ff6633",
          9,
          "#ffaa66",
          30,
          "#00cccc"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          6.5,
          7,
          7.5,
          8,
          8.5,
          9,
          9.5,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30,
          35,
          40
        ]
      }
    }
  },
  lftx_0: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "°C": {
        colormap: [
          -20,
          "#ffb3b3",
          -14,
          "#ff3300",
          -13,
          "#cc0000",
          -12,
          "#ff6699",
          -10,
          "#ff99ff",
          -9,
          "#cc66ff",
          -8,
          "#9933ff",
          -7,
          "#cc0055",
          -6,
          "#ff0044",
          -4,
          "#ffaa00",
          -3,
          "#ffff00",
          -2,
          "#6699ff",
          -1,
          "#0066cc"
        ],
        breakpoints: [
          -20,
          -19,
          -18,
          -17,
          -16,
          -15,
          -14,
          -13,
          -12,
          -11,
          -10,
          -9,
          -8,
          -7,
          -6,
          -5,
          -4,
          -3,
          -2,
          -1
        ]
      }
    }
  },
  lapse_rates_500700: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "°C km⁻¹": {
        colormap: [
          1,
          "#cccccc",
          5,
          "#666666",
          6,
          "#3366cc",
          7,
          "#ffff00",
          8,
          "#ff9900",
          9,
          "#cc33ff",
          10,
          "#ff99ff",
          15,
          "#cc0000"
        ],
        breakpoints: [
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15
        ]
      }
    }
  },
  lcl: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      m: {
        colormap: [
          100,
          "#cccccc",
          1e3,
          "#ffcc66",
          2e3,
          "#ff6633",
          3e3,
          "#cc0033",
          4e3,
          "#660033",
          9e3,
          "#ccccff"
        ],
        breakpoints: [
          100,
          200,
          300,
          400,
          500,
          600,
          700,
          800,
          900,
          1e3,
          1100,
          1200,
          1300,
          1400,
          1500,
          1600,
          1700,
          1800,
          1900,
          2e3,
          2100,
          2200,
          2300,
          2400,
          2500,
          2600,
          2700,
          2800,
          2900,
          3e3,
          3100,
          3200,
          3300,
          3400,
          3500,
          3600,
          3700,
          3800,
          3900,
          4e3,
          4100,
          4200,
          4300,
          4400,
          4500,
          4600,
          4700,
          4800,
          4900,
          5e3,
          5100,
          5200,
          5300,
          5400,
          5500,
          5600,
          5700,
          5800,
          5900,
          6e3,
          6100,
          6200,
          6300,
          6400,
          6500,
          6600,
          6700,
          6800,
          6900,
          7e3,
          7100,
          7200,
          7300,
          7400,
          7500,
          7600,
          7700,
          7800,
          7900,
          8e3,
          8100,
          8200,
          8300,
          8400,
          8500,
          8600,
          8700,
          8800,
          8900,
          9e3,
          9100,
          9200,
          9300,
          9400,
          9500,
          9600,
          9700,
          9800,
          9900,
          1e4
        ]
      },
      km: {
        colormap: [
          0.1,
          "#cccccc",
          1,
          "#ffcc66",
          2,
          "#ff6633",
          3,
          "#cc0033",
          4,
          "#660033",
          9,
          "#ccccff"
        ],
        breakpoints: [
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.1,
          1.2,
          1.3,
          1.4,
          1.5,
          1.6,
          1.7,
          1.8,
          1.9,
          2,
          2.1,
          2.2,
          2.3,
          2.4,
          2.5,
          2.6,
          2.7,
          2.8,
          2.9,
          3,
          3.1,
          3.2,
          3.3,
          3.4,
          3.5,
          3.6,
          3.7,
          3.8,
          3.9,
          4,
          4.1,
          4.2,
          4.3,
          4.4,
          4.5,
          4.6,
          4.7,
          4.8,
          4.9,
          5,
          5.1,
          5.2,
          5.3,
          5.4,
          5.5,
          5.6,
          5.7,
          5.8,
          5.9,
          6,
          6.1,
          6.2,
          6.3,
          6.4,
          6.5,
          6.6,
          6.7,
          6.8,
          6.9,
          7,
          7.1,
          7.2,
          7.3,
          7.4,
          7.5,
          7.6,
          7.7,
          7.8,
          7.9,
          8,
          8.1,
          8.2,
          8.3,
          8.4,
          8.5,
          8.6,
          8.7,
          8.8,
          8.9,
          9,
          9.1,
          9.2,
          9.3,
          9.4,
          9.5,
          9.6,
          9.7,
          9.8,
          9.9,
          10
        ]
      },
      ft: {
        colormap: [
          500,
          "#cccccc",
          3e3,
          "#ffcc66",
          6500,
          "#ff6633",
          1e4,
          "#cc0033",
          13e3,
          "#660033",
          3e4,
          "#ccccff"
        ],
        breakpoints: [
          500,
          1e3,
          1500,
          2e3,
          2500,
          3e3,
          3500,
          4e3,
          4500,
          5e3,
          5500,
          6e3,
          6500,
          7e3,
          7500,
          8e3,
          8500,
          9e3,
          9500,
          1e4,
          10500,
          11e3,
          11500,
          12e3,
          12500,
          13e3,
          13500,
          14e3,
          14500,
          15e3,
          15500,
          16e3,
          16500,
          17e3,
          17500,
          18e3,
          18500,
          19e3,
          19500,
          2e4,
          20500,
          21e3,
          21500,
          22e3,
          22500,
          23e3,
          23500,
          24e3,
          24500,
          25e3,
          25500,
          26e3,
          26500,
          27e3,
          27500,
          28e3,
          28500,
          29e3,
          29500,
          3e4
        ]
      }
    }
  },
  cin_0: {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "J kg⁻¹": {
        colormap: [
          -1e3,
          "#cccccc",
          -600,
          "#ff9900",
          -400,
          "#ff99ff",
          -300,
          "#cc66ff",
          -200,
          "#cc6699",
          -50,
          "#ffdd00"
        ],
        breakpoints: [
          -1e3,
          -950,
          -900,
          -850,
          -800,
          -750,
          -700,
          -650,
          -600,
          -550,
          -500,
          -450,
          -400,
          -350,
          -300,
          -250,
          -200,
          -150,
          -100,
          -50
        ]
      }
    }
  },
  dgzrh: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#5555dd",
          25,
          "#ff9999",
          50,
          "#ffcc33",
          75,
          "#33cc66",
          100,
          "#3399ff"
        ],
        breakpoints: [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100
        ]
      }
    }
  },
  "2r_2": {
    type: "fill",
    gridded: !0,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#444444",
          25,
          "#ff6655",
          50,
          "#ffcc00",
          75,
          "#33cc77",
          100,
          "#3399ff"
        ],
        breakpoints: [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100
        ]
      }
    }
  },
  r: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#444444",
          25,
          "#ff6655",
          50,
          "#ffcc00",
          75,
          "#33cc77",
          100,
          "#3399ff"
        ],
        breakpoints: [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100
        ]
      }
    }
  },
  mean700300mbRH: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#444444",
          25,
          "#ff6655",
          50,
          "#ffcc00",
          75,
          "#33cc77",
          100,
          "#3399ff"
        ],
        breakpoints: [
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100
        ]
      }
    }
  },
  fgen: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°C/100km/3hr": {
        colormap: [
          1,
          "#cc66ff",
          10,
          "#ff66ff",
          20,
          "#3333ff"
        ],
        breakpoints: [
          1,
          3,
          5,
          7,
          9,
          11,
          12,
          13,
          15,
          17,
          19,
          21,
          23,
          25,
          27,
          29,
          31,
          33,
          35,
          37,
          39,
          41,
          43,
          45,
          47,
          49,
          51,
          53,
          55,
          57,
          59,
          61
        ]
      }
    }
  },
  tadv: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°C h⁻¹": {
        colormap: [
          -20,
          "#6699ff",
          -10,
          "#ccffff",
          -8,
          "#ff99ff",
          -6,
          "#ff66cc",
          -4,
          "#cc66ff",
          -2,
          "#66ccff",
          -1,
          "#ffffff",
          1,
          "#ffffff",
          2,
          "#ffcc66",
          4,
          "#ff9933",
          6,
          "#ff3333",
          8,
          "#cccc00",
          10,
          "#ddcc66",
          20,
          "#cc9933"
        ],
        breakpoints: [
          -20,
          -19,
          -18,
          -17,
          -16,
          -15,
          -14,
          -13,
          -12,
          -11,
          -10,
          -9,
          -8,
          -7,
          -6,
          -5,
          -4,
          -3,
          -2,
          -1,
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20
        ]
      }
    }
  },
  ivt: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "kg m⁻¹ s⁻¹": {
        colormap: [
          250,
          "#ffbb00",
          800,
          "#ff6666",
          1600,
          "#9933cc"
        ],
        breakpoints: [
          250,
          300,
          350,
          400,
          450,
          500,
          550,
          600,
          650,
          700,
          750,
          800,
          850,
          900,
          950,
          1e3,
          1050,
          1100,
          1150,
          1200,
          1250,
          1300,
          1350,
          1400,
          1450,
          1500,
          1550,
          1600,
          1650,
          1700,
          1750,
          1800,
          1850,
          1900,
          1950,
          2e3,
          2050,
          2100
        ]
      }
    }
  },
  dgzvvel: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "Pa/s": {
        colormap: [
          -80,
          "#00ccff",
          -40,
          "#3333aa",
          -25,
          "#ff66cc",
          -10,
          "#ff7777",
          -2,
          "#ffee00",
          0,
          "#cccccc",
          50,
          "#333333"
        ],
        breakpoints: [
          -100,
          -95,
          -90,
          -85,
          -80,
          -75,
          -70,
          -65,
          -60,
          -55,
          -50,
          -45,
          -40,
          -35,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100
        ]
      }
    }
  },
  w: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "Pa/s": {
        colormap: [
          -150,
          "#00ccff",
          -50,
          "#3333aa",
          -35,
          "#ff66cc",
          -20,
          "#ff7777",
          -5,
          "#ffee00",
          0,
          "#cccccc",
          50,
          "#333333",
          150,
          "white"
        ],
        breakpoints: [
          -150,
          -145,
          -140,
          -135,
          -130,
          -125,
          -120,
          -115,
          -110,
          -105,
          -100,
          -95,
          -90,
          -85,
          -80,
          -75,
          -70,
          -65,
          -60,
          -55,
          -50,
          -45,
          -40,
          -35,
          -30,
          -25,
          -20,
          -15,
          -10,
          -5,
          0,
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80,
          85,
          90,
          95,
          100,
          105,
          110,
          115,
          120,
          125,
          130,
          135,
          140,
          145,
          150
        ]
      }
    }
  },
  crain: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0,
          "#000000",
          1,
          "#66cc66"
        ],
        breakpoints: []
      }
    }
  },
  csnow: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0,
          "#000000",
          1,
          "#6699cc"
        ],
        breakpoints: []
      }
    }
  },
  cicep: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0,
          "#000000",
          1,
          "#cc66ee"
        ],
        breakpoints: []
      }
    }
  },
  cfrzr: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      None: {
        colormap: [
          0,
          "#000000",
          1,
          "#ff3399"
        ],
        breakpoints: []
      }
    }
  },
  prate: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in/hr": {
        colormap: [
          5e-3,
          "#00cc66",
          0.1,
          "#ffff00",
          0.3,
          "#ff8800",
          1,
          "#ff0000",
          1.5,
          "#ff00cc"
        ],
        breakpoints: [
          5e-3,
          0.01,
          0.03,
          0.05,
          0.07,
          0.1,
          0.15,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      "mm/hr": {
        colormap: [
          0.1,
          "#00cc66",
          3,
          "#ffff00",
          7,
          "#ff8800",
          24,
          "#ff0000",
          36,
          "#ff00cc"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          30,
          36,
          42
        ]
      }
    }
  },
  frzrRate: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in/hr [QPF]": {
        colormap: [
          5e-3,
          "#ff3300",
          0.1,
          "#ff33ff",
          0.6,
          "#cc99cc"
        ],
        breakpoints: [
          5e-3,
          0.01,
          0.03,
          0.05,
          0.07,
          0.1,
          0.15,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      "mm/hr [QPF]": {
        colormap: [
          0.1,
          "#ff3300",
          3,
          "#ff33ff",
          14,
          "#cc99cc"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          30,
          36
        ]
      }
    }
  },
  icepRate: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in/hr [3:1]": {
        colormap: [
          5e-3,
          "#8800cc",
          0.2,
          "#aa44dd",
          0.6,
          "#cc88dd"
        ],
        breakpoints: [
          5e-3,
          0.01,
          0.03,
          0.05,
          0.07,
          0.1,
          0.15,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      "mm/hr [3:1]": {
        colormap: [
          0.1,
          "#8800cc",
          6,
          "#aa44dd",
          16,
          "#cc88dd"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          30,
          36
        ]
      }
    }
  },
  rainRate: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in/hr": {
        colormap: [
          5e-3,
          "#00cc66",
          0.1,
          "#ffff00",
          0.3,
          "#ff8800",
          1,
          "#ff0000",
          1.5,
          "#ff00cc"
        ],
        breakpoints: [
          5e-3,
          0.01,
          0.03,
          0.05,
          0.07,
          0.1,
          0.15,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      "mm/hr": {
        colormap: [
          0.1,
          "#00cc66",
          3,
          "#ffff00",
          7,
          "#ff8800",
          24,
          "#ff0000",
          36,
          "#ff00cc"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          30,
          36,
          42
        ]
      }
    }
  },
  snowRate: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in/hr [10:1]": {
        colormap: [
          0.05,
          "#33ccff",
          1,
          "#000099",
          4,
          "#ff00cc"
        ],
        breakpoints: [
          0.05,
          0.1,
          0.3,
          0.5,
          0.7,
          1,
          1.5,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          20,
          25,
          30
        ]
      },
      "cm/hr [10:1]": {
        colormap: [
          0.1,
          "#33ccff",
          3,
          "#000099",
          10,
          "#ff00cc"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          30,
          36
        ]
      }
    }
  },
  frzrRefl: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dBZ: {
        colormap: [
          5,
          "#ff3300",
          30,
          "#ffaa33",
          80,
          "#cc0066"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ]
      }
    }
  },
  icepRefl: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dBZ: {
        colormap: [
          5,
          "#8800cc",
          70,
          "#ffbb00",
          80,
          "#dddddd"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ]
      }
    }
  },
  snowRefl: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dBZ: {
        colormap: [
          5,
          "#33ccff",
          35,
          "#8800cc",
          70,
          "#ffccff",
          80,
          "#dddddd"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ]
      }
    }
  },
  rainRefl: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dBZ: {
        colormap: [
          5,
          "#00cc66",
          35,
          "#ffff00",
          70,
          "#ff8800",
          80,
          "#ff0000"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          65,
          70,
          75,
          80
        ]
      }
    }
  },
  csnow_total: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [10:1]": {
        colormap: [
          0.1,
          "#ccffff",
          2,
          "#99cccc",
          5,
          "#3399ff",
          6,
          "#9966ff",
          11,
          "#cc66ff",
          12,
          "#ff3399",
          20,
          "#ff99cc",
          24,
          "#ff7788",
          36,
          "#ffbb66",
          48,
          "#99ccff",
          300,
          "#99ffff"
        ],
        breakpoints: [
          0.1,
          0.5,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          14,
          16,
          18,
          20,
          24,
          28,
          32,
          36,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          150,
          200,
          300,
          400
        ]
      },
      "cm [10:1]": {
        colormap: [
          0.25,
          "#ccffff",
          4,
          "#99cccc",
          12,
          "#3399ff",
          16,
          "#9966ff",
          28,
          "#cc66ff",
          36,
          "#ff3399",
          48,
          "#ff99cc",
          60,
          "#ff7788",
          90,
          "#ffbb66",
          120,
          "#99ccff",
          700,
          "#99ffff"
        ],
        breakpoints: [
          0.25,
          0.5,
          1,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          20,
          24,
          28,
          32,
          36,
          40,
          44,
          48,
          52,
          60,
          68,
          76,
          82,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          250,
          300,
          400,
          500,
          600,
          700
        ]
      },
      "mm [10:1]": {
        colormap: [
          2.5,
          "#ccffff",
          40,
          "#99cccc",
          120,
          "#3399ff",
          160,
          "#9966ff",
          280,
          "#cc66ff",
          360,
          "#ff3399",
          480,
          "#ff99cc",
          600,
          "#ff7788",
          900,
          "#ffbb66",
          1200,
          "#99ccff",
          7e3,
          "#99ffff"
        ],
        breakpoints: [
          2.5,
          5,
          10,
          20,
          40,
          60,
          80,
          100,
          120,
          140,
          160,
          200,
          240,
          280,
          320,
          360,
          400,
          440,
          480,
          520,
          600,
          680,
          760,
          820,
          900,
          1e3,
          1200,
          1400,
          1600,
          1800,
          2e3,
          2500,
          3e3,
          4e3,
          5e3,
          6e3,
          7e3
        ]
      }
    }
  },
  csnow_1: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [10:1]": {
        colormap: [
          0.1,
          "#aaaaaa",
          0.25,
          "#444444",
          0.5,
          "#66aaff",
          0.75,
          "#0022cc",
          1,
          "#99ff00",
          1.5,
          "#00aa00",
          2,
          "#ffee00",
          2.5,
          "#ff3333",
          3,
          "#ff66ff",
          3.5,
          "#880066",
          4,
          "#666666",
          10,
          "#666666"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10
        ]
      },
      "cm [10:1]": {
        colormap: [
          0.25,
          "#aaaaaa",
          0.5,
          "#444444",
          1.5,
          "#66aaff",
          2,
          "#0022cc",
          2.5,
          "#99ff00",
          4,
          "#00aa00",
          5,
          "#ffee00",
          6,
          "#ff3333",
          8,
          "#ff66ff",
          9,
          "#880066",
          10,
          "#666666",
          26,
          "#666666"
        ],
        breakpoints: [
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26
        ]
      },
      "mm [10:1]": {
        colormap: [
          2.5,
          "#aaaaaa",
          5,
          "#444444",
          15,
          "#66aaff",
          20,
          "#0022cc",
          25,
          "#99ff00",
          40,
          "#00aa00",
          50,
          "#ffee00",
          60,
          "#ff3333",
          80,
          "#ff66ff",
          90,
          "#880066",
          100,
          "#666666",
          260,
          "#666666"
        ],
        breakpoints: [
          2.5,
          5,
          7.5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          110,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260
        ]
      }
    }
  },
  cfrzr_total: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [QPF]": {
        colormap: [
          0.01,
          "#eeccff",
          0.1,
          "#ff9999",
          0.25,
          "#cc3366",
          0.5,
          "#ff9933",
          0.75,
          "#ffee00",
          1,
          "#00cccc",
          3,
          "#99ffff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#eeccff",
          0.25,
          "#ff9999",
          0.75,
          "#cc3366",
          1,
          "#cc0066",
          2,
          "#ffee00",
          3,
          "#00cccc",
          7,
          "#99ffff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5,
          3.75,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#eeccff",
          2.5,
          "#ff9999",
          7.5,
          "#cc3366",
          10,
          "#cc0066",
          20,
          "#ffee00",
          30,
          "#00cccc",
          70,
          "#99ffff"
        ],
        breakpoints: [
          0.3,
          2.5,
          5,
          7.5,
          10,
          12.5,
          15,
          17.5,
          20,
          22.5,
          25,
          27.5,
          30,
          32.5,
          35,
          37.5,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260
        ]
      }
    }
  },
  cfrzr_1: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [QPF]": {
        colormap: [
          0.01,
          "#eeccff",
          0.1,
          "#ff9999",
          0.3,
          "#cc3366",
          0.4,
          "#cc0033",
          0.5,
          "#ff9933",
          0.9,
          "#ffee00",
          1,
          "#00cccc",
          3,
          "#99ffff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#eeccff",
          0.25,
          "#ff9999",
          0.75,
          "#cc3366",
          1,
          "#cc0033",
          2,
          "#ffee00",
          3,
          "#00cccc",
          7,
          "#99ffff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5,
          3.75,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#eeccff",
          2.5,
          "#ff9999",
          7.5,
          "#cc3366",
          10,
          "#cc0033",
          20,
          "#ffee00",
          30,
          "#00cccc",
          70,
          "#99ffff"
        ],
        breakpoints: [
          0.3,
          2.5,
          5,
          7.5,
          10,
          12.5,
          15,
          17.5,
          20,
          22.5,
          25,
          27.5,
          30,
          32.5,
          35,
          37.5,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ]
      }
    }
  },
  cicep_total: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [3:1]": {
        colormap: [
          0.01,
          "#eeccff",
          0.1,
          "#ff8888",
          0.25,
          "#cc6699",
          0.5,
          "#ff9933",
          0.75,
          "#ffee99",
          1,
          "#00cccc",
          3,
          "#66ccff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10
        ]
      },
      "cm [3:1]": {
        colormap: [
          0.03,
          "#eeccff",
          0.25,
          "#ff8888",
          0.75,
          "#cc6699",
          1,
          "#cc33cc",
          2,
          "#ffee99",
          3,
          "#00cccc",
          7,
          "#66ccff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5,
          3.75,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26
        ]
      },
      "mm [3:1]": {
        colormap: [
          0.3,
          "#eeccff",
          2.5,
          "#ff8888",
          7.5,
          "#cc6699",
          10,
          "#cc33cc",
          20,
          "#ffee99",
          30,
          "#00cccc",
          70,
          "#66ccff"
        ],
        breakpoints: [
          0.3,
          2.5,
          5,
          7.5,
          10,
          12.5,
          15,
          17.5,
          20,
          22.5,
          25,
          27.5,
          30,
          32.5,
          35,
          37.5,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          240,
          260
        ]
      }
    }
  },
  cicep_1: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "in [3:1]": {
        colormap: [
          0.01,
          "#eeccff",
          0.1,
          "#ff8888",
          0.3,
          "#cc6699",
          0.4,
          "#cc33cc",
          0.5,
          "#ff9933",
          0.9,
          "#ffee99",
          1,
          "#00cccc",
          3,
          "#66ccff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.2,
          0.3,
          0.4,
          0.5,
          0.6,
          0.7,
          0.8,
          0.9,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.5,
          3
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#eeccff",
          0.25,
          "#ff8888",
          0.75,
          "#cc6699",
          1,
          "#cc33cc",
          2,
          "#ffee99",
          3,
          "#00cccc",
          7,
          "#66ccff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.5,
          0.75,
          1,
          1.25,
          1.5,
          1.75,
          2,
          2.25,
          2.5,
          2.75,
          3,
          3.25,
          3.5,
          3.75,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#eeccff",
          2.5,
          "#ff8888",
          7.5,
          "#cc6699",
          10,
          "#cc33cc",
          20,
          "#ffee99",
          30,
          "#00cccc",
          70,
          "#66ccff"
        ],
        breakpoints: [
          0.3,
          2.5,
          5,
          7.5,
          10,
          12.5,
          15,
          17.5,
          20,
          22.5,
          25,
          27.5,
          30,
          32.5,
          35,
          37.5,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160
        ]
      }
    }
  },
  crain_total: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      in: {
        colormap: [
          0.01,
          "#dddddd",
          0.1,
          "#66ff66",
          0.4,
          "#00cc00",
          0.5,
          "#3399ff",
          0.9,
          "#66ccff",
          1,
          "#ffff00",
          1.75,
          "#ffcc00",
          2,
          "#ff9900",
          3.5,
          "#ff6600",
          4,
          "#994400",
          10,
          "#cc9966",
          12,
          "#cc33cc",
          50,
          "#ff33ff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          14,
          16,
          18,
          20,
          24,
          28,
          32,
          36,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#dddddd",
          0.25,
          "#66ff66",
          1,
          "#00cc00",
          2,
          "#66ccff",
          3,
          "#ffff00",
          5,
          "#ff9900",
          9,
          "#ff6600",
          10,
          "#994400",
          25,
          "#cc9966",
          30,
          "#cc33cc",
          100,
          "#ff33ff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.75,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          25,
          30,
          35,
          40,
          45,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          130,
          150,
          170,
          200,
          230,
          250
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#dddddd",
          2.5,
          "#66ff66",
          10,
          "#00cc00",
          20,
          "#66ccff",
          30,
          "#ffff00",
          50,
          "#ff9900",
          90,
          "#ff6600",
          100,
          "#994400",
          250,
          "#cc9966",
          300,
          "#cc33cc",
          1e3,
          "#ff33ff"
        ],
        breakpoints: [
          0.3,
          2.5,
          7.5,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          250,
          300,
          350,
          400,
          450,
          500,
          600,
          700,
          800,
          900,
          1e3,
          1100,
          1300,
          1500,
          1700,
          2e3,
          2300,
          2500
        ]
      }
    }
  },
  crain_1: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      in: {
        colormap: [
          0.01,
          "#dddddd",
          0.1,
          "#66ff66",
          0.4,
          "#00cc00",
          0.5,
          "#3399ff",
          0.9,
          "#66ccff",
          1,
          "#ffff00",
          1.75,
          "#ffcc00",
          2,
          "#ff9900",
          3.75,
          "#ff6600",
          4,
          "#994400",
          10,
          "#cc9966",
          12,
          "#cc33cc"
        ],
        breakpoints: [
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          12
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#dddddd",
          0.25,
          "#66ff66",
          1,
          "#00cc00",
          2,
          "#66ccff",
          3,
          "#ffff00",
          4,
          "#ffcc00",
          5,
          "#ff9900",
          9,
          "#ff6600",
          10,
          "#994400",
          25,
          "#cc9966",
          30,
          "#cc33cc"
        ],
        breakpoints: [
          0.25,
          0.25,
          0.75,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          25,
          30
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#dddddd",
          2.5,
          "#66ff66",
          10,
          "#00cc00",
          20,
          "#66ccff",
          30,
          "#ffff00",
          40,
          "#ffcc00",
          50,
          "#ff9900",
          90,
          "#ff6600",
          100,
          "#994400",
          250,
          "#cc9966",
          300,
          "#cc33cc"
        ],
        breakpoints: [
          2.5,
          2.5,
          7.5,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          250,
          300
        ]
      }
    }
  },
  tp_0_total: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      in: {
        colormap: [
          0.01,
          "#dddddd",
          0.1,
          "#66ff66",
          0.4,
          "#00cc00",
          0.5,
          "#3399ff",
          0.9,
          "#66ccff",
          1,
          "#ffff00",
          1.75,
          "#ffcc00",
          2,
          "#ff9900",
          3.5,
          "#ff6600",
          4,
          "#994400",
          10,
          "#cc9966",
          12,
          "#cc33cc",
          50,
          "#ff33ff"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          14,
          16,
          18,
          20,
          24,
          28,
          32,
          36,
          40,
          45,
          50,
          55,
          60,
          70,
          80,
          90,
          100
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#dddddd",
          0.25,
          "#66ff66",
          1,
          "#00cc00",
          2,
          "#66ccff",
          3,
          "#ffff00",
          5,
          "#ff9900",
          9,
          "#ff6600",
          10,
          "#994400",
          25,
          "#cc9966",
          30,
          "#cc33cc",
          100,
          "#ff33ff"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.75,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          25,
          30,
          35,
          40,
          45,
          50,
          60,
          70,
          80,
          90,
          100,
          110,
          130,
          150,
          170,
          200,
          230,
          250
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#dddddd",
          2.5,
          "#66ff66",
          10,
          "#00cc00",
          20,
          "#66ccff",
          30,
          "#ffff00",
          50,
          "#ff9900",
          90,
          "#ff6600",
          100,
          "#994400",
          250,
          "#cc9966",
          300,
          "#cc33cc",
          1e3,
          "#ff33ff"
        ],
        breakpoints: [
          0.3,
          2.5,
          7.5,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          250,
          300,
          350,
          400,
          450,
          500,
          600,
          700,
          800,
          900,
          1e3,
          1100,
          1300,
          1500,
          1700,
          2e3,
          2300,
          2500
        ]
      }
    }
  },
  tp_0_1: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      in: {
        colormap: [
          0.01,
          "#dddddd",
          0.1,
          "#66ff66",
          0.4,
          "#00cc00",
          0.5,
          "#3399ff",
          0.9,
          "#66ccff",
          1,
          "#ffff00",
          1.75,
          "#ffcc00",
          2,
          "#ff9900",
          3.5,
          "#ff6600",
          4,
          "#994400",
          10,
          "#cc9966"
        ],
        breakpoints: [
          0.01,
          0.1,
          0.25,
          0.5,
          0.75,
          1,
          1.5,
          2,
          2.5,
          3,
          3.5,
          4,
          4.5,
          5,
          5.5,
          6,
          7,
          8,
          9,
          10
        ]
      },
      cm: {
        colormap: [
          0.03,
          "#dddddd",
          0.25,
          "#66ff66",
          1,
          "#00cc00",
          2,
          "#66ccff",
          3,
          "#ffff00",
          5,
          "#ff9900",
          9,
          "#ff6600",
          10,
          "#994400",
          25,
          "#cc9966"
        ],
        breakpoints: [
          0.03,
          0.25,
          0.75,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          25
        ]
      },
      mm: {
        colormap: [
          0.3,
          "#dddddd",
          2.5,
          "#66ff66",
          10,
          "#00cc00",
          20,
          "#66ccff",
          30,
          "#ffff00",
          50,
          "#ff9900",
          90,
          "#ff6600",
          100,
          "#994400",
          250,
          "#cc9966"
        ],
        breakpoints: [
          0.3,
          2.5,
          7.5,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100,
          120,
          140,
          160,
          180,
          200,
          220,
          250
        ]
      }
    }
  },
  thickness: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          438,
          "#0000ff",
          540,
          "#0000ff",
          546,
          "#ff0000",
          630,
          "#ff0000"
        ],
        breakpoints: [
          438,
          444,
          450,
          456,
          462,
          468,
          474,
          480,
          486,
          492,
          498,
          504,
          510,
          516,
          522,
          528,
          534,
          540,
          546,
          552,
          558,
          564,
          570,
          576,
          582,
          588,
          594,
          600,
          606,
          612,
          618,
          624,
          630
        ]
      }
    }
  },
  gh_10: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          2600,
          "#0033ff",
          2800,
          "#00ddff",
          3e3,
          "#ff6666",
          3200,
          "#ff0000"
        ],
        breakpoints: [
          2600,
          2610,
          2620,
          2630,
          2640,
          2650,
          2660,
          2670,
          2680,
          2690,
          2700,
          2710,
          2720,
          2730,
          2740,
          2750,
          2760,
          2770,
          2780,
          2790,
          2800,
          2810,
          2820,
          2830,
          2840,
          2850,
          2860,
          2870,
          2880,
          2890,
          2900,
          2910,
          2920,
          2930,
          2940,
          2950,
          2960,
          2970,
          2980,
          2990,
          3e3,
          3010,
          3020,
          3030,
          3040,
          3050,
          3060,
          3070,
          3080,
          3090,
          3100,
          3110,
          3120,
          3130,
          3140,
          3150,
          3160,
          3170,
          3180,
          3190,
          3200
        ]
      }
    }
  },
  gh_200: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          1080,
          "#0033ff",
          1146,
          "#00ddff",
          1182,
          "#ff6666",
          1290,
          "#ff0000"
        ],
        breakpoints: [
          1080,
          1086,
          1092,
          1098,
          1104,
          1110,
          1116,
          1122,
          1128,
          1134,
          1140,
          1146,
          1152,
          1158,
          1164,
          1170,
          1176,
          1182,
          1188,
          1194,
          1200,
          1206,
          1212,
          1218,
          1224,
          1230,
          1236,
          1242,
          1248,
          1254,
          1260,
          1266,
          1272,
          1278,
          1284,
          1290
        ]
      }
    }
  },
  gh_300: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          768,
          "#0033ff",
          852,
          "#00ddff",
          948,
          "#ff6666",
          1e3,
          "#ff0000"
        ],
        breakpoints: [
          768,
          774,
          780,
          786,
          792,
          798,
          804,
          810,
          816,
          822,
          828,
          834,
          840,
          846,
          852,
          858,
          864,
          870,
          876,
          882,
          888,
          894,
          900,
          906,
          912,
          918,
          924,
          930,
          936,
          942,
          948,
          954,
          960,
          966,
          972,
          978,
          984,
          990,
          996,
          1e3
        ]
      }
    }
  },
  gh_500: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          438,
          "#0033ff",
          501,
          "#00ddff",
          600,
          "#ff6666",
          640,
          "#ff0000"
        ],
        breakpoints: [
          438,
          441,
          444,
          447,
          450,
          453,
          456,
          459,
          462,
          465,
          468,
          471,
          474,
          477,
          480,
          483,
          486,
          489,
          492,
          495,
          498,
          501,
          504,
          507,
          510,
          513,
          516,
          519,
          522,
          525,
          528,
          531,
          534,
          537,
          540,
          543,
          546,
          549,
          552,
          555,
          558,
          561,
          564,
          567,
          570,
          573,
          576,
          579,
          582,
          585,
          588,
          591,
          594,
          597,
          600,
          603,
          606,
          609,
          612,
          615,
          618,
          621,
          624,
          627,
          630,
          633,
          636,
          639,
          640
        ]
      }
    }
  },
  gh_700: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          249,
          "#0033ff",
          282,
          "#00ddff",
          321,
          "#ff6666",
          350,
          "#ff0000"
        ],
        breakpoints: [
          249,
          252,
          255,
          258,
          261,
          264,
          267,
          270,
          273,
          276,
          279,
          282,
          285,
          288,
          291,
          294,
          297,
          300,
          303,
          306,
          309,
          312,
          315,
          318,
          321,
          324,
          327,
          330,
          333,
          336,
          339,
          342,
          345,
          348,
          350
        ]
      }
    }
  },
  gh_850: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          120,
          "#0033ff",
          141,
          "#00ddff",
          153,
          "#ff6666",
          170,
          "#ff0000"
        ],
        breakpoints: [
          120,
          123,
          126,
          129,
          132,
          135,
          138,
          141,
          144,
          147,
          150,
          153,
          156,
          159,
          162,
          165,
          168,
          170
        ]
      }
    }
  },
  gh_925: {
    type: "line",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      dam: {
        colormap: [
          48,
          "#0033ff",
          75,
          "#00ddff",
          105,
          "#ff6666",
          120,
          "#ff0000"
        ],
        breakpoints: [
          48,
          51,
          54,
          57,
          60,
          63,
          66,
          69,
          72,
          75,
          78,
          81,
          84,
          87,
          90,
          91,
          96,
          99,
          102,
          105,
          108,
          111,
          114,
          117,
          120
        ]
      }
    }
  },
  moistureConvergence: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "s⁻¹": {
        colormap: [
          5,
          "#00ffcc",
          15,
          "#00ff33",
          30,
          "#00cc00",
          50,
          "#006600"
        ],
        breakpoints: [
          5,
          10,
          15,
          20,
          25,
          30,
          35,
          40,
          45,
          50
        ]
      }
    }
  },
  divergence: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "s⁻¹": {
        colormap: [
          -30,
          "#00ccff",
          -8,
          "#ff0000",
          -4,
          "#ff9900",
          -2,
          "#ffee33",
          0,
          "#00ffcc",
          4,
          "#006600",
          8,
          "#00cc00",
          30,
          "#222222"
        ],
        breakpoints: [
          -30,
          -29,
          -28,
          -27,
          -26,
          -25,
          -24,
          -23,
          -22,
          -21,
          -20,
          -19,
          -18,
          -17,
          -16,
          -15,
          -14,
          -13,
          -12,
          -11,
          -10,
          -9,
          -8,
          -7,
          -6,
          -5,
          -4,
          -3,
          -2,
          -1,
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          16,
          17,
          18,
          19,
          20,
          21,
          22,
          23,
          24,
          25,
          26,
          27,
          28,
          29,
          30
        ]
      }
    }
  },
  irsat: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "°C": {
        colormap: [
          -100,
          "#cc66ff",
          -80,
          "#f0f0f0",
          -70,
          "#000000",
          -60,
          "#ff0000",
          -50,
          "#ffee00",
          -40,
          "#33ff00",
          -30,
          "#0033cc",
          -20,
          "#00ffff",
          -18,
          "#ffffff",
          60,
          "#000000"
        ],
        breakpoints: [
          -100,
          -98,
          -96,
          -94,
          -92,
          -90,
          -88,
          -86,
          -84,
          -82,
          -80,
          -78,
          -76,
          -74,
          -72,
          -70,
          -68,
          -66,
          -64,
          -62,
          -60,
          -58,
          -56,
          -54,
          -52,
          -50,
          -48,
          -46,
          -44,
          -42,
          -40,
          -38,
          -36,
          -34,
          -32,
          -30,
          -28,
          -26,
          -24,
          -22,
          -20,
          -18,
          -16,
          -14,
          -12,
          -10,
          -8,
          -6,
          -4,
          -2,
          0,
          2,
          4,
          6,
          8,
          10,
          12,
          14,
          16,
          18,
          20,
          22,
          24,
          26,
          28,
          30,
          32,
          34,
          36,
          38,
          40,
          42,
          44,
          46,
          48,
          50,
          52,
          54,
          56,
          58,
          60
        ]
      }
    }
  },
  vis_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      mi: {
        colormap: [
          0,
          "#000000",
          2,
          "#444444",
          5,
          "#888888",
          7,
          "#cccccc",
          10,
          "#ffffff"
        ],
        breakpoints: [
          0,
          2,
          5,
          7,
          10
        ]
      },
      km: {
        colormap: [
          0,
          "#ffffff",
          2,
          "#cccccc",
          5,
          "#888888",
          7,
          "#444444",
          10,
          "#000000"
        ],
        breakpoints: [
          0,
          2,
          5,
          7,
          10
        ]
      }
    }
  },
  tcc_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#ffffff",
          20,
          "#cccccc",
          50,
          "#888888",
          80,
          "#444444",
          100,
          "#000000"
        ],
        breakpoints: [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      }
    }
  },
  hcc_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#ffffff",
          20,
          "#cccccc",
          50,
          "#888888",
          80,
          "#444444",
          100,
          "#000000"
        ],
        breakpoints: [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      }
    }
  },
  mcc_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#ffffff",
          20,
          "#cccccc",
          50,
          "#888888",
          80,
          "#444444",
          100,
          "#000000"
        ],
        breakpoints: [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      }
    }
  },
  lcc_0: {
    type: "fill",
    gridded: !1,
    interpolationType: "interpolate",
    units: {
      "%": {
        colormap: [
          0,
          "#ffffff",
          20,
          "#cccccc",
          50,
          "#888888",
          80,
          "#444444",
          100,
          "#000000"
        ],
        breakpoints: [
          0,
          10,
          20,
          30,
          40,
          50,
          60,
          70,
          80,
          90,
          100
        ]
      }
    }
  }
}, D = `
:root {
    --aguacero-bg-color: #ffffff;
    --aguacero-text-color: #333333;
    --aguacero-border-color: #cccccc;
    --aguacero-shadow-color: rgba(0, 0, 0, 0.1);
    --aguacero-accent-color: #007bff;
    --aguacero-hover-bg-color: #f8f9fa;
    --aguacero-active-bg-color: #e9ecef;
    --aguacero-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Base style for all Aguacero panels */
.aguacero-panel {
    background-color: var(--aguacero-bg-color);
    color: var(--aguacero-text-color);
    font-family: var(--aguacero-font-family);
    font-size: 14px;
    border-radius: 4px;
    box-shadow: 0 1px 3px var(--aguacero-shadow-color);
    margin: 10px;
    padding: 12px;
    border: 1px solid var(--aguacero-border-color);
    line-height: 1.5;
}

.aguacero-panel-label {
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
    color: #555;
}

/* Layer Control Panel Specifics */
.aguacero-layer-control .aguacero-panel-header {
    font-size: 16px;
    font-weight: bold;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--aguacero-border-color);
}

.aguacero-layer-category, .aguacero-layer-subcategory {
    margin-bottom: 5px;
}

.aguacero-layer-header, .aguacero-layer-subheader {
    font-weight: bold;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.aguacero-layer-header:hover, .aguacero-layer-subheader:hover {
    background-color: var(--aguacero-hover-bg-color);
}

.aguacero-layer-header::before, .aguacero-layer-subheader::before {
    content: '▸ ';
    display: inline-block;
    transition: transform 0.2s;
}

.aguacero-layer-category.open > .aguacero-layer-header::before,
.aguacero-layer-subcategory.open > .aguacero-layer-subheader::before {
    transform: rotate(90deg);
}

.aguacero-layer-content, .aguacero-layer-items {
    display: none; /* Hidden by default */
    padding-left: 15px;
}

.aguacero-layer-category.open > .aguacero-layer-content,
.aguacero-layer-subcategory.open > .aguacero-layer-items {
    display: block; /* Shown when open */
}

.aguacero-layer-item {
    padding: 5px 8px;
    cursor: pointer;
    border-radius: 3px;
    margin: 2px 0;
}

.aguacero-layer-item:hover {
    background-color: var(--aguacero-hover-bg-color);
}

.aguacero-layer-item.active {
    background-color: var(--aguacero-accent-color);
    color: white;
    font-weight: bold;
}

// In the aguaceroCSS string, REPLACE the old legend styles with these:

/* Legend Panel Specifics (Horizontal Layout) */
.aguacero-legend-panel {
    position: absolute;
    background-color: var(--aguacero-bg-color);
    color: var(--aguacero-text-color);
    font-family: var(--aguacero-font-family);
    padding: 10px 15px;
    border-radius: var(--aguacero-border-radius);
    box-shadow: 0 1px 3px var(--aguacero-shadow-color);
    border: 1px solid var(--aguacero-border-color);
    font-size: 12px;
    /* Allow the panel to be wider */
    width: 250px; 
    max-width: 90%;
}

.aguacero-legend-bottom-right { bottom: 20px; right: 10px; }
.aguacero-legend-bottom-left { bottom: 20px; left: 10px; }
.aguacero-legend-top-right { top: 20px; right: 10px; }
.aguacero-legend-top-left { top: 20px; left: 10px; }

.aguacero-legend-title {
    margin: 0 0 10px 0;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
}

.aguacero-legend-body {
    display: flex;
    flex-direction: column;
}

/* The continuous gradient bar */
.aguacero-legend-gradient {
    height: 15px;
    width: 100%;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.1);
}

/* Container for the labels below the bar */
.aguacero-legend-labels {
    display: flex;
    justify-content: space-between; /* Evenly space the min and max labels */
    margin-top: 5px;
    font-size: 11px;
}

/* Slider Panel Specifics */
.aguacero-slider-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.aguacero-slider-input {
    flex-grow: 1; /* Make the slider track take up remaining space */
}

.aguacero-slider-controls {
    display: flex;
    gap: 5px;
}

.aguacero-slider-controls .aguacero-button {
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;
}
`;
function N() {
  if (document.getElementById("aguacero-styles"))
    return;
  const a = document.createElement("style");
  a.id = "aguacero-styles", a.innerHTML = D, document.head.appendChild(a);
}
function T(a, e) {
  const t = a?.[e];
  if (!t) return null;
  const i = Object.keys(t).sort((n, r) => r.localeCompare(n));
  for (const n of i) {
    const r = t[n];
    if (!r) continue;
    const o = Object.keys(r).sort((s, c) => c.localeCompare(s));
    if (o.length > 0) return { date: n, run: o[0] };
  }
  return null;
}
class G extends E {
  constructor(e, t = {}) {
    if (super(), !e) throw new Error("A Mapbox GL map instance is required.");
    N(), this.map = e, this.layers = /* @__PURE__ */ new Map(), this.layerId = t.id || `weather-layer-${Math.random().toString(36).substr(2, 9)}`, this.baseUrl = "https://d3dc62msmxkrd7.cloudfront.net/grids", this.worker = this.createWorker(), this.workerRequestId = 0, this.workerResolvers = /* @__PURE__ */ new Map(), this.worker.addEventListener("message", this._handleWorkerMessage.bind(this)), this.statusUrl = "https://d3dc62msmxkrd7.cloudfront.net/model-status", this.modelStatus = null, this.loadStrategy = t.loadStrategy || "on-demand", this.dataCache = /* @__PURE__ */ new Map(), this.customColormaps = t.customColormaps || {};
    const i = t.layerOptions || {}, n = i.variable || "2t_2", { colormap: r, baseUnit: o } = this._getColormapForVariable(n);
    this.baseLayerOptions = {
      ...i,
      variable: n,
      colormap: r,
      colormapBaseUnit: o
    }, this.state = {
      model: i.model || "gfs",
      variable: n,
      date: null,
      run: null,
      forecastHour: 0,
      visible: !0,
      opacity: i.opacity ?? 1,
      units: t.initialUnit || "imperial"
    }, this.autoRefreshEnabled = t.autoRefresh ?? !1, this.autoRefreshIntervalSeconds = t.autoRefreshInterval ?? 60, this.autoRefreshIntervalId = null;
  }
  // --- START OF FIX ---
  /**
   * NEW METHOD: A central router for all messages coming from the web worker.
   * It uses the requestId to resolve the correct promise.
   * @private
   */
  _handleWorkerMessage(e) {
    const { success: t, requestId: i, decompressedData: n, encoding: r, error: o } = e.data;
    if (this.workerResolvers.has(i)) {
      const { resolve: s, reject: c } = this.workerResolvers.get(i);
      t ? s({ data: n, encoding: r }) : c(new Error(o)), this.workerResolvers.delete(i);
    }
  }
  _getColormapForVariable(e) {
    const t = this.customColormaps[e];
    if (t) {
      if (t.units) {
        const r = this.state.units;
        let o;
        if (r === "imperial" && (o = "fahrenheit"), r === "metric" && (o = "celsius"), o && t.units[o]?.colormap)
          return {
            colormap: t.units[o].colormap,
            baseUnit: o
            // The base unit IS the target unit, so no conversion will be needed
          };
      }
      if (t.colormap && t.baseUnit)
        return {
          colormap: t.colormap,
          baseUnit: t.baseUnit
        };
    }
    const i = R.variable_cmap?.[e] || e, n = U[i];
    if (n) {
      const r = Object.keys(n.units)[0];
      return {
        colormap: n.units[r].colormap,
        baseUnit: r
      };
    }
    return console.warn(`[Manager] No custom or default colormap found for variable "${e}". Using fallback.`), {
      colormap: [0, "#000000", 1, "#ffffff"],
      baseUnit: "unknown"
    };
  }
  _convertColormapUnits(e, t, i) {
    if (t === i) return e;
    const n = z(t, i);
    if (!n) return e;
    const r = [];
    for (let o = 0; o < e.length; o += 2)
      r.push(n(e[o]), e[o + 1]);
    return r;
  }
  _updateOrCreateLayer(e, t, i, n) {
    const { model: r, colormap: o, opacity: s = 1, visible: c = !0, units: _, variable: m } = t, p = A[r];
    if (!p) {
      console.error(`No grid configuration found for model: ${r}`);
      return;
    }
    const l = t.colormapBaseUnit, f = R.fld[m] || {}, u = this._getTargetUnit(l, _), h = this._convertColormapUnits(o, l, u), y = [h[0], h[h.length - 2]], v = f.defaultUnit || "none", k = this.layers.has(e), w = k ? this.layers.get(e).shaderLayer : new I(e);
    k || (this.map.addLayer(w, "AML_-_terrain"), this.layers.set(e, { id: e, shaderLayer: w, options: t, visible: c })), w.updateDataTexture(i, n, p.grid_params.nx, p.grid_params.ny), w.updateColormapTexture(h), w.updateStyle({ opacity: c ? s : 0, dataRange: y }), w.setUnitConversion(v, _), this.map.triggerRepaint();
  }
  /**
   * Helper to determine the target unit string for a given system.
   * @private
   */
  _getTargetUnit(e, t) {
    if (t === "metric") {
      if (["°F", "°C"].includes(e)) return "celsius";
      if (["kts", "mph", "m/s"].includes(e)) return "km/h";
      if (["in", "mm", "cm"].includes(e)) return "mm";
    }
    return ["°F", "°C"].includes(e) ? "fahrenheit" : ["kts", "mph", "m/s"].includes(e) ? "mph" : ["in", "mm", "cm"].includes(e) ? "in" : e;
  }
  // ========================================================================
  // --- THIS ENTIRE FUNCTION WAS MISSING IN THE PREVIOUS RESPONSE ---
  // ========================================================================
  /**
   * Sets the active weather variable for the layer.
   * @param {string} newVariable - The name of the variable to display (e.g., 'refc_0').
   */
  async setVariable(e) {
    if (e === this.state.variable) return;
    const { colormap: t, baseUnit: i } = this._getColormapForVariable(e);
    this.baseLayerOptions.variable = e, this.baseLayerOptions.colormap = t, this.baseLayerOptions.colormapBaseUnit = i, await this.setState({ variable: e });
  }
  async setState(e) {
    const t = e.model && e.model !== this.state.model, i = e.date && e.run && (e.date !== this.state.date || e.run !== this.state.run), n = e.variable && e.variable !== this.state.variable;
    (t || i || n) && this.dataCache.clear(), Object.assign(this.state, e);
    const r = await this._loadGridData(this.state);
    if (r && r.data) {
      const o = { ...this.baseLayerOptions, ...this.state };
      this._updateOrCreateLayer(this.layerId, o, r.data, r.encoding);
    } else
      this.removeLayer(this.layerId);
    this.emit("state:change", this.state), (t || i || n) && this.loadStrategy === "preload" && setTimeout(() => this._preloadCurrentRun(), 0);
  }
  async setModel(e) {
    if (e === this.state.model) return;
    if (!this.modelStatus || !this.modelStatus[e]) {
      console.error(`[Manager] Model "${e}" is not available.`);
      return;
    }
    const t = T(this.modelStatus, e);
    t ? await this.setState({
      model: e,
      date: t.date,
      run: t.run,
      forecastHour: 0
    }) : console.error(`[Manager] No runs found for model "${e}".`);
  }
  createWorker() {
    const e = `
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
        `, t = new Blob([e], { type: "application/javascript" });
    return new Worker(URL.createObjectURL(t), { type: "module" });
  }
  /**
   * Preloads all forecast hour data for the currently selected model run.
   * This is used by the 'preload' load strategy.
   * @private
   */
  // Replace the existing _preloadCurrentRun method with this one.
  async _preloadCurrentRun() {
    const { model: e, date: t, run: i } = this.state, n = this.modelStatus?.[e]?.[t]?.[i];
    if (!n || n.length === 0)
      return;
    const r = n.map((o) => {
      const s = { ...this.state, forecastHour: o };
      return this._loadGridData(s);
    });
    await Promise.all(r);
  }
  /**
   * Fetches the model status JSON file from the server.
   * @param {boolean} [force=false] - If true, fetches new data even if it's already loaded.
   * @returns {Promise<object|null>} The model status data, or null on failure.
   */
  async fetchModelStatus(e = !1) {
    if (!this.modelStatus || e)
      try {
        const t = await fetch(this.statusUrl);
        if (!t.ok)
          throw new Error(`HTTP error! Status: ${t.status}`);
        const i = await t.json();
        this.modelStatus = i.models;
      } catch {
        this.modelStatus = null;
      }
    return this.modelStatus;
  }
  /**
   * Starts a timer to automatically poll for the latest model status.
   * @param {number} [intervalSeconds] - The refresh interval in seconds.
   */
  startAutoRefresh(e) {
    const t = e ?? this.autoRefreshIntervalSeconds ?? 60;
    this.stopAutoRefresh(), this.autoRefreshIntervalId = setInterval(async () => {
      await this.fetchModelStatus(!0), this.emit("state:change", this.state);
    }, t * 1e3);
  }
  /**
   * Stops the automatic polling for model status updates.
   */
  stopAutoRefresh() {
    this.autoRefreshIntervalId && (clearInterval(this.autoRefreshIntervalId), this.autoRefreshIntervalId = null);
  }
  async _loadGridData(e) {
    const { model: t, date: i, run: n, forecastHour: r, variable: o, smoothing: s } = { ...this.baseLayerOptions, ...e }, c = `${t}-${i}-${n}-${r}-${o}-${s || ""}`;
    if (this.dataCache.has(c))
      return this.dataCache.get(c);
    const _ = new Promise(async (m, p) => {
      const l = `${this.baseUrl}/${t}/${i}/${n}/${r}/${o}/${s}`;
      try {
        const f = await fetch(l);
        if (!f.ok) throw new Error(`HTTP ${f.status} for ${l}`);
        const { data: u, encoding: h } = await f.json(), y = Uint8Array.from(atob(u), (k) => k.charCodeAt(0)), v = this.workerRequestId++;
        this.workerResolvers.set(v, { resolve: m, reject: p }), this.worker.postMessage({ requestId: v, compressedData: y, encoding: h }, [y.buffer]);
      } catch (f) {
        p(f);
      }
    }).then((m) => (this.dataCache.set(c, m), m)).catch((m) => (this.dataCache.delete(c), null));
    return this.dataCache.set(c, _), _;
  }
  async setUnits(e) {
    e === this.state.units || !["metric", "imperial"].includes(e) || await this.setState({ units: e });
  }
  async initialize(e = {}) {
    const t = await this.fetchModelStatus(), i = T(t, this.state.model);
    if (i ? await this.setState({ ...i, forecastHour: 0 }) : (console.error(`Could not initialize. No runs found for model "${this.state.model}".`), this.emit("state:change", this.state)), e.autoRefresh ?? this.autoRefreshEnabled) {
      const r = e.refreshInterval ?? this.autoRefreshIntervalSeconds;
      this.startAutoRefresh(r);
    }
  }
  removeLayer(e) {
    this.layers.has(e) && (this.map.getLayer(e) && this.map.removeLayer(e), this.layers.delete(e));
  }
}
const W = {
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
}, V = {
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
}, L = {
  light: W,
  dark: V
}, d = {
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
function b(a) {
  return typeof a == "string" && a.startsWith("#") && a.length === 9 ? a.substring(0, 7) : a;
}
const x = (a, e, t) => {
  if (a.getLayer(e) && (a.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), a.setPaintProperty(e, "line-color", b(t.color)), a.setPaintProperty(e, "line-width", t.width), t.lineType)) {
    const i = { dashed: [2, 2], dotted: [0, 2], solid: [] };
    a.setPaintProperty(e, "line-dasharray", i[t.lineType] || []);
  }
}, g = (a, e, t) => {
  a.getLayer(e) && (a.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), a.setPaintProperty(e, "text-color", b(t.color)), a.setPaintProperty(e, "text-halo-color", b(t.outlineColor)), a.setPaintProperty(e, "text-halo-width", t.outlineWidth), a.setLayoutProperty(e, "text-size", t.fontSize), a.setLayoutProperty(e, "text-font", [t.fontFamily]));
};
function P(a, e, t, i) {
  i && a.getLayer(e) && (i.color && a.setPaintProperty(e, t, b(i.color)), i.visible !== void 0 && a.setLayoutProperty(e, "visibility", i.visible ? "visible" : "none"));
}
function M(a, e) {
  if (!(!a || !a.isStyleLoaded())) {
    if (e.landOcean) {
      const { landColor: t, oceanColor: i, waterDepth: n, nationalPark: r } = e.landOcean;
      a.getLayer(d.landColor.layerId) && a.setPaintProperty(d.landColor.layerId, "background-color", b(t)), a.getLayer(d.oceanColor.layerId) && a.setPaintProperty(d.oceanColor.layerId, "fill-color", b(i)), P(a, d.waterDepth.layerId, "fill-color", n), P(a, d.nationalPark.layerId, "fill-color", r);
    }
    e.transportation && (x(a, d.roads.layerId, e.transportation.roads), x(a, d.airports.layerId, e.transportation.airports)), e.boundaries && (x(a, d.countries.layerId, e.boundaries.countries), x(a, d.states.layerId, e.boundaries.states), x(a, d.counties.layerId, e.boundaries.counties)), e.waterFeatures && x(a, d.waterways.layerId, e.waterFeatures.waterways), e.labels && (g(a, d.continents.layerId, e.labels.continents), g(a, d.countriesLabels.layerId, e.labels.countries), g(a, d.statesLabels.layerId, e.labels.states), g(a, d.citiesMajor.layerId, e.labels.cities.major), g(a, d.citiesMinor.layerId, e.labels.cities.minor), g(a, d.airportsLabels.layerId, e.labels.airports), g(a, d.poi.layerId, e.labels.poi), g(a, d.waterLabels.layerId, e.labels.waterLabels), g(a, d.naturalLabels.layerId, e.labels.naturalLabels), g(a, d.subdivisionLabels.layerId, e.labels.subdivisionLabels)), e.terrain && a.getSource("mapbox-dem") && (e.terrain.visible ? (a.setTerrain({ source: "mapbox-dem", exaggeration: 1 }), a.getLayer("hillshade") && (a.setPaintProperty("hillshade", "hillshade-exaggeration", e.terrain.intensity), a.setPaintProperty("hillshade", "hillshade-shadow-color", b(e.terrain.shadowColor)), a.setPaintProperty("hillshade", "hillshade-highlight-color", b(e.terrain.highlightColor)), a.setPaintProperty("hillshade", "hillshade-accent-color", b(e.terrain.accentColor)))) : a.setTerrain(null));
  }
}
function S(a, e) {
  const t = { ...a };
  return C(a) && C(e) && Object.keys(e).forEach((i) => {
    C(e[i]) ? i in a ? t[i] = S(a[i], e[i]) : Object.assign(t, { [i]: e[i] }) : Object.assign(t, { [i]: e[i] });
  }), t;
}
function C(a) {
  return a && typeof a == "object" && !Array.isArray(a);
}
const B = "mapbox://styles/aguacerowx/cmfvox8mq004u01qm5nlg7qkt";
class O extends E {
  constructor(e, t = {}) {
    if (super(), !e || !t.accessToken)
      throw new Error("A container ID and a Mapbox access token are required.");
    mapboxgl.accessToken = t.accessToken;
    let i = JSON.parse(JSON.stringify(L.light)), n = JSON.parse(JSON.stringify(L.dark));
    t.customStyles && (console.log("[MapManager] Custom styles provided. Merging..."), t.customStyles.light && (i = S(i, t.customStyles.light)), t.customStyles.dark && (n = S(n, t.customStyles.dark)), console.log("[MapManager] Final merged dark theme:", n)), this.themes = {
      light: i,
      dark: n
    };
    const r = t.defaultTheme || "light";
    this.currentCustomizations = this.themes[r], this.currentThemeName = r, this.weatherLayerManagers = /* @__PURE__ */ new Map(), this.map = new mapboxgl.Map({
      container: e,
      style: B,
      center: [-98, 39],
      zoom: 3.5,
      ...t.mapOptions
    }), this.map.on("load", () => {
      console.log("[MapManager] Map loaded. Applying initial theme:", r), M(this.map, this.currentCustomizations), this.emit("style:applied", {
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
    const t = JSON.parse(JSON.stringify(this.themes[e])), i = this.currentCustomizations.labels;
    if (i)
      for (const n in i) {
        i[n]?.hasOwnProperty("visible") && t.labels[n] && (t.labels[n].visible = i[n].visible);
        for (const r in i[n])
          i[n][r]?.hasOwnProperty("visible") && t.labels[n]?.[r] && (t.labels[n][r].visible = i[n][r].visible);
      }
    this.currentCustomizations = t, this.currentThemeName = e, M(this.map, this.currentCustomizations), this.emit("style:applied", {
      themeName: this.currentThemeName,
      styles: this.currentCustomizations
    });
  }
  setLabelGroupVisibility(e, t) {
    const i = `labels.${e}.visible`;
    let n = this.currentCustomizations;
    const r = i.split(".");
    for (let c = 0; c < r.length - 1; c++)
      if (n = n[r[c]], !n) {
        console.error(`Invalid label group key: ${e}`);
        return;
      }
    n[r[r.length - 1]] = t;
    const o = e.replace(/\.(.)/g, (c, _) => _.toUpperCase()), s = d[o]?.layerId;
    s && this.map.getLayer(s) ? (this.map.setLayoutProperty(s, "visibility", t ? "visible" : "none"), console.log(`[MapManager] Set visibility for ${s} to ${t}`)) : console.warn(`[MapManager] Could not find layer for label group key: ${e} (mapped to ${o})`);
  }
  addWeatherManager(e) {
    this.weatherLayerManagers.set(e.layerId, e);
  }
  getMap() {
    return this.map;
  }
}
class j {
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.selectElement = null, this.labelElement = null, this.options = {
      label: t.label || "Model Run",
      runFormatter: t.runFormatter || this._defaultFormatRunDisplay
    };
  }
  _defaultFormatRunDisplay(e, t) {
    const i = e.substring(0, 4), n = e.substring(4, 6), r = e.substring(6, 8);
    return `${i}-${n}-${r} (${t}Z)`;
  }
  _populate() {
    const e = this.manager.modelStatus, { model: t, date: i, run: n } = this.manager.state;
    if (!e || !this.selectElement) return;
    const r = e[t];
    if (!r) {
      this.selectElement.innerHTML = "<option>Model offline</option>", this.selectElement.disabled = !0;
      return;
    }
    const o = [];
    for (const s in r)
      for (const c in r[s])
        o.push({ date: s, run: c });
    o.sort((s, c) => {
      const _ = c.date.localeCompare(s.date);
      return _ !== 0 ? _ : c.run.localeCompare(s.run);
    }), this.selectElement.innerHTML = "", o.forEach(({ date: s, run: c }) => {
      const _ = document.createElement("option");
      _.value = `${s}:${c}`, _.textContent = this.options.runFormatter(s, c), this.selectElement.appendChild(_);
    }), this.selectElement.value = `${i}:${n}`, this.selectElement.disabled = !1;
  }
  /**
   * NEW: Updates the panel's label with the current model name.
   * @private
   */
  _updateLabel() {
    this.labelElement && (this.labelElement.textContent = `${this.options.label} (${this.manager.state.model.toUpperCase()})`);
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    if (!t)
      throw new Error(`AguaceroAPI Error: The target element "${e}" for RunSelectorPanel could not be found.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-run-selector", this.element.innerHTML = `
            <label class="aguacero-panel-label"></label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `, this.labelElement = this.element.querySelector("label"), this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (i) => {
      const [n, r] = i.target.value.split(":");
      this.manager.setState({ date: n, run: r, forecastHour: 0 });
    }), this.manager.on("state:change", () => {
      this._populate(), this._updateLabel();
    }), t.appendChild(this.element), this._updateLabel(), this;
  }
}
class Q {
  /**
   * Creates an instance of ModelSelectorPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.selectElement = null, this.options = {
      label: t.label || "Weather Model"
    };
  }
  /**
   * Populates the select dropdown with available models from the manager's status.
   * @private
   */
  _populate() {
    const e = this.manager.modelStatus;
    if (!e || !this.selectElement) return;
    const t = Object.keys(e).sort(), i = this.manager.state.model;
    this.selectElement.innerHTML = "", t.forEach((n) => {
      const r = document.createElement("option");
      r.value = n, r.textContent = n.toUpperCase(), this.selectElement.appendChild(r);
    }), this.selectElement.value = i, this.selectElement.disabled = !1;
  }
  /**
   * Renders the panel and appends it to a target DOM element.
   * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
   */
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    if (!t)
      throw new Error(`AguaceroAPI Error: The target element "${e}" for ModelSelectorPanel could not be found.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-model-selector", this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}</label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `, this.selectElement = this.element.querySelector("select"), this.selectElement.addEventListener("change", (i) => {
      this.manager.setModel(i.target.value);
    }), this.manager.on("state:change", () => this._populate()), t.appendChild(this.element), this;
  }
}
class $ {
  /**
   * Creates an instance of ForecastSliderPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {string} [options.label] - Custom text for the panel's label.
   * @param {number} [options.playSpeed=500] - The time in milliseconds between steps when playing.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.sliderElement = null, this.displayElement = null, this.isPlaying = !1, this.playIntervalId = null, this.buttons = {}, this.pendingUpdate = !1, this.latestForecastHour = null, this.options = {
      label: t.label || "Forecast Hour",
      // --- NEW --- API option for playback speed with a default value
      playSpeed: t.playSpeed || 500
    }, this._handleKeyDown = this._handleKeyDown.bind(this);
  }
  /**
   * Updates the slider's range and value based on the manager's current state.
   * @private
   */
  _update() {
    const { model: e, date: t, run: i, forecastHour: n } = this.manager.state, r = this.manager.modelStatus?.[e]?.[t]?.[i];
    if (!r || r.length === 0) {
      this.sliderElement.disabled = !0, Object.values(this.buttons).forEach((s) => s.disabled = !0), this.sliderElement.max = 0, this.displayElement.textContent = "N/A";
      return;
    }
    const o = r.indexOf(n);
    this.sliderElement.max = r.length - 1, this.sliderElement.value = o >= 0 ? o : 0, this.displayElement.textContent = n, this.sliderElement.disabled = !1, Object.values(this.buttons).forEach((s) => s.disabled = !1);
  }
  // --- NEW METHOD --- Advances the slider by one step in a given direction
  _step(e) {
    if (this.sliderElement.disabled) return;
    const t = this.manager.modelStatus[this.manager.state.model][this.manager.state.date][this.manager.state.run];
    if (!t) return;
    let i = parseInt(this.sliderElement.value, 10);
    const n = t.length - 1;
    let r = i + e;
    r > n ? r = 0 : r < 0 && (r = n);
    const o = t[r];
    this.displayElement.textContent = o, this.latestForecastHour = o, this.pendingUpdate || (this.pendingUpdate = !0, requestAnimationFrame(() => this._performUpdate()));
  }
  // --- NEW METHOD --- Starts the playback timer
  _play() {
    this.isPlaying || (this.isPlaying = !0, this.buttons.playPause.innerHTML = "&#9208;", this.buttons.playPause.title = "Pause (Space)", clearInterval(this.playIntervalId), this.playIntervalId = setInterval(() => {
      this._step(1);
    }, this.options.playSpeed));
  }
  // --- NEW METHOD --- Stops the playback timer
  _pause() {
    this.isPlaying && (this.isPlaying = !1, this.buttons.playPause.innerHTML = "&#9654;", this.buttons.playPause.title = "Play (Space)", clearInterval(this.playIntervalId), this.playIntervalId = null);
  }
  // --- NEW METHOD --- Toggles between play and pause
  _togglePlayPause() {
    this.isPlaying ? this._pause() : this._play();
  }
  // --- NEW METHOD --- Handles global keyboard shortcuts
  _handleKeyDown(e) {
    if (!(e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA"))
      switch (e.key) {
        case ",":
          this._step(-1);
          break;
        case ".":
          this._step(1);
          break;
        case " ":
          e.preventDefault(), this._togglePlayPause();
          break;
      }
  }
  /**
   * The function that performs the expensive state update.
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
            <div class="aguacero-slider-wrapper">
                <div class="aguacero-slider-controls">
                    <button class="aguacero-button" data-action="step-back" title="Step Back (,)" disabled>&#9664;</button>
                    <button class="aguacero-button" data-action="play-pause" title="Play (Space)" disabled>&#9654;</button>
                    <button class="aguacero-button" data-action="step-forward" title="Step Forward (.)" disabled>&#9654;&#9654;</button>
                </div>
                <input type="range" class="aguacero-slider-input" min="0" max="0" value="0" step="1" disabled>
            </div>
        `, this.sliderElement = this.element.querySelector(".aguacero-slider-input"), this.displayElement = this.element.querySelector(".aguacero-slider-display"), this.buttons.stepBack = this.element.querySelector('[data-action="step-back"]'), this.buttons.playPause = this.element.querySelector('[data-action="play-pause"]'), this.buttons.stepForward = this.element.querySelector('[data-action="step-forward"]'), this.sliderElement.addEventListener("input", (i) => {
      this._pause();
      const { model: n, date: r, run: o } = this.manager.state, s = this.manager.modelStatus[n][r][o];
      if (!s) return;
      const c = s[parseInt(i.target.value, 10)];
      this.displayElement.textContent = c, this.latestForecastHour = c, this.pendingUpdate || (this.pendingUpdate = !0, requestAnimationFrame(() => this._performUpdate()));
    }), this.buttons.stepBack.addEventListener("click", () => this._step(-1)), this.buttons.stepForward.addEventListener("click", () => this._step(1)), this.buttons.playPause.addEventListener("click", () => this._togglePlayPause()), document.addEventListener("keydown", this._handleKeyDown), this.manager.on("state:change", () => this._update()), t.appendChild(this.element), this;
  }
  // --- NEW (Optional but Recommended) --- Add a remove method for cleanup
  /**
   * Removes the panel and cleans up global event listeners.
   */
  remove() {
    this._pause(), document.removeEventListener("keydown", this._handleKeyDown), this.element && this.element.parentNode && this.element.parentNode.removeChild(this.element);
  }
}
class q {
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
        `, this.buttons = this.element.querySelectorAll("button"), this.buttons.forEach((i) => {
      i.addEventListener("click", (n) => {
        this.manager.setTheme(n.target.dataset.theme);
      });
    }), this.manager.on("style:applied", ({ themeName: i }) => {
      this.buttons.forEach((n) => {
        n.classList.toggle("active", n.dataset.theme === i);
      });
    }), t.appendChild(this.element), this;
  }
}
class X {
  constructor(e, t = {}) {
    this.manager = e, this.labels = t.labels || [], this.element = null;
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-label-control", this.element.innerHTML = '<div class="aguacero-panel-label">Labels</div>', this.labels.forEach((i) => {
      const n = document.createElement("div");
      n.className = "aguacero-toggle-row";
      const r = `label-toggle-${i.key.replace(".", "-")}`;
      n.innerHTML = `
                <label for="${r}">${i.label}</label>
                <input type="checkbox" id="${r}" data-key="${i.key}">
            `, n.querySelector("input").addEventListener("change", (s) => {
        this.manager.setLabelGroupVisibility(s.target.dataset.key, s.target.checked);
      }), this.element.appendChild(n);
    }), this.manager.on("style:applied", ({ styles: i }) => {
      this.element.querySelectorAll('input[type="checkbox"]').forEach((n) => {
        const [r, o] = n.dataset.key.split("."), s = i.labels?.[r]?.[o]?.visible;
        s !== void 0 && (n.checked = s);
      });
    }), this.buttons.forEach((i) => {
      i.addEventListener("click", (n) => {
        const r = n.target.dataset.theme;
        this.manager.setTheme(r);
      });
    }), t.appendChild(this.element), this;
  }
}
class Z {
  /**
   * Creates an instance of UnitControlPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   */
  constructor(e) {
    this.manager = e, this.element = null, this.buttons = null;
  }
  /**
   * A helper method to update the active state of the buttons.
   * @param {string} activeUnit - The unit system that should be marked as active.
   * @private
   */
  _updateButtons(e) {
    this.buttons && this.buttons.forEach((t) => {
      t.classList.toggle("active", t.dataset.unit === e);
    });
  }
  /**
   * Renders the panel and appends it to a target DOM element.
   * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
   * @returns {this} The instance for chaining.
   */
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    if (!t)
      throw new Error(`AguaceroAPI Error: The target element "${e}" for UnitControlPanel could not be found.`);
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-unit-control", this.element.innerHTML = `
            <div class="aguacero-panel-label">Units</div>
            <div class="aguacero-button-group">
                <button data-unit="imperial" class="aguacero-button">Imperial</button>
                <button data-unit="metric" class="aguacero-button">Metric</button>
            </div>
        `, this.buttons = this.element.querySelectorAll("button"), this.buttons.forEach((i) => {
      i.addEventListener("click", (n) => {
        const r = n.target.dataset.unit;
        this.manager.setUnits(r);
      });
    }), this.manager.on("state:change", ({ units: i }) => {
      this._updateButtons(i);
    }), t.appendChild(this.element), this._updateButtons(this.manager.state.units), this;
  }
}
class J {
  constructor(e, t = {}) {
    this.manager = e, this.options = {
      position: t.position || "bottom-right",
      labelFormatter: t.labelFormatter || ((i) => Math.round(i))
    }, this._container = document.createElement("div"), this._container.className = "mapboxgl-ctrl aguacero-legend-panel";
  }
  /**
   * Required by Mapbox's IControl interface.
   * This method is called when the control is added to the map.
   * @param {mapboxgl.Map} map - The Mapbox map instance.
   * @returns {HTMLElement} The control's container element.
   */
  onAdd(e) {
    return this.map = e, this.manager.on("state:change", (t) => this._update(t)), this._update(this.manager.state), this._container;
  }
  /**
   * Required by Mapbox's IControl interface.
   * This method is called when the control is removed from the map.
   */
  onRemove() {
    this._container && this._container.parentNode && this._container.parentNode.removeChild(this._container), this.map = void 0;
  }
  _update(e) {
    if (!this._container) return;
    const { colormap: t, colormapBaseUnit: i } = this.manager.baseLayerOptions;
    if (!t || t.length < 2) {
      this._container.style.display = "none";
      return;
    }
    this._container.style.display = "block";
    const r = (R.fld[e.variable] || {}).variable || "Legend", o = this._getUnitLabel(i, e.units), s = this._generateStopsHtml(t, i, e.units);
    this._container.innerHTML = `
            <h3 class="aguacero-legend-title">${r} (${o})</h3>
            <div class="aguacero-legend-body">${s}</div>
        `;
  }
  // _generateStopsHtml, _getUnitLabel, and _getTargetUnitForLegend methods
  // remain exactly the same as the previous correct versions.
  _generateStopsHtml(e, t, i) {
    const n = [];
    for (let f = 0; f < e.length; f += 2)
      n.push({ value: e[f], color: e[f + 1] });
    if (n.length < 2) return "";
    const r = n[0].value, o = n[n.length - 1].value, s = this._getTargetUnitForLegend(t, i), c = z(t, s), _ = this.options.labelFormatter(c ? c(r) : r), m = this.options.labelFormatter(c ? c(o) : o);
    return `
            <div class="aguacero-legend-gradient" style="background: ${`linear-gradient(to right, ${n.map((f) => `${f.color}`).join(", ")})`};"></div>
            <div class="aguacero-legend-labels">
                <span class="aguacero-legend-label-min">${_}</span>
                <span class="aguacero-legend-label-max">${m}</span>
            </div>
        `;
  }
  _getUnitLabel(e, t) {
    const i = (e || "").toLowerCase();
    if (i === "dbz") return "dBZ";
    if (t === "metric") {
      if (i.includes("f") || i.includes("c")) return "°C";
      if (["kts", "mph", "m/s"].includes(i)) return "km/h";
      if (["in", "mm", "cm"].includes(i)) return "mm";
    }
    return i.includes("f") || i.includes("c") ? "°F" : ["kts", "mph", "m/s"].includes(i) ? "mph" : ["in", "mm", "cm"].includes(i) ? "in" : i;
  }
  _getTargetUnitForLegend(e, t) {
    const i = (e || "").toLowerCase();
    if (t === "metric") {
      if (i.includes("f") || i.includes("c")) return "celsius";
      if (["kts", "mph", "m/s"].includes(i)) return "km/h";
      if (["in", "mm", "cm"].includes(i)) return "mm";
    }
    return i.includes("f") || i.includes("c") ? "fahrenheit" : ["kts", "mph", "m/s"].includes(i) ? "mph" : ["in", "mm", "cm"].includes(i) ? "in" : i;
  }
}
class K {
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.options = {
      title: t.title || "Layers"
    };
  }
  /**
   * Builds a structured object of available variables for the current model.
   * @returns {object} A nested object: { category: { subCategory: [variableInfo, ...] } }
   * @private
   */
  _getAvailableVariables() {
    const e = this.manager.state.model, t = H[e];
    if (!t) return {};
    const i = {};
    return t.vars.forEach((n) => {
      const r = R.fld[n];
      if (!r) return;
      const { category: o, subCategory: s, variable: c } = r;
      i[o] || (i[o] = {}), i[o][s] || (i[o][s] = []), i[o][s].push({ id: n, name: c });
    }), i;
  }
  /**
   * Renders the panel's content based on available variables.
   * @private
   */
  _populate() {
    if (!this.element) return;
    const e = this._getAvailableVariables();
    let t = "";
    for (const i in e) {
      t += `<div class="aguacero-layer-category">
                <div class="aguacero-layer-header">${i}</div>
                <div class="aguacero-layer-content">`;
      for (const n in e[i])
        t += `<div class="aguacero-layer-subcategory">
                    <div class="aguacero-layer-subheader">${n}</div>
                    <div class="aguacero-layer-items">`, e[i][n].forEach((r) => {
          const o = r.id === this.manager.state.variable ? "active" : "";
          t += `<div class="aguacero-layer-item ${o}" data-variable-id="${r.id}">${r.name}</div>`;
        }), t += "</div></div>";
      t += "</div></div>";
    }
    this.element.querySelector(".aguacero-panel-body").innerHTML = t, this._addEventListeners();
  }
  /**
   * Adds click handlers for the accordion and item selection.
   * @private
   */
  _addEventListeners() {
    this.element.querySelectorAll(".aguacero-layer-header, .aguacero-layer-subheader").forEach((e) => {
      e.addEventListener("click", () => {
        e.parentElement.classList.toggle("open");
      });
    }), this.element.querySelectorAll(".aguacero-layer-item").forEach((e) => {
      e.addEventListener("click", (t) => {
        const i = t.target.dataset.variableId;
        this.manager.setVariable(i);
      });
    });
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-layer-control", this.element.innerHTML = `
            <div class="aguacero-panel-header">${this.options.title}</div>
            <div class="aguacero-panel-body"></div>
        `, t.appendChild(this.element), this.manager.on("state:change", () => this._populate()), this._populate(), this;
  }
}
export {
  G as FillLayerManager,
  $ as ForecastSliderPanel,
  X as LabelControlPanel,
  K as LayerControlPanel,
  J as LegendPanel,
  O as MapManager,
  Q as ModelSelectorPanel,
  j as RunSelectorPanel,
  q as ThemeControlPanel,
  Z as UnitControlPanel
};
