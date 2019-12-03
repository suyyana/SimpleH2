const bufferBodyHandler = (handler) => (stream, headers, params, next) => {
    let buff = '';
    stream.on('data', (data) => {
      buff += data;
    });
    stream.on('end', () => {
      params.body = buff;
      handler(stream, headers, params, next);
    });
  };

module.exports = {
  bufferBodyHandler
};