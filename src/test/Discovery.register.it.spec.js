import ports from './common.spec'
import EventBus from '../main/eventbus'
import Discovery from '../main/discovery'

process.env.NODE_ENV = 'test'

let serviceCleanup = []
let discovery
let discoveryPort = ports.pop()
const discoveryUrl = `http://localhost:${discoveryPort}`

describe('Discovery', () => {
  beforeEach((done) => {
    discovery = new Discovery().server({name: 'My Discovery Test Server', port: discoveryPort}, done)
  })

  afterEach((done) => {
    serviceCleanup.forEach((clean) => {
      clean()
    })
    serviceCleanup = []
    discovery.destroy()
    done()
  })

  let busFactory = (config, onConnect) => {
    config.url = discoveryUrl
    config.port = ports.pop()
    let bus = new EventBus(config, onConnect)
    serviceCleanup.push(bus.destroy.bind(bus))
    return bus
  }

  describe('onRegister', () => {
    it('should register a new service', (done) => {
      discovery.onRegister((service) => {
        expect(service).to.include({name: 'onRegisterTest', id: 'test1'})
        done()
      })
      busFactory({name: 'onRegisterTest', id: 'test1'})
    })

    afterEach((done) => {
      serviceCleanup.forEach((clean) => {
        clean()
      })
      serviceCleanup = []
      done()
    })
    it('should register two services', (done) => {

      let expectedEvents = [{name: 'twoServiceRegistryTest', id: 'service1'}, {
        name: 'twoServiceRegistryTest',
        id: 'service2'
      }]
      let expectedEventsCounter = expectedEvents.length
      discovery.onRegister((event) => {
        const eventDAta = {name: event.name, id: event.id}
        if (expectedEvents.find(expected => expected.name === eventDAta.name && expected.id === eventDAta.id)) {
          expectedEvents = expectedEvents.filter(expected => !(expected.name === eventDAta.name && expected.id === eventDAta.id))
          expectedEventsCounter--
        }

        if (expectedEventsCounter === 0) {
          done()
        }
      })
      busFactory({name: 'twoServiceRegistryTest', id: 'service2'})
      busFactory({name: 'twoServiceRegistryTest', id: 'service1'})
    })

    it('should register service events', (done) => {
      let expectedEvents = [{event: 'event1'}, {event: 'event2'}]
      let expectedEventsCounter = expectedEvents.length
      discovery.onAnnounce((service) => {
        service.events.forEach((event) => {
          const eventDAta = {event: event.event}
          if (!eventDAta.room) {
            delete eventDAta.room
          }
          if (expectedEvents.find(expected => expected.event === eventDAta.event)) {
            expectedEvents = expectedEvents.filter(expected => !(expected.event === eventDAta.event))
            expectedEventsCounter--
          }
        })
        if (expectedEventsCounter === 0) {
          expectedEventsCounter--
          done()
        }
      })
      discovery.onRegister((service) => {
        expect(service).to.include({name: 'eventtest', id: 'eventtest1'})
      })
      busFactory({
        name: 'eventtest',
        id: 'eventtest1',
        serverListeners: {'event1': undefined, 'event2': undefined},
        clientListeners: [{name: 'notAnnounced', event: 'notAnnounced', handler: undefined}]
      })
    })
  })
})
