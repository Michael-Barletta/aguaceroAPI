// aguacero-api/src/index.js

// FIXED: The import path now exactly matches your filename "fillLayerManager.js"
import { FillLayerManager } from './fillLayerManager.js'; 

// We also import the UI components
import { RunSelectorPanel, ForecastSliderPanel } from './UI.js';

// Re-export them from this single file.
export {
    FillLayerManager,
    RunSelectorPanel,
    ForecastSliderPanel
};