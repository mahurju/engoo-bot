const chalk = require('chalk');
const nconf = require('nconf');
const { getAllAccountInstances } = require('./helpers');

const { trxTarget } = nconf.get('tron');

exports.transfer = async (chatId, bot, password, amount, sendAddress) => {
  const accounts = getAllAccountInstances(password);
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
        let target = trxTarget;
        if (name === 'TRX' || name === 'IGG' || name === 'Tarquin' || name === 'SEED') {
          if (name === 'TRX') {
            totalTrx += parseInt(bal, 10);
            bal = parseInt(bal * 1000000, 10);
          }
          target = sendAddress || target;

          if (address !== target) {
            const msg = `sending ${name}\nfrom: ${address}\nto: ${target}\nbal: ${name === 'TRX' ? bal / 1000000 : bal}`;
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
