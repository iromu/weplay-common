/* eslint-disable no-undef */
require('./common.spec')
import LoggerFactory from '../src/LoggerFactory'

const TestString = 'Test String'

describe('Logger', () => {
  it('should log a message to the console', () => {
    let sut = LoggerFactory.get('label', 'node')
    let spy = sinon.spy(console, 'log')

    sut.debug(TestString)

    expect(spy.calledOnce)
    expect(spy.calledWithMatch(TestString))

    spy.restore()
  })
})
