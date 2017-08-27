/* eslint-disable semi,space-before-function-paren,spaced-comment */
// Object to capture process exits and call app specific cleanup function
const noop = () => {
}

export default callback => {
  // attach user callback to the process event emitter
  // if no callback, it will still exit gracefully on Ctrl-C
  callback = callback || noop

  process.on('cleanup', callback)

  // do app specific cleaning before exiting
  process.on('exit', () => {
    console.log('Exit..')
    process.emit('cleanup')
  })

  // catch ctrl+c event and exit normally, cleaning before exiting
  process.on('SIGINT', () => {
    console.log('Ctrl-C...')
    process.emit('cleanup')
    process.exit(2)
  })

  // catch uncaught exceptions, trace, then exit normally, cleaning before exiting
  process.on('uncaughtException', e => {
    console.log('Uncaught Exception...')
    console.log(e.stack)
    process.emit('cleanup')
    process.exit(99)
  })
}
