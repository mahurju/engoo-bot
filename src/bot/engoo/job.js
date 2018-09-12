const nconf = require('nconf');
const axios = require('axios');
const schedule = require('node-schedule');
const stringify = require('json-stable-stringify');
const moment = require('moment-timezone');
const users = require('../../db')();

const { api } = nconf.get('engoo');
let bot = null;
const jobs = {};

const getTeacher = async (teacherNum) => {
  const res = await axios.get(`${api}${teacherNum}.json`);
  
  const { schedules } = res.data;
  console.log(`${api}${teacherNum}.json`);
  // console.log(JSON.stringify(res.data, null, 2));
  // console.log('test', JSON.stringify(teacher, null, 2), JSON.stringify(schedules, null, 2));
  // const { teacher_name: name, image, youtube } = teacher || {};

  const schedulesMap = schedules.result.map((data) => {
    const { lesson_date: lessenDate, scheduled_start_time: startTime, status } = data;
    return { lessenDate, startTime: startTime.substring(0, 5), status };
  });
  
  const result = schedulesMap.reduce((prev, next) => {
    const { lessenDate, startTime } = next;
    if (!prev[lessenDate]) prev[lessenDate] = [];
    prev[lessenDate].push(startTime);
    return prev;
  }, {});

  const resultWithStatus = schedulesMap.reduce((prev, next) => {
    const { lessenDate, startTime, status } = next;
    if (!prev[lessenDate]) prev[lessenDate] = {};
    prev[lessenDate][startTime] = status === 0 ? '예약 가능' : '예약됨';
    return prev;
  }, {});


  // console.log({ name, image: (image || []).split('/').filter(data => data !== 'image').join('/'), youtube, schedules: result });

  return { schedules: result, schedulesWithStatus: resultWithStatus };
};

const checkAlarmOff = async (chatId) => {
  const result = await users.child(`/engoo/${chatId}/alarmOffTime`).once('value');
  const alarmOffTime = result.val();
  console.log('alarmOffTime', alarmOffTime);
  if (!alarmOffTime) {
    console.log('now is alarm on time.');
    return true;
  }

  const [start, end] = alarmOffTime.split('-');
  const startTime = moment().tz('Asia/Seoul');
  startTime.hours(parseInt(start, 10));
  startTime.minutes(0);
  startTime.second(0);

  const endTime = moment().tz('Asia/Seoul');
  endTime.hours(parseInt(end, 10));
  endTime.minutes(0);
  endTime.second(0);

  const now = moment().tz('Asia/Seoul');

  if (now.isAfter(startTime) && now.isBefore(endTime)) {
    console.log('now is alarm off time.');
    return false;
  }

  console.log('now is alarm on time.');
  return true;
};

const getSchedules = async (chatId) => {
  const res = await checkAlarmOff(chatId);
  if (!res) return;

  const result = await users.child(`/engoo/${chatId}/teacher`).once('value');
  // console.log(result.val());
  const teachers = result.val();
  if (!teachers) {
    bot.telegram.sendMessage(chatId, 'Not found teacher.');
    return;
  }

  await Promise.all(Object.keys(teachers).map(async (teacherNum) => {
    // console.log(`TeacherNumber: ${teacherNum} ====================`);
    const { schedules, schedulesWithStatus } = await getTeacher(teacherNum);
    // console.log('remote', schedules);
    const preSchedules = teachers[teacherNum].schedules || {};
    // console.log('before', preSchedules);
    if (Object.keys(preSchedules).length > 0) {
      Object.keys(preSchedules).map((date) => {
        const scheduleDate = moment(date);
        const today = moment().startOf('day');

        if (scheduleDate.isBefore(today)) {
          // console.log('delete date....', date);
          delete preSchedules[date];
        }
      });
    }
    // console.log('after', preSchedules);

    if (stringify(preSchedules) !== stringify(schedules)) {
      const updates = {};
      updates[`/engoo/${chatId}/teacher/${teacherNum}/schedules`] = schedules;
      updates[`/engoo/${chatId}/teacher/${teacherNum}/updateTime`] = new Date();
      users.update(updates);

      if (Object.keys(schedulesWithStatus).length > 0) {
        let msg = `<b>* TeacherNumber: ${teacherNum}</b>\n<b>New Schedule has been updated</b>\n\nhttps://engoo.co.kr/teachers/${teacherNum}`;
        Object.keys(schedulesWithStatus).reduce((prev, next) => {
          msg += `\n\n<b>* ${next}</b>\n`;
          const date = next;
          Object.keys(schedulesWithStatus[date]).reduce((prev2, next2) => {
            msg += `- ${next2}: ${schedulesWithStatus[date][next2]}\n`;
            return msg;
          }, msg);
          return msg;
        }, msg);
        bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
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

  const { schedules, schedulesWithStatus } = await getTeacher(teacherNum);
  teacher[teacherNum] = {
    schedules,
    createTime: new Date(),
  };
  updates[`/engoo/${chatId}/teacher`] = teacher;
  users.update(updates);

  let msg = `<b>* TeacherNumber: ${teacherNum}</b>\nhttps://engoo.co.kr/teachers/${teacherNum}`;
  if (Object.keys(schedulesWithStatus).length > 0) {
    Object.keys(schedulesWithStatus).reduce((prev, next) => {
      msg += `\n\n<b>* ${next}</b>\n`;
      const date = next;
      Object.keys(schedulesWithStatus[date]).reduce((prev2, next2) => {
        msg += `- ${next2}: ${schedulesWithStatus[date][next2]}\n`;
        return msg;
      }, msg);
      return msg;
    }, msg);
  }

  msg += `\n\n${teacherNum} added.`;
  reply(msg, { parse_mode: 'HTML' });
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
    msg += `* ${teacher[next].name} - ${next}\n`;
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

exports.setAlarmOff = async (chatId, timeRange = '', reply) => {
  const pattern = /^\d{2}-\d{2}$/;
  if (timeRange !== 'none' && !pattern.test(timeRange)) {
    return reply('invalid time range\n(ex. 23-06)');
  }
  const updates = {};
  updates[`/engoo/${chatId}/alarmOffTime`] = timeRange === 'none' ? null : timeRange;
  users.update(updates);
  reply(`Set alarm off time to ${timeRange}`);
  return false;
};

exports.startListen = async (chatId, send = true) => {
  const data = await users.child(`/engoo/${chatId}/teacher`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return bot.telegram.sendMessage(chatId, 'Not found teacher to start.');

  if (jobs[chatId]) {
    const job = jobs[chatId];
    if (job && job.nextInvocation()) {
      if (send) return bot.telegram.sendMessage(chatId, 'Your teachers are already listening now..');
      return false;
    }
  }

  jobs[chatId] = schedule.scheduleJob('*/20 * * * * *', async () => {
    await getSchedules(chatId);
  });

  const updates = {};
  updates[`/engoo/${chatId}/listenChange`] = true;
  users.update(updates);
  if (send) return bot.telegram.sendMessage(chatId, 'Your teachers are to start listen.');
  return false;
};

exports.stopListen = (reply, chatId) => {
  const job = jobs[chatId];

  console.log(job && job.nextInvocation());

  if (!job || !job.nextInvocation()) {
    return reply('Your teachers jobs are not running.');
  }

  job.cancel();
  jobs[chatId] = null;
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

exports.schedule = async (reply, chatId) => {
  const result = await users.child(`/engoo/${chatId}/teacher`).once('value');
  console.log(result.val());
  const teachers = result.val();
  if (!teachers) return bot.telegram.sendMessage(chatId, 'Not find teacher.');
  
  await Promise.all(Object.keys(teachers).map(async (teacherNum) => {
    console.log(`TeacherNumber: ${teacherNum} ====================`);
    const { schedules, schedulesWithStatus } = await getTeacher(teacherNum);

    const updates = {};
    updates[`/engoo/${chatId}/teacher/${teacherNum}/schedules`] = schedules;
    updates[`/engoo/${chatId}/teacher/${teacherNum}/updateTime`] = new Date();
    users.update(updates);

    let msg = `<b>* TeacherNumber: ${teacherNum}</b>\nhttps://engoo.co.kr/teachers/${teacherNum}`;
    if (Object.keys(schedulesWithStatus).length > 0) {
      Object.keys(schedulesWithStatus).reduce((prev, next) => {
        msg += `\n\n<b>* ${next}</b>\n`;
        const date = next;
        Object.keys(schedulesWithStatus[date]).reduce((prev2, next2) => {
          msg += `- ${next2}: ${schedulesWithStatus[date][next2]}\n`;
          return msg;
        }, msg);
        return msg;
      }, msg);
      bot.telegram.sendMessage(chatId, msg, { parse_mode: 'HTML' });
    } else {
      bot.telegram.sendMessage(chatId, msg += '\n\nSchdules are not found.', { parse_mode: 'HTML' });
    }
  }));
};
