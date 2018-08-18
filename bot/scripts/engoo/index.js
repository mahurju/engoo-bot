const nconf = require('nconf');
const axios = require('axios');
const moment = require('moment');
const schedule = require('node-schedule');

// const { myChatId } = nconf.get('telegram');
let bot = null;
const jobs = {};

const getSchedules = async (chatId) => {
  console.log(chatId);

  const { api, teachers } = nconf.get('engoo');
  const allSchedules = {};
  for (const teacherNum of teachers) {
    console.log(`TeacherNumber: ${teacherNum} ====================`);
    const res = await axios.get(`${api}/${teacherNum}.json`);
    const { teacher, schedules } = res.data;
    const name = teacher.teacher_name;
    console.log(`teacher: ${name}`);
    const today = moment().format('YYYY-MM-DD');
    const result = schedules.result.filter((data) => {
      const { lesson_date: lessenDate, status } = data;
      return today === lessenDate && status === 0;
    });
    if (result.length) {
      allSchedules[name] = {
        url: `https://engoo.co.kr/teachers/${teacherNum}`,
        startTime: result.map((data) => {
          const time = data.scheduled_start_time;
          return time.substring(0, 5);
        }).join(', '),
      };
    }
  }
  return allSchedules;
};

const sendResult = async (schedules, chatId) => {
  if (Object.keys(schedules).length > 0) {
    bot.sendMessage(chatId, JSON.stringify(schedules, null, 2));
  } else {
    bot.sendMessage(chatId, 'There is no available schedules.');
  }
};

const run = async (chatId) => {
  const schedules = await getSchedules(chatId);
  sendResult(schedules, chatId);
};

exports.show = run;

exports.start = async (chatId) => {
  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      return bot.sendMessage(chatId, 'engoo job is running now.');  
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/1 * * * *', async () => {
      await run(chatId);
    }),
  };
  return bot.sendMessage(chatId, 'engoo job started.');
};

exports.stop = (chatId) => {
  const { job = {} } = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job.nextInvocation()) {
    return bot.sendMessage(chatId, 'engoo job is not running.');
  }

  job.cancel();
  return bot.sendMessage(chatId, 'engoo job stopped.');
};

exports.setBot = (telegramBot) => {
  bot = telegramBot;
};
