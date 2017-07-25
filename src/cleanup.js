/* eslint-disable semi,space-before-function-paren,spaced-comment */
// Object to capture process exits and call app specific cleanup function
const noop = function () {
}

module.exports = callback => {
  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || noop

  process.on('cleanup', callback)

  // do app specific cleaning before exiting
  process.on('exit', function () {
    process.emit('cleanup')
  })

  // catch ctrl+c event and exit normally
  process.on('SIGINT', function () {
    console.log('Ctrl-C...')
    process.exit(2)
  })

  // catch uncaught exceptions, trace, then exit normally
  process.on('uncaughtException', function (e) {
    console.log('Uncaught Exception...')
    console.log(e.stack)
    process.exit(99)
  })
}