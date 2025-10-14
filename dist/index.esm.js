import { MercatorCoordinate } from 'mapbox-gl';
import proj4 from 'proj4';

// aguacero-api/src/events.js

/**
 * A simple class for emitting and listening to events.
 */
class EventEmitter {
    constructor() {
        this.callbacks = {};
    }
    on(event, cb) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(cb);
    }
    emit(event, data) {
        let cbs = this.callbacks[event];
        if (cbs) {
            cbs.forEach(cb => cb(data));
        }
    }
}

const MERCATOR_SAFE_LIMIT = 89;

function hrdpsObliqueTransform$1(rotated_lon, rotated_lat) {
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

class GridRenderLayer {
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
        this.noSmoothing = false;
    }

    setSmoothing(noSmoothing) {
        this.noSmoothing = noSmoothing;
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

            uniform vec2 u_texture_size; 
            uniform bool u_no_smoothing;

            uniform float u_scale;
            uniform float u_offset;
            uniform float u_missing_quantized;

            uniform float u_opacity;
            uniform vec2 u_data_range;
            uniform int u_conversion_type;

            float get_value(vec2 coord) {
                float value_0_to_255 = texture2D(u_data_texture, coord).r * 255.0;
                float val = value_0_to_255 - 128.0;

                if (abs(val - u_missing_quantized) < 0.5) {
                    return 99999.0;
                }
                return val;
            }

            float convert_units(float raw_value) {
                if (u_conversion_type == 1) return raw_value;
                if (u_conversion_type == 2) return raw_value * 1.8 + 32.0;
                return raw_value;
            }

            void main() {
                float quantized_value;
                float total_weight = 1.0; // Default to 1.0 for the non-smoothed case

                if (u_no_smoothing) {
                    quantized_value = get_value(v_texCoord);
                } else {
                    vec2 tex_coord_in_texels = v_texCoord * u_texture_size;
                    vec2 bl_texel_index = floor(tex_coord_in_texels - 0.5);
                    vec2 f = fract(tex_coord_in_texels - 0.5);

                    vec2 texel_size = 1.0 / u_texture_size;
                    vec2 v00_coord = (bl_texel_index + vec2(0.5, 0.5)) * texel_size;
                    vec2 v10_coord = (bl_texel_index + vec2(1.5, 0.5)) * texel_size;
                    vec2 v01_coord = (bl_texel_index + vec2(0.5, 1.5)) * texel_size;
                    vec2 v11_coord = (bl_texel_index + vec2(1.5, 1.5)) * texel_size;

                    float v00 = get_value(v00_coord);
                    float v10 = get_value(v10_coord);
                    float v01 = get_value(v01_coord);
                    float v11 = get_value(v11_coord);
                    
                    float total_value = 0.0;
                    total_weight = 0.0; // Reset for accumulation

                    if (v00 < 99999.0) {
                        float weight = (1.0 - f.x) * (1.0 - f.y);
                        total_value += v00 * weight;
                        total_weight += weight;
                    }
                    if (v10 < 99999.0) {
                        float weight = f.x * (1.0 - f.y);
                        total_value += v10 * weight;
                        total_weight += weight;
                    }
                    if (v01 < 99999.0) {
                        float weight = (1.0 - f.x) * f.y;
                        total_value += v01 * weight;
                        total_weight += weight;
                    }
                    if (v11 < 99999.0) {
                        float weight = f.x * f.y;
                        total_value += v11 * weight;
                        total_weight += weight;
                    }

                    if (total_weight <= 0.0) {
                        discard;
                    }
                    
                    quantized_value = total_value / total_weight;
                }

                if (quantized_value >= 99999.0) {
                    discard;
                }

                float raw_value = quantized_value * u_scale + u_offset;
                float converted_value = convert_units(raw_value);

                if (converted_value < u_data_range.x) {
                    discard;
                }
                
                float colormap_coord = (converted_value - u_data_range.x) / (u_data_range.y - u_data_range.x);
                vec4 color = texture2D(u_colormap_texture, vec2(colormap_coord, 0.5));
                
                if (color.a < 0.1) {
                    discard;
                }

                // --- THE FINAL FIX ---
                // The alpha is the color's alpha modulated by the total weight of valid neighbors.
                // This naturally feathers the edge from opaque (weight=1) to transparent (weight=0).
                float final_alpha = color.a * u_opacity * total_weight;

                gl_FragColor = vec4(color.rgb, final_alpha);
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
        this.u_no_smoothing = gl.getUniformLocation(this.program, "u_no_smoothing");

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
                            gridDef.grid_params.lat_first === -90 &&
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
                            tex_v = (1.0 - t_y);
                        } else {
                            tex_v = t_y;
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
            gridDef.proj_params;
            const vertices = [];
            const indices = [];
            
            // Get grid bounds in rotated coordinates
            const { lon_first, lat_first, dx_degrees, dy_degrees, nx, ny } = gridDef.grid_params;
            const rot_lon_min = lon_first;
            const rot_lat_max = lat_first;
            const rot_lon_max = lon_first + (nx - 1) * dx_degrees;
            const rot_lat_min = lat_first + (ny - 1) * dy_degrees;
            
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
                        const [lon, lat] = hrdpsObliqueTransform$1(rot_lon, rot_lat);
                        
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

    updateDataTexture(data, encoding, width, height, options = {}) {
        if (!this.gl) return;

        this.encoding = encoding;
        this.textureWidth = width;
        this.textureHeight = height;

        const transformedData = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            const signedValue = data[i] > 127 ? data[i] - 256 : data[i];
            transformedData[i] = signedValue + 128;
        }

        this.gl.bindTexture(this.gl.TEXTURE_2D, this.dataTexture);
        this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, 1);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, width, height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, transformedData);

        // --- EDITED: ALWAYS use NEAREST filtering. ---
        // The shader will now handle all smoothing logic.
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
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
        gl.uniform1i(this.u_no_smoothing, this.noSmoothing);
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

const COORDINATE_CONFIGS = {
    'arome1': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2801,
            'ny': 1791,
            'dx_degrees': 0.01,
            'dy_degrees': 0.01,
            'lon_first': 348.0,
            'lat_first': 55.4,
            'lon_last': 16.0,
            'lat_last': 37.5
        }
    },
    'arome25': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1121,
            'ny': 717,
            'dx_degrees': 0.025,
            'dy_degrees': 0.025,
            'lon_first': 348.0,
            'lat_first': 55.4,
            'lon_last': 16.0,
            'lat_last': 37.5
        }
    },
    'arpegeeu': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 741,
            'ny': 521,
            'dx_degrees': 0.1,
            'dy_degrees': 0.1,
            'lon_first': 328.0,
            'lat_first': 72.0,
            'lon_last': 42.0,
            'lat_last': 20.0
        }
    },
    'arw': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 1473,
            'ny': 1025,
            'dx': 5079.0,
            'dy': -5079,
            'x_origin': -4228646.497,
            'y_origin': 4370737.239
        }
    },
    'ecmwf': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1440,
            'ny': 721,
            'dx_degrees': 0.25,
            'dy_degrees': 0.25,
            'lon_first': 180.0,
            'lat_first': 90.0,
            'lon_last': 179.75,
            'lat_last': -90
        }
    },
    'gefs': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 720,
            'ny': 361,
            'dx_degrees': 0.5,
            'dy_degrees': 0.5,
            'lon_first': 0.0,
            'lat_first': 90.0,
            'lon_last': 359.5,
            'lat_last': -90
        }
    },
    'gem': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2400,
            'ny': 1201,
            'dx_degrees': 0.15,
            'dy_degrees': 0.15,
            'lon_first': 180.0,
            'lat_first': -90,
            'lon_last': 179.85,
            'lat_last': 90.0
        }
    },
    'gfs': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1440,
            'ny': 721,
            'dx_degrees': 0.25,
            'dy_degrees': 0.25,
            'lon_first': 0.0,
            'lat_first': -90,
            'lon_last': 359.75,
            'lat_last': 90.0
        }
    },
    'hrdps': {
        'type': 'rotated_latlon',
        'proj_params': {
            'proj': 'ob_tran',
            'o_proj': 'longlat',
            'o_lat_p': 53.91148,
            'o_lon_p': 245.305142,
            'lon_0': 0,
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 2540,
            'ny': 1290,
            'dx_degrees': 0.0225,
            'dy_degrees': -0.0225,
            'lon_first': -14.83247,
            'lat_first': 16.7112510,
            'lon_last': 42.3175330,
            'lat_last': -12.313751
        }
    },
    'hrrr': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 38.5,
            'lat_2': 38.5,
            'lat_0': 38.5,
            'lon_0': -97.5,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 1799,
            'ny': 1059,
            'dx': 3000.0,
            'dy': -3e3,
            'x_origin': -2699020.14252193,
            'y_origin': 1588193.847443335689604
        },
    },
    'icond2': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1215,
            'ny': 746,
            'dx_degrees': 0.02,
            'dy_degrees': 0.02,
            'lon_first': 356.06,
            'lat_first': 43.18,
            'lon_last': 20.34,
            'lat_last': 58.08
        }
    },
    'iconeu': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1377,
            'ny': 657,
            'dx_degrees': 0.0625,
            'dy_degrees': 0.0625,
            'lon_first': 336.5,
            'lat_first': 29.5,
            'lon_last': 62.5,
            'lat_last': 70.5
        }
    },
    'nam': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 50.0,
            'lat_2': 50.0,
            'lat_0': 50.0,
            'lon_0': -107,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 349,
            'ny': 277,
            'dx': 32463.0,
            'dy': -32463,
            'x_origin': -5648899.364,
            'y_origin': 4363452.854
        }
    },
    'rap': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 451,
            'ny': 337,
            'dx': 13545.0,
            'dy': -13545,
            'x_origin': -3338927.789,
            'y_origin': 3968999.735
        }
    },
    'rgem': {
        'type': 'polar_stereographic',
        'proj_params': {
            'proj': 'stere',
            'lat_ts': 60.0,
            'lon_0': -111,
            'x_0': 0,
            'y_0': 0,
            'R': 6371229,
            'units': 'm'
        },
        'grid_params': {
            'nx': 935,
            'ny': 824,
            'dx': 10000.0,
            'dy': -1e4,
            'x_origin': -4556441.403,
            'y_origin': 920682.141
        }
    },
    'hwrf': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 601,
            'ny': 601,
            'dx_degrees': 0.015,
            'dy_degrees': 0.015,
        }
    },
    'hmon': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 450,
            'ny': 375,
            'dx_degrees': 0.02,
            'dy_degrees': 0.02,
        }
    },
    'hfsa': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1001,
            'ny': 801,
            'dx_degrees': 0.019999,
            'dy_degrees': 0.019999,
        }
    },
    'hfsb': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 1001,
            'ny': 801,
            'dx_degrees': 0.019999,
            'dy_degrees': 0.019999,
        }
    },
    'rtma': {
        'type': 'lambert_conformal_conic',
        'proj_params': {
            'proj': 'lcc',
            'lat_1': 25.0,
            'lat_2': 25.0,
            'lat_0': 25.0,
            'lon_0': -95,
            'x_0': 0,
            'y_0': 0,
            'R': 6371200, 
        },
        'grid_params': {
            'nx': 2345,
            'ny': 1597,
            'dx': 2539.703,
            'dy': -2539.703,
            'x_origin': -3272421.457,
            'y_origin': 3790842.106
        }
    },
    'mrms': {
        'type': 'latlon',
        'proj_params': {
            'proj': 'longlat',
            'datum': 'WGS84'
        },
        'grid_params': {
            'nx': 7000,
            'ny': 3500,
            'dx_degrees': 0.01,
            'dy_degrees': 0.01,
            'lon_first': 230.005,
            'lat_first': 54.995,
            'lon_last': 299.994998,
            'lat_last': 20.005001
        }
    },
};

/**
 * A utility module for converting between different physical units.
 * Contains a comprehensive object of conversion functions and a helper
 * to retrieve the correct function based on unit names.
 */

// The main object containing all the raw conversion functions.
const unitConversions = {
    kelvin_to_celsius: (data) => data - 273.15,
    kelvin_to_fahrenheit: (data) => (data - 273.15) * 9/5 + 32,
    kelvin_to_c: (data) => data - 273.15,
    kelvin_to_f: (data) => (data - 273.15) * 9/5 + 32,
    k_to_celsius: (data) => data - 273.15,
    k_to_fahrenheit: (data) => (data - 273.15) * 9/5 + 32,
    k_to_c: (data) => data - 273.15,
    k_to_f: (data) => (data - 273.15) * 9/5 + 32,
    celsius_to_fahrenheit: (data) => (data * 9/5) + 32,
    celsius_to_f: (data) => (data * 9/5) + 32,
    c_to_fahrenheit: (data) => (data * 9/5) + 32,
    c_to_f: (data) => (data * 9/5) + 32,
    fahrenheit_to_celsius: (data) => (data - 32) * 5/9,
    fahrenheit_to_c: (data) => (data - 32) * 5/9,
    f_to_celsius: (data) => (data - 32) * 5/9,
    f_to_c: (data) => (data - 32) * 5/9,
    meters_to_feet: (data) => data * 3.28084,
    meters_to_km: (data) => data / 1000,
    m_to_feet: (data) => data * 3.28084,
    m_to_ft: (data) => data * 3.28084,
    m_to_km: (data) => data / 1000,
    kts_to_mph: (data) => data * 1.15078,
    mph_to_kts: (data) => data / 1.15078,
    kts_to_ms: (data) => data / 1.94384449,
    mph_to_ms: (data) => data / 2.23693629,
    ms_to_mph: (data) => data * 2.23694,
    ms_to_kts: (data) => data * 1.94384,
    kts_to_kmh: (data) => data * 1.852,
    mph_to_kmh: (data) => data * 1.60934,
    ms_to_kmh: (data) => data * 3.6,
    kmh_to_kts: (data) => data / 1.852,
    kmh_to_mph: (data) => data / 1.60934,
    kmh_to_ms: (data) => data / 3.6,
    inches_to_mm: (data) => data * 25.4,
    inches_to_cm: (data) => data * 2.54,
    in_to_mm: (data) => data * 25.4,
    in_to_cm: (data) => data * 2.54,
    mm_to_in: (data) => data / 25.4,
    mm_to_inches: (data) => data / 25.4,
    cm_to_in: (data) => data / 2.54,
    cm_to_inches: (data) => data / 2.54,
    inhr_to_mmhr: (data) => data * 25.4,
    inhr_to_cmhr: (data) => data * 2.54,
    in_hr_to_mm_hr: (data) => data * 25.4,
    in_hr_to_cm_hr: (data) => data * 2.54,
    mmhr_to_inhr: (data) => data / 25.4,
    cmhr_to_inhr: (data) => data / 2.54,
    mm_hr_to_in_hr: (data) => data / 25.4,
    cm_hr_to_in_hr: (data) => data / 2.54,
    mmhr_to_cmhr: (data) => data / 10,
    cmhr_to_mmhr: (data) => data * 10,
    mm_hr_to_cm_hr: (data) => data / 10,
    cm_hr_to_mm_hr: (data) => data * 10
};

/**
 * Finds and returns the correct conversion function based on "from" and "to" unit strings.
 * It normalizes common unit abbreviations to a consistent key.
 * @param {string} fromUnit - The starting unit (e.g., 'kelvin', '°C', 'kts').
 * @param {string} toUnit - The target unit (e.g., 'fahrenheit', '°F', 'mph').
 * @returns {function(number): number | null} The conversion function, or null if not found.
 */
function getUnitConversionFunction(fromUnit, toUnit) {
    // A map to standardize various unit string formats to a single key format.
    const unitMap = {
        '°c': 'c', '°f': 'f', '°k': 'k',
        'celsius': 'c', 'fahrenheit': 'f', 'kelvin': 'k',
        'c': 'c', 'f': 'f', 'k': 'k', '°F': 'f', '°C': 'c',
        'kts': 'kts', 'm/s': 'ms', 'mph': 'mph', 'km/h': 'kmh',
        'knots': 'kts',
        'ft': 'ft', 'feet': 'ft',
        'km': 'km',
        'mm': 'mm',
        'cm': 'cm',
        'm': 'm', 'meters': 'm',
        'in/hr': 'inhr', 'mm/hr': 'mmhr', 'cm/hr': 'cmhr',
        'in': 'in', 'inches': 'in'
    };
    
    // Cleans and standardizes the input unit string.
    const normalizeUnit = (unit) => {
        if (!unit) return '';
        const lowerUnit = unit.toLowerCase().trim();
        return unitMap[lowerUnit] || lowerUnit;
    };
    
    const fromNormalized = normalizeUnit(fromUnit);
    const toNormalized = normalizeUnit(toUnit);
    
    // Constructs the key to look up in the `unitConversions` object (e.g., 'k_to_f').
    const conversionKey = `${fromNormalized}_to_${toNormalized}`;
    
    // Return the function if it exists, otherwise return null.
    return unitConversions[conversionKey] || null;
}

const MODEL_CONFIGS = {
    'mrms': {
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
        name: 'MRMS',
    },
    'arome1': {
        bounds: [-12, 37.5, 16, 55.4],
        max_zoom: 7,
        vars: ['csnow_total', 'gust_runmax', 'rainRefl', 'snowRefl', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'irsat', 'refc_0', 'hcc_0', 'mcc_0', 'lcc_0', 'thetaE', 'atemp', 'vo_10', '2t_2', 'gust_0', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'AROME 1km',
        skewt: false,
        pressureLvls: [
        ],
        order: 12,
    },
    'arome25': {
        bounds: [-12, 37.5, 16, 55.4],
        max_zoom: 7,
        vars: ['csnow_total', 'gust_runmax', 'rainRefl', 'snowRefl', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'd_850', 'd_925', 'fgen_700', 'fgen_850', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'lapse_rates_500700', 'mslma_0', 't_700', 't_850', 't_925', 'tadv_700', 'tadv_850', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', 'refc_500', 'hcc_0', 'mcc_0', 'lcc_0', 'thetaE', 'atemp', 'vo_10', '2t_2', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'AROME 2.5km',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 1000
        ], 
        order: 13,
    },
    'arw': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', '2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'WRF-ARW',
        skewt: true,
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 5,
    },
    'arw2': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'WRF-ARW2',
        skewt: true,
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 6,
    },
    'fv3': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'ehi_1000', 'ehi_3000', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'moistureConvergence', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'mxuphl_5000', 'mxuphl_5000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0',  'refc_0', 'stp', 'supercellComposite', 't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tcc_0', 'thetaE', 'thickness', 'tp_0_total',         'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'HRW FV3',
        skewt: true,  
        pressureLvls: [
            200, 250, 300, 350, 400, 450, 500, 525, 550, 575, 
            600, 625, 650, 675, 700, 725, 750, 775, 800, 825, 
            850, 875, 900, 925, 950, 975, 1000
        ],
        order: 4,
    },
    'hrdps': {
        bounds: [-152.730672, 27.284598, -40.70856, 70.61148],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'mslma_0', 'gh_850',  'tcc_0',  'wind_speed_10', '2t_2', 'gh_700', 'lcl', 'crain', 'csnow', 'cicep', 'cfrzr', 't_850', 't_850iso0', 'wind_speed_925', 't_925', 't_925iso0', 'gh_500', '2d_2', 'wind_speed_700', 'cape_0', 'thickness', 'atemp', 'wind_speed_500', 'gust_0', 'lapse_rates_500700', 'gh_925', '2r_2', 'wind_speed_850',  't_500',   'thetaE', 't_700', 't_700iso0', 'wind_direction_10'],
        category: 'Mesoscale',
        name: 'HRDPS',
        skewt: false,
        order: 11,
    },
    'hrrr': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'skewt', 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12',  'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'bulk_shear_speed_0-6000', 'gh_500', 'irsat', 'lcl', 'stp', 't_850', 't_850iso0', 'cape_0',  'gh_700', 'gh_925', 'supercellComposite',  'lcc_0', 'lftx_500', 'ltng_0', 'mslma_0', 'thetaE',  'hcc_0', 't_700', 't_700iso0', 'w_850', 'cape_0-3000', 'atemp',   'wind_speed_925', 't_925', 't_925iso0', 'w_700', 'tts', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_700', 'refc_0',   'tehi', '2t_2', 'mxuphl_5000', 'mxuphl_5000_runmax', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_500', 'wind_speed_850', 'tcc_0', 'cin_0', 'ehi_3000', 'mcc_0',  'cin_25500', 'gh_850', 'vo_10', '2r_2', 'tadv_700', 'moistureConvergence', 'hlcy_3000', 'lapse_rates_500700', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',  'hlcy_1000', 'pwat_0',  'cin_9000', 'cape_9000', 'ehi_1000', 'wind_speed_10', '2d_2', 'cape_25500', 'thickness', 'tadv_850', 'bulk_shear_speed_0-1000'],
        category: 'Mesoscale',
        name: 'HRRR',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 1,
    },
    'hrrrsub': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', 'uphl_5000', '2t_2', '2d_2', 'irsat', 'wind_speed_10', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'refc_0', 'atemp'],
        category: 'Mesoscale',
        name: 'HRRR Sub-Hourly',
        pressureLvls: [],
        skewt: false,
        order: 2,
    },
    'icond2': {
        bounds: [-3.9399999999999977, 43.18, 20.34, 58.08],
        max_zoom: 7,
        vars: ['bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_3hr','csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'lcc_0', '2t_2', 't_500', 'hcc_0', 'wind_speed_700', 'mslma_0',  'atemp','t_700', 't_700iso0', 'cape_9000', 'lcl', '2d_2',  'mcc_0',  'wind_speed_10', 'lapse_rates_500700', '2r_2', 'crain', 'csnow', 'cicep', 'cfrzr', 'tcc_0', 'wind_speed_850', 't_850', 't_850iso0',  'wind_speed_500', 'thetaE',],
        category: 'Mesoscale',
        name: 'ICON-D2',
        skewt: false,
        order: 14,
    },
    'mpashn': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HN',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 7,
    },
    'mpasht': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HT',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 8,
    },
    'mpasrt': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RT',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 9
    },
    'mpasrn': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RN',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 7,
    },
    'mpasrn3': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-RN3',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 8,
    },
    'mpasht2': {
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'hlcy_3000',  'wind_speed_925', 't_925', 't_925iso0',  'mxuphl_500', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',   'bulk_shear_speed_0-1000', 'cin_25500', 'pwat_0', '10v_10', '2t_2', 'tcc_0', 'gh_925', 'gh_850',  'wind_speed_850', 'ehi_3000', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_10', 'cape_9000',  't_850', 't_850iso0', 'lapse_rates_500700', 'bulk_shear_speed_0-6000', 'cape_25500', '2d_2', 'gh_700', 'ltng_2', 'mcc_0', 'stp', 'crain', 'csnow', 'cicep', 'cfrzr',  'atemp', '2r_2',  'cin_9000', 'thickness', 'ehi_1000', 'thetaE', 'lcl', 'hcc_0', 'mxuphl_5000', 'mxuphl_5000_runmax', 'wind_speed_500', 'cape_0', '10u_10', 'wind_speed_700', 'gh_500', 'supercellComposite', 'gust_0', 'mslma_0', 'lcc_0', 'mxuphl_1000',  'refc_0', 'cin_0', 'lftx_500', 'd_all_lvls', 't_700', 't_700iso0', 'hlcy_1000', 'moistureConvergence'],
        category: 'Mesoscale',
        name: 'NSSL MPAS-HTPO',
        skewt: false,
        pressureLvls: [250, 500, 700, 750, 800, 850, 900, 925, 950, 1000],
        order: 9
    },
    'namnest': {
        bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
        max_zoom: 7,
        vars: ['refd_1000', 'vis_0', 'mxrefc_1000', 'gust_runmax', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cape_25500', 'cin_9000', 'cin_25500', 'd_850', 'd_925', 'ehi_1000', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'irsat', 'ivt', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'mcc_0', 'mean700300mbRH', 'mslma_0', 'mxuphl_3000', 'mxuphl_3000_runmax', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 'supercellComposite', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'thetaE', 'thickness',   'vo_10', 'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',         'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Mesoscale',
        name: 'NAM 3km CONUS',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 
            400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 
            700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000
        ],
        order: 3,
    },
    'rrfs': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['vis_0', 'gust_runmax', 'tts', 'tehi', 'cape_0-3000', 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'bulk_shear_speed_0-6000', 'gh_500', 'irsat', 'lcl', 'stp', 't_850', 't_850iso0', 'cape_0', 'gh_700', 'gh_925', 'supercellComposite',  'lcc_0', 'lftx_500', 'mslma_0', 'thetaE',  'hcc_0', 't_700', 't_700iso0', 'atemp',   'wind_speed_925', 't_925', 't_925iso0', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_700', 'refc_0',   '2t_2', 'mxuphl_3000', 'mxuphl_3000_runmax', 'wind_speed_500', 'wind_speed_850', 'tcc_0', 'cin_0', 'ehi_3000', 'mcc_0',  'cin_25500', 'gh_850', 'vo_10', '2r_2', 'tadv_700', 'moistureConvergence', 'hlcy_3000', 'lapse_rates_500700', 'gust_0', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl',  'hlcy_1000', 'pwat_0',  'cin_9000', 'cape_9000', 'ehi_1000', 'wind_speed_10', '2d_2', 'cape_25500', 'thickness', 'tadv_850', 'bulk_shear_speed_0-1000'],
        category: 'Mesoscale',
        name: 'RRFS A',
        skewt: true,
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        order: 10,
    },
    'arpege': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 3,
        vars: ['mslma_0', 'atemp', '2t_2', 'tcc_0',  '2d_2', '2r_2', 'wind_speed_10', 'gust_0', 'gust_runmax'],
        category: 'Global',
        name: 'ARPEGE',
        skewt: false,
        pressureLvls: [],
        order: 5,
    },
    'ecmwf': {
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'r_850', 'lapse_rates_500700',  'vo_850',  'thickness',   'wind_speed_700', 'd_850',  '2t_2', 'gh_925', 'r_925', 'w_500', 'lcl', 'tadv_850', 'divergence_200', 'crain', 'csnow', 'cicep', 'cfrzr', 'vo_500', 'd_700', 'gh_500', 'gh_850', 'w_925', 'cape_25500',  'mean700300mbRH', 't_925', 't_925iso0', 'tadv_300', 'fgen_700', 'wind_speed_925', 'vo_700', 'd_925', 'd_all_lvls', 'gh_300', 'wind_speed_500',   'r_300', 'wind_speed_10', 'fgen_850', '2d_2', 'mslma_0', 'r_500', 'gh_700', 'wind_speed_200', 'wind_speed_300', 'ivt', 'thetaE',  '2r_2', 't_500',  't_700', 't_700iso0', 'tadv_700',  'wind_speed_850', 't_850', 't_850iso0', 'divergence_850', 'w_700',  'gh_200', 'w_850', 'r_200', 'r_700', 'gust_0', 'atemp'],
        category: 'Global',
        name: 'ECMWF',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000
        ],
        order: 2
    },
    'ecmwfaifs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_6hr', 'tp_0_total', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'tadv_850',    'wind_speed_500',  'fgen_700', 'wind_speed_10', 'atemp', 'tp_0_total', 'tadv_300', 'lapse_rates_500700',  't_700', 't_700iso0',  'thetaE', 'wind_speed_200', 'wind_speed_700', 'wind_speed_925', 'ivt', 'vo_700', 'divergence_200', '2r_2', 'fgen_850', 'd_all_lvls', '2d_2', 'tadv_700', 't_925', 't_925iso0', 'vo_850', 'gh_700', '2t_2', 'mslma_0', 'r_925', 'lcl', 'gh_925', 't_850', 't_850iso0',  'w_850',  'gh_500', 'w_925',  'gh_850', 't_500',  'mean700300mbRH', 'divergence_850', 'thickness', 'w_500',  'r_700',  'wind_speed_850', 'wind_speed_300', 'vo_500', 'r_850', 'w_700'],
        category: 'Global',
        name: 'ECMWF-AIFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 
            850, 925, 1000
        ],
        order: 7,
    },
    'gem': {
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', 'fgen_850', 'cape_0',  'r_500', 'crain', 'csnow', 'cicep', 'cfrzr', 'gh_500', 'wind_speed_700', 'd_925',  'gust_0', 'gh_300', 'thickness', 'wind_speed_925', 'd_850', '2r_2', 'mslma_0', 'wind_speed_300', 't_500',   'w_850', 'vo_500', 'wind_speed_200', 'r_700', 'gh_925', 'divergence_850', 'vo_850', '2t_2',  'tadv_700',  't_925', 't_925iso0', 'tadv_850', 'gh_700', 'wind_speed_10', 'r_925', 'w_700', 'vo_700', 'atemp',  'lapse_rates_500700', 'gh_850', '2d_2', 'gh_200', 'r_850', 'tcc_0', 'w_500', 'cin_0',  'wind_speed_500', 'wind_speed_850', 't_850', 't_850iso0', 'thetaE', 'd_700', 'lcl', 'divergence_200', 'fgen_700', 't_700'],
        category: 'Global',
        name: 'GDPS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        order: 3,
    },
    'gfs': {
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0', 'crain_total', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'cin_0', 'wind_speed_700', 'wind_speed_200', 'divergence_200', 'd_925', 'tadv_300', 'w_850', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', '2t_2', 'lftx_0', 'refc_0', 'fgen_850', 'hcc_0', 'r_700', 't_850', 't_850iso0', 'r_850', 'tcc_0', 'hlcy_3000', 'thickness', 'vo_850', 'wind_direction_2000', 'r_500', 'gh_500', 'wind_speed_500', '2d_2', 'cape_25500', 'mcc_0', 'w_500', 'pwat_0', 'divergence_850', 't_500',  'wind_speed_850', 'lcl',   'cape_0', 'tadv_850', 'tadv_700', 'theta2PVU',  'wind_speed_2000', 'lapse_rates_500700', 'vo_500', 'irsat',   't_700', 't_700iso0', 'cin_25500', 'ehi_3000', 'lcc_0', 'gh_850', 'wind_speed_925', 'gh_200', 'wind_speed_300', 'fgen_700', 'vo_700',  'd_850', 'thetaE',   'pres2PVU', 'd_700', 'crain', 'csnow', 'cicep', 'cfrzr',  'w_700', 'gust_0', 'ivt',  'atemp', 'cape_9000', 'r_925', 'mslma_0', 'w_925', 'cin_9000', 'mean700300mbRH', 'wind_speed_10', 't_925', 't_925iso0', 'gh_925', 'gh_700',  'gh_300',  '2r_2'],
        category: 'Global',
        name: 'GFS',
        bounds: [-180, -90, 180, 90],
        skewt: true,
        pressureLvls: [
            100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 975, 1000
        ],
        order: 1,
    },
    'graphcastgfs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_6hr', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'gh_700', 'mean700300mbRH', 'd_925',   'gh_300', 'ivt', 'gh_925', 'mslma_0', 'lapse_rates_500700',  'tadv_300', 'fgen_700', 'r_500',  'wind_speed_700', 'wind_speed_850', 'fgen_850', 'w_500', 't_700', 't_700iso0', 'gh_200', 'w_925', 'tadv_850', 'tadv_700', '2t_2', 'r_700', 'd_all_lvls', 'wind_speed_300', 'd_700', 'divergence_850', 't_500',   'vo_850', 'w_850',    'vo_500', 'wind_speed_925', 't_925', 't_925iso0', 'tp_0_total', 'r_850', 'r_925', 'w_700', 't_850', 't_850iso0', 'gh_500',  'wind_speed_200', 'wind_speed_500',   'gh_850', 'd_850', 'thickness', 'divergence_200', 'vo_700'],
        category: 'Global',
        name: 'Graphcast GFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        pressureLvls: [
            100, 150, 200, 250, 300, 400, 500, 600, 700, 850, 925, 1000
        ],
        order: 6
    },
    'gefs': {
        max_zoom: 3,
        vars: ["gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'cin_9000', 'r_850', 'gh_500', 'fgen_700', 'fgen_850', 't_500',   'wind_speed_850', 'wind_speed_300', 'lapse_rates_500700', 'cape_9000', 't_925', 't_925iso0', 'gh_850', '2r_2', 'gh_200',  'atemp',   'irsat', 'gh_300', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_10',  'tcc_0', 'wind_speed_700', 'd_850', 'gh_700', 'gh_925', 'wind_speed_500', '2t_2', 'lcl', 'tadv_850', 'divergence_850', 'pwat_0', 'r_700', 'tadv_700', 'divergence_200', 'thickness', 't_850', 't_850iso0', 'r_500', 'w_850', 't_700', 't_700iso0', 'thetaE', 'wind_speed_200', 'r_925',   'wind_speed_925', '2d_2', 'd_925', 'd_700'],
        category: 'Ensemble',
        name: 'GEFS',
        bounds: [-180, -90, 180, 90],
        skewt: false,
        order: 1,
    },
    'nbm': {
        bounds: [-138.3732681539599, 19.229000000000003, -59.04219006004567, 57.088589282434306],
        max_zoom: 7,
        vars: ['2t_2iso0','2d_2', '2r_2', '2t_2', 'atemp', 'cape_0', 'gust_0', 'lcl'],
        category: 'Ensemble',
        name: 'NBM',
        skewt: false,
        order: 2,
    },
    'href': {
        interval: 1,
        bounds: [-152.8529969460623, 12.190000000000017, -49.39550324327563, 61.2767011349812],
        max_zoom: 7,
        vars: ['vis_0', '2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'mslma_0', 'tadv_850', 'hlcy_3000', 'd_700', 'lcc_0', 'cape_0', 'wind_speed_700', 'crain', 'csnow', 'cicep', 'cfrzr',  'gh_500', 'gh_700', 'wind_speed_850', 'pwat_0', 'fgen_850', 'd_925',  'wind_speed_925', 't_850', 't_850iso0', 'fgen_700', 'lcl', '2t_2', 'mcc_0', 't_925', 't_925iso0', 'wind_speed_500', 'w_700', 'cape_9000',  'hcc_0',  'cin_0',  'tcc_0', 'cin_9000', 'tadv_700', 'gh_850', 't_500',  'd_850', 'ehi_3000', 't_700'],
        category: 'Ensemble',
        name: 'HREF',
        skewt: false,
        order: 3,
    },
    'iconeu': {
        bounds: [-23.5, 29.5, 62.5, 70.5],
        max_zoom: 7,
        vars: ['bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','avg_prate_3hr','csnow_total', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'lapse_rates_500700', '2d_2', 't_850', 't_850iso0', 'wind_speed_500', 'wind_speed_925', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_850', 'tcc_0', 't_925', 't_925iso0', 'thetaE',  't_700', 't_700iso0', '2t_2', 't_500',  'cape_9000', 'hcc_0',  'atemp', 'lcc_0',  'wind_speed_10', 'lcl', 'mslma_0', 'mcc_0',  '2r_2', 'wind_speed_700', 'wind_direction_850'],
        category: 'Regional',
        name: 'ICON-EU',
        skewt: false,
        order: 4,
    },
    'nam': {
        bounds: [-152.87862250405013, 12.190000000000017, -49.415986585644376, 61.30935757335814],
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'ehi_1000', 'hlcy_1000', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', '2d_2', '2r_2', '2t_2', 'atemp', 'cape_25500', 'cin_25500', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cin_0', 'cin_9000', 'd_850', 'd_925', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hlcy_3000', 'ivt', 'lapse_rates_500700', 'lcl', 'lftx_500', 'ltng_0', 'mean700300mbRH', 'mslma_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 'supercellComposite', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'tcc_0', 'thetaE', 'thickness',   'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',        'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Regional',
        name: 'NAM',
        skewt: false,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 
            400, 425, 450, 475, 500, 525, 550, 575, 600, 625, 650, 675, 
            700, 725, 750, 775, 800, 825, 850, 875, 900, 925, 950, 975, 1000
        ],
        order: 2,
    },
    'arpegeeu': {
        bounds: [-32, 20, 42, 72],
        max_zoom: 3,
        vars: ['canosw_total', 'gust_0', 'gust_runmax', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'd_850', 'd_925', 'fgen_700', 'fgen_850', 'gh_500', 'gh_300', 'gh_200', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'lapse_rates_500700', 'mslma_0', 't_700', 't_850', 't_925', 'tadv_700', 'tadv_850', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925', 'thetaE', 'atemp', 'vo_10', '2t_2', 'moistureConvergence', 'cape_25500', '2d_2', '2r_2', 'wind_speed_10'],
        category: 'Regional',
        name: 'ARPEGE EU',
        skewt: true,
        pressureLvls: [
            100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 450, 500, 550, 
            600, 650, 700, 750, 800, 850, 900, 925, 950, 1000
        ],
        order: 5,
    },
    'rap': {
        bounds: [-139.85612183699237, 16.281000000000002, -57.381070045718054, 58.365355471156114],
        max_zoom: 3,
        vars: ['refd_1000', 'vis_0', 'gust_runmax', "gh_tendency_500", 'slr', 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12',  'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_12', 'cicep_24', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', '2d_2', '2r_2', '2t_2', 'atemp', 'bulk_shear_speed_0-6000', 'cape_0', 'cape_9000', 'cape_25500',  'cin_0', 'cin_9000', 'cin_25500', 'd_850', 'd_925', 'ehi_1000', 'ehi_3000', 'fgen_700', 'fgen_850', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', 'gust_0', 'hcc_0', 'hlcy_1000', 'hlcy_3000', 'ivt', 'lapse_rates_500700', 'lcc_0', 'lcl', 'lftx_500', 'ltng_0', 'mcc_0', 'mean700300mbRH', 'moistureConvergence', 'mslma_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'rainRefl', 'icepRefl', 'snowRefl', 'frzrRefl', 'pwat_0', 'r_700', 'r_850', 'r_925',  'refc_0', 'stp', 'supercellComposite', 't_500',  't_700', 't_700iso0', 't_850', 't_850iso0', 't_925', 't_925iso0',  'tadv_700', 'tadv_850', 'tcc_0', 'tehi', 'thetaE', 'thickness', 'tts',   'vo_500', 'vo_700', 'vo_850',  'w_700', 'w_850',         'wind_speed_10', 'wind_speed_200', 'wind_speed_300', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925'],
        category: 'Regional',
        name: 'RAP',
        skewt: true,
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        order: 1,
    },
    'rgem': {
        bounds: [-179.99976765517718, 17.34272612431937, -50, 89.95612441273688],
        max_zoom: 3,
        vars: ['gust_runmax', "gh_tendency_500", 'bulk_shear_speedmb_500', 'bulk_shear_speedmb_700', 'bulk_shear_speedmb_850', 'bulk_shear_speedmb_925','2t_2iso0','crain_total', 'crain_1', 'crain_3', 'crain_6', 'crain_12', 'crain_24', 'crain_48', 'cicep_total', 'cicep_1', 'cicep_3', 'cicep_6', 'cicep_12', 'cicep_24', 'cicep_48', 'cfrzr_total', 'cfrzr_1', 'cfrzr_3', 'cfrzr_6', 'cfrzr_12', 'cfrzr_24', 'cfrzr_48', 'csnow_total', 'csnow_1', 'csnow_3', 'csnow_6', 'csnow_12', 'csnow_24', 'csnow_48', 'tp_0_total', 'tp_0_1', 'tp_3', 'tp_6', 'tp_12', 'tp_24', 'tp_48', 'prate', 'rainRate', 'snowRate', 'icepRate', 'frzrRate', '2t_2', 'gh_300', 'mslma_0', 'lcl',  'r_925', 'cape_0', 'crain', 'csnow', 'cicep', 'cfrzr', 'wind_speed_500',  'wind_speed_700', 'vo_850', 'tcc_0', '2r_2', 'gh_850', 'tadv_850', 'gh_200', 'r_700', 'gh_500', 'r_500', 'thickness', 'wind_speed_10', 'thetaE', 'w_700', 'vo_700', 'fgen_700', 'wind_speed_200', 't_925', 't_925iso0', 'wind_speed_300', 'w_850', 'd_925', '2d_2', 'lapse_rates_500700', 'wind_speed_925', 'd_700', 'fgen_850', 'gh_925', 't_500',  'vo_500', 'r_850',  'wind_speed_850',  'cin_0',  'atemp', 'w_500', 'tadv_700', 't_850', 't_850iso0', 'gh_700', 't_700', 't_700iso0', 'd_850', 'gust_0'],
        category: 'Regional',
        name: 'RGEM',
        skewt: false,
        order: 3,
    },

    'rtma': {
        bounds: [-134.09547, 21.13812300, -60.91719, 52.6156533],
        max_zoom: 7,
        vars: ['mslma_0', '2t_2iso0', '2d_2', '2r_2', '2t_2', 'atemp', 'gust_0', 'moistureConvergence', 'thetaE', 'wind_speed_10'],
        name: 'RTMA',
    },

    'hwrf': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HWRF',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 1,
    },
    'hfsa': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['gust_0', '2t_2',  'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HAFS-A',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,524,550,575,600,625,650,657,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 3,
    },
    'hfsb': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['gust_0', '2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HAFS-B',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,524,550,575,600,625,650,657,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 4,
    },
    'hmon': {
        bounds: [-180, -90, 180, 90],
        max_zoom: 7,
        vars: ['2t_2', 'hlcy_3000', 'wind_speed_10', 'wind_speed_500', 'wind_speed_700', 'wind_speed_850', 'wind_speed_925',      'ivt', 'gh_200', 'gh_300', 'gh_500', 'gh_700', 'gh_850', 'gh_925', '2r_2', 'mean700300mbRH', 'r_500', 'r_700', 'r_850', 'r_925', 'mslma_0', 'pwat_0', 'refc_0', 'vo_500', 'vo_700', 'vo_850'],
        category: 'Hurricane',
        name: 'HMON',
        pressureLvls: [100,125,150,175,200,225,250,275,300,325,350,375,400,425,450,475,500,525,550,575,600,625,650,675,700,725,750,775,800,825,850,875,900,925,950,975,1000],
        skewt: true,
        order: 2,
    },
};


const DICTIONARIES = {
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
                    intervals: [],
                },
            },
            
            description: '',
        },
        "mslma_0": {
            category: "Surface",
            subCategory: "Mean Sea Level Pressure",
            variable: "MSLP",
            shortname: "MSLP",
            units: {
                "hPa": {
                    min: 800,
                    max: 1100,
                    intervals: [2],
                },
            },
            description: '',
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
                    intervals: [2],
                },
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            defaultUnit: '°C',
            description: '',
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
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "wet_bulb_2": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "2m Wet Bulb Temperature",
            shortname: "2m Wb. Temp.",
            units: {
                "°C": {
                    min: -50,
                    max: 50,
                    intervals: [2],
                },
                "°F": {
                    min: -60,
                    max: 120,
                    intervals: [2],
                },
            },
            
            description: '',
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
                    intervals: [2],
                },
                "°C": {
                    min: -70,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: '°C',
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_925": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "925mb Dewpoint",
            shortname: "925mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_850": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "850mb Dewpoint",
            shortname: "850mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
        },
        "d_700": {
            category: "Upper Air",
            subCategory: "Dewpoint",
            variable: "700mb Dewpoint",
            shortname: "700mb Dpt.",
            units: {
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [2],
                },
            },
            
            description: 'Dewpoint temperature is the temperature at which air becomes saturdates with water vapor.',
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
                    intervals: [5],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "cape_0": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Surface Based CAPE",
            shortname: "SBCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            
            description: 'Surface Based Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to the equilibrium level. It represents the potential for thunderstorms.',
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
                    intervals: [50],
                },
            },
            
            description: '3km Convective Available Potential Energy measures differences between a surface based air parcel temperature and the surrounding environment to 3km.',
        },
        "cape_25500": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Most Unstable CAPE",
            shortname: "MUCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            
            description: 'Most Unstable Convective Available Potential Energy calculated using a the a parcel from the layer with highest instability.',
        },
        "cape_9000": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Mixed Layer CAPE",
            shortname: "MLCAPE",
            units: {
                "J kg⁻¹": {
                    min: 100,
                    max: 10000,
                    intervals: [250],
                },
            },
            description: 'Mixed Layer Convective Available Potential Energy calculated using a parcel lifted from the mixed layer, typically the layer of air between the surface and a point where the temperature inversion (cap) begins.',
        },
        "cin_0": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Surface Based CIN",
            shortname: "SBCIN",
            units: {
                "J kg⁻¹": {
                    min: -1e3,
                    max: -50,
                    intervals: [50],
                },
            },
            description: 'Surface Based Convective Inhibition is the amount of energy that prevents an air parcel lifted from the surface from rising freely, acting as a cap on convection. It represents the negative buoyancy that must be overcome for convection to initiate.',
        },
        "cin_25500": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Most Unstable CIN",
            shortname: "MUCIN",
            units: {
                "J kg⁻¹": {
                    min: -1e3,
                    max: -50,
                    intervals: [50],
                },
            },
            
            description: 'Most Unstable Convective Inhibition is the amount of energy that prevents an air parcel lifted from the most unstable layer from rising freely.',
        },
        "cin_9000": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Mixed Layer CIN",
            shortname: "MLCIN",
            units: {
                "J kg⁻¹": {
                    min: -1e3,
                    max: -50,
                    intervals: [50],
                },
            },
            
            description: 'Mixed Layer Convective Inhibition is the amount of energy that prevents the most unstabel air parcel lifted from the mixed layer from rising freely. Typically extends from the surface to a capping invesion.',
        },
        "hcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "High Cloud Cover",
            shortname: "High Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in the high cloud layer.',
        },
        "lcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Low Cloud Cover",
            shortname: "Low Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in thelow cloud layer.',
        },
        "mcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Middle Cloud Cover",
            shortname: "Mid. Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds in the middle cloud layer.',
        },
        "tcc_0": {
            category: "Upper Air",
            subCategory: "Clouds",
            variable: "Total Cloud Cover",
            shortname: "Total Cloud %",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Percentage of clouds across all layers of the atmosphere.',
        },
        "atemp": {
            category: "Surface",
            subCategory: "Temperature",
            variable: "Apparent Temperature",
            shortname: "ATemp.",
            units: {
                "°F": {
                    min: -90,
                    max: 150,
                    intervals: [5],
                },
                "°C": {
                    min: -70,
                    max: 70,
                    intervals: [3],
                },
            },
            defaultUnit: '°F',
            description: 'Index that represents how temperature feels to the human body considering factors like humidity and wind speed.',
        },
        "tp_0_total": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "Total Precipitation",
            shortname: "Total Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_0_1": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "1 Hour Precipitation",
            shortname: "1hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm": {
                    min: .025,
                    max: 25,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_3": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "3 Hour Precipitation",
            shortname: "3hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_6": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "6 Hour Precipitation",
            shortname: "6hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_12": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "12 Hour Precipitation",
            shortname: "12hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_24": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "24 Hour Precipitation",
            shortname: "24hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "tp_48": {
            category: "Precipitation",
            subCategory: "QPF",
            variable: "48 Hour Precipitation",
            shortname: "48hr Precip.",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "prate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Precipitation Rate",
            shortname: "Precip. Rate",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "avg_prate_6hr": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Average Precipitation Rate 6hr",
            shortname: "Avg. Precip. Rate 6hr",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "avg_prate_3hr": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Average Precipitation Rate 3hr",
            shortname: "Avg. Precip Rate 3hr",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: '',
        },
        "snowRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Snow Rate",
            shortname: "Snow Rate",
            units: {
                "in/hr [10:1]": {
                    min: .05,
                    max: 30,
                    intervals: [1],
                },
                "cm/hr [10:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [10:1]',
            description: 'Rate of snowfall given precipitation rate and where the model depicts snow falling, assuming a 10:1 ratio.',
        },
        "rainRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Rain Rate",
            shortname: "Rain Rate",
            units: {
                "in/hr": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr": {
                    min: .1,
                    max: 42,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr',
            description: 'Rate of rainfall given precipitation rate and where the model depicts rain falling.',
        },
        "icepRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Ice Pellets Rate",
            shortname: "Icep Rate",
            units: {
                "in/hr [3:1]": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr [3:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [3:1]',
            description: 'Rate of ice pellets given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio.',
        },
        "frzrRate": {
            category: "Precipitation",
            subCategory: "Precipitation Rate",
            variable: "Instantaneous Freezing Rain Rate",
            shortname: "FRZR Rate",
            units: {
                "in/hr [3:1]": {
                    min: .005,
                    max: 3,
                    intervals: [1],
                },
                "mm/hr [3:1]": {
                    min: .1,
                    max: 36,
                    intervals: [1],
                },
            },
            defaultUnit: 'in/hr [QPF]',
            description: 'Rate of freezing rain given precipitation rate and where the model depicts rain falling, assuming a 1:1 ratio.',
        },
        "csnow_total": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "Total Snow",
            shortname: "Total Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_1": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "1 Hour Snow",
            shortname: "1hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [10:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_3": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "3 Hour Snow",
            shortname: "3hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_6": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "6 Hour Snow",
            shortname: "6hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_12": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "12 Hour Snow",
            shortname: "12hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_24": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "24 Hour Snow",
            shortname: "24hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "csnow_48": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "48 Hour Snow",
            shortname: "48hr Snow",
            units: {
                "in [10:1]": {
                    min: .1,
                    max: 300,
                    intervals: [1],
                },
                "cm [10:1]": {
                    min: .25,
                    max: 750,
                    intervals: [1],
                },
                "mm [10:1]": {
                    min: 2.5,
                    max: 7500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [10:1]',
            description: '',
        },
        "cfrzr_total": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "Total Freezing Rain",
            shortname: "Total FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_1": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "1 Hour Freezing Rain",
            shortname: "1hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 2,
                    intervals: [0.1],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 5,
                    intervals: [0.2],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_3": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "3 Hour Freezing Rain",
            shortname: "3hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_6": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "6 Hour Freezing Rain",
            shortname: "6hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_12": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "12 Hour Freezing Rain",
            shortname: "12hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_24": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "24 Hour Freezing Rain",
            shortname: "24hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cfrzr_48": {
            category: "Precipitation",
            subCategory: "Freezing Rain",
            variable: "48 Hour Freezing Rain",
            shortname: "48hr FRZR",
            units: {
                "in [QPF]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [QPF]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [QPF]": {
                    min: .2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [QPF]',
            description: '',
        },
        "cicep_total": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "Total Sleet",
            shortname: "Total Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_1": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "1 Hour Sleet",
            shortname: "1hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 2,
                    intervals: [0.1],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 5,
                    intervals: [0.2],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 50,
                    intervals: [2],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_3": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "3 Hour Sleet",
            shortname: "3hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_6": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "6 Hour Sleet",
            shortname: "6hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_12": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "12 Hour Sleet",
            shortname: "12hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_24": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "24 Hour Sleet",
            shortname: "24hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "cicep_48": {
            category: "Precipitation",
            subCategory: "Ice Pellets",
            variable: "48 Hour Sleet",
            shortname: "48hr Sleet",
            units: {
                "in [3:1]": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm [3:1]": {
                    min: .02,
                    max: 25,
                    intervals: [1],
                },
                "mm [3:1]": {
                    min: 0.2,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in [3:1]',
            description: '',
        },
        "crain_total": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "Total Rain",
            shortname: "Total Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_1": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "1 Hour Rain",
            shortname: "1hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 10,
                    intervals: [0.5],
                },
                "cm": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
                "mm": {
                    min: 0.1,
                    max: 250,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_3": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "3 Hour Rain",
            shortname: "3hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_6": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "6 Hour Rain",
            shortname: "6hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .25,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_12": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "12 Hour Rain",
            shortname: "12hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .25,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_24": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "24 Hour Rain",
            shortname: "24hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "crain_48": {
            category: "Precipitation",
            subCategory: "Rain",
            variable: "48 Hour Rain",
            shortname: "48hr Rain",
            units: {
                "in": {
                    min: .01,
                    max: 100,
                    intervals: [1],
                },
                "cm": {
                    min: .025,
                    max: 250,
                    intervals: [1],
                },
                "mm": {
                    min: 0.25,
                    max: 2500,
                    intervals: [10],
                },
            },
            defaultUnit: 'in',
            description: '',
        },
        "bulk_shear_speed_0-1000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "0-1km Bulk Shear",
            shortname: "1km Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '1km Bulk Shear is the difference in wind vectors between the surface and 1km. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speed_0-6000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "0-6km Bulk Shear",
            shortname: "6km Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '6km Bulk Shear is the difference in wind vectors between the surface and 6km. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_500": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-500mb Bulk Shear",
            shortname: "500mb Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '500mb Bulk Shear is the difference in wind vectors between the surface and 500mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_700": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-700mb Bulk Shear",
            shortname: "700mb Bulk Shear",
            units: {
                "kts": {
                    min: 20,
                    max: 180,
                    intervals: [10],
                },
                "m/s": {
                    min: 10,
                    max: 90,
                    intervals: [4],
                },
            },
            defaultUnit: 'kts',
            description: '700mb Bulk Shear is the difference in wind vectors between the surface and 700mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_850": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-850mb Bulk Shear",
            shortname: "850mb Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '850mb Bulk Shear is the difference in wind vectors between the surface and 850mb. It can help determine the potential for rotating supercells.',
        },
        "bulk_shear_speedmb_925": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "Sfc-925mb Bulk Shear",
            shortname: "925mb Bulk Shear",
            units: {
                "kts": {
                    min: 10,
                    max: 90,
                    intervals: [5],
                },
                "m/s": {
                    min: 5,
                    max: 45,
                    intervals: [2],
                },
            },
            defaultUnit: 'kts',
            description: '500mb Bulk Shear is the difference in wind vectors between the surface and 925mb. It can help determine the potential for rotating supercells.',
        },
        "divergence_200": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "200mb Divergence",
            shortname: "200mb Divergence",
            units: {
                "s⁻¹": {
                    min: -30,
                    max: 30,
                    intervals: [2],
                },
            },
            
            description: 'Divergence is the outward flow of air from a region of the atmosphere. 200mb divergence is associated with rising air at the surface.',
        },
        "divergence_850": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "850mb Divergence",
            shortname: "850mb Divergence",
            units: {
                "s⁻¹": {
                    min: -30,
                    max: 30,
                    intervals: [2],
                },
            },
            
            description: 'Divergence is the outward flow of air from a region of the atmosphere. 850mb divergence is associated with sinking air at the surface.',
        },
        "ehi_1000": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "1km Energy Helicity Index",
            shortname: "1km EHI",
            units: {
                "None": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '1km Energy Helicity Index (EHI) combines SBCAPE and 1km SRH to quantify the likelihood of tornadoes or low-level mesocyclones.',
        },
        "ehi_3000": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "3km Energy Helicity Index",
            shortname: "3km EHI",
            units: {
                "None": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '3km Energy Helicity Index (EHI) combines SBCAPE and 3km SRH to quantify the likelihood of supercell thunderstorms and helps asses potential for updraft rotation.',
        },
        "fgen_700": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "700mb Frontogenesis",
            shortname: "700mb FGEN.",
            units: {
                "°C/100km/3hr": {
                    min: 1,
                    max: 60,
                    intervals: [2],
                },
            },
            
            description: 'Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift.',
        },
        "fgen_850": {
            category: "Upper Air",
            subCategory: "Forcing",
            variable: "850mb Frontogenesis",
            shortname: "850mb FGEN.",
            units: {
                "°C/100km/3hr": {
                    min: 1,
                    max: 60,
                    intervals: [2],
                },
            },
            
            description: 'Frontogenesis is measure of how quickly temperature gradients intensify, leading to the formation or strengthing of a front. Large values of lower level frontogenesis are associated with increased lift.',
        },
        "gh_tendency_500": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "12 Hour 500mb Geopotential Height Tendency",
            shortname: "12hr 500mb Height Tendency",
            units: {
                "dam": {
                    min: -60,
                    max: 60,
                    intervals: [5],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_200": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "200mb Geopotential Heights",
            shortname: "200mb Geo. Height",
            units: {
                "dam": {
                    min: 1080,
                    max: 1290,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_250": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "250mb Geopotential Heights",
            shortname: "250mb Geo. Height",
            units: {
                "dam": {
                    min: 1080,
                    max: 1290,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_300": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "300mb Geopotential Heights",
            shortname: "300mb Geo. Height",
            units: {
                "dam": {
                    min: 768,
                    max: 1000,
                    intervals: [6],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_500": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "500mb Geopotential Heights",
            shortname: "500mb Geo. Height",
            units: {
                "dam": {
                    min: 438,
                    max: 650,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_700": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "700mb Geopotential Heights",
            shortname: "700mb Geo. Height",
            units: {
                "dam": {
                    min: 249,
                    max: 350,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_850": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "850mb Geopotential Heights",
            shortname: "850mb Geo. Height",
            units: {
                "dam": {
                    min: 120,
                    max: 170,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gh_925": {
            category: "Upper Air",
            subCategory: "Heights",
            variable: "925mb Geopotential Heights",
            shortname: "925mb Geo. Height",
            units: {
                "dam": {
                    min: 48,
                    max: 120,
                    intervals: [3],
                },
            },
            
            description: 'Geopotential height represents the altitude of a given pressure level in the atmosphere. Higher (lower) geopotential heights are associated with ridges (troughs).',
        },
        "gust_0": {
            category: "Surface",
            subCategory: "Wind",
            variable: "Wind Gusts",
            shortname: "Wind Gusts",
            units: {
                "mph": {
                    min: 20,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 15,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 10,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 30,
                    max: 320,
                    intervals: [10],
                },
            },
            defaultUnit: 'mph',
            description: '',
        },
        "gust_runmax": {
            category: "Surface",
            subCategory: "Wind",
            variable: "Accumulated Max Wind Gusts",
            shortname: "Accum. Max Wind Gusts",
            units: {
                "mph": {
                    min: 20,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 15,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 10,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 30,
                    max: 320,
                    intervals: [10],
                },
            },
            defaultUnit: 'mph',
            description: '',
        },
        "uphl_5000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "5-2km Updraft Helicity",
            shortname: "5km UPHL",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: '',
        },
        "hlcy_3000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "3km Storm Relative Helicity",
            shortname: "3km SRH",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: 'Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-3km is most relavent to diagnose overall storm organization.',
        },
        "hlcy_1000": {
            category: "Wind Shear",
            subCategory: "Severe",
            variable: "1km Storm Relative Helicity",
            shortname: "1km SRH",
            units: {
                "m²/s²": {
                    min: -1500,
                    max: 1500,
                    intervals: [50],
                },
            },
            
            description: 'Storm-Relative Helicity (SRH) is a measure of the potential for cyclonic updraft rotation in thunderstorms, calculated by assesing the wind shear relative to storm motion. SRH from 0-1km is most relavent to diagnose tornado potential.',
        },
        "irsat": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "Simulated IR Brightness Temperature",
            shortname: "IRSAT",
            units: {
                "°C": {
                    min: -100,
                    max: 60,
                    intervals: [5],
                },
            },
            
            description: 'IR Birhgtness Temperature represents the radiative temperature of an object as inferred from infared satellite measurements. Colder brightness temperatures typically indicate high cloud tops, while warmer temepratures suggest lower clouds or clear skies.',
        },
        "ivt": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "Integrated Water Vapor Transport",
            shortname: "IVT",
            units: {
                "kg m⁻¹ s⁻¹": {
                    min: 250,
                    max: 2000,
                    intervals: [50],
                },
            },
            
            description: 'Integrated Water Vapor Transport (IVT) is a measure of the total amount of water vapor being transported through the atmosphere by wind. It is calculated by integrating the specific humidity and wind speed over a vertical column of the atmosphere. Higher IVT values lead to stronger moisture transport indicated a higher threat for heavy precipitation.',
        },
        "lapse_rates_500700": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "700-500mb Lapse Rate",
            shortname: "700-500mb Lapse Rate",
            units: {
                "°C km⁻¹": {
                    min: 1,
                    max: 15,
                    intervals: [1],
                },
            },
            
            description: '500-700mb Lapse rate describes the rate at which temperature decreases from 700mb to 500mb. Higher lapse rates indicate higher instability and potential for convection.',
        },
        "lcl": {
            category: "Thermodynamics",
            subCategory: "Severe",
            variable: "Lifted Condensation Level Height",
            shortname: "LCL Height",
            units: {
                "m": {
                    min: 100,
                    max: 9000,
                    intervals: [100],
                },
                "ft": {
                    min: 500,
                    max: 30000,
                    intervals: [500],
                },
            },
            defaultUnit: 'm',
            description: 'Lifted Condensation Level (LCL) height is the altitude at which an air parcel, when lifted adiabatically, cools to its dew point and becomes saturated, leading to cloud formation. It is calculated using temperature and dewpoint: 125x(T-Td)',
        },
        "lftx_0": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Surface Lifted Index",
            shortname: "Surface Lifted Idx.",
            units: {
                "°C": {
                    min: -20,
                    max: -1,
                    intervals: [1],
                },
            },
            
            description: 'Surface Lifted Index is the temperature between an air parcel lifted from the surface and the environment at 500 hPa. More negative values indicate greater instability and higher potential for thunderstorms.',
        },
        "lftx_500": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "500mb Lifted Index",
            shortname: "500mb Lifted Idx.",
            units: {
                "°C": {
                    min: -20,
                    max: -1,
                    intervals: [1],
                },
            },
            
            description: '500mb Lifted Index is the temperature between an air parcel lifted from 500mb. Useful for diagnosing mid-level instability and elevated convection not rooted at the surface.',
        },
        "ltng_0": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "Lightning",
            shortname: "Lightning",
            units: {
                "flashes km⁻²/5 min": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
            },
            
            description: 'Model dervived lightning strikes in km⁻²/5 min.',
        },
        "ltng_2": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "Lightning",
            shortname: "Lightning",
            units: {
                "flashes km⁻²/5 min": {
                    min: .01,
                    max: 25,
                    intervals: [1],
                },
            },
            
            description: 'Model dervived lightning strikes in km⁻²/5 min.',
        },
        "mean700300mbRH": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "Mean 700-300mb Relative Humidity",
            shortname: "Mean 700-300mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity averaged between 700-300mb. Ueful indicator for diagnosing the ability for cloud formation, deep convection, or precipitation.',
        },
        "moistureConvergence": {
            category: "Surface",
            subCategory: "Forcing",
            variable: "Moisture Convergence",
            shortname: "Moisture Convergence",
            units: {
                "s⁻¹": {
                    min: 5,
                    max: 50,
                    intervals: [5],
                },
            },
            
            description: 'Surface Moisture Convergence refers to the accumulation of water vapor near the surface due to converging airflows. Higher values are associated with rising air and heavy precipitation. It is calculated as the product of moisture content and horizontal wind convergence.',
        },
        "mxuphl_3000": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "0-3km Maximum Updraft Helicity",
            shortname: "3km Max Updraft Helicity",
            units: {
                "m²/s²": {
                    min: 2,
                    max: 300,
                    intervals: [5],
                },
            },
            
            description: '3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones.',
        },
        "mxuphl_5000": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "2-5km Maximum Updraft Helicity",
            shortname: "2-5km Max Updraft Helicity",
            units: {
                "m²/s²": {
                    min: 2,
                    max: 560,
                    intervals: [5],
                },
            },
            
            description: '2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization.',
        },
        "mxuphl_3000_runmax": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "0-3km Maximum Updraft Helicity (Run Max)",
            shortname: "3km Max Updraft Helicity (Max)",
            units: {
                "m²/s²": {
                    min: 3,
                    max: 300,
                    intervals: [5],
                },
            },
            
            description: '3km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is more often used to assess the potential for tornadoes and low-level mesocyclones.',
        },
        "mxuphl_5000_runmax": {
            category: "Mesoscale",
            subCategory: "Severe",
            variable: "2-5km Maximum Updraft Helicity (Run Max)",
            shortname: "2-5km Max Updraft Helicity (Run)",
            units: {
                "m²/s²": {
                    min: 3,
                    max: 560,
                    intervals: [5],
                },
            },
            
            description: '2-5km Meximum Updraft Helicity measures the amount of storm-relative helicity (rotation) in updrafts of thunderstorms. It is most often used to gauge the potential for supercell thunderstorms, mid-level shear and storm organization.',
        },
        "pres2PVU": {
            category: "Upper Air",
            subCategory: "Pressure",
            variable: "Dynamic Tropopause Pressure",
            shortname: "2PVU Pres.",
            units: {
                "hPa": {
                    min: 20,
                    max: 850,
                    intervals: [15],
                },
            },
            
            description: 'Dynamic Tropopause Pressure is calculated by analyzing the pressure at the 2PVU level. It asses at what pressure level the tropopause lies.',
        },
        "csnow": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Snow",
            shortname: "Categorical Snow",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Snow is a binary model field that show whether or not it is snowing at a particular point.',
        },
        "cfrzr": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Freezing Rain",
            shortname: "Categorical FRZR.",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Freezing Rain is a binary model field that show whether or not there is freezing rain at a particular point.',
        },
        "crain": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Rain",
            shortname: "Categorical Rain",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Rain is a binary model field that show whether or not there is rain at a particular point.',
        },
        "cicep": {
            category: "Precipitation",
            subCategory: "Categorical",
            variable: "Categorical Ice Pellets",
            shortname: "Categorical ICEP.",
            units: {
                "None": {
                    min: 0,
                    max: 1,
                    intervals: [1],
                },
            },
            
            description: 'Categorical Ice Pellets is a binary model field that show whether or not there is ice pellets at a particular point.',
        },
        "rainRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Rain Composite Reflectivity",
            shortname: "Rain Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Rain shows reflectivity where the model shows categorical rain.',
        },
        "snowRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Snow Composite Reflectivity",
            shortname: "Snow Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Snow shows reflectivity where the model shows categorical snow.',
        },
        "icepRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Ice Pellets Composite Reflectivity",
            shortname: "ICEP. Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Ice Pellets shows reflectivity where the model shows categorical ice pellets.',
        },
        "frzrRefl": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Freezing Rain Composite Reflectivity",
            shortname: "FRZR. Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Composite Freezing Rain shows reflectivity where the model shows categorical freezing rain.',
        },
        "pwat_0": {
            category: "Precipitation",
            subCategory: "Moisture",
            variable: "Precipitable Water",
            shortname: "PWAT",
            units: {
                "in": {
                    min: 0,
                    max: 4,
                    intervals: [0.25],
                },
                "mm": {
                    min: 0,
                    max: 90,
                    intervals: [5],
                },
            },
            defaultUnit: 'in',
            description: 'Precipitable Water (PWAT) is the total amount of water vapor in a verticalcolumn of the atmosphere, expressed as the depth of water that would result if all the moisture in the column were to condense. High PWAT values indicate more moisture in the atmosphere, suggesting higher potential for heavy precipitation.',
        },
        "r_500": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "500mb Relative Humidity",
            shortname: "500mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_700": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "700mb Relative Humidity",
            shortname: "700mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_850": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "850mb Relative Humidity",
            shortname: "850mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "r_925": {
            category: "Upper Air",
            subCategory: "Moisture",
            variable: "925mb Relative Humidity",
            shortname: "925mb RH",
            units: {
                "%": {
                    min: 0,
                    max: 100,
                    intervals: [10],
                },
            },
            
            description: 'Relative humidity is the ratio of the current water vapor in the air to the maximum amount the air can hold. It is calculated by dividing the water vapor pressure by the saturation vapor pressure and multiplying by 100.',
        },
        "vis_0": {
            category: "Surface",
            subCategory: "Visibility",
            variable: "Visibility",
            shortname: "Vis.",
            units: {
                "mi": {
                    min: 0,
                    max: 10,
                    intervals: [0.1],
                },
                "km": {
                    min: 0,
                    max: 10,
                    intervals: [0.1],
                },
            },
            description: 'Visibility',
        },
        "mxrefc_1000": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Max Reflectivity (1 hr.)",
            shortname: "Max Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            description: 'Simulated Radar.',
        },
        "refd_1000": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "1km Base Reflectivity",
            shortname: "1km Base Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            description: 'Simulated Radar.',
        },
        "refc_0": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Composite Reflectivity",
            shortname: "Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Simulated Radar.',
        },
        "refc_500": {
            category: "Precipitation",
            subCategory: "Radar",
            variable: "Composite Reflectivity 500m",
            shortname: "Composite Refl.",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: 'Simulated Radar.',
        },
        "stp": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Significant Tornado Parameter",
            shortname: "STP",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Significant Tornado Parameter (STP) is a composite index used to assess the likelihood of sifniciant tornadoes. It is calculated using SBCAPE, LCL height, 1km SRH and 6km Bulk Shear.',
        },
        "supercellComposite": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Supercell Composite",
            shortname: "Supercell Composite",
            units: {
                "None": {
                    min: 1,
                    max: 50,
                    intervals: [1],
                },
            },
            
            description: 'Supercell Composite is a composite index used to evaluated the potential for supercell thunderstorms. It is calculated using MUCAPE Effective SRH and Effective Shear.',
        },
        "t_500": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "500mb Temperature",
            shortname: "500mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_700": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "700mb Temperature",
            shortname: "700mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_850": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "850mb Temperature",
            shortname: "850mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_925": {
            category: "Upper Air",
            subCategory: "Temperature",
            variable: "925mb Temperature",
            shortname: "925mb Temp.",
            units: {
                "°C": {
                    min: -60,
                    max: 50,
                    intervals: [2, 4],
                },
            },
            
            description: '',
        },
        "t_925iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "925mb 0°C Isotherm",
            shortname: "925mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_850iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "850mb 0°C Isotherm",
            shortname: "850mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_700iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "700mb 0°C Isotherm",
            shortname: "700mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "t_500iso0": {
            category: "Upper Air",
            subCategory: "Isotherm",
            variable: "500mb 0°C Isotherm",
            shortname: "500mb 0°C",
            units: {
                "°C": {
                    min: 0,
                    max: 0,
                    intervals: [1],
                },
            },
            
            description: '',
        },
        "tadv_300": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "300mb Temperature Advection",
            shortname: "300mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [2],
                },
            },
            
            description: '300mb Temperature Advection is useful for determining the sign of the secnd term of the QG height tendency equation. Strong Cold (Warm) air advection at 300mb is associated with 500mb geopotential height increases (decreases).',
        },
        "tadv_700": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "700mb Temperature Advection",
            shortname: "700mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion.',
        },
        "tadv_850": {
            category: "Upper Air",
            subCategory: "Thermodynamics",
            variable: "850mb Temperature Advection",
            shortname: "850mb Temp. Adv.",
            units: {
                "°C h⁻¹": {
                    min: -20,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Temperature Advection measures the horizontal movement of air that carries temperatures from one region to another. Positive advection warms an area while negative advection cools it. Strong warm advection is associated with upward motion.',
        },
        "tehi": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Tornadic Energy Helicity Index",
            shortname: "TEHI",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Tornadic Energy helicity Index (TEHI) is a parameter used to asses the potential for tornadoes. This parameter consolidates EHI to more percisely define areas that support tornadic supercells. It is calculated using 1km SRH, MLCAPE, 3km CAPE, 6km Bulk Shear, LCL height and MLCIN..',
        },
        "tts": {
            category: "Composite Indices",
            subCategory: "Severe",
            variable: "Tornadic Tilting and Stretching",
            shortname: "TTS",
            units: {
                "None": {
                    min: 1,
                    max: 20,
                    intervals: [1],
                },
            },
            
            description: 'Tornadic Tiling and Strecthing (TTS) is a paramter used to asses the potential for tornadoes, specifically in low CAPE, high shear environments during the cool season. The parameter picks out areas of tilting and strecthing or horizontal, streamwise vorticity in updrafts. It is calculated using 1km SRH, MLCAPE, 3km CAOE, 6km Bulk Shear, LCL height and MLCIN.',
        },
        "thetaE": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "2m Theta-E",
            shortname: "2m Theta-E",
            units: {
                "°K": {
                    min: 230,
                    max: 370,
                    intervals: [5],
                },
            },
            
            description: '2m Theta-E (Equivalent Potential Temperature) represents the potential temperature of a parcel of air has been lifted from the surface and all its water vapor has been condensed. It is useful for determining air parcel stability, with higher values indicating more moisture and greater instability.',
        },
        "theta2PVU": {
            category: "Upper Air",
            subCategory: "Isentropic",
            variable: "Dynamic Tropopause Theta-E",
            shortname: "2PVU Theta-E",
            units: {
                "°K": {
                    min: 230,
                    max: 495,
                    intervals: [5],
                },
            },
            
            description: 'Dynamic Tropopause Theta-E is the potential temperature along the 2PVU surface. It can help identify strong thermal gradients which can be associated with jet streams. Lower values indicate the tropopause is closer to the surface.',
        },
        "thickness": {
            category: "Upper Air",
            subCategory: "Thickness",
            variable: "1000-500mb Thickness",
            shortname: "Thickness",
            units: {
                "dam": {
                    min: 438,
                    max: 630,
                    intervals: [6],
                },
            },
            
            description: '1000-500mb Thickness subtracts the geopotential height from 1000mb and 500mb to get a vertical distance between the two layers. Higher (lower) thickness values are associated with warmer (colder) air.',
        },
        "vo_10": {
            category: "Surface",
            subCategory: "Forcing",
            variable: "Surface Relative Vorticity",
            shortname: "Surface Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity at the surface refers to the rotation of the wind field at 10m. It is used to analyze low-level atmospheric rotation. It is generally used to help indentify fronts or triple points.',
        },
        "vo_500": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "500mb Relative Vorticity",
            shortname: "500mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "vo_700": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "700mb Relative Vorticity",
            shortname: "700mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "vo_850": {
            category: "Upper Air",
            subCategory: "Vorticity",
            variable: "850mb Relative Vorticity",
            shortname: "850mb Rel. Vort.",
            units: {
                "s⁻¹": {
                    min: -80,
                    max: 150,
                    intervals: [4],
                },
            },
            
            description: 'Relative Vorticity refers to the rotation of a wind field. Positive (negative) vorticity indicates cyclonic (anticyclonic) rotation.',
        },
        "w_500": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "500mb Vertical Velocity",
            shortname: "500mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_700": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "700mb Vertical Velocity",
            shortname: "700mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_850": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "850mb Vertical Velocity",
            shortname: "850mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "w_925": {
            category: "Upper Air",
            subCategory: "Vertical Velocity",
            variable: "925mb Vertical Velocity",
            shortname: "925mb VVEL",
            units: {
                "Pa/s": {
                    min: -200,
                    max: 200,
                    intervals: [5],
                },
            },
            
            description: 'Veritcal Velocity refers to the speed at which air moves upward or downward in the atmosphere. Negative (positive) values indicate upward (downward) motion.',
        },
        "wind_speed_10": {
            category: "Surface",
            subCategory: "Wind",
            variable: "10m Wind Speed",
            shortname: "10m Wind",
            units: {
                "mph": {
                    min: 0,
                    max: 200,
                    intervals: [5],
                },
                "kts": {
                    min: 0,
                    max: 150,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [2],
                },
                "km/h": {
                    min: 0,
                    max: 300,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_2000": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "Dynamic Tropopause Wind Speed",
            shortname: "2PVU Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: 'Dynamic Tropopause Wind Speed is the wind speed along the 2PVU surface. It is used to analyze jet stream and large-scale circulation patterns.',
        },
        "wind_speed_200": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "200mb Wind Speed",
            shortname: "200mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_250": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "250mb Wind Speed",
            shortname: "250mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_300": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "300mb Wind Speed",
            shortname: "300mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 250,
                    intervals: [10],
                },
                "mph": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
                "m/s": {
                    min: 0,
                    max: 130,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 460,
                    intervals: [20],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_500": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "500mb Wind Speed",
            shortname: "500mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_700": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "700mb Wind Speed",
            shortname: "700mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_850": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "850mb Wind Speed",
            shortname: "850mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "wind_speed_925": {
            category: "Upper Air",
            subCategory: "Wind",
            variable: "925mb Wind Speed",
            shortname: "925mb Wind",
            units: {
                "kts": {
                    min: 0,
                    max: 155,
                    intervals: [5],
                },
                "mph": {
                    min: 0,
                    max: 180,
                    intervals: [5],
                },
                "m/s": {
                    min: 0,
                    max: 80,
                    intervals: [5],
                },
                "km/h": {
                    min: 0,
                    max: 290,
                    intervals: [10],
                },
            },
            defaultUnit: 'm/s',
            description: '',
        },
        "height_pbl": {
            category: "Surface",
            subCategory: "Thermodynamics",
            variable: "Planetary Boundary Layer Height",
            shortname: "PBL Height",
            units: {
                 "m": {
                    min: 100,
                    max: 9000,
                    intervals: [100],
                },
                "ft": {
                    min: 500,
                    max: 30000,
                    intervals: [500],
                },
            },
            defaultUnit: 'm',
            description: 'Planetary Boundary Layer Height (PBL) is the height in which the planetary boundary is located, owing to surface inversions or frontal passages',
        },
        "slr": {
            category: "Precipitation",
            subCategory: "Snow",
            variable: "Snow Liquid Ratio",
            shortname: "SLR",
            units: {
                "in. Snow/in. Liquid": {
                    min: 1,
                    max: 50,
                    intervals: [1],
                },
            },
            
            description: 'Snow Liquid Ratio refers to how many inches of snow there would be if 1" of liquid fell. this paramater is used by calculating the ratio between the model ASNOW paramater and QPF 10:1 snowfall.',
        },

        "MergedReflectivityQCComposite_00.50": {
            category: "Composite Reflectivity",
            variable: "Merged Reflectivity",
            shortname: "REFC",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "CREF_1HR_MAX_00.50": {
            category: "Composite Reflectivity",
            variable: "1-Hour Max Composite Reflectivity",
            shortname: "1hr Max REFC",
            units: {
                "dBZ": {
                    min: 5,
                    max: 80,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MergedZdr_04.00": {
            category: "Dual-Polarization",
            variable: "Differential Reflectivity",
            shortname: "ZDR",
            units: {
                "dB": {
                    min: -4,
                    max: 20,
                    intervals: [0.5],
                },
            },
            
            description: '',
        },
        "MergedRhoHV_04.00": {
            category: "Dual-Polarization",
            variable: "Correlation Coefficient",
            shortname: "CC",
            units: {
                "None": {
                    min: 0.2,
                    max: 3,
                    intervals: [0.1],
                },
            },
            
            description: '',
        },
        "RotationTrackML30min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (30 min)",
            shortname: "30Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML60min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (60 min)",
            shortname: "60Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML120min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (120 min)",
            shortname: "120Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML240min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (240 min)",
            shortname: "240Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML360min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (360 min)",
            shortname: "360Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrackML1440min_00.50": {
            category: "Rotation",
            variable: "ML Rotation Track (1440 min)",
            shortname: "1440Min ML Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack30min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (30 min)",
            shortname: "30Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack60min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (60 min)",
            shortname: "60Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack120min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (120 min)",
            shortname: "120Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack240min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (240 min)",
            shortname: "240Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack360min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (360 min)",
            shortname: "360Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "RotationTrack1440min_00.50": {
            category: "Rotation",
            variable: "Rotation Track (1440 min)",
            shortname: "1440Min Rotation",
            units: {
                "s⁻¹": {
                    min: .003,
                    max: .02,
                    intervals: [0.001],
                },
            },
            
            description: '',
        },
        "MESH_Max_30min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (30 min)",
            shortname: "Max Hail Size (30 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_Max_60min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (60 min)",
            shortname: "Max Hail Size (60 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_Max_120min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (120 min)",
            shortname: "Max Hail Size (120 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_Max_240min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (240 min)",
            shortname: "Max Hail Size (240 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_Max_360min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (360 min)",
            shortname: "Max Hail Size (360 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_Max_1440min_00.50": {
            category: "Hail",
            variable: "Max Hail Size (1440 min)",
            shortname: "Max Hail Size (1440 min)",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "MESH_00.50": {
            category: "Hail",
            variable: "Max Hail Size",
            shortname: "Max Hail Size",
            units: {
                "mm": {
                    min: 1,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARIMAX_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (Max)",
            shortname: "FF ARI (Max)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI30M_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (30 Min)",
            shortname: "FF ARI (30 Min)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI01H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (1hr)",
            shortname: "FF ARI (1hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI03H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (3hr)",
            shortname: "FF ARI (3hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI06H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (6hr)",
            shortname: "FF ARI (6hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI12H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (12hr)",
            shortname: "FF ARI (12hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "FLASH_QPE_ARI24H_00.00": {
            category: "Flash Flood",
            variable: "Flash Flood ARI (24hr)",
            shortname: "FF ARI (24hr)",
            units: {
                "year": {
                    min: 1,
                    max: 500,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "LightningProbabilityNext30minGrid_scale_1": {
            category: "Lightning",
            variable: "Lightning Probability (30 Min)",
            shortname: "Lightning Prob (30 Min)",
            units: {
                "%": {
                    min: 5,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "LightningProbabilityNext60minGrid_scale_1": {
            category: "Lightning",
            variable: "Lightning Probability (60 Min)",
            shortname: "Lightning Prob (60 Min)",
            units: {
                "%": {
                    min: 5,
                    max: 100,
                    intervals: [5],
                },
            },
            
            description: '',
        },
        "VIL_Max_1440min_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Max Vertically Integrated Liquid (1440 Min)",
            shortname: "Max VIL (1440 Min)",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
        "VIL_Max_120min_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Max Vertically Integrated Liquid (120 Min)",
            shortname: "Max VIL (120 Min)",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
        "VIL_00.50": {
            category: "Vertically Integrated Liquid",
            variable: "Vertically Integrated Liquid",
            shortname: "VIL",
            units: {
                "kg/m²": {
                    min: 0.1,
                    max: 100,
                    intervals: [2],
                },
            },
            
            description: '',
        },
    },
    variable_cmap: {
        //mrms
        'MergedReflectivityQCComposite_00.50': 'refc_0',
        'CREF_1HR_MAX_00.50': 'refc_0',

        "RotationTrackML60min_00.50": 'rotation',
        "RotationTrackML360min_00.50": 'rotation',
        "RotationTrackML30min_00.50": 'rotation',
        "RotationTrackML240min_00.50": 'rotation',
        "RotationTrackML1440min_00.50": 'rotation',
        "RotationTrackML120min_00.50": 'rotation',
        "RotationTrack60min_00.50": 'rotation',
        "RotationTrack360min_00.50": 'rotation',
        "RotationTrack30min_00.50": 'rotation',
        "RotationTrack240min_00.50": 'rotation',
        "RotationTrack1440min_00.50": 'rotation',
        "RotationTrack120min_00.50": 'rotation',

        "MESH_Max_60min_00.50": 'hail',
        "MESH_Max_360min_00.50": 'hail',
        "MESH_Max_30min_00.50": 'hail',
        "MESH_Max_240min_00.50": 'hail',
        "MESH_Max_1440min_00.50": 'hail',
        "MESH_Max_120min_00.50": 'hail',
        "MESH_00.50": 'hail',

        "FLASH_QPE_ARIMAX_00.00": 'ff_ari',
        "FLASH_QPE_ARI30M_00.00": 'ff_ari',
        "FLASH_QPE_ARI24H_00.00": 'ff_ari',
        "FLASH_QPE_ARI12H_00.00": 'ff_ari',
        "FLASH_QPE_ARI06H_00.00": 'ff_ari',
        "FLASH_QPE_ARI03H_00.00": 'ff_ari',
        "FLASH_QPE_ARI01H_00.00": 'ff_ari',

        "LightningProbabilityNext60minGrid_scale_1": 'lightning_prob',
        "LightningProbabilityNext30minGrid_scale_1": 'lightning_prob',

        "VIL_Max_1440min_00.50": 'vil',
        "VIL_Max_120min_00.50": 'vil',
        "VIL_Density_00.50": 'vil',
        "VIL_00.50": 'vil',
        "LVL3_HighResVIL_00.50": 'vil',

        // "PrecipFlag_00.00": 'ptype'

        //model
        'wind_speed_200': "wind_speed_upper",
        'wind_speed_250': "wind_speed_upper",
        'wind_speed_300': "wind_speed_upper",
        'wind_speed_2pvu': "wind_speed_upper",
        'wind_speed_2000': "wind_speed_upper",

        'wind_speed_500': "wind_speed_mid",
        'wind_speed_700': "wind_speed_mid",
        'wind_speed_850': "wind_speed_mid",
        'wind_speed_925': "wind_speed_mid",

        'bulk_shear_speedmb_500': "bulk_shear_speed_upper",
        'bulk_shear_speedmb_700': "bulk_shear_speed_upper",
        'bulk_shear_speed_0-6000': "bulk_shear_speed_upper",
        'bulk_shear_speedmb_850': "bulk_shear_speed_lower",
        'bulk_shear_speedmb_925': "bulk_shear_speed_lower",
        'bulk_shear_speed_0-1000': "bulk_shear_speed_lower",
        
        "cape_9000": "cape_0",
        "cape_25500": "cape_0",

        "cin_9000": "cin_0",
        "cin_25500": "cin_0",

        'tadv_300': "tadv",
        'tadv_700': "tadv",
        'tadv_850': "tadv",

        'r_500': "r",
        'r_700': "r",
        'r_850': "r",
        'r_925': "r",

        'w_500': "w",
        'w_700': "w",
        'w_850': "w",
        'w_925': "w",

        't_500': "t",
        't_700': "t",
        't_850': "t",
        't_925': "t",

        'refc_500': 'refc_0',
        'refd_1000': 'refc_0',
        'mxrefc_1000': 'refc_0',

        'd_700': "d",
        'd_850': "d",
        'd_925': "d",

        'vo_500': "vo",
        'vo_700': "vo",
        'vo_850': "vo",
        'vo_10': "vo",

        'hlcy_3000': "hlcy",
        'hlcy_1000': "hlcy",
        'uphl_5000': "mxuphl_5000",

        'ehi_3000': "ehi",
        'ehi_1000': "ehi",

        'mxuphl_5000_runmax': "mxuphl_5000",
        'mxuphl_3000_runmax': "mxuphl_3000",

        'gust_runmax': "gust_0",

        'height_pbl': "cape_0",

        'lftx_500': "lftx_0",

        'ltng_0': 'ltng',
        'ltng_2': 'ltng',

        'divergence_850': "divergence",
        'divergence_200': "divergence",

        'fgen_850': "fgen",
        'fgen_700': "fgen",

        'avg_prate_6hr': "prate",
        'avg_prate_3hr': "prate",

        'csnow_3': 'csnow_total',
        'csnow_6': 'csnow_total',
        'csnow_12': 'csnow_total',
        'csnow_24': 'csnow_total',
        'csnow_48': 'csnow_total',
        'csnow_total': 'csnow_total',
        'cfrzr_3': 'cfrzr_total',
        'cfrzr_6': 'cfrzr_total',
        'cfrzr_12': 'cfrzr_total',
        'cfrzr_24': 'cfrzr_total',
        'cfrzr_48': 'cfrzr_total',
        'cfrzr_total': 'cfrzr_total',
        'crain_3': 'crain_total',
        'crain_6': 'crain_total',
        'crain_12': 'crain_total',
        'crain_24': 'crain_total',
        'crain_48': 'crain_total',
        'crain_total': 'crain_total',
        'cicep_3': 'cicep_total',
        'cicep_6': 'cicep_total',
        'cicep_12': 'cicep_total',
        'cicep_24': 'cicep_total',
        'cicep_48': 'cicep_total',
        'cicep_total': 'cicep_total',
        'tp_3': 'tp_0_total',
        'tp_6': 'tp_0_total',
        'tp_12': 'tp_0_total',
        'tp_24': 'tp_0_total',
        'tp_48': 'tp_0_total',

        "gh_tendency_500": 'gh_tendency',

        'atemp': '2t_2',
        't_500iso0': 't_iso',
        't_700iso0': 't_iso',
        't_850iso0': 't_iso',
        't_925iso0': 't_iso',
        '2t_2iso0': 't_iso',
    },
};

const DEFAULT_COLORMAPS = {
    "MergedZdr_04.00" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'dB' : {
                colormap : [
                    -4, "#404040",
                    -2, "#808080",
                    -0.5, "#c0c0c0",
                    0.0, "#e0e0e0",
                    0.3, "#9966cc",
                    0.6, "#000080",
                    1.0, "#0066cc",
                    1.5, "#00cccc",
                    2.0, "#00ff00",
                    2.5, "#ffff00",
                    3.0, "#ff9900",
                    4.0, "#ff0000",
                    5.0, "#cc0000",
                    6.0, "#ff66cc",
                    8.0, "#ffffff",
                    20.0, "#800080",
                ],
                breakpoints : [
                    -4, -2, -0.5, 0.0, 0.3, 0.6, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 20.0
                ],
            },
        },
    },
    "MergedRhoHV_04.00" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    0.20, "#c0c0c0",
                    0.45, "#c0c0c0",
                    0.65, "#000080",
                    0.75, "#0000ff",
                    0.80, "#8066ff",
                    0.85, "#00ff00",
                    0.90, "#80ff00",
                    0.93, "#ffff00",
                    0.95, "#ffcc00",
                    0.96, "#ff9900",
                    0.97, "#ff6600",
                    0.98, "#ff0000",
                    0.99, "#cc0000",
                    1.00, "#800080",
                    1.05, "#ffccff",
                    3.00, "#800080",
                ],
                breakpoints : [
                    0.20, 0.45, 0.65, 0.75, 0.80, 0.85, 0.90, 0.93, 0.95, 0.96, 0.97, 0.98, 0.99, 
                    1.00, 1.05, 3.00
                ],
            },
        },
    },
    "rotation" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            's⁻¹' : {
                colormap : [
                    0.000, "#e0e0e0",
                    0.003, "#c0c0c0",
                    0.004, "#a0a0a0",
                    0.005, "#808080",
                    0.006, "#666600",
                    0.007, "#999900",
                    0.008, "#cccc00",
                    0.009, "#ffff00",
                    0.010, "#ffff00",
                    0.011, "#cc0000",
                    0.012, "#cc0000",
                    0.013, "#ff0000",
                    0.014, "#ff0000",
                    0.015, "#ff0000",
                    0.020, "#00ffff",
                ],
                breakpoints : [
                    0.000, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.010, 
                    0.011, 0.012, 0.013, 0.014, 0.015, 0.020
                ],
            },
        },
    },
    "hail" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'mm' : {
                colormap : [
                    0, "#00ffff",
                    1, "#00ffff",
                    2, "#0099ff",
                    4, "#0066ff",
                    6, "#00ff00",
                    8, "#00ff00",
                    10, "#00ff00",
                    15, "#ffff00",
                    20, "#ffcc00",
                    30, "#ff9900",
                    40, "#ff0000",
                    50, "#ff0000",
                    75, "#ff00ff",
                    100, "#8000ff",
                ],
                breakpoints : [
                    0, 1, 2, 4, 6, 8, 10, 15, 20, 30, 40, 50, 75, 100
                ],
            },
        },
    },
    "ff_ari" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'year' : {
                colormap : [
                    0, "#e0e0e0",
                    1, "#00ff00",
                    2, "#00ff00",
                    3, "#ffff00",
                    4, "#ffff00",
                    6, "#ffcc00",
                    8, "#ff9900",
                    10, "#ff9900",
                    20, "#ff0000",
                    30, "#ff0000",
                    40, "#ff0000",
                    50, "#ff0000",
                    75, "#ff00ff",
                    100, "#ff00ff",
                    200, "#8000ff",
                ],
                breakpoints : [
                    0, 1, 2, 3, 4, 6, 8, 10, 20, 30, 40, 50, 75, 100, 200
                ],
            },
        },
    },
    "lightning_prob" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            '%' : {
                colormap : [
                    10, "#00ccff",
                    20, "#0066ff",
                    30, "#00ff00",
                    40, "#00ff00",
                    50, "#00ff00",
                    60, "#ffff00",
                    70, "#ff9900",
                    80, "#ffccff",
                    90, "#ff00ff",
                    100, "#ffffff",
                ],
                breakpoints : [
                    10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                ],
            },
        },
    },
    "vil" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'kg/m²' : {
                colormap : [
                    0.1, "#00ffff",
                    1, "#00ffff",
                    2, "#0099ff",
                    3, "#0066ff",
                    4, "#00ff00",
                    5, "#00ff00",
                    6, "#00ff00",
                    7, "#ffff00",
                    8, "#ffcc00",
                    10, "#ff9900",
                    12, "#ff0000",
                    15, "#ff0000",
                    18, "#ff00ff",
                    25, "#8000ff",
                    30, "#8000ff",
                    40, "#ffffff",
                    50, "#e0e0e0",
                    60, "#c0c0c0",
                    70, "#606060",
                ],
                breakpoints : [
                    0.1, 1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 18, 25, 30, 40, 50, 60, 70
                ],
            },
        },
    },
    "gh_tendency" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'dam' : {
                colormap : [
                    -60, "#0000cc",
                    -30, "#0000cc",
                    0, "#ffffff",
                    30, "#e60000",
                    60, "#e60000",
                ],
                breakpoints : [
                    -60, -58, -56, -54, -52, -50, -48, -46, -44, -42, -40, -38, 
                    -36, -34, -32, -30, -28, -26, -24, -22, -20, -18, -16, -14, 
                    -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 
                    20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 
                    52, 54, 56, 58, 60
                ],
            },
        },
    },
    "refc_0" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'dBZ' : {
                colormap : [
                    5, "#2980dc",
                    15, "#00b2d4",
                    20, "#00cc99",
                    25, "#00e07f",
                    30, "#8fd42a",
                    35, "#ffcc00",
                    40, "#ff8c00",
                    45, "#ff6633",
                    50, "#ff3333",
                    55, "#cc3399",
                    60, "#a020f0",
                    65, "#8822ee",
                    70, "#7425e6",
                    75, "#cc33cc",
                    80, "#ff66dd",
                ],
                breakpoints : [
                    5, 10, 15, 20, 25, 30, 35,40 ,45, 50, 55, 60, 65, 70, 75, 80
                ],
            },
        },
    },
    "mslma_0" : {
        type: "line",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'hPa' : {
                colormap : [
                    900, "#0033ff",
                    1000, "#00d5ff",
                    1002, "#ff6666", 
                    1060, "#ff0000" 
                ],
                breakpoints : [
                    870, 872, 874, 876, 878, 880, 882, 884, 886, 888, 890, 892, 894, 896, 898, 
                    900, 902, 904, 906, 908, 910, 912, 914, 916, 918, 920, 922, 924, 926, 928, 
                    930, 932, 934, 936, 938, 940, 942, 944, 946, 948, 950, 952, 954, 956, 958, 
                    960, 962, 964, 966, 968, 970, 972, 974, 976, 978, 980, 982, 984, 986, 988, 
                    990, 992, 994, 996, 998, 1000, 1002, 1004, 1006, 1008, 1010, 1012, 1014, 
                    1016, 1018, 1020, 1022, 1024, 1026, 1028, 1030, 1032, 1034, 1036, 1038, 
                    1040, 1042, 1044, 1046, 1048, 1050, 1052, 1054, 1056, 1058, 1060, 1062, 
                    1064, 1066, 1068, 1070, 1072, 1074, 1076, 1078, 1080, 1082, 1084, 1086, 
                    1088, 1090
                ],
            }
        }
    },
    "pres2PVU" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'hPa' : {
                colormap : [
                    20, "#cc3333",
                    150, "#ff9933",
                    210, "#ffdd00",
                    375, "#33cc66",
                    390, "#3366cc",
                    510, "#4d88ff",
                    570, "#66e6ff",
                    645, "#ff99ff",
                    750, "#cc33cc",
                ],
                breakpoints : [
                    30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 
                    270, 285, 300, 315, 330, 
                    345, 360, 375, 390, 405, 420, 435, 450, 465, 480, 495, 510, 525, 540, 555, 
                    570, 585, 600, 615, 630, 645, 660, 675, 
                    690, 705, 720, 735, 750, 765, 780, 795, 810, 825, 840
                ],
            }
        }
    },
    "theta2PVU" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            '°K' : {
                colormap : [
                    260, "#cc66cc",
                    300, "#cc0066",
                    320, "#66ccff",
                    345, "#3366cc",
                    350, "#00cc33",
                    375, "#ffee00",
                    450, "#ff3333",
                ],
                breakpoints : [
                    260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 
                    335, 340, 345, 350, 355, 360, 365, 
                    370, 375, 380, 385, 390, 395, 400, 405, 
                    410, 415, 420, 425, 430, 435, 440, 445, 450, 455, 460, 465, 470, 475, 
                    480, 485, 490, 495
                ],
            }
        }
    },
    "vo" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            's⁻¹' : {
                colormap : [
                    -80, "#444444",
                    -40, "#444444",
                    0, "#dddddd",
                    4, "#ffee66",
                    12, "#ff9933",
                    20, "#ff6600",
                    32, "#cc3366",
                    40, "#9933aa",
                    60, "#3333ff",
                    72, "#333399",
                    80, "#00ffff",
                    150, "#ffffffff"
                ],
                
                breakpoints : [
                    -80, -76, -72, -68, -64, -60, -56, -52, -48, -44, -40, -36, -32, -28, -24, -20, 
                    -16, -12, -8, -4, 0, 4, 
                    8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72, 76, 80, 84, 
                    88, 92, 96, 100, 104, 108, 112,
                    114, 118, 122, 126, 130, 134, 138, 142, 146, 150
                ],
            }
        }
    },
    "bulk_shear_speed_upper" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'kts' : {
                colormap : [
                    20, "#99ffff",
                    40, "#7733cc",
                    50, "#ff66cc",
                    60, "#ff3377",
                    70, "#993399",
                    80, "#ff3333",
                    90, "#cc0000",
                    100, "#ff9900",
                    120, "#ffdd00",
                    140, "#ff8800",
                ],
                breakpoints : [
                    20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180
                ],
            },
            'm/s' : {
                colormap : [
                    10, "#99ffff",
                    22, "#7733cc",
                    26, "#ff66cc",
                    30, "#ff3377",
                    38, "#993399",
                    42, "#ff3333",
                    46, "#cc0000",
                    50, "#ff9900",
                    62, "#ffdd00",
                    70, "#ff8800",
                ],
                breakpoints : [
                    10, 14, 18, 22, 26, 30, 34, 38, 42, 46, 50, 54,
                     58, 62, 66, 70, 74, 78, 82, 86, 90
                ],
            }
        }
    },
    "bulk_shear_speed_lower" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'kts' : {
                colormap : [
                    10, "#99ffff",
                    20, "#ff66cc",
                    30, "#ff3377",
                    40, "#993399",
                    50, "#ff3333",
                    60, "#ff9900",
                    70, "#ffdd00",
                    80, "#ff8800",
                ],
                breakpoints : [
                    10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90
                ],
            },
            'm/s' : {
                colormap : [
                    5, "#99ffff",
                    11, "#ff66cc",
                    15, "#ff3377",
                    21, "#993399",
                    25, "#ff3333",
                    31, "#ff9900",
                    35, "#ffdd00",
                    41, "#ff8800",
                ],
                breakpoints : [
                    5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 
                    31, 33, 35, 37, 39, 41, 43, 45
                ],
            }
        }
    },
    "hlcy" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'm²/s²' : {
                colormap : [
                    -1e3, "#33007a",
                    0, "#dddddd",
                    50, "#888888",
                    100, "#3377cc",
                    150, "#66bbff",
                    200, "#ffdd00",
                    300, "#ffcc00",
                    350, "#ff0000",
                    400, "#cc0066",
                    450, "#8800cc",
                    500, "#cc66ff",
                    600, "#ffbbbb",
                    1500, "#ff8800",
                ],
                breakpoints : [
                    -1500, -1450, -1400, -1350, -1300, -1250, -1200, -1150, -1100, -1050, -1e3, -950, 
                    -900, -850, -800, -750, -700, -650, -600, -550, -500, -450, -400, -350, -300, -250, 
                    -200, 
                    -150, -100, -50, 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 
                    700, 750, 800, 850, 900, 950, 
                    1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500
                ],
            },
        },
    },
    "mxuphl_5000" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'm²/s²' : {
                colormap : [
                    2, "#99ffff",
                    90, "#0077ff",
                    100, "#ffee00",
                    200, "#ff66ff",
                    400, "#8800ee",
                ],
                breakpoints : [
                    2,5,10,10,20,30,40,50,60,70,80,90,100,120,140,160,180,
                    200,220,240,260,280,300,320,340,360,380,400,
                    440,480,520,560
                ],
            },
        },
    },
    "mxuphl_3000" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'm²/s²' : {
                colormap : [
                    2, "#99ffff",
                    90, "#0077ff",
                    100, "#ffee00",
                    200, "#ff66ff",
                    300, "#8800ee",
                ],
                breakpoints : [
                    2,5,10,10,20,30,40,50,60,70,80,90,
                    100,110,120,130,140,150,160,170,180,190,200,220,240,260,280,300
                ],
            },
        },
    },
    "ehi" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    -20, "#33007a",
                    0, "#dddddd",
                    1, "#3377cc",
                    2, "#ffee00",
                    6, "#cc0066",
                    8, "#8800cc",
                    20, "#ffbbbb",
                ],
                breakpoints : [
                    -20, -19.5, -19, -18.5, -18, -17.5, -17, -16.5, -16, -15.5, -15, -14.5, 
                    -14, -13.5, -13, 
                    -12.5, -12, -11.5, -11, -10.5, -10, -9.5, -9, -8.5, -8, -7.5, -7, -6.5, 
                    -6, -5.5, -5, -4.5, -4, 
                    -3.5, -3, -2.5, -2, -1.5, -1, -0.5, 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 
                    4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 
                    7.0, 7.5, 8.0, 8.5, 9.0, 9.5, 10.0, 10.5, 11.0, 11.5, 12.0, 12.5, 13.0, 13.5, 14.0, 
                    14.5, 15.0, 15.5, 16.0, 16.5, 
                    17.0, 17.5, 18.0, 18.5, 19.0, 19.5, 20.0
                ],
            },
        },
    },
    "slr" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'in. Snow/in. Liquid' : {
                colormap : [
                    1, "#ccffff",
                    7, "#0088ff",
                    9, "#7733cc",
                    10, "#ff66ff",
                    15, "#ffcc99",
                    50, "#ff8800",
                ],
                breakpoints : [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 
                    15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
                     30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44,
                      45, 46, 47, 48, 49, 50
                ],
            },
        },
    },
    "2t_2" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            '°F' : {
                colormap : [
                    -90, "#FFFFFF",
                    -60, "#d9c2ff",
                    -30, "#cc0088",
                    0, "#8822ee",
                    32, "#0077ff",
                    33, "#00cccc",
                    50, "#00dd66",
                    60, "#ffbb00",
                    80, "#ff5500",
                    100, "#ff0066",
                    120, "#cc0088",
                    150, "#FFFFFF",
                ],
                breakpoints: [
                    -90, -88, -86, -84, -82, -80, -78, -76, -74, 
                    -72, -70, -68, -66, -64, -62, -60, -58, -56, -54, -52, 
                    -50, -48, -46, -44, -42, -40, -38, -36, -34, -32, -30, 
                    -28, -26, -24, -22, -20, -18, -16, -14, -12, -10, -8, -6, 
                    -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26,
                     28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56,
                      58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86,
                       88, 90, 92, 94, 96, 98, 100, 102, 104, 106, 108, 110, 112,
                        114, 116, 118, 120, 122, 124, 126, 128, 130, 132, 134, 136,
                         138, 140, 142, 144, 146, 148, 150
                ],
            },
            '°C' : {
                colormap : [
                    -70, "#FFFFFF",
                    -40, "#d9c2ff",
                    -31, "#cc0088",
                    -13, "#8822ee",
                    0, "#0077ff",
                    1, "#00cccc",
                    10, "#00dd66",
                    15, "#ffbb00",
                    25, "#ff5500",
                    40, "#ff0066",
                    50, "#cc0088",
                    70, "#FFFFFF",
                ],
                breakpoints: [
                    -70, -68, -66, -64, -62, -60, -58, -56, -54, -52, 
                    -50, -48, -46, -44, -42, -40, -38, -36, -34, -32, -30, -28, 
                    -26, -24, -22, -20, -18, -16, -14, -12, -10, -8, -6, -4, -2, 
                    0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 
                    34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70
                ],
            },
        },
    },
    "t_iso" : {
        type: "line",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            '°C' : {
                colormap : [0, "#0033ff",],
                breakpoints: [0]
            },
        },
    },
    "2d_2" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            '°F' : {
                colormap : [
                    -80, "#ff0000",
                    -60, "#ff5500",
                    -20, "#ffaa00",
                    32, "#dddddd",
                    33, "#66dd88",
                    50, "#00cc66",
                    60, "#0077ff",
                    80, "#66aaff",
                    90, "#ffffff"
                ],
                breakpoints : [
                    -80, -78, -76, -74, -72, -70, -68, -66, -64, 
                    -62, -60, -58, -56, -54, -52, -50, -48, -46, -44, -42, 
                    -40, -38, -36, -34, -32, -30, -28, -26, -24, -22, -20, 
                    -18, -16, -14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8,
                     10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 
                     38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64,
                      66, 68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90
                ],
            },
            '°C' : {
                colormap : [
                    -70, "#ff0000",
                    -50, "#ff5500",
                    -30, "#ffaa00",
                    0, "#dddddd",
                    1, "#66dd88",
                    10, "#00cc66",
                    20, "#0077ff",
                    30, "#66aaff",
                    40, "#ffffff"
                ],
                breakpoints : [
                    -70, -68, -66, -64, -62, -60, -58, -56, -54,
                     -52, -50, -48, -46, -44, -42, -40, -38, -36, -34, -32,
                      -30, -28, -26, -24, -22, -20, -18, -16, -14, -12, -10,
                       -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 
                       22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50
                ],
            },
        },
    },
    "d" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            '°C' : {
                colormap : [
                    -70, "#FFFFFF",
                    -40, "#d9c2ff",
                    -31, "#cc0088",
                    -13, "#8822ee",
                    0, "#0077ff",
                    1, "#00cccc",
                    10, "#00dd66",
                    15, "#ffbb00",
                    25, "#ff5500",
                    40, "#ff0066",
                    50, "#cc0088",
                    70, "#FFFFFF",
                ],
                breakpoints: [
                    -70, -68, -66, -64, -62, -60, -58, -56, -54, -52, 
                    -50, -48, -46, -44, -42, -40, -38, -36, -34, -32, -30, 
                    -28, -26, -24, -22, -20, -18, -16, -14, -12, -10, -8, -6, 
                    -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 
                    28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 
                    58, 60, 62, 64, 66, 68, 70
                ],
            },
        },
    },
    "t" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            '°C' : {
                colormap : [
                    -50, "#ffffff",
                    -35, "#cc0088",
                    -20, "#8822ee",
                    0, "#0077ff",
                    1, "#00cccc",
                    10, "#00dd66",
                    15, "#ffbb00",
                    25, "#ff5500",
                    40, "#ff0066",
                    50, "#cc0088"
                ],
                breakpoints: [
                    -50, -48, -46, -44, -42, -40, -38, -36, -34,
                     -32, -30, -28, -26, -24, -22, -20, -18, -16, -14, 
                     -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 
                     14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50
                ],
            },
        },
    },
    "wind_speed_10" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'kts' : {
                colormap : [
                    5, "#dddddd",
                    10, "#99ccff",
                    15, "#0088ff",
                    35, "#8822ee",
                    50, "#ff0088",
                    70, "#ff8800",
                    120, "#ffff00"
                ],
                breakpoints : [
                    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 
                    70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150
                ],
            },
            'mph' : {
                colormap : [
                    5, "#dddddd",
                    10, "#99ccff",
                    20, "#0088ff",
                    40, "#8822ee",
                    55, "#ff0088",
                    80, "#ff8800",
                    150, "#ffff00"
                ],
                breakpoints : [
                    5, 10, 15, 20, 25, 30, 35, 40, 45, 
                    50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 
                    110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 
                    160, 165, 170, 175, 180, 185, 190, 195, 200
                ],
            },
            'm/s' : {
                colormap : [
                    2, "#dddddd",
                    10, "#0088ff",
                    20, "#8822ee",
                    24, "#ff0088",
                    36, "#ff8800",
                    60, "#ffff00"
                ],
                breakpoints : [
                    2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 
                    22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 
                    46, 48, 50, 52, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 78, 80
                ],
            },
            'km/h' : {
                colormap : [
                    10, "#dddddd",
                    20, "#99ccff",
                    35, "#0088ff",
                    70, "#8822ee",
                    90, "#ff0088",
                    130, "#ff8800",
                    220, "#ffff00"
                ],
                breakpoints : [
                    10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 
                    100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 
                    175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 
                    250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300
                ],
            },
        },
    },
    "wind_speed_upper" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'kts' : {
                colormap : [
                    50, "#99ffff",
                    60, "#00cccc",
                    70, "#00dd66",
                    90, "#ffee00",
                    120, "#ff9900",
                    130, "#ff3333",
                    140, "#9933cc",
                    180, "#ff99ff",
                    200, "#ff6666",
                    250, "#ff0000"
                ],
                breakpoints : [
                    10, 20, 30, 40, 50, 60, 70, 80, 90, 
                    100, 110, 120, 130, 140, 150, 160, 170, 180, 
                    190, 200, 210, 220, 230, 240, 250
                ],
            },
            'mph' : {
                colormap : [
                    55, "#99ffff",
                    70, "#00cccc",
                    80, "#00dd66",
                    105, "#ffee00",
                    140, "#ff9900",
                    150, "#ff3333",
                    160, "#9933cc",
                    205, "#ff99ff",
                    230, "#ff6666",
                    290, "#ff0000"
                ],
                breakpoints : [
                    10, 25, 35, 45, 55, 70, 80, 90, 105, 
                    115, 125, 140, 150, 160, 170, 185, 195, 205, 
                    220, 230, 240, 255, 265, 275, 290
                ],
            },
            'm/s' : {
                colormap : [
                    25, "#99ffff",
                    30, "#00cccc",
                    36, "#00dd66",
                    46, "#ffee00",
                    62, "#ff9900",
                    67, "#ff3333",
                    72, "#9933cc",
                    93, "#ff99ff",
                    103, "#ff6666",
                    129, "#ff0000"
                ],
                breakpoints : [
                    5, 10, 15, 20, 25, 30, 36, 41, 46, 
                    51, 57, 62, 67, 72, 77, 82, 88, 93, 
                    98, 103, 108, 113, 118, 124, 129
                ],
            },
            'km/h' : {
                colormap : [
                    95, "#99ffff",
                    110, "#00cccc",
                    130, "#00dd66",
                    165, "#ffee00",
                    220, "#ff9900",
                    240, "#ff3333",
                    260, "#9933cc",
                    335, "#ff99ff",
                    370, "#ff6666",
                    460, "#ff0000"
                ],
                breakpoints : [
                    20, 35, 55, 75, 95, 110, 130, 150, 165, 
                    185, 205, 220, 240, 260, 280, 295, 315, 335, 
                    350, 370, 390, 410, 425, 445, 460
                ],
            },
        },
    },
    "wind_speed_mid" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'kts' : {
                colormap : [
                    10, "#ccddee",
                    20, "#99ffff",
                    30, "#00cccc",
                    35, "#00dd66",
                    45, "#ffee00",
                    55, "#ff9900",
                    65, "#9933cc",
                    100, "#ff99ff",
                    120, "#ff6666",
                    155, "#ff0000"
                ],
                breakpoints : [
                    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                    55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 
                    115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 
                    165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 
                    215, 220, 225, 230, 235, 240, 245, 250
                ],
            },
            'mph' : {
                colormap : [
                    10, "#ccddee",
                    25, "#99ffff",
                    35, "#00cccc",
                    40, "#00dd66",
                    50, "#ffee00",
                    65, "#ff9900",
                    75, "#9933cc",
                    115, "#ff99ff",
                    140, "#ff6666",
                    180, "#ff0000"
                ],
                breakpoints : [
                    5, 10, 15, 25, 30, 35, 40, 45, 50, 55, 
                    65, 70, 75, 80, 85, 90, 100, 105, 110, 115, 120, 125, 
                    130, 140, 145, 150, 155, 160, 165, 170, 180, 185, 
                    190, 195, 200, 205, 210, 220, 225, 230, 235, 240, 
                    245, 250, 260, 265, 270, 275, 280, 285, 290
                ],
            },
            'm/s' : {
                colormap : [
                    5, "#ccddee",
                    10, "#99ffff",
                    15, "#00cccc",
                    18, "#00dd66",
                    23, "#ffee00",
                    28, "#ff9900",
                    33, "#9933cc",
                    51, "#ff99ff",
                    62, "#ff6666",
                    80, "#ff0000"
                ],
                breakpoints : [
                    2, 5, 8, 10, 13, 15, 18, 20, 23, 26, 
                    28, 31, 33, 36, 38, 41, 44, 46, 49, 51, 54, 57, 
                    59, 62, 64, 67, 69, 72, 74, 77, 80, 82, 
                    85, 87, 90, 92, 95, 97, 100, 103, 105, 108, 
                    110, 113, 115, 118, 120, 123, 125, 128
                ],
            },
            'km/h' : {
                colormap : [
                    20, "#ccddee",
                    35, "#99ffff",
                    55, "#00cccc",
                    65, "#00dd66",
                    85, "#ffee00",
                    100, "#ff9900",
                    120, "#9933cc",
                    185, "#ff99ff",
                    220, "#ff6666",
                    290, "#ff0000"
                ],
                breakpoints : [
                    10, 20, 25, 35, 45, 55, 65, 75, 85, 95, 
                    100, 110, 120, 130, 140, 150, 160, 165, 175, 185, 195, 205, 
                    210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 
                    310, 315, 325, 335, 345, 355, 365, 370, 380, 390, 
                    395, 405, 415, 425, 435, 445, 455, 465
                ],
            },
        },
    },
    "pwat_0" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'mm' : {
                colormap : [
                    0, "#ff5500",
                    10, "#ff9933",
                    25, "#ffcc99",
                    35, "#cc99ff",
                    55, "#8866ff",
                    65, "#5555ff",
                    75, "#3333aa"
                ],
                breakpoints : [
                    1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 
                    27, 29, 31, 33, 35, 37, 39, 41, 43, 45, 47, 49, 51, 53, 55, 
                    57, 59, 61, 63, 65, 67, 69, 71, 73, 75, 77, 79, 81, 83, 85, 87, 89
                ],
            },
            'in' : {
                colormap : [
                    0, "#ff5500",
                    0.5, "#ff9933",
                    1, "#ffcc99",
                    1.5, "#cc99ff",
                    2, "#8866ff",
                    2.5, "#5555ff",
                    3, "#3333aa"
                ],
                breakpoints : [
                    0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 
                    2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0
                ],
            },
        },
    },
    "thetaE" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            '°K' : {
                colormap : [
                    230, "#995522",
                    300, "#ffbb77",
                    320, "#99ff66",
                    325, "#33cc00",
                    330, "#00eeff",
                    335, "#0099aa",
                    340, "#8800ff",
                    355, "#ff0000",
                    360, "#ff0088",
                    370, "#ffaaaa"
                ],
                breakpoints : [
                    230, 235, 240, 245, 250, 255, 260, 265, 270, 
                    275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 
                    335, 340, 345, 350, 355, 360, 365, 370
                ],
            },
        },
    },
    "gust_0" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'mph' : {
                colormap : [
                    20, "#6699ff",
                    30, "#00ffff",
                    35, "#00cc33",
                    45, "#99ff66",
                    50, "#ffdd00",
                    65, "#ff0000",
                    70, "#cc6600",
                    85, "#ffbbbb",
                    100, "#ff3333",
                    120, "#ff8800",
                    200, "#999999",
                ],
                breakpoints : [
                    20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 
                    80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 
                    145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200
                ],
            },
            'kts' : {
                colormap : [
                    15, "#6699ff",
                    25, "#00ffff",
                    30, "#00cc33",
                    40, "#99ff66",
                    50, "#ffdd00",
                    55, "#ff0000",
                    60, "#cc6600",
                    70, "#ffbbbb",
                    90, "#ff3333",
                    100, "#ff8800",
                    150, "#999999",                    
                ],
                breakpoints : [
                    15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 
                    75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150
                ],
            },
            'm/s' : {
                colormap : [
                    10, "#6699ff",
                    14, "#00ffff",
                    16, "#00cc33",
                    20, "#99ff66",
                    24, "#ffdd00",
                    30, "#ff0000",
                    32, "#cc6600",
                    38, "#ffbbbb",
                    44, "#ff3333",
                    52, "#ff8800",
                    80, "#999999"
                ],
                breakpoints : [
                    10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 
                    34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 
                    62, 64, 66, 68, 70, 72, 74, 76, 78, 80
                ],
            },
            'km/h' : {
                colormap : [
                    30, "#6699ff",
                    50, "#00ffff",
                    55, "#00cc33",
                    70, "#99ff66",
                    80, "#ffdd00",
                    105, "#ff0000",
                    115, "#cc6600",
                    135, "#ffbbbb",
                    160, "#ff3333",
                    195, "#ff8800",
                    320, "#999999"
                ],
                breakpoints : [
                    30, 40, 50, 55, 65, 70, 80, 90, 95, 105, 115, 120, 
                    130, 135, 145, 150, 160, 170, 175, 185, 195, 200, 210, 215, 225, 
                    235, 240, 250, 255, 265, 270, 280, 290, 295, 305, 315, 320
                ],
            },
        },
    },
    "ltng" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units : {
            'flashes km⁻²/5 min' : {
                colormap : [
                    0.01, "#dddddd",
                    0.75, "#ffff00",
                    1, "#ff9999",
                    2, "#ff66bb",
                    3, "#cc66cc",
                    5, "#ff66ff",
                    6, "#cc66ff",
                    15, "#ff3399",
                    21, "#ff9933"                                      
                ],
                breakpoints : [
                    .01,0.1,0.25,0.5,0.75,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,17,19,21
                ],
            },
        },
    },
    "cape_0" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'J kg⁻¹' : {
                colormap : [
                    100, "#4dbb6a",
                    250, "#4dbb6a",
                    1000, "#ffca3a",
                    2000, "#ff9a3c",
                    3000, "#ff5e7d",
                    6000, "#9c3fe4"                                    
                ],
                breakpoints : [
                    100, 250, 500, 750, 1000, 1250, 1500, 1750, 2000, 2250, 
                    2500, 2750, 3000, 3250, 3500, 3750, 4000, 4250, 4500, 4750, 5000, 
                    5250, 5500, 5750, 6000, 6250, 6500, 6750, 7000, 7250, 7500, 7750, 
                    8000, 8250, 8500, 8750, 9000, 9250, 9500, 9750, 10000
                ],
            },
        },
    },
    "cape_0-3000" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'J kg⁻¹' : {
                colormap : [
                    5, "#4dbb6a",
                    100, "#ffca3a",
                    200, "#ff9a3c",
                    300, "#ff5e7d",
                    500, "#9c3fe4"                                    
                ],
                breakpoints : [
                    5, 25, 50,75,100,125,150,175,200,225,250,275,300,325,350,375,
                    400,425,450,475,500
                ],
            },
        },
    },
    "stp" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    0.1, "#b3b3b3",
                    1, "#4d80b3",
                    2, "#ffaa00",
                    3, "#ff3366",
                    4, "#cc33ff",
                    5, "#ff66cc",
                    6, "#ff6633",
                    9, "#ffaa66",
                    30, "#00cccc"                    
                ],
                breakpoints : [
                    0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,
                    7.5,8,8.5,9,9.5,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,35,40
                ],
            },
        },
    },
    "supercellComposite" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    0.1, "#b3b3b3",
                    1, "#4d80b3",
                    2, "#ffaa00",
                    3, "#ff3366",
                    4, "#cc33ff",
                    5, "#ff66cc",
                    6, "#ff6633",
                    9, "#ffaa66",
                    20, "#00cccc",
                    50, "white"  
                ],
                breakpoints : [
                    0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,
                    11,12,13,14,15,16,17,18,19,20,22,24,26,28,30,32,34,36,38,40,42,44,46,48,50
                ],
            },
        },
    },
    "tts" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    0.1, "#b3b3b3",
                    1, "#4d80b3",
                    2, "#ffaa00",
                    3, "#ff3366",
                    4, "#cc33ff",
                    5, "#ff66cc",
                    6, "#ff6633",
                    9, "#ffaa66",
                    30, "#00cccc"                    
                ],
                breakpoints : [
                    0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,
                    7.5,8,8.5,9,9.5,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,35,40
                ],
            },
        },
    },
    "tehi" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'None' : {
                colormap : [
                    0.1, "#b3b3b3",
                    1, "#4d80b3",
                    2, "#ffaa00",
                    3, "#ff3366",
                    4, "#cc33ff",
                    5, "#ff66cc",
                    6, "#ff6633",
                    9, "#ffaa66",
                    30, "#00cccc"                    
                ],
                breakpoints : [
                    0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,6.5,7,
                    7.5,8,8.5,9,9.5,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,35,40
                ],
            },
        },
    },
    "lftx_0" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            '°C' : {
                colormap : [
                    -20, "#ffb3b3",
                    -14, "#ff3300",
                    -13, "#cc0000",
                    -12, "#ff6699",
                    -10, "#ff99ff",
                    -9, "#cc66ff",
                    -8, "#9933ff",
                    -7, "#cc0055",
                    -6, "#ff0044",
                    -4, "#ffaa00",
                    -3, "#ffff00",
                    -2, "#6699ff",
                    -1, "#0066cc"                    
                ],
                breakpoints : [
                    -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, 
                    -5, -4, -3, -2, -1
                ],
            },
        },
    },
    "lapse_rates_500700" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            '°C km⁻¹' : {
                colormap : [
                    1, "#cccccc",
                    5, "#666666",
                    6, "#3366cc",
                    7, "#ffff00",
                    8, "#ff9900",
                    9, "#cc33ff",
                    10, "#ff99ff",
                    15, "#cc0000"                    
                ],
                breakpoints : [
                    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
                ],
            },
        },
    },
    "lcl" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units : {
            'm' : {
                colormap : [
                    100, "#cccccc",
                    1000, "#ffcc66",
                    2000, "#ff6633",
                    3000, "#cc0033",
                    4000, "#660033",
                    9000, "#ccccff"  
                ],
                breakpoints : [
                    100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 
                    1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300, 2400, 2500, 
                    2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 
                    3900, 4000, 4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900, 5000, 5100, 
                    5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300, 6400,
                     6500, 6600, 6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 
                     7800, 7900, 8000, 8100, 8200, 8300, 8400, 8500, 8600, 8700, 8800, 8900, 9000, 
                     9100, 9200, 9300, 9400, 9500, 9600, 9700, 9800, 9900, 10000
                ],
            },
            'km' : {
                colormap : [
                    0.1, "#cccccc",
                    1, "#ffcc66",
                    2, "#ff6633",
                    3, "#cc0033",
                    4, "#660033",
                    9, "#ccccff"                    
                ],
                breakpoints : [
                    0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 
                    1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 
                    3.0, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 4.0, 4.1, 4.2, 4.3, 4.4, 4.5,
                     4.6, 4.7, 4.8, 4.9, 5.0, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 6.0, 6.1, 
                     6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 7.0, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 
                     7.8, 7.9, 8.0, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 9.0, 9.1, 9.2, 9.3, 
                     9.4, 9.5, 9.6, 9.7, 9.8, 9.9, 10.0
                ],
            },
            'ft' : {
                colormap : [
                    500, "#cccccc",
                    3000, "#ffcc66",
                    6500, "#ff6633",
                    10000, "#cc0033",
                    13000, "#660033",
                    30000, "#ccccff"                    
                ],
                breakpoints : [
                    500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 
                    6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 
                    12500, 13000, 13500, 14000, 14500, 15000, 15500, 16000, 16500, 17000, 17500, 
                    18000, 18500, 19000, 19500, 20000, 20500, 21000, 21500, 22000, 22500, 23000, 
                    23500, 24000, 24500, 25000, 25500, 26000, 26500, 27000, 27500, 28000, 28500, 
                    29000, 29500, 30000
                ],
            },
        },
    },
    "cin_0" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units: {
            "J kg⁻¹": {
                colormap : [
                    -1e3, "#cccccc",
                    -600, "#ff9900",
                    -400, "#ff99ff",
                    -300, "#cc66ff",
                    -200, "#cc6699",
                    -50, "#ffdd00",                 
                ],
                breakpoints : [
                    -1e3, -950, -900, -850, -800, -750, -700, -650, -600, -550, -500, 
                    -450, -400, -350, -300, -250, -200, -150, -100, -50
                ],
            },
        },
    },
    "dgzrh" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units: {
            "%": {
                colormap : [
                    0, "#5555dd",
                    25, "#ff9999",
                    50, "#ffcc33",
                    75, "#33cc66",
                    100, "#3399ff",                    
                ],
                breakpoints : [
                    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 
                    60, 65, 70, 75, 80, 85, 90, 95, 100
                ],
            },
        },
    },
    "2r_2" : {
        type: "fill",
        gridded: true,
        interpolationType: "interpolate",
        units: {
            "%": {
                colormap : [
                    0, "#444444",
                    25, "#ff6655",
                    50, "#ffcc00",
                    75, "#33cc77",
                    100, "#3399ff",                    
                ],
                breakpoints : [
                    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                    55, 60, 65, 70, 75, 80, 85, 90, 95, 100
                ],
            },
        },
    },
    "r" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units: {
            "%": {
                colormap : [
                    0, "#444444",
                    25, "#ff6655",
                    50, "#ffcc00",
                    75, "#33cc77",
                    100, "#3399ff",                    
                ],
                breakpoints : [
                    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                    55, 60, 65, 70, 75, 80, 85, 90, 95, 100
                ],
            },
        },
    },
    'mean700300mbRH': {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units: {
            "%": {
                colormap : [
                    0, "#444444",
                    25, "#ff6655",
                    50, "#ffcc00",
                    75, "#33cc77",
                    100, "#3399ff",                    
                ],
                breakpoints : [
                    0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 
                    60, 65, 70, 75, 80, 85, 90, 95, 100
                ],
            },
        },
    },
    "fgen" : {
        type: "fill",
        gridded: false,
        interpolationType: "interpolate",
        units: {
            "°C/100km/3hr": {
                colormap : [
                    1, "#cc66ff",
                    10, "#ff66ff",
                    20, "#3333ff",                    
                ],
                breakpoints : [
                    1,3,5,7,9,11,12,13,15,17,19,21,23,25,27,29,
                    31,33,35,37,39,41,43,45,47,49,51,53,55,57,59,61
                ],
            },
        },
    },
    "tadv": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "°C h⁻¹": {
            "colormap": [
              -20, "#6699ff",
              -10, "#ccffff",
              -8, "#ff99ff",
              -6, "#ff66cc",
              -4, "#cc66ff",
              -2, "#66ccff",
              -1, "#ffffff",
              1, "#ffffff",
              2, "#ffcc66",
              4, "#ff9933",
              6, "#ff3333",
              8, "#cccc00",
              10, "#ddcc66",
              20, "#cc9933"
            ],
            "breakpoints": [
                -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10, -9, -8, -7, -6, 
                -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 
                16, 17, 18, 19, 20
            ]
            }
        }
      },
      "ivt": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "kg m⁻¹ s⁻¹": {
            "colormap": [
              250, "#ffbb00",
              800, "#ff6666",
              1600, "#9933cc"
            ],
            "breakpoints": [
                250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 
                950, 1000, 1050, 1100, 1150, 1200, 1250, 1300, 1350, 1400, 1450, 1500, 
                1550, 1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000, 2050, 2100
            ]
          }
        }
      },
      "dgzvvel": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "Pa/s": {
            "colormap": [
              -80, "#00ccff",
              -40, "#3333aa",
              -25, "#ff66cc",
              -10, "#ff7777",
              -2, "#ffee00",
              0, "#cccccc",
              50, "#333333"
            ],
            "breakpoints": [
                -100, -95, -90, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40, -35, 
                -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 
                55, 60, 65, 70, 75, 80, 85, 90, 95, 100
            ]
          }
        }
      },
      "w": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "Pa/s": {
            "colormap": [
              -150, "#00ccff",
              -50, "#3333aa",
              -35, "#ff66cc",
              -20, "#ff7777",
              -5, "#ffee00",
              0, "#cccccc",
              50, "#333333",
              150, 'white',
            ],
            "breakpoints": [
                -150, -145, -140, -135, -130, -125, -120, -115, -110, -105, -100, -95, 
                -90, -85, -80, -75, -70, -65, -60, -55, -50, -45, -40, -35, -30, -25, 
                -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65,
                 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150
            ]
          }
        }
      },
    "crain": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
        "None": {
            "colormap": [
                0, "#000000",
                1, "#66cc66"
            ],
            "breakpoints": []
        }
        }
    },
      "csnow": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "None": {
            "colormap": [
                0, "#000000",
                1, "#6699cc"
            ],
            "breakpoints": []
          }
        }
      },
      "cicep": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "None": {
            "colormap": [
                0, "#000000",
                1, "#cc66ee"
            ],
            "breakpoints": []
          }
        }
      },
      "cfrzr": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "None": {
            "colormap": [
                0, "#000000",
                1, "#ff3399"
            ],
            "breakpoints": []
          }
        }
      },
      "prate": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "in/hr": {
            "colormap": [
              0.005, "#00cc66",
              0.1, "#ffff00",
              0.3, "#ff8800",
              1, "#ff0000",
              1.5, '#ff00cc'
            ],
            "breakpoints": [
                .005,.01,.03,.05,.07,.1,.15,.2,.3,.4,.5,.6,.7,.8,.9,1,1.25,1.5,1.75,2,2.5,3
            ]
          },
          "mm/hr": {
            "colormap": [
              0.1, "#00cc66",
              3, "#ffff00",
              7, "#ff8800",
              24, "#ff0000",
              36, '#ff00cc'
            ],
            "breakpoints": [
                0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 
                10, 12, 14, 16, 18, 20, 22, 24, 30, 36,42
            ],
          }
        }
      },
      "frzrRate": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "in/hr [QPF]": {
            "colormap": [
              0.005, "#ff3300",
              0.1, "#ff33ff",
              0.6, "#cc99cc"
            ],
            "breakpoints": [
                .005,.01,.03,.05,.07,.1,.15,.2,.3,.4,.5,.6,.7,.8,.9,1,1.25,1.5,1.75,2,2.5,3
            ],
          },
          "mm/hr [QPF]": {
            "colormap": [
              0.1, "#ff3300",
              3, "#ff33ff",
              14, "#cc99cc"
            ],
            "breakpoints": [
                0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14,
                 16, 18, 20, 22, 24, 30, 36
            ],
          }
        }
      },
      "icepRate": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "in/hr [3:1]": {
            "colormap": [
              0.005, "#8800cc",
              0.2, "#aa44dd",
              0.6, "#cc88dd"
            ],
            "breakpoints": [
                .005,.01,.03,.05,.07,.1,.15,.2,.3,.4,.5,.6,.7,.8,.9,1,1.25,1.5,1.75,2,2.5,3
            ]
          },
          "mm/hr [3:1]": {
            "colormap": [
              0.1, "#8800cc",
              6, "#aa44dd",
              16, "#cc88dd"
            ],
            "breakpoints": [
                0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 
                16, 18, 20, 22, 24, 30, 36
            ]
          }
        }
      },
      "rainRate": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "in/hr": {
            "colormap": [
              0.005, "#00cc66",
              0.1, "#ffff00",
              0.3, "#ff8800",
              1, "#ff0000",
              1.5, '#ff00cc'
            ],
            "breakpoints": [
                .005,.01,.03,.05,.07,.1,.15,.2,.3,.4,.5,.6,.7,.8,.9,1,1.25,1.5,1.75,2,2.5,3
            ]
          },
          "mm/hr": {
            "colormap": [
              0.1, "#00cc66",
              3, "#ffff00",
              7, "#ff8800",
              24, "#ff0000",
              36, '#ff00cc'
            ],
            "breakpoints": [
                0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 
                22, 24, 30, 36,42
            ]
          }
        }
      },
      "snowRate": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "in/hr [10:1]": {
            "colormap": [
              0.05, "#33ccff",
              1, "#000099",
              4, "#ff00cc"
            ],
            "breakpoints": [
                .05,.1,.3,.5,.7,1,1.5,2,3,4,5,6,7,8,9,10,12,14,16,20,25,30
            ]
          },
          "cm/hr [10:1]": {
            "colormap": [
              0.1, "#33ccff",
              3, "#000099",
              10, "#ff00cc"
            ],
            "breakpoints": [
                0.1, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 
                24, 30, 36
            ]
          }
        }
      },
      "frzrRefl": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "dBZ": {
            "colormap": [
              5, "#ff3300",
              30, '#ffaa33',
              80, "#cc0066"
            ],
            "breakpoints": [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80
            ]
          }
        }
      },
      "icepRefl": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "dBZ": {
            "colormap": [
              5, "#8800cc",
              70, "#ffbb00",
              80, "#dddddd"
            ],
            "breakpoints": [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80
            ]
          }
        }
      },
      "snowRefl": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "dBZ": {
            "colormap": [
              5, "#33ccff",
              35, "#8800cc",
              70, "#ffccff",
              80, "#dddddd"
            ],
            "breakpoints": [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80
            ]
          }
        }
      },
      "rainRefl": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
          "dBZ": {
            "colormap": [
              5, "#00cc66",
              35, "#ffff00",
              70, "#ff8800",
              80, "#ff0000"
            ],
            "breakpoints": [
                5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80
            ]
          }
        }
      },
    "csnow_total" : {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [10:1]": {
                "colormap": [
                    0.1, "#ccffff",
                    2, "#99cccc",
                    5, "#3399ff",
                    6, "#9966ff",
                    11, "#cc66ff",
                    12, "#ff3399",
                    20, "#ff99cc",
                    24, "#ff7788",
                    36, "#ffbb66",
                    48, "#99ccff",
                    300, "#99ffff"
                ],
                "breakpoints": [
                    0.1,0.5,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,7,8,9,10,11,12,14,16,18,20,24,28,32,36,40,45,
                    50,55,60,70,
                    80,90,100,150,200,300,400
                ]
            },
            "cm [10:1]": {
                "colormap": [
                    0.25, "#ccffff",
                    4, "#99cccc",
                    12, "#3399ff",
                    16, "#9966ff",
                    28, "#cc66ff",
                    36, "#ff3399",
                    48, "#ff99cc",
                    60, "#ff7788",
                    90, "#ffbb66",
                    120, "#99ccff",
                    700, "#99ffff"
                ],
                "breakpoints": [
                    0.25, .5, 1, 2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 60, 68, 76,
                     82, 90, 100,
                    120, 140, 160, 180, 200, 250, 300, 400, 500, 600, 700
                ]
            },
            "mm [10:1]": {
                "colormap": [
                    2.5, "#ccffff",
                    40, "#99cccc",
                    120, "#3399ff",
                    160, "#9966ff",
                    280, "#cc66ff",
                    360, "#ff3399",
                    480, "#ff99cc",
                    600, "#ff7788",
                    900, "#ffbb66",
                    1200, "#99ccff",
                    7000, "#99ffff"
                ],
                "breakpoints": [
                    2.5, 5, 10, 20, 40, 60, 80, 100, 120, 140, 160, 200, 240, 280, 320, 360, 400, 440, 480, 520, 600, 680, 760, 820, 900, 1000,
                    1200, 1400, 1600, 1800, 2000, 2500, 3000, 4000, 5000, 6000, 7000
                ]
            }
        }
    },
    "csnow_1" : {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [10:1]": {
                "colormap": [
                    0.1, "#aaaaaa",
                    0.25, "#444444",
                    .5, "#66aaff",
                    .75, "#0022cc",
                    1, "#99ff00",
                    1.5, "#00aa00",
                    2, "#ffee00",
                    2.5, "#ff3333",
                    3, "#ff66ff",
                    3.5, "#880066",
                    4, "#666666",
                    10, "#666666"
                ],
                "breakpoints": [
                    0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,7,8,9,10
                ]
            },
            "cm [10:1]": {
                "colormap": [
                    0.25, "#aaaaaa",
                    0.5, "#444444",
                    1.5, "#66aaff",
                    2, "#0022cc",
                    2.5, "#99ff00",
                    4, "#00aa00",
                    5, "#ffee00",
                    6, "#ff3333",
                    8, "#ff66ff",
                    9, "#880066",
                    10, "#666666",
                    26, "#666666"
                ],
                "breakpoints": [
                    .25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,7,8,9,10,11,12,14,16,18,20,22,24,26
                ]
            },
            "mm [10:1]": {
                "colormap": [
                    2.5, "#aaaaaa",
                    5, "#444444",
                    15, "#66aaff",
                    20, "#0022cc",
                    25, "#99ff00",
                    40, "#00aa00",
                    50, "#ffee00",
                    60, "#ff3333",
                    80, "#ff66ff",
                    90, "#880066",
                    100, "#666666",
                    260, "#666666"
                ],
                "breakpoints": [
                    2.5, 5, 7.5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90,
                     100, 110, 120, 140, 160, 180, 200, 220, 240, 260
                ]
            }
        }
    },
    "cfrzr_total" : {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [QPF]": {
                "colormap": [
                    0.01, "#eeccff",
                    .1, "#ff9999",
                    .25, "#cc3366",
                    .5, "#ff9933",
                    .75, "#ffee00",
                    1, "#00cccc",
                    3, "#99ffff"
                ],
                "breakpoints": [
                    0.01,0.1,0.25,0.5,0.75,1,1.5,2,2.5,3,3.5,4,4.5,5,5.5,6,7,8,9,10
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#eeccff",
                    .25, "#ff9999",
                    .75, "#cc3366",
                    1, "#cc0066",
                    2, "#ffee00",
                    3, "#00cccc",
                    7, "#99ffff"
                ],
                "breakpoints": [
                    .03,.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,
                    3.75,4,4.5,5,5.5,6,7,8,9,10,12,14,16,18,20,22,24,26
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#eeccff",
                    2.5, "#ff9999",
                    7.5, "#cc3366",
                    10, "#cc0066",
                    20, "#ffee00",
                    30, "#00cccc",
                    70, "#99ffff"
                ],
                "breakpoints": [
                    0.3, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5,
                     40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 220, 240, 260
                ]
            }
        }
    },
    "cfrzr_1" : {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [QPF]": {
                "colormap": [
                    0.01, "#eeccff",
                    .1, "#ff9999",
                    .3, "#cc3366",
                    .4, "#cc0033",
                    .5, "#ff9933",
                    .9, "#ffee00",
                    1, "#00cccc",
                    3, "#99ffff"
                ],
                "breakpoints": [
                    0.01,0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9,1,1.25,1.5,1.75,2,2.5,3
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#eeccff",
                    .25, "#ff9999",
                    .75, "#cc3366",
                    1, "#cc0033",
                    2, "#ffee00",
                    3, "#00cccc",
                    7, "#99ffff"
                ],
                "breakpoints": [
                    .03,.25,.5,.75,1,1.25,1.5,1.75,2,2.25,2.5,2.75,3,3.25,3.5,3.75,4,4.5,5,
                    5.5,6,7,8,9,10,12,14,16
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#eeccff",
                    2.5, "#ff9999",
                    7.5, "#cc3366",
                    10, "#cc0033",
                    20, "#ffee00",
                    30, "#00cccc",
                    70, "#99ffff"
                ],
                "breakpoints": [
                    0.3, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 
                    35, 37.5, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160
                ]
            }
        }
    },
    "cicep_total": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [3:1]": {
                "colormap": [
                    0.01, "#eeccff",
                    0.1, "#ff8888",
                    0.25, "#cc6699",
                    0.5, "#ff9933",
                    0.75, "#ffee99",
                    1, "#00cccc",
                    3, "#66ccff"
                ],
                "breakpoints": [
                    0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10
                ]
            },
            "cm [3:1]": {
                "colormap": [
                    0.03, "#eeccff",
                    0.25, "#ff8888",
                    0.75, "#cc6699",
                    1, "#cc33cc",
                    2, "#ffee99",
                    3, "#00cccc",
                    7, "#66ccff"
                ],
                "breakpoints": [
                    0.03, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 
                    3.25, 3.5, 3.75, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 
                    20, 22, 24, 26
                ]
            },
            "mm [3:1]": {
                "colormap": [
                    0.3, "#eeccff",
                    2.5, "#ff8888",
                    7.5, "#cc6699",
                    10, "#cc33cc",
                    20, "#ffee99",
                    30, "#00cccc",
                    70, "#66ccff"
                ],
                "breakpoints": [
                    0.3, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 
                    37.5, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 220, 
                    240, 260
                ]
            }
        }
    },
    "cicep_1": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in [3:1]": {
                "colormap": [
                    0.01, "#eeccff",
                    0.1, "#ff8888",
                    0.3, "#cc6699",
                    0.4, "#cc33cc",
                    0.5, "#ff9933",
                    0.9, "#ffee99",
                    1, "#00cccc",
                    3, "#66ccff"
                ],
                "breakpoints": [
                    0.01, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.5, 3
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#eeccff",
                    0.25, "#ff8888",
                    0.75, "#cc6699",
                    1, "#cc33cc",
                    2, "#ffee99",
                    3, "#00cccc",
                    7, "#66ccff"
                ],
                "breakpoints": [
                    0.03, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 
                    3.25, 3.5, 3.75, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10, 12, 14, 16
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#eeccff",
                    2.5, "#ff8888",
                    7.5, "#cc6699",
                    10, "#cc33cc",
                    20, "#ffee99",
                    30, "#00cccc",
                    70, "#66ccff"
                ],
                "breakpoints": [
                    0.3, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 
                    37.5, 40, 45, 50, 55, 60, 70, 80, 90, 100, 120, 140, 160
                ]
            }
        }
    },
    "crain_total": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in": {
                "colormap": [
                    0.01, "#dddddd",
                    0.1, "#66ff66",
                    0.4, "#00cc00",
                    0.5, "#3399ff",
                    0.9, "#66ccff",
                    1, "#ffff00",
                    1.75, "#ffcc00",
                    2, "#ff9900",
                    3.5, "#ff6600",
                    4, "#994400",
                    10, "#cc9966",
                    12, "#cc33cc",
                    50, "#ff33ff"
                ],
                "breakpoints": [
                    0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9,
                     10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 70, 80, 90, 100
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#dddddd",
                    0.25, "#66ff66",
                    1, "#00cc00",
                    2, "#66ccff",
                    3, "#ffff00",
                    5, "#ff9900",
                    9, "#ff6600",
                    10, "#994400",
                    25, "#cc9966",
                    30, "#cc33cc",
                    100, "#ff33ff"
                ],
                "breakpoints": [
                    0.03, 0.25, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 
                    22, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 130, 150, 170, 
                    200, 230, 250
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#dddddd",
                    2.5, "#66ff66",
                    10, "#00cc00",
                    20, "#66ccff",
                    30, "#ffff00",
                    50, "#ff9900",
                    90, "#ff6600",
                    100, "#994400",
                    250, "#cc9966",
                    300, "#cc33cc",
                    1000, "#ff33ff"
                ],
                "breakpoints": [
                    0.3, 2.5, 7.5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 
                    120, 140, 160, 180, 200, 220, 250, 300, 350, 400, 450, 500, 
                    600, 700, 800, 900, 1000, 1100, 1300, 1500, 1700, 2000, 2300, 2500
                ]
            }
        }
    },
    "crain_1": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in": {
                "colormap": [
                    0.01, "#dddddd",
                    0.1, "#66ff66",
                    0.4, "#00cc00",
                    0.5, "#3399ff",
                    0.9, "#66ccff",
                    1, "#ffff00",
                    1.75, "#ffcc00",
                    2, "#ff9900",
                    3.75, "#ff6600",
                    4, "#994400",
                    10, "#cc9966",
                    12, "#cc33cc"
                ],
                "breakpoints": [
                    0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 
                    5, 5.5, 6, 7, 8, 9, 10, 12
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#dddddd",
                    0.25, "#66ff66",
                    1, "#00cc00",
                    2, "#66ccff",
                    3, "#ffff00",
                    4, "#ffcc00",
                    5, "#ff9900",
                    9, "#ff6600",
                    10, "#994400",
                    25, "#cc9966",
                    30, "#cc33cc"
                ],
                "breakpoints": [
                    0.25, 0.25, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 
                    20, 22, 25, 30
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#dddddd",
                    2.5, "#66ff66",
                    10, "#00cc00",
                    20, "#66ccff",
                    30, "#ffff00",
                    40, "#ffcc00",
                    50, "#ff9900",
                    90, "#ff6600",
                    100, "#994400",
                    250, "#cc9966",
                    300, "#cc33cc"
                ],
                "breakpoints": [
                    2.5, 2.5, 7.5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 
                    140, 160, 180, 200, 220, 250, 300
                ]
            }
        }
    },
    "tp_0_total": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in": {
                "colormap": [
                    0.01, "#dddddd",
                    0.1, "#66ff66",
                    0.4, "#00cc00",
                    0.5, "#3399ff",
                    0.9, "#66ccff",
                    1, "#ffff00",
                    1.75, "#ffcc00",
                    2, "#ff9900",
                    3.5, "#ff6600",
                    4, "#994400",
                    10, "#cc9966",
                    12, "#cc33cc",
                    50, "#ff33ff"
                ],
                "breakpoints": [
                    0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 
                    6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 45, 50, 55, 60, 70, 
                    80, 90, 100
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#dddddd",
                    0.25, "#66ff66",
                    1, "#00cc00",
                    2, "#66ccff",
                    3, "#ffff00",
                    5, "#ff9900",
                    9, "#ff6600",
                    10, "#994400",
                    25, "#cc9966",
                    30, "#cc33cc",
                    100, "#ff33ff"
                ],
                "breakpoints": [
                    0.03, 0.25, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 
                    22, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 130, 150, 170, 200, 230, 250
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#dddddd",
                    2.5, "#66ff66",
                    10, "#00cc00",
                    20, "#66ccff",
                    30, "#ffff00",
                    50, "#ff9900",
                    90, "#ff6600",
                    100, "#994400",
                    250, "#cc9966",
                    300, "#cc33cc",
                    1000, "#ff33ff"
                ],
                "breakpoints": [
                    0.3, 2.5, 7.5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160,
                     180, 200, 220, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000, 1100, 1300, 
                     1500, 1700, 2000, 2300, 2500
                ]
            }
        }
    },
    "tp_0_1": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "in": {
                "colormap": [
                    0.01, "#dddddd",
                    0.1, "#66ff66",
                    0.4, "#00cc00",
                    0.5, "#3399ff",
                    0.9, "#66ccff",
                    1, "#ffff00",
                    1.75, "#ffcc00",
                    2, "#ff9900",
                    3.5, "#ff6600",
                    4, "#994400",
                    10, "#cc9966",
                ],
                "breakpoints": [
                    0.01, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 9, 10
                ]
            },
            "cm": {
                "colormap": [
                    0.03, "#dddddd",
                    0.25, "#66ff66",
                    1, "#00cc00",
                    2, "#66ccff",
                    3, "#ffff00",
                    5, "#ff9900",
                    9, "#ff6600",
                    10, "#994400",
                    25, "#cc9966",
                ],
                "breakpoints": [
                    0.03, 0.25, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 25
                ]
            },
            "mm": {
                "colormap": [
                    0.3, "#dddddd",
                    2.5, "#66ff66",
                    10, "#00cc00",
                    20, "#66ccff",
                    30, "#ffff00",
                    50, "#ff9900",
                    90, "#ff6600",
                    100, "#994400",
                    250, "#cc9966"
                ],
                "breakpoints": [
                    0.3, 2.5, 7.5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200, 
                    220, 250
                ]
            }
        }
    },
    "thickness": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    438, "#0000ff",
                    540, "#0000ff",
                    546, "#ff0000",
                    630, "#ff0000"
                ],
                "breakpoints": [
                    438, 444, 450, 456, 462, 468, 474, 480, 486, 492, 498, 504, 510, 516, 522, 528, 
                    534, 540, 546,
                    552, 558, 564, 570, 576, 582, 588, 594, 600, 606, 612, 618, 624, 630
                ]
            }
        }
    },
    "gh_10": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    2600, "#0033ff",
                    2800, "#00ddff",
                    3000, "#ff6666",
                    3200, "#ff0000"
                ],
                "breakpoints": [
                    2600, 2610, 2620, 2630, 2640, 2650, 2660, 2670, 2680, 2690,
                    2700, 2710, 2720, 2730, 2740, 2750, 2760, 2770, 2780, 2790,
                    2800, 2810, 2820, 2830, 2840, 2850, 2860, 2870, 2880, 2890,
                    2900, 2910, 2920, 2930, 2940, 2950, 2960, 2970, 2980, 2990,
                    3000, 3010, 3020, 3030, 3040, 3050, 3060, 3070, 3080, 3090,
                    3100, 3110, 3120, 3130, 3140, 3150, 3160, 3170, 3180, 3190, 3200
                ]
            }
        }
    },
    "gh_200": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    1080, "#0033ff",
                    1146, "#00ddff",
                    1182, "#ff6666",
                    1290, "#ff0000"
                ],
                "breakpoints": [
                    1080, 1086, 1092, 1098, 1104, 1110, 1116, 1122, 1128, 1134, 1140, 1146, 1152, 1158, 
                    1164, 1170,
                    1176, 1182, 1188, 1194, 1200, 1206, 1212, 1218, 1224, 1230, 1236, 1242, 1248, 1254, 
                    1260, 1266, 1272,
                    1278, 1284, 1290
                ]
            }
        }
    },
    "gh_300": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    768, "#0033ff",
                    852, "#00ddff",
                    948, "#ff6666",
                    1000, "#ff0000"
                ],
                "breakpoints": [
                    768, 774, 780, 786, 792, 798, 804, 810, 816, 822, 828, 834, 840, 846, 852, 858, 864, 
                    870, 876, 882,
                    888, 894, 900, 906, 912, 918, 924, 930, 936, 942, 948, 954, 960, 966, 972, 978, 984, 
                    990, 996, 1000
                ]
            }
        }
    },
    "gh_500": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    438, "#0033ff",
                    501, "#00ddff",
                    600, "#ff6666",
                    640, "#ff0000"
                ],
                "breakpoints": [
                    438, 441, 444, 447, 450, 453, 456, 459, 462, 465, 468, 471, 474, 477, 480, 483, 486, 
                    489, 492, 495,
                    498, 501, 504, 507, 510, 513, 516, 519, 522, 525, 528, 531, 534, 537, 540, 543, 546, 
                    549, 552, 555,
                    558, 561, 564, 567, 570, 573, 576, 579, 582, 585, 588, 591, 594, 597, 600, 603, 606, 
                    609, 612, 615,
                    618, 621, 624, 627, 630, 633, 636, 639, 640
                ]
            }
        }
    },
    "gh_700": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    249, "#0033ff",
                    282, "#00ddff",
                    321, "#ff6666",
                    350, "#ff0000"
                ],
                "breakpoints": [
                    249, 252, 255, 258, 261, 264, 267, 270, 273, 276, 279, 282, 285, 288, 291, 294, 
                    297, 300, 303, 306,
                    309, 312, 315, 318, 321, 324, 327, 330, 333, 336, 339, 342, 345, 348, 350
                ]
            }
        }
    },
    "gh_850": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    120, "#0033ff",
                    141, "#00ddff",
                    153, "#ff6666",
                    170, "#ff0000"
                ],
                "breakpoints": [
                    120, 123, 126, 129, 132, 135, 138, 141, 144, 147, 150, 153, 156, 159, 162, 165, 168, 170
                ]
            }
        }
    },
    "gh_925": {
        "type": "line",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "dam": {
                "colormap": [
                    48, "#0033ff",
                    75, "#00ddff",
                    105, "#ff6666",
                    120, "#ff0000"
                ],
                "breakpoints": [
                    48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90, 91, 96, 99, 102, 
                    105, 108, 111, 114, 117, 120
                ]
            }
        }
    },
    "moistureConvergence": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "s⁻¹": {
                "colormap": [
                    5, "#00ffcc",
                    15, "#00ff33",
                    30, "#00cc00",
                    50, "#006600"
                ],
                "breakpoints": [
                    5, 10, 15, 20, 25, 30, 35, 40, 45, 50
                ]
            }
        }
    },
    "divergence": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "s⁻¹": {
                "colormap": [
                    -30, "#00ccff",
                    -8, "#ff0000",
                    -4, "#ff9900",
                    -2, "#ffee33",
                    0, "#00ffcc",
                    4, "#006600",
                    8, "#00cc00",
                    30, "#222222"
                ],
                "breakpoints": [
                    -30, -29, -28, -27, -26, -25, -24, -23, -22, -21, -20, -19, -18, -17, -16, -15, -14, 
                    -13, -12, -11,
                    -10, -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 
                    14, 15, 16,
                    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30
                ]
            }
        }
    },
    "irsat": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "°C": {
                "colormap": [
                    -100, "#cc66ff",
                    -80, "#f0f0f0",
                    -70, "#000000",
                    -60, "#ff0000",
                    -50, "#ffee00",
                    -40, "#33ff00",
                    -30, "#0033cc",
                    -20, "#00ffff",
                    -18, "#ffffff",
                    60, "#000000"
                ],
                "breakpoints": [
                    -100, -98, -96, -94, -92, -90, -88, -86, -84, -82, -80, -78, -76, -74, -72, -70, -68, 
                    -66, -64, -62, -60,
                    -58, -56, -54, -52, -50, -48, -46, -44, -42, -40, -38, -36, -34, -32, -30, -28, -26, 
                    -24, -22, -20, -18,
                    -16, -14, -12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 
                    28, 30, 32, 34, 36,
                    38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60
                ]
            }
        }
    },
    "vis_0": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "mi": {
                "colormap": [
                    0, "#000000",
                    2, "#444444",
                    5, "#888888",
                    7, "#cccccc",
                    10, "#ffffff"
                ],
                "breakpoints": [
                    0, 2, 5, 7, 10
                ]
            },
            "km": {
                "colormap": [
                    0, "#ffffff",
                    2, "#cccccc",
                    5, "#888888",
                    7, "#444444",
                    10, "#000000"
                ],
                "breakpoints": [
                    0, 2, 5, 7, 10
                ]
            },
        }
    },
    "tcc_0": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "%": {
                "colormap": [
                    0, "#ffffff",
                    20, "#cccccc",
                    50, "#888888",
                    80, "#444444",
                    100, "#000000"
                ],
                "breakpoints": [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                ]
            }
        }
    },
    "hcc_0": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "%": {
                "colormap": [
                    0, "#ffffff",
                    20, "#cccccc",
                    50, "#888888",
                    80, "#444444",
                    100, "#000000"
                ],
                "breakpoints": [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                ]
            }
        }
    },
    "mcc_0": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "%": {
                "colormap": [
                    0, "#ffffff",
                    20, "#cccccc",
                    50, "#888888",
                    80, "#444444",
                    100, "#000000"
                ],
                "breakpoints": [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                ]
            }
        }
    },
    "lcc_0": {
        "type": "fill",
        "gridded": false,
        "interpolationType": "interpolate",
        "units": {
            "%": {
                "colormap": [
                    0, "#ffffff",
                    20, "#cccccc",
                    50, "#888888",
                    80, "#444444",
                    100, "#000000"
                ],
                "breakpoints": [
                    0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
                ]
            }
        }
    }
};

// Helper function from your provided code
function hrdpsObliqueTransform(rotated_lon, rotated_lat) {
    const o_lat_p = 53.91148; const o_lon_p = 245.305142;
    const DEG_TO_RAD = Math.PI / 180.0; const RAD_TO_DEG = 180.0 / Math.PI;
    const o_lat_p_rad = o_lat_p * DEG_TO_RAD;
    const rot_lon_rad = rotated_lon * DEG_TO_RAD;
    const rot_lat_rad = rotated_lat * DEG_TO_RAD;
    const sin_rot_lat = Math.sin(rot_lat_rad); const cos_rot_lat = Math.cos(rot_lat_rad);
    const sin_rot_lon = Math.sin(rot_lon_rad); const cos_rot_lon = Math.cos(rot_lon_rad);
    const sin_o_lat_p = Math.sin(o_lat_p_rad); const cos_o_lat_p = Math.cos(o_lat_p_rad);
    const sin_lat = cos_o_lat_p * sin_rot_lat + sin_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lat = Math.asin(sin_lat) * RAD_TO_DEG;
    const sin_lon_num = cos_rot_lat * sin_rot_lon;
    const sin_lon_den = -sin_o_lat_p * sin_rot_lat + cos_o_lat_p * cos_rot_lat * cos_rot_lon;
    let lon = Math.atan2(sin_lon_num, sin_lon_den) * RAD_TO_DEG + o_lon_p;
    if (lon > 180) lon -= 360; else if (lon < -180) lon += 360;
    return [lon, lat];
}

function findLatestModelRun(modelsData, modelName) {
    const model = modelsData?.[modelName];
    if (!model) return null;
    const availableDates = Object.keys(model).sort((a, b) => b.localeCompare(a));
    for (const date of availableDates) {
        const runs = model[date];
        if (!runs) continue;
        const availableRuns = Object.keys(runs).sort((a, b) => b.localeCompare(a));
        if (availableRuns.length > 0) return { date: date, run: availableRuns[0] };
    }
    return null;
}
class FillLayerManager extends EventEmitter {
    constructor(map, options = {}) {
        super();
        if (!map) throw new Error('A Mapbox GL map instance is required.');

        this.map = map;
        this.timeLayers = new Map();
        this.activeTimeKey = null; 

        this.layerId = options.id || `weather-layer-${Math.random().toString(36).substr(2, 9)}`;
        this.apiKey = options.apiKey;
        this.baseGridUrl = 'https://d3dc62msmxkrd7.cloudfront.net';
        this.worker = this.createWorker();
        this.workerRequestId = 0;
        this.workerResolvers = new Map();
        this.worker.addEventListener('message', this._handleWorkerMessage.bind(this));
        this.statusUrl = 'https://d3dc62msmxkrd7.cloudfront.net/model-status';
        this.modelStatus = null;
        this.mrmsStatus = null;
        this.dataCache = new Map();
        this.isPlaying = false;
        this.playIntervalId = null;
        this.playbackSpeed = options.playbackSpeed || 500;
        this.customColormaps = options.customColormaps || {};
        
        const userLayerOptions = options.layerOptions || {};
        const initialVariable = userLayerOptions.variable || null;
        
        this.state = { 
            model: userLayerOptions.model || 'gfs',
            isMRMS: false,
            mrmsTimestamp: null,
            variable: initialVariable, 
            date: null, 
            run: null, 
            forecastHour: 0, 
            visible: true, 
            opacity: userLayerOptions.opacity ?? 0.85, 
            units: options.initialUnit || 'imperial',
            shaderSmoothingEnabled: options.shaderSmoothingEnabled ?? true
        };
        
        this.autoRefreshEnabled = options.autoRefresh ?? false;
        this.autoRefreshIntervalSeconds = options.autoRefreshInterval ?? 60;
        this.autoRefreshIntervalId = null;

        this.PRELOAD_BATCH_SIZE = 5; 
    }

    async _updateLayerData(state) {
        if (!this.shaderLayer || !state.variable) return;

        const grid = await this._loadGridData(state);

        if (grid && grid.data) {
            const gridModel = state.isMRMS ? 'mrms' : state.model;
            const gridDef = this._getGridCornersAndDef(gridModel).gridDef;
            
            // Remove the hardcoded useNearestFilter logic - smoothing handles this now
            this.shaderLayer.updateDataTexture(
                grid.data, 
                grid.encoding, 
                gridDef.grid_params.nx, 
                gridDef.grid_params.ny,
                { useNearestFilter: !state.shaderSmoothingEnabled }
            );
            this.map.triggerRepaint();
        }
    }

    _updateLayerStyle(state) {
        if (!this.shaderLayer || !state.variable) return;

        const gridModel = state.isMRMS ? 'mrms' : state.model;
        const geometry = this._getGridCornersAndDef(gridModel);
        if (!geometry) return;

        const { corners, gridDef } = geometry;
        const { colormap, baseUnit } = this._getColormapForVariable(state.variable);
        const toUnit = this._getTargetUnit(baseUnit, state.units);
        
        const finalColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);

        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        
        const dataNativeUnit = (DICTIONARIES.fld[state.variable] || {}).defaultUnit || 'none';

        this.shaderLayer.updateGeometry(corners, gridDef);
        this.shaderLayer.updateColormapTexture(finalColormap);
        this.shaderLayer.updateStyle({ opacity: state.opacity, dataRange });
        this.shaderLayer.setUnitConversion(dataNativeUnit, state.units);
        
        this.map.triggerRepaint();
    }

    async setState(newState) {
        const previousState = { ...this.state };
        Object.assign(this.state, newState);

        const variableChanged = 'variable' in newState && newState.variable !== previousState.variable;
        const runChanged = ('date' in newState && 'run' in newState) && (newState.date !== previousState.date || newState.run !== previousState.run);
        const modelChanged = 'model' in newState && newState.model !== previousState.model;
        const modeChanged = 'isMRMS' in newState && newState.isMRMS !== previousState.isMRMS;
        const unitsChanged = 'units' in newState && newState.units !== previousState.units;
        
        // Check for changes in BOTH smoothing controls using the correct names
        const serverSmoothingChanged = 'smoothing' in newState && newState.smoothing !== previousState.smoothing;
        const shaderSmoothingChanged = 'shaderSmoothingEnabled' in newState && newState.shaderSmoothingEnabled !== previousState.shaderSmoothingEnabled;

        // Use the dedicated boolean state to control the shader
        if (this.shaderLayer && typeof this.shaderLayer.setSmoothing === 'function') {
            // The shader's method expects a 'noSmoothing' flag, so we invert our boolean state
            this.shaderLayer.setSmoothing(!this.state.shaderSmoothingEnabled);
        }

        // If the SERVER smoothing value changes, we must refetch all data.
        const needsFullRebuild = variableChanged || runChanged || modelChanged || modeChanged || serverSmoothingChanged;
        const onlyTimeChanged = !needsFullRebuild && ('forecastHour' in newState || 'mrmsTimestamp' in newState);

        if (needsFullRebuild) {
            await this._rebuildLayerAndPreload(this.state);
        } else if (onlyTimeChanged) {
            await this._updateLayerData(this.state);
        } else if (unitsChanged) {
            this._updateLayerStyle(this.state);
        }

        // If only the client-side shader smoothing changed, we just need to trigger a repaint
        if (shaderSmoothingChanged && this.map) {
            this.map.triggerRepaint();
        }

        this._emitStateChange();
    }

    async _rebuildLayerAndPreload(state) {
        // 1. Clean up old layers and cache
        if (this.shaderLayer) {
            this.map.removeLayer(this.shaderLayer.id);
            this.shaderLayer = null;
        }
        this.dataCache.clear();
        if (!state.variable) return;

        // 2. Set up the new layer's visual style
        this.shaderLayer = new GridRenderLayer(this.layerId);

        // VVVV --- ADD THIS BLOCK --- VVVV
        // Ensure the smoothing state is correctly applied to the new layer instance.
        if (typeof this.shaderLayer.setSmoothing === 'function') {
            // The shader's method expects a 'noSmoothing' flag, so we invert our boolean state.
            this.shaderLayer.setSmoothing(!state.shaderSmoothingEnabled);
        }
        // ^^^^ --- END OF ADDED BLOCK --- ^^^^

        this.map.addLayer(this.shaderLayer, 'AML_-_terrain');
        this._updateLayerStyle(state);

        // 3. CRITICAL: Initiate the load for the visible frame.
        this._updateLayerData(state); 
        
        // 4. CRITICAL: Immediately initiate the preload for all other frames.
        this._preloadAllTimeSteps(state); 
    }
    
    _preloadAllTimeSteps(state) {
        const timeSteps = state.isMRMS
            ? (this.mrmsStatus?.[state.variable] || [])
            : (this.modelStatus?.[state.model]?.[state.date]?.[state.run] || []);

        if (!timeSteps || timeSteps.length <= 1) {
            return; // Nothing to preload
        }

        // Get all time steps EXCEPT the one for the visible frame (which was started above)
        const currentFrameTime = state.isMRMS ? state.mrmsTimestamp : state.forecastHour;
        const stepsToPreload = timeSteps.filter(time => time !== currentFrameTime);

        // Use a simple forEach loop to fire all requests immediately and concurrently.
        stepsToPreload.forEach(time => {
            const stateForTime = { ...state, [state.isMRMS ? 'mrmsTimestamp' : 'forecastHour']: time };
            
            // This call just populates the cache.
            this._loadGridData(stateForTime)
                .catch(e => console.warn(`Failed to preload frame for time ${time}`, e));
        });
    }

    // --- NO OTHER CHANGES BELOW THIS LINE ---

    async _initializeLayersForVariable(state) {
        this.timeLayers.forEach(shaderLayer => {
            if (this.map.getLayer(shaderLayer.id)) {
                this.map.removeLayer(shaderLayer.id);
            }
        });
        this.timeLayers.clear();
        this.activeTimeKey = null;

        if (!state.variable) {
            this.map.triggerRepaint();
            return;
        }

        const timeSteps = state.isMRMS
            ? (this.mrmsStatus?.[state.variable] || [])
            : (this.modelStatus?.[state.model]?.[state.date]?.[state.run] || []);

        if (timeSteps.length === 0) return;

        const gridModel = state.isMRMS ? 'mrms' : state.model;
        const geometry = this._getGridCornersAndDef(gridModel);
        if (!geometry) return;
        
        const { corners, gridDef } = geometry;
        const { colormap, baseUnit } = this._getColormapForVariable(state.variable);
        const toUnit = this._getTargetUnit(baseUnit, state.units);
        const finalColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);
        const dataRange = [finalColormap[0], finalColormap[finalColormap.length - 2]];
        const dataNativeUnit = (DICTIONARIES.fld[state.variable] || {}).defaultUnit || 'none';

        timeSteps.forEach(time => {
            const layerId = `${this.layerId}-${time}`;
            const shaderLayer = new GridRenderLayer(layerId);
            
            this.map.addLayer(shaderLayer, 'AML_-_terrain');
            this.timeLayers.set(time, shaderLayer);

            shaderLayer.updateGeometry(corners, gridDef);
            shaderLayer.updateColormapTexture(finalColormap);
            shaderLayer.updateStyle({ opacity: 0, dataRange });
            shaderLayer.setUnitConversion(dataNativeUnit, state.units);

            const stateForTime = { ...state, [state.isMRMS ? 'mrmsTimestamp' : 'forecastHour']: time };
            
            this._loadGridData(stateForTime).then(grid => {
                if (grid && grid.data && this.timeLayers.has(time)) {
                    shaderLayer.updateDataTexture(
                        grid.data, 
                        grid.encoding, 
                        gridDef.grid_params.nx, 
                        gridDef.grid_params.ny
                    );
                }
            }).catch(err => {
                console.error(`Failed to load data for time ${time}:`, err);
            });
        });

        this._setActiveTimeLayer(state);
    }

    _setActiveTimeLayer(state) {
        const timeKey = state.isMRMS ? state.mrmsTimestamp : state.forecastHour;

        if (this.activeTimeKey !== null && this.timeLayers.has(this.activeTimeKey)) {
            this.timeLayers.get(this.activeTimeKey).updateStyle({ opacity: 0 });
        }
        
        if (this.timeLayers.has(timeKey)) {
            const newActiveLayer = this.timeLayers.get(timeKey);
            newActiveLayer.updateStyle({ opacity: this.state.opacity });
            this.activeTimeKey = timeKey;
        } else {
            this.activeTimeKey = null;
        }

        this.map.triggerRepaint();
    }

    async setShaderSmoothing(enabled) {
        if (typeof enabled !== 'boolean' || enabled === this.state.shaderSmoothingEnabled) return;
        
        await this.setState({ shaderSmoothingEnabled: enabled });
    }
    
    async setOpacity(newOpacity) {
        const clampedOpacity = Math.max(0, Math.min(1, newOpacity));
        if (clampedOpacity === this.state.opacity) return;

        this.state.opacity = clampedOpacity;
        if (this.shaderLayer) {
            this.shaderLayer.updateStyle({ opacity: clampedOpacity });
            this.map.triggerRepaint();
        }

        this._emitStateChange();
    }
    
    _emitStateChange() {
        const { colormap, baseUnit } = this._getColormapForVariable(this.state.variable);
        const toUnit = this._getTargetUnit(baseUnit, this.state.units);
        const displayColormap = this._convertColormapUnits(colormap, baseUnit, toUnit);

        let availableTimestamps = [];
        if (this.state.isMRMS && this.state.variable && this.mrmsStatus) {
            const timestamps = this.mrmsStatus[this.state.variable] || [];
            availableTimestamps = [...timestamps].reverse();
        }

        this.emit('state:change', {
            ...this.state,
            availableModels: this.modelStatus ? Object.keys(this.modelStatus).sort() : [],
            availableRuns: this.modelStatus?.[this.state.model] || {},
            availableHours: this.state.isMRMS ? [] : (this.modelStatus?.[this.state.model]?.[this.state.date]?.[this.state.run] || []),
            availableVariables: this.getAvailableVariables(this.state.isMRMS ? 'mrms' : this.state.model),
            availableTimestamps: availableTimestamps,
            isPlaying: this.isPlaying,
            colormap: displayColormap,
            colormapBaseUnit: toUnit,
        });
    }

    destroy() {
        this.pause();
        this.stopAutoRefresh();
        this.timeLayers.forEach(shaderLayer => {
            if (this.map.getLayer(shaderLayer.id)) {
                this.map.removeLayer(shaderLayer.id);
            }
        });
        this.timeLayers.clear();
        this.dataCache.clear();
        this.worker.terminate();
        this.callbacks = {};
        console.log(`FillLayerManager with id "${this.layerId}" has been destroyed.`);
    }

    getAvailableVariables(modelName = null) {
        const model = modelName || this.state.model;
        return MODEL_CONFIGS[model]?.vars || [];
    }

    getVariableDisplayName(variableCode) {
        const varInfo = DICTIONARIES.fld[variableCode];
        return varInfo?.displayName || varInfo?.name || variableCode;
    }

    _handleWorkerMessage(e) {
        const { success, requestId, decompressedData, encoding, error } = e.data;
        if (this.workerResolvers.has(requestId)) {
            const { resolve, reject } = this.workerResolvers.get(requestId);
            if (success) {
                resolve({ data: decompressedData, encoding });
            } else {
                reject(new Error(error));
            }
            this.workerResolvers.delete(requestId);
        }
    }
    
    play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        clearInterval(this.playIntervalId);
        this.playIntervalId = setInterval(() => { this.step(1); }, this.playbackSpeed);
        this.emit('playback:start', { speed: this.playbackSpeed });
    }

    pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        clearInterval(this.playIntervalId);
        this.playIntervalId = null;
        this.emit('playback:stop');
    }

    togglePlay() { this.isPlaying ? this.pause() : this.play(); }

    step(direction = 1) {
        const { model, date, run, forecastHour } = this.state;
        const forecastHours = this.modelStatus?.[model]?.[date]?.[run];
        if (!forecastHours || forecastHours.length === 0) return;
        const currentIndex = forecastHours.indexOf(forecastHour);
        if (currentIndex === -1) return;
        const maxIndex = forecastHours.length - 1;
        let nextIndex = currentIndex + direction;
        if (nextIndex > maxIndex) nextIndex = 0;
        if (nextIndex < 0) nextIndex = maxIndex;
        this.setState({ forecastHour: forecastHours[nextIndex] });
    }
    
    setPlaybackSpeed(speed) {
        if (speed > 0) {
            this.playbackSpeed = speed;
            if (this.isPlaying) this.play();
        }
    }
    
    setVariable(variable) {
        this.setState({ variable });
    }
    
    async setModel(modelName) {
        if (modelName === this.state.model || !this.modelStatus?.[modelName]) return;
        const latestRun = findLatestModelRun(this.modelStatus, modelName);
        if (latestRun) {
            await this.setState({ model: modelName, date: latestRun.date, run: latestRun.run, forecastHour: 0 });
        }
    }
    
    async setRun(runString) {
        const [date, run] = runString.split(':');
        if (date !== this.state.date || run !== this.state.run) {
            await this.setState({ date, run, forecastHour: 0 });
        }
    }

    async setUnits(newUnits) {
        if (newUnits === this.state.units || !['metric', 'imperial'].includes(newUnits)) return;
        await this.setState({ units: newUnits });
    }
    
    async setMRMSVariable(variable) {
        const sortedTimestamps = [...(this.mrmsStatus[variable] || [])].sort((a, b) => b - a);
        const initialTimestamp = sortedTimestamps.length > 0 ? sortedTimestamps[0] : null;

        await this.setState({
            variable,
            isMRMS: true,
            mrmsTimestamp: initialTimestamp,
        });
    }

    async setMRMSTimestamp(timestamp) {
        if (!this.state.isMRMS) return;
        await this.setState({ mrmsTimestamp: timestamp });
    }

    async initialize(options = {}) {
        await this.fetchModelStatus(true);
        await this.fetchMRMSStatus(true);
        
        const latestRun = findLatestModelRun(this.modelStatus, this.state.model);
        let initialState = this.state;
        if (latestRun && !this.state.isMRMS) {
            initialState = { ...this.state, ...latestRun, forecastHour: 0 };
        }
        await this.setState(initialState);
        if (options.autoRefresh ?? this.autoRefreshEnabled) {
            this.startAutoRefresh(options.refreshInterval ?? this.autoRefreshIntervalSeconds);
        }
    }

    async _loadGridData(state) {
        const { model, date, run, forecastHour, variable, isMRMS, mrmsTimestamp } = state;

        // --- START OF EDITED CODE ---

        // Default smoothing to 0.
        let effectiveSmoothing = 0;

        // Check for variable-specific settings in the custom colormaps object.
        const customVariableSettings = this.customColormaps[variable];

        // If settings for this variable exist and a 'smoothing' property is defined, use it.
        if (customVariableSettings && typeof customVariableSettings.smoothing === 'number') {
            effectiveSmoothing = customVariableSettings.smoothing;
        }

        // --- END OF EDITED CODE ---

        let resourcePath;
        let dataUrlIdentifier;

        if (isMRMS) {
            if (!mrmsTimestamp) return null;
            const mrmsDate = new Date(mrmsTimestamp * 1000);
            const y = mrmsDate.getUTCFullYear(), m = (mrmsDate.getUTCMonth() + 1).toString().padStart(2, '0'), d = mrmsDate.getUTCDate().toString().padStart(2, '0');
            
            // Use the 'effectiveSmoothing' value in the URL and cache key.
            dataUrlIdentifier = `mrms-${mrmsTimestamp}-${variable}-${effectiveSmoothing}`;
            resourcePath = `/grids/mrms/${y}${m}${d}/${mrmsTimestamp}/0/${variable}/${effectiveSmoothing}`;
        } else {
            // Use the 'effectiveSmoothing' value in the URL and cache key.
            dataUrlIdentifier = `${model}-${date}-${run}-${forecastHour}-${variable}-${effectiveSmoothing}`;
            resourcePath = `/grids/${model}/${date}/${run}/${forecastHour}/${variable}/${effectiveSmoothing}`;
        }

        if (this.dataCache.has(dataUrlIdentifier)) {
            return this.dataCache.get(dataUrlIdentifier);
        }

        const loadPromise = (async () => {
            if (!this.apiKey) {
                throw new Error('API key is not configured. Please provide an apiKey in the FillLayerManager options.');
            }

            try {
                const directUrl = `${this.baseGridUrl}${resourcePath}?apiKey=${this.apiKey}`;
                
                const response = await fetch(directUrl, {
                    headers: {
                        'x-api-key': this.apiKey
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch grid data: ${response.status} ${response.statusText}`);
                }
                
                const { data: b64Data, encoding } = await response.json();
                const compressedData = Uint8Array.from(atob(b64Data), c => c.charCodeAt(0));
                
                const requestId = this.workerRequestId++;
                const workerPromise = new Promise((resolve, reject) => {
                    this.workerResolvers.set(requestId, { resolve, reject });
                });
                
                this.worker.postMessage({ requestId, compressedData, encoding }, [compressedData.buffer]);
                return workerPromise;

            } catch (error) {
                console.error(`Failed to load data for path ${resourcePath}:`, error);
                this.dataCache.delete(dataUrlIdentifier);
                return null;
            }
        })();
        
        this.dataCache.set(dataUrlIdentifier, loadPromise);
        return loadPromise;
    }

    _getColormapForVariable(variable) {
        if (!variable) return { colormap: [], baseUnit: '' };

        if (this.customColormaps[variable] && this.customColormaps[variable].colormap) {
            return {
                colormap: this.customColormaps[variable].colormap,
                baseUnit: this.customColormaps[variable].baseUnit || ''
            };
        }

        const colormapKey = DICTIONARIES.variable_cmap[variable] || variable;

        const customColormap = this.customColormaps[colormapKey];
        if (customColormap && customColormap.colormap) {
            return {
                colormap: customColormap.colormap,
                baseUnit: customColormap.baseUnit || ''
            };
        }

        const defaultColormapData = DEFAULT_COLORMAPS[colormapKey];
        if (defaultColormapData && defaultColormapData.units) {
            const availableUnits = Object.keys(defaultColormapData.units);
            if (availableUnits.length > 0) {
                const baseUnit = availableUnits[0];
                const unitData = defaultColormapData.units[baseUnit];
                if (unitData && unitData.colormap) {
                    return { colormap: unitData.colormap, baseUnit: baseUnit };
                }
            }
        }

        return { colormap: [], baseUnit: '' };
    }

    _convertColormapUnits(colormap, fromUnits, toUnits) {
        if (fromUnits === toUnits) return colormap;
        const conversionFunc = getUnitConversionFunction(fromUnits, toUnits);
        if (!conversionFunc) return colormap;
        const newColormap = [];
        for (let i = 0; i < colormap.length; i += 2) {
            newColormap.push(conversionFunc(colormap[i]), colormap[i + 1]);
        }
        return newColormap;
    }

    _getGridCornersAndDef(model) {
        const gridDef = { ...COORDINATE_CONFIGS[model], modelName: model };
        if (!gridDef) return null;

        const { nx, ny } = gridDef.grid_params;
        const gridType = gridDef.type;
        let corners;

        if (gridType === 'latlon') {
            let { lon_first, lat_first, lat_last, lon_last, dx_degrees, dy_degrees } = gridDef.grid_params;
            corners = {
                lon_tl: lon_first, lat_tl: lat_first,
                lon_tr: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees), lat_tr: lat_first,
                lon_bl: lon_first, lat_bl: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
                lon_br: lon_last !== undefined ? lon_last : (lon_first + (nx - 1) * dx_degrees), lat_br: lat_last !== undefined ? lat_last : (lat_first + (ny - 1) * dy_degrees),
            };
        } else if (gridType === 'rotated_latlon') {
            const [lon_tl, lat_tl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first);
            const [lon_tr, lat_tr] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first);
            const [lon_bl, lat_bl] = hrdpsObliqueTransform(gridDef.grid_params.lon_first, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            const [lon_br, lat_br] = hrdpsObliqueTransform(gridDef.grid_params.lon_first + (nx - 1) * gridDef.grid_params.dx_degrees, gridDef.grid_params.lat_first + (ny - 1) * gridDef.grid_params.dy_degrees);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else if (gridType === 'lambert_conformal_conic' || gridType === 'polar_ stereographic') {
            let projString = Object.entries(gridDef.proj_params).map(([k,v]) => `+${k}=${v}`).join(' ');
            if(gridType === 'polar_stereographic') projString += ' +lat_0=90';
            const { x_origin, y_origin, dx, dy } = gridDef.grid_params;
            const [lon_tl, lat_tl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin]);
            const [lon_tr, lat_tr] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin]);
            const [lon_bl, lat_bl] = proj4(projString, 'EPSG:4326', [x_origin, y_origin + (ny - 1) * dy]);
            const [lon_br, lat_br] = proj4(projString, 'EPSG:4326', [x_origin + (nx - 1) * dx, y_origin + (ny - 1) * dy]);
            corners = { lon_tl, lat_tl, lon_tr, lat_tr, lon_bl, lat_bl, lon_br, lat_br };
        } else {
            return null;
        }
        return { corners, gridDef };
    }

    _getTargetUnit(defaultUnit, system) {
        if (system === 'metric') {
            if (['°F', '°C'].includes(defaultUnit)) return 'celsius';
            if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'km/h';
            if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'mm';
        }
        if (['°F', '°C'].includes(defaultUnit)) return 'fahrenheit';
        if (['kts', 'mph', 'm/s'].includes(defaultUnit)) return 'mph';
        if (['in', 'mm', 'cm'].includes(defaultUnit)) return 'in';
        return defaultUnit;
    }

    createWorker() {
        const workerCode = `
            import { decompress } from 'https://cdn.skypack.dev/fzstd@0.1.1';
            self.onmessage = async (e) => {
                const { requestId, compressedData, encoding } = e.data;
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
                    self.postMessage({ 
                        success: true, 
                        requestId: requestId, 
                        decompressedData: finalData,
                        encoding: encoding 
                    }, [finalData.buffer]);
                } catch (error) {
                    self.postMessage({ 
                        success: false, 
                        requestId: requestId, 
                        error: error.message 
                    });
                }
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob), { type: 'module' });
    }

    async fetchModelStatus(force = false) {
        if (!this.modelStatus || force) {
            try {
                const response = await fetch(this.statusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                this.modelStatus = (await response.json()).models;
            } catch (error) {
                this.modelStatus = null;
            }
        }
        return this.modelStatus;
    }

    async fetchMRMSStatus(force = false) {
        const mrmsStatusUrl = 'https://h3dfvh5pq6euq36ymlpz4zqiha0obqju.lambda-url.us-east-2.on.aws';
        if (!this.mrmsStatus || force) {
            try {
                const response = await fetch(mrmsStatusUrl);
                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                this.mrmsStatus = await response.json();
            } catch (error) {
                this.mrmsStatus = null;
            }
        }
        return this.mrmsStatus;
    }

    startAutoRefresh(intervalSeconds) {
        this.stopAutoRefresh();
        this.autoRefreshIntervalId = setInterval(async () => {
            await this.fetchModelStatus(true);
            this._emitStateChange();
        }, (intervalSeconds || 60) * 1000);
    }

    stopAutoRefresh() {
        if (this.autoRefreshIntervalId) {
            clearInterval(this.autoRefreshIntervalId);
            this.autoRefreshIntervalId = null;
        }
    }
}

const defaultLightMapStyles = {
    landOcean: { 
        landColor: '#f0f0f0',
        oceanColor: '#a8d8ea',
        waterDepth: {
            visible: true,
            color: '#97c7d9'
        },
        nationalPark: {
            visible: true,
            color: '#d4e6d4', 
        }
    },
    transportation: { 
        roads: { visible: true, color: '#d3d3d3', width: 0.7 }, 
        airports: { visible: true, color: '#d3d3d3', width: 0.7 } 
    },
    boundaries: { 
        countries: { visible: true, color: '#000000', width: 1.5, lineType: 'solid' }, 
        states: { visible: true, color: '#000000', width: 1.5, lineType: 'solid' }, 
        counties: { visible: true, color: '#515151', width: 1.2, lineType: 'solid' } 
    },
    waterFeatures: { 
        waterways: { visible: true, color: '#a8d8ea', width: 0.7 } 
    },
    labels: { 
        countries: { visible: false, fontFamily: 'Open Sans Regular', fontSize: 14, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 }, 
        states: { visible: false, fontFamily: 'Open Sans Regular', fontSize: 12, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 }, 
        cities: { 
            major: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 12, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 }, 
            minor: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 10, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 } 
        }, 
        airports: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 11, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 },
        poi: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 10, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 },
        continents: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 16, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1.5 },
        waterLabels: { visible: true, fontFamily: 'Open Sans Italic', fontSize: 10, color: '#0077be', outlineColor: '#ffffff', outlineWidth: 1 },
        naturalLabels: { visible: true, fontFamily: 'Open Sans Italic', fontSize: 10, color: '#2E8B57', outlineColor: '#ffffff', outlineWidth: 1 },
        subdivisionLabels: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 11, color: '#000000', outlineColor: '#ffffff', outlineWidth: 1 }
    },
    terrain: { 
        visible: true, 
        intensity: 0.15, 
        shadowColor: '#b0b0b0', 
        highlightColor: '#ffffff', 
        accentColor: '#b0b0b0' 
    },
    oceanOnTop: false,
};

const defaultDarkMapStyles = {
    landOcean: { 
        landColor: '#242424',
        oceanColor: '#252525',
        waterDepth: {
            visible: true,
            color: '#000000'
        },
        nationalPark: {
            visible: true,
            color: '#202020', 
        }
    },
    transportation: { 
        roads: { visible: true, color: '#4f4f4f', width: 0.5 }, 
        airports: { visible: true, color: '#4f4f4f', width: 0.6 } 
    },
    boundaries: { 
        countries: { visible: true, color: '#ffffff', width: 1.5, lineType: 'solid' }, 
        states: { visible: true, color: '#ffffff', width: 1.5, lineType: 'solid' }, 
        counties: { visible: true, color: '#a2a2a2', width: 1.2, lineType: 'solid' } 
    },
    waterFeatures: { 
        waterways: { visible: true, color: '#333333', width: 0.5 } 
    },
    labels: { 
        countries: { visible: false, fontFamily: 'Open Sans Regular', fontSize: 14, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 }, 
        states: { visible: false, fontFamily: 'Open Sans Regular', fontSize: 12, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 }, 
        cities: { 
            major: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 12, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 }, 
            minor: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 10, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 } 
        }, 
        airports: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 11, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 },
        poi: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 10, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 },
        continents: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 16, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1.5 },
        waterLabels: { visible: true, fontFamily: 'Open Sans Italic', fontSize: 10, color: '#a8d8ea', outlineColor: '#000000', outlineWidth: 1 },
        naturalLabels: { visible: true, fontFamily: 'Open Sans Italic', fontSize: 10, color: '#90ee90', outlineColor: '#000000', outlineWidth: 1 },
        subdivisionLabels: { visible: true, fontFamily: 'Open Sans Regular', fontSize: 11, color: '#ffffff', outlineColor: '#000000', outlineWidth: 1 }
    },
    terrain: { 
        visible: true, 
        intensity: 0.2, 
        shadowColor: '#000000', 
        highlightColor: '#FFFFFF', 
        accentColor: '#000000' 
    },
    oceanOnTop: false,
};

const THEME_CONFIGS = {
    light: defaultLightMapStyles,
    dark: defaultDarkMapStyles,
};

// aguacero-api/src/style-layer-map.js

/**
 * =============================================================================
 * CORRECTED LAYER MAPPING
 * =============================================================================
 * This object maps the friendly names from 'map-styles.js' to the
 * exact layer IDs from your Mapbox style.
 */
const STYLE_LAYER_MAP = {
    // Background and water layers
    landColor: { layerId: 'AML_-_land' },
    oceanColor: { layerId: 'AML_-_water' },
    waterDepth: { layerId: 'AML_-_water-depth' },
    nationalPark: { layerId: 'AML_-_national-park' },

    // Line layers
    roads: { layerId: 'AML_-_roads' },
    airports: { layerId: 'AML_-_airports' },
    countries: { layerId: 'AML_-_countries' },
    states: { layerId: 'AML_-_states' },
    counties: { layerId: 'AML_-_counties' },
    waterways: { layerId: 'AML_-_waterway' },

    // Symbol (label) layers
    continents: { layerId: 'AML_-_continent-label' },
    countriesLabels: { layerId: 'AML_-_country-label' },
    statesLabels: { layerId: 'AML_-_state-label' },
    citiesMajor: { layerId: 'AML_-_major-city-label' },
    citiesMinor: { layerId: 'AML_-_minor-city-label' },
    airportsLabels: { layerId: 'AML_-_airport-label' },
    poi: { layerId: 'AML_-_poi-label' },
    waterLabels: { layerId: 'AML_-_water-point-label' }, // Assuming point label for general water
    naturalLabels: { layerId: 'AML_-_natural-point-label' }, // Assuming point label for natural features
    subdivisionLabels: { layerId: 'AML_-_subdivision-label' },
};

// aguacero-api/src/style-applicator.js


function sanitizeColor(color) {
    if (typeof color === 'string' && color.startsWith('#') && color.length === 9) {
        // It's an 8-digit hex (#rrggbbaa), convert to 6-digit hex (#rrggbb)
        return color.substring(0, 7);
    }
    // Otherwise, the color is already in a valid format (e.g., #ffffff, rgba(...))
    return color;
}

const applyLineStyles = (map, layerId, styles) => {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', styles.visible ? 'visible' : 'none');
    // --- MODIFICATION: Sanitize the color ---
    map.setPaintProperty(layerId, 'line-color', sanitizeColor(styles.color));
    map.setPaintProperty(layerId, 'line-width', styles.width);
    if (styles.lineType) {
        const dashArray = { 'dashed': [2, 2], 'dotted': [0, 2], 'solid': [] };
        map.setPaintProperty(layerId, 'line-dasharray', dashArray[styles.lineType] || []);
    }
};

// Helper to apply styles to a symbol (label) layer, now with color sanitization
const applySymbolStyles = (map, layerId, styles) => {
    if (!map.getLayer(layerId)) return;
    map.setLayoutProperty(layerId, 'visibility', styles.visible ? 'visible' : 'none');
    // --- MODIFICATION: Sanitize both text and halo colors ---
    map.setPaintProperty(layerId, 'text-color', sanitizeColor(styles.color));
    map.setPaintProperty(layerId, 'text-halo-color', sanitizeColor(styles.outlineColor));
    map.setPaintProperty(layerId, 'text-halo-width', styles.outlineWidth);
    map.setLayoutProperty(layerId, 'text-size', styles.fontSize);
    map.setLayoutProperty(layerId, 'text-font', [styles.fontFamily]);
};

function applyPaintAndVisibility(map, layerId, property, styles) {
    if (!styles) return;
    if (!map.getLayer(layerId)) return;
    // --- MODIFICATION: Sanitize the color ---
    if (styles.color) map.setPaintProperty(layerId, property, sanitizeColor(styles.color));
    if (styles.visible !== undefined) map.setLayoutProperty(layerId, 'visibility', styles.visible ? 'visible' : 'none');
}

/**
 * Applies a comprehensive set of style customizations to the Mapbox map.
 * @param {mapboxgl.Map} map - The Mapbox map instance.
 * @param {object} customStyles - A style configuration object (e.g., defaultDarkMapStyles).
 */
function applyStyleCustomizations(map, customStyles) {
    if (!map || !map.isStyleLoaded()) return;

    // --- Land & Water ---
    if (customStyles.landOcean) {
        const { landColor, oceanColor, waterDepth, nationalPark } = customStyles.landOcean;
        // --- MODIFICATION: Sanitize the colors here too ---
        if (map.getLayer(STYLE_LAYER_MAP.landColor.layerId)) {
            map.setPaintProperty(STYLE_LAYER_MAP.landColor.layerId, 'background-color', sanitizeColor(landColor));
        }
        if (map.getLayer(STYLE_LAYER_MAP.oceanColor.layerId)) {
            map.setPaintProperty(STYLE_LAYER_MAP.oceanColor.layerId, 'fill-color', sanitizeColor(oceanColor));
        }
        applyPaintAndVisibility(map, STYLE_LAYER_MAP.waterDepth.layerId, 'fill-color', waterDepth);
        applyPaintAndVisibility(map, STYLE_LAYER_MAP.nationalPark.layerId, 'fill-color', nationalPark);
    }

    // --- Transportation ---
    if (customStyles.transportation) {
        applyLineStyles(map, STYLE_LAYER_MAP.roads.layerId, customStyles.transportation.roads);
        applyLineStyles(map, STYLE_LAYER_MAP.airports.layerId, customStyles.transportation.airports);
    }

    // --- Boundaries ---
    if (customStyles.boundaries) {
        applyLineStyles(map, STYLE_LAYER_MAP.countries.layerId, customStyles.boundaries.countries);
        applyLineStyles(map, STYLE_LAYER_MAP.states.layerId, customStyles.boundaries.states);
        applyLineStyles(map, STYLE_LAYER_MAP.counties.layerId, customStyles.boundaries.counties);
    }
    
    // --- Water Features ---
    if (customStyles.waterFeatures) {
         applyLineStyles(map, STYLE_LAYER_MAP.waterways.layerId, customStyles.waterFeatures.waterways);
    }

    // --- Labels ---
    if (customStyles.labels) {
        applySymbolStyles(map, STYLE_LAYER_MAP.continents.layerId, customStyles.labels.continents);
        applySymbolStyles(map, STYLE_LAYER_MAP.countriesLabels.layerId, customStyles.labels.countries);
        applySymbolStyles(map, STYLE_LAYER_MAP.statesLabels.layerId, customStyles.labels.states);
        applySymbolStyles(map, STYLE_LAYER_MAP.citiesMajor.layerId, customStyles.labels.cities.major);
        applySymbolStyles(map, STYLE_LAYER_MAP.citiesMinor.layerId, customStyles.labels.cities.minor);
        applySymbolStyles(map, STYLE_LAYER_MAP.airportsLabels.layerId, customStyles.labels.airports);
        applySymbolStyles(map, STYLE_LAYER_MAP.poi.layerId, customStyles.labels.poi);
        applySymbolStyles(map, STYLE_LAYER_MAP.waterLabels.layerId, customStyles.labels.waterLabels);
        applySymbolStyles(map, STYLE_LAYER_MAP.naturalLabels.layerId, customStyles.labels.naturalLabels);
        applySymbolStyles(map, STYLE_LAYER_MAP.subdivisionLabels.layerId, customStyles.labels.subdivisionLabels);
    }

    if (customStyles.terrain && map.getSource('mapbox-dem')) {
        if (customStyles.terrain.visible) {
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1 });
            if (map.getLayer('hillshade')) {
                map.setPaintProperty('hillshade', 'hillshade-exaggeration', customStyles.terrain.intensity);
                // --- MODIFICATION: Sanitize terrain colors ---
                map.setPaintProperty('hillshade', 'hillshade-shadow-color', sanitizeColor(customStyles.terrain.shadowColor));
                map.setPaintProperty('hillshade', 'hillshade-highlight-color', sanitizeColor(customStyles.terrain.highlightColor));
                map.setPaintProperty('hillshade', 'hillshade-accent-color', sanitizeColor(customStyles.terrain.accentColor));
            }
        } else {
            map.setTerrain(null);
        }
    }
}

// aguacero-api/src/MapManager.js


/**
 * A utility to recursively merge two objects.
 * The source object's properties will overwrite the target's properties.
 * This is a "non-mutating" version; it returns a new object.
 * @param {object} target - The base object.
 * @param {object} source - The object with properties to merge in.
 * @returns {object} A new, merged object.
 */
function deepMerge(target, source) {
    const output = { ...target };

    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, { [key]: source[key] });
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }

    return output;
}
// Helper for the deepMerge utility
function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}


const BASE_STYLE_URL = 'mapbox://styles/aguacerowx/cmfvox8mq004u01qm5nlg7qkt';

class MapManager extends EventEmitter {
    constructor(containerId, options = {}) {
        super();
        if (!containerId || !options.accessToken) {
            throw new Error('A container ID and a Mapbox access token are required.');
        }

        mapboxgl.accessToken = options.accessToken;

        // --- THE FIX IS HERE ---

        // 1. Start with clean copies of the base themes
        let lightTheme = JSON.parse(JSON.stringify(THEME_CONFIGS.light));
        let darkTheme = JSON.parse(JSON.stringify(THEME_CONFIGS.dark));

        // 2. If developer provides custom styles, merge them into the defaults
        if (options.customStyles) {
            console.log('[MapManager] Custom styles provided. Merging...');
            if (options.customStyles.light) {
                lightTheme = deepMerge(lightTheme, options.customStyles.light);
            }
            if (options.customStyles.dark) {
                darkTheme = deepMerge(darkTheme, options.customStyles.dark);
            }
            // Log to confirm the merge was successful
            console.log('[MapManager] Final merged dark theme:', darkTheme);
        }

        // 3. Store the final, potentially merged, themes
        this.themes = {
            light: lightTheme,
            dark: darkTheme
        };
        
        // --- END OF FIX ---

        const defaultThemeName = options.defaultTheme || 'light';
        this.currentCustomizations = this.themes[defaultThemeName];
        this.currentThemeName = defaultThemeName;

        this.weatherLayerManagers = new Map();
        
        this.map = new mapboxgl.Map({
            container: containerId,
            style: BASE_STYLE_URL,
            center: [-98, 39],
            zoom: 3.5,
            ...options.mapOptions
        });
        
        this.map.on('load', () => {
             console.log("[MapManager] Map loaded. Applying initial theme:", defaultThemeName);
             applyStyleCustomizations(this.map, this.currentCustomizations);
             this.emit('style:applied', {
                 themeName: this.currentThemeName,
                 styles: this.currentCustomizations
             });
        });
    }
    
    // The rest of the methods (setTheme, setLabelGroupVisibility, etc.) are correct and remain unchanged...
    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.error(`[MapManager] Theme "${themeName}" does not exist.`);
            return;
        }
        
        const newThemeStyles = JSON.parse(JSON.stringify(this.themes[themeName]));
        const oldLabelStyles = this.currentCustomizations.labels;

        if (oldLabelStyles) {
            for (const category in oldLabelStyles) {
                if (oldLabelStyles[category]?.hasOwnProperty('visible') && newThemeStyles.labels[category]) {
                    newThemeStyles.labels[category].visible = oldLabelStyles[category].visible;
                }
                for (const subKey in oldLabelStyles[category]) {
                    if (oldLabelStyles[category][subKey]?.hasOwnProperty('visible') && newThemeStyles.labels[category]?.[subKey]) {
                        newThemeStyles.labels[category][subKey].visible = oldLabelStyles[category][subKey].visible;
                    }
                }
            }
        }
        
        this.currentCustomizations = newThemeStyles;
        this.currentThemeName = themeName;
        
        applyStyleCustomizations(this.map, this.currentCustomizations);
        
        this.emit('style:applied', {
            themeName: this.currentThemeName,
            styles: this.currentCustomizations
        });
    }

    setLabelGroupVisibility(groupKey, visible) {
        const path = `labels.${groupKey}.visible`;
        let current = this.currentCustomizations;
        const parts = path.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            current = current[parts[i]];
            if (!current) {
                 console.error(`Invalid label group key: ${groupKey}`);
                 return;
            }
        }
        current[parts[parts.length - 1]] = visible;
        
        const mapKey = groupKey.replace(/\.(.)/g, (match, p1) => p1.toUpperCase());
        const layerId = STYLE_LAYER_MAP[mapKey]?.layerId;
        
        if (layerId && this.map.getLayer(layerId)) {
            this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            console.log(`[MapManager] Set visibility for ${layerId} to ${visible}`);
        } else {
             console.warn(`[MapManager] Could not find layer for label group key: ${groupKey} (mapped to ${mapKey})`);
        }
    }
    
    addWeatherManager(manager) {
        this.weatherLayerManagers.set(manager.layerId, manager);
    }
    
    getMap() { return this.map; }
}

export { FillLayerManager, MapManager };
