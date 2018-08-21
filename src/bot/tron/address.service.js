const users = require('../../db')('users');

exports.addAddress = async (chatId, addr, reply) => {
  const data = await users.child(`/${chatId}/address`).once('value');
  console.log(data.val());
  const updates = {};
  const address = data.val() || [];
  if (address.indexOf(addr) > -1) {
    return reply('이미 추가된 주소입니다.');
  }
  address.push(addr);
  updates[`/${chatId}/address`] = address;
  users.update(updates);
  return reply(`${addr} 주소가 추가되었습니다.`);
};

exports.getAddresses = async (reply, chatId) => {
  const data = await users.child(`/${chatId}/address`).once('value');
  const address = data.val() || [];
  if (address.length === 0) return reply('추가된 주소가 없습니다.');
  return reply(address.join('\n'));
};

exports.gets = async () => {

};

exports.remove = async () => {

};
