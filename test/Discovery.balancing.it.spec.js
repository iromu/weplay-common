/* eslint-disable no-undef */
'use strict'

let ports = require('./common.spec')

process.env.NODE_ENV = 'test'
const uuidv1 = require('uuid/v1')
const EventBus = require('../src/eventbus')
const Discovery = require('../src/discovery')

let serviceCleanup = []
let discovery
let discoveryPort = ports.pop()
const discoveryUrl = 'http://localhost:' + discoveryPort

describe('Discovery Load Balancing', () => {
  beforeEach((done) => {
    discovery = new Discovery().server({name: 'discovery', port: discoveryPort}, done)
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
    let channel = 'emitter' + uuidv1()
    let room = 'room1' + uuidv1()
    let room2 = 'room2' + uuidv1()
    let room3 = 'room3' + uuidv1()
    let event = 'event1' + uuidv1()

    beforeEach(() => {
      channel = 'emitter' + uuidv1()
      room = 'room1-' + uuidv1()
      room2 = 'room2-' + uuidv1()
      room3 = 'room3-' + uuidv1()
      event = 'event1-' + uuidv1()
    })

    afterEach((done) => {
      serviceCleanup.forEach((clean) => {
        clean()
      })
      serviceCleanup = []
      done()
    })

    it('should start 2 streams at 2 emitters, when requested', (done) => {
      let worker = busFactory({name: 'worker', id: 'worker'}, () => {
      })

      let onWorkerStreamJoined = (data) => {
        expect(data).to.be.equal('data from second emitter to register ' + room)
        worker.streamJoin(channel, room2, event, onWorkerStreamJoined2)
      }
      let onWorkerStreamJoined2 = (data) => {
        expect(data).to.be.equal('data from first emitter to register ' + room2)
        done()
      }

      let emitter2 = busFactory({
        name: channel,
        id: 'emitterA',
        serverListeners: {
          'streamJoinRequested': (socket, request) => {
            socket.join(room2)
            emitter2.stream(room2, event, 'data from first emitter to register ' + room2)
          }
        }
      }, () => {
        emitter2.stream(room2, event, 'data from first emitter to register ' + room2)
        let emitter = busFactory({
          name: channel,
          id: 'emitterB',
          serverListeners: {
            'streamJoinRequested': (socket, request) => {
              socket.join(request)
              emitter.stream(room, event, 'data from second emitter to register ' + room)
            }
          }
        }, () => {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined)
        })
      })
    })

    it('should start only 2 stream when requested, rejecting new ones', (done) => {
      let emitter1Request = null
      let emitter2Request = null

      let clientListeners = [{
        name: channel,
        event: 'streamRejected',
        handler: (data) => {
          expect(data).to.be.equal(room3)
          done()
        }
      }]
      let worker = busFactory({name: 'worker', id: 'worker', clientListeners: clientListeners})
      let onWorkerStreamJoined = (data) => {
        expect(data).to.be.equal('data ' + room)
        worker.streamJoin(channel, room2, event, onWorkerStreamJoined2)
      }
      let onWorkerStreamJoined2 = (data) => {
        expect(data).to.be.equal('data ' + room2)
        worker.streamJoin(channel, room3, event, onWorkerStreamJoined3)
      }
      let onWorkerStreamJoined3 = (data) => {
        expect(data).to.not.be.equal('data ' + room3)
      }

      let emitter2 = busFactory({
        name: channel,
        id: 'emitter2',
        serverListeners: {
          'streamJoinRequested': (socket, request) => {
            if (!emitter2Request) {
              emitter2Request = request
              socket.join(request)
              emitter2.stream(request, event, 'data ' + request)
            } else {
              socket.emit('streamRejected', request)
              emitter2.stream(request, event, 'rejected ' + request)
            }
          }
        }
      }, () => {
        let emitter = busFactory({
          name: channel,
          id: 'emitter1',
          serverListeners: {
            'streamJoinRequested': (socket, request) => {
              if (!emitter1Request) {
                emitter1Request = request
                socket.join(request)
                emitter.stream(request, event, 'data ' + request)
              } else {
                socket.emit('streamRejected', request)
                emitter.stream(request, event, 'rejected ' + request)
              }
            }
          }
        }, () => {
          worker.streamJoin(channel, room, event, onWorkerStreamJoined)
        })
      })
    })
  })
})
