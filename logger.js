const winston = require('winston');
require('winston-logstash');

const env = process.env.NODE_ENV || 'development';

module.exports = (label, node_name) => {


    const logstashUri = process.env.WEPLAY_LOGSTASH_URI;
    var logstashTransport;

    if (logstashUri) {
        const pieces = logstashUri.split(':');
        const host = pieces[0];
        const port = pieces[1] || 5001;

        logstashTransport = new (winston.transports.Logstash)({
            port: port,
            ssl_enable: false,
            host: host,
            max_connect_retries: -1,
            label: label,
            level: env === 'development' ? 'debug' : 'info',
            meta: {node: node_name || `${label}-${process.pid}`},
            node_name: node_name || process.title
        });
    }

    const consoleTransport = new winston.transports.Console({
        handleExceptions: true,
        timestamp: true,
        json: false,
        colorize: true,
        level: env === 'development' ? 'debug' : 'info'
    });

    var logger = new winston.Logger({
        transports: (logstashUri) ? [consoleTransport, logstashTransport] : [consoleTransport],
        exitOnError: false
    });
    return logger;
};