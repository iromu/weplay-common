const Discovery = require('./discovery')
const EventBroker = require('./eventbroker')

class EventBus {
  constructor(options, _onConnect) {
    this.discoveryClient = new Discovery().client(options, _onConnect)
    this.broker = new EventBroker(this.discoveryClient, options.clientListeners)
  }
  on(channel, event, callback) {
    this.broker.on(channel, event, callback)
  }

  // Sends events to channel, binds to service endpoint.xs
  // Discovery finds which Service listens to the given {event}
  // and replays the event
  emit(channel, event, data) {
    this.broker.emit(channel, event, data)
  }

  streamJoin(channel, room, event, listener) {
    this.broker.streamJoin(channel, room, event, listener)
  }

  // Creates a private stream of events
  stream(room, event, data) {
    this.broker.stream(room, event, data)
  }

  broadcast(event, data) {

  }

  destroy() {
    this.discoveryClient.destroy()
    this.broker.destroy()
  }
}

module.exports = EventBus
