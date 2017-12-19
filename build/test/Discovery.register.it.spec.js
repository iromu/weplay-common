'use strict';

var _common = require('./common.spec');

var _common2 = _interopRequireDefault(_common);

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

  describe('onRegister', function () {
    it('should register a new service', function (done) {
      discovery.onRegister(function (service) {
        expect(service).to.include({ name: 'onRegisterTest', id: 'test1' });
        done();
      });
      busFactory({ name: 'onRegisterTest', id: 'test1' });
    });

    afterEach(function (done) {
      serviceCleanup.forEach(function (clean) {
        clean();
      });
      serviceCleanup = [];
      done();
    });
    it('should register two services', function (done) {

      var expectedEvents = [{ name: 'twoServiceRegistryTest', id: 'service1' }, {
        name: 'twoServiceRegistryTest',
        id: 'service2'
      }];
      var expectedEventsCounter = expectedEvents.length;
      discovery.onRegister(function (event) {
        var eventDAta = { name: event.name, id: event.id };
        if (expectedEvents.find(function (expected) {
          return expected.name === eventDAta.name && expected.id === eventDAta.id;
        })) {
          expectedEvents = expectedEvents.filter(function (expected) {
            return !(expected.name === eventDAta.name && expected.id === eventDAta.id);
          });
          expectedEventsCounter--;
        }

        if (expectedEventsCounter === 0) {
          done();
        }
      });
      busFactory({ name: 'twoServiceRegistryTest', id: 'service2' });
      busFactory({ name: 'twoServiceRegistryTest', id: 'service1' });
    });

    it('should register service events', function (done) {
      var expectedEvents = [{ event: 'event1' }, { event: 'event2' }];
      var expectedEventsCounter = expectedEvents.length;
      discovery.onAnnounce(function (service) {
        service.events.forEach(function (event) {
          var eventDAta = { event: event.event };
          if (!eventDAta.room) {
            delete eventDAta.room;
          }
          if (expectedEvents.find(function (expected) {
            return expected.event === eventDAta.event;
          })) {
            expectedEvents = expectedEvents.filter(function (expected) {
              return !(expected.event === eventDAta.event);
            });
            expectedEventsCounter--;
          }
        });
        if (expectedEventsCounter === 0) {
          expectedEventsCounter--;
          done();
        }
      });
      discovery.onRegister(function (service) {
        expect(service).to.include({ name: 'eventtest', id: 'eventtest1' });
      });
      busFactory({
        name: 'eventtest',
        id: 'eventtest1',
        serverListeners: { 'event1': undefined, 'event2': undefined },
        clientListeners: [{ name: 'notAnnounced', event: 'notAnnounced', handler: undefined }]
      });
    });
  });
});