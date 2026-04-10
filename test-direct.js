const { app } = require('electron')
console.log('app type:', typeof app)
console.log('app.getVersion:', typeof app.getVersion)
if (app) {
  app.whenReady().then(() => {
    console.log('App ready!')
    app.quit()
  })
}
