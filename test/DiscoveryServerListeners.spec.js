require('./common.spec')
import DiscoveryServerListeners from '../src/DiscoveryServerListeners'

describe('DiscoveryServerListeners', () => {
  describe('register', () => {
    it('should register a new service', (done) => {
      let _services = [{id: '0', name: 'should register a new service'}]
      let service = {id: '1', name: 'should register a new service'}
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'name',
        io: {
          'to': (name) => {
            expect(name).to.be.equal(service.name)
            return {
              'emit': (event, data) => {
                expect(event).to.be.equal('registered')
                expect(data.name).to.be.equal(service.name)
              }
            }
          }
        },
        socket: {
          'emit': (event, data) => {
            expect(event).to.be.equal('registered')
            expect(data.name).to.be.equal(service.name)
          },
          'join': (data) => {
            expect(data).to.be.equal(service.name)
          }
        },
        _services,
        onRegisterListener: s => {
          expect(s.name).to.be.equal(service.name)
          done()
        }
      })
      discoveryServerListeners.register(service)
    })
    it('should ignore the same service', (done) => {
      let _services = [{id: '1', name: 'should register a new service'}]
      let service = {id: '1', name: 'should register a new service'}
      let failures = 0
      let fail = () => {
        failures++
      }
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'name',
        io: {
          'to': (name) => {
            expect(name).to.be.equal(service.name)
            return {
              'emit': (event, data) => {
                fail()
              }
            }
          }
        },
        socket: {
          'emit': (event, data) => {
            fail()
          },
          'join': (data) => {
            fail()
          }
        },
        _services,
        onRegisterListener: s => {
          fail()
        }
      })
      discoveryServerListeners.register(service)
      expect(failures).to.be.equal(0)
      done()
    })
  })
  describe('discover', () => {
    it('should find service by channel name', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'name',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.id).to.be.equal('1')
            done()
          }
        },
        _services,
      })
      _services.push({id: '1', name: 'service'})
      discoveryServerListeners.discover({channel: 'service'})
    })
    it('should find service by channel name and non existing stream name', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.id).to.be.equal('id 1')
            expect(data.streams).to.be.undefined
            done()
          }
        },
        _services,
      })
      _services.push({id: 'id 1', name: 'service'})
      discoveryServerListeners.discover({channel: 'service', room: 'test room'})
    })
    it('should find service by channel name and non existing stream name (multi)', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.streams).to.be.undefined
            done()
          }
        },
        _services,
      })
      _services.push({id: 'id 1', name: 'service'})
      _services.push({id: 'id 2', name: 'service'})
      _services.push({id: 'id 3', name: 'service'})
      discoveryServerListeners.discover({channel: 'service', room: 'test room'})
    })
    it('should find service by channel name and non existing stream name (multi free)', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: {
          'emit': (event, data) => {
            expect(event).to.be.equal('streamCreateRequested')
            expect(data).to.be.equal('test room')
          }
        },
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.id).to.be.equal('2')
            expect(data.streams).to.be.empty
            done()
          }
        },
        _services,
      })
      _services.push({id: '1', name: 'service', rooms: ['test room 2']})
      _services.push({id: '2', name: 'service', rooms: []})
      _services.push({id: '3', name: 'service', rooms: ['test room 2']})
      discoveryServerListeners.discover({channel: 'service', room: 'test room'})
    })
    it('should find service by channel name and existing stream name', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.id).to.be.equal('1')
            expect(data.streams).to.be.deep.equal(['test room'])
            done()
          }
        },
        _services,
      })
      _services.push({id: '1', name: 'service', rooms: ['test room']})
      discoveryServerListeners.discover({channel: 'service', room: 'test room'})
    })
    it('should find service by channel name and existing stream name (multi)', (done) => {
      let _services = []
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            expect(data.name).to.be.equal('service')
            expect(data.streams).to.be.deep.equal(['test room'])
            done()
          }
        },
        _services,
      })
      _services.push({id: '1', name: 'service', rooms: ['test room1']})
      _services.push({id: '2', name: 'service', rooms: ['test room']})
      _services.push({id: '3', name: 'service', rooms: ['test room2']})
      discoveryServerListeners.discover({channel: 'service', room: 'test room'})
    })
    it('should find service by channel name and existing stream name (multi balanced)', (done) => {
      const times = 10
      let responses = 0
      let _services = []
      let expectedPressureByName = {}
      const discoveryServerListeners = new DiscoveryServerListeners({
        ip: 'ip',
        name: 'test',
        io: 'io',
        socket: {
          'emit': (event, data) => {
            console.log(data.pressure)
            if (!expectedPressureByName[data.id]) {
              expectedPressureByName[data.id] = 1
            } else {
              expectedPressureByName[data.id]++
            }
            expect(data.name).to.be.equal('service')
            expect(data.pressure).to.be.equal(expectedPressureByName[data.id])
            expect(data.pressure).to.not.be.greaterThan(5)
            expect(data.streams).to.be.deep.equal(['test room'])
            responses++
            if (responses === times - 1) {
              done()
            }
          }
        },
        _services,
      })
      _services.push({id: '1', name: 'service', rooms: ['test room'], pressure: 0})
      _services.push({id: '2', name: 'service', rooms: ['test room'], pressure: 0})
      _services.push({id: '3', name: 'service', rooms: ['test room'], pressure: 0})

      Array(times).join('x').split('').forEach(() => {
        discoveryServerListeners.discover({channel: 'service', room: 'test room'})
      })
    })
  })
})
