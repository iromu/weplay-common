const Server = require('./DiscoveryServer')
const Client = require('./DiscoveryClient')

class Discovery {
  server(options, cb) {
    this.server = new Server(options, cb)
    return this.server
  }

  client(options, cb) {
    this.client = new Client(options, cb)
    return this.client
  }

  destroy() {
    this.server.destroy()
    this.client.destroy()
  }
}

module.exports = Discovery
