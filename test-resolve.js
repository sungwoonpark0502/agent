const Module = require('module')
// Check original resolve behavior
console.log('resolve electron:', Module._resolveFilename('electron', module))
console.log('resolve path:', Module._resolveFilename('path', module))

// Check if resolve is patched
const original = Module._resolveFilename.toString()
console.log('resolve fn length:', original.length)
console.log('first 100 chars:', original.slice(0, 100))
