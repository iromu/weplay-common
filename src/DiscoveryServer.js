import forwarded from 'forwarded-for'
import DiscoveryServerListeners from './DiscoveryServerListeners'
import LoggerFactory from './LoggerFactory'

const logger = LoggerFactory.get('common-discovery')

class Server {
  constructor(options, cb) {
    this.options = options
    this.name = options.name
    const port = options.port
    const statusPort = options.statusPort

    if (statusPort) {
      this.createRestServer(statusPort)
    }

    logger.debug('[%s] DiscoveryServer constructor starting on port %s', options.name, options.port)
    const sio = require('socket.io')
    this.io = sio({
      pingInterval: 2000,
      serveClient: false,
      pingTimeout: 1000
    })
    this._services = []
    this._eventLog = []
    this.listeners = options.serverListeners

    this.io.on('connection', socket => {
      // logger.debug('[%s] Discovery Server.onConnection', this.name, socket.id)
      const req = socket.request
      const ip = forwarded(req, req.headers).ip.split(':').pop()
      // Subscribe to listeners
      if (this.listeners) {
        for (const event in this.listeners) {
          if (this.listeners.hasOwnProperty(event)) {
            const handler = this.listeners[event]
            this.subscribe(socket, event, handler)
          }
        }
      }
      let discoveryServerListeners = new DiscoveryServerListeners({
        ip,
        name: this.name,
        io: this.io,
        socket,
        _services: this._services,
        _eventLog: this._eventLog,
        onRegisterListener: this.onRegisterListener,
        onAnnounceListener: this.onAnnounceListener
      })
      this.serverListeners = {
        'disconnect': request => discoveryServerListeners.disconnect(request),
        'register': request => discoveryServerListeners.register(request),
        'announce': request => discoveryServerListeners.announce(request),
        'unannounce': request => discoveryServerListeners.unannounce(request),
        'discover': request => discoveryServerListeners.discover(request),
        'streamCreateRequested': request => discoveryServerListeners.streamCreateRequested(request),
        'streamJoinRequested': request => discoveryServerListeners.streamJoinRequested(request)
      }

      // TODO auto extend instead of omitting
      if (this.listeners && this.listeners['streamCreateRequested']) {
        delete this.serverListeners['streamCreateRequested']
      }

      if (this.listeners && this.listeners['streamJoinRequested']) {
        delete this.serverListeners['streamJoinRequested']
      }

      for (const serverEvent in this.serverListeners) {
        if (this.serverListeners.hasOwnProperty(serverEvent)) {
          const handler = this.serverListeners[serverEvent]
          socket.on(serverEvent, handler)
        }
      }
    })
    this.io.listen(port)
    if (cb) {
      cb()
    }
  }

  createRestServer(statusPort) {
    const restify = require('restify')

    function csvHandler(req, res, next) {
      let sendHeader = true
      res.send(this.eventLog().map(log => {
        if (sendHeader) {
          sendHeader = false
          return Object.keys(log).join(',')
        } else {
          return Object.keys(log).map(k => {
            return log[k]
          }).join(',')
        }
      }).join('\n'))
      next()
    }

    function lookupHandler(req, res, next) {
      res.send(this._services.map(service => {
        if (service.events) {
          const events = service.events.map(e => {
            return (e.room) ? `${e.event}#${e.room}` : e.event
          })
          const streams = service.events.filter(e => e.room).map(e => {
            return e.room
          })
          return {
            name: service.name,
            hostname: service.hostname,
            port: service.port,
            id: service.id,
            version: service.version,
            events,
            streams: Array.from(new Set(streams)),
            depends: service.depends
          }
        } else {
          return {name: service.name, id: service.id, version: service.version}
        }
      }).sort((a, b) => a.name > b.name ? 1 : -1))
      next()
    }

    const server = restify.createServer({
      formatters: {
        'application/json': (req, res, body) => JSON.stringify(body, null, '\t')
      }
    })
    server.name = this.name
    server.pre(restify.pre.userAgentConnection())

    server.get('/lookup', lookupHandler.bind(this))
    server.head('/lookup', lookupHandler.bind(this))

    server.get('/csv', csvHandler.bind(this))
    server.head('/csv', csvHandler.bind(this))

    server.listen(statusPort, () => {
      logger.info('Restify [%s] listening at %s', server.name, server.url)
    })
  }

  onStreamCreateRequested(data) {

  }

  getInternalListeners() {
    return {
      'streamJoinRequested': undefined,
      'disconnect': undefined,
      'register': undefined,
      'announce': undefined,
      'discover': undefined,
      'streamCreateRequested': undefined
    }
  }

  subscribe(socket, event, listener) {
    if (listener) {
      // logger.info('[%s] Discovery Server[%s].subscribe Adding listener to event %s', this.name, this.options.name, event)
      socket.on(event, (data) => {
        listener(socket, data)
      })
    }
  }

  to(room) {
    return this.io.to(room)
  }

  lookup() {
    return this._services
  }

  eventLog() {
    return this._eventLog
  }

  onRegister(listener) {
    this.onRegisterListener = listener
  }

  onAnnounce(listener) {
    this.onAnnounceListener = listener
  }

  destroy() {
    this.io.close()
  }
}

export default Server
