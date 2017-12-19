'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var uri = process.env.WEPLAY_REDIS_URI || 'localhost:6379'; /* eslint-disable semi,space-before-function-paren,spaced-comment */


var pieces = uri.split(':');
var host = pieces[0];
var port = pieces[1] || 6379;

exports.default = function () {
  var redisClient = _redis2.default.createClient(port, host, { return_buffers: true });
  redisClient.on('connect', function () {
    console.log('Redis connected to', { host: host, port: port });
  });
  redisClient.on('error', function (err) {
    console.error('Redis error ', err);
  });
  return redisClient;
};