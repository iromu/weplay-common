/* eslint-disable*/

const path = require('path')
const fps = require('fps')

const EventBus = require('../').EventBus
const debug = require('debug')('weplay:worker')


const saveIntervalDelay = process.env.WEPLAY_SAVE_INTERVAL || 60000
const destroyEmuTimeoutDelay = 10000

class ImageService {

  constructor(discoveryUrl, discoveryPort) {
    this.uuid = require('node-uuid').v4()
    this.logger = require('../').logger('ImageService', this.uuid)
    this.name = 'image'
    this.emu = null
    this.romState = null
    this.romHash = null
    this.romData = null

    this.ticker = fps({every: 200})
    this.ticker.on('data', framerate => {
      this.logger.info('[%s] ImageService[%s] fps %s', this.name, this.uuid, Math.floor(framerate))
    })
    this.bus = new EventBus({
      url: discoveryUrl,
      port: discoveryPort,
      name: this.name,
      id: this.uuid,
      serverListeners: {
        'streamJoinRequested': (socket, request)=> {
          if (true || this.romHash === request) {
            this.logger.info('[%s] ImageService.streamJoinRequested', this.name, {
              uuid: this.uuid,
              socket: socket.id,
              request: JSON.stringify(request)
            })
            socket.join(this.romHash)
          } else {
            this.logger.error('ImageService.streamJoinRequested', {
              socket: socket.id,
              request: JSON.stringify(request)
            })
          }
        }

      },
      clientListeners: [
        //{name: 'rom', event: 'connect', handler: this.onRomConnect.bind(this)},
        //{name: 'rom', event: 'disconnect', handler: this.onRomDisconnect.bind(this)},
        {name: 'rom', event: 'data', handler: this.onRomData.bind(this)},
        {name: 'rom', event: 'hash', handler: this.onRomHash.bind(this)},
        {name: 'rom', event: 'state', handler: this.onRomState.bind(this)}]
    }, () => {
      this.logger.info('ImageService connected to discovery server', {
        discoveryUrl: discoveryUrl,
        uuid: this.uuid
      })
      this.init()
    })
  }

  init() {
    this.destroy()
    this.logger.info('ImageService init()')
    this.bus.emit('store', 'query')
  }

  shouldStart() {
    if (this.romHash && (this.romState || this.romData)) {
      this.start()
    }
  }

  digest(state) {
    var md5 = crypto.createHash('md5')
    return md5.update(state).digest('hex')
  }

  start() {
    this.logger.debug('loading emulator')
  }

  unload(force) {
    if (this.saveInterval) {
      clearInterval(this.saveInterval)
      this.saveInterval = undefined
    }

    if (force) {
      if (this.destroyEmuTimeout) {
        clearTimeout(this.destroyEmuTimeout)
        this.destroyEmuTimeout = undefined
        this.saveState()
        logger.debug('destroy emulator')
        if (this.emu) {
          this.emu.destroy()
          this.emu = undefined
        }
      }
    } else if (!this.destroyEmuTimeout) {
      this.saveState()
      this.destroyEmuTimeout = setTimeout(() => {
        logger.debug('destroy emulator')
        if (this.emu) {
          this.emu.destroy()
          this.emu = undefined
        }
        clearTimeout(this.destroyEmuTimeout)
        this.destroyEmuTimeout = undefined
      }, destroyEmuTimeoutDelay)
    }
    this.romHash = null
    this.romState = null
    this.romData = null
  }

  sendFrame(frame) {
    this.ticker.tick()
    //this.logger.debug('sendFrame')
    this.bus.stream(this.romHash, 'frame', frame)
    //this.bus.emit('compressor', 'frame', {hash: this.romHash, frame: frame})
  }

  saveState() {
    if (this.emu) {
      const snap = this.emu.snapshot()
      if (snap) {
        const pack = msgpack.pack(snap)
        this.romState = pack
        this.bus.emit('rom', 'state', pack)
        this.logger.info(`> state ${this.romHash}`, this.digest(this.romState))
      }
    }
  }

  // ROM Service Listeners

  onRomConnect() {
    this.logger.info('onRomConnect')
    this.romDisconnected = false
    this.bus.emit('rom', 'request')
  }

  onRomDisconnect() {
    this.romDisconnected = true
    this.logger.info('onRomDisconnect')
    this.bus.emit('rom', 'request')
  }

  onRomData(data) {
    const newRomHash = this.digest(data)
    this.logger.info('onRomData', {romHash: newRomHash})
    if (!this.romData || !this.romHash === newRomHash) {
      this.romData = data
      this.shouldStart()
    }
  }

  onRomState(state) {
    this.logger.info('onRomState', {romHash: this.romHash})
    this.romState = state
    this.shouldStart()
  }

  onRomHash(hashData) {
    this.logger.info('ImageService.onRomHash', hashData)
    if (!this.romHash || !this.romHash === hashData.hash) {
      this.romHash = hashData.hash
      this.shouldStart()
    }
  }

  destroy() {
    if (this.destroyEmuTimeout) {
      clearTimeout(this.destroyEmuTimeout)
      this.destroyEmuTimeout = undefined
    }
    this.unload(true)
  }
}
module.exports = ImageService
