const logger = require('./logger')('common-discovery')
const util = require('util')

class DiscoveryServerStatus {
  constructor(options) {
    this._services = options._services
    this._eventLog = options._eventLog
    if (options.statusPort) {
      var restify = require('restify')

      var server = restify.createServer({
        formatters: {
          'application/json': function (req, res, body, cb) {
            return cb(null, util.inspect(body, null, '\t'))
          }
        }
      })
      server.name = this.name
      server.pre(restify.pre.userAgentConnection())

      server.get('/lookup', this.lookupHandler)
      server.head('/lookup', this.lookupHandler)

      server.get('/csv', this.csvHandler.bind(this))
      server.head('/csv', this.csvHandler.bind(this))

      server.listen(options.statusPort, function () {
        logger.info('Restify [%s] listening at %s', server.name, server.url)
      })
    }
  }

  csvHandler(req, res, next) {
    var sendHeader = true
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
          return (e.room) ? e.event + '#' + e.room : e.event
        })
        const streams = service.events.filter(e => e.room).map(e => {
          return e.room
        })
        return {
          name: service.name,
          id: service.id,
          version: service.version,
          events: events,
          streams: streams,
          depends: service.depends
        }
      }
      else {
        return {name: service.name, id: service.id, version: service.version}
      }
    }).sort((a, b) => {
      return a.name > b.name
    }))
    next()
  }
}
module.exports = DiscoveryServerStatus
