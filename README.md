# Welcome to @forge-io/simpleh2 👋
[![Version](https://img.shields.io/npm/v/@forge-io/simpleh2.svg)](https://www.npmjs.com/package/@forge-io/simpleh2)
[![Documentation](https://img.shields.io/badge/documentation-yes-brightgreen.svg)](https://simpleh2.forge.io/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/forge-io/SimpleH2/graphs/commit-activity)
[![License: GPL--3.0](https://img.shields.io/github/license/forge-io/@forge-io/simpleh2)](#)

> A simple HTTP2 router for nodejs

### 🏠 [Homepage](https://simpleh2.forge.io/)
### 📕 [Repository](https://github.com/forge-io/SimpleH2)


## Install

```sh
npm install @forge-io/simpleh2
```

## Example

### HTTP2
```js
const simpleH2 = require('@forge-io/simpleh2');
const srv = new simpleH2.Server();
srv.get('/', (stream, headers, params, next) => {
  next('Hello, world!');
});
srv.listen(3001);
```

### HTTP2 With SSL
```js
const fs = require('fs');
const simpleH2 = require('@forge-io/simpleh2');
const srv = new simpleH2.Server({
  key: fs.readFileSync('key.private.pem', 'utf8'),
  cert: fs.readFileSync('cert.pem', 'utf8'),
});
srv.get('/', (stream, headers, params, next) => {
  next('Hello, world!');
});
srv.listen(3001);
```

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

Feel free to check [issues page](https://github.com/forge-io/SimpleH2/issues).

## Show your support

Give a ⭐️ if this project helped you!