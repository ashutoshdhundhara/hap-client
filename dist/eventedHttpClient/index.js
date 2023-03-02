"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConnection = exports.parseMessage = void 0;
const net = require("net");
const url = require("url");
const httpParser_1 = require(".//httpParser");
exports.parseMessage = httpParser_1.default;
function createConnection(instance, pin, body) {
    const client = net.createConnection({
        host: instance.ipAddress,
        port: instance.port,
    });
    client.write(_buildMessage({
        method: 'PUT',
        url: 'http://' + instance.ipAddress + ':' + instance.port + '/characteristics',
        maxAttempts: 1,
        headers: {
            'Content-Type': 'Application/json',
            'authorization': pin,
            'connection': 'keep-alive',
        },
        body: JSON.stringify(body),
    }));
    return client;
}
exports.createConnection = createConnection;
function _headersToString(headers) {
    let response = '';
    for (const header of Object.keys(headers)) {
        response = response + header + ': ' + headers[header] + '\r\n';
    }
    return (response);
}
function _buildMessage(request) {
    const context = url.parse(request.url);
    let message;
    message = request.method + ' ' + context.pathname;
    if (context.search) {
        message = message + context.search;
    }
    message = message + ' HTTP/1.1\r\nHost: ' + context.host + '\r\n' + _headersToString(request.headers);
    if (request.body) {
        message = message + 'Content-Length: ' + request.body.length + '\r\n\r\n' + request.body + '\r\n\r\n';
    }
    else {
        message = message + '\r\n\r\n';
    }
    return (message);
}
//# sourceMappingURL=index.js.map