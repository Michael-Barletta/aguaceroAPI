// aguacero-api/src/events.js

/**
 * A simple class for emitting and listening to events.
 */
export class EventEmitter {
    constructor() {
        this.callbacks = {};
    }
    on(event, cb) {
        if (!this.callbacks[event]) this.callbacks[event] = [];
        this.callbacks[event].push(cb);
    }
    emit(event, data) {
        let cbs = this.callbacks[event];
        if (cbs) {
            cbs.forEach(cb => cb(data));
        }
    }
}