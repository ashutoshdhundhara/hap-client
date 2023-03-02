"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HapMonitor = void 0;
const events_1 = require("events");
const eventedHttpClient_1 = require("./eventedHttpClient");
class HapMonitor extends events_1.EventEmitter {
    constructor(logger, debug, pin, services) {
        super();
        this.logger = logger;
        this.debug = debug;
        this.pin = pin;
        this.services = services;
        this.evInstances = [];
        this.parseServices();
        this.start();
    }
    start() {
        for (const instance of this.evInstances) {
            instance.socket = (0, eventedHttpClient_1.createConnection)(instance, this.pin, { characteristics: instance.evCharacteristics });
            this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] Connected`);
            instance.socket.on('data', (data) => {
                const message = (0, eventedHttpClient_1.parseMessage)(data);
                if (message.statusCode === 401) {
                    if (this.logger) {
                        this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] ` +
                            `${message.statusCode} ${message.statusMessage} - make sure Homebridge pin for this instance is set to ${this.pin}.`);
                    }
                }
                if (message.protocol === 'EVENT') {
                    try {
                        const body = JSON.parse(message.body);
                        if (body.characteristics && body.characteristics.length) {
                            this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] ` +
                                `Got Event: ${JSON.stringify(body.characteristics)}`);
                            const response = body.characteristics.map((c) => {
                                const services = this.services.filter(x => x.aid === c.aid && x.instance.username === instance.username);
                                const service = services.find(x => x.serviceCharacteristics.find(y => y.iid === c.iid));
                                if (service) {
                                    const characteristic = service.serviceCharacteristics.find(x => x.iid === c.iid);
                                    if (characteristic) {
                                        characteristic.value = c.value;
                                        service.values[characteristic.type] = c.value;
                                        return service;
                                    }
                                }
                            });
                            this.emit('service-update', response.filter(x => x));
                        }
                    }
                    catch (e) {
                    }
                }
            });
        }
    }
    finish() {
        for (const instance of this.evInstances) {
            if (instance.socket) {
                try {
                    instance.socket.destroy();
                    this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] Disconnected`);
                }
                catch (e) {
                }
            }
        }
    }
    parseServices() {
        for (const service of this.services) {
            const evCharacteristics = service.serviceCharacteristics.filter(x => x.perms.includes('ev'));
            if (evCharacteristics.length) {
                if (!this.evInstances.find(x => x.username === service.instance.username)) {
                    const newInstance = Object.assign({}, service.instance);
                    newInstance.evCharacteristics = [];
                    this.evInstances.push(newInstance);
                }
                const instance = this.evInstances.find(x => x.username === service.instance.username);
                for (const evCharacteristic of evCharacteristics) {
                    if (!instance.evCharacteristics.find(x => x.aid === service.aid && x.iid === evCharacteristic.iid)) {
                        instance.evCharacteristics.push({ aid: service.aid, iid: evCharacteristic.iid, ev: true });
                    }
                }
            }
        }
    }
}
exports.HapMonitor = HapMonitor;
//# sourceMappingURL=monitor.js.map