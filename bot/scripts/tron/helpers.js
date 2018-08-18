const nconf = require('nconf');
const { Client } = require('@tronscan/client');

exports.getAllAccountInstances = () => {
  const accounts = nconf.get('tron:accounts');
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
