// aguacero-api/src/style-applicator.js

import { STYLE_LAYER_MAP } from './style-layer-map.js';

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
export function applyStyleCustomizations(map, customStyles) {
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