const winston = require('winston');
require('winston-logstash');

module.exports = (label) => {
    var logger = new winston.Logger({
        transports: [
            new winston.transports.Console({
                handleExceptions: true,
                timestamp: true,
                json: false
            }),
            new (winston.transports.Logstash)({
                port: 5001,
                ssl_enable: false,
                host: 'localhost',
                max_connect_retries: -1,
                label: label
            })
        ],
        exitOnError: false
    });
    return logger;
};