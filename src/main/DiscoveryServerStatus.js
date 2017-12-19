import util from 'util'
import LoggerFactory from './LoggerFactory'

const logger = LoggerFactory.get('common-discovery')

class DiscoveryServerStatus {
  constructor(options) {
    this._services = options._services
    this._eventLog = options._eventLog
    if (options.statusPort) {
      const restify = require('restify')

      const server = restify.createServer({
        formatters: {
          'application/json': (req, res, body, cb) => cb(null, util.inspect(body, null, '\t'))
        }
      })
      server.name = this.name
      server.pre(restify.pre.userAgentConnection())

      server.get('/lookup', this.lookupHandler)
      server.head('/lookup', this.lookupHandler)

      server.get('/csv', this.csvHandler.bind(this))
      server.head('/csv', this.csvHandler.bind(this))

      server.listen(options.statusPort, () => {
        logger.info('Restify [%s] listening at %s', server.name, server.url)
      })
    }
  }

  csvHandler(req, res, next) {
    let sendHeader = true
    res.send(this._eventLog.map(log => {
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

  lookupHandler(req, res, next) {
    res.send(this._services.map(service => {
      if (service.events) {
        const events = service.events.map(e => {
          return (e.room) ? `${e.event}#${e.room}` : e.event
        })
        const streams = service.events.filter(e => e.room !== undefined).map(e => {
          return e.room
        })
        return {
          name: service.name,
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
}

export default DiscoveryServerStatus