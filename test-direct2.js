try {
  const { app } = require('electron')
  console.log('app type:', typeof app)
  app.whenReady().then(() => { console.log('ready!'); app.quit() })
} catch(e) {
  console.log('error:', e.message)
}
