// aguacero-api/src/UI.js

export class RunSelectorPanel {
    constructor(manager) {
        this.manager = manager;
        this.element = null;
        this.selectElement = null;
    }

    _formatRunDisplay(date, run) {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        return `${year}-${month}-${day} (${run}Z)`;
    }

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
            option.textContent = this._formatRunDisplay(date, run);
            this.selectElement.appendChild(option);
        });
        
        this.selectElement.value = `${this.manager.state.date}:${this.manager.state.run}`;
        this.selectElement.disabled = false;
    }

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;

        // ADD THIS CHECK:
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for RunSelectorPanel could not be found in the DOM.`);
        }
        
        this.element = document.createElement('div');
        this.element.innerHTML = `
            <label for="run-selector-api">Model Run (${this.manager.state.model.toUpperCase()})</label>
            <select id="run-selector-api" disabled><option>Loading...</option></select>
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
    constructor(manager) {
        this.manager = manager;
        this.element = null;
        this.sliderElement = null;
        this.displayElement = null;
    }

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

    addTo(target) {
        const targetElement = (typeof target === 'string') ? document.querySelector(target) : target;

        // ADD THIS CHECK:
        if (!targetElement) {
            throw new Error(`AguaceroAPI Error: The target element "${target}" for ForecastSliderPanel could not be found in the DOM.`);
        }

        this.element = document.createElement('div');
        this.element.innerHTML = `
            <label for="hour-slider-api">Forecast Hour: +<span>0</span>hr</label>
            <input type="range" id="hour-slider-api" min="0" max="0" value="0" step="1" disabled>
        `;
        this.sliderElement = this.element.querySelector('input');
        this.displayElement = this.element.querySelector('span');

        this.sliderElement.addEventListener('input', (e) => {
            const { model, date, run } = this.manager.state;
            const forecastHours = this.manager.modelStatus[model][date][run];
            const newForecastHour = forecastHours[parseInt(e.target.value, 10)];
            this.displayElement.textContent = newForecastHour;
            this.manager.setState({ forecastHour: newForecastHour });
        });
        
        this.manager.on('state:change', () => this._update());

        targetElement.appendChild(this.element);
        return this;
    }
}