'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* eslint-disable semi,spaced-comment */


var _LoggerFactory = require('./LoggerFactory');

var _LoggerFactory2 = _interopRequireDefault(_LoggerFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var logger = _LoggerFactory2.default.get('common-discovery');

// const _ = require('lodash')

var EventBroker = function () {
  function EventBroker(discoveryClient, clientListeners) {
    var _this = this;

    _classCallCheck(this, EventBroker);

    // this.subscriptions = {};
    this._services = [];
    this.queue = {};
    this.streamJoinHashes = {};

    this.discoveryClient = discoveryClient;
    this.name = this.discoveryClient.name;
    this.clientListeners = clientListeners;

    // Listen for incoming matching service
    this.discoveryClient.subscribe('discovered', function (service) {
      _this.subscribeService(service);
    });
  }

  _createClass(EventBroker, [{
    key: 'processQueue',
    value: function processQueue(service) {
      // logger.debug('[%s] EventBroker.processQueue[%s] queue exists? %s',
      // this.name, service.name, !!this.queue[service.name])
      if (this.queue[service.name]) {
        this.queue[service.name].emit.forEach(function (command) {
          service.emit(command.event, command.data);
        });
        //room, event, listener
        //var pending = [];
        // logger.debug('[%s] EventBroker.processQueue[name %s] joinqueue exists? %s',
        //   this.name, service.name, !!this.queue[service.name].streamJoin)

        this.queue[service.name].streamJoin.forEach(function (command) {
          //if(service.events.filter(data=>data.room === command.room))
          // logger.debug('[%s] WARNING EventBroker.processQueue[%s] stream join %s', this.name, service.name, command.room)
          service.streamJoin(command.room, command.event, command.listener);
          //else {
          //    logger.error('WARNING EventBroker.processQueue[%s] pending stream join %s', service.name, command.room);
          //    pending.push = command;
          //}
        });
        this.queue[service.name].on.forEach(function (command) {
          service.on(command.event, command.data);
        });
        delete this.queue[service.name];
        this.queue[service.name] = { emit: [], on: [], streamJoin: [], streamLeave: [] };
      }
    }

    // Adds service info discovered

  }, {
    key: 'subscribeService',
    value: function subscribeService(service) {
      var _this2 = this;

      var serviceLog = {
        name: service.name,
        streams: service.streams,
        rooms: service.rooms,
        room: service.room,
        id: service.id,
        ip: service.ip,
        hostname: service.hostname,
        scheme: service.scheme,
        port: service.port
      };
      logger.debug('[%s] EventBroker adding local service ', this.name, serviceLog);
      var url = service.scheme + '://' + service.ip + ':' + service.port;

      if (!service.socket) {
        logger.debug('[%s] EventBroker connecting local service ', this.name, serviceLog);
        service.socket = require('socket.io-client')(url);
      }

      if (!service.emit) {
        service.emit = function (_event, _args) {
          // logger.debug('[%s] EventBroker[channel:%s] 2 emit %s', this.name, service.name, _event)
          service.socket.emit(_event, _args);
        };
      }

      if (!service.on) {
        service.on = function (_event, _args) {
          service.socket.on(_event, _args);
        };
      }

      if (!service.streamJoin) {
        // room, event, listener
        service.streamJoin = function (room, event, listener) {
          if (room) {
            var info = { service: service.name, room: room, event: event };
            logger.debug('[%s] EventBroker service.streamJoin requesting ', _this2.name, info);

            if (!_this2.streamJoinHashes[service.name]) {
              _this2.streamJoinHashes[service.name] = [];
            }

            if (!service.streamJoinHashes) {
              service.streamJoinHashes = [];
            }

            if (!service.streamJoinHashes.includes(room)) {
              service.streamJoinHashes.push(room);
            }

            if (!service.events) {
              service.events = [];
            }

            var eventInfo = { room: room };
            if (!service.events.includes(eventInfo)) {
              service.events.push(eventInfo);
            }

            if (!_this2.streamJoinHashes[service.name].includes(room)) {
              _this2.streamJoinHashes[service.name].push(room);
              if (event && listener) {
                service.socket.off(event);
                service.socket.on(event, listener);
              }
            } else if (event && listener) {
              service.socket.off(event);
              service.socket.on(event, listener);
            }

            service.socket.emit('streamJoinRequested', room);
          }
        };
      }

      if (!service.streamLeave) {
        service.streamLeave = function (room) {
          var info = { service: service.name, room: room };
          var channel = service.name;
          logger.debug('[%s] EventBroker service.streamLeave requesting ', _this2.name, info);

          if (!_this2.streamJoinHashes[channel]) {
            _this2.streamJoinHashes[channel] = [];
          }

          _this2.streamJoinHashes[channel] = _this2.streamJoinHashes[channel].filter(function (r) {
            return r !== room;
          });

          _this2._services.filter(function (e) {
            return e.streams && e.streams.includes(room) && e.name === channel;
          }).forEach(function (s) {
            s.streams = s.streams.filter(function (s) {
              return s !== room;
            });
            if (s.streams.length === 0) {
              delete s.streams;
            }
          });
          service.socket.emit('streamLeaveRequested', room);
        };
      }

      service.socket.on('connect', function () {
        logger.info('[%s] EventBroker.connect service', _this2.name, serviceLog);
        if (service.disconnected) {
          logger.debug('[%s] EventBroker >> reconnected', _this2.name, serviceLog);
          service.disconnected = false;
          // service.listeners = this.clientListeners.filter(l=>l.name === service.name);
          // service.listeners.forEach(listener=> {
          //    logger.debug('EventBroker on service ', {
          //        event: listener.event
          //    });
          //    service.socket.on(listener.event, listener.handler);
          // });
          // this.reconnect(service);
        } else {
          logger.debug('[%s] EventBroker > connect', _this2.name, serviceLog);
          _this2.processQueue(service);
        }
      });

      service.socket.on('disconnect', function () {
        logger.debug('[%s] EventBroker x disconnected from', _this2.name, service.name);
        service.disconnected = true;
      });

      if (this.clientListeners) {
        service.listeners = this.clientListeners.filter(function (l) {
          return l.name === service.name;
        });
        service.listeners.forEach(function (listener) {
          logger.debug('[%s] EventBroker register listeners on service event ', _this2.name, {
            service: service.name,
            event: listener.event
          });
          service.socket.on(listener.event, listener.handler);
        });
      }

      this._services.push(service);

      this.processQueue(service);
    }
  }, {
    key: 'getService',
    value: function getService(channel, room) {
      // logger.info('[%s] EventBroker.getService ', this.name, {
      //   channel: channel,
      //   room: room
      // })

      var matchesRoom = function matchesRoom(service) {
        if (service.events) {
          service.streams = service.events.filter(function (e) {
            return e.room;
          }).map(function (e) {
            return e.room;
          });
          // var serviceInfo = _.omit(service, ['ip', 'scheme', 'port', 'socket', 'emit', 'streamJoin', 'streamLeave', 'on'])
          // logger.info('service.streams %s/%s serviceInfo %s', channel, room, JSON.stringify(serviceInfo))
        }
        return service.name === channel && service.streams && service.streams.includes(room);
      };
      var matchesName = function matchesName(service) {
        return service.name === channel;
      };

      var condition = room ? matchesRoom : matchesName;
      var service = this._services.filter(condition)[0];
      if (!service && !this.queue[channel]) {
        this.queue[channel] = { emit: [], on: [], streamJoin: [], streamLeave: [] };
      } else {
        return service;
      }
    }
  }, {
    key: 'emit',
    value: function emit(channel, event, data, room) {
      // logger.debug('[%s] EventBroker[channel:%s] 1 emit event:%s', this.name, channel, event)
      var service = this.getService(channel, room);
      if (!service) {
        this.queue[channel].emit.push({ event: event, data: data });
        // Ask discovery service for the location of this service.
        this.discoveryClient.emit('discover', { channel: channel });

        // logger.debug('[%s] EventBroker[channel:%s] 1.1 emit event:%s', this.name, channel, event)
      } else {
        service.emit(event, data);

        // logger.debug('[%s] EventBroker[channel:%s] 1.2 emit event:%s', this.name, channel, event)
      }
    }
  }, {
    key: 'subscribe',
    value: function subscribe(options, listener) {
      this.discoveryClient.publishStreamConsumer(options.room, options.event);
    }
  }, {
    key: 'stream',
    value: function stream(room, event, data) {
      this.discoveryClient.publish(room, event, data);
    }
  }, {
    key: 'destroyStream',
    value: function destroyStream(room, event) {
      this.discoveryClient.destroyStream(room, event);
    }
  }, {
    key: 'publish',
    value: function publish(channel, room, event, data) {
      var service = this.getService(channel, room);
      if (!service) {
        // Ask discovery service for the location of this stream.
        logger.debug('[%s] EventBroker [%s.%s] streamJoin ASK %s', this.name, channel, room, event);
        this.queue[channel].streamJoin.push({ room: room, event: event });
        this.discoveryClient.emit('discover', { channel: channel, room: room });
        // this.discoveryClient.emit('streamCreateRequested', {channel: channel, room: room})

        // Ask discovery service for the location of this service.
        //this.discoveryClient.emit('discover', {channel: channel});
      } else {
        logger.debug('[%s] EventBroker [%s.%s] streamJoin %s', this.name, channel, room, event);
        service.socket.to(room).emit(event, data);
      }
      //this.on(channel, event, listener);
    }
  }, {
    key: 'streamJoin',
    value: function streamJoin(channel, room, event, listener) {
      var service = this.getService(channel, room);
      if (!service) {
        // Ask discovery service for the location of this stream.
        logger.debug('[%s] EventBroker [%s.%s] streamJoin ASK %s', this.name, channel, room, event);
        this.queue[channel].streamJoin.push({ room: room, event: event, listener: listener });
        this.discoveryClient.emit('discover', { channel: channel, room: room });
        // this.discoveryClient.emit('streamCreateRequested', {channel: channel, room: room})

        // Ask discovery service for the location of this service.
        //this.discoveryClient.emit('discover', {channel: channel});
      } else {
        logger.debug('[%s] EventBroker [%s.%s] streamJoin %s', this.name, channel, room, event);
        service.streamJoin(room, event, listener);
      }
      //this.on(channel, event, listener);
    }
  }, {
    key: 'streamLeave',
    value: function streamLeave(channel, room) {
      var service = this.getService(channel, room);
      if (!service) {
        logger.error('[%s] EventBroker [%s.%s] streamLeave ERROR!!!', this.name, channel, room);
      } else {
        logger.debug('[%s] EventBroker [%s.%s] streamLeave CALL', this.name, channel, room);
        service.streamLeave(room);
      }
    }
  }, {
    key: 'on',
    value: function on(channel, event, callback) {
      var service = this.getService(channel);
      if (!service) {
        this.queue[channel].on.push({ event: event, callback: callback });
      } else {
        service.on(event, callback);
      }
    }
  }, {
    key: 'reconnect',
    value: function reconnect(service) {
      this.processQueue(service);
      service.disconnected = false;
    }
  }, {
    key: 'destroy',
    value: function destroy() {
      this.discoveryClient.destroy();
    }
  }]);

  return EventBroker;
}();

exports.default = EventBroker;