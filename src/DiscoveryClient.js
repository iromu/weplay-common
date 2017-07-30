/* eslint-disable semi,space-before-function-paren,spaced-comment */
// const logger = require('../index').logger('common-discovery')
const SocketClient = require('socket.io-client')
let Server = require('./DiscoveryServer')

class Client {
  constructor(options, _onConnect) {
    options.name = options.name || '_default_'
    this.options = options
    this.id = options.id
    this.name = options.name
    this.rooms = []

    // logger.debug('[%s] DiscoveryClient constructor starting on port %s', options.name, options.port)

    // // logger.debug('Client constructor', {name: options.name, port: options.port});

    // Connect to discovery server
    this.socket = SocketClient(options.url)
    options.serverEmbedded = true
    this.server = new Server(options, () => {
      // logger.debug('[%s.%s] DiscoveryClient embedded server listening on port %s', options.name, this.id, options.port)
    })

    this.uuid = options.uuid
    // const logInfo = {
    //   service: {name: options.name, id: options.id},
    //   registry: options.url
    // }
    this.socket.on('connect', () => {
      if (this.disconnected) {
        // logger.debug('[%s.%s] DiscoveryClient onConnect after disconnection', options.name, this.id, logInfo)
      } else {
        // logger.debug('[%s.%s] DiscoveryClient onConnect', options.name, this.id, logInfo)
      }
      this.socket.on('registered', function (data) {
        // logger.info('[%s.%s] DiscoveryClient onRegistered', options.name, this.id, data)
        if (data.id === this.id) {
          this.registered = true
        }
        //if (_onRegistered) {
        //    _onRegistered();
        //}
      })
      this.socket.emit('register', {name: options.name, id: this.id, port: options.port})
      this.announceListeners(options.serverListeners)
      this.announceListeners(this.server.getInternalListeners())
      if (_onConnect) {
        this.rooms = []
        _onConnect()
      }
    })

    this.socket.on('disconnect', () => {
      // logger.debug('x disconnected from Discovery', options.url)
      this.disconnected = true
    })

    this.socket.on('streamCreateRequested', (data) => {
      this.server.onStreamCreateRequested()
    })
  }

  announceListeners(listeners) {
    for (var event in listeners) {
      if (listeners.hasOwnProperty(event)) {
        this.socket.emit('announce', {
          name: this.name,
          id: this.id,
          port: this.options.port,
          event: event
        })
      }
    }
  }

  subscribe(event, listener) {
    // logger.debug('+ discovery client subscribe()', {event: event})
    this.socket.on(event, function (data) {
      listener(data)
    })
  }

  emit(...args) {
    this.socket.emit.apply(this.socket, args)
  }

  // Creates/Emit a private stream of events
  publish(room, event, data) {
    if (!this.rooms.includes(room)) {
      // logger.debug('+ discovery client publish()', {room: room, event: event})
      this.rooms.push(room)

      // logger.debug('+ discovery client Notify Discovery service on publish()', {room: room, event: event})

      // Notify Discovery service that we support joining to streams at this channel
      this.socket.emit('announce', {
        name: this.options.name,
        id: this.id,
        port: this.options.port,
        room: room,
        event: 'streamJoinRequested'
      })

      this.socket.emit('announce', {
        name: this.options.name,
        id: this.id,
        port: this.options.port,
        room: room,
        event: event
      })
    }

    // private push
    this.server.to(room).emit(event, data)
  }

  destroyStream(room, event) {
    this.rooms = this.rooms.filter(r => r !== room)
    this.socket.emit('unannounce', {
      name: this.options.name,
      id: this.id,
      port: this.options.port,
      room: room,
      event: event
    })
    // private push
    this.server.to(room).emit('destroy', room)
  }

  destroy() {
    this.server.destroy()
    this.socket.close()
  }
}

module.exports = Client
