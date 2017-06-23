/* eslint-disable no-undef */
require('./common.spec')
const Logger = require('../src/logger')
const TestString = 'Test String';

describe('Logger', () => {
  it('should log a message to the console', () => {
    let sut = Logger('label', 'node');
    let spy = sinon.spy(console, 'log');

    sut.debug(TestString);

    expect(spy.calledOnce);
    expect(spy.calledWithMatch(TestString));

    spy.restore();
  });
});
