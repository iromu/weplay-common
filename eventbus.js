class EventBus {

    constructor(_publish, _subscriptor) {
        this._publish = _publish;
        this._subscriptor = _subscriptor;
        this.subscriptions = [];
        this.psubscriptions = [];
    }

    subscribe(channel, callback) {
        this.subscriptions.push(channel);
        this._subscriptor.subscribe(channel);
        this._subscriptor.on('message', (...args) => {
            var _channel = args[0];
            if (channel != _channel) return;
            callback.apply(null, args);
        });
    }

    unsubscribe(channel) {
        this.subscriptions.push(channel);
        this.subscriptions = this.subscriptions.filter(c=>c !== channel);
        this._subscriptor.unsubscribe(channel);
    }

    psubscribe(channel, callback) {
        this.psubscriptions.push(channel);
        this._subscriptor.psubscribe(channel);
        this._subscriptor.on('pmessage', (...args) => {
            var _channel = args[1];
            if (channel != _channel) return;
            callback.apply(null, args);
        });
    }

    punsubscribe(channel) {
        this.psubscriptions.push(channel);
        this.psubscriptions = this.psubscriptions.filter(c=>c !== channel);
        this._subscriptor.punsubscribe(channel);
    }

    publish(channel, ...args) {
        this._publish.publish(channel, args);
    }

    destroy() {
        this.subscriptions.forEach(sub=>this.unsubscribe(sub));
        this.psubscriptions.forEach(sub=>this.punsubscribe(sub));
    }
}

module.exports = EventBus;