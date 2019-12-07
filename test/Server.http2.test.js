const getPort = require('get-port');
const http2 = require('http2');
const url = require('url');
const { http2get, http2post, http2put, http2delete } = require('./utils/index.js');

const mod = require('../');

const helloWorld = (stream, headers, params, next) => {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 200
  });
  stream.end('Hello, world!');
};

const helloWorldRouteTree = {
  '/hello': {
    methods: {
      GET: helloWorld
    }
  },
  '/branch': {
    '/leafA': {
      methods: { GET: helloWorld }
    },
    '/leafB': {
      methods: { GET: helloWorld }
    }
  }
};

describe('the Server', () => {
  let srv = null;
  let port = null;
  let lastLog = '';
  let middlewareLogger = (stream, headers, params, next) => {
    lastLog = `${headers[':method']} ${headers[':path']}`;
    next();
  };


  beforeEach(async () => {
    port = await getPort();
    srv = new mod.Server();
    srv.addRoutes(helloWorldRouteTree);
    srv.listen(port);
  });

  afterEach(async () => {
    srv.close();
  });

  it('serves a simple Hello world', async () => {
    expect.assertions(1);
    const resp = await http2get(`http://127.0.0.1:${port}/hello`);
    expect(resp.body).toEqual('Hello, world!');
  });

  it('responds with 404', async () => {
    expect.assertions(1);
    const resp = await http2get(`http://127.0.0.1:${port}/404-not-found`);
    expect(resp.body).toEqual('Not found.');
  });

  it('responds with 404 when the method is not found', async () => {
    expect.assertions(1);
    const resp = await http2post(`http://127.0.0.1:${port}/hello`, 'POSTDATA');
    expect(resp.body).toEqual('Not found.');
  });

  it('responds when using next', async () => {
    expect.assertions(1);
    const testPath = '/hello-next';
    srv.get(testPath, (stream, headers, params, next) => {
      next();
    });
    const resp = await http2get(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual('');
  });

  it('passes body through next', async () => {
    expect.assertions(1);
    const testPath = '/hello-next-body';
    const responseBody = 'Hello, world!';
    srv.get(testPath, (stream, headers, params, next) => {
      next(responseBody);
    });
    const resp = await http2get(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual(responseBody);
  });

  it('passes body through next from middleware', async () => {
    expect.assertions(1);
    const testPath = '/hello-next-body-middleware';
    const responseBody = 'Hello, world!';
    const responseBodyNext = 'Hello, next!';
    srv.use((stream, headers, params, next) => {
      next(responseBodyNext);
    });
    srv.get(testPath, (stream, headers, params, next) => {
      next(responseBody);
    });
    const resp = await http2get(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual(responseBodyNext);
  });

  it('serialises json through next', async () => {
    expect.assertions(2);
    const testPath = '/hello-next-json';
    const responseObject = {
      message: 'Hello, world!'
    };
    const responseBody = JSON.stringify(responseObject);
    srv.get(testPath, (stream, headers, params, next) => {
      next(responseObject);
    });
    const resp = await http2get(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual(responseBody);
    expect(resp.headers['content-type']).toEqual('application/json');
  });

  it('uses a simple middleware', async () => {
    const testPath = '/hello?middleware=paramA&and=paramB';
    expect.assertions(5);
    srv.use(middlewareLogger);
    const middlewareSpy = jest.fn((stream, headers, params, next) => {
      expect(params.get.middleware).toEqual('paramA');
      expect(params.get.and).toEqual('paramB');
      next();
    });
    srv.use(middlewareSpy);
    const resp = await http2get(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual('Hello, world!');
    expect(middlewareSpy).toHaveBeenCalled();
    expect(lastLog).toEqual(`GET ${testPath}`);
  });

  it('handles a post body', async () => {
    expect.assertions(1);
    const testPath = '/post-body';
    const postData = 'ThisIsSomePostData';
    const postResponse = 'POST RECIEVED';
    srv.post(testPath, (stream, headers, params, next) => {
      stream.end(postResponse);
    });
    const resp = await http2post(`http://127.0.0.1:${port}${testPath}`, postData);
    expect(resp.body).toEqual(postResponse);
  });

  it('handles a post body - buffering the body', async () => {
    expect.assertions(2);
    const testPath = '/post-body-parse';
    const postData = 'ThisIsSomePostData';
    const postResponse = 'POST RECIEVED';
    srv.post(testPath, (stream, headers, params, next) => {
      expect(params.body).toEqual(postData);
      stream.end(postResponse);
    }, { bufferBody: true });
    const resp = await http2post(`http://127.0.0.1:${port}${testPath}`, postData);
    expect(resp.body).toEqual(postResponse);
  });

  it('handles a put body', async () => {
    expect.assertions(1);
    const testPath = '/put-body';
    const putData = 'ThisIsSomePutData';
    const putResponse = 'PUT RECIEVED';
    srv.put(testPath, (stream, headers, params, next) => {
      stream.end(putResponse);
    });
    const resp = await http2put(`http://127.0.0.1:${port}${testPath}`, putData);
    expect(resp.body).toEqual(putResponse);
  });

  it('handles a delete request', async () => {
    expect.assertions(1);
    const testPath = '/delete';
    const deleteResponse = 'DELETE RECIEVED';
    srv.delete(testPath, (stream, headers, params, next) => {
      stream.end(deleteResponse);
    });
    const resp = await http2delete(`http://127.0.0.1:${port}${testPath}`);
    expect(resp.body).toEqual(deleteResponse);
  });

  it('serves a simple Hello world after adding via .add', async () => {
    expect.assertions(1);
    srv.add('/hello-add', 'GET', helloWorld);
    const resp = await http2get(`http://127.0.0.1:${port}/hello-add`);
    expect(resp.body).toEqual('Hello, world!');
  });
});