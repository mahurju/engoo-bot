const { Client } = require('@tronscan/client');
const { decrypt } = require('../utils');

exports.getAllAccountInstances = (password) => {
  const accounts = decrypt(password);
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

exports.checkAddressPattern = (address) => {
  const pattern = /^T\w{33}$/i;
  return pattern.test(address);
};
