const logger = require('./').logger('common-eventbroker');

class EventBroker {

    constructor(discoveryClient, clientListeners) {
        this.subscriptions = {};
        this._services = [];
        this.queue = {};

        this.discoveryClient = discoveryClient;
        this.clientListeners = clientListeners;
    }

    subscribeService(service) {
        const serviceLog = {
            name: service.name,
            id: service.id,
            ip: service.ip,
            scheme: service.scheme,
            port: service.port
        };
        logger.debug('EventBroker adding local service ', serviceLog);

        const url = `${service.scheme}://${service.ip}:${service.port}`;
        logger.debug('EventBroker connecting local service ', serviceLog);
        service.socket = require('socket.io-client')(url);

        service.socket.on('connect', ()=> {
            logger.info('Connected to peer', {
                url: url
            });
            if (service.disconnected) {
                logger.debug('>> connect', serviceLog);
                //service.listeners = this.clientListeners.filter(l=>l.name === service.name);
                //service.listeners.forEach(listener=> {
                //    logger.debug('EventBroker on service ', {
                //        event: listener.event
                //    });
                //    service.socket.on(listener.event, listener.handler);
                //});
            } else {
                logger.debug('> connect', serviceLog);
            }
            //service.socket.emit('connect', serviceLog);
        });

        service.socket.on('disconnect', () => {
            logger.info('x disconnected from', service.name);
            service.disconnected = true;
        });

        if (!service.emit) {
            service.emit = function (_event, _args) {
                service.socket.emit(_event, _args);
            };
        }


        if (!service.on) {
            service.on = function (_event, _args) {
                service.socket.on(_event, _args);
            };
        }

        service.listeners = this.clientListeners.filter(l=>l.name === service.name);
        service.listeners.forEach(listener=> {
            logger.debug('EventBroker on service ', {
                event: listener.event
            });
            service.socket.on(listener.event, listener.handler);
        });


        this._services.push(service);

        if (this.queue[service.name]) {
            this.queue[service.name].emit.forEach(command=> {
                service.emit(command.event, command.data);
            });
            this.queue[service.name].on.forEach(command=> {
                service.on(command.event, command.data);
            });
            this.queue[service.name].emit = [];
            this.queue[service.name].on = [];
        }
    }

    getService(serviceName) {
        var service = this._services.filter(service=>service.name === serviceName)[0];
        if (!service && !this.queue[serviceName]) {
            this.queue[serviceName] = {emit: [], on: []};
            this.discoveryClient.emit('discover', serviceName);
            this.discoveryClient.subscribe('service', (service)=> {
                this.subscribeService(service);
            });
        } else {
            return service;
        }
    }

    emit(channel, event, data) {
        var service = this.getService(channel);
        if (!service) {
            this.queue[channel].emit.push({event: event, data: data});
        } else {
            service.emit(event, data);
        }
    }

    on(channel, event, callback) {
        var service = this.getService(channel);
        if (!service) {
            this.queue[channel].on.push({event: event, callback: callback});
        } else {
            service.on(event, callback);
        }
    }
}

module.exports = EventBroker;