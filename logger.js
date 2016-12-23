const winston = require('winston');
require('winston-logstash');

const uri = process.env.WEPLAY_LOGSTASH_URI || 'localhost:5001';
const pieces = uri.split(':');
const host = pieces[0];
const port = pieces[1] || 5001;
const env = process.env.NODE_ENV || 'development';

module.exports = (label) => {
    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                handleExceptions: true,
                timestamp: true,
                json: false,
                colorize: true,
                level: env === 'development' ? 'debug' : 'info'
            }),
            new (winston.transports.Logstash)({
                port: port,
                ssl_enable: false,
                host: host,
                max_connect_retries: -1,
                label: label,
                level: env === 'development' ? 'debug' : 'info'
            })
        ],
        exitOnError: false
    });
    return logger;
};