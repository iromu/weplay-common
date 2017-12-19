'use strict';

var _common = require('./common.spec');

var _common2 = _interopRequireDefault(_common);

var _v = require('uuid/v1');

var _v2 = _interopRequireDefault(_v);

var _eventbus = require('../main/eventbus');

var _eventbus2 = _interopRequireDefault(_eventbus);

var _discovery = require('../main/discovery');

var _discovery2 = _interopRequireDefault(_discovery);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

process.env.NODE_ENV = 'test';

var serviceCleanup = [];
var discovery = void 0;
var discoveryPort = _common2.default.pop();
var discoveryUrl = 'http://localhost:' + discoveryPort;

describe('Discovery Load Balancing', function () {
  beforeEach(function (done) {
    discovery = new _discovery2.default().server({ name: 'discovery', port: discoveryPort }, done);
  });

  afterEach(function (done) {
    serviceCleanup.forEach(function (clean) {
      clean();
    });
    serviceCleanup = [];
    discovery.destroy();
    done();
  });

  var busFactory = function busFactory(config, onConnect) {
    config.url = discoveryUrl;
    config.port = _common2.default.pop();
    var bus = new _eventbus2.default(config, onConnect);
    serviceCleanup.push(bus.destroy.bind(bus));
    return bus;
  };

  describe('onStreaming', function () {
    var channel = 'emitter' + (0, _v2.default)();
    var room = 'room1' + (0, _v2.default)();
    var room2 = 'room2' + (0, _v2.default)();
    var room3 = 'room3' + (0, _v2.default)();
    var event = 'event1' + (0, _v2.default)();

    beforeEach(function () {
      channel = 'emitter' + (0, _v2.default)();
      room = 'room1-' + (0, _v2.default)();
      room2 = 'room2-' + (0, _v2.default)();
      room3 = 'room3-' + (0, _v2.default)();
      event = 'event1-' + (0, _v2.default)();
    });

    afterEach(function (done) {
      serviceCleanup.forEach(function (clean) {
        clean();
      });
      serviceCleanup = [];
      done();
    });

    it('should start 2 streams at 2 emitters, when requested', function (done) {
      var worker = busFactory({ name: 'worker', id: 'worker' }, function () {});

      var onWorkerStreamJoined = function onWorkerStreamJoined(data) {
        expect(data).to.be.equal('data from second emitter to register ' + room);
        worker.streamJoin(channel, room2, event, onWorkerStreamJoined2);
      };
      var onWorkerStreamJoined2 = function onWorkerStreamJoined2(data) {
        expect(data).to.be.equal('data from first emitter to register ' + room2);
        done();
      };

      var emitter2 = busFactory({
        name: channel,
        id: 'emitterA',
        serverListeners: {
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            socket.join(room2);
            emitter2.stream(room2, event, 'data from first emitter to register ' + room2);
          }
        }
      }, function () {
        emitter2.stream(room2, event, 'data from first emitter to register ' + room2);
        var emitter = busFactory({
          name: channel,
          id: 'emitterB',
          serverListeners: {
            'streamJoinRequested': function streamJoinRequested(socket, request) {
              socket.join(request);
              emitter.stream(room, event, 'data from second emitter to register ' + room);
            }
          }
        }, function () {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined);
        });
      });
    });

    it('should start only 2 stream when requested, rejecting new ones', function (done) {
      var emitter1Request = null;
      var emitter2Request = null;

      var clientListeners = [{
        name: channel,
        event: 'streamRejected',
        handler: function handler(data) {
          expect(data).to.be.equal(room3);
          done();
        }
      }];
      var worker = busFactory({ name: 'worker', id: 'worker', clientListeners: clientListeners });
      var onWorkerStreamJoined = function onWorkerStreamJoined(data) {
        expect(data).to.be.equal('data ' + room);
        worker.streamJoin(channel, room2, event, onWorkerStreamJoined2);
      };
      var onWorkerStreamJoined2 = function onWorkerStreamJoined2(data) {
        expect(data).to.be.equal('data ' + room2);
        worker.streamJoin(channel, room3, event, onWorkerStreamJoined3);
      };
      var onWorkerStreamJoined3 = function onWorkerStreamJoined3(data) {
        expect(data).to.not.be.equal('data ' + room3);
      };

      var emitter2 = busFactory({
        name: channel,
        id: 'emitter2',
        serverListeners: {
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            if (!emitter2Request) {
              emitter2Request = request;
              socket.join(request);
              emitter2.stream(request, event, 'data ' + request);
            } else {
              socket.emit('streamRejected', request);
              emitter2.stream(request, event, 'rejected ' + request);
            }
          }
        }
      }, function () {
        var emitter = busFactory({
          name: channel,
          id: 'emitter1',
          serverListeners: {
            'streamJoinRequested': function streamJoinRequested(socket, request) {
              if (!emitter1Request) {
                emitter1Request = request;
                socket.join(request);
                emitter.stream(request, event, 'data ' + request);
              } else {
                socket.emit('streamRejected', request);
                emitter.stream(request, event, 'rejected ' + request);
              }
            }
          }
        }, function () {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined);
        });
      });
    });
  });
});