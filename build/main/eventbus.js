'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _discovery = require('./discovery');

var _discovery2 = _interopRequireDefault(_discovery);

var _eventbroker = require('./eventbroker');

var _eventbroker2 = _interopRequireDefault(_eventbroker);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var EventBus = function () {
  function EventBus(options, _onConnect) {
    _classCallCheck(this, EventBus);

    this.discoveryClient = new _discovery2.default().client(options, _onConnect);
    this.broker = new _eventbroker2.default(this.discoveryClient, options.clientListeners);
  }

  _createClass(EventBus, [{
    key: 'on',
    value: function on(channel, event, callback) {
      this.broker.on(channel, event, callback);
    }

    // Sends events to channel, binds to service endpoint.xs
    // Discovery finds which Service listens to the given {event}
    // and replays the event

  }, {
    key: 'emit',
    value: function emit(options, event, data, room) {
      if (options.channel !== undefined) {
        this.broker.emit(options.channel, options.event, options.data, options.room);
      } else {
        this.broker.emit(options, event, data, room);
      }
    }
  }, {
    key: 'streamJoin',
    value: function streamJoin(channel, room, event, listener) {
      this.broker.streamJoin(channel, room, event, listener);
    }
  }, {
    key: 'streamLeave',
    value: function streamLeave(channel, room) {
      this.broker.streamLeave(channel, room);
    }

    // Creates/Emit a private stream of events

  }, {
    key: 'stream',
    value: function stream(room, event, data) {
      this.broker.stream(room, event, data);
    }
  }, {
    key: 'publish',
    value: function publish(room, event, data) {
      this.broker.publish(room, event, data);
    }
  }, {
    key: 'destroyStream',
    value: function destroyStream(room, event) {
      this.broker.destroyStream(room, event);
    }
  }, {
    key: 'subscribe',
    value: function subscribe(options, listener) {
      this.broker.subscribe(options, listener);
    }
  }, {
    key: 'broadcast',
    value: function broadcast(event, data) {}
  }, {
    key: 'destroy',
    value: function destroy() {
      this.discoveryClient.destroy();
      this.broker.destroy();
    }
  }]);

  return EventBus;
}();

exports.default = EventBus;