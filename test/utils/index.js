/* istanbul ignore file */
const http2client = require('./http2client.js');

module.exports = {
  http2get: http2client,
  http2post: (url, data) => {
    return http2client(url, 'POST', data);
  },
  http2put: (url, data) => {
    return http2client(url, 'PUT', data);
  }
};
