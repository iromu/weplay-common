'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _forwardedFor = require('forwarded-for');

var _forwardedFor2 = _interopRequireDefault(_forwardedFor);

var _DiscoveryServerListeners = require('./DiscoveryServerListeners');

var _DiscoveryServerListeners2 = _interopRequireDefault(_DiscoveryServerListeners);

var _LoggerFactory = require('./LoggerFactory');

var _LoggerFactory2 = _interopRequireDefault(_LoggerFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = _LoggerFactory2.default.get('common-discovery');

var Server = function () {
  function Server(options, cb) {
    var _this = this;

    _classCallCheck(this, Server);

    this.options = options;
    this.name = options.name;
    var port = options.port;
    var statusPort = options.statusPort;

    if (statusPort) {
      this.createRestServer(statusPort);
    }

    var sio = require('socket.io');
    this.io = sio({
      pingInterval: 2000,
      serveClient: false,
      pingTimeout: 1000
    });
    this._services = [];
    this._eventLog = [];
    this.listeners = options.serverListeners;

    this.io.on('connection', function (socket) {
      // logger.debug('[%s] Discovery Server.onConnection', this.name, socket.id)
      var req = socket.request;
      var ip = (0, _forwardedFor2.default)(req, req.headers).ip.split(':').pop();
      // Subscribe to listeners
      if (_this.listeners) {
        for (var event in _this.listeners) {
          if (_this.listeners.hasOwnProperty(event)) {
            var handler = _this.listeners[event];
            _this.subscribe(socket, event, handler);
          }
        }
      }
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: ip,
        name: _this.name,
        io: _this.io,
        socket: socket,
        _services: _this._services,
        _eventLog: _this._eventLog,
        onRegisterListener: _this.onRegisterListener,
        onAnnounceListener: _this.onAnnounceListener
      });
      _this.serverListeners = {
        'disconnect': function disconnect(request) {
          return discoveryServerListeners.disconnect(request);
        },
        'register': function register(request) {
          return discoveryServerListeners.register(request);
        },
        'announce': function announce(request) {
          return discoveryServerListeners.announce(request);
        },
        'unannounce': function unannounce(request) {
          return discoveryServerListeners.unannounce(request);
        },
        'discover': function discover(request) {
          return discoveryServerListeners.discover(request);
        },
        'streamCreateRequested': function streamCreateRequested(request) {
          return discoveryServerListeners.streamCreateRequested(request);
        },
        'streamJoinRequested': function streamJoinRequested(request) {
          return discoveryServerListeners.streamJoinRequested(request);
        }

        // TODO auto extend instead of omitting
      };if (_this.listeners && _this.listeners['streamCreateRequested']) {
        delete _this.serverListeners['streamCreateRequested'];
      }

      if (_this.listeners && _this.listeners['streamJoinRequested']) {
        delete _this.serverListeners['streamJoinRequested'];
      }

      for (var serverEvent in _this.serverListeners) {
        if (_this.serverListeners.hasOwnProperty(serverEvent)) {
          var _handler = _this.serverListeners[serverEvent];
          socket.on(serverEvent, _handler);
        }
      }
    });
    this.io.listen(port);
    logger.info('[%s] Discovery Server listening at port %s', options.name, options.port);
    if (cb) {
      cb();
    }
  }

  _createClass(Server, [{
    key: 'createRestServer',
    value: function createRestServer(statusPort) {
      var restify = require('restify');

      function csvHandler(req, res, next) {
        var sendHeader = true;
        res.send(this.eventLog().map(function (log) {
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

      function lookupHandler(req, res, next) {
        res.send(this._services.map(function (service) {
          if (service.events) {
            var events = service.events.map(function (e) {
              return e.room ? e.event + '#' + e.room : e.event;
            });
            var streams = service.events.filter(function (e) {
              return e.room;
            }).map(function (e) {
              return e.room;
            });
            return {
              name: service.name,
              hostname: service.hostname,
              port: service.port,
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

      var server = restify.createServer({
        formatters: {
          'application/json': function applicationJson(req, res, body) {
            return JSON.stringify(body, null, '\t');
          }
        }
      });
      server.name = this.name;
      server.pre(restify.pre.userAgentConnection());

      server.get('/lookup', lookupHandler.bind(this));
      server.head('/lookup', lookupHandler.bind(this));

      server.get('/csv', csvHandler.bind(this));
      server.head('/csv', csvHandler.bind(this));

      server.listen(statusPort, function () {
        logger.info('[%s] Discovery Status listening at %s', server.name, server.url);
      });
    }
  }, {
    key: 'onStreamCreateRequested',
    value: function onStreamCreateRequested(data) {}
  }, {
    key: 'getInternalListeners',
    value: function getInternalListeners() {
      return {
        'streamJoinRequested': undefined,
        'disconnect': undefined,
        'register': undefined,
        'announce': undefined,
        'discover': undefined,
        'streamCreateRequested': undefined
      };
    }
  }, {
    key: 'subscribe',
    value: function subscribe(socket, event, listener) {
      if (listener) {
        // logger.info('[%s] Discovery Server[%s].subscribe Adding listener to event %s', this.name, this.options.name, event)
        socket.on(event, function (data) {
          listener(socket, data);
        });
      }
    }
  }, {
    key: 'to',
    value: function to(room) {
      return this.io.to(room);
    }
  }, {
    key: 'lookup',
    value: function lookup() {
      return this._services;
    }
  }, {
    key: 'eventLog',
    value: function eventLog() {
      return this._eventLog;
    }
  }, {
    key: 'onRegister',
    value: function onRegister(listener) {
      this.onRegisterListener = listener;
    }
  }, {
    key: 'onAnnounce',
    value: function onAnnounce(listener) {
      this.onAnnounceListener = listener;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.io.close();
    }
  }]);

  return Server;
}();

exports.default = Server;