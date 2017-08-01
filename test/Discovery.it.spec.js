/* eslint-disable no-undef */
'use strict'

require('./common.spec')

process.env.NODE_ENV = 'test'

const EventBus = require('../src/eventbus')
const Discovery = require('../src/discovery')

// ports used in this test
let latestPort = 50000
let ports = Array.from({length: 100}, () => latestPort++)

let serviceCleanup = []
let discovery
let discoveryPort = ports.pop()
const discoveryUrl = 'http://localhost:' + discoveryPort

describe('Discovery', () => {
  beforeEach((done) => {
    discovery = new Discovery().server({name: 'My Discovery Test Server', port: discoveryPort}, done)
    serviceCleanup.push(discovery.destroy.bind(discovery))
  })

  afterEach((done) => {
    serviceCleanup.forEach((clean) => {
      clean()
    })
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

  describe('onStreaming', () => {

    let channel = 'emitter'
    let room = 'room1'
    let event = 'event1'
    beforeEach(() => {
      channel = 'emitter'
      room = 'room1'
      event = 'event1'
    })
    it('should announce stream events', (done) => {
      let emitter
      let expectedEvents = [{event: 'streamJoinRequested', room: room}, {event: event, room: room}]
      let expectedEventsCounter = expectedEvents.length
      discovery.onAnnounce((service) => {
        service.events.forEach((event) => {
          const eventDAta = {event: event.event, room: event.room}
          if (!eventDAta.room) {
            delete eventDAta.room
          }
          if (expectedEvents.find(expected => expected.event === eventDAta.event && expected.room === eventDAta.room)) {
            expectedEvents = expectedEvents.filter(expected => !(expected.event === eventDAta.event && expected.room === eventDAta.room))
            expectedEventsCounter--
          }
        })
        if (expectedEventsCounter === 0) {
          done()
        }
      })

      let onConnectEmitter = () => {
        emitter.stream(room, event, 'data 1')
      }
      emitter = busFactory({name: 'emitter', id: 'emitter'}, onConnectEmitter)
    })

    it('should handshake an stream with default handler', (done) => {
      let emitter
      let checkTest = (data) => {
        expect(data).to.be.equal('data R')
        done()
      }
      let onConnectEmitter = () => {
        emitter.stream(room, event, 'data 1')
        let worker = busFactory({name: 'worker', id: 'worker'}, () => {
          emitter.stream(room, event, 'data 2')
          worker.streamJoin(channel, room, event, checkTest)
          setTimeout(() => {
            emitter.stream(room, event, 'data R')
          }, 50)
          emitter.stream(room, event, 'data R')
        })
      }
      emitter = busFactory({name: 'emitter', id: 'emitter'}, onConnectEmitter)
      emitter.stream(room, event, 'data 0')
    })

    it('should handshake an stream with custom handler', (done) => {
      let emitter
      let checkTest = (data) => {
        expect(data).to.be.equal('data Custom')
        done()
      }
      let onConnectEmitter = () => {
        emitter.stream(room, event, 'data 1')
        let worker = busFactory({name: 'worker', id: 'worker'}, () => {
          emitter.stream(room, event, 'data 2')
          worker.streamJoin(channel, room, event, checkTest)
        })
      }
      emitter = busFactory({
        name: 'emitter',
        id: 'emitter',
        serverListeners: {
          'streamJoinRequested': (socket, request) => {
            socket.join(request)
            emitter.stream(request, event, 'data Custom')
          }
        }
      }, onConnectEmitter)
      emitter.stream(room, event, 'data 0')
    })

    it('should start an stream when requested', (done) => {
      channel = 'emitter2'
      room = 'room2'
      event = 'event2'
      let onWorkerStreamJoined = (data) => {
        expect(data).to.be.equal('data J')
        done()
      }
      let emitter = busFactory({
        name: channel,
        id: 'emitter',
        serverListeners: {
          'streamJoinRequested': (socket, request) => {
            socket.join(request)
            emitter.stream(request, event, 'data J')
          },
          'streamCreateRequested': (socket, request) => {
            socket.join(request)
            emitter.stream(request, event, 'data C')
          }
        }
      }, () => {
        let worker = busFactory({name: 'worker', id: 'worker'}, () => {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined)
        })
      })
    })

    it('should start an stream when requested and echo any event sent', (done) => {
      channel = 'emitterEcho'
      room = 'roomEcho'
      event = 'echo'
      let worker
      let onWorkerStreamJoined = (data) => {
        if (data === 'Joined') {
          // Send message to emitter through room
          worker.emit({channel: channel, room: room, event: event, data: 'Hello'})
        } else if (data === 'Hello') {
          done()
        } else {
          fail(data)
        }
      }

      // Prepare emitter listeners
      let emitter = busFactory({
        name: channel,
        id: 'emitter',
        serverListeners: {
          'echo': (socket, request) => {
            emitter.stream(room, event, request)
          },
          'streamJoinRequested': (socket, request) => {
            socket.join(request)
            emitter.stream(request, event, 'Joined')
          }
        }
      }, () => {
        worker = busFactory({
          name: 'worker',
          id: 'worker'
        }, () => {
          // Request Stream creation and join
          worker.streamJoin(channel, room, event, onWorkerStreamJoined)
        })
      })
    })

    it('should reconnect an stream when emitter goes online again', (done) => {
      channel = 'emitterRec'
      room = 'roomRec'
      event = 'eventRec'
      let emitter
      let worker
      let emitterIsReconnecting
      let i = 0
      let emitterConfig = {
        name: channel,
        id: 'emitter',
        serverListeners: {
          'streamJoinRequested': (socket, request) => {
            socket.join(request)
            emitter.stream(request, event, 'data J' + i)
          }
        }
      }

      let checkTest = (data) => {
        expect(data).to.be.equal('data J0')
        if (emitterIsReconnecting) {
          done()
        }
        emitterIsReconnecting = true
        emitter.destroy()
        emitter = busFactory(emitterConfig, () => {
          emitter.stream(room, event, 'data J' + i++)
        })
      }

      emitter = busFactory(emitterConfig, () => {
        worker = busFactory({
          name: 'worker',
          id: 'worker',
          clientListeners: [
            {
              name: channel,
              event: 'connect',
              handler: () => {
                if (!emitterIsReconnecting) {
                  emitterIsReconnecting = true
                  worker.streamJoin(channel, room, event, checkTest)
                }
              }
            },
            {
              name: channel,
              event: 'disconnect',
              handler: () => {
                worker.streamLeave(channel, room)
              }
            }
          ]
        }, () => {
          emitter.stream(room, event, 'data I')
          worker.streamJoin(channel, room, event, checkTest)
        })
      })
    })

    it('should start a stream when a emitter connects', (done) => {
      channel = 'emitterRec2'
      room = 'roomRec2'
      event = 'eventRec2'
      let i = 0
      let checkTest = (data) => {
        expect(data).to.be.equal('data J' + i++)
        done()
      }
      let worker
      worker = busFactory({
        name: 'worker',
        id: 'worker',
        clientListeners: [
          {
            name: channel,
            event: 'connect',
            handler: () => {
              worker.streamJoin(channel, room, event, checkTest)
            }
          },
          {
            name: channel,
            event: 'disconnect',
            handler: () => {
              worker.streamLeave(channel, room)
            }
          }
        ]
      }, () => {
        worker.streamJoin(channel, room, event, checkTest)
        let emitter = busFactory({
          name: channel,
          id: 'emitter',
          serverListeners: {
            'streamJoinRequested': (socket, request) => {
              socket.join(request)
              emitter.stream(request, event, 'data J' + i++)
            },
            'streamCreateRequested': (socket, request) => {
              socket.join(request)
              emitter.stream(request, event, 'data C')
            }
          }
        }, () => {
          emitter.stream(room, event, 'data I')
        })
      })
    })
  })
})
