const nconf = require('nconf');
const axios = require('axios');
const schedule = require('node-schedule');
const stringify = require('json-stable-stringify');
const users = require('../../db')();

const { api, photo } = nconf.get('engoo');
let bot = null;
const jobs = {};

const getTeacher = async (teacherNum) => {
  const res = await axios.get(`${api}/${teacherNum}.json`);
  const { teacher, schedules } = res.data;
  console.log(teacher);
  const { teacher_name: name, image, youtube } = teacher;

  const result = schedules.result.map((data) => {
    const { lesson_date: lessenDate, scheduled_start_time: startTime } = data;
    return { lessenDate, startTime: startTime.substring(0, 5) };
  }).reduce((prev, next) => {
    const { lessenDate, startTime } = next;
    if (!prev[lessenDate]) prev[lessenDate] = [];
    prev[lessenDate].push(startTime);
    return prev;
  }, {});
  console.log({ name, image: image.split('/').filter(data => data !== 'image').join('/'), youtube, schedules: result });

  return { name, image, youtube, schedules: result };
};

const getSchedules = async (chatId) => {
  const result = await users.child(`/engoo/${chatId}/teacher`).once('value');
  console.log(result.val());
  const teachers = result.val();
  if (!teachers) return bot.telegram.sendMessage(chatId, 'Not find teacher.');
  
  await Promise.all(Object.keys(teachers).map(async (teacherNum) => {
    console.log(`TeacherNumber: ${teacherNum} ====================`);
    const { schedules, name } = await getTeacher(teacherNum);
    console.log(name, schedules);
    const preSchedules = teachers[teacherNum].schedules || {};

    if (stringify(preSchedules) !== stringify(schedules)) {
      const updates = {};
      updates[`/engoo/${chatId}/teacher/${teacherNum}/schedules`] = schedules;
      updates[`/engoo/${chatId}/teacher/${teacherNum}/updateTime`] = new Date();
      users.update(updates);

      if (Object.keys(schedules).length > 0) {
        let msg = `<b>* ${name} teatcher</b>\n<b>New Schedule has been updated</b>`;
        Object.keys(schedules).reduce((prev, next) => {
          msg += `\n\n<b>* ${next}</b>\n`;
          msg += schedules[next].join('\n');
          return msg;
        }, msg);
        bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
      } else {
        bot.telegram.sendMessage(chatId, 'Schdules are not found.');
      }
    }
  }));
};

exports.add = async (chatId, teacherNum, reply) => {
  const data = await users.child(`/engoo/${chatId}/teacher`).once('value');
  console.log(data.val());
  const updates = {};
  const teacher = data.val() || {};
  if (teacher[teacherNum]) {
    return reply('Already added teacher.');
  }

  const { name, image, youtube, schedules } = await getTeacher(teacherNum);
  teacher[teacherNum] = {
    name,
    image,
    youtube,
    schedules,
    createTime: new Date(),
  };
  updates[`/engoo/${chatId}/teacher`] = teacher;
  users.update(updates);
  console.log(`${photo}${image}`);
  // return bot.telegram.sendPhoto(chatId, `${photo}${image}`);
  return reply(`${name} added.`);
};

exports.get = async (reply, chatId) => {
  const data = await users.child(`/engoo/${chatId}/teacher`).once('value');
  console.log(data.val());
  const teacher = data.val() || {};
  if (Object.keys(teacher).length === 0) {
    return reply('No added teacher.');
  }
  
  let msg = '<b>[Teacher List]</b>\n\n';
  msg = Object.keys(teacher).reduce((prev, next) => {
    msg += `- ${teacher[next].name}\n`;
    return msg;
  }, msg);
  return reply(msg, { parse_mode: 'HTML' });
};


exports.remove = async (chatId, teacherNum, reply) => {
  const data = await users.child(`/engoo/${chatId}/teacher`).once('value');
  console.log(data.val());
  const updates = {};
  const teacher = data.val() || {};
  if (teacher[teacherNum]) {
    updates[`/engoo/${chatId}/teacher/${teacherNum}`] = null;
    users.update(updates);
    if (Object.keys(teacher).length === 1) {
      this.stopListen(reply, chatId);
    }
    return reply(`${teacherNum} removed.`);
  }
  return reply('Not found teacher.');
};

exports.startListen = async (chatId, send = true) => {
  const data = await users.child(`/engoo/${chatId}/teacher`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return bot.telegram.sendMessage(chatId, 'Not found teacher to start.');

  if (jobs[chatId]) {
    const { job } = jobs[chatId];
    if (job && job.nextInvocation()) {
      if (send) return bot.telegram.sendMessage(chatId, 'Your teachers are already listening now..');
      return false;
    }
  }

  jobs[chatId] = {
    job: schedule.scheduleJob('*/10 * * * * *', async () => {
      await getSchedules(chatId);
    }),
  };
  const updates = {};
  updates[`/engoo/${chatId}/listenChange`] = true;
  users.update(updates);
  if (send) return bot.telegram.sendMessage(chatId, 'Your teachers are to start listen.');
  return false;
};

exports.stopListen = (reply, chatId) => {
  const { job = {} } = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job.nextInvocation()) {
    return reply('Your teachers jobs are not running.');
  }

  job.cancel();
  const updates = {};
  updates[`/engoo/${chatId}/listenChange`] = false;
  users.update(updates);
  return reply('Your teachers are to stop listen.');
};


exports.initListen = async (myBot) => {
  bot = myBot;
  const data = await users.child('/engoo').once('value');
  const allUsers = data.val();
  console.log(allUsers);
  for (const chatId of Object.keys(allUsers)) {
    const { listenChange } = allUsers[chatId] || {};
    if (listenChange === true) {
      await this.startListen(chatId, false);
    }
  }
};

exports.schedule = async (reply, teacherNum) => {
  const { name, schedules } = await getTeacher(teacherNum);
  if (Object.keys(schedules).length > 0) {
    let msg = `<b>* ${name} teatcher schedules</b>`;
    Object.keys(schedules).reduce((prev, next) => {
      msg += `\n\n<b>* ${next}</b>\n`;
      msg += schedules[next].join('\n');
      return msg;
    }, msg);
    reply(msg, { parse_mode: 'HTML' });
  } else {
    reply('Schdules are not found.');
  }
};
