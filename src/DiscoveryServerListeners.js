import LoggerFactory from './LoggerFactory'

const logger = LoggerFactory.get('common-discovery')

class DiscoveryServerListeners {
  constructor(options) {
    // binded socket service
    this.service = {}
    this.ip = options.ip
    this.options = options
    this._socket = options.socket
    this._services = options._services
    this._eventLog = options._eventLog
    this.io = options.io
    this.onRegisterListener = options.onRegisterListener
    this.onAnnounceListener = options.onAnnounceListener
  }

  disconnect() {
    this._services = this._services.filter(s => s.id !== this.service.id)
  }

  register(_service) {
    this.service = {
      name: _service.name,
      id: _service.id,
      pressure: 0,
      socket: this._socket.id,
      hostname: _service.hostname,
      ip: this.ip, // current socket ip
      scheme: 'http',
      events: [],
      rooms: [],
      port: _service.port
    }

    const discovered = this._services.filter(s => s.id === this.service.id)[0]

    if (!discovered) {
      logger.info('[%s] DiscoveryServer.onRegister', this.options.name, this.service)
      this._services.push(this.service)
      // logger.debug('[%s] Discovery Server.onRegister joining notification channel', this.name, this.service.name)
      // Join private room for channel notifications: creation of streams
      this._socket.join(this.service.name)
      this._socket.emit('registered', this.service)
      // this.io.to(service.name).emit.apply(this.io.to(service.name), ['registered', this.service])
      this.io.to(this.service.name).emit('registered', this.service)
      if (this.onRegisterListener) {
        this.onRegisterListener(this.service)
      }
    }
  }

  announce(_service) {
    const eventData = {name: _service.name, event: _service.event, room: _service.room, id: _service.id}
    eventData.room || delete eventData.room

    logger.debug('[%s] DiscoveryServer.onAnnounce', this.options.name, eventData)
    const discovered = this._services.filter(s => s.id === _service.id)[0]

    if (!discovered) {
      logger.error('[%s] DiscoveryServer.onAnnounce MISSING', this.options.name, eventData)
      return
    }

    if (!discovered.events.filter(e => e.room === eventData.room && e.event === eventData.event)[0]) {
      discovered.events.push(eventData)
      if (eventData.room && (!discovered.rooms || !discovered.rooms.includes(eventData.room))) {
        if (!discovered.rooms) {
          discovered.rooms = []
        }
        discovered.rooms.push(eventData.room)
      }
    }
    this.onAnnounceListener && this.onAnnounceListener(discovered)
  }

  unannounce(_service) {
    logger.info('[%s] DiscoveryServer.unannounce', this.options.name, _service)
    const channel = _service.name
    const room = _service.room
    const id = _service.id
    const event = _service.event
    if (room || event) {
      this._services
        .filter(e => e.id === id)
        .forEach(s => {
          if (s.rooms && room) {
            s.rooms = s.rooms.filter(s => s !== room)
            if (s.rooms.length === 0) {
              delete s.rooms
            }
          }
          if (s.events) {
            s.events = s.events.filter(e => !room || room !== e.room)
            // s.events = s.events.filter(e => !event || e.event !== event)
          }
        })
      this._services
        .forEach(s => {
          if (s.depends) {
            s.depends = s.depends.filter(d => d.channel !== channel && d.room !== room)
            if (s.depends.length === 0) {
              delete s.depends
            }
          }
        })
    }
  }

  discover(request) {
    let requester = this._services.filter(s => s.socket === this._socket.id)[0]
    requester = requester || {id: 'self', name: 'self'}
    this._eventLog && this._eventLog.push({
      requested: request.channel,
      room: request.room,
      event: request.event,
      by: requester.name
    })
    logger.info('[%s] DiscoveryServer.onDiscover', this.options.name, {request, by: requester.id})
    if (!requester.depends) {
      requester.depends = []
    }
    if (!requester.depends.includes(request)) {
      requester.depends.push(request)
    }
    const matchesRoom = s => s.name === request.channel && (s.rooms === undefined || s.rooms === [] || s.rooms.includes(request.room))
    const matchesName = s => s.name === request.channel

    const matchesRoomOrName = (request.room) ? matchesRoom : matchesName

    const byPressure = (a, b) => a.pressure > b.pressure ? 1 : -1
    const byRoomLength = (a, b) => a.rooms.length > b.rooms.length ? 1 : -1

    let discoveredList = this._services.filter(matchesRoomOrName)
    let discovered = discoveredList.sort(byPressure)[0]

    if (discovered) {
      discovered.pressure = discovered.pressure ? discovered.pressure + 1 : 1
      logger.info('[%s] DiscoveryServer.onDiscover contains stream', this.options.name, {
        request,
        discovered: discovered.id,
        name: discovered.name,
        pressure: discovered.pressure,
        hostname: discovered.hostname,
        ip: discovered.ip,
        streams: discovered.rooms,
        by: JSON.stringify(requester.id)
      })
      this._socket.emit('discovered', {
        id: discovered.id,
        name: discovered.name,
        pressure: discovered.pressure,
        streams: discovered.rooms,
        ip: discovered.ip,
        hostname: discovered.hostname,
        scheme: discovered.scheme,
        port: discovered.port
      })
    } else {
      // Find a this.service that supports creating the string
      discoveredList = this._services.filter(s => s.name === request.channel).sort(byRoomLength)
      if (discoveredList) {
        const discoveredEmptyList = discoveredList.filter(s => !s.rooms || s.rooms.length === 0)

        if (discoveredEmptyList && discoveredEmptyList.length > 0) {
          discovered = discoveredEmptyList.sort(byPressure)[0]
        } else if (discoveredList.length > 1) {
          // discovered = discoveredList[Math.floor(Math.random() * discoveredList.length)]
          discovered = discoveredList.sort(byPressure)[0]
        } else {
          discovered = discoveredList[0]
        }

        if (discovered) {
          discovered.pressure = discovered.pressure ? discovered.pressure + 1 : 1
          // Add the stream before the service accepts its creation
          // A streamRejected event should clear this value
          // discovered.rooms.push(request.room)
          // request the creation of the stream
          // logger.debug('> discovered', discovered)
          logger.info('[%s] DiscoveryServer.onDiscover supports stream', this.options.name, {
            request,
            discovered: discovered.id,
            id: discovered.id,
            name: discovered.name,
            pressure: discovered.pressure,
            hostname: discovered.hostname,
            ip: discovered.ip,
            streams: discovered.rooms,
            by: JSON.stringify(requester.id)
          })
          this._socket.emit('discovered', {
            id: discovered.id,
            name: discovered.name,
            pressure: discovered.pressure,
            hostname: discovered.hostname,
            ip: discovered.ip,
            streams: discovered.rooms,
            scheme: discovered.scheme,
            port: discovered.port
          })
        }
      }
      // Create the stream. event 'streamCreateRequested'
      // this.io.emit('streamCreateRequested', request.room)
      // this.io.to(request.channel).emit('streamCreateRequested', request.room)
      this.io.emit('streamCreateRequested', request.room)
      // logger.info('[%s] Discovery Server.onRegister streamCreateRequested notification channel by %s', this.name, this.service.name)
      this.io.to(request.channel).emit('streamCreateRequested', request.room)
      // logger.info('[%s] DiscoveryServer.onDiscover sent streamCreateRequested', this.name, request)
    }
  }

  streamCreateRequested(request) {
    logger.info('[%s] DiscoveryServer.onDiscover streamCreateRequested', this.options.name, request)
    // Reject by default
    // this._socket.emit('streamRejected', request)
  }

  streamJoinRequested(request) {
    logger.info('[%s] DiscoveryServer.onDiscover streamJoinRequested ', this.options.name, request)
    // Join by default
    this._socket.join(request)
  }
}

export default DiscoveryServerListeners
