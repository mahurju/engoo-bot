const chalk = require('chalk');
const nconf = require('nconf');
const { getAllAccountInstances } = require('./helpers');

const { tokenTarget, trxTarget } = nconf.get('tron');

exports.transfer = async (chatId, bot, sendAddress, amount) => {
  const accounts = getAllAccountInstances();
  let totalTrx = 0;
  for (const account of accounts) {
    console.log('===========================================================');
    const { address, client } = account;
    const accountInfo = await client.getAddress(address);
    const balances = accountInfo.balances || [];
    for (const token of balances) {
      const { name, balance } = token;
      let bal = parseInt(amount, 10) || Math.floor(balance);
      if (bal > 0) {
        console.log(name === 'TRX' ? chalk.green(address, name, bal) : chalk.white(address, name, bal));
        let target = tokenTarget;
        if (name === 'TRX' || name === 'IGG' || name === 'Tarquin' || name === 'DEX') {
          if (name === 'TRX') {
            totalTrx += parseInt(bal, 10);
            bal = parseInt(bal * 1000000, 10);
            target = trxTarget;
          }
          target = sendAddress || target;

          if (address !== target) {
            const msg = `sending token from: ${address}, to: ${target}, bal: ${name === 'TRX' ? bal / 1000000 : bal}`;
            console.log(msg);
            bot.sendMessage(chatId, msg);
            const tranaction = client.send(name, address, target, bal);
            const result = await tranaction();
            console.log(`result: ${JSON.stringify(result, null, 2)}`);
          }
        }
      }
    }
  }
  bot.sendMessage(chatId, `Total sent TRX is ${totalTrx}`);
  console.log(chalk.blue(`Total sent TRX is ${totalTrx}`));
};