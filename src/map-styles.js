export const defaultLightMapStyles = {
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

export const defaultDarkMapStyles = {
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

export const THEME_CONFIGS = {
    light: defaultLightMapStyles,
    dark: defaultDarkMapStyles,
};