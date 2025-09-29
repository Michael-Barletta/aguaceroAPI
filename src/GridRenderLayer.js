// aguaceroAPI/src/GridRenderLayer.js

export class GridRenderLayer {
    constructor(id) {
        this.id = id;
        this.type = 'custom';
        this.renderingMode = '2d';
        this.map = null;
        this.gl = null;
        this.program = null;
        this.opacity = 1;
        this.dataRange = [0, 1];
        this.vertexBuffer = null;
        this.indexBuffer = null;
        this.indexCount = 0;
        this.dataTexture = null;
        this.colormapTexture = null;
        this.encoding = null;
        this.textureWidth = 0;
        this.textureHeight = 0;

        // --- NEW: Add properties to hold unit conversion state ---
        this.u_conversion_type = null; // The WebGL uniform location
        this.currentConversion = {
            type: 2 
        };
    }

    onAdd(map, gl) {
        this.map = map;
        this.gl = gl;

        const vertexSource = `
            attribute vec2 a_position;
            attribute vec2 a_texCoord;
            uniform mat4 u_matrix;
            varying vec2 v_texCoord;
            void main() {
                gl_Position = u_matrix * vec4(a_position, 0.0, 1.0);
                v_texCoord = a_texCoord;
            }`;

        // --- CORRECTED SHADER LOGIC ---
        const fragmentSource = `
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
            }`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vertexShader, vertexSource); gl.compileShader(vertexShader);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fragmentShader, fragmentSource); gl.compileShader(fragmentShader);
        this.program = gl.createProgram(); gl.attachShader(this.program, vertexShader); gl.attachShader(this.program, fragmentShader); gl.linkProgram(this.program);
        
        this.a_position = gl.getAttribLocation(this.program, "a_position");
        this.a_texCoord = gl.getAttribLocation(this.program, "a_texCoord");
        this.u_matrix = gl.getUniformLocation(this.program, "u_matrix");
        this.u_data_texture = gl.getUniformLocation(this.program, "u_data_texture");
        this.u_colormap_texture = gl.getUniformLocation(this.program, "u_colormap_texture");
        this.u_opacity = gl.getUniformLocation(this.program, "u_opacity");
        this.u_data_range = gl.getUniformLocation(this.program, "u_data_range");
        this.u_scale = gl.getUniformLocation(this.program, "u_scale");
        this.u_offset = gl.getUniformLocation(this.program, "u_offset");
        this.u_missing_quantized = gl.getUniformLocation(this.program, "u_missing_quantized");
        this.u_texture_size = gl.getUniformLocation(this.program, "u_texture_size");
        this.u_conversion_type = gl.getUniformLocation(this.program, "u_conversion_type");

        this.vertexBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
        this.dataTexture = gl.createTexture();
        this.colormapTexture = gl.createTexture();
        this.updateGeometry();
    }
    
    // This method remains unchanged
    updateGeometry(corners = { lon_tl: -180, lat_tl: 90, lon_tr: 180, lat_tr: 90, lon_bl: -180, lat_bl: -90, lon_br: 180, lat_br: -90 }) {
        const gl = this.gl;
        if (!gl) return;
        const subdivisions = 120;
        const vertices = [];
        const indices = [];
        const MERCATOR_SAFE_LIMIT = 89.5;

        for (let row = 0; row <= subdivisions; row++) {
            for (let col = 0; col <= subdivisions; col++) {
                const t_x = col / subdivisions;
                const t_y = row / subdivisions;

                const lon = corners.lon_tl + t_x * (corners.lon_tr - corners.lon_tl);
                let lat = corners.lat_tl + t_y * (corners.lat_bl - corners.lat_tl);
                lat = Math.max(-MERCATOR_SAFE_LIMIT, Math.min(MERCATOR_SAFE_LIMIT, lat));
                
                const mercator = mapboxgl.MercatorCoordinate.fromLngLat({ lon, lat });

                const tex_u = t_x;
                const tex_v = t_y;

                vertices.push(mercator.x, mercator.y, tex_u, tex_v);
            }
        }

        for (let row = 0; row < subdivisions; row++) {
            for (let col = 0; col < subdivisions; col++) {
                const topLeft = row * (subdivisions + 1) + col;
                const topRight = topLeft + 1;
                const bottomLeft = (row + 1) * (subdivisions + 1) + col;
                const bottomRight = bottomLeft + 1;
                indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
            }
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        this.indexCount = indices.length;
    }

    // This method remains unchanged
    updateDataTexture(data, encoding, width, height) {
        const gl = this.gl;
        if (!gl) return;
        this.encoding = encoding;
        this.textureWidth = width;
        this.textureHeight = height;
        const transformedData = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const signedValue = data[i] > 127 ? data[i] - 256 : data[i];
            transformedData[i] = signedValue + 128;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.dataTexture);
        gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, transformedData);
        
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // This method remains unchanged
    updateColormapTexture(colormap) {
        const gl = this.gl; if (!gl) return; const width = 256; const data = new Uint8Array(width * 4); const stops = [];
        for (let i = 0; i < colormap.length; i += 2) { stops.push({ value: colormap[i], color: colormap[i + 1] });}
        if (stops.length === 0) return; const colormapMin = stops[0].value; const colormapMax = stops[stops.length - 1].value; const range = colormapMax - colormapMin;
        const parseHexColor = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
        const interpolateColor = (c1, c2, t) => [Math.round(c1[0] * (1 - t) + c2[0] * t), Math.round(c1[1] * (1 - t) + c2[1] * t), Math.round(c1[2] * (1 - t) + c2[2] * t)];
        let stopIndex = 0;
        for (let i = 0; i < width; i++) {
            const currentValue = colormapMin + (i / (width - 1)) * range;
            while (stopIndex < stops.length - 2 && currentValue > stops[stopIndex + 1].value) { stopIndex++; }
            const lowerStop = stops[stopIndex]; const upperStop = stops[stopIndex + 1]; const t = (currentValue - lowerStop.value) / (upperStop.value - lowerStop.value);
            const color = interpolateColor(parseHexColor(lowerStop.color), parseHexColor(upperStop.color), t);
            data[i * 4] = color[0]; data[i * 4 + 1] = color[1]; data[i * 4 + 2] = color[2]; data[i * 4 + 3] = 255;
        }
        gl.bindTexture(gl.TEXTURE_2D, this.colormapTexture); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    // This method remains unchanged
    updateStyle({ opacity, dataRange }) {
        if (opacity !== undefined) this.opacity = opacity;
        if (dataRange !== undefined) this.dataRange = dataRange;
    }

    /**
     * NEW METHOD: Sets the unit conversion mode for the shader.
     * @param {string} fromUnit - The native unit of the data (e.g., 'kelvin').
     * @param {'metric'|'imperial'} targetSystem - The target display system.
     */
    setUnitConversion(targetSystem) {
        if (targetSystem === 'metric') {
            this.currentConversion.type = 1; // Corresponds to Celsius in the shader
        } else if (targetSystem === 'imperial') {
            this.currentConversion.type = 2; // Corresponds to Fahrenheit in the shader
        }

        if (this.map) {
            this.map.triggerRepaint();
        }
    }

    render(gl, matrix) {
        if (!this.program || !this.encoding || !this.vertexBuffer || !this.indexBuffer) return;
        gl.useProgram(this.program);
        gl.uniformMatrix4fv(this.u_matrix, false, matrix);
        gl.uniform1f(this.u_opacity, this.opacity);
        gl.uniform2f(this.u_data_range, this.dataRange[0], this.dataRange[1]);
        gl.uniform1f(this.u_scale, this.encoding.scale);
        gl.uniform1f(this.u_offset, this.encoding.offset);
        gl.uniform1f(this.u_missing_quantized, this.encoding.missing_quantized || 127);
        gl.uniform2f(this.u_texture_size, this.textureWidth, this.textureHeight);
        
        // This now sends the correct conversion type (1 for C, 2 for F)
        gl.uniform1i(this.u_conversion_type, this.currentConversion.type);
        
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.dataTexture); gl.uniform1i(this.u_data_texture, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, this.colormapTexture); gl.uniform1i(this.u_colormap_texture, 1);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.enableVertexAttribArray(this.a_position); gl.vertexAttribPointer(this.a_position, 2, gl.FLOAT, false, 16, 0);
        gl.enableVertexAttribArray(this.a_texCoord); gl.vertexAttribPointer(this.a_texCoord, 2, gl.FLOAT, false, 16, 8);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    }

    onRemove() {
        if (this.gl) { if (this.program) this.gl.deleteProgram(this.program); if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer); if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer); if (this.dataTexture) this.gl.deleteTexture(this.dataTexture); if (this.colormapTexture) this.gl.deleteTexture(this.colormapTexture); }
    }
}