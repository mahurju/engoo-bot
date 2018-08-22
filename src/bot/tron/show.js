const chalk = require('chalk');
const { Client } = require('@tronscan/client');
const { getAllAccountInstances } = require('./helpers');
const { numberformat } = require('../utils');

exports.showBalances = async (reply, password) => {
  const accounts = getAllAccountInstances(password);
  await Promise.all(accounts.map(async ({ address, client }) => {
    let msg = `<b>${address}</b>\n\n`;
    console.log(address);
    try {
      const accountInfo = await client.getAddress(address);
      console.log(address);
      const balances = accountInfo.balances || [];
      balances.forEach((token) => {
        const { name, balance } = token;
        const bal = Math.floor(balance);
        if (bal > 0) {
          msg += `- ${name}:  <b>${numberformat(bal)}</b>\n`;
          console.log(name === 'TRX' ? chalk.green(address, name, bal) : chalk.white(address, name, bal));
        }
      });
      reply(msg, { parse_mode: 'HTML' });
    } catch (err) {
      console.error(err);
    }
  }));
};

exports.showBalance = async (reply, address) => {
  console.log('===========================================================');
  const client = new Client();
  let msg = `<b>${address}</b>\n\n`;
  const accountInfo = await client.getAddress(address);
  const balances = accountInfo.balances || [];
  for (const token of balances) {
    const { name, balance } = token;
    const bal = Math.floor(balance);
    if (bal > 0) {
      msg += `- ${name}:  <b>${numberformat(bal)}</b>\n`;
      console.log(name === 'TRX' ? chalk.green(address, name, bal) : chalk.white(address, name, bal));
    }
  }
  reply(msg, { parse_mode: 'HTML' });
};
