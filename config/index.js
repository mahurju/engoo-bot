/* eslint-disable global-require */
const nconf = require('nconf');

module.exports = () => {
  process.env.API_URL = 'https://api.tronscan.org';

  nconf.file('local', {
    file: `${__dirname}/local.yml`,
    format: require('nconf-yaml'),
  });

  nconf.file('common', {
    file: `${__dirname}/default.yml`,
    format: require('nconf-yaml'),
  });
};
