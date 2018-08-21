const nconf = require('nconf');
const axios = require('axios');
const moment = require('moment');
const schedule = require('node-schedule');

const jobs = {};

const getSchedules = async () => {
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

const sendResult = async (reply, schedules) => {
  if (Object.keys(schedules).length > 0) {
    reply(JSON.stringify(schedules, null, 2));
  } else {
    reply('There is no available schedules.');
  }
};

const run = async (reply) => {
  const schedules = await getSchedules();
  sendResult(reply, schedules);
};

exports.show = run;

exports.start = async (reply, chatId) => {
  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      return reply('engoo job is running now.');  
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/1 * * * *', async () => {
      await run(reply);
    }),
  };
  return reply('engoo job started.');
};

exports.stop = (reply, chatId) => {
  const { job = {} } = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job.nextInvocation()) {
    return reply('engoo job is not running.');
  }

  job.cancel();
  return reply('engoo job stopped.');
};

// exports.setBot = (telegramBot) => {
//   bot = telegramBot;
// };
