/* eslint-disable*/

const EventBus = require('../').EventBus

class StoreService {
  constructor(discoveryUrl, discoveryPort) {
    this.uuid = require('node-uuid').v4()
    this.logger = require('../').logger('StoreService', this.uuid)

    const listeners = {
      'query': (socket, request) => {
        socket.emit('response', request)
      }
    }

    this.bus = new EventBus({
      url: discoveryUrl,
      port: discoveryPort,
      name: 'store',
      id: this.uuid,
      serverListeners: listeners
    })
  }

  destroy() {
  }
}

module.exports = StoreService
