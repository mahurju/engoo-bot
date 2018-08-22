const Telegraf = require('telegraf');
const nconf = require('nconf');
const { encrypt } = require('./utils');
const { start, stop, show } = require('./engoo');
const { showBalance, showBalances, transfer, addAddress, getAddress, removeAddress, startListenAccount, stopListenAccount, initListen } = require('./tron');

const { token, myChatId } = nconf.get('telegram');
const bot = new Telegraf(token);

const run = async () => {
  const hasBotCommands = (entities) => {
    if (!entities || !(entities instanceof Array)) {
      return false;
    }
  
    return entities.some(e => e.type === 'bot_command');
  };

  const helpMsg = ['/addaddress [Add tron address]',
    '/getaddress [Show tron addresses]',
    '/removeaddress [Remove tron address]',
    '/startlisten [Start tron address balance change notification]',
    '/stoplisten [Stop tron address balance change notification]',
    '/address [Show tron address balance]'];

  bot.help(ctx => ctx.reply(helpMsg.join('\n')));
  bot.start(ctx => ctx.reply(helpMsg.join('\n')));

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

  bot.command('address', ({ reply }) => reply('/address  Reply tron address to show balance.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('startListen', async ({ from: { id: resChatId } }) => {
    await startListenAccount(resChatId);
  });

  bot.command('stoplisten', async ({ reply, from: { id: resChatId } }) => {
    await stopListenAccount(reply, resChatId);
  });

  bot.command('run', async ({ reply, from: { id: resChatId } }) => {
    await start(reply, resChatId);
  });

  bot.command('stop', ({ reply, from: { id: resChatId } }) => {
    stop(reply, resChatId);
  });

  bot.command('addaddress', ({ reply }) => reply('/addAddr Reply tron address to add.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('getaddress', ({ reply, from: { id: resChatId } }) => {
    getAddress(reply, resChatId);
  });

  bot.command('removeaddress', ({ reply }) => reply('/removeAddr Reply tron address to remove.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('schedule', async ({ reply }) => {
    await show(reply);
  });

  bot.command('transfer', ({ reply }) => reply('/transfer Reply password.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('show', ({ reply }) => reply('/show Reply password.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('encrypt', async ({ reply, from: { id: resChatId }, message: { text } }) => {
    if (myChatId === resChatId) {
      const [password] = (text || '').split(' ');
      encrypt(password);
      reply('updated.');
    } else {
      reply('Unauthorized user.');
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
              reply(`Error Occured: ${JSON.stringify(err)}`);
            }
          } else {
            reply('Unauthorized user.');
          }
        }

        if (text.startsWith('/show')) {
          if (myChatId === resChatId) {
            try {
              const password = message.text;
              await showBalances(reply, password);
            } catch (err) {
              reply(`Error Occured: ${JSON.stringify(err)}`);
            }
          } else {
            reply('Unauthorized user.');
          }
        }

        if (text.startsWith('/addaddress')) {
          try {
            const address = message.text;
            await addAddress(resChatId, address, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/removeaddress')) {
          try {
            const address = message.text;
            await removeAddress(resChatId, address, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/address')) {
          try {
            const address = message.text;
            await showBalance(reply, address);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }
      }
    }
  });

  bot.catch((err) => {
    console.log('Ooops', err);
  });

  bot.startPolling();
  await initListen(bot);

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
