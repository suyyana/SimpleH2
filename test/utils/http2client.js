/* istanbul ignore file */
const http2 = require('http2');
const url = require('url');
const fs = require('fs');
const path = require('path');

const http2client = (uri, method = 'GET', data = '') => new Promise((resolve, reject) => {
  const urlParsed = url.parse(uri);
  const options = {};
  if (urlParsed.protocol === 'https:') {
    const caFolder = path.normalize(path.join(__dirname, '..', '.ca.data.folder'));
    options.ca = fs.readFileSync(path.join(caFolder, 'cacert.pem'), 'utf8');
  }
  const client = http2.connect(uri, options);
  client.on('error', (err) => {
    console.error('http2.client error:', err);
    reject(err);
  });
  const req = client.request({ ':path': urlParsed.path, ':method': method });
  let headers = null;
  let flags = null;
  req.on('response', (h, f) => {
    headers = h;
    flags = f;
  });
  let buff = '';
  req.on('data', (data) => {
    buff += data.toString('utf8');
  });
  req.on('end', () => {
    client.close();
    resolve({
      headers,
      flags,
      body: buff
    });
  });
  if (['POST', 'PUT'].indexOf(method) > -1) req.write(data);
  req.end();
});


module.exports = http2client;