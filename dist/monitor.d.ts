/// <reference types="node" />
import { EventEmitter } from 'events';
import { ServiceType } from './interfaces';
export declare class HapMonitor extends EventEmitter {
    private pin;
    private evInstances;
    private services;
    private logger;
    private debug;
    constructor(logger: any, debug: any, pin: string, services: ServiceType[]);
    start(): void;
    finish(): void;
    parseServices(): void;
}
