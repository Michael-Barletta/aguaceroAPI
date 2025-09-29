// aguacero-api/src/MapManager.js

// aguacero-api/src/MapManager.js

import { THEME_CONFIGS } from './map-styles.js';
import { applyStyleCustomizations } from './style-applicator.js';
import { STYLE_LAYER_MAP } from './style-layer-map.js';
import { EventEmitter } from './events.js';

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

export class MapManager extends EventEmitter {
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