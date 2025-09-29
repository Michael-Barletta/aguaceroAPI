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
     * @param {number} [options.playSpeed=500] - The time in milliseconds between steps when playing.
     */
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.sliderElement = null;
        this.displayElement = null;

        // --- NEW PROPERTIES FOR PLAYBACK CONTROL ---
        this.isPlaying = false;
        this.playIntervalId = null;
        this.buttons = {}; // To hold references to the control buttons

        this.pendingUpdate = false;
        this.latestForecastHour = null;

        this.options = {
            label: options.label || 'Forecast Hour',
            // --- NEW --- API option for playback speed with a default value
            playSpeed: options.playSpeed || 500,
        };

        // --- NEW --- Bind the keyboard handler context
        this._handleKeyDown = this._handleKeyDown.bind(this);
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
            // --- MODIFIED --- Also disable control buttons
            Object.values(this.buttons).forEach(btn => btn.disabled = true);
            this.sliderElement.max = 0;
            this.displayElement.textContent = 'N/A';
            return;
        }

        const currentIndex = forecastHours.indexOf(forecastHour);
        this.sliderElement.max = forecastHours.length - 1;
        this.sliderElement.value = currentIndex >= 0 ? currentIndex : 0;
        this.displayElement.textContent = forecastHour;
        
        this.sliderElement.disabled = false;
        // --- MODIFIED --- Also enable control buttons
        Object.values(this.buttons).forEach(btn => btn.disabled = false);
    }

    // --- NEW METHOD --- Advances the slider by one step in a given direction
    _step(direction) {
        if (this.sliderElement.disabled) return;
        
        const forecastHours = this.manager.modelStatus[this.manager.state.model][this.manager.state.date][this.manager.state.run];
        if (!forecastHours) return;

        let currentIndex = parseInt(this.sliderElement.value, 10);
        const maxIndex = forecastHours.length - 1;

        let nextIndex = currentIndex + direction;

        // Logic for looping the slider
        if (nextIndex > maxIndex) {
            nextIndex = 0; // Loop to the start
        } else if (nextIndex < 0) {
            nextIndex = maxIndex; // Loop to the end
        }

        const newForecastHour = forecastHours[nextIndex];

        // Use the existing rAF-based update mechanism for smoothness
        this.displayElement.textContent = newForecastHour;
        this.latestForecastHour = newForecastHour;
        if (!this.pendingUpdate) {
            this.pendingUpdate = true;
            requestAnimationFrame(() => this._performUpdate());
        }
    }

    // --- NEW METHOD --- Starts the playback timer
    _play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.buttons.playPause.innerHTML = '&#9208;'; // Pause icon
        this.buttons.playPause.title = 'Pause (Space)';

        // Clear any old interval before starting a new one
        clearInterval(this.playIntervalId);
        this.playIntervalId = setInterval(() => {
            this._step(1); // Step forward
        }, this.options.playSpeed);
    }

    // --- NEW METHOD --- Stops the playback timer
    _pause() {
        if (!this.isPlaying) return;
        this.isPlaying = false;
        this.buttons.playPause.innerHTML = '&#9654;'; // Play icon
        this.buttons.playPause.title = 'Play (Space)';
        clearInterval(this.playIntervalId);
        this.playIntervalId = null;
    }

    // --- NEW METHOD --- Toggles between play and pause
    _togglePlayPause() {
        if (this.isPlaying) {
            this._pause();
        } else {
            this._play();
        }
    }

    // --- NEW METHOD --- Handles global keyboard shortcuts
    _handleKeyDown(event) {
        // Ignore keyboard events if a user is typing in an input field
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(event.key) {
            case ',': // Step backward
                this._step(-1);
                break;
            case '.': // Step forward
                this._step(1);
                break;
            case ' ': // Toggle play/pause
                event.preventDefault(); // Prevent page from scrolling
                this._togglePlayPause();
                break;
        }
    }

    /**
     * The function that performs the expensive state update.
     * @private
     */
    _performUpdate() {
        if (!this.pendingUpdate) return;
        this.pendingUpdate = false;
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
        
        // --- MODIFIED --- Updated HTML structure to include control buttons
        this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}: +<span class="aguacero-slider-display">0</span>hr</label>
            <div class="aguacero-slider-wrapper">
                <div class="aguacero-slider-controls">
                    <button class="aguacero-button" data-action="step-back" title="Step Back (,)" disabled>&#9664;</button>
                    <button class="aguacero-button" data-action="play-pause" title="Play (Space)" disabled>&#9654;</button>
                    <button class="aguacero-button" data-action="step-forward" title="Step Forward (.)" disabled>&#9654;&#9654;</button>
                </div>
                <input type="range" class="aguacero-slider-input" min="0" max="0" value="0" step="1" disabled>
            </div>
        `;
        this.sliderElement = this.element.querySelector('.aguacero-slider-input');
        this.displayElement = this.element.querySelector('.aguacero-slider-display');
        
        // --- NEW --- Get references to the new buttons
        this.buttons.stepBack = this.element.querySelector('[data-action="step-back"]');
        this.buttons.playPause = this.element.querySelector('[data-action="play-pause"]');
        this.buttons.stepForward = this.element.querySelector('[data-action="step-forward"]');

        // --- REVISED EVENT LISTENER for slider dragging ---
        this.sliderElement.addEventListener('input', (e) => {
            this._pause(); // Pause playback if user manually drags the slider
            const { model, date, run } = this.manager.state;
            const forecastHours = this.manager.modelStatus[model][date][run];
            if (!forecastHours) return;
            const newForecastHour = forecastHours[parseInt(e.target.value, 10)];
            this.displayElement.textContent = newForecastHour;
            this.latestForecastHour = newForecastHour;
            if (!this.pendingUpdate) {
                this.pendingUpdate = true;
                requestAnimationFrame(() => this._performUpdate());
            }
        });

        // --- NEW --- Add event listeners for the control buttons
        this.buttons.stepBack.addEventListener('click', () => this._step(-1));
        this.buttons.stepForward.addEventListener('click', () => this._step(1));
        this.buttons.playPause.addEventListener('click', () => this._togglePlayPause());
        
        // --- NEW --- Add global listener for keyboard shortcuts
        document.addEventListener('keydown', this._handleKeyDown);

        this.manager.on('state:change', () => this._update());

        targetElement.appendChild(this.element);
        return this;
    }

    // --- NEW (Optional but Recommended) --- Add a remove method for cleanup
    /**
     * Removes the panel and cleans up global event listeners.
     */
    remove() {
        this._pause(); // Stop any playback
        document.removeEventListener('keydown', this._handleKeyDown);
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
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
    constructor(manager, options = {}) {
        this.manager = manager;
        this.options = {
            position: options.position || 'bottom-right',
            labelFormatter: options.labelFormatter || ((value) => Math.round(value)),
        };
        this._container = document.createElement('div');
        this._container.className = 'mapboxgl-ctrl aguacero-legend-panel'; // Use mapboxgl-ctrl class
        // --- Note: We no longer set the position class here, Mapbox does it ---
    }

    /**
     * Required by Mapbox's IControl interface.
     * This method is called when the control is added to the map.
     * @param {mapboxgl.Map} map - The Mapbox map instance.
     * @returns {HTMLElement} The control's container element.
     */
    onAdd(map) {
        this.map = map;
        this.manager.on('state:change', (state) => this._update(state));
        this._update(this.manager.state); // Initial render
        return this._container;
    }

    /**
     * Required by Mapbox's IControl interface.
     * This method is called when the control is removed from the map.
     */
    onRemove() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
        // It's good practice to clean up listeners, though in this case
        // the manager might outlive the legend. A more advanced implementation
        // would have a dedicated `destroy` method on the manager.
        // For now, this is safe.
        this.map = undefined;
    }

    _update(state) {
        if (!this._container) return;

        const { colormap, colormapBaseUnit } = this.manager.baseLayerOptions;

        if (!colormap || colormap.length < 2) {
            this._container.style.display = 'none';
            return;
        }
        this._container.style.display = 'block';

        const variableInfo = DICTIONARIES.fld[state.variable] || {};
        const legendTitle = variableInfo.variable || 'Legend';
        const unitLabel = this._getUnitLabel(colormapBaseUnit, state.units);
        const stopsHtml = this._generateStopsHtml(colormap, colormapBaseUnit, state.units);

        this._container.innerHTML = `
            <h3 class="aguacero-legend-title">${legendTitle} (${unitLabel})</h3>
            <div class="aguacero-legend-body">${stopsHtml}</div>
        `;
    }

    // _generateStopsHtml, _getUnitLabel, and _getTargetUnitForLegend methods
    // remain exactly the same as the previous correct versions.
    _generateStopsHtml(colormap, baseUnit, currentSystem) {
        const parsedColormap = [];
        for (let i = 0; i < colormap.length; i += 2) {
            parsedColormap.push({ value: colormap[i], color: colormap[i + 1] });
        }
        if (parsedColormap.length < 2) return '';
        const minVal = parsedColormap[0].value;
        const maxVal = parsedColormap[parsedColormap.length - 1].value;
        const targetUnit = this._getTargetUnitForLegend(baseUnit, currentSystem);
        const convert = getUnitConversionFunction(baseUnit, targetUnit);
        const displayMin = this.options.labelFormatter(convert ? convert(minVal) : minVal);
        const displayMax = this.options.labelFormatter(convert ? convert(maxVal) : maxVal);
        const gradientStops = parsedColormap.map(stop => `${stop.color}`).join(', ');
        const gradientCss = `linear-gradient(to right, ${gradientStops})`;
        return `
            <div class="aguacero-legend-gradient" style="background: ${gradientCss};"></div>
            <div class="aguacero-legend-labels">
                <span class="aguacero-legend-label-min">${displayMin}</span>
                <span class="aguacero-legend-label-max">${displayMax}</span>
            </div>
        `;
    }

    _getUnitLabel(baseUnit, system) {
        const base = (baseUnit || '').toLowerCase();
        if (base === 'dbz') return 'dBZ';
        if (system === 'metric') {
            if (base.includes('f') || base.includes('c')) return '°C';
            if (['kts', 'mph', 'm/s'].includes(base)) return 'km/h';
            if (['in', 'mm', 'cm'].includes(base)) return 'mm';
        }
        if (base.includes('f') || base.includes('c')) return '°F';
        if (['kts', 'mph', 'm/s'].includes(base)) return 'mph';
        if (['in', 'mm', 'cm'].includes(base)) return 'in';
        return base;
    }
    
    _getTargetUnitForLegend(baseUnit, system) {
        const base = (baseUnit || '').toLowerCase();
        if (system === 'metric') {
            if (base.includes('f') || base.includes('c')) return 'celsius';
            if (['kts', 'mph', 'm/s'].includes(base)) return 'km/h';
            if (['in', 'mm', 'cm'].includes(base)) return 'mm';
        }
        if (base.includes('f') || base.includes('c')) return 'fahrenheit';
        if (['kts', 'mph', 'm/s'].includes(base)) return 'mph';
        if (['in', 'mm', 'cm'].includes(base)) return 'in';
        return base;
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