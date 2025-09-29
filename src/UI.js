// aguacero-api/src/UI.js

export class RunSelectorPanel {
    /**
     * Creates an instance of RunSelectorPanel.
     * @param {FillLayerManager} manager - The main controller instance.
     * @param {object} [options={}] - Customization options.
     * @param {string} [options.label] - Custom text for the panel's label.
     * @param {function(string, string): string} [options.runFormatter] - A function to format the display text in the dropdown.
     */
    constructor(manager, options = {}) {
        this.manager = manager;
        this.element = null;
        this.selectElement = null;
        
        // Use provided options or fall back to defaults
        this.options = {
            label: options.label || `Model Run (${this.manager.state.model.toUpperCase()})`,
            runFormatter: options.runFormatter || this._defaultFormatRunDisplay
        };
    }

    /**
     * The default formatter for displaying date/run combinations.
     * @param {string} date - Date in YYYYMMDD format.
     * @param {string} run - Run hour in HH format.
     * @returns {string} - Formatted string like "2025-09-28 (18Z)".
     * @private
     */
    _defaultFormatRunDisplay(date, run) {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        return `${year}-${month}-${day} (${run}Z)`;
    }

    /**
     * Populates the select dropdown with available runs from the manager's state.
     * @private
     */
    _populate() {
        const modelStatus = this.manager.modelStatus;
        const modelName = this.manager.state.model;
        if (!modelStatus || !this.selectElement) return;

        const model = modelStatus[modelName];
        if (!model) {
            this.selectElement.innerHTML = `<option>Model offline</option>`;
            this.selectElement.disabled = true;
            return;
        }

        const allRuns = [];
        for (const date in model) {
            for (const run in model[date]) {
                allRuns.push({ date, run });
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
        
        this.selectElement.value = `${this.manager.state.date}:${this.manager.state.run}`;
        this.selectElement.disabled = false;
    }

    /**
     * Renders the panel and appends it to a target DOM element.
     * @param {string|HTMLElement} target - A CSS selector string or a DOM element.
     * @returns {this} The instance for chaining.
     */
    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for RunSelectorPanel could not be found in the DOM.`);
        }

        this.element = document.createElement('div');
        this.element.className = 'aguacero-panel aguacero-run-selector';

        this.element.innerHTML = `
            <label class="aguacero-panel-label">${this.options.label}</label>
            <select class="aguacero-panel-select" disabled><option>Loading...</option></select>
        `;
        this.selectElement = this.element.querySelector('select');

        this.selectElement.addEventListener('change', (e) => {
            const [date, run] = e.target.value.split(':');
            this.manager.setState({ date, run, forecastHour: 0 });
        });

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