/* eslint-disable global-require */
const nconf = require('nconf');

module.exports = () => {
  process.env.API_URL = 'https://api.tronscan.org';

  nconf.file('local', {
    file: `${__dirname}/local.yml`,
    format: require('nconf-yaml'),
  });
  
  if (process.env.TOKEN) {
    nconf.set('telegram:token', process.env.TOKEN);
  }

  if (process.env.CRYPTO_PASSWORD) {
    nconf.set('telegram:password', process.env.TOKEN);
  }

  nconf.file('common', {
    file: `${__dirname}/default.yml`,
    format: require('nconf-yaml'),
  });
};