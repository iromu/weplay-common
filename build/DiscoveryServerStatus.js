'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = require('util');

var _util2 = _interopRequireDefault(_util);

var _LoggerFactory = require('./LoggerFactory');

var _LoggerFactory2 = _interopRequireDefault(_LoggerFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = _LoggerFactory2.default.get('common-discovery');

var DiscoveryServerStatus = function () {
  function DiscoveryServerStatus(options) {
    _classCallCheck(this, DiscoveryServerStatus);

    this._services = options._services;
    this._eventLog = options._eventLog;
    if (options.statusPort) {
      var restify = require('restify');

      var server = restify.createServer({
        formatters: {
          'application/json': function applicationJson(req, res, body, cb) {
            return cb(null, _util2.default.inspect(body, null, '\t'));
          }
        }
      });
      server.name = this.name;
      server.pre(restify.pre.userAgentConnection());

      server.get('/lookup', this.lookupHandler);
      server.head('/lookup', this.lookupHandler);

      server.get('/csv', this.csvHandler.bind(this));
      server.head('/csv', this.csvHandler.bind(this));

      server.listen(options.statusPort, function () {
        logger.info('Restify [%s] listening at %s', server.name, server.url);
      });
    }
  }

  _createClass(DiscoveryServerStatus, [{
    key: 'csvHandler',
    value: function csvHandler(req, res, next) {
      var sendHeader = true;
      res.send(this._eventLog.map(function (log) {
        if (sendHeader) {
          sendHeader = false;
          return Object.keys(log).join(',');
        } else {
          return Object.keys(log).map(function (k) {
            return log[k];
          }).join(',');
        }
      }).join('\n'));
      next();
    }
  }, {
    key: 'lookupHandler',
    value: function lookupHandler(req, res, next) {
      res.send(this._services.map(function (service) {
        if (service.events) {
          var events = service.events.map(function (e) {
            return e.room ? e.event + '#' + e.room : e.event;
          });
          var streams = service.events.filter(function (e) {
            return e.room !== undefined;
          }).map(function (e) {
            return e.room;
          });
          return {
            name: service.name,
            id: service.id,
            version: service.version,
            events: events,
            streams: Array.from(new Set(streams)),
            depends: service.depends
          };
        } else {
          return { name: service.name, id: service.id, version: service.version };
        }
      }).sort(function (a, b) {
        return a.name > b.name ? 1 : -1;
      }));
      next();
    }
  }]);

  return DiscoveryServerStatus;
}();

exports.default = DiscoveryServerStatus;