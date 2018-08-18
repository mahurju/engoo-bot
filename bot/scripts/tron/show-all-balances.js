const chalk = require('chalk');
const { Client } = require('@tronscan/client');
const { getAllAccountInstances } = require('./helpers');
const { numberformat } = require('../utils');

exports.showBalances = async (chatId, bot) => {
  const accounts = getAllAccountInstances();
  for (const account of accounts) {
    console.log('===========================================================');
    const { address, client } = account;
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
    bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
  }
};


exports.showBalance = async (chatId, bot, address) => {
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
  bot.sendMessage(chatId, msg, { parse_mode: 'HTML' });
};
