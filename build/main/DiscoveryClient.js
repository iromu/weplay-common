'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable semi,space-before-function-paren,spaced-comment */
// const logger = require('../index').logger('common-discovery')


var _os = require('os');

var _os2 = _interopRequireDefault(_os);

var _socket2 = require('socket.io-client');

var _socket3 = _interopRequireDefault(_socket2);

var _DiscoveryServer = require('./DiscoveryServer');

var _DiscoveryServer2 = _interopRequireDefault(_DiscoveryServer);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Client = function () {
  function Client(options, _onConnect) {
    var _this = this;

    _classCallCheck(this, Client);

    options.name = options.name || '_default_';
    this.options = options;
    this.id = options.id;
    this.name = options.name;
    this.rooms = [];

    // logger.debug('[%s] DiscoveryClient constructor starting on port %s', options.name, options.port)

    // // logger.debug('Client constructor', {name: options.name, port: options.port});

    // Connect to discovery server
    this.socket = (0, _socket3.default)(options.url);
    options.serverEmbedded = true;
    this.server = new _DiscoveryServer2.default(options, function () {
      // logger.debug('[%s.%s] DiscoveryClient embedded server listening on port %s', options.name, this.id, options.port)
    });

    this.uuid = options.uuid;
    // const logInfo = {
    //   service: {name: options.name, id: options.id},
    //   registry: options.url
    // }
    this.socket.on('connect', function () {
      if (_this.disconnected) {
        // logger.debug('[%s.%s] DiscoveryClient onConnect after disconnection', options.name, this.id, logInfo)
      } else {
          // logger.debug('[%s.%s] DiscoveryClient onConnect', options.name, this.id, logInfo)
        }
      _this.socket.on('registered', function (data) {
        // logger.info('[%s.%s] DiscoveryClient onRegistered', options.name, this.id, data)
        if (data.id === this.id) {
          this.registered = true;
        }
        //if (_onRegistered) {
        //    _onRegistered();
        //}
      });
      _this.socket.emit('register', { name: options.name, id: _this.id, port: options.port, hostname: _os2.default.hostname() });
      _this.announceListeners(options.serverListeners);
      _this.announceListeners(_this.server.getInternalListeners());
      if (_onConnect) {
        _this.rooms = [];
        _onConnect();
      }
    });

    this.socket.on('disconnect', function () {
      // logger.debug('x disconnected from Discovery', options.url)
      _this.disconnected = true;
    });

    this.socket.on('streamCreateRequested', function (data) {
      _this.server.onStreamCreateRequested();
    });
  }

  _createClass(Client, [{
    key: 'announceListeners',
    value: function announceListeners(listeners) {
      for (var event in listeners) {
        if (listeners.hasOwnProperty(event)) {
          this.socket.emit('announce', {
            name: this.name,
            id: this.id,
            port: this.options.port,
            event: event
          });
        }
      }
    }
  }, {
    key: 'subscribe',
    value: function subscribe(event, listener) {
      // logger.debug('+ discovery client subscribe()', {event: event})
      this.socket.on(event, function (data) {
        listener(data);
      });
    }
  }, {
    key: 'emit',
    value: function emit() {
      var _socket;

      (_socket = this.socket).emit.apply(_socket, arguments);
    }

    // Creates/Emit a private stream of events

  }, {
    key: 'publish',
    value: function publish(room, event, data) {
      if (!this.rooms.includes(room)) {
        // logger.debug('+ discovery client publish()', {room: room, event: event})
        this.rooms.push(room);

        // logger.debug('+ discovery client Notify Discovery service on publish()', {room: room, event: event})

        // Notify Discovery service that we support joining to streams at this channel
        this.socket.emit('announce', {
          name: this.options.name,
          id: this.id,
          port: this.options.port,
          room: room,
          event: 'streamJoinRequested'
        });

        this.socket.emit('announce', {
          name: this.options.name,
          id: this.id,
          port: this.options.port,
          room: room,
          event: event
        });
      }

      // private push
      this.server.to(room).emit(event, data);
    }
  }, {
    key: 'destroyStream',
    value: function destroyStream(room, event) {
      this.rooms = this.rooms.filter(function (r) {
        return r !== room;
      });
      this.socket.emit('unannounce', {
        name: this.options.name,
        id: this.id,
        port: this.options.port,
        room: room,
        event: event
      });
      // private push
      this.server.to(room).emit('destroy', room);
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.server.destroy();
      this.socket.close();
    }
  }]);

  return Client;
}();

exports.default = Client;