/* istanbul ignore file */

const fs = require('fs');
const path = require('path');
const Forge = require('node-forge');

const pki = Forge.pki;

const randomNumber = () => {
  return Math.floor(Math.random()*Math.pow(256, 4));
};

const randomSerialNumber = () => {
  let sn = '';
  let w = 4;
  while (w-- > 0) {
    sn = `${sn}${randomNumber().toString(16)}`;
  }
	return sn;
};

const exists = (filePath) => new Promise((resolve, reject) => {
  fs.access(filePath, fs.constants.R_OK, (err) => {
    if (err) return resolve(false);
    resolve(true);
  });
});

class ca {
  constructor(dataFolder, commonName) {
    this.folder = dataFolder;
    this.commonName = commonName;
    this.initialised = false;
    this.ca = {
      cert: null,
      keys: {
        public: null,
        private: null
      }
    }
  }

  get caCertFilePath() {
    return path.join(this.folder, 'cacert.pem');
  }

  get caKeyPublicFilePath() {
    return path.join(this.folder, 'cakey.pem');
  }

  get caKeyPrivateFilePath() {
    return path.join(this.folder, 'cakey.key');
  }

  get caAttrs() {
    return [{
      name: 'commonName',
      value: this.commonName
    }];
  }

  get caExtensions() {
    return [{
      name: 'basicConstraints',
      cA: true
    }, {
      name: 'keyUsage',
      keyCertSign: true,
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    }, {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true,
      timeStamping: true
    }, {
      name: 'nsCertType',
      client: true,
      server: true,
      email: true,
      objsign: true,
      sslCA: true,
      emailCA: true,
      objCA: true
    }, {
      name: 'subjectKeyIdentifier'
    }];
  }

  async initialise() {
    if (await exists(this.caCertFilePath)) {
      this.loadCAFiles();
      return true;
    }
    if(await this.generateCa()) {
      this.saveCAFiles();
      return true;
    }
    return false;
  }

  loadCAFiles() {
    this.ca = {
      cert: pki.certificateFromPem(fs.readFileSync(this.caCertFilePath, 'utf8')),
      keys: {
        public: pki.publicKeyFromPem(fs.readFileSync(this.caKeyPublicFilePath, 'utf8')),
        private: pki.privateKeyFromPem(fs.readFileSync(this.caKeyPrivateFilePath, 'utf8'))
      }
    };
  }

  saveCAFiles() {
    fs.writeFileSync(this.caCertFilePath, pki.certificateToPem(this.ca.cert));
    fs.writeFileSync(this.caKeyPublicFilePath, pki.publicKeyToPem(this.ca.keys.public));
    fs.writeFileSync(this.caKeyPrivateFilePath, pki.privateKeyToPem(this.ca.keys.private));
  }

  generateCa() {
    return new Promise((resolve, reject) => {
      pki.rsa.generateKeyPair({bits: 2048}, (err, keys) => {
        if(err) return reject(err);
        const cert = pki.createCertificate();
        cert.publicKey = keys.publicKey;
        cert.serialNumber = randomSerialNumber();
        cert.validity.notBefore = new Date();
        cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1);
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
        cert.setSubject(this.caAttrs);
        cert.setIssuer(this.caAttrs);
        cert.setExtensions(this.caExtensions);
        cert.sign(keys.privateKey, Forge.md.sha256.create());
        this.ca.cert = cert;
        this.ca.keys.public = keys.publicKey;
        this.ca.keys.private = keys.privateKey;
        resolve(true);
      });
    });
  }

  generateAndSignServerCert(commonName) {
    return new Promise((resolve, reject) => {
      const serverAttrs = [{
        name: 'commonName',
        value: commonName
      }];
      const serverExtensions = [
        {
          name: 'basicConstraints',
          cA: false
        }, {
          name: 'keyUsage',
          keyCertSign: false,
          digitalSignature: true,
          nonRepudiation: false,
          keyEncipherment: true,
          dataEncipherment: true
        }, {
          name: 'extKeyUsage',
          serverAuth: true,
          clientAuth: true,
          codeSigning: false,
          emailProtection: false,
          timeStamping: false
        }, {
          name: 'nsCertType',
          client: true,
          server: true,
          email: false,
          objsign: false,
          sslCA: false,
          emailCA: false,
          objCA: false
        }, {
          name: 'subjectKeyIdentifier'
        }, {
          name: 'subjectAltName',
          altNames: [{
            type: 7,
            ip: '127.0.0.1'
          }]
        }
      ];
      const keys = pki.rsa.generateKeyPair(2048);
      const cert = pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = randomSerialNumber();
      cert.validity.notBefore = new Date();
      cert.validity.notBefore.setDate(cert.validity.notBefore.getDate() - 1);
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 2);
      cert.setSubject(serverAttrs);
      cert.setIssuer(this.ca.cert.issuer.attributes);
      cert.setExtensions(serverExtensions);
      cert.sign(this.ca.keys.private, Forge.md.sha256.create());
      return resolve({
        cert: pki.certificateToPem(cert),
        keys: {
          public: pki.publicKeyToPem(keys.publicKey),
          private: pki.privateKeyToPem(keys.privateKey)
        }
      });
    });
  }
};

module.exports = {
  ca
};