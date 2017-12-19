'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _winston = require('winston');

var _winston2 = _interopRequireDefault(_winston);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

require('winston-logstash');

var env = process.env.NODE_ENV || 'development';

var LoggerFactory = function () {
  function LoggerFactory() {
    _classCallCheck(this, LoggerFactory);
  }

  _createClass(LoggerFactory, null, [{
    key: 'get',
    value: function get(label, nodeName) {
      var colors = {
        debug: 'blue',
        info: 'green',
        warn: 'yellow',
        error: 'red'
      };

      _winston2.default.addColors(colors);

      var logstashUri = process.env.WEPLAY_LOGSTASH_URI;
      var logstashTransport = void 0;

      if (logstashUri) {
        var pieces = logstashUri.split(':');
        var host = pieces[0];
        var port = pieces[1] || 5001;

        logstashTransport = new _winston2.default.transports.Logstash({
          port: port,
          ssl_enable: false,
          host: host,
          max_connect_retries: -1,
          label: label,
          level: env === 'development' ? 'debug' : 'info',
          meta: { node: nodeName || label + '-' + process.pid },
          node_name: nodeName || process.title
        });
      }

      var consoleTransport = new _winston2.default.transports.Console({
        handleExceptions: true,
        timestamp: true,
        json: false,
        colorize: true,
        level: env === 'development' ? 'debug' : 'info'
      });

      var logger = new _winston2.default.Logger({
        transports: logstashUri ? [consoleTransport, logstashTransport] : [consoleTransport],
        exitOnError: false
      });
      return logger;
    }
  }]);

  return LoggerFactory;
}();

exports.default = LoggerFactory;