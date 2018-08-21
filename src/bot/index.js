const Telegraf = require('telegraf');
const nconf = require('nconf');
const { encrypt } = require('./utils');
const { start, stop, show } = require('./engoo');
const { showBalance, showBalances, transfer, addAddress, getAddresses } = require('./tron');

const run = async () => {
  const { token, myChatId } = nconf.get('telegram');
  const bot = new Telegraf(token);

  const hasBotCommands = (entities) => {
    if (!entities || !(entities instanceof Array)) {
      return false;
    }
  
    return entities.some(e => e.type === 'bot_command');
  };

  bot.command('start', ({ reply }) => reply('Welcome to marucoolBot. Please click what you want to do.', {
    reply_markup: {
      keyboard: [['/engoo', '/tron']],
    },
  }));

  bot.command('back', ({ reply }) => reply('Welcome to marucoolBot. Please click what you want to do.', {
    reply_markup: {
      keyboard: [['/engoo', '/tron']],
    },
  }));

  bot.command('engoo', ({ reply }) => reply('[engoo] Please click what you want to do.', {
    reply_markup: {
      keyboard: [['/run', '/stop', '/schedule'], ['/back']],
    },
  }));

  bot.command('tron', ({ reply }) => reply('[tron] Please click what you want to do.', {
    reply_markup: {
      keyboard: [['/show', '/transfer'], ['/back']],
    },
  }));

  bot.command('address', async ({ reply, message: { text } }) => {
    const [, address] = (text || '').split(' ');
    if (!address) reply('주소를 입력하세요.');
    await showBalance(reply, address);
  });

  bot.command('run', async ({ reply, from: { id: resChatId } }) => {
    await start(reply, resChatId);
  });

  bot.command('stop', ({ reply, from: { id: resChatId } }) => {
    stop(reply, resChatId);
  });

  bot.command('get', ({ reply, from: { id: resChatId } }) => {
    getAddresses(reply, resChatId);
  });

  bot.command('add', ({ reply }) => reply('/add 추가할 주소를 입력하세요.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('schedule', async ({ reply }) => {
    await show(reply);
  });

  bot.command('transfer', ({ reply }) => reply('/transfer 비밀번호를 입력하세요.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('show', ({ reply }) => reply('/show 비밀번호를 입력하세요.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('encrypt', async ({ reply, from: { id: resChatId }, message: { text } }) => {
    if (myChatId === resChatId) {
      const [password] = (text || '').split(' ');
      encrypt(password);
      reply('업데이트가 완료되었습니다.');
    } else {
      reply('권한이 없는 사용자입니다.');
    }
  });

  bot.on('message', async (ctx) => {
    const { message, reply } = ctx;
    const resChatId = ctx.from.id;
    if (!hasBotCommands(message.entities)) {
      console.log(JSON.stringify(message, null, 2));
      const { reply_to_message } = message;
      if (reply_to_message) {
        const { text } = reply_to_message;
        if (text.startsWith('/transfer')) {
          if (myChatId === resChatId) {
            try {
              const [password, amount, address] = message.text.split(' ');
              console.log(password, amount === 'null' ? null : amount, address);
              await transfer(resChatId, reply, password, amount === 'null' ? null : amount, address === 'null' ? null : address);
            } catch (err) {
              reply(`에러발생: ${JSON.stringify(err)}`);
            }
          } else {
            reply('권한이 없는 사용자입니다.');
          }
        }

        if (text.startsWith('/show')) {
          if (myChatId === resChatId) {
            try {
              const password = message.text;
              await showBalances(reply, password);
            } catch (err) {
              reply(`에러발생: ${JSON.stringify(err)}`);
            }
          } else {
            reply('권한이 없는 사용자입니다.');
          }
        }

        if (text.startsWith('/add')) {
          try {
            const address = message.text;
            await addAddress(resChatId, address, reply);
          } catch (err) {
            reply(`에러발생: ${JSON.stringify(err)}`);
          }
        }
      }
    }
  });

  bot.catch((err) => {
    console.log('Ooops', err);
  });
  bot.startPolling();

  // const usersRef = tronRef.child('users');
  // usersRef.set({
  //   marucool: {
  //     date_of_birth: "June 23, 1983",
  //     full_name: "Alan Turing"
  //   },
  //   gracehop: {
  //     date_of_birth: "teststestsetset December 9, 1906",
  //     full_name: "Grace Hopper"
  //   }
  // });

// Write the new post's data simultaneously in the posts list and the user's post list.
// var updates = {};
// updates['/marucool/date_of_birth'] = 'ssssss';
// updates['/marucool/date_of_birth2'] = 'ssssss2222';
};

module.exports = async () => {
  await run();
};
