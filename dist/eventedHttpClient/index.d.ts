/// <reference types="node" />
import * as net from 'net';
import httpMessageParser from './/httpParser';
export declare const parseMessage: typeof httpMessageParser;
export declare function createConnection(instance: any, pin: string, body: any): net.Socket;
