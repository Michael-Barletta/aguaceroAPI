class T {
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
            }`, i = t.createShader(t.VERTEX_SHADER);
    t.shaderSource(i, o), t.compileShader(i);
    const s = t.createShader(t.FRAGMENT_SHADER);
    t.shaderSource(s, n), t.compileShader(s), this.program = t.createProgram(), t.attachShader(this.program, i), t.attachShader(this.program, s), t.linkProgram(this.program), this.a_position = t.getAttribLocation(this.program, "a_position"), this.a_texCoord = t.getAttribLocation(this.program, "a_texCoord"), this.u_matrix = t.getUniformLocation(this.program, "u_matrix"), this.u_data_texture = t.getUniformLocation(this.program, "u_data_texture"), this.u_colormap_texture = t.getUniformLocation(this.program, "u_colormap_texture"), this.u_opacity = t.getUniformLocation(this.program, "u_opacity"), this.u_data_range = t.getUniformLocation(this.program, "u_data_range"), this.u_scale = t.getUniformLocation(this.program, "u_scale"), this.u_offset = t.getUniformLocation(this.program, "u_offset"), this.u_missing_quantized = t.getUniformLocation(this.program, "u_missing_quantized"), this.u_texture_size = t.getUniformLocation(this.program, "u_texture_size"), this.vertexBuffer = t.createBuffer(), this.indexBuffer = t.createBuffer(), this.dataTexture = t.createTexture(), this.colormapTexture = t.createTexture(), this.updateGeometry();
  }
  updateGeometry(e = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
    const t = this.gl;
    if (!t) return;
    const o = 120, n = [], i = [], s = 89.5;
    for (let a = 0; a <= o; a++)
      for (let _ = 0; _ <= o; _++) {
        const c = _ / o, h = a / o, l = e.lon_tl + c * (e.lon_tr - e.lon_tl);
        let r = e.lat_tl + h * (e.lat_bl - e.lat_tl);
        r = Math.max(-s, Math.min(s, r));
        const f = mapboxgl.MercatorCoordinate.fromLngLat({ lon: l, lat: r }), u = c, d = h;
        n.push(f.x, f.y, u, d);
      }
    for (let a = 0; a < o; a++)
      for (let _ = 0; _ < o; _++) {
        const c = a * (o + 1) + _, h = c + 1, l = (a + 1) * (o + 1) + _, r = l + 1;
        i.push(c, l, h, h, l, r);
      }
    t.bindBuffer(t.ARRAY_BUFFER, this.vertexBuffer), t.bufferData(t.ARRAY_BUFFER, new Float32Array(n), t.STATIC_DRAW), t.bindBuffer(t.ELEMENT_ARRAY_BUFFER, this.indexBuffer), t.bufferData(t.ELEMENT_ARRAY_BUFFER, new Uint16Array(i), t.STATIC_DRAW), this.indexCount = i.length;
  }
  updateDataTexture(e, t, o, n) {
    const i = this.gl;
    if (!i) return;
    this.encoding = t, this.textureWidth = o, this.textureHeight = n;
    const s = new Uint8Array(e.length);
    for (let a = 0; a < e.length; a++) {
      const _ = e[a] > 127 ? e[a] - 256 : e[a];
      s[a] = _ + 128;
    }
    i.bindTexture(i.TEXTURE_2D, this.dataTexture), i.pixelStorei(i.UNPACK_ALIGNMENT, 1), i.texImage2D(i.TEXTURE_2D, 0, i.LUMINANCE, o, n, 0, i.LUMINANCE, i.UNSIGNED_BYTE, s), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MIN_FILTER, i.LINEAR), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_MAG_FILTER, i.LINEAR), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_S, i.CLAMP_TO_EDGE), i.texParameteri(i.TEXTURE_2D, i.TEXTURE_WRAP_T, i.CLAMP_TO_EDGE);
  }
  updateColormapTexture(e) {
    const t = this.gl;
    if (!t) return;
    const o = 256, n = new Uint8Array(o * 4), i = [];
    for (let r = 0; r < e.length; r += 2)
      i.push({ value: e[r], color: e[r + 1] });
    if (i.length === 0) return;
    const s = i[0].value, _ = i[i.length - 1].value - s, c = (r) => [parseInt(r.slice(1, 3), 16), parseInt(r.slice(3, 5), 16), parseInt(r.slice(5, 7), 16)], h = (r, f, u) => [Math.round(r[0] * (1 - u) + f[0] * u), Math.round(r[1] * (1 - u) + f[1] * u), Math.round(r[2] * (1 - u) + f[2] * u)];
    let l = 0;
    for (let r = 0; r < o; r++) {
      const f = s + r / (o - 1) * _;
      for (; l < i.length - 2 && f > i[l + 1].value; )
        l++;
      const u = i[l], d = i[l + 1], m = (f - u.value) / (d.value - u.value), x = h(c(u.color), c(d.color), m);
      n[r * 4] = x[0], n[r * 4 + 1] = x[1], n[r * 4 + 2] = x[2], n[r * 4 + 3] = 255;
    }
    t.bindTexture(t.TEXTURE_2D, this.colormapTexture), t.texImage2D(t.TEXTURE_2D, 0, t.RGBA, o, 1, 0, t.RGBA, t.UNSIGNED_BYTE, n), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_MIN_FILTER, t.LINEAR), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_S, t.CLAMP_TO_EDGE), t.texParameteri(t.TEXTURE_2D, t.TEXTURE_WRAP_T, t.CLAMP_TO_EDGE);
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
export {
  T as GridRenderLayer
};
