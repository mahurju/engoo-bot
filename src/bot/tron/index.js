const { ...show } = require('./show');
const { ...move } = require('./move');
const { ...address } = require('./address.service');

module.exports = {
  ...show,
  ...move,
  ...address,
};
