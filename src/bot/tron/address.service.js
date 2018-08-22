const { Client } = require('@tronscan/client');
const chalk = require('chalk');
const schedule = require('node-schedule');
const stringify = require('json-stable-stringify');
const users = require('../../db')();
const { numberformat } = require('../utils');
const { checkAddressPattern } = require('./helpers');

let bot = null;
const jobs = {};

const showBalance = async (chatId) => {
  console.log('===========================================================');
  const result = await users.child(`/tron/${chatId}/address`).once('value');
  console.log(result.val());
  const myAddress = result.val();
  if (!myAddress) return bot.telegram.sendMessage(chatId, 'Not find tron addresses.');

  const client = new Client();
  await Promise.all(Object.keys(myAddress).map(async (addr) => {
  // for (const addr of Object.keys(myAddress)) {
    const preTokens = (myAddress[addr] && myAddress[addr].tokens) || {};
    let msg = `<b>[Notification of balance ${Object.keys(preTokens).length > 0 ? 'change' : 'registration'}]</b>\n`;
    msg += `<b>${addr}</b>\n\n`;
    const currentTokens = {};
    try {
      const accountInfo = await client.getAddress(addr);
      const balances = accountInfo.balances || [];
      const changed = [];
      const allTokens = [];
      balances.forEach((token) => {
        const { name, balance } = token;
        const bal = Math.floor(balance) || 0;
        const preBal = preTokens[name] || 0;
        if (bal !== preBal && Object.keys(preTokens).length > 0) {
          changed.push(`<b> - ${name}:  ${numberformat(preBal)} -> ${numberformat(bal)}</b>`);
        }

        if (bal > 0) {
          currentTokens[name] = bal;
          allTokens.push(`- ${name}:  ${numberformat(bal)}`);
          console.log(name === 'TRX' ? chalk.green(addr, name, bal) : chalk.white(addr, name, bal));
        }
      });

      if (stringify(preTokens) !== stringify(currentTokens)) {
        const updates = {};
        updates[`/tron/${chatId}/address/${addr}/tokens`] = currentTokens;
        updates[`/tron/${chatId}/address/${addr}/updateTime`] = new Date();
        users.update(updates);
        if (changed.length > 0) {
          msg += '<b>* Balance Changed</b>\n';
          msg += changed.join('\n');
          msg += '\n\n';
        }

        if (allTokens.length > 0) {
          msg += '<b>* Current Balance</b>\n';
          msg += allTokens.join('\n');
        }

        bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
      }
    } catch (err) {
      // ignore
      // console.error(err);
    }
  }));
};

exports.addAddress = async (chatId, addr, reply) => {
  if (!checkAddressPattern(addr)) return reply('Invalid address.');
  const data = await users.child(`/tron/${chatId}/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || {};
  if (address[addr]) {
    return reply('Already added tron address.');
  }
  address[addr] = {
    createTime: new Date(),
  };
  updates[`/tron/${chatId}/address`] = address;
  users.update(updates);
  return reply(`${addr} tron address added.`);
};

exports.getAddresses = async (reply, chatId) => {
  const data = await users.child(`/tron/${chatId}/address`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return reply('No added tron addresses.');
  return reply(address.join('\n'));
};

exports.startListenAccount = async (chatId, send = true) => {
  const data = await users.child(`/tron/${chatId}/address`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return bot.telegram.sendMessage(chatId, 'Not found tron addresses to start.');

  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      if (send) return bot.telegram.sendMessage(chatId, 'Your tron address are already listening now..');
      return false;
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/10 * * * * *', async () => {
      await showBalance(chatId);
    }),
  };
  const updates = {};
  updates[`/tron/${chatId}/listenChangeBalances`] = true;
  users.update(updates);
  if (send) return bot.telegram.sendMessage(chatId, 'Your tron address are to start listen.');
  return false;
};

exports.stopListenAccount = (reply, chatId) => {
  const { job = {} } = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job.nextInvocation()) {
    return reply('Your tron jobs are not running.');
  }

  job.cancel();
  const updates = {};
  updates[`/tron/${chatId}/listenChangeBalances`] = false;
  users.update(updates);
  return reply('Your tron address are to stop listen.');
};

exports.getAddress = async (reply, chatId) => {
  const data = await users.child(`/tron/${chatId}/address`).once('value');
  console.log(data.val());
  const address = data.val() || {};
  if (Object.keys(address).length === 0) {
    return reply('No added tron addresses.');
  }
  
  let msg = '<b>[Address List]</b>\n\n';
  msg = Object.keys(address).reduce((prev, next) => {
    msg += `${next}\n`;
    return msg;
  }, msg);
  return reply(msg, { parse_mode: 'HTML' });
};

exports.removeAddress = async (chatId, addr, reply) => {
  if (!checkAddressPattern(addr)) return reply('Invalid address.');
  const data = await users.child(`/tron/${chatId}/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || {};
  if (address[addr]) {
    updates[`/tron/${chatId}/address/${addr}`] = null;
    users.update(updates);
    if (Object.keys(address).length === 1) {
      this.stopListenAccount(reply, chatId);
    }
    return reply(`${addr} tron address removed.`);
  }
  return reply('Not found tron address.');
};

exports.initListen = async (myBot) => {
  bot = myBot;
  const data = await users.child('/tron').once('value');
  const allUsers = data.val();
  console.log(allUsers);
  for (const chatId of Object.keys(allUsers)) {
    const { listenChangeBalances } = allUsers[chatId] || {};
    if (listenChangeBalances === true) {
      await this.startListenAccount(chatId, false);
    }
  }
};

// exports.initListen = async (myBot) => {
//   bot = myBot;
//   const data = await users.once('value');
//   const allUsers = data.val();
//   const updates = {};
//   for (const chatId of Object.keys(allUsers)) {
//     updates[chatId] = {
//       address: allUsers[chatId].tron.address,
//       listenChangeBalances: allUsers[chatId].tron.listenChangeBalances,
//     };
//   }

//   // updates[`/${chatId}/tron/address/${addr}`] = null;
//   // users.update(updates);
//   // console.log(allUsers);
//   // for (const chatId of Object.keys(allUsers)) {
//   //   updates[chatId] = {
//   //     tron: {
//   //       address: allUsers[chatId].address,
//   //       listenChangeBalances: allUsers[chatId].listenChangeBalances,
//   //     },
//   //   };
//   // }
//   console.log(updates);
//   users.update({ tron: updates});
// };
