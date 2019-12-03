const http2 = require('http2');
const {Branch} = require('@forge-io/branch');
const {bufferBodyHandler} = require('./bufferBodyHandler.js');

/**
 * Handler Function
 * @typedef {function} SimpleH2Handler
 * @param {HTTP2Stream} stream {@link https://nodejs.org/docs/latest-v12.x/api/http2.html#http2_class_http2stream HTTP2Stream}
 * @param {HTTP2HeadersObject} headers {@link https://nodejs.org/docs/latest-v12.x/api/http2.html#http2_headers_object HTTP2HeadersObject}
 * @param {SimpleH2Params} params Parameters from the request, GET and PATH RegExp groups
 * @param {SimpleH2Next} next
 */

/**
 * Next Function
 * @typedef {function} SimpleH2Next
 * @param {(string|object)} body The response to send, if an object JSON.serialise
 */

/**
 * Params
 * @typedef {object} SimpleH2Params
 * @property {Object.<string, string>} get The parsed GET parameters
 * @property {Object.<string, string>} path The parsed Path parameters
 * @property {string} body The response body if buffered
 */

/**
 * Handler options
 * @typedef {Object} HandlerOptions
 * @property {boolean} bufferBody Buffer the post body and set in {@link SimpleH2Params}
 */

/**
 * SimpleH2 Server
 * @example <caption>Cleartext</caption>
 * const simpleH2 = require('simpleH2');
 * const srv = new simpleH2.Server();
 * srv.get('/', (stream, headers, params, next) => {
 *   next('Hello, world!');
 * });
 * srv.listen(3001);
 * @example <caption>With SSL</caption>
 * const fs = require('fs');
 * const simpleH2 = require('simpleH2');
 * const srv = new simpleH2.Server({
 *   key: fs.readFileSync('key.private.pem', 'utf8'),
 *   cert: fs.readFileSync('cert.pem', 'utf8'),
 * });
 * srv.get('/', (stream, headers, params, next) => {
 *   next('Hello, world!');
 * });
 * srv.listen(3001);
 */
class SimpleH2Server {
  /**
   * @param {Object.<string, any>} opts Options to pass down to http2.create(Secure)?Server
   * @return {SimpleH2Server} a Server instance
   */
  constructor(opts = {}) {
    this.tree = new Branch();
    if ('key' in opts && 'cert' in opts) {
      this.srv = http2.createSecureServer(opts);
    } else {
      this.srv = http2.createServer(opts);
    }
    this.srv.on('stream', this.connectionHandler.bind(this));
    this.srv.on('error', this.error.bind(this));
    this.globalMiddleware = [];
  }

  /* istanbul ignore next */
  error(err) {
    /* eslint-disable-next-line no-console */
    console.error('simpleH2.Server error', err);
  }

  /**
   * Starts the {Server} listening
   * @param {number} port The port to listen on
   */
  listen(port) {
    this.srv.listen(port);
  }

  /**
   * Stops the {Server} listening
   */
  close() {
    this.srv.close();
  }

  static next(stream, headers, params, ...args) {
    if (args.length === 1) {
      switch(typeof args[0]) {
        case 'string':
          stream.end(args[0]);
          break;
        case 'object':
          stream.respond({
            'content-type': 'application/json',
            ':status': 200
          });
          stream.end(JSON.stringify(args[0]));
          break;
        /* istanbul ignore next */
        default:
          stream.end(`Unknown type: ${typeof args[0]}`);
          break;
      }
    } else {
      stream.end('');
    }
  }

  getBoundNext(stream, headers, params) {
    return SimpleH2Server.next.bind(null, stream, headers, params);
  }

  middlewareHandler(stream, headers, leaf) {
    let middlewares = this.globalMiddleware.slice(0);

    let next = (response = null) => {
      let meth = null;
      let myNext = this.getBoundNext(stream, headers, leaf.params);
      if (response === null) {
        if (middlewares.length > 0) {
          meth = middlewares.shift();
          myNext = next;
        } else {
          meth = leaf.handler;
        }
        meth(stream, headers, leaf.params, myNext);
      } else {
        myNext(response);
      }
    };

    let middleware = middlewares.shift();
    middleware(stream, headers, leaf.params, next);
  }

  connectionHandler(stream, headers) {
    const method = headers[':method'];
    const uri = headers[':path'];
    const leaf = this.tree.lookup(uri, method);
    if (!leaf.foundRoute) {
      stream.respond({
        'content-type': 'text/plain',
        ':status': 404
      });
      return stream.end('Not found.');
    }
    if (this.globalMiddleware.length > 0) {
      return this.middlewareHandler(stream, headers, leaf);
    }
      return leaf.handler(stream, method, leaf.params, this.getBoundNext(stream, headers, leaf.params));

  }


  /**
   * Add a GET handler
   * @param {string} path The path to bind to
   * @param {SimpleH2Handler} handler The method to handle the requests
   * @example
   * srv.get('/get-handler', (stream, headers, params, next) => {
   *   stream.end('Hello, world!');
   * });
   */
  get(path, handler) {
    this.tree.add(path, 'GET', handler);
  }

  /**
   * Add a POST handler
   * @param {string} path The path to bind to
   * @param {SimpleH2Handler} handler The method to handle the requests
   * @param {HandlerOptions} opts Handler options
   * @example
   * srv.post('/post-handler', (stream, headers, params, next) => {
   *   stream.end(postResponse);
   * }, { bufferBody: true });
   */
  post(path, handler, opts = {}) {
    let myHandler = handler;
    if (opts.bufferBody) {
      myHandler = bufferBodyHandler(myHandler);
    }
    this.tree.add(path, 'POST', myHandler);
  }

  /**
   * Add a global Middleware handler
   * @param {function} middleware The method to handle on all requests
   * @example
   * srv.use((stream, headers, params, next) => {
   *   console.log(`${headers[':method']} ${headers[':path']}`);
   *   next();
   * });
   */
  use(middleware) {
    this.globalMiddleware.push(middleware);
  }
}

module.exports = SimpleH2Server;