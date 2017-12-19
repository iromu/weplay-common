'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
process.env.NODE_ENV = 'test';

global.chai = require('chai');
global.chai.should();
global.chai.config.truncateThreshold = 0;
global.expect = global.chai.expect;
global.sinon = require('sinon');

global.sinonChai = require('sinon-chai');
global.chai.use(global.sinonChai);

// ports used in this test
var latestPort = 50000;
var ports = Array.from({ length: 100 }, function () {
  return latestPort++;
});

exports.default = ports;