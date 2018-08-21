const chalk = require('chalk');
const nconf = require('nconf');
const { getAllAccountInstances } = require('./helpers');

const { trxTarget } = nconf.get('tron');

exports.transfer = async (chatId, reply, password, amount, sendAddress) => {
  const accounts = getAllAccountInstances(password);
  const totalCnt = {};
  for (const account of accounts) {
    console.log('===========================================================');
    const { address, client } = account;
    const accountInfo = await client.getAddress(address);
    const balances = accountInfo.balances || [];
    for (const token of balances) {
      const { name, balance } = token;
      let bal = Math.floor(balance);
      if (bal > 0) {
        bal = amount ? parseInt(amount, 10) : bal;
        console.log(name === 'TRX' ? chalk.green(address, name, bal) : chalk.white(address, name, bal));
        let target = trxTarget;
        if (name === 'TRX' || name === 'IGG' || name === 'Tarquin' || name === 'SEED') {
          if (name === 'TRX') {
            bal = parseInt(bal * 1000000, 10);
          }
          target = sendAddress || target;

          if (address !== target) {
            const msg = `sending ${name}\nfrom: ${address}\nto: ${target}\nbal: ${name === 'TRX' ? bal / 1000000 : bal}`;
            if (!totalCnt[name]) totalCnt[name] = 0;
            totalCnt[name] += name === 'TRX' ? bal / 1000000 : bal;
            console.log(msg);
            reply(msg);
            const tranaction = client.send(name, address, target, bal);
            const result = await tranaction();
            console.log(`result: ${JSON.stringify(result, null, 2)}`);
          }
        }
      }
    }
  }
  reply(`Total sent infomation:\n ${JSON.stringify(totalCnt, null, 2)}`);
  console.log(chalk.blue(`Total sent infomation: ${JSON.stringify(totalCnt, null, 2)}`));
};
