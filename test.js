/* eslint-disable*/

process.title = 'weplay-discovery-test';
process.env.NODE_ENV = 'development';

const crypto = require('crypto');
const uuid = require('node-uuid').v4();
const restify = require('restify');

const logger = require('./').logger('discovery-test', uuid);
const Discovery = require('./').Discovery;
const CompressorService = require('./test/CompressorService');
const ImageService = require('./test/ImageService');
const StoreService = require('./test/StoreService');

logger.info('[%s] DiscoveryTest setting up', 'Discovery');


// ports used in this test
var latestPort = 40000;
var ports = Array.from({length: 100}, () => latestPort++);

var discoveryPort = ports.pop();
const discoveryUrl = 'http://localhost:' + discoveryPort;
var serviceCleanup = [];

function createServices() {
  const compressor = new CompressorService(discoveryUrl, ports.pop());
  serviceCleanup.push(compressor.destroy.bind(compressor));

  const image = new ImageService(discoveryUrl, ports.pop());
  const image2 = new ImageService(discoveryUrl, ports.pop());
  serviceCleanup.push(image.destroy.bind(image));
  serviceCleanup.push(image2.destroy.bind(image2));

  const store = new StoreService(discoveryUrl, ports.pop());
  serviceCleanup.push(store.destroy.bind(store));

// Tear down
  require('./').cleanup(()=> {
    serviceCleanup.forEach((clean) => {
      clean();
    });
  });

  compressor.onInit((bus)=> {
    logger.info('compressor.onInit. Requesting stream');
    // request streamjoin
    // channel, room, event, listener
    bus.streamJoin('image', 'testRoomBinary', 'frame', ()=> {
      logger.info('compressor.onInit streamJoin handler called.');
    });
  });
}

const discovery = new Discovery().server({name: 'Discovery', port: discoveryPort}, createServices);

function lookup(req, res, next) {
  res.send(discovery.lookup().map(service=> {
    if (service.events) {
      const events = service.events.map(e=> {
        return (e.room) ? e.event + '#' + e.room : e.event;
      });
      const streams = service.events.filter(e=>e.room).map(e=> {
        return e.room;
      });
      return {
        name: service.name,
        id: service.id,
        version: service.version,
        events: events,
        streams: streams,
        depends: service.depends
      };
    }
    else {
      return {name: service.name, id: service.id, version: service.version};
    }
  }).sort(function (a, b) {
    return a.name > b.name;
  }));
  next();
}

var server = restify.createServer({
  formatters: {
    'application/json': function (req, res, body, cb) {
      return cb(null, JSON.stringify(body, null, '\t'));
    }
  }
});

server.pre(restify.pre.userAgentConnection());

server.get('/lookup', lookup);
server.head('/lookup', lookup);

server.listen(8088, function () {
  logger.info('[%s] Restify listening at %s', discovery.name, server.url);
});
serviceCleanup.push(discovery.destroy.bind(discovery));
