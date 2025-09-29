// aguacero-api/src/UI.js
import { THEME_CONFIGS } from './map-styles.js';
import { getUnitConversionFunction } from './unitConversions.js';
import { MODEL_CONFIGS, DICTIONARIES } from './model-definitions.js';
export class RunSelectorPanel {
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.selectElement = null;
        this.labelElement = null; // Property to hold the label element
        
        this.options = {
            label: options.label || `Model Run`,
            runFormatter: options.runFormatter || this._defaultFormatRunDisplay
        };
    }

    _defaultFormatRunDisplay(date, run) {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        return `${year}-${month}-${day} (${run}Z)`;
    }

    _populate() {
        // This method works as-is, since it reads the current model from the manager's state.
        const modelStatus = this.manager.modelStatus;
        const { model, date, run } = this.manager.state;
        if (!modelStatus || !this.selectElement) return;

        const modelData = modelStatus[model];
        if (!modelData) {
            this.selectElement.innerHTML = `<option>Model offline</option>`;
            this.selectElement.disabled = true;
            return;
        }

        const allRuns = [];
        for (const dateKey in modelData) {
            for (const runKey in modelData[dateKey]) {
                allRuns.push({ date: dateKey, run: runKey });
            }
        }
        allRuns.sort((a, b) => {
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.run.localeCompare(a.run);
        });

        this.selectElement.innerHTML = '';
        allRuns.forEach(({ date, run }) => {
            const option = document.createElement('option');
            option.value = `${date}:${run}`;
            option.textContent = this.options.runFormatter(date, run);
            this.selectElement.appendChild(option);
        });
        
        this.selectElement.value = `${date}:${run}`;
        this.selectElement.disabled = false;
    }

    /**
     * NEW: Updates the panel's label with the current model name.
     * @private
     */
    _updateLabel() {
        if (!this.labelElement) return;
        this.labelElement.textContent = `${this.options.label} (${this.manager.state.model.toUpperCase()})`;
    }

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for RunSelectorPanel could not be found.`);
        }

        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-run-selector';
        this.element.innerHTML = `
            <label class="aguacero-panel-label"></label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `;
        this.labelElement = this.element.querySelector('label');
        this.selectElement = this.element.querySelector('select');

        this.selectElement.addEventListener('change', (e) => {
            const [date, run] = e.target.value.split(':');
            this.manager.setState({ date, run, forecastHour: 0 });
        });

        // On every state change, re-populate runs and update the label
        this.manager.on('state:change', () => {
            this._populate();
            this._updateLabel();
        });
        
        targetElement.appendChild(this.element);
        this._updateLabel(); // Set the initial label text
        return this;
    }
}

export class ModelSelectorPanel {
    /**
     * Creates an instance of ModelSelectorPanel.
     * @param {FillLayerManager} manager - The main controller instance.
     * @param {object} [options={}] - Customization options.
     * @param {string} [options.label] - Custom text for the panel's label.
     */
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.selectElement = null;
        this.options = {
            label: options.label || 'Weather Model',
        };
    }

    /**
     * Populates the select dropdown with available models from the manager's status.
     * @private
     */
    _populate() {
        const modelStatus = this.manager.modelStatus;
        if (!modelStatus || !this.selectElement) return;

        const availableModels = Object.keys(modelStatus).sort();
        const currentModel = this.manager.state.model;

        this.selectElement.innerHTML = '';
        availableModels.forEach(modelName => {
            const option = document.createElement('option');
            option.value = modelName;
            option.textContent = modelName.toUpperCase();
            this.selectElement.appendChild(option);
        });

        this.selectElement.value = currentModel;
        this.selectElement.disabled = false;
    }

    /**
     * Renders the panel and appends it to a target DOM element.
     * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
     */
    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for ModelSelectorPanel could not be found.`);
        }

        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-model-selector';
        this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}</label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `;
        this.selectElement = this.element.querySelector('select');

        this.selectElement.addEventListener('change', (e) => {
            this.manager.setModel(e.target.value);
        });

        // Populate the list when the state changes (ensures modelStatus is loaded).
        this.manager.on('state:change', () => this._populate());

        targetElement.appendChild(this.element);
        return this;
    }
}

export class ForecastSliderPanel {
    /**
     * Creates an instance of ForecastSliderPanel.
     * @param {FillLayerManager} manager - The main controller instance.
     * @param {object} [options={}] - Customization options.
     * @param {string} [options.label] - Custom text for the panel's label.
     */
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.sliderElement = null;
        this.displayElement = null;

        // --- NEW PROPERTIES FOR OPTIMIZED RENDERING ---
        this.pendingUpdate = false;      // A flag to prevent scheduling multiple updates per frame.
        this.latestForecastHour = null;  // The most recent forecast hour selected by the user.

        this.options = {
            label: options.label || 'Forecast Hour'
        };
    }

    /**
     * Updates the slider's range and value based on the manager's current state.
     * @private
     */
    _update() {
        const { model, date, run, forecastHour } = this.manager.state;
        const forecastHours = this.manager.modelStatus?.[model]?.[date]?.[run];

        if (!forecastHours || forecastHours.length === 0) {
            this.sliderElement.disabled = true;
            this.sliderElement.max = 0;
            this.displayElement.textContent = 'N/A';
            return;
        }

        const currentIndex = forecastHours.indexOf(forecastHour);
        this.sliderElement.max = forecastHours.length - 1;
        this.sliderElement.value = currentIndex >= 0 ? currentIndex : 0;
        this.displayElement.textContent = forecastHour;
        this.sliderElement.disabled = false;
    }

    /**
     * The function that performs the expensive state update.
     * It is called by requestAnimationFrame to run only once per frame.
     * @private
     */
    _performUpdate() {
        // If there's no update to perform, exit.
        if (!this.pendingUpdate) return;

        // Reset the flag so future 'input' events can schedule a new update.
        this.pendingUpdate = false;

        // Call the manager with the last known forecast hour value.
        this.manager.setState({ forecastHour: this.latestForecastHour });
    }

    /**
     * Renders the panel and appends it to a target DOM element.
     * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
     * @returns {this} The instance for chaining.
     */
    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for ForecastSliderPanel could not be found in the DOM.`);
        }

        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-slider';
        
        this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}: +<span class="aguacero-slider-display">0</span>hr</label>
            <input type="range" class="aguacero-slider-input" min="0" max="0" value="0" step="1" disabled>
        `;
        this.sliderElement = this.element.querySelector('input');
        this.displayElement = this.element.querySelector('span');

        // --- REVISED EVENT LISTENER ---
        this.sliderElement.addEventListener('input', (e) => {
            const { model, date, run } = this.manager.state;
            const forecastHours = this.manager.modelStatus[model][date][run];
            if (!forecastHours) return;

            const newForecastHour = forecastHours[parseInt(e.target.value, 10)];

            // 1. Update the UI text immediately. This is very cheap.
            this.displayElement.textContent = newForecastHour;
            
            // 2. Store the latest value.
            this.latestForecastHour = newForecastHour;

            // 3. If an update is not already pending for the next frame, schedule one.
            if (!this.pendingUpdate) {
                this.pendingUpdate = true;
                requestAnimationFrame(() => this._performUpdate());
            }
        });
        
        this.manager.on('state:change', () => this._update());

        targetElement.appendChild(this.element);
        return this;
    }
}
export class ThemeControlPanel {
    constructor(manager) {
        this.manager = manager;
        this.element = null;
    }

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-theme-control';
        this.element.innerHTML = `
            <div class="aguacero-panel-label">Map Theme</div>
            <div class="aguacero-button-group">
                <button data-theme="light" class="aguacero-button">Light</button>
                <button data-theme="dark" class="aguacero-button">Dark</button>
            </div>
        `;
        
        this.buttons = this.element.querySelectorAll('button');
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.manager.setTheme(e.target.dataset.theme);
            });
        });

        // Listen for style changes to update the active button
        this.manager.on('style:applied', ({ themeName }) => {
            this.buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.theme === themeName);
            });
        });

        targetElement.appendChild(this.element);
        return this;
    }
}

/**
 * A UI panel that provides checkboxes to toggle the visibility of map label groups.
 */
export class LabelControlPanel {
    constructor(manager, options = {}) {
        this.manager = manager;
        // The developer provides the list of labels they want to be controllable
        this.labels = options.labels || [];
        this.element = null;
    }

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-label-control';
        this.element.innerHTML = `<div class="aguacero-panel-label">Labels</div>`;

        this.labels.forEach(labelInfo => {
            const row = document.createElement('div');
            row.className = 'aguacero-toggle-row';
            
            const checkboxId = `label-toggle-${labelInfo.key.replace('.', '-')}`;
            
            row.innerHTML = `
                <label for="${checkboxId}">${labelInfo.label}</label>
                <input type="checkbox" id="${checkboxId}" data-key="${labelInfo.key}">
            `;
            
            const checkbox = row.querySelector('input');
            checkbox.addEventListener('change', (e) => {
                this.manager.setLabelGroupVisibility(e.target.dataset.key, e.target.checked);
            });

            this.element.appendChild(row);
        });

        // Listen for style changes to update checkbox states
        this.manager.on('style:applied', ({ styles }) => {
            this.element.querySelectorAll('input[type="checkbox"]').forEach(input => {
                const [category, subKey] = input.dataset.key.split('.');
                const isVisible = styles.labels?.[category]?.[subKey]?.visible;
                if (isVisible !== undefined) {
                    input.checked = isVisible;
                }
            });
        });

        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.manager.setTheme(theme);
            });
        });

        targetElement.appendChild(this.element);
        return this;
    }
}

export class UnitControlPanel {
    /**
     * Creates an instance of UnitControlPanel.
     * @param {FillLayerManager} manager - The main controller instance.
     */
    constructor(manager) {
        this.manager = manager;
        this.element = null;
        this.buttons = null;
    }

    /**
     * A helper method to update the active state of the buttons.
     * @param {string} activeUnit - The unit system that should be marked as active.
     * @private
     */
    _updateButtons(activeUnit) {
        if (!this.buttons) return;
        this.buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === activeUnit);
        });
    }

    /**
     * Renders the panel and appends it to a target DOM element.
     * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
     * @returns {this} The instance for chaining.
     */
    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for UnitControlPanel could not be found.`);
        }

        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-unit-control';
        this.element.innerHTML = `
            <div class="aguacero-panel-label">Units</div>
            <div class="aguacero-button-group">
                <button data-unit="imperial" class="aguacero-button">Imperial</button>
                <button data-unit="metric" class="aguacero-button">Metric</button>
            </div>
        `;

        this.buttons = this.element.querySelectorAll('button');
        this.buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                const newUnit = e.target.dataset.unit;
                this.manager.setUnits(newUnit);
            });
        });

        // Listen for state changes from the manager to keep buttons in sync.
        this.manager.on('state:change', ({ units }) => {
            this._updateButtons(units);
        });

        targetElement.appendChild(this.element);

        // --- THIS IS THE CHANGE ---
        // The panel no longer sets the state. Instead, it reads the manager's
        // current state to set its own initial appearance.
        this._updateButtons(this.manager.state.units);

        return this;
    }
}

export class LegendPanel {
    /**
     * Creates an instance of LegendPanel.
     * @param {FillLayerManager} manager - The main controller instance.
     * @param {object} [options={}] - Customization options for the legend.
     * @param {string} [options.title='Legend'] - The title displayed at the top of the legend.
     * @param {{imperial: string, metric: string}} [options.units] - The unit labels to display (e.g., { imperial: '°F', metric: '°C' }).
     * @param {number} [options.stops=10] - The approximate number of discrete color stops to show in the legend.
     * @param {'top-left'|'top-right'|'bottom-left'|'bottom-right'} [options.position='bottom-right'] - The position of the legend on the map.
     * @param {function(number): string} [options.labelFormatter] - A function to format the numeric labels.
     */
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;

        // Merge user-provided options with sensible defaults
        this.options = {
            title: options.title || 'Legend',
            units: options.units || { imperial: '', metric: '' },
            stops: options.stops || 10,
            position: options.position || 'bottom-right',
            labelFormatter: options.labelFormatter || ((value) => Math.round(value)),
        };
    }

    /**
     * Renders the legend panel and adds it to the map container.
     * @param {mapboxgl.Map} map - The Mapbox GL map instance.
     * @returns {this} The instance for chaining.
     */
    addTo(map) {
        const mapContainer = map.getContainer();
        if (!mapContainer) {
            throw new Error('AguaceroAPI Error: The map container for the LegendPanel could not be found.');
        }

        this.element = document.createElement('div');
        this.element.className = `aguacero-legend-panel aguacero-legend-${this.options.position}`;
        
        mapContainer.appendChild(this.element);

        // Listen for state changes to automatically update the legend
        this.manager.on('state:change', (state) => this._update(state));
        
        // Perform an initial render
        this._update(this.manager.state);

        return this;
    }

    /**
     * Re-renders the legend's content based on the current state.
     * @param {object} state - The current state from the FillLayerManager.
     * @private
     */
    _update(state) {
        if (!this.element) return;

        const { colormap, colormapBaseUnit } = this.manager.baseLayerOptions;

        const variableInfo = DICTIONARIES.fld[state.variable] || {};
        const legendTitle = variableInfo.variable || 'Legend';
        const { units } = state;
        const unitLabel = Object.keys(variableInfo.units || {})[0] || '';
        const stopsHtml = this._generateStopsHtml(colormap, colormapBaseUnit, units);

        this.element.innerHTML = `
            <h3 class="aguacero-legend-title">${legendTitle} (${unitLabel})</h3>
            <div class="aguacero-legend-body">${stopsHtml}</div>
        `;
    }

    /**
     * Generates the HTML for the color/value rows in the legend.
     * @param {number[]} colormap - The base colormap.
     * @param {'metric'|'imperial'} currentUnit - The currently active unit system.
     * @returns {string} The generated HTML string.
     * @private
     */
    _generateStopsHtml(colormap, baseUnit, currentSystem) {
       const parsedColormap = [];
        for (let i = 0; i < colormap.length; i += 2) {
            parsedColormap.push({ value: colormap[i], color: colormap[i + 1] });
        }
        if (parsedColormap.length < 2) return '';

        const minVal = parsedColormap[0].value;
        const maxVal = parsedColormap[parsedColormap.length - 1].value;
        const range = maxVal - minVal;
        const numStops = this.options.stops;
        const targetUnit = this._getTargetUnitForLegend(baseUnit, currentSystem);
        
        let html = '';
        for (let i = numStops - 1; i >= 0; i--) {
            const value = minVal + (i / (numStops - 1)) * range;
            const color = this._getColorForValue(value, parsedColormap);
            
            let displayValue = value;
            const convert = getUnitConversionFunction(baseUnit, targetUnit);
            if (convert) {
                displayValue = convert(value);
            }

            html += `<div class="aguacero-legend-row">
                <span class="aguacero-legend-swatch" style="background-color: ${color};"></span>
                <span class="aguacero-legend-label">${this.options.labelFormatter(displayValue)}</span>
            </div>`;
        }
        return html;
    }

    _getTargetUnitForLegend(baseUnit, system) {
        const base = baseUnit.toLowerCase();
        if (system === 'metric') {
            if (base.includes('f') || base.includes('c')) return 'celsius';
            if (['kts', 'mph'].includes(base)) return 'km/h';
        }
        return base; // Default to imperial or native
    }

    /**
     * Interpolates the color for a given value from the colormap.
     * @private
     */
    _getColorForValue(value, parsedColormap) {
        // Find the two stops the value is between
        let lowerStop = parsedColormap[0];
        let upperStop = parsedColormap[parsedColormap.length - 1];
        for (let i = 0; i < parsedColormap.length - 1; i++) {
            if (value >= parsedColormap[i].value && value <= parsedColormap[i + 1].value) {
                lowerStop = parsedColormap[i];
                upperStop = parsedColormap[i + 1];
                break;
            }
        }

        const range = upperStop.value - lowerStop.value;
        const t = range === 0 ? 0 : (value - lowerStop.value) / range;
        
        // Simple hex color interpolation
        const c1 = parseInt(lowerStop.color.slice(1), 16);
        const c2 = parseInt(upperStop.color.slice(1), 16);

        const r1 = (c1 >> 16) & 255; const g1 = (c1 >> 8) & 255; const b1 = c1 & 255;
        const r2 = (c2 >> 16) & 255; const g2 = (c2 >> 8) & 255; const b2 = c2 & 255;

        const r = Math.round(r1 * (1 - t) + r2 * t);
        const g = Math.round(g1 * (1 - t) + g2 * t);
        const b = Math.round(b1 * (1 - t) + b2 * t);
        
        return `rgb(${r},${g},${b})`;
    }
}

export class LayerControlPanel {
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.options = {
            title: options.title || 'Layers',
        };
    }

    /**
     * Builds a structured object of available variables for the current model.
     * @returns {object} A nested object: { category: { subCategory: [variableInfo, ...] } }
     * @private
     */
    _getAvailableVariables() {
        const modelName = this.manager.state.model;
        const modelInfo = MODEL_CONFIGS[modelName];
        if (!modelInfo) return {};

        const structuredVars = {};
        modelInfo.vars.forEach(varName => {
            const varInfo = DICTIONARIES.fld[varName];
            if (!varInfo) return;

            const { category, subCategory, variable } = varInfo;
            if (!structuredVars[category]) {
                structuredVars[category] = {};
            }
            if (!structuredVars[category][subCategory]) {
                structuredVars[category][subCategory] = [];
            }
            structuredVars[category][subCategory].push({ id: varName, name: variable });
        });
        return structuredVars;
    }

    /**
     * Renders the panel's content based on available variables.
     * @private
     */
    _populate() {
        if (!this.element) return;

        const variables = this._getAvailableVariables();
        let contentHtml = '';

        for (const category in variables) {
            contentHtml += `<div class="aguacero-layer-category">
                <div class="aguacero-layer-header">${category}</div>
                <div class="aguacero-layer-content">`;
            
            for (const subCategory in variables[category]) {
                contentHtml += `<div class="aguacero-layer-subcategory">
                    <div class="aguacero-layer-subheader">${subCategory}</div>
                    <div class="aguacero-layer-items">`;
                
                variables[category][subCategory].forEach(item => {
                    const isActive = item.id === this.manager.state.variable ? 'active' : '';
                    contentHtml += `<div class="aguacero-layer-item ${isActive}" data-variable-id="${item.id}">${item.name}</div>`;
                });

                contentHtml += `</div></div>`;
            }
            contentHtml += `</div></div>`;
        }
        this.element.querySelector('.aguacero-panel-body').innerHTML = contentHtml;
        this._addEventListeners();
    }

    /**
     * Adds click handlers for the accordion and item selection.
     * @private
     */
    _addEventListeners() {
        this.element.querySelectorAll('.aguacero-layer-header, .aguacero-layer-subheader').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('open');
            });
        });

        this.element.querySelectorAll('.aguacero-layer-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const newVariable = e.target.dataset.variableId;
                this.manager.setVariable(newVariable);
            });
        });
    }

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-layer-control';
        this.element.innerHTML = `
            <div class="aguacero-panel-header">${this.options.title}</div>
            <div class="aguacero-panel-body"></div>
        `;
        
        targetElement.appendChild(this.element);

        this.manager.on('state:change', () => this._populate());
        this._populate(); // Initial population
        return this;
    }
}