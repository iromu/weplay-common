'use strict';

var _DiscoveryServerListeners = require('../main/DiscoveryServerListeners');

var _DiscoveryServerListeners2 = _interopRequireDefault(_DiscoveryServerListeners);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

require('./common.spec');


describe('DiscoveryServerListeners', function () {
  describe('register', function () {
    it('should register a new service', function (done) {
      var _services = [{ id: '0', name: 'should register a new service' }];
      var service = { id: '1', name: 'should register a new service' };
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'name',
        io: {
          'to': function to(name) {
            expect(name).to.be.equal(service.name);
            return {
              'emit': function emit(event, data) {
                expect(event).to.be.equal('registered');
                expect(data.name).to.be.equal(service.name);
              }
            };
          }
        },
        socket: {
          'emit': function emit(event, data) {
            expect(event).to.be.equal('registered');
            expect(data.name).to.be.equal(service.name);
          },
          'join': function join(data) {
            expect(data).to.be.equal(service.name);
          }
        },
        _services: _services,
        onRegisterListener: function onRegisterListener(s) {
          expect(s.name).to.be.equal(service.name);
          done();
        }
      });
      discoveryServerListeners.register(service);
    });
    it('should ignore the same service', function (done) {
      var _services = [{ id: '1', name: 'should register a new service' }];
      var service = { id: '1', name: 'should register a new service' };
      var failures = 0;
      var fail = function fail() {
        failures++;
      };
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'name',
        io: {
          'to': function to(name) {
            expect(name).to.be.equal(service.name);
            return {
              'emit': function emit(event, data) {
                fail();
              }
            };
          }
        },
        socket: {
          'emit': function emit(event, data) {
            fail();
          },
          'join': function join(data) {
            fail();
          }
        },
        _services: _services,
        onRegisterListener: function onRegisterListener(s) {
          fail();
        }
      });
      discoveryServerListeners.register(service);
      expect(failures).to.be.equal(0);
      done();
    });
  });
  describe('discover', function () {
    it('should find service by channel name', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'name',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.id).to.be.equal('1');
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: '1', name: 'service' });
      discoveryServerListeners.discover({ channel: 'service' });
    });
    it('should find service by channel name and non existing stream name', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.id).to.be.equal('id 1');
            expect(data.streams).to.be.undefined;
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: 'id 1', name: 'service' });
      discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
    });
    it('should find service by channel name and non existing stream name (multi)', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.streams).to.be.undefined;
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: 'id 1', name: 'service' });
      _services.push({ id: 'id 2', name: 'service' });
      _services.push({ id: 'id 3', name: 'service' });
      discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
    });
    it('should find service by channel name and non existing stream name (multi free)', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: {
          'emit': function emit(event, data) {
            expect(event).to.be.equal('streamCreateRequested');
            expect(data).to.be.equal('test room');
          }
        },
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.id).to.be.equal('2');
            expect(data.streams).to.be.empty;
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: '1', name: 'service', rooms: ['test room 2'] });
      _services.push({ id: '2', name: 'service', rooms: [] });
      _services.push({ id: '3', name: 'service', rooms: ['test room 2'] });
      discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
    });
    it('should find service by channel name and existing stream name', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.id).to.be.equal('1');
            expect(data.streams).to.be.deep.equal(['test room']);
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: '1', name: 'service', rooms: ['test room'] });
      discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
    });
    it('should find service by channel name and existing stream name (multi)', function (done) {
      var _services = [];
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            expect(data.name).to.be.equal('service');
            expect(data.streams).to.be.deep.equal(['test room']);
            done();
          }
        },
        _services: _services
      });
      _services.push({ id: '1', name: 'service', rooms: ['test room1'] });
      _services.push({ id: '2', name: 'service', rooms: ['test room'] });
      _services.push({ id: '3', name: 'service', rooms: ['test room2'] });
      discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
    });
    it('should find service by channel name and existing stream name (multi balanced)', function (done) {
      var times = 10;
      var responses = 0;
      var _services = [];
      var expectedPressureByName = {};
      var discoveryServerListeners = new _DiscoveryServerListeners2.default({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': function emit(event, data) {
            console.log(data.pressure);
            if (!expectedPressureByName[data.id]) {
              expectedPressureByName[data.id] = 1;
            } else {
              expectedPressureByName[data.id]++;
            }
            expect(data.name).to.be.equal('service');
            expect(data.pressure).to.be.equal(expectedPressureByName[data.id]);
            expect(data.pressure).to.not.be.greaterThan(5);
            expect(data.streams).to.be.deep.equal(['test room']);
            responses++;
            if (responses === times - 1) {
              done();
            }
          }
        },
        _services: _services
      });
      _services.push({ id: '1', name: 'service', rooms: ['test room'], pressure: 0 });
      _services.push({ id: '2', name: 'service', rooms: ['test room'], pressure: 0 });
      _services.push({ id: '3', name: 'service', rooms: ['test room'], pressure: 0 });

      Array(times).join('x').split('').forEach(function () {
        discoveryServerListeners.discover({ channel: 'service', room: 'test room' });
      });
    });
  });
});