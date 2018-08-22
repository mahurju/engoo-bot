const { Client } = require('@tronscan/client');
const chalk = require('chalk');
const schedule = require('node-schedule');
const stringify = require('json-stable-stringify');
const users = require('../../db')();
const { numberformat } = require('../utils');

let bot = null;
const jobs = {};

const showBalance = async (chatId) => {
  console.log('===========================================================');
  const result = await users.child(`/${chatId}/tron/address`).once('value');
  console.log(result.val());
  const myAddress = result.val();
  if (!myAddress) return bot.telegram.sendMessage(chatId, '등록된 주소가 없습니다.');

  const client = new Client();
  for (const addr of Object.keys(myAddress)) {
    const preTokens = (myAddress[addr] && myAddress[addr].tokens) || {};
    let msg = `<b>[잔액 ${Object.keys(preTokens).length > 0 ? '변동' : '등록'} 알림]</b>\n`;
    msg += `<b>주소: ${addr}</b>\n\n`;
    const currentTokens = {};
    const accountInfo = await client.getAddress(addr);
    const balances = accountInfo.balances || [];
    for (const token of balances) {
      const { name, balance } = token;
      const bal = Math.floor(balance);
      if (bal > 0) {
        currentTokens[name] = bal;
        const preBal = preTokens[name];
        if (bal !== preBal && Object.keys(preTokens).length > 0) {
          msg += `<b> - [변경] ${name}:  ${numberformat(preBal)} => ${numberformat(bal)}</b>\n`;
        } else {
          msg += `- ${name}:  ${numberformat(bal)}\n`;
        }
        
        console.log(name === 'TRX' ? chalk.green(addr, name, bal) : chalk.white(addr, name, bal));
      }
    }

    if (stringify(preTokens) !== stringify(currentTokens)) {
      const updates = {};
      updates[`/${chatId}/tron/address/${addr}/tokens`] = currentTokens;
      updates[`/${chatId}/tron/address/${addr}/updateTime`] = new Date();
      users.update(updates);
      bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    }
  }
};

exports.addAddress = async (chatId, addr, reply) => {
  const data = await users.child(`/${chatId}/tron/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || {};
  if (address[addr]) {
    return reply('이미 추가된 주소입니다.');
  }
  address[addr] = {
    createTime: new Date(),
  };
  updates[`/${chatId}/tron/address`] = address;
  users.update(updates);
  return reply(`${addr} 주소가 추가되었습니다.`);
};

exports.getAddresses = async (reply, chatId) => {
  const data = await users.child(`/${chatId}/tron/address`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return reply('추가된 주소가 없습니다.');
  return reply(address.join('\n'));
};

exports.startListenAccount = async (chatId, send = true) => {
  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      if (send) return bot.telegram.sendMessage(chatId, 'Your tron accounts are already listening now..');
      return false;
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/10 * * * * *', async () => {
      await showBalance(chatId);
    }),
  };
  const updates = {};
  updates[`/${chatId}/tron/listenChangeBalances`] = true;
  users.update(updates);
  if (send) return bot.telegram.sendMessage(chatId, 'Your tron accounts are to start listen.');
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
  updates[`/${chatId}/tron/listenChangeBalances`] = false;
  users.update(updates);
  return reply('Your tron accounts are to stop listen.');
};

exports.getAddress = async (reply, chatId) => {
  const data = await users.child(`/${chatId}/tron/address`).once('value');
  console.log(data.val());
  const address = data.val() || {};
  if (Object.keys(address).length === 0) {
    return reply('추가된 주소가 없습니다.');
  }

  return reply(Object.keys(address).join('\n'));
};

exports.removeAddress = async (chatId, addr, reply) => {
  const data = await users.child(`/${chatId}/tron/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || {};
  if (address[addr]) {
    updates[`/${chatId}/tron/address/${addr}`] = null;
    users.update(updates);
    return reply(`${addr} 주소가 삭제되었습니다.`);
  }
  return reply('입력되지 않는 주소입니다.');
};

exports.initListen = async (myBot) => {
  bot = myBot;
  const data = await users.once('value');
  const allUsers = data.val();
  console.log(allUsers);
  for (const chatId of Object.keys(allUsers)) {
    const { listenChangeBalances } = (allUsers[chatId] && allUsers[chatId].tron) || {};
    if (listenChangeBalances === true) {
      await this.startListenAccount(chatId, false);
    }
  }
};

// exports.initListen = async (myBot) => {
//   bot = myBot;
//   const data = await users.child('users').once('value');
//   const allUsers = data.val();
//   const updates = {}
//   // updates[`/${chatId}/tron/address/${addr}`] = null;
//   // users.update(updates);
//   console.log(allUsers);
//   for (const chatId of Object.keys(allUsers)) {
//     updates[chatId] = {
//       tron: {
//         address: allUsers[chatId].address,
//         listenChangeBalances: allUsers[chatId].listenChangeBalances,
//       },
//     };
//   }
//   console.log(updates);
//   users.update(updates);
// };
