const logger = require('./logger')('common-discovery')

class DiscoveryServerListeners {
  constructor(options) {
    this.service = {}
    this.ip = options.ip
    this.options = options
    this._socket = options.socket
    this._services = options._services
    this._eventLog = options._eventLog
    this.io = options.io
    this.onRegisterListener = options.onRegisterListener
    this.onAnnounceListener = options.onAnnounceListener

    return {
      'disconnect': () => {
        // logger.debug('[%s] Discovery Server.onDisconnect', this.name, this.service)
        this._services = this._services.filter(s => s.id !== this.service.id)
      },
      'register': _service => {
        this.service = {
          name: _service.name,
          id: _service.id,
          ip: this.ip,
          scheme: 'http',
          port: _service.port
        }

        var discovered = this._services.filter(s => s.id === _service.id)[0]

        if (!discovered) {
          this._services.push(this.service)
          // logger.debug('[%s] Discovery Server.onRegister joining notification channel', this.name, this.service.name)
          // Join private room for channel notifications: creation of streams
          this._socket.join(this.service.name)
          this._socket.emit('registered', this.service)
          // this.io.to(service.name).emit.apply(this.io.to(service.name), ['registered', this.service])
          this.io.to(this.service.name).emit('registered', this.service)
        }
        if (this.onRegisterListener) {
          this.onRegisterListener(this.service)
        }
      },
      'announce': _service => {
        var eventData = {
          name: _service.name,
          id: _service.id,
          ip: this.ip,
          scheme: 'http',
          port: _service.port,
          event: _service.event,
          room: _service.room
        }

        if (!eventData.room) {
          delete eventData.room
        }

        // if (eventData.room) {
        // logger.debug('[%s] Discovery Server.onAnnounce joining notification channel', this.name, this.service.name)
        // logger.debug('service "%s" streaming at room %s for event "%s" on port %s',
        //   eventData.name, eventData.room, eventData.event, eventData.port)
        // } else {
        // logger.debug('service "%s" listening for event "%s" on port %s',
        //  eventData.name, eventData.event, eventData.port)
        // }
        var discovered = this._services.filter(s => s.id === _service.id)[0]
        if (!discovered) {
          // logger.debug('[%s] DiscoveryServer.onAnnounce', this.name, {
          //  eventData: eventData,
          //  discovered: discovered
          // })
          // // logger.debug('< adding missing register', eventData)
          // onRegister(_service)
          // discovered = this._services.filter(service => this.service.id === _service.id)[0]
        } else {
          if (!discovered.rooms) {
            discovered.rooms = []
          }

          if (!discovered.events) {
            discovered.events = []
          }

          if (!discovered.events.filter(e => e.room === eventData.room && e.event === eventData.event)[0]) {
            discovered.events.push(eventData)
            if (eventData.room && !discovered.rooms.includes(eventData.room)) {
              discovered.rooms.push(eventData.room)
            }
          }

          if (this.onAnnounceListener) {
            this.onAnnounceListener(discovered)
          }
        }
      },

      'unannounce': _service => {
        logger.debug('[%s] DiscoveryServerListeners.unannounce', this.service.name, _service)
        var channel = _service.name
        var room = _service.room
        var id = _service.id
        var event = _service.event
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
      },
      'discover': (request) => {
        var requester = this._services.filter(s => s.id === this.service.id)[0]
        this._eventLog.push({
          requested: request.channel,
          room: request.room,
          event: request.event,
          by: requester.name
        })
        logger.info('[%s] DiscoveryServerListeners.onDiscover', requester.name, {
          request: request,
          by: JSON.stringify(requester.id)
        })

        if (!requester.depends) {
          requester.depends = []
        }
        if (!requester.depends.includes(request)) {
          requester.depends.push(request)
        }
        // const discovered = this._services.filter(service=>service.name === request.channel)[0]

        // const matchesRoom = this.service => this.service.name === request.channel && this.service.rooms.includes(request.room)
        const matchesRoom = s => s.name === request.channel && (s.rooms === undefined || s.rooms === [] || s.rooms.includes(request.room))
        const matchesName = s => s.name === request.channel

        const condition = (request.room) ? matchesRoom : matchesName
        var discovered = this._services.filter(condition)[0]

        if (discovered) {
          logger.info('[%s] DiscoveryServerListeners.onDiscover', this.options.name, {
            request: request,
            discovered: discovered.id,
            by: JSON.stringify(requester.id)
          })
          this._socket.emit('discovered', {
            id: discovered.id,
            name: discovered.name,
            ip: discovered.ip,
            scheme: discovered.scheme,
            port: discovered.port
          })
        } else {
          // Find a this.service that supports creating the string
          discovered = this._services.filter(s => s.name === request.channel).sort((a, b) => a.rooms.length > b.rooms.length)[0]
          if (discovered) {
            // request the creation of the stream
            // logger.debug('> discovered', discovered)
            logger.info('[%s] DiscoveryServerListeners.onDiscover', this.options.name, {
              request: request,
              discovered: discovered.id,
              streams: discovered.rooms,
              by: JSON.stringify(requester.id)
            })
            this._socket.emit('discovered', {
              id: discovered.id,
              name: discovered.name,
              ip: discovered.ip,
              scheme: discovered.scheme,
              port: discovered.port
            })
          }
          // Create the stream. event 'streamCreateRequested'
          // this.io.emit('streamCreateRequested', request.room)
          // this.io.to(request.channel).emit('streamCreateRequested', request.room)
          this.io.emit('streamCreateRequested', request.room)
          // logger.info('[%s] Discovery Server.onRegister streamCreateRequested notification channel by %s', this.name, this.service.name)
          this.io.to(request.channel).emit('streamCreateRequested', request.room)
          // logger.info('[%s] DiscoveryServer.onDiscover sent streamCreateRequested', this.name, request)
        }
      },
      'streamCreateRequested': (request) => {
        logger.info('[%s] DiscoveryServer.onDiscover streamCreateRequested', this.options.name, request)
        // Reject by default
        // this._socket.emit('streamRejected', request)
      },
      'streamJoinRequested': (request) => {
        logger.info('[%s] DiscoveryServer.onDiscover streamJoinRequested ', this.options.name, request)
        // Join by default
        this._socket.join(request)
      }
    }
  }
}

module.exports = DiscoveryServerListeners
