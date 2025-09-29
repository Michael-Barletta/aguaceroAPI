// aguacero-api/src/index.js

// FIXED: The import path now exactly matches your filename "fillLayerManager.js"
import { FillLayerManager } from './fillLayerManager.js'; 
import { MapManager } from './MapManager.js';

// We also import the UI components
import { 
    RunSelectorPanel, 
    ForecastSliderPanel, 
    ThemeControlPanel,
    LabelControlPanel
} from './UI.js';

// Re-export them from this single file.
export {
    MapManager,
    FillLayerManager,
    RunSelectorPanel,
    ForecastSliderPanel,
    ThemeControlPanel,
    LabelControlPanel
};