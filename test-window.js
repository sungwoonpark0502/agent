const e = require('electron')
console.log('electron type:', typeof e)
if (typeof e === 'object' && e.app) {
  e.app.whenReady().then(() => {
    console.log('READY')
    const win = new e.BrowserWindow({ width: 400, height: 300 })
    win.loadURL('data:text/html,<h1>Test</h1>')
    setTimeout(() => { e.app.quit() }, 3000)
  })
} else {
  console.log('electron is:', typeof e === 'string' ? 'path:' + e.slice(-30) : typeof e)
  process.exit(1)
}
