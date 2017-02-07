const Discovery = require('./discovery');
const EventBroker = require('./eventbroker');

class EventBus {

    constructor(options, _onConnect) {
        this.discoveryClient = new Discovery().client(options, _onConnect);
        this.broker = new EventBroker(this.discoveryClient, options.clientListeners);
    }


    on(channel, event, callback) {
        this.broker.on(channel, event, callback);
    }

    // Sends events to channel, binds to service endpoint.xs
    // Discovery finds which Service listens to the given {event}
    // and replays the event
    emit(channel, event, data) {
        this.broker.emit(channel, event, data);
    }


    publish(room, event, data) {
        this.broker.emit(room, event, data);
        this.discoveryClient.publish(room, event, data);
    }

    broadcast(event, data) {

    }


    destroy() {
    }
}

module.exports = EventBus;