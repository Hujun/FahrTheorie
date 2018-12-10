const creds = require('./creds.json');

var config = {};

// ATTENTION: when headless mode is false, PDF printing not work
config.headless = true;
// 'pdf' | 'png'
config.outputType = 'png';
config.homeUrl = 'https://www.theorie24.ch';
// multi-language selection for 'de' | 'fr' | 'it'
config.language = 'de'
config.username = creds.username || '';
config.password = creds.password || '';

module.exports = config;