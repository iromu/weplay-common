import ports from './common.spec'
import uuidv1 from 'uuid/v1'
import EventBus from '../src/eventbus'
import Discovery from '../src/discovery'

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

  describe('onStreaming', () => {
    let channel = `emitter${uuidv1()}`
    let room = `room1${uuidv1()}`
    let event = `event1${uuidv1()}`
    beforeEach(() => {
      channel = `emitter${uuidv1()}`
      room = `room1${uuidv1()}`
      event = `event1${uuidv1()}`
    })
    afterEach((done) => {
      serviceCleanup.forEach((clean) => {
        clean()
      })
      serviceCleanup = []
      done()
    })
    it('should announce stream events', (done) => {
      let emitter
      let expectedEvents = [{event: 'streamJoinRequested', room}, {event, room}]
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
      emitter = busFactory({name: channel, id: channel}, onConnectEmitter)
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
      emitter = busFactory({name: channel, id: channel}, onConnectEmitter)
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
        name: channel,
        id: channel,
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
          worker.emit({channel, room, event, data: 'Hello'})
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
            emitter.stream(request, event, `data J${i}`)
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
          emitter.stream(room, event, `data J${i++}`)
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
        expect(data).to.be.equal(`data J${i++}`)
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
              // worker.streamLeave(channel, room)
            }
          }
        ]
      }, () => {
        worker.streamJoin(channel, room, event, checkTest)
        let emitter = busFactory({
          name: channel,
          id: channel,
          serverListeners: {
            'streamJoinRequested': (socket, request) => {
              socket.join(request)
              emitter.stream(request, event, `data J${i++}`)
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
