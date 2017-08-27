import winston from 'winston'

require('winston-logstash')

const env = process.env.NODE_ENV || 'development'

class LoggerFactory {
  static get(label, nodeName) {
    const colors = {
      debug: 'blue',
      info: 'green',
      warn: 'yellow',
      error: 'red'
    }

    winston.addColors(colors)

    const logstashUri = process.env.WEPLAY_LOGSTASH_URI
    let logstashTransport

    if (logstashUri) {
      const pieces = logstashUri.split(':')
      const host = pieces[0]
      const port = pieces[1] || 5001

      logstashTransport = new (winston.transports.Logstash)({
        port,
        ssl_enable: false,
        host,
        max_connect_retries: -1,
        label,
        level: env === 'development' ? 'debug' : 'info',
        meta: {node: nodeName || `${label}-${process.pid}`},
        node_name: nodeName || process.title
      })
    }

    const consoleTransport = new winston.transports.Console({
      handleExceptions: true,
      timestamp: true,
      json: false,
      colorize: true,
      level: env === 'development' ? 'debug' : 'info'
    })

    const logger = new (winston.Logger)({
      transports: (logstashUri) ? [consoleTransport, logstashTransport] : [consoleTransport],
      exitOnError: false
    })
    return logger
  }
}

export default LoggerFactory
