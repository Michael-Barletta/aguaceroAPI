import mapboxgl, { MercatorCoordinate } from 'mapbox-gl';
import proj4 from 'proj4';

const MERCATOR_SAFE_LIMIT = 89;

function hrdpsObliqueTransform(rotated_lon, rotated_lat) {
    const o_lat_p = 53.91148;
    const o_lon_p = 245.305142;
    const DEG_TO_RAD = Math.PI / 180.0;
    const RAD_TO_DEG = 180.0 / Math.PI;
    const o_lat_p_rad = o_lat_p * DEG_TO_RAD;
    const rot_lon_rad = rotated_lon * DEG_TO_RAD;
    const rot_lat_rad = rotated_lat * DEG_TO_RAD;
    const sin_rot_lat = Math.sin(rot_lat_rad);
    const cos_rot_lat = Math.cos(rot_lat_rad);
    const sin_rot_lon = Math.sin(rot_lon_rad);
    const cos_rot_lon = Math.cos(rot_lon_rad);
    const sin_o_lat_p = Math.sin(o_lat_p_rad);
    const cos_o_lat_p = Math.cos(o_lat_p_rad);
    const sin_lat = cos_o_lat_p * sin_rot_lat + sin_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lat = Math.asin(sin_lat) * RAD_TO_DEG;
    const sin_lon_num = cos_rot_lat * sin_rot_lon;
    const sin_lon_den = -sin_o_lat_p * sin_rot_lat + cos_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lon = Math.atan2(sin_lon_num, sin_lon_den) * RAD_TO_DEG + o_lon_p;
    if (lon > 180) lon -= 360;
    else if (lon < -180) lon += 360;
    return [lon, lat];
}

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
        this.cachedCorners = null;
        this.cachedGridDef = null;
        this.currentConversion = {
            type: 0 
        };
        this.dataTextureArray = null; // NEW: Will hold all timesteps
        this.currentTimestep = 0; // NEW: Which layer to display
        this.timestepCount = 0;
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
            uniform vec2 u_texture_size;
            uniform int u_conversion_type;

            float convert_units(float raw_value) {
                if (u_conversion_type == 1) return raw_value;
                if (u_conversion_type == 2) return raw_value * 1.8 + 32.0;
                // ... add other conversions from your full shader if needed ...
                return raw_value;
            }

            void main() {
                // The GPU handles bilinear interpolation and texture wrapping automatically
                // because we set TEXTURE_MAG_FILTER to LINEAR and TEXTURE_WRAP_S to REPEAT.
                // We simply sample the texture at the coordinate provided by the vertex shader.
                float value_0_to_255 = texture2D(u_data_texture, v_texCoord).r * 255.0;
                
                // Convert from the texture's [0, 255] range back to the signed quantized value [-128, 127]
                float quantized_value = value_0_to_255 - 128.0;

                // Check for the missing data value.
                if (abs(quantized_value - u_missing_quantized) < 0.5) {
                    discard;
                }

                // De-quantize, convert units, and apply the colormap as before.
                float raw_value = quantized_value * u_scale + u_offset;
                float converted_value = convert_units(raw_value);

                if (converted_value < u_data_range.x || converted_value > u_data_range.y) {
                    discard;
                }
                
                float colormap_coord = (converted_value - u_data_range.x) / (u_data_range.y - u_data_range.x);
                vec4 color = texture2D(u_colormap_texture, vec2(colormap_coord, 0.5));
                
                if (color.a < 0.1) {
                    discard;
                }

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
        
        // Restore geometry if it exists from a previous initialization
        if (this.cachedCorners && this.cachedGridDef) {
            this.updateGeometry(this.cachedCorners, this.cachedGridDef);
        }
    }

    updateGeometry(corners, gridDef) {
        // Cache the geometry
        this.cachedCorners = corners;
        this.cachedGridDef = gridDef;
        if (!this.gl || !this.vertexBuffer) return;
        const gl = this.gl;

        const subdivisions = 120; 
        
        // Validate input corners
        const coordValues = [corners.lon_tl, corners.lat_tl, corners.lon_tr, corners.lat_tr, 
                             corners.lon_bl, corners.lat_bl, corners.lon_br, corners.lat_br];
        
        if (coordValues.some(coord => !isFinite(coord))) {
            console.error('[GridLayer] Invalid corner coordinates:', corners);
            return;
        }
        
        const gridType = gridDef.type;
        
        if (gridType === 'latlon') {
            const vertices = [];
            const indices = [];
            
            // Check if this is a flipped grid
            const isFlippedGrid = corners.lat_tl < corners.lat_bl;

            const isIconEUType = gridDef.grid_params && 
                            gridDef.grid_params.lon_first === 336.5 && 
                            Math.abs(gridDef.grid_params.lat_first) === 29.5;

            const isIconD2Type = gridDef.grid_params && 
                            gridDef.grid_params.lon_first === 356.06 && 
                            Math.abs(gridDef.grid_params.lat_first) === 43.18;
            // Detect grid type
            const isGFSType = gridDef.grid_params && 
                            gridDef.grid_params.lon_first === 0.0 && 
                            Math.abs(gridDef.grid_params.lat_first) === 90.0;
            
            const isECMWFType = gridDef.grid_params && 
                            gridDef.grid_params.lon_first === 180.0 && 
                            gridDef.grid_params.lat_first === 90.0;

            const isGEMType = gridDef.grid_params && 
                            gridDef.grid_params.lon_first === 180.0 && 
                            gridDef.grid_params.lat_first === -90.0 &&
                            gridDef.grid_params.lon_last === 179.85;

            // Apply longitude shift for different models
            let adjustedCorners = corners;
            if (isGFSType) {
                adjustedCorners = {
                    lon_tl: corners.lon_tl - 180,
                    lat_tl: corners.lat_tl,
                    lon_tr: corners.lon_tr - 180,
                    lat_tr: corners.lat_tr,
                    lon_bl: corners.lon_bl - 180,
                    lat_bl: corners.lat_bl,
                    lon_br: corners.lon_br - 180,
                    lat_br: corners.lat_br
                };
                
                Object.keys(adjustedCorners).forEach(key => {
                    if (key.startsWith('lon_') && adjustedCorners[key] < -180) {
                        adjustedCorners[key] += 360;
                    }
                });
            } else if (isECMWFType) {
                adjustedCorners = {
                    lon_tl: corners.lon_tl >= 180 ? corners.lon_tl - 360 : corners.lon_tl,
                    lat_tl: corners.lat_tl,
                    lon_tr: corners.lon_tr >= 180 ? corners.lon_tr - 360 : corners.lon_tr,
                    lat_tr: corners.lat_tr,
                    lon_bl: corners.lon_bl >= 180 ? corners.lon_bl - 360 : corners.lon_bl,
                    lat_bl: corners.lat_bl,
                    lon_br: corners.lon_br >= 180 ? corners.lon_br - 360 : corners.lon_br,
                    lat_br: corners.lat_br
                };
            } else if (isGEMType) {
                adjustedCorners = corners;
            }
        
            const lonSpan = Math.abs(adjustedCorners.lon_tr - adjustedCorners.lon_tl);
            const isGlobalGrid = lonSpan >= 359 || isGEMType; 

            if (isGlobalGrid) {
                const totalWidth = subdivisions * 3;
                
                for (let row = 0; row <= subdivisions; row++) {
                    for (let col = 0; col <= totalWidth; col++) {
                        const tex_u = (col / subdivisions) - 1.0;
                        
                        let tex_v;
                        if (isGEMType) {
                            // FIX: Invert the V texture coordinate.
                            // The GEM data starts at the South Pole, so the texture's V coordinate
                            // needs to be flipped to match the geometry's top-to-bottom generation.
                            tex_v = 1.0 - (row / subdivisions); 
                        } else {
                            tex_v = isFlippedGrid ? (1.0 - row / subdivisions) : (row / subdivisions);
                        }
                    
                        
                        // Map to world longitude coordinates
                        let worldLonStart, worldLonEnd;
                        
                        if (isGEMType) {
                            // NEW: For GEM, don't shift the longitude range - use it as-is
                            // GEM goes from 180° to 179.85°, which should map to -180° to 179.85°
                            worldLonStart = adjustedCorners.lon_tl - 360; // This will be -180
                            worldLonEnd = adjustedCorners.lon_tr + 360;   // This will be ~539.85
                        } else {
                            worldLonStart = adjustedCorners.lon_tl - 360;
                            worldLonEnd = adjustedCorners.lon_tr + 360;
                        }
                        
                        const worldLonRange = worldLonEnd - worldLonStart;
                        const worldLon = worldLonStart + (col / totalWidth) * worldLonRange;
                        
                        const t_lat = row / subdivisions;
                        const worldLat = adjustedCorners.lat_tl + t_lat * (adjustedCorners.lat_bl - adjustedCorners.lat_tl);
                                                
                        if (!isFinite(worldLon) || !isFinite(worldLat)) {
                            continue;
                        }

                        const mercator = MercatorCoordinate.fromLngLat({ lon: worldLon, lat: worldLat });
                        if (!isFinite(mercator.x) || !isFinite(mercator.y)) {
                            continue;
                        }
                        
                        vertices.push(mercator.x, mercator.y, tex_u, tex_v);
                    }
                }
                
                // Generate indices for the extended grid
                const verticesPerRow = totalWidth + 1;
                for (let row = 0; row < subdivisions; row++) {
                    for (let col = 0; col < totalWidth; col++) {
                        const topLeft = row * verticesPerRow + col;
                        const topRight = topLeft + 1;
                        const bottomLeft = (row + 1) * verticesPerRow + col;
                        const bottomRight = bottomLeft + 1;
                        
                        // Make sure all vertices exist
                        if (bottomRight < vertices.length / 4) {
                            indices.push(topLeft, bottomLeft, topRight);
                            indices.push(topRight, bottomLeft, bottomRight);
                        }
                    }
                }
                
            } else {
                // Regional grid handling
                const adjustedCoordValues = [adjustedCorners.lon_tl, adjustedCorners.lat_tl, 
                                        adjustedCorners.lon_tr, adjustedCorners.lat_tr, 
                                        adjustedCorners.lon_bl, adjustedCorners.lat_bl, 
                                        adjustedCorners.lon_br, adjustedCorners.lat_br];
                
                if (adjustedCoordValues.some(coord => !isFinite(coord))) {
                    console.error('[GridLayer] Invalid adjusted corner coordinates:', adjustedCorners);
                    return;
                }
                
                // Additional validation: check if latitudes are in valid range
                const latValues = [adjustedCorners.lat_tl, adjustedCorners.lat_tr, adjustedCorners.lat_bl, adjustedCorners.lat_br];
                if (latValues.some(lat => lat < -90 || lat > 90)) {
                    console.error('[GridLayer] Invalid latitude values in corners:', adjustedCorners);
                    console.error('[GridLayer] Original corners were:', corners);
                    console.error('[GridLayer] Grid definition:', gridDef);
                    return;
                }
                
                // Calculate longitude span to handle wrapping
                const lonSpan = Math.abs(adjustedCorners.lon_tr - adjustedCorners.lon_tl);
                const crossesDateline = lonSpan > 180;
                
                for (let row = 0; row <= subdivisions; row++) {
                    for (let col = 0; col <= subdivisions; col++) {
                        const t_x = col / subdivisions;
                        const t_y = row / subdivisions;
                        
                        // UPDATED: Texture coordinate calculation with ICON model fix
                        let tex_u = t_x;
                        let tex_v;

                        if (isFlippedGrid && !isIconD2Type && !isIconEUType) {
                            tex_v = (1.0 - t_y); // Flip vertically for flipped grids or ICON models
                        } else {
                            tex_v = t_y; // Normal orientation
                        }
                        
                        // Calculate interpolated coordinates
                        let lon, lat;
                        
                        if (crossesDateline) {
                            // Handle dateline crossing with proper interpolation
                            let lon_tl = adjustedCorners.lon_tl;
                            let lon_tr = adjustedCorners.lon_tr;
                            let lon_bl = adjustedCorners.lon_bl;
                            let lon_br = adjustedCorners.lon_br;
                            
                            // Adjust for dateline crossing
                            if (lon_tr < lon_tl) lon_tr += 360;
                            if (lon_br < lon_bl) lon_br += 360;
                            
                            // Bilinear interpolation
                            lon = (1 - t_y) * ((1 - t_x) * lon_tl + t_x * lon_tr) +
                                t_y * ((1 - t_x) * lon_bl + t_x * lon_br);
                                
                            // Normalize back to [-180, 180]
                            while (lon > 180) lon -= 360;
                            while (lon < -180) lon += 360;
                        } else {
                            // Standard bilinear interpolation
                            lon = (1 - t_y) * ((1 - t_x) * adjustedCorners.lon_tl + t_x * adjustedCorners.lon_tr) +
                                t_y * ((1 - t_x) * adjustedCorners.lon_bl + t_x * adjustedCorners.lon_br);
                        }
                        
                        lat = (1 - t_y) * ((1 - t_x) * adjustedCorners.lat_tl + t_x * adjustedCorners.lat_tr) +
                            t_y * ((1 - t_x) * adjustedCorners.lat_bl + t_x * adjustedCorners.lat_br);

                        lat = Math.max(-MERCATOR_SAFE_LIMIT, Math.min(MERCATOR_SAFE_LIMIT, lat));

                        // Validate coordinates
                        if (!isFinite(lon) || !isFinite(lat)) {
                            console.error(`[GridLayer] Invalid interpolated coordinates at ${row},${col}: lon=${lon}, lat=${lat}`);
                            console.error(`[GridLayer] Interpolation inputs:`, {
                                t_x, t_y,
                                corners: adjustedCorners,
                                gridType: isGFSType ? 'GFS' : (isECMWFType ? 'ECMWF' : (isIconModel ? 'ICON' : 'OTHER'))
                            });
                            continue;
                        }

                        // Normalize longitude to [-180, 180] range
                        let normalizedLon = lon;
                        while (normalizedLon > 180) normalizedLon -= 360;
                        while (normalizedLon < -180) normalizedLon += 360;

                        const mercator = MercatorCoordinate.fromLngLat({ lon: normalizedLon, lat: lat });
                        
                        if (!isFinite(mercator.x) || !isFinite(mercator.y)) {
                            console.error(`[GridLayer] Invalid Mercator coordinates: x=${mercator.x}, y=${mercator.y}`);
                            continue;
                        }
                        
                        vertices.push(mercator.x, mercator.y, tex_u, tex_v);
                    }
                }
                
                // Generate indices (unchanged)
                for (let row = 0; row < subdivisions; row++) {
                    for (let col = 0; col < subdivisions; col++) {
                        const topLeft = row * (subdivisions + 1) + col;
                        const topRight = topLeft + 1;
                        const bottomLeft = (row + 1) * (subdivisions + 1) + col;
                        const bottomRight = bottomLeft + 1;
                        
                        indices.push(topLeft, bottomLeft, topRight);
                        indices.push(topRight, bottomLeft, bottomRight);
                    }
                }
            }

            const vertexData = new Float32Array(vertices);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            
            if (!this.indexBuffer) {
                this.indexBuffer = gl.createBuffer();
            }
            
            const indexData = new Uint16Array(indices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
            
            this.indexCount = indices.length;
            this.vertexCount = vertices.length / 4;
        } else if (gridType === 'rotated_latlon') {
            const projParams = gridDef.proj_params;
            const vertices = [];
            const indices = [];
            
            // Get grid bounds in rotated coordinates
            const { lon_first, lat_first, dx_degrees, dy_degrees, nx, ny } = gridDef.grid_params;
            const rot_lon_min = lon_first;
            const rot_lat_max = lat_first;
            const rot_lon_max = lon_first + (nx - 1) * dx_degrees;
            const rot_lat_min = lat_first + (ny - 1) * dy_degrees;

            
            // Test corner transformations to verify positioning
            const corners = [
                [rot_lon_min, rot_lat_max], // Top-left
                [rot_lon_max, rot_lat_max], // Top-right  
                [rot_lon_min, rot_lat_min], // Bottom-left
                [rot_lon_max, rot_lat_min]  // Bottom-right
            ];
            
            // Use manual oblique transformation for HRDPS
            for (let row = 0; row <= subdivisions; row++) {
                for (let col = 0; col <= subdivisions; col++) {
                    const t_x = col / subdivisions;
                    const t_y = row / subdivisions;
                    
                    // Interpolate in rotated coordinate space
                    const rot_lon = rot_lon_min + t_x * (rot_lon_max - rot_lon_min);
                    const rot_lat = rot_lat_max + t_y * (rot_lat_min - rot_lat_max);
                    
                    try {
                        // Use manual oblique transformation
                        const [lon, lat] = hrdpsObliqueTransform(rot_lon, rot_lat);
                        
                        if (!isFinite(lon) || !isFinite(lat)) {
                            console.warn(`[GridLayer] Invalid HRDPS transformed coordinates at ${row},${col}: lon=${lon}, lat=${lat}`);
                            continue;
                        }
                        
                        const clampedLat = Math.max(-MERCATOR_SAFE_LIMIT, Math.min(MERCATOR_SAFE_LIMIT, lat));
                        
                        const mercator = MercatorCoordinate.fromLngLat({ lon, lat: clampedLat });
                        
                        if (!isFinite(mercator.x) || !isFinite(mercator.y)) {
                            console.warn(`[GridLayer] Invalid HRDPS Mercator coordinates: x=${mercator.x}, y=${mercator.y}`);
                            continue;
                        }
                        
                        // Texture coordinates - corrected for HRDPS orientation
                        const tex_u = t_x;
                        const tex_v = 1.0 - t_y;  // Flipped for correct orientation
                        
                        vertices.push(mercator.x, mercator.y, tex_u, tex_v);
                        
                    } catch (error) {
                        console.warn(`[GridLayer] HRDPS manual transformation error at ${row},${col}:`, error);
                        continue;
                    }
                }
            }
            
            // Generate indices (same for both HRDPS and other rotated models)
            for (let row = 0; row < subdivisions; row++) {
                for (let col = 0; col < subdivisions; col++) {
                    const topLeft = row * (subdivisions + 1) + col;
                    const topRight = topLeft + 1;
                    const bottomLeft = (row + 1) * (subdivisions + 1) + col;
                    const bottomRight = bottomLeft + 1;
                    
                    // Only add triangles if we have enough vertices
                    if (bottomRight < vertices.length / 4) {
                        indices.push(topLeft, bottomLeft, topRight);
                        indices.push(topRight, bottomLeft, bottomRight);
                    }
                }
            }
            
            const vertexData = new Float32Array(vertices);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            
            if (!this.indexBuffer) {
                this.indexBuffer = gl.createBuffer();
            }
            
            const indexData = new Uint16Array(indices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
            
            this.indexCount = indices.length;
            this.vertexCount = vertices.length / 4;

        } else if (gridType === 'polar_stereographic') {
            const projParams = gridDef.proj_params;
            let projectionString = `+proj=${projParams.proj}`;
            Object.keys(projParams).forEach(key => {
                if (key !== 'proj') {
                    projectionString += ` +${key}=${projParams[key]}`;
                }
            });
            projectionString += ' +lat_0=90 +no_defs';
            
            const wgs84 = 'EPSG:4326';
            
            const { nx, ny, dx, dy, x_origin, y_origin } = gridDef.grid_params;
            
            const x_min = x_origin;
            const x_max = x_origin + (nx - 1) * dx;
            const y_max = y_origin;
            const y_min = y_origin + (ny - 1) * dy;

            const vertices = [];
            const indices = [];
            const vertexGrid = [];
            
            let validVertexCount = 0;

            // *** FIX: Declare lastLon outside the loops for continuous unwrapping ***
            let lastLon = NaN; 
            
            // First pass: generate valid vertices
            for (let row = 0; row <= subdivisions; row++) {
                vertexGrid[row] = [];
                // The line "let lastLon = NaN;" has been removed from here.

                for (let col = 0; col <= subdivisions; col++) {
                    const t_x = col / subdivisions;
                    const t_y = row / subdivisions;
                    
                    const proj_x = x_min + t_x * (x_max - x_min);
                    const proj_y = y_max + t_y * (y_min - y_max);
                    
                    try {
                        const [lon_raw, lat] = proj4(projectionString, wgs84, [proj_x, proj_y]);
                        
                        if (!isFinite(lon_raw) || !isFinite(lat)) {
                            vertexGrid[row][col] = null;
                            // Do not reset lastLon; just skip this point
                            continue;
                        }

                        if (lon_raw > 0) {
                            console.warn(`[GridLayer] Rejecting suspicious positive longitude: ${lon} at [${row},${col}]`);
                            vertexGrid[row][col] = null;
                            continue;
                        }
                        
                        let lon = lon_raw;

                        // Unwrap longitude to create a continuous mesh.
                        // This logic now works correctly across rows.
                        if (!isNaN(lastLon)) {
                            while (lon - lastLon > 180) { lon -= 360; }
                            while (lastLon - lon > 180) { lon += 360; }
                        }
                        lastLon = lon; // Update lastLon for the next vertex
                        
                        const clampedLat = Math.max(-MERCATOR_SAFE_LIMIT, Math.min(MERCATOR_SAFE_LIMIT, lat));
                        
                        const mercator = MercatorCoordinate.fromLngLat({ lon: lon, lat: clampedLat });
                        
                        if (!isFinite(mercator.x) || !isFinite(mercator.y)) {
                            vertexGrid[row][col] = null;
                            continue;
                        }
                        
                        const tex_u = t_x;
                        const tex_v = t_y;
                        
                        vertexGrid[row][col] = {
                            mercator_x: mercator.x,
                            mercator_y: mercator.y,
                            tex_u: tex_u,
                            tex_v: tex_v,
                            vertexIndex: validVertexCount
                        };
                        
                        vertices.push(mercator.x, mercator.y, tex_u, tex_v);
                        validVertexCount++;
                        
                    } catch (error) {
                        vertexGrid[row][col] = null;
                        continue;
                    }
                }
            }

            if (vertices.length === 0) {
                console.error(`[GridLayer] No valid vertices generated for polar stereographic model`);
                return;
            }
            
            // Second pass: generate indices (this logic remains the same)
            for (let row = 0; row < subdivisions; row++) {
                for (let col = 0; col < subdivisions; col++) {
                    const topLeft = vertexGrid[row][col];
                    const topRight = vertexGrid[row][col + 1];
                    const bottomLeft = vertexGrid[row + 1][col];
                    const bottomRight = vertexGrid[row + 1][col + 1];
                    
                    if (topLeft && topRight && bottomLeft && bottomRight) {
                        indices.push(
                            topLeft.vertexIndex, 
                            bottomLeft.vertexIndex, 
                            topRight.vertexIndex
                        );
                        indices.push(
                            topRight.vertexIndex, 
                            bottomLeft.vertexIndex, 
                            bottomRight.vertexIndex
                        );
                    }
                }
            }
            
            // (Final buffer data setup remains the same)
            const vertexData = new Float32Array(vertices);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            
            if (!this.indexBuffer) {
                this.indexBuffer = gl.createBuffer();
            }
            
            const indexData = new Uint16Array(indices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
            
            this.indexCount = indices.length;
            this.vertexCount = vertices.length / 4;

        } else if (gridType === 'lambert_conformal_conic') {
            const projParams = gridDef.proj_params;
            let projectionString = `+proj=${projParams.proj}`;
            Object.keys(projParams).forEach(key => {
                if (key !== 'proj') {
                    projectionString += ` +${key}=${projParams[key]}`;
                }
            });
            projectionString += ' +no_defs';
            
            const wgs84 = 'EPSG:4326';
            
            const { nx, ny, dx, dy, x_origin, y_origin } = gridDef.grid_params;
            
            // Calculate grid bounds in projected coordinates
            const x_min = x_origin;
            const y_max = y_origin;
            const x_max = x_origin + (nx - 1) * dx;
            const y_min = y_origin + (ny - 1) * dy;

            const vertices = [];
            const indices = [];
            
            // Track valid bounds
            let validMinLon = Infinity, validMaxLon = -Infinity;
            let validMinLat = Infinity, validMaxLat = -Infinity;
            let validVertexCount = 0;
            
            // Create a sparse vertex array to handle gaps in valid projections
            const vertexGrid = [];
            const subdivisionsPlusOne = subdivisions + 1;
            
            // Initialize vertex grid
            for (let row = 0; row <= subdivisions; row++) {
                vertexGrid[row] = [];
            }
            
            // First pass: generate valid vertices and store their grid positions
            for (let row = 0; row <= subdivisions; row++) {
                for (let col = 0; col <= subdivisions; col++) {
                    const t_x = col / subdivisions;
                    const t_y = row / subdivisions;
                    
                    const proj_x = x_min + t_x * (x_max - x_min);
                    const proj_y = y_max + t_y * (y_min - y_max);
                    
                    try {
                        const [lon, lat] = proj4(projectionString, wgs84, [proj_x, proj_y]);

                        if (lon > 0) {
                            console.warn(`[GridLayer] Rejecting suspicious positive longitude: ${lon} at [${row},${col}]`);
                            vertexGrid[row][col] = null;
                            continue;
                        }
                        
                        // Track valid bounds
                        validMinLon = Math.min(validMinLon, lon);
                        validMaxLon = Math.max(validMaxLon, lon);
                        validMinLat = Math.min(validMinLat, lat);
                        validMaxLat = Math.max(validMaxLat, lat);
                        
                        const mercator = MercatorCoordinate.fromLngLat({ lon: lon, lat: lat });
                        
                        if (!isFinite(mercator.x) || !isFinite(mercator.y)) {
                            vertexGrid[row][col] = null;
                            continue;
                        }
                        
                        const tex_u = t_x;
                        const tex_v = t_y;
                        
                        // Store vertex info in grid
                        vertexGrid[row][col] = {
                            mercator_x: mercator.x,
                            mercator_y: mercator.y,
                            tex_u: tex_u,
                            tex_v: tex_v,
                            vertexIndex: validVertexCount
                        };
                        
                        vertices.push(mercator.x, mercator.y, tex_u, tex_v);
                        validVertexCount++;
                        
                    } catch (error) {
                        console.warn(`[GridLayer] Projection error at [${row},${col}] with coords [${proj_x}, ${proj_y}]:`, error);
                        vertexGrid[row][col] = null;
                        continue;
                    }
                }
            }

            if (vertices.length === 0) {
                console.error(`[GridLayer] No valid vertices generated for ${this.modelName}`);
                return;
            }
            
            // Second pass: generate indices only for quads where all 4 vertices are valid
            for (let row = 0; row < subdivisions; row++) {
                for (let col = 0; col < subdivisions; col++) {
                    const topLeft = vertexGrid[row][col];
                    const topRight = vertexGrid[row][col + 1];
                    const bottomLeft = vertexGrid[row + 1][col];
                    const bottomRight = vertexGrid[row + 1][col + 1];
                    
                    // Only create triangles if all 4 vertices are valid
                    if (topLeft && topRight && bottomLeft && bottomRight) {
                        // Create two triangles for the quad
                        indices.push(
                            topLeft.vertexIndex, 
                            bottomLeft.vertexIndex, 
                            topRight.vertexIndex
                        );
                        indices.push(
                            topRight.vertexIndex, 
                            bottomLeft.vertexIndex, 
                            bottomRight.vertexIndex
                        );
                    }
                }
            }
            
            // Check for potential dateline issues and log them
            if (validMaxLon - validMinLon > 180) {
                console.warn(`[GridLayer] ${this.modelName} longitude span is ${(validMaxLon - validMinLon).toFixed(2)}° - this might indicate projection issues`);
            }
            
            const vertexData = new Float32Array(vertices);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
            
            if (!this.indexBuffer) {
                this.indexBuffer = gl.createBuffer();
            }
            
            const indexData = new Uint16Array(indices);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indexData, gl.STATIC_DRAW);
            
            this.indexCount = indices.length;
            this.vertexCount = vertices.length / 4;

        } else {
            console.error(`[GridLayer] Unsupported grid type: ${gridType}`);
            return;
        }
    }

     updateDataTexture(data, encoding, width, height) {
        // Exit if the WebGL context isn't available
        if (!this.gl) return;

        // Store the encoding and dimensions for use in the render loop
        this.encoding = encoding;
        this.textureWidth = width;
        this.textureHeight = height;

        // The raw grid data is an array of signed 8-bit integers (-128 to 127).
        // To use it in a LUMINANCE texture, we must convert it to an unsigned
        // 8-bit range (0 to 255) by adding 128 to each value.
        const transformedData = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const signedValue = data[i] > 127 ? data[i] - 256 : data[i];
            transformedData[i] = signedValue + 128;
        }

        // Bind the texture we want to work with
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTexture);

        // Tell WebGL to expect 1-byte alignment for our luminance data.
        // This is a crucial step for non-RGBA textures.
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);

        // Upload the pixel data to the GPU
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, transformedData);

        // --- THIS IS THE FIX ---
        // Change texture filtering from LINEAR to NEAREST. This prevents the GPU
        // from interpolating between valid data and missing data at the edges,
        // which was causing the colorful artifacts.
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        // We can keep CLAMP_TO_EDGE as it's the correct wrapping mode for
        // regional, non-repeating data.
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE); // Horizontal wrap
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE); // Vertical wrap
    }
    
    updateColormapTexture(colormap) {
        if (!this.gl) return;
        const width = 256; const data = new Uint8Array(width * 4);
        const stops = colormap.reduce((acc, _, i) => (i % 2 === 0 ? [...acc, { value: colormap[i], color: colormap[i + 1] }] : acc), []);
        if (stops.length === 0) return;
        const minVal = stops[0].value; const maxVal = stops[stops.length - 1].value;
        const hexToRgb = hex => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
        for (let i = 0; i < width; i++) {
            const val = minVal + (i / (width - 1)) * (maxVal - minVal);
            let lower = stops[0], upper = stops[stops.length-1];
            for (let j=0; j<stops.length - 1; j++) { if (val >= stops[j].value && val <= stops[j+1].value) { lower=stops[j]; upper=stops[j+1]; break; } }
            const t = (val - lower.value) / (upper.value - lower.value || 1);
            const rgb = hexToRgb(lower.color).map((c, idx) => c * (1 - t) + hexToRgb(upper.color)[idx] * t);
            data.set(rgb, i * 4); data[i * 4 + 3] = 255;
        }
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.colormapTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, width, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, data);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    }

    updateStyle({ opacity, dataRange }) {
        if (opacity !== undefined) this.opacity = opacity;
        if (dataRange !== undefined) this.dataRange = dataRange;
    }
    
    setUnitConversion(fromUnit, targetSystem) {
        let conversionType = 0; // Default: no conversion
        const unit = (fromUnit || '').toLowerCase();
        if ((unit.includes('c') || unit.includes('f'))) {
            if (targetSystem === 'metric') conversionType = 1; // to C (no-op)
            else if (targetSystem === 'imperial') conversionType = 2; // to F
        }
        this.currentConversion.type = conversionType;
        if (this.map) this.map.triggerRepaint();
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
        if (!this.gl) return;
        if (this.program) this.gl.deleteProgram(this.program);
        if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
        if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
        if (this.dataTexture) this.gl.deleteTexture(this.dataTexture);
        if (this.colormapTexture) this.gl.deleteTexture(this.colormapTexture);
    }
}