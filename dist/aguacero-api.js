class R {
  constructor() {
    this.callbacks = {};
  }
  on(e, t) {
    this.callbacks[e] || (this.callbacks[e] = []), this.callbacks[e].push(t);
  }
  emit(e, t) {
    let o = this.callbacks[e];
    o && o.forEach((i) => i(t));
  }
}
class S {
  constructor(e) {
    this.id = e, this.type = "custom", this.renderingMode = "2d", this.map = null, this.gl = null, this.program = null, this.opacity = 1, this.dataRange = [0, 1], this.vertexBuffer = null, this.indexBuffer = null, this.indexCount = 0, this.dataTexture = null, this.colormapTexture = null, this.encoding = null, this.textureWidth = 0, this.textureHeight = 0, this.u_conversion_type = null, this.currentConversion = {
      type: 2
    };
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
            }`, i = `
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

            // --- CORRECTED: This function now treats the input as Celsius ---
            float convert_units(float raw_value_celsius) {
                // Type 1: Metric (Celsius). The data is already in Celsius, so do nothing.
                if (u_conversion_type == 1) {
                    return raw_value_celsius;
                }
                // Type 2: Imperial (Fahrenheit). Convert from Celsius to Fahrenheit.
                if (u_conversion_type == 2) {
                    return raw_value_celsius * 1.8 + 32.0;
                }
                // Fallback (should not be used)
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

                // 1. De-quantize to get the raw physical value, which is now correctly identified as Celsius.
                float raw_value_celsius = quantized_value * u_scale + u_offset;

                // 2. Apply the selected unit conversion.
                float converted_value = convert_units(raw_value_celsius);

                // 3. Normalize the converted value for the colormap.
                float colormap_coord = clamp((converted_value - u_data_range.x) / (u_data_range.y - u_data_range.x), 0.0, 1.0);

                vec4 color = texture2D(u_colormap_texture, vec2(colormap_coord, 0.5));
                if (color.a < 0.1) discard;
                gl_FragColor = vec4(color.rgb, color.a * u_opacity);
            }`, a = t.createShader(t.VERTEX_SHADER);
    t.shaderSource(a, o), t.compileShader(a);
    const n = t.createShader(t.FRAGMENT_SHADER);
    t.shaderSource(n, i), t.compileShader(n), this.program = t.createProgram(), t.attachShader(this.program, a), t.attachShader(this.program, n), t.linkProgram(this.program), this.a_position = t.getAttribLocation(this.program, "a_position"), this.a_texCoord = t.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = t.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = t.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = t.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = t.getUniformLocation(this.program, "u_opacity"), this.u_data_range = t.getUniformLocation(this.program, "u_data_range"), this.u_scale = t.getUniformLocation(this.program, "u_scale"), this.u_offset = t.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = t.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = t.getUniformLocation(this.program, "u_texture_size"), this.u_conversion_type = t.getUniformLocation(this.program, "u_conversion_type"), this.vertexBuffer = t.createBuffer(), this.indexBuffer = t.createBuffer(), this.dataTexture = t.createTexture(), this.colormapTexture = t.createTexture(), this.updateGeometry();
  }
  // This method remains unchanged
  updateGeometry(e = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const t = this.gl;
    if (!t) return;
    const o = 120, i = [], a = [], n = 89.5;
    for (let s = 0; s <= o; s++)
      for (let l = 0; l <= o; l++) {
        const _ = l / o, h = s / o, p = e.lon_tl + _ * (e.lon_tr - e.lon_tl);
        let c = e.lat_tl + h * (e.lat_bl - e.lat_tl);
        c = Math.max(-n, Math.min(n, c));
        const f = mapboxgl.MercatorCoordinate.fromLngLat({ lon: p, lat: c }), d = _, m = h;
        i.push(f.x, f.y, d, m);
      }
    for (let s = 0; s < o; s++)
      for (let l = 0; l < o; l++) {
        const _ = s * (o + 1) + l, h = _ + 1, p = (s + 1) * (o + 1) + l, c = p + 1;
        a.push(_, p, h, h, p, c);
      }
    t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, new Float32Array(i), t.STATIC_DRAW), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.bufferData(t.ELEMENT_ARRAY_BUFFER, new Uint16Array(a), t.STATIC_DRAW), this.indexCount = a.length;
  }
  // This method remains unchanged
  updateDataTexture(e, t, o, i) {
    const a = this.gl;
    if (!a) return;
    this.encoding = t, this.textureWidth = o, this.textureHeight = i;
    const n = new Uint8Array(e.length);
    for (let s = 0; s < e.length; s++) {
      const l = e[s] > 127 ? e[s] - 256 : e[s];
      n[s] = l + 128;
    }
    a.bindTexture(a.TEXTURE_2D, this.dataTexture), a.pixelStorei(a.UNPACK_ALIGNMENT, 1), a.texImage2D(a.TEXTURE_2D, 0, a.LUMINANCE, o, i, 0, a.LUMINANCE, a.UNSIGNED_BYTE, n), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MIN_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_MAG_FILTER, a.LINEAR), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_S, a.CLAMP_TO_EDGE), a.texParameteri(a.TEXTURE_2D, a.TEXTURE_WRAP_T, a.CLAMP_TO_EDGE);
  }
  // This method remains unchanged
  updateColormapTexture(e) {
    const t = this.gl;
    if (!t) return;
    const o = 256, i = new Uint8Array(o * 4), a = [];
    for (let c = 0; c < e.length; c += 2)
      a.push({ value: e[c], color: e[c + 1] });
    if (a.length === 0) return;
    const n = a[0].value, l = a[a.length - 1].value - n, _ = (c) => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)], h = (c, f, d) => [Math.round(c[0] * (1 - d) + f[0] * d), Math.round(c[1] * (1 - d) + f[1] * d), Math.round(c[2] * (1 - d) + f[2] * d)];
    let p = 0;
    for (let c = 0; c < o; c++) {
      const f = n + c / (o - 1) * l;
      for (; p < a.length - 2 && f > a[p + 1].value; )
        p++;
      const d = a[p], m = a[p + 1], g = (f - d.value) / (m.value - d.value), v = h(_(d.color), _(m.color), g);
      i[c * 4] = v[0], i[c * 4 + 1] = v[1], i[c * 4 + 2] = v[2], i[c * 4 + 3] = 255;
    }
    t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, o, 1, 0, t.RGBA, t.UNSIGNED_BYTE, i), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE);
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
  setUnitConversion(e) {
    e === "metric" ? this.currentConversion.type = 1 : e === "imperial" && (this.currentConversion.type = 2), this.map && this.map.triggerRepaint();
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
}, M = {
  kelvin_to_celsius: (r) => r - 273.15,
  kelvin_to_fahrenheit: (r) => (r - 273.15) * 9 / 5 + 32,
  kelvin_to_c: (r) => r - 273.15,
  kelvin_to_f: (r) => (r - 273.15) * 9 / 5 + 32,
  k_to_celsius: (r) => r - 273.15,
  k_to_fahrenheit: (r) => (r - 273.15) * 9 / 5 + 32,
  k_to_c: (r) => r - 273.15,
  k_to_f: (r) => (r - 273.15) * 9 / 5 + 32,
  celsius_to_fahrenheit: (r) => r * 9 / 5 + 32,
  celsius_to_f: (r) => r * 9 / 5 + 32,
  c_to_fahrenheit: (r) => r * 9 / 5 + 32,
  c_to_f: (r) => r * 9 / 5 + 32,
  fahrenheit_to_celsius: (r) => (r - 32) * 5 / 9,
  fahrenheit_to_c: (r) => (r - 32) * 5 / 9,
  f_to_celsius: (r) => (r - 32) * 5 / 9,
  f_to_c: (r) => (r - 32) * 5 / 9,
  meters_to_feet: (r) => r * 3.28084,
  meters_to_km: (r) => r / 1e3,
  m_to_feet: (r) => r * 3.28084,
  m_to_ft: (r) => r * 3.28084,
  m_to_km: (r) => r / 1e3,
  kts_to_mph: (r) => r * 1.15078,
  mph_to_kts: (r) => r / 1.15078,
  kts_to_ms: (r) => r / 1.94384449,
  mph_to_ms: (r) => r / 2.23693629,
  ms_to_mph: (r) => r * 2.23694,
  ms_to_kts: (r) => r * 1.94384,
  kts_to_kmh: (r) => r * 1.852,
  mph_to_kmh: (r) => r * 1.60934,
  ms_to_kmh: (r) => r * 3.6,
  kmh_to_kts: (r) => r / 1.852,
  kmh_to_mph: (r) => r / 1.60934,
  kmh_to_ms: (r) => r / 3.6,
  inches_to_mm: (r) => r * 25.4,
  inches_to_cm: (r) => r * 2.54,
  in_to_mm: (r) => r * 25.4,
  in_to_cm: (r) => r * 2.54,
  mm_to_in: (r) => r / 25.4,
  mm_to_inches: (r) => r / 25.4,
  cm_to_in: (r) => r / 2.54,
  cm_to_inches: (r) => r / 2.54,
  inhr_to_mmhr: (r) => r * 25.4,
  inhr_to_cmhr: (r) => r * 2.54,
  in_hr_to_mm_hr: (r) => r * 25.4,
  in_hr_to_cm_hr: (r) => r * 2.54,
  mmhr_to_inhr: (r) => r / 25.4,
  cmhr_to_inhr: (r) => r / 2.54,
  mm_hr_to_in_hr: (r) => r / 25.4,
  cm_hr_to_in_hr: (r) => r / 2.54,
  mmhr_to_cmhr: (r) => r / 10,
  cmhr_to_mmhr: (r) => r * 10,
  mm_hr_to_cm_hr: (r) => r / 10,
  cm_hr_to_mm_hr: (r) => r * 10
};
function I(r, e) {
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
  }, o = (s) => {
    if (!s) return "";
    const l = s.toLowerCase().trim();
    return t[l] || l;
  }, i = o(r), a = o(e), n = `${i}_to_${a}`;
  return M[n] || null;
}
function k(r, e) {
  const t = r?.[e];
  if (!t) return null;
  const o = Object.keys(t).sort((i, a) => a.localeCompare(i));
  for (const i of o) {
    const a = t[i];
    if (!a) continue;
    const n = Object.keys(a).sort((s, l) => l.localeCompare(s));
    if (n.length > 0) return { date: i, run: n[0] };
  }
  return null;
}
class U extends R {
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
      opacity: t.layerOptions?.opacity ?? 1,
      units: "imperial"
    }, this.autoRefreshEnabled = t.autoRefresh ?? !1, this.autoRefreshIntervalSeconds = t.autoRefreshInterval ?? 60, this.autoRefreshIntervalId = null;
  }
  _convertColormapUnits(e, t, o) {
    if (t === o)
      return e;
    const i = I(t, o);
    if (!i)
      return console.warn(`No unit conversion function found from "${t}" to "${o}".`), e;
    const a = [];
    for (let n = 0; n < e.length; n += 2) {
      const s = e[n], l = e[n + 1];
      a.push(i(s), l);
    }
    return a;
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
    const { model: e, date: t, run: o } = this.state, i = this.modelStatus?.[e]?.[t]?.[o];
    if (!i || i.length === 0) return;
    console.log(`[Preload] Starting preload of ${i.length} forecast hours for ${e} ${t}/${o}Z...`);
    const a = i.map((n) => {
      const s = { ...this.state, forecastHour: n };
      return this._loadGridData(s);
    });
    await Promise.all(a), console.log("[Preload] Preloading complete.");
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
  /**
   * ========================================================================
   *                            THE FIRST FIX
   * ========================================================================
   * Clears the grid data cache. This should only be called when the model run changes.
   */
  clearCache() {
    this.gridDataCache.clear(), console.log("[Cache] Grid data cache cleared.");
  }
  /**
   * Loads grid data, now with added logging to see cache hits and misses.
   * @private
   */
  async _loadGridData(e) {
    const { model: t, date: o, run: i, forecastHour: a, variable: n, smoothing: s } = { ...this.baseLayerOptions, ...e }, l = `${t}-${o}-${i}-${a}-${n}-${s}`;
    if (console.log(`[Cache] Requesting data for key: ${l}`), this.gridDataCache.has(l))
      return console.log(`[Cache] HIT for key: ${l}`), this.gridDataCache.get(l);
    console.log(`[Cache] MISS for key: ${l}. Fetching from network...`);
    const _ = `${this.baseUrl}/${t}/${o}/${i}/${a}/${n}/${s}`;
    try {
      const h = await fetch(_);
      if (!h.ok) throw new Error(`HTTP ${h.status}`);
      const { data: p, encoding: c } = await h.json(), f = Uint8Array.from(atob(p), (d) => d.charCodeAt(0));
      return new Promise((d) => {
        const m = (g) => {
          if (this.worker.removeEventListener("message", m), g.data.success) {
            const v = { data: g.data.decompressedData, encoding: c };
            console.log(`[Cache] STORING data for key: ${l}`), this.gridDataCache.set(l, v), d(v);
          } else
            console.error("Worker failed:", g.data.error), d(null);
        };
        this.worker.addEventListener("message", m), this.worker.postMessage({ compressedData: f, encoding: c }, [f.buffer]);
      });
    } catch (h) {
      return console.warn(`Failed to fetch data for ${l}:`, h.message), null;
    }
  }
  _updateOrCreateLayer(e, t, o, i) {
    const { model: a, colormap: n, opacity: s = 1, visible: l = !0, units: _ } = t, h = A[a];
    if (!h) {
      console.error(`No grid configuration found for model: ${a}`);
      return;
    }
    const p = "fahrenheit", c = _ === "metric" ? "celsius" : "fahrenheit", f = this._convertColormapUnits(n, p, c), d = [f[0], f[f.length - 2]];
    if (this.layers.has(e)) {
      const g = this.layers.get(e).shaderLayer;
      g.updateDataTexture(o, i, h.grid_params.nx, h.grid_params.ny), g.updateColormapTexture(f), g.updateStyle({ opacity: l ? s : 0, dataRange: d }), g.setUnitConversion(_);
    } else {
      const m = new S(e), g = "AML_-_terrain";
      this.map.getLayer(g) ? this.map.addLayer(m, g) : (console.warn(`AguaceroAPI: Layer '${g}' not found. Adding weather layer to the top.`), this.map.addLayer(m)), this.layers.set(e, { id: e, shaderLayer: m, options: t, visible: l }), m.updateDataTexture(o, i, h.grid_params.nx, h.grid_params.ny), m.updateColormapTexture(f), m.updateStyle({ opacity: l ? s : 0, dataRange: d }), m.setUnitConversion(_);
    }
    this.map.triggerRepaint();
  }
  /**
   * 4. NEW PUBLIC METHOD: Sets the unit system for the layer.
   * @param {'metric'|'imperial'} newUnits - The desired unit system.
   */
  async setUnits(e) {
    e === this.state.units || !["metric", "imperial"].includes(e) || await this.setState({ units: e });
  }
  /**
   * Updates the manager's state, triggers data loading and rendering.
   * @param {object} newState - The new state properties to apply.
   */
  async setState(e) {
    const t = e.date && e.run && (e.date !== this.state.date || e.run !== this.state.run);
    t && (console.log("[State] Model run changed. Clearing cache."), this.clearCache()), Object.assign(this.state, e);
    const o = await this._loadGridData(this.state);
    if (o && o.data) {
      const i = { ...this.baseLayerOptions, ...this.state };
      this._updateOrCreateLayer(this.layerId, i, o.data, o.encoding);
    } else
      this.removeLayer(this.layerId);
    this.emit("state:change", this.state), t && this.loadStrategy === "preload" && setTimeout(() => this._preloadCurrentRun(), 0);
  }
  /**
   * Initializes the manager by fetching the latest model run and rendering the first frame.
   */
  async initialize(e = {}) {
    const t = await this.fetchModelStatus(), o = k(t, this.state.model);
    if (o ? await this.setState({ ...o, forecastHour: 0 }) : (console.error(`Could not initialize. No runs found for model "${this.state.model}".`), this.emit("state:change", this.state)), e.autoRefresh ?? this.autoRefreshEnabled) {
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
const P = {
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
}, D = {
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
}, C = {
  light: P,
  dark: D
}, u = {
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
function b(r) {
  return typeof r == "string" && r.startsWith("#") && r.length === 9 ? r.substring(0, 7) : r;
}
const x = (r, e, t) => {
  if (r.getLayer(e) && (r.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), r.setPaintProperty(e, "line-color", b(t.color)), r.setPaintProperty(e, "line-width", t.width), t.lineType)) {
    const o = { dashed: [2, 2], dotted: [0, 2], solid: [] };
    r.setPaintProperty(e, "line-dasharray", o[t.lineType] || []);
  }
}, y = (r, e, t) => {
  r.getLayer(e) && (r.setLayoutProperty(e, "visibility", t.visible ? "visible" : "none"), r.setPaintProperty(e, "text-color", b(t.color)), r.setPaintProperty(e, "text-halo-color", b(t.outlineColor)), r.setPaintProperty(e, "text-halo-width", t.outlineWidth), r.setLayoutProperty(e, "text-size", t.fontSize), r.setLayoutProperty(e, "text-font", [t.fontFamily]));
};
function L(r, e, t, o) {
  o && r.getLayer(e) && (o.color && r.setPaintProperty(e, t, b(o.color)), o.visible !== void 0 && r.setLayoutProperty(e, "visibility", o.visible ? "visible" : "none"));
}
function w(r, e) {
  if (!(!r || !r.isStyleLoaded())) {
    if (e.landOcean) {
      const { landColor: t, oceanColor: o, waterDepth: i, nationalPark: a } = e.landOcean;
      r.getLayer(u.landColor.layerId) && r.setPaintProperty(u.landColor.layerId, "background-color", b(t)), r.getLayer(u.oceanColor.layerId) && r.setPaintProperty(u.oceanColor.layerId, "fill-color", b(o)), L(r, u.waterDepth.layerId, "fill-color", i), L(r, u.nationalPark.layerId, "fill-color", a);
    }
    e.transportation && (x(r, u.roads.layerId, e.transportation.roads), x(r, u.airports.layerId, e.transportation.airports)), e.boundaries && (x(r, u.countries.layerId, e.boundaries.countries), x(r, u.states.layerId, e.boundaries.states), x(r, u.counties.layerId, e.boundaries.counties)), e.waterFeatures && x(r, u.waterways.layerId, e.waterFeatures.waterways), e.labels && (y(r, u.continents.layerId, e.labels.continents), y(r, u.countriesLabels.layerId, e.labels.countries), y(r, u.statesLabels.layerId, e.labels.states), y(r, u.citiesMajor.layerId, e.labels.cities.major), y(r, u.citiesMinor.layerId, e.labels.cities.minor), y(r, u.airportsLabels.layerId, e.labels.airports), y(r, u.poi.layerId, e.labels.poi), y(r, u.waterLabels.layerId, e.labels.waterLabels), y(r, u.naturalLabels.layerId, e.labels.naturalLabels), y(r, u.subdivisionLabels.layerId, e.labels.subdivisionLabels)), e.terrain && r.getSource("mapbox-dem") && (e.terrain.visible ? (r.setTerrain({ source: "mapbox-dem", exaggeration: 1 }), r.getLayer("hillshade") && (r.setPaintProperty("hillshade", "hillshade-exaggeration", e.terrain.intensity), r.setPaintProperty("hillshade", "hillshade-shadow-color", b(e.terrain.shadowColor)), r.setPaintProperty("hillshade", "hillshade-highlight-color", b(e.terrain.highlightColor)), r.setPaintProperty("hillshade", "hillshade-accent-color", b(e.terrain.accentColor)))) : r.setTerrain(null));
  }
}
function T(r, e) {
  const t = { ...r };
  return E(r) && E(e) && Object.keys(e).forEach((o) => {
    E(e[o]) ? o in r ? t[o] = T(r[o], e[o]) : Object.assign(t, { [o]: e[o] }) : Object.assign(t, { [o]: e[o] });
  }), t;
}
function E(r) {
  return r && typeof r == "object" && !Array.isArray(r);
}
const F = "mapbox://styles/aguacerowx/cmfvox8mq004u01qm5nlg7qkt";
class O extends R {
  constructor(e, t = {}) {
    if (super(), !e || !t.accessToken)
      throw new Error("A container ID and a Mapbox access token are required.");
    mapboxgl.accessToken = t.accessToken;
    let o = JSON.parse(JSON.stringify(C.light)), i = JSON.parse(JSON.stringify(C.dark));
    t.customStyles && (console.log("[MapManager] Custom styles provided. Merging..."), t.customStyles.light && (o = T(o, t.customStyles.light)), t.customStyles.dark && (i = T(i, t.customStyles.dark)), console.log("[MapManager] Final merged dark theme:", i)), this.themes = {
      light: o,
      dark: i
    };
    const a = t.defaultTheme || "light";
    this.currentCustomizations = this.themes[a], this.currentThemeName = a, this.weatherLayerManagers = /* @__PURE__ */ new Map(), this.map = new mapboxgl.Map({
      container: e,
      style: F,
      center: [-98, 39],
      zoom: 3.5,
      ...t.mapOptions
    }), this.map.on("load", () => {
      console.log("[MapManager] Map loaded. Applying initial theme:", a), w(this.map, this.currentCustomizations), this.emit("style:applied", {
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
    const t = JSON.parse(JSON.stringify(this.themes[e])), o = this.currentCustomizations.labels;
    if (o)
      for (const i in o) {
        o[i]?.hasOwnProperty("visible") && t.labels[i] && (t.labels[i].visible = o[i].visible);
        for (const a in o[i])
          o[i][a]?.hasOwnProperty("visible") && t.labels[i]?.[a] && (t.labels[i][a].visible = o[i][a].visible);
      }
    this.currentCustomizations = t, this.currentThemeName = e, w(this.map, this.currentCustomizations), this.emit("style:applied", {
      themeName: this.currentThemeName,
      styles: this.currentCustomizations
    });
  }
  setLabelGroupVisibility(e, t) {
    const o = `labels.${e}.visible`;
    let i = this.currentCustomizations;
    const a = o.split(".");
    for (let l = 0; l < a.length - 1; l++)
      if (i = i[a[l]], !i) {
        console.error(`Invalid label group key: ${e}`);
        return;
      }
    i[a[a.length - 1]] = t;
    const n = e.replace(/\.(.)/g, (l, _) => _.toUpperCase()), s = u[n]?.layerId;
    s && this.map.getLayer(s) ? (this.map.setLayoutProperty(s, "visibility", t ? "visible" : "none"), console.log(`[MapManager] Set visibility for ${s} to ${t}`)) : console.warn(`[MapManager] Could not find layer for label group key: ${e} (mapped to ${n})`);
  }
  addWeatherManager(e) {
    this.weatherLayerManagers.set(e.layerId, e);
  }
  getMap() {
    return this.map;
  }
}
class j {
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
    const o = e.substring(0, 4), i = e.substring(4, 6), a = e.substring(6, 8);
    return `${o}-${i}-${a} (${t}Z)`;
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
    const i = [];
    for (const a in o)
      for (const n in o[a])
        i.push({ date: a, run: n });
    i.sort((a, n) => {
      const s = n.date.localeCompare(a.date);
      return s !== 0 ? s : n.run.localeCompare(a.run);
    }), this.selectElement.innerHTML = "", i.forEach(({ date: a, run: n }) => {
      const s = document.createElement("option");
      s.value = `${a}:${n}`, s.textContent = this.options.runFormatter(a, n), this.selectElement.appendChild(s);
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
      const [i, a] = o.target.value.split(":");
      this.manager.setState({ date: i, run: a, forecastHour: 0 });
    }), this.manager.on("state:change", () => this._populate()), t.appendChild(this.element), this;
  }
}
class z {
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
    const { model: e, date: t, run: o, forecastHour: i } = this.manager.state, a = this.manager.modelStatus?.[e]?.[t]?.[o];
    if (!a || a.length === 0) {
      this.sliderElement.disabled = !0, this.sliderElement.max = 0, this.displayElement.textContent = "N/A";
      return;
    }
    const n = a.indexOf(i);
    this.sliderElement.max = a.length - 1, this.sliderElement.value = n >= 0 ? n : 0, this.displayElement.textContent = i, this.sliderElement.disabled = !1;
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
        `, this.sliderElement = this.element.querySelector("input"), this.displayElement = this.element.querySelector("span"), this.sliderElement.addEventListener("input", (o) => {
      const { model: i, date: a, run: n } = this.manager.state, s = this.manager.modelStatus[i][a][n];
      if (!s) return;
      const l = s[parseInt(o.target.value, 10)];
      this.displayElement.textContent = l, this.latestForecastHour = l, this.pendingUpdate || (this.pendingUpdate = !0, requestAnimationFrame(() => this._performUpdate()));
    }), this.manager.on("state:change", () => this._update()), t.appendChild(this.element), this;
  }
}
class $ {
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
        `, this.buttons = this.element.querySelectorAll("button"), this.buttons.forEach((o) => {
      o.addEventListener("click", (i) => {
        this.manager.setTheme(i.target.dataset.theme);
      });
    }), this.manager.on("style:applied", ({ themeName: o }) => {
      this.buttons.forEach((i) => {
        i.classList.toggle("active", i.dataset.theme === o);
      });
    }), t.appendChild(this.element), this;
  }
}
class N {
  constructor(e, t = {}) {
    this.manager = e, this.labels = t.labels || [], this.element = null;
  }
  addTo(e) {
    const t = typeof e == "string" ? document.querySelector(e) : e;
    return this.element = document.createElement("div"), this.element.className = "aguacero-panel aguacero-label-control", this.element.innerHTML = '<div class="aguacero-panel-label">Labels</div>', this.labels.forEach((o) => {
      const i = document.createElement("div");
      i.className = "aguacero-toggle-row";
      const a = `label-toggle-${o.key.replace(".", "-")}`;
      i.innerHTML = `
                <label for="${a}">${o.label}</label>
                <input type="checkbox" id="${a}" data-key="${o.key}">
            `, i.querySelector("input").addEventListener("change", (s) => {
        this.manager.setLabelGroupVisibility(s.target.dataset.key, s.target.checked);
      }), this.element.appendChild(i);
    }), this.manager.on("style:applied", ({ styles: o }) => {
      this.element.querySelectorAll('input[type="checkbox"]').forEach((i) => {
        const [a, n] = i.dataset.key.split("."), s = o.labels?.[a]?.[n]?.visible;
        s !== void 0 && (i.checked = s);
      });
    }), this.buttons.forEach((o) => {
      o.addEventListener("click", (i) => {
        const a = i.target.dataset.theme;
        console.log(`[ThemeControlPanel] Button clicked. Requesting theme: "${a}"`), this.manager.setTheme(a);
      });
    }), t.appendChild(this.element), this;
  }
}
class W {
  /**
   * Creates an instance of UnitControlPanel.
   * @param {FillLayerManager} manager - The main controller instance.
   * @param {object} [options={}] - Customization options.
   * @param {'imperial'|'metric'} [options.initialUnit='imperial'] - The unit system to start with.
   */
  constructor(e, t = {}) {
    this.manager = e, this.element = null, this.options = {
      initialUnit: t.initialUnit || "imperial"
    };
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
        `, this.buttons = this.element.querySelectorAll("button"), this.buttons.forEach((o) => {
      o.addEventListener("click", (i) => {
        const a = i.target.dataset.unit;
        this.manager.setUnits(a);
      });
    }), this.manager.on("state:change", ({ units: o }) => {
      this.buttons.forEach((i) => {
        i.classList.toggle("active", i.dataset.unit === o);
      });
    }), this.manager.setUnits(this.options.initialUnit), t.appendChild(this.element), this;
  }
}
export {
  U as FillLayerManager,
  z as ForecastSliderPanel,
  N as LabelControlPanel,
  O as MapManager,
  j as RunSelectorPanel,
  $ as ThemeControlPanel,
  W as UnitControlPanel
};
