/* eslint-disable semi,spaced-comment */
const logger = require('./logger')('common-eventbroker')

class EventBroker {
  constructor(discoveryClient, clientListeners) {
    // this.subscriptions = {};
    this._services = []
    this.queue = {}

    this.discoveryClient = discoveryClient
    this.name = this.discoveryClient.name
    this.clientListeners = clientListeners

    // Listen for incoming matching service
    this.discoveryClient.subscribe('discovered', (service) => {
      this.subscribeService(service)
    })
  }

  processQueue(service) {
    logger.debug('[%s] EventBroker.processQueue[%s] queue exists? %s',
      this.name, service.name, !!this.queue[service.name])
    if (this.queue[service.name]) {
      this.queue[service.name].emit.forEach(command => {
        service.emit(command.event, command.data)
      })
      //room, event, listener
      //var pending = [];
      logger.debug('[%s] EventBroker.processQueue[name %s] joinqueue exists? %s',
        this.name, service.name, !!this.queue[service.name].streamJoin)

      this.queue[service.name].streamJoin.forEach((command) => {
        //if(service.events.filter(data=>data.room === command.room))
        logger.debug('[%s] WARNING EventBroker.processQueue[%s] stream join %s', this.name, service.name, command.room)
        service.streamJoin(command.room, command.event, command.listener)
        //else {
        //    logger.error('WARNING EventBroker.processQueue[%s] pending stream join %s', service.name, command.room);
        //    pending.push = command;
        //}
      })
      this.queue[service.name].on.forEach(command => {
        service.on(command.event, command.data)
      })
      delete this.queue[service.name]
      this.queue[service.name] = {emit: [], on: [], streamJoin: []}
    }
  }

  // Adds service info discovered
  subscribeService(service) {
    const serviceLog = {
      name: service.name,
      room: service.room,
      id: service.id,
      ip: service.ip,
      scheme: service.scheme,
      port: service.port
    }
    logger.debug('[%s] EventBroker adding local service ', this.name, serviceLog)
    const url = `${service.scheme}://${service.ip}:${service.port}`

    if (!service.socket) {
      logger.debug('[%s] EventBroker connecting local service ', this.name, serviceLog)
      service.socket = require('socket.io-client')(url)
    }

    if (!service.emit) {
      service.emit = (_event, _args) => {
        logger.debug('[%s] EventBroker[%s] 2 emit %s', this.name, service.name, _event)
        service.socket.emit(_event, _args)
      }
    }

    if (!service.on) {
      service.on = (_event, _args) => {
        service.socket.on(_event, _args)
      }
    }

    if (!service.streamJoin) {
      // room, event, listener
      service.streamJoin = (room, event, listener) => {
        var info = {service: service.name, room: room, event: event}
        logger.debug('[%s] EventBroker service.streamJoin requesting ', this.name, info)

        if (!service.streamJoinHashes) {
          service.streamJoinHashes = []
        }

        if (!service.streamJoinHashes.includes(room)) {
          service.streamJoinHashes.push(room)
          service.socket.removeListener(event)
          service.socket.on(event, listener)
        } else {
          service.socket.removeListener(event)
          service.socket.on(event, listener)
        }

        service.socket.emit('streamJoinRequested', room)
      }
    }

    service.socket.on('connect', () => {
      logger.debug('[%s] EventBroker Connected to service', this.name, {
        name: service.name,
        url: url
      })
      if (service.disconnected) {
        logger.debug('[%s] EventBroker >> reconnected', this.name, serviceLog)
        service.disconnected = false
        // service.listeners = this.clientListeners.filter(l=>l.name === service.name);
        // service.listeners.forEach(listener=> {
        //    logger.debug('EventBroker on service ', {
        //        event: listener.event
        //    });
        //    service.socket.on(listener.event, listener.handler);
        // });
        // this.reconnect(service);
      } else {
        logger.debug('[%s] EventBroker > connect', this.name, serviceLog)
        this.processQueue(service)
      }
    })

    service.socket.on('disconnect', () => {
      logger.debug('[%s] EventBroker x disconnected from', this.name, service.name)
      service.disconnected = true
    })

    if (this.clientListeners) {
      service.listeners = this.clientListeners.filter(l => l.name === service.name)
      service.listeners.forEach(listener => {
        logger.debug('[%s] EventBroker register listeners on service event ', this.name, {
          service: service.name,
          event: listener.event
        })
        service.socket.on(listener.event, listener.handler)
      })
    }

    this._services.push(service)

    this.processQueue(service)
  }

  getService(channel, room) {
    logger.debug('[%s] EventBroker.getService ', this.name, {
      serviceName: channel,
      room: room
    })
    const matchesRoom = service => service.name === channel && service.room === room
    const matchesName = service => service.name === channel

    const condition = (room) ? matchesRoom : matchesName
    var service = this._services.filter(condition)[0]
    if (!service && !this.queue[channel]) {
      this.queue[channel] = {emit: [], on: [], streamJoin: []}
    } else {
      return service
    }
  }

  emit(channel, event, data) {
    logger.debug('[%s] EventBroker[%s] 1 emit %s', this.name, channel, event)
    var service = this.getService(channel)
    if (!service) {
      this.queue[channel].emit.push({event: event, data: data})
      // Ask discovery service for the location of this service.
      this.discoveryClient.emit('discover', {channel: channel})
    } else {
      service.emit(event, data)
    }
  }

  stream(room, event, data) {
    // logger.info('[%s] EventBroker [%s] stream %s', this.name, room, event)
    this.discoveryClient.publish(room, event, data)
  }

  streamJoin(channel, room, event, listener) {
    var service = this.getService(channel, room)
    if (!service) {
      // Ask discovery service for the location of this stream.
      logger.debug('[%s] EventBroker [%s.%s] streamJoin ASK %s', this.name, channel, room, event)
      this.queue[channel].streamJoin.push({room: room, event: event, listener: listener})
      this.discoveryClient.emit('discover', {channel: channel, room: room})
      // this.discoveryClient.emit('streamCreateRequested', {channel: channel, room: room})

      // Ask discovery service for the location of this service.
      //this.discoveryClient.emit('discover', {channel: channel});
    } else {
      logger.debug('[%s] EventBroker [%s.%s] streamJoin %s', this.name, channel, room, event)
      service.streamJoin(room, event, listener)
    }
    //this.on(channel, event, listener);
  }

  on(channel, event, callback) {
    var service = this.getService(channel)
    if (!service) {
      this.queue[channel].on.push({event: event, callback: callback})
    } else {
      service.on(event, callback)
    }
  }

  reconnect(service) {
    this.processQueue(service)
    service.disconnected = false
  }

  destroy() {
    this.discoveryClient.destroy()
  }
}

module.exports = EventBroker
