const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');
const { Client } = require('@tronscan/client');

exports.getAllAccountInstances = () => {
  const { accounts } = yaml.safeLoad(fs.readFileSync(path.join(__dirname, '..', '..', '..', '.data', 'private-keys.yml'), 'utf8'));
  const accountInstances = Object.entries(accounts).reduce((prev, [address, pk]) => {
    const client = new Client();
    const signer = client.getSigner(pk);
    client.setSigner(signer);
    const data = {
      address,
      client,
    };
    prev.push(data);
    return prev;
  }, []);
  return accountInstances;
};
