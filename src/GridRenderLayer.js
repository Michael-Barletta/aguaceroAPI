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
        // Properties to store grid dimensions for the shader
        this.textureWidth = 0;
        this.textureHeight = 0;
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
            }`;

        const vertexShader = gl.createShader(gl.VERTEX_SHADER); gl.shaderSource(vertexShader, vertexSource); gl.compileShader(vertexShader);
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(fragmentShader, fragmentSource); gl.compileShader(fragmentShader);
        this.program = gl.createProgram(); gl.attachShader(this.program, vertexShader); gl.attachShader(this.program, fragmentShader); gl.linkProgram(this.program);
        this.a_position = gl.getAttribLocation(this.program, "a_position"); this.a_texCoord = gl.getAttribLocation(this.program, "a_texCoord");
        this.u_matrix = gl.getUniformLocation(this.program, "u_matrix"); this.u_data_texture = gl.getUniformLocation(this.program, "u_data_texture");
        this.u_colormap_texture = gl.getUniformLocation(this.program, "u_colormap_texture"); this.u_opacity = gl.getUniformLocation(this.program, "u_opacity");
        this.u_data_range = gl.getUniformLocation(this.program, "u_data_range"); this.u_scale = gl.getUniformLocation(this.program, "u_scale");
        this.u_offset = gl.getUniformLocation(this.program, "u_offset"); this.u_missing_quantized = gl.getUniformLocation(this.program, "u_missing_quantized");
        // Get the location for our new uniform
        this.u_texture_size = gl.getUniformLocation(this.program, "u_texture_size");

        this.vertexBuffer = gl.createBuffer(); this.indexBuffer = gl.createBuffer();
        this.dataTexture = gl.createTexture(); this.colormapTexture = gl.createTexture();
        this.updateGeometry();
    }
    
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

                // The texture coordinates are now simple and direct (no "+ 0.5" shift)
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

    updateDataTexture(data, encoding, width, height) {
        const gl = this.gl;
        if (!gl) return;
        this.encoding = encoding;
        // ... (rest of the function is the same, but note the wrap mode change)
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
        
        // The horizontal wrap mode MUST be CLAMP_TO_EDGE, not REPEAT
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); 
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    updateColormapTexture(colormap) {
        // ... This function is correct and unchanged ...
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

    updateStyle({ opacity, dataRange }) {
        if (opacity !== undefined) this.opacity = opacity;
        if (dataRange !== undefined) this.dataRange = dataRange;
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
        // Set the new uniform with the grid dimensions
        gl.uniform2f(this.u_texture_size, this.textureWidth, this.textureHeight);
        
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
        if (this.gl) {
            if (this.program) this.gl.deleteProgram(this.program);
            if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
            if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
            if (this.dataTexture) this.gl.deleteTexture(this.dataTexture);
            if (this.colormapTexture) this.gl.deleteTexture(this.colormapTexture);
        }
    }
}