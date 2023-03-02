/// <reference types="node" />
declare function httpMessageParser(message: any): {
    protocol: any;
    httpVersion: any;
    statusCode: any;
    statusMessage: any;
    method: any;
    url: any;
    headers: any;
    body: any;
    boundary: any;
    multipart: any;
    additional: any;
};
declare namespace httpMessageParser {
    var _isTruthy: (v: any) => boolean;
    var _isNumeric: (v: any) => boolean;
    var _isBuffer: (item: any) => any;
    var _isNodeBufferSupported: () => boolean;
    var _parseHeaders: (body: any) => {};
    var _requestLineRegex: RegExp;
    var _responseLineRegex: RegExp;
    var _headerNewlineRegex: RegExp;
    var _boundaryRegex: RegExp;
    var _createBuffer: (data: any) => Buffer;
}
export default httpMessageParser;
