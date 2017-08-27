/* eslint-disable*/

const uuid = require('uuid/v1')()
const logger = require('../src').LoggerFactory.get('compressor-service', uuid)
const EventBus = require('../src').EventBus
const fps = require('fps');

class CompressorService {

  constructor(discoveryUrl, discoveryPort) {
    this.uuid = require('uuid/v1')()
    this.pngquant = undefined;
    this.failures = 0;
    this.romHash = undefined;
    this.ticker = fps({every: 200});
    this.ticker.on('data', framerate => {
      logger.info('CompressorService[%s] fps %s', uuid, framerate);
    });
    this.bus = new EventBus({
      url: discoveryUrl,
      port: discoveryPort,
      name: 'compressor',
      id: this.uuid,
      serverListeners: {
        //'frame': this.onRawFrame.bind(this),
        'streamJoinRequested': this.streamJoinRequested.bind(this),
        'streamCreateRequested': this.streamJoinRequested.bind(this)
      },
      clientListeners: [
        {name: 'game', event: 'join', handler: this.onGameJoin.bind(this)}
      ]
    }, ()=> {
      logger.info('CompressorService connected to discovery server', {
        discoveryUrl: discoveryUrl,
        uuid: this.uuid
      });
      this.init();
    });
  }

  init() {
    try {
      this.initiated = true;
      this.romHash = null;
      console.log('pngquant loaded');
      logger.info('CompressorService waiting for incoming users.');
      if (this.initHandler)this.initHandler(this.bus);
    } catch (e) {
      logger.error(e);
    }
  }

  onInit(handler) {
    this.initHandler = handler;
    if (this.initiated)this.initHandler(this.bus);
  }

  onRawFrame(frame) {
    if (this.pngquant && this.failures < 3) {
      try {
        const resBuffer = this.pngquant.compress(frame);
        this.sendFrame(resBuffer);
      } catch (e) {
        this.failures++;
        this.sendFrame(frame);
      }
    } else {
      this.sendFrame(frame);
    }
  }

  onGameJoin(socket, user) {
    logger.info('onGameJoin. Choose me !!!!', user);
    //{nick: socket.nick, hash: hash, clientId: clientId}

    // Given the user.hash selection,
    // Then return where it should listen for incoming frames

    socket.emit('frame:location', this.uuid);
  }

  streamJoinRequested(socket, request) {
    if (!this.romHash || this.romHash === request) {
      logger.info('CompressorService.streamJoinRequested', {
        socket: socket.id,
        request: JSON.stringify(request)
      });
      this.romHash = request;
      socket.join(this.romHash);
      // Locate a raw frame stream supplier
      // channel, room, event, listener
      this.bus.streamJoin('emu', this.romHash, 'frame' + this.romHash, this.onRawFrame.bind(this))
    } else {
      logger.error('EmulatorService.streamJoinRequested. Ignoring request for a new stream.', {
        socket: socket.id,
        request: JSON.stringify(request)
      });
    }
  }

  sendFrame(frame) {
    this.ticker.tick();
    this.bus.stream(this.romHash, 'frame' + this.romHash, frame)
  }

  destroy() {
  }
}

module.exports = CompressorService;
