const logger = require('./').logger('common-discovery');
const forwarded = require('forwarded-for');

class Discovery {

    constructor() {
    }

    server(port, listeners, cb) {
        return new Server(port, listeners, cb);
    }

    client(options, cb) {
        return new Client(options, cb);
    }


    destroy() {

    }
}

class Server {
    constructor(port, listeners, cb) {
        var sio = require('socket.io');
        this.io = sio();
        this._services = [];
        this.listeners = listeners;
        this.io.on('connection', socket => {

            logger.debug('+ connection', socket.id);
            const req = socket.request;
            const ip = forwarded(req, req.headers).ip.split(':').pop();
            var service = {};

            for (var event in listeners) {
                if (this.listeners.hasOwnProperty(event)) {
                    const handler = this.listeners[event];
                    logger.debug('adding listener to event', event);
                    this.subscribe(socket, event, handler);
                }
            }
            socket.on('disconnect', ()=> {
                logger.debug('x disconnect', service);
                this._services = this._services.filter(s=>s.id !== service.id);
            });

            const onRegister = _service => {
                service = {
                    name: _service.name,
                    id: _service.id,
                    ip: ip,
                    scheme: 'http',
                    port: _service.port
                };
                logger.debug('< register', service);
                this._services.push(service);
            };

            socket.on('register', onRegister);

            const onAnnounce = _service => {
                var eventData = {
                    name: _service.name,
                    id: _service.id,
                    ip: ip,
                    scheme: 'http',
                    port: _service.port,
                    event: _service.event
                };
                logger.debug('< announce', eventData);

                var discovered = this._services.filter(service=>service.id === _service.id)[0];
                if (!discovered) {
                    logger.debug('< adding missing register', eventData);
                    onRegister(_service);
                }

                if (!discovered.events) {
                    discovered.events = [];
                }
                discovered.events.push(eventData);
            };

            socket.on('announce', onAnnounce);

            const onDiscover = serviceName => {
                logger.debug('< discover', {requested: serviceName, by: service.name, id: service.id});
                const discovered = this._services.filter(service=>service.name === serviceName)[0];
                if (discovered) {
                    logger.debug('> service', discovered);
                    socket.emit('service', {
                        id: discovered.id,
                        name: discovered.name,
                        ip: discovered.ip,
                        scheme: discovered.scheme,
                        port: discovered.port
                    });
                }
            };
            socket.on('discover', onDiscover);
        });
        this.io.listen(port);
        if (cb) {
            cb();
        }
    }

    subscribe(socket, event, listener) {
        logger.debug('Server < event', event);
        socket.on(event, function (data) {
            listener(socket, data);
        });
    }

    to(room) {
        return this.io.to(room);
    }

    lookup(options) {
        if (options) {
            return this._services;
        }
        else {
            return this._services;
        }
    }

    destroy() {
    }
}

class Client {
    constructor(options, _onConnect) {
        this.socket = require('socket.io-client')(options.url);
        this.server = new Discovery().server(options.port, options.serverListeners, ()=> {
            logger.info('Discovery Client Service listening', {name: options.name, port: options.port});
        });

        this.uuid = options.uuid;
        const logInfo = {
            service: {name: options.name, id: options.id},
            registry: options.url
        };
        this.socket.on('connect', ()=> {

            if (this.disconnected) {
                logger.debug('>> discovery client registering after disconnection', logInfo);
            } else {
                logger.debug('> discovery client registering', logInfo);
            }
            this.socket.emit('register', {name: options.name, id: options.id, port: options.port});
            for (var event in options.serverListeners) {
                if (options.serverListeners.hasOwnProperty(event)) {
                    this.socket.emit('announce', {
                        name: options.name,
                        id: options.id,
                        port: options.port,
                        event: event
                    });
                }
            }
            if (_onConnect) {
                _onConnect();
            }
        });

        this.socket.on('disconnect', () => {
            logger.info('x disconnected from Discovery', options.url);
            this.disconnected = true;
        });
    }

    subscribe(event, listener) {
        logger.debug('+ discovery client subscribe()', {event: event});
        this.socket.on(event, function (data) {
            listener(data);
        });
    }

    emit(...args) {
        this.socket.emit.apply(this.socket, args);
    }

    publish(room, event, data) {
        //TODO notify Discovery Server of stream live
        this.server.to(room).emit(`${room}:${event}`, data);
    }
}

module.exports = Discovery;