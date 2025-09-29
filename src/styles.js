// This string contains all the default CSS for the Aguacero UI components.
const aguaceroCSS = `
:root {
    --aguacero-bg-color: #ffffff;
    --aguacero-text-color: #333333;
    --aguacero-border-color: #cccccc;
    --aguacero-shadow-color: rgba(0, 0, 0, 0.1);
    --aguacero-accent-color: #007bff;
    --aguacero-hover-bg-color: #f8f9fa;
    --aguacero-active-bg-color: #e9ecef;
    --aguacero-font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

/* Base style for all Aguacero panels */
.aguacero-panel {
    background-color: var(--aguacero-bg-color);
    color: var(--aguacero-text-color);
    font-family: var(--aguacero-font-family);
    font-size: 14px;
    border-radius: 4px;
    box-shadow: 0 1px 3px var(--aguacero-shadow-color);
    margin: 10px;
    padding: 12px;
    border: 1px solid var(--aguacero-border-color);
    line-height: 1.5;
}

.aguacero-panel-label {
    font-weight: bold;
    display: block;
    margin-bottom: 8px;
    color: #555;
}

/* Layer Control Panel Specifics */
.aguacero-layer-control .aguacero-panel-header {
    font-size: 16px;
    font-weight: bold;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--aguacero-border-color);
}

.aguacero-layer-category, .aguacero-layer-subcategory {
    margin-bottom: 5px;
}

.aguacero-layer-header, .aguacero-layer-subheader {
    font-weight: bold;
    cursor: pointer;
    padding: 6px 8px;
    border-radius: 3px;
    transition: background-color 0.2s;
}

.aguacero-layer-header:hover, .aguacero-layer-subheader:hover {
    background-color: var(--aguacero-hover-bg-color);
}

.aguacero-layer-header::before, .aguacero-layer-subheader::before {
    content: '▸ ';
    display: inline-block;
    transition: transform 0.2s;
}

.aguacero-layer-category.open > .aguacero-layer-header::before,
.aguacero-layer-subcategory.open > .aguacero-layer-subheader::before {
    transform: rotate(90deg);
}

.aguacero-layer-content, .aguacero-layer-items {
    display: none; /* Hidden by default */
    padding-left: 15px;
}

.aguacero-layer-category.open > .aguacero-layer-content,
.aguacero-layer-subcategory.open > .aguacero-layer-items {
    display: block; /* Shown when open */
}

.aguacero-layer-item {
    padding: 5px 8px;
    cursor: pointer;
    border-radius: 3px;
    margin: 2px 0;
}

.aguacero-layer-item:hover {
    background-color: var(--aguacero-hover-bg-color);
}

.aguacero-layer-item.active {
    background-color: var(--aguacero-accent-color);
    color: white;
    font-weight: bold;
}

// In the aguaceroCSS string, REPLACE the old legend styles with these:

/* Legend Panel Specifics (Horizontal Layout) */
.aguacero-legend-panel {
    position: absolute;
    background-color: var(--aguacero-bg-color);
    color: var(--aguacero-text-color);
    font-family: var(--aguacero-font-family);
    padding: 10px 15px;
    border-radius: var(--aguacero-border-radius);
    box-shadow: 0 1px 3px var(--aguacero-shadow-color);
    border: 1px solid var(--aguacero-border-color);
    font-size: 12px;
    /* Allow the panel to be wider */
    width: 250px; 
    max-width: 90%;
}

.aguacero-legend-bottom-right { bottom: 20px; right: 10px; }
.aguacero-legend-bottom-left { bottom: 20px; left: 10px; }
.aguacero-legend-top-right { top: 20px; right: 10px; }
.aguacero-legend-top-left { top: 20px; left: 10px; }

.aguacero-legend-title {
    margin: 0 0 10px 0;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
}

.aguacero-legend-body {
    display: flex;
    flex-direction: column;
}

/* The continuous gradient bar */
.aguacero-legend-gradient {
    height: 15px;
    width: 100%;
    border-radius: 3px;
    border: 1px solid rgba(0,0,0,0.1);
}

/* Container for the labels below the bar */
.aguacero-legend-labels {
    display: flex;
    justify-content: space-between; /* Evenly space the min and max labels */
    margin-top: 5px;
    font-size: 11px;
}

/* Slider Panel Specifics */
.aguacero-slider-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
}

.aguacero-slider-input {
    flex-grow: 1; /* Make the slider track take up remaining space */
}

.aguacero-slider-controls {
    display: flex;
    gap: 5px;
}

.aguacero-slider-controls .aguacero-button {
    padding: 4px 8px;
    font-size: 14px;
    line-height: 1;
}
`;

/**
 * Injects the Aguacero default styles into the document's <head>.
 * Includes a check to ensure it only runs once.
 */
export function injectStyles() {
    // Check if the styles have already been injected.
    if (document.getElementById('aguacero-styles')) {
        return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = 'aguacero-styles';
    styleElement.innerHTML = aguaceroCSS;
    document.head.appendChild(styleElement);
}