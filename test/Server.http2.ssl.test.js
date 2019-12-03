const getPort = require('get-port');
const fs = require('fs');
const http2 = require('http2');
const path = require('path');
const url = require('url');
const { http2get } = require('./utils/index.js');
const { ca } = require('./utils/x509.ca.js');

const mod = require('../');

const helloWorld = (stream, headers, params, next) => {
  stream.respond({
    'content-type': 'text/plain',
    ':status': 200
  });
  stream.end('Hello, world!');
};

describe('the Secure Server', () => {
  let CA = null;
  let srv = null;
  let port = null;
  let lastLog = '';
  let caCert = null;
  let serverCert = null;
  let serverKeys = {
    publicKey: null,
    privateKey: null
  };

  beforeAll(async () => {
    const caFolder = path.join(__dirname, '.ca.data.folder');
    fs.mkdirSync(caFolder, { recursive: true });
    CA = new ca(caFolder, 'test-ca.local');
    const initResult = await CA.initialise();
    expect(initResult).toBe(true);
    const serverCertAndKeys = await CA.generateAndSignServerCert('localhost');
    serverCert = serverCertAndKeys.cert;
    serverKeys.publicKey = serverCertAndKeys.keys.public;
    serverKeys.privateKey = serverCertAndKeys.keys.private;
  });


  beforeEach(async () => {
    port = await getPort();
    srv = new mod.Server({
      cert: serverCert,
      key: serverKeys.privateKey
    });
    srv.get('/hello', helloWorld);
    srv.listen(port);
  });

  afterEach(async () => {
    srv.close();
  });

  it('serves a simple Hello world', async () => {
    const resp = await http2get(`https://127.0.0.1:${port}/hello`);
    expect(resp.body).toEqual('Hello, world!');
  });
});