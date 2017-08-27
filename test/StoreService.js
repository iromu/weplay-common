/* eslint-disable*/

const EventBus = require('../').EventBus

class StoreService {
  constructor(discoveryUrl, discoveryPort) {
    this.uuid = require('uuid/v1')()
    this.logger = require('../').LoggerFactory.get('StoreService', this.uuid)

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
