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

describe('Discovery', function () {
  beforeEach(function (done) {
    discovery = new _discovery2.default().server({ name: 'My Discovery Test Server', port: discoveryPort }, done);
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
    var event = 'event1' + (0, _v2.default)();
    beforeEach(function () {
      channel = 'emitter' + (0, _v2.default)();
      room = 'room1' + (0, _v2.default)();
      event = 'event1' + (0, _v2.default)();
    });
    afterEach(function (done) {
      serviceCleanup.forEach(function (clean) {
        clean();
      });
      serviceCleanup = [];
      done();
    });
    it('should announce stream events', function (done) {
      var emitter = void 0;
      var expectedEvents = [{ event: 'streamJoinRequested', room: room }, { event: event, room: room }];
      var expectedEventsCounter = expectedEvents.length;
      discovery.onAnnounce(function (service) {
        service.events.forEach(function (event) {
          var eventDAta = { event: event.event, room: event.room };
          if (!eventDAta.room) {
            delete eventDAta.room;
          }
          if (expectedEvents.find(function (expected) {
            return expected.event === eventDAta.event && expected.room === eventDAta.room;
          })) {
            expectedEvents = expectedEvents.filter(function (expected) {
              return !(expected.event === eventDAta.event && expected.room === eventDAta.room);
            });
            expectedEventsCounter--;
          }
        });
        if (expectedEventsCounter === 0) {
          done();
        }
      });

      var onConnectEmitter = function onConnectEmitter() {
        emitter.stream(room, event, 'data 1');
      };
      emitter = busFactory({ name: channel, id: channel }, onConnectEmitter);
    });

    it('should handshake an stream with default handler', function (done) {
      var emitter = void 0;
      var checkTest = function checkTest(data) {
        expect(data).to.be.equal('data R');
        done();
      };
      var onConnectEmitter = function onConnectEmitter() {
        emitter.stream(room, event, 'data 1');
        var worker = busFactory({ name: 'worker', id: 'worker' }, function () {
          emitter.stream(room, event, 'data 2');
          worker.streamJoin(channel, room, event, checkTest);
          setTimeout(function () {
            emitter.stream(room, event, 'data R');
          }, 50);
          emitter.stream(room, event, 'data R');
        });
      };
      emitter = busFactory({ name: channel, id: channel }, onConnectEmitter);
      emitter.stream(room, event, 'data 0');
    });

    it('should handshake an stream with custom handler', function (done) {
      var emitter = void 0;
      var checkTest = function checkTest(data) {
        expect(data).to.be.equal('data Custom');
        done();
      };
      var onConnectEmitter = function onConnectEmitter() {
        emitter.stream(room, event, 'data 1');
        var worker = busFactory({ name: 'worker', id: 'worker' }, function () {
          emitter.stream(room, event, 'data 2');
          worker.streamJoin(channel, room, event, checkTest);
        });
      };
      emitter = busFactory({
        name: channel,
        id: channel,
        serverListeners: {
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            socket.join(request);
            emitter.stream(request, event, 'data Custom');
          }
        }
      }, onConnectEmitter);
      emitter.stream(room, event, 'data 0');
    });

    it('should start an stream when requested', function (done) {
      channel = 'emitter2';
      room = 'room2';
      event = 'event2';
      var onWorkerStreamJoined = function onWorkerStreamJoined(data) {
        expect(data).to.be.equal('data J');
        done();
      };
      var emitter = busFactory({
        name: channel,
        id: 'emitter',
        serverListeners: {
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            socket.join(request);
            emitter.stream(request, event, 'data J');
          },
          'streamCreateRequested': function streamCreateRequested(socket, request) {
            socket.join(request);
            emitter.stream(request, event, 'data C');
          }
        }
      }, function () {
        var worker = busFactory({ name: 'worker', id: 'worker' }, function () {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined);
        });
      });
    });

    it('should start an stream when requested and echo any event sent', function (done) {
      channel = 'emitterEcho';
      room = 'roomEcho';
      event = 'echo';
      var worker = void 0;
      var onWorkerStreamJoined = function onWorkerStreamJoined(data) {
        if (data === 'Joined') {
          // Send message to emitter through room
          worker.emit({ channel: channel, room: room, event: event, data: 'Hello' });
        } else if (data === 'Hello') {
          done();
        } else {
          fail(data);
        }
      };

      // Prepare emitter listeners
      var emitter = busFactory({
        name: channel,
        id: 'emitter',
        serverListeners: {
          'echo': function echo(socket, request) {
            emitter.stream(room, event, request);
          },
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            socket.join(request);
            emitter.stream(request, event, 'Joined');
          }
        }
      }, function () {
        worker = busFactory({
          name: 'worker',
          id: 'worker'
        }, function () {
          // Request Stream creation and join
          worker.streamJoin(channel, room, event, onWorkerStreamJoined);
        });
      });
    });

    it('should reconnect an stream when emitter goes online again', function (done) {
      channel = 'emitterRec';
      room = 'roomRec';
      event = 'eventRec';
      var emitter = void 0;
      var worker = void 0;
      var emitterIsReconnecting = void 0;
      var i = 0;
      var emitterConfig = {
        name: channel,
        id: 'emitter',
        serverListeners: {
          'streamJoinRequested': function streamJoinRequested(socket, request) {
            socket.join(request);
            emitter.stream(request, event, 'data J' + i);
          }
        }
      };

      var checkTest = function checkTest(data) {
        expect(data).to.be.equal('data J0');
        if (emitterIsReconnecting) {
          done();
        }
        emitterIsReconnecting = true;
        emitter.destroy();
        emitter = busFactory(emitterConfig, function () {
          emitter.stream(room, event, 'data J' + i++);
        });
      };

      emitter = busFactory(emitterConfig, function () {
        worker = busFactory({
          name: 'worker',
          id: 'worker',
          clientListeners: [{
            name: channel,
            event: 'connect',
            handler: function handler() {
              if (!emitterIsReconnecting) {
                emitterIsReconnecting = true;
                worker.streamJoin(channel, room, event, checkTest);
              }
            }
          }, {
            name: channel,
            event: 'disconnect',
            handler: function handler() {
              worker.streamLeave(channel, room);
            }
          }]
        }, function () {
          emitter.stream(room, event, 'data I');
          worker.streamJoin(channel, room, event, checkTest);
        });
      });
    });

    // xit('should start a stream when a emitter connects', (done) => {
    //   channel = 'emitterRec2'
    //   room = 'roomRec2'
    //   event = 'eventRec2'
    //   let i = 0
    //   let checkTest = (data) => {
    //     expect(data).to.be.equal(`data J${i++}`)
    //     done()
    //   }
    //   let worker
    //   worker = busFactory({
    //     name: 'worker',
    //     id: 'worker',
    //     clientListeners: [
    //       {
    //         name: channel,
    //         event: 'connect',
    //         handler: () => {
    //           worker.streamJoin(channel, room, event, checkTest)
    //         }
    //       },
    //       {
    //         name: channel,
    //         event: 'disconnect',
    //         handler: () => {
    //           // worker.streamLeave(channel, room)
    //         }
    //       }
    //     ]
    //   }, () => {
    //     worker.streamJoin(channel, room, event, checkTest)
    //     let emitter = busFactory({
    //       name: channel,
    //       id: channel,
    //       serverListeners: {
    //         'streamJoinRequested': (socket, request) => {
    //           socket.join(request)
    //           emitter.stream(request, event, `data J${i++}`)
    //         },
    //         'streamCreateRequested': (socket, request) => {
    //           socket.join(request)
    //           emitter.stream(request, event, 'data C')
    //         }
    //       }
    //     }, () => {
    //       emitter.stream(room, event, 'data I')
    //     })
    //   })
    // })
  });
});