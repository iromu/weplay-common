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
  emit(options, event, data, room) {
    if (!options.channel) {
      this.broker.emit(options.channel, options.event, options.data, options.room)
    } else {
      this.broker.emit(options, event, data, room)
    }
  }

  streamJoin(channel, room, event, listener) {
    this.broker.streamJoin(channel, room, event, listener)
  }

  streamLeave(channel, room) {
    this.broker.streamLeave(channel, room)
  }

  // Creates/Emit a private stream of events
  stream(room, event, data) {
    this.broker.stream(room, event, data)
  }

  publish(room, event, data) {
    this.broker.publish(room, event, data)
  }

  subscribe(options, listener) {
    this.broker.subscribe(options, listener)
  }

  broadcast(event, data) {

  }

  destroy() {
    this.discoveryClient.destroy()
    this.broker.destroy()
  }
}

module.exports = EventBus
