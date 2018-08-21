const { Client } = require('@tronscan/client');
const chalk = require('chalk');
const schedule = require('node-schedule');
const users = require('../../db')('users');
const { numberformat } = require('../utils');

const jobs = {};

const showBalance = async (reply, chatId) => {
  console.log('===========================================================');
  const result = await users.child(`/${chatId}/address`).once('value');
  console.log(result.val());
  const addresses = result.val();
  const client = new Client();
  for (const addr of addresses) {
    let msg = `<b>${addr}</b>\n\n`;
    const accountInfo = await client.getAddress(addr);
    const balances = accountInfo.balances || [];
    for (const token of balances) {
      const { name, balance } = token;
      const bal = Math.floor(balance);
      if (bal > 0) {
        msg += `- ${name}:  <b>${numberformat(bal)}</b>\n`;
        console.log(name === 'TRX' ? chalk.green(addr, name, bal) : chalk.white(addr, name, bal));
      }
    }
    reply(msg, { parse_mode: 'HTML' });
  }
};


exports.addAddress = async (chatId, addr, reply) => {
  const data = await users.child(`/${chatId}/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || [];
  if (address.indexOf(addr) > -1) {
    return reply('이미 추가된 주소입니다.');
  }
  address.push(addr);
  updates[`/${chatId}/address`] = address;
  users.update(updates);
  return reply(`${addr} 주소가 추가되었습니다.`);
};

exports.getAddresses = async (reply, chatId) => {
  const data = await users.child(`/${chatId}/address`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return reply('추가된 주소가 없습니다.');
  return reply(address.join('\n'));
};

exports.startListenAccount = async (reply, chatId) => {
  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      return reply('Your tron accounts are already listening now..');
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/10 * * * * *', async () => {
      await showBalance(reply, chatId);
    }),
  };
  return reply('Your tron accounts are to start listen.');
};

exports.stopListenAccount = (reply, chatId) => {
  const { job = {} } = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job.nextInvocation()) {
    return reply('Your tron jobs are not running.');
  }

  job.cancel();
  return reply('Your tron accounts are to stop listen.');
};

exports.gets = async () => {

};

exports.remove = async () => {

};
