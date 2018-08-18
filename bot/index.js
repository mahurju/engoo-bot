require('../config')();
const TelegramBot = require('node-telegram-bot-api');
const nconf = require('nconf');
const { start, stop, show, setBot } = require('./scripts/engoo');
// const { showBalances, transfer, showBalance } = require('./scripts/tron');

(async () => {
  const { token, myChatId } = nconf.get('telegram');
  const bot = new TelegramBot(token, { polling: true });
  // bot.sendMessage(myChatId, '/start');
  // bot.sendPhoto(myChatId, 'https://image-eikaiwa.engoo.com/teacher/17815/p3303.jpg');

  bot.onText(/\/(.+) (.+)/, async (msg, match) => {
    const resChatId = msg.chat.id;
    console.log(resChatId);
    const command = match[1];
    const address = match[2];

    if (command === 'address') {
      if (!address) bot.sendMessage(msg.chat.id, '주소를 입력하세요.');
      await showBalance(resChatId, bot, address);
    }
  });

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, 'Welcome to engoo. Please click what you want to do.', {
      reply_markup: {
        keyboard: [['start', 'stop', 'schedule']],
        // keyboard: [['start', 'stop', 'schedule'], ['showBalances', 'transfer']],
      },
    });
  });

  bot.on('message', async (msg) => {
    const resChatId = msg.chat.id;
    console.log(msg);
    const { text } = msg;
    const [command] = text.split(' ');
    console.log(command);
    if (command === 'start') {
      await start(resChatId);
    }

    if (command === 'stop') {
      stop(resChatId);
    }

    if (command === 'schedule') {
      await show(resChatId);
    }

    // if (command === 'showBalances') {
    //   if (myChatId === resChatId) {
    //     await showBalances(resChatId, bot);
    //   } else {
    //     bot.sendMessage(msg.chat.id, '권한이 없는 사용자입니다.');
    //   }
    // }

    // if (command === 'transfer') {
    //   const [, address, amount] = text.split(' ');
    //   console.log(address, amount);
    //   if (myChatId === resChatId) {
    //     await transfer(resChatId, bot, address, amount);
    //   } else {
    //     bot.sendMessage(msg.chat.id, '권한이 없는 사용자입니다.');
    //   }
    // }
  });


  setBot(bot);
})();
