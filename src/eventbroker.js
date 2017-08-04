/* eslint-disable semi,spaced-comment */
const logger = require('./logger')('common-eventbroker')

// const _ = require('lodash')

class EventBroker {
  constructor(discoveryClient, clientListeners) {
    // this.subscriptions = {};
    this._services = []
    this.queue = {}
    this.streamJoinHashes = {}

    this.discoveryClient = discoveryClient
    this.name = this.discoveryClient.name
    this.clientListeners = clientListeners

    // Listen for incoming matching service
    this.discoveryClient.subscribe('discovered', (service) => {
      this.subscribeService(service)
    })
  }

  processQueue(service) {
    // logger.debug('[%s] EventBroker.processQueue[%s] queue exists? %s',
    // this.name, service.name, !!this.queue[service.name])
    if (this.queue[service.name]) {
      this.queue[service.name].emit.forEach(command => {
        service.emit(command.event, command.data)
      })
      //room, event, listener
      //var pending = [];
      // logger.debug('[%s] EventBroker.processQueue[name %s] joinqueue exists? %s',
      //   this.name, service.name, !!this.queue[service.name].streamJoin)

      this.queue[service.name].streamJoin.forEach((command) => {
        //if(service.events.filter(data=>data.room === command.room))
        // logger.debug('[%s] WARNING EventBroker.processQueue[%s] stream join %s', this.name, service.name, command.room)
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
      this.queue[service.name] = {emit: [], on: [], streamJoin: [], streamLeave: []}
    }
  }

  // Adds service info discovered
  subscribeService(service) {
    const serviceLog = {
      name: service.name,
      streams: service.streams,
      rooms: service.rooms,
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
        // logger.debug('[%s] EventBroker[channel:%s] 2 emit %s', this.name, service.name, _event)
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
        if (room) {
          var info = {service: service.name, room: room, event: event}
          logger.debug('[%s] EventBroker service.streamJoin requesting ', this.name, info)

          if (!this.streamJoinHashes[service.name]) {
            this.streamJoinHashes[service.name] = []
          }

          if (!service.streamJoinHashes) {
            service.streamJoinHashes = []
          }

          if (!service.streamJoinHashes.includes(room)) {
            service.streamJoinHashes.push(room)
          }

          if (!service.events) {
            service.events = []
          }

          var eventInfo = {room: room}
          if (!service.events.includes(eventInfo)) {
            service.events.push(eventInfo)
          }

          if (!this.streamJoinHashes[service.name].includes(room)) {
            this.streamJoinHashes[service.name].push(room)
            if (event && listener) {
              service.socket.off(event)
              service.socket.on(event, listener)
            }
          } else if (event && listener) {
            service.socket.off(event)
            service.socket.on(event, listener)
          }

          service.socket.emit('streamJoinRequested', room)
        }
      }
    }

    if (!service.streamLeave) {
      service.streamLeave = (room) => {
        var info = {service: service.name, room: room}
        var channel = service.name
        logger.debug('[%s] EventBroker service.streamLeave requesting ', this.name, info)

        if (!this.streamJoinHashes[channel]) {
          this.streamJoinHashes[channel] = []
        }

        this.streamJoinHashes[channel] = this.streamJoinHashes[channel].filter(r => r !== room)

        this._services
          .filter(e => (e.streams && e.streams.includes(room)) && e.name === channel)
          .forEach(s => {
            s.streams = s.streams.filter(s => s !== room)
            if (s.streams.length === 0) {
              delete s.streams
            }
          })
        service.socket.emit('streamLeaveRequested', room)
      }
    }

    service.socket.on('connect', () => {
      logger.info('[%s] EventBroker.connect service', this.name, serviceLog)
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
    // logger.info('[%s] EventBroker.getService ', this.name, {
    //   channel: channel,
    //   room: room
    // })

    const matchesRoom = service => {
      if (service.events) {
        service.streams = service.events.filter(e => e.room).map(e => {
          return e.room
        })
        // var serviceInfo = _.omit(service, ['ip', 'scheme', 'port', 'socket', 'emit', 'streamJoin', 'streamLeave', 'on'])
        // logger.info('service.streams %s/%s serviceInfo %s', channel, room, JSON.stringify(serviceInfo))
      }
      return service.name === channel && service.streams && service.streams.includes(room)
    }
    const matchesName = service => service.name === channel

    const condition = (room) ? matchesRoom : matchesName
    var service = this._services.filter(condition)[0]
    if (!service && !this.queue[channel]) {
      this.queue[channel] = {emit: [], on: [], streamJoin: [], streamLeave: []}
    } else {
      return service
    }
  }

  emit(channel, event, data, room) {
    // logger.debug('[%s] EventBroker[channel:%s] 1 emit event:%s', this.name, channel, event)
    var service = this.getService(channel, room)
    if (!service) {
      this.queue[channel].emit.push({event: event, data: data})
      // Ask discovery service for the location of this service.
      this.discoveryClient.emit('discover', {channel: channel})

      // logger.debug('[%s] EventBroker[channel:%s] 1.1 emit event:%s', this.name, channel, event)
    } else {
      service.emit(event, data)

      // logger.debug('[%s] EventBroker[channel:%s] 1.2 emit event:%s', this.name, channel, event)
    }
  }

  subscribe(options, listener) {
    this.discoveryClient.publishStreamConsumer(options.room, options.event)
  }

  stream(room, event, data) {
    this.discoveryClient.publish(room, event, data)
  }

  destroyStream(room, event) {
    this.discoveryClient.destroyStream(room, event)
  }

  publish(channel, room, event, data) {
    var service = this.getService(channel, room)
    if (!service) {
      // Ask discovery service for the location of this stream.
      logger.debug('[%s] EventBroker [%s.%s] streamJoin ASK %s', this.name, channel, room, event)
      this.queue[channel].streamJoin.push({room: room, event: event})
      this.discoveryClient.emit('discover', {channel: channel, room: room})
      // this.discoveryClient.emit('streamCreateRequested', {channel: channel, room: room})

      // Ask discovery service for the location of this service.
      //this.discoveryClient.emit('discover', {channel: channel});
    } else {
      logger.debug('[%s] EventBroker [%s.%s] streamJoin %s', this.name, channel, room, event)
      service.socket.to(room).emit(event, data)
    }
    //this.on(channel, event, listener);
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

  streamLeave(channel, room) {
    var service = this.getService(channel, room)
    if (!service) {
      logger.error('[%s] EventBroker [%s.%s] streamLeave ERROR!!!', this.name, channel, room)
    } else {
      logger.debug('[%s] EventBroker [%s.%s] streamLeave CALL', this.name, channel, room)
      service.streamLeave(room)
    }
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
