/// <reference types="node" />
import 'source-map-support/register';
import { EventEmitter } from 'events';
import { HapMonitor } from './monitor';
import { ServiceType, CharacteristicType } from './interfaces';
export * from './interfaces';
export declare class HapClient extends EventEmitter {
    private bonjour;
    private browser;
    private discoveryInProgress;
    private logger;
    private pin;
    private debugEnabled;
    private config;
    private instances;
    private hiddenServices;
    private hiddenCharacteristics;
    constructor(opts: {
        pin: string;
        logger?: any;
        config: any;
    });
    debug(msg: any): void;
    resetInstancePool(): void;
    refreshInstances(): void;
    private startDiscovery;
    private checkInstanceConnection;
    private getAccessories;
    monitorCharacteristics(): Promise<HapMonitor>;
    getAllServices(): Promise<ServiceType[]>;
    getService(iid: number): Promise<ServiceType>;
    getServiceByName(serviceName: string): Promise<ServiceType>;
    refreshServiceCharacteristics(service: ServiceType): Promise<ServiceType>;
    getCharacteristic(service: ServiceType, iid: number): Promise<CharacteristicType>;
    setCharacteristic(service: ServiceType, iid: number, value: number | string | boolean): Promise<CharacteristicType>;
    private humanizeString;
}
