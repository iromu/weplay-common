'use strict';

var _LoggerFactory = require('../main/LoggerFactory');

var _LoggerFactory2 = _interopRequireDefault(_LoggerFactory);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/* eslint-disable no-undef */
require('./common.spec');


var TestString = 'Test String';

describe('Logger', function () {
  it('should log a message to the console', function () {
    var sut = _LoggerFactory2.default.get('label', 'node');
    var spy = sinon.spy(console, 'log');

    sut.debug(TestString);

    expect(spy.calledOnce);
    expect(spy.calledWithMatch(TestString));

    spy.restore();
  });
});