const { EventEmitter } = require('events');

const { bufferBodyHandler } = require('../lib/Server/handlers/bufferBodyHandler.js');

describe('handlers', () => {
  it('bufferBodyHandler', () => {
    expect.assertions(1);
    const mockStream = new EventEmitter();
    const mockHeaders = {};
    const mockParams = {};
    const mockNext = () => {
      console.error('MockNextShouldntFire');
    };
    const mockHandler = (stream, headers, params, next) => {
      expect(params.body).toEqual('buffered long body');
    };
    const newHandler = bufferBodyHandler(mockHandler);
    newHandler(mockStream, mockHeaders, mockParams, mockNext);
    mockStream.emit('data', 'buffered ');
    mockStream.emit('data', 'long ');
    mockStream.emit('data', 'body');
    mockStream.emit('end');
  });
});
