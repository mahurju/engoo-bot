const Telegraf = require('telegraf');
const nconf = require('nconf');
const { add, get, remove, startListen, stopListen, initListen, schedule, setAlarmOff } = require('./engoo');

const { token } = nconf.get('telegram');
const bot = new Telegraf(token);

const run = async () => {
  const hasBotCommands = (entities) => {
    if (!entities || !(entities instanceof Array)) {
      return false;
    }
  
    return entities.some(e => e.type === 'bot_command');
  };

  const helpMsg = ['/addteacher Add Teacher',
    '/getteacher Show Teacher List',
    '/removeteacher Remove Teacher',
    '/startlisten Start Teacher schedule change notification',
    '/stoplisten Stop Teacher schedule change notification',
    '/schedule Show Teacher Schedules',
    '/setalarmoff Set alarm off time range'];

  bot.help(ctx => ctx.reply(helpMsg.join('\n')));
  bot.start(ctx => ctx.reply(helpMsg.join('\n')));

  bot.command('addteacher', ({ reply }) => reply('/addteacher Reply teacher number to add.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('schedule', async ({ reply, from: { id: resChatId } }) => {
    await schedule(reply, resChatId);
  });

  bot.command('getteacher', async ({ reply, from: { id: resChatId } }) => {
    await get(reply, resChatId);
  });

  bot.command('removeteacher', ({ reply }) => reply('/removeteacher Reply teacher number to remove.', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('setalarmoff', ({ reply }) => reply('/setalarmoff Reply alarm off time range.\n(ex. 23-06)', { reply_markup: { force_reply: true, selective: true } }));

  bot.command('startlisten', async ({ from: { id: resChatId } }) => {
    await startListen(resChatId);
  });

  bot.command('stoplisten', async ({ reply, from: { id: resChatId } }) => {
    await stopListen(reply, resChatId);
  });

  bot.on('message', async (ctx) => {
    const { message, reply } = ctx;
    const resChatId = ctx.from.id;
    if (!hasBotCommands(message.entities)) {
      console.log(JSON.stringify(message, null, 2));
      const { reply_to_message } = message;
      if (reply_to_message) {
        const { text } = reply_to_message;

        if (text.startsWith('/addteacher')) {
          try {
            const teacherNum = message.text;
            await add(resChatId, teacherNum, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/removeteacher')) {
          try {
            const teacherNum = message.text;
            await remove(resChatId, teacherNum, reply);
          } catch (err) {
            reply(`Error Occured: ${JSON.stringify(err)}`);
          }
        }

        if (text.startsWith('/setalarmoff')) {
          try {
            const timeRange = message.text;
            await setAlarmOff(resChatId, timeRange, reply);
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
};

module.exports = async () => {
  await run();
};
