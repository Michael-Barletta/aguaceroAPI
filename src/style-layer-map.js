// aguacero-api/src/style-layer-map.js

/**
 * =============================================================================
 * CORRECTED LAYER MAPPING
 * =============================================================================
 * This object maps the friendly names from 'map-styles.js' to the
 * exact layer IDs from your Mapbox style.
 */
export const STYLE_LAYER_MAP = {
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