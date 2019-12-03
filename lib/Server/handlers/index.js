const {bufferBodyHandler} = require('./bufferBodyHandler.js');

const applyOptionsToHandler = (handler, opts) => {
  let myHandler = handler;
  if (opts.bufferBody) {
    myHandler = bufferBodyHandler(myHandler);
  }
  return myHandler;
};

module.exports = {
  applyOptionsToHandler
};