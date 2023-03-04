"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HapClient = void 0;
require("source-map-support/register");
const axios_1 = require("axios");
const crypto = require("crypto");
const decamelize = require("decamelize");
const inflection = require("inflection");
const bonjour_service_1 = require("bonjour-service");
const events_1 = require("events");
const hap_types_1 = require("./hap-types");
const uuid_1 = require("./uuid");
const monitor_1 = require("./monitor");
__exportStar(require("./interfaces"), exports);
class HapClient extends events_1.EventEmitter {
    constructor(opts) {
        super();
        this.bonjour = new bonjour_service_1.default();
        this.discoveryInProgress = false;
        this.instances = [];
        this.hiddenServices = [
            hap_types_1.Services.AccessoryInformation,
        ];
        this.hiddenCharacteristics = [
            hap_types_1.Characteristics.Name,
        ];
        this.pin = opts.pin;
        this.logger = opts.logger;
        this.debugEnabled = opts.config.debug;
        this.config = opts.config;
        this.startDiscovery();
    }
    debug(msg) {
        if (this.debugEnabled) {
            this.logger.log(msg);
        }
    }
    resetInstancePool() {
        if (this.discoveryInProgress) {
            this.browser.stop();
            this.debug(`[HapClient] Discovery :: Terminated`);
            this.discoveryInProgress = false;
        }
        this.instances = [];
        setTimeout(() => {
            this.refreshInstances();
        }, 6000);
    }
    refreshInstances() {
        if (!this.discoveryInProgress) {
            this.startDiscovery();
        }
        else {
            try {
                this.debug(`[HapClient] Discovery :: Re-broadcasting discovery query`);
                this.browser.update();
            }
            catch (e) { }
        }
    }
    async startDiscovery() {
        this.discoveryInProgress = true;
        this.browser = this.bonjour.find({
            type: 'hap',
        });
        this.browser.start();
        this.debug(`[HapClient] Discovery :: Started`);
        setTimeout(() => {
            this.browser.stop();
            this.debug(`[HapClient] Discovery :: Ended`);
            this.discoveryInProgress = false;
        }, 60000);
        this.browser.on('up', async (device) => {
            if (!device || !device.txt) {
                this.debug(`[HapClient] Discovery :: Ignoring device that contains no txt records. ${JSON.stringify(device)}`);
                return;
            }
            const instance = {
                name: device.txt.md,
                username: device.txt.id,
                ipAddress: null,
                port: device.port,
                services: [],
                connectionFailedCount: 0,
            };
            this.debug(`[HapClient] Discovery :: Found HAP device with username ${instance.username}`);
            const existingInstanceIndex = this.instances.findIndex(x => x.username === instance.username);
            if (existingInstanceIndex > -1) {
                if (this.instances[existingInstanceIndex].port !== instance.port ||
                    this.instances[existingInstanceIndex].name !== instance.name) {
                    this.instances[existingInstanceIndex].port = instance.port;
                    this.instances[existingInstanceIndex].name = instance.name;
                    this.debug(`[HapClient] Discovery :: [${this.instances[existingInstanceIndex].ipAddress}:${instance.port} ` +
                        `(${instance.username})] Instance Updated`);
                    this.emit('instance-discovered', instance);
                }
                return;
            }
            if (this.config.instanceBlacklist && this.config.instanceBlacklist.find(x => instance.username.toLowerCase() === x.toLowerCase())) {
                this.debug(`[HapClient] Discovery :: Instance with username ${instance.username} found in blacklist. Disregarding.`);
                return;
            }
            for (const ip of device.addresses) {
                if (ip.match(/^(?:(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])(\.(?!$)|$)){4}$/)) {
                    try {
                        this.debug(`[HapClient] Discovery :: Testing ${instance.username} via http://${ip}:${device.port}/accessories`);
                        const test = (await axios_1.default.get(`http://${ip}:${device.port}/accessories`, {
                            timeout: 10000,
                        })).data;
                        if (test.accessories) {
                            this.debug(`[HapClient] Discovery :: Success ${instance.username} via http://${ip}:${device.port}/accessories`);
                            instance.ipAddress = ip;
                        }
                        break;
                    }
                    catch (e) {
                        this.debug(`[HapClient] Discovery :: Failed ${instance.username} via http://${ip}:${device.port}/accessories`);
                        this.debug(`[HapClient] Discovery :: Failed ${instance.username} with error: ${e.message}`);
                    }
                }
            }
            if (instance.ipAddress && await this.checkInstanceConnection(instance)) {
                this.instances.push(instance);
                this.debug(`[HapClient] Discovery :: [${instance.ipAddress}:${instance.port} (${instance.username})] Instance Registered`);
                this.emit('instance-discovered', instance);
            }
            else {
                this.debug(`[HapClient] Discovery :: Could not register to device with username ${instance.username}`);
            }
        });
    }
    async checkInstanceConnection(instance) {
        try {
            await axios_1.default.put(`http://${instance.ipAddress}:${instance.port}/characteristics`, {
                characteristics: [{ aid: -1, iid: -1 }],
            }, {
                headers: {
                    Authorization: this.pin,
                },
            });
            return true;
        }
        catch (e) {
            this.debug(`[HapClient] Discovery :: [${instance.ipAddress}:${instance.port} (${instance.username})] returned an error while attempting connection: ${e.message}`);
            return false;
        }
    }
    async getAccessories() {
        if (!this.instances.length) {
            this.debug('[HapClient] Cannot load accessories. No Homebridge instances have been discovered.');
        }
        const accessories = [];
        for (const instance of this.instances) {
            try {
                const resp = (await axios_1.default.get(`http://${instance.ipAddress}:${instance.port}/accessories`)).data;
                instance.connectionFailedCount = 0;
                for (const accessory of resp.accessories) {
                    accessory.instance = instance;
                    accessories.push(accessory);
                }
            }
            catch (e) {
                if (this.logger) {
                    instance.connectionFailedCount++;
                    this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] Failed to connect`);
                    if (instance.connectionFailedCount > 5) {
                        const instanceIndex = this.instances.findIndex(x => x.username === instance.username && x.ipAddress === instance.ipAddress);
                        this.instances.splice(instanceIndex, 1);
                        this.debug(`[HapClient] [${instance.ipAddress}:${instance.port} (${instance.username})] Removed From Instance Pool`);
                    }
                }
            }
        }
        return accessories;
    }
    async monitorCharacteristics() {
        const services = await this.getAllServices();
        return new monitor_1.HapMonitor(this.logger, this.debug.bind(this), this.pin, services);
    }
    async getAllServices() {
        const accessories = await this.getAccessories();
        const services = [];
        accessories.forEach(accessory => {
            for (const service of accessory.services) {
                service.type = (0, uuid_1.toLongFormUUID)(service.type);
                for (const characteristic of service.characteristics) {
                    characteristic.type = (0, uuid_1.toLongFormUUID)(characteristic.type);
                }
            }
            const accessoryInformationService = accessory.services.find(x => x.type === hap_types_1.Services.AccessoryInformation);
            const accessoryInformation = {};
            if (accessoryInformationService && accessoryInformationService.characteristics) {
                accessoryInformationService.characteristics.forEach((c) => {
                    if (c.value) {
                        accessoryInformation[c.description] = c.value;
                    }
                });
            }
            accessory.services
                .filter((s) => this.hiddenServices.indexOf(s.type) < 0 && hap_types_1.Services[s.type])
                .map((s) => {
                let serviceName = s.characteristics.find(x => x.type === hap_types_1.Characteristics.Name);
                serviceName = serviceName ? serviceName : {
                    iid: 0,
                    type: hap_types_1.Characteristics.Name,
                    description: 'Name',
                    format: 'string',
                    value: accessoryInformation.Name || this.humanizeString(hap_types_1.Services[s.type]),
                    perms: ['pr'],
                    statusCode: 0,
                };
                const serviceCharacteristics = s.characteristics
                    .filter((c) => this.hiddenCharacteristics.indexOf(c.type) < 0 && hap_types_1.Characteristics[c.type])
                    .map((c) => {
                    return {
                        aid: accessory.aid,
                        iid: c.iid,
                        uuid: c.type,
                        type: hap_types_1.Characteristics[c.type],
                        serviceType: hap_types_1.Services[s.type],
                        serviceName: serviceName.value.toString(),
                        description: c.description,
                        value: c.value,
                        format: c.format,
                        perms: c.perms,
                        unit: c.unit,
                        maxValue: c.maxValue,
                        minValue: c.minValue,
                        minStep: c.minStep,
                        canRead: c.perms.includes('pr'),
                        canWrite: c.perms.includes('pw'),
                        ev: c.perms.includes('ev'),
                        statusCode: c.statusCode,
                    };
                });
                const service = {
                    aid: accessory.aid,
                    iid: s.iid,
                    uuid: s.type,
                    type: hap_types_1.Services[s.type],
                    humanType: this.humanizeString(hap_types_1.Services[s.type]),
                    serviceName: serviceName.value.toString(),
                    serviceCharacteristics,
                    accessoryInformation,
                    values: {},
                    linked: s.linked,
                    instance: accessory.instance,
                    category: accessory.category,
                };
                service.uniqueId = crypto.createHash('sha256')
                    .update(`${service.instance.username}${service.aid}${service.iid}${service.type}`)
                    .digest('hex');
                service.refreshCharacteristics = () => {
                    return this.refreshServiceCharacteristics.bind(this)(service);
                };
                service.setCharacteristic = (iid, value) => {
                    return this.setCharacteristic.bind(this)(service, iid, value);
                };
                service.getCharacteristic = (type) => {
                    return service.serviceCharacteristics.find(c => c.type === type);
                };
                service.serviceCharacteristics.forEach((c) => {
                    c.setValue = async (value) => {
                        return await this.setCharacteristic.bind(this)(service, c.iid, value);
                    };
                    c.getValue = async () => {
                        return await this.getCharacteristic.bind(this)(service, c.iid);
                    };
                    service.values[c.type] = c.value;
                });
                services.push(service);
            });
        });
        return services;
    }
    async getService(iid) {
        const services = await this.getAllServices();
        return services.find(x => x.iid === iid);
    }
    async getServiceByName(serviceName) {
        const services = await this.getAllServices();
        return services.find(x => x.serviceName === serviceName);
    }
    async refreshServiceCharacteristics(service) {
        try {
            const iids = service.serviceCharacteristics.map(c => c.iid);
            const resp = (await axios_1.default.get(`http://${service.instance.ipAddress}:${service.instance.port}/characteristics`, {
                params: {
                    id: iids.map(iid => `${service.aid}.${iid}`).join(','),
                }
            })).data;
            resp.characteristics.forEach((c) => {
                const characteristic = service.serviceCharacteristics.find(x => x.iid === c.iid && x.aid === service.aid);
                characteristic.value = c.value;
            });
        }
        catch (e) {
            this.debug(e);
            this.logger.log(`Failed to refresh characteristics for ${service.serviceName}: ${e.message}`);
        }
        return service;
    }
    async getCharacteristic(service, iid) {
        try {
            const resp = (await axios_1.default.get(`http://${service.instance.ipAddress}:${service.instance.port}/characteristics`, {
                params: {
                    id: `${service.aid}.${iid}`,
                },
            })).data;
            const characteristic = service.serviceCharacteristics.find(x => x.iid === resp.characteristics[0].iid && x.aid === service.aid);
            characteristic.value = resp.characteristics[0].value;
            return characteristic;
        }
        catch (e) {
            this.debug(e);
            this.logger.log(`Failed to get characteristics for ${service.serviceName} with iid ${iid}: ${e.message}`);
        }
    }
    async setCharacteristic(service, iid, value) {
        try {
            await axios_1.default.put(`http://${service.instance.ipAddress}:${service.instance.port}/characteristics`, {
                characteristics: [
                    {
                        aid: service.aid,
                        iid,
                        value,
                    },
                ],
            }, {
                headers: {
                    Authorization: this.pin,
                },
            });
            return this.getCharacteristic(service, iid);
        }
        catch (e) {
            if (this.logger) {
                this.logger.error(`[HapClient] [${service.instance.ipAddress}:${service.instance.port} (${service.instance.username})] ` +
                    `Failed to set value for ${service.serviceName}.`);
                if (e.response && e.response.status === 470 || e.response.status === 401) {
                    this.logger.warn(`[HapClient] [${service.instance.ipAddress}:${service.instance.port} (${service.instance.username})] ` +
                        `Make sure Homebridge pin for this instance is set to ${this.pin}.`);
                    throw new Error(`Failed to control accessory. Make sure the Homebridge pin for ${service.instance.ipAddress}:${service.instance.port} ` +
                        `is set to ${this.pin}.`);
                }
                else {
                    this.logger.error(e.message);
                    throw new Error(`Failed to control accessory: ${e.message}`);
                }
            }
            else {
                console.log(e);
            }
        }
    }
    humanizeString(string) {
        return inflection.titleize(decamelize(string));
    }
}
exports.HapClient = HapClient;
//# sourceMappingURL=index.js.map