import { app, BrowserWindow, ipcMain, globalShortcut, nativeTheme } from 'electron'
import { join } from 'path'
import { createLogger } from './services/logger'
import { WindowManager } from './windows'
import { TrayManager } from './tray'
import { DatabaseService } from './services/database'
import { KeychainService } from './services/keychain'
import { SettingsService } from './services/settings'
import { registerIPCHandlers } from './ipc/handlers'
import { TimerService } from './services/timer'
import { ClipboardService } from './services/clipboard'
import { autoUpdater } from 'electron-updater'

const logger = createLogger('main')

// ─── Single instance lock ────────────────────────────────────────────────────

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  logger.info('Another instance is running, quitting')
  app.quit()
  process.exit(0)
}

// ─── App ready ───────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  logger.info('App ready, initializing services')

  // Initialize core services
  const db = DatabaseService.getInstance()
  await db.initialize()

  const keychain = KeychainService.getInstance()
  const settings = SettingsService.getInstance(db)
  await settings.load()

  const windowManager = new WindowManager(settings)
  const trayManager = new TrayManager(windowManager)
  const timerService = TimerService.getInstance()
  const clipboardService = ClipboardService.getInstance(db, settings)

  // Register IPC handlers
  registerIPCHandlers({ db, keychain, settings, windowManager, trayManager, timerService })

  // Start clipboard monitoring
  clipboardService.start()

  // Create initial windows
  await windowManager.createPillWindow()
  trayManager.create()

  // Register Cmd+K: open/focus expanded view (wake shortcut)
  globalShortcut.register('CommandOrControl+K', async () => {
    const expanded = windowManager.getExpandedWindow()
    if (expanded?.isVisible()) {
      expanded.webContents.send('command-palette:open')
    } else {
      await windowManager.setMode('expanded')
    }
  })

  // Register global shortcut for push-to-talk / voice activation
  const pttKey = settings.get('pushToTalkKey')
  if (pttKey && pttKey !== 'Option+Space') {
    try {
      globalShortcut.register(pttKey, async () => {
        // Open expanded and trigger voice
        await windowManager.setMode('expanded')
        windowManager.getExpandedWindow()?.webContents.send('voice:ptt-trigger')
      })
    } catch (err) {
      logger.warn({ err, pttKey }, 'Failed to register push-to-talk shortcut')
    }
  }

  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    const theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light'
    windowManager.broadcastToAll('theme:changed', theme)
  })

  // macOS: re-create window if dock icon clicked with no windows
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await windowManager.createPillWindow()
    }
  })

  // Auto-updater (only in production)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch(err => {
      logger.warn({ err }, 'Auto-update check failed')
    })

    autoUpdater.on('update-available', () => {
      windowManager.broadcastToAll('updater:available')
    })
    autoUpdater.on('update-downloaded', () => {
      windowManager.broadcastToAll('updater:downloaded')
    })
    autoUpdater.on('error', (err) => {
      logger.warn({ err }, 'Auto-updater error')
    })
  }

  // Register updater IPC
  ipcMain.on('updater:install', () => {
    autoUpdater.quitAndInstall()
  })

  logger.info('Agent initialized successfully')
})

// ─── Second instance ─────────────────────────────────────────────────────────

app.on('second-instance', () => {
  // Someone tried to open a second instance — show the existing pill
  const pill = global.__windowManager?.getPillWindow()
  if (pill) {
    pill.show()
    pill.focus()
  }
})

// ─── Before quit ─────────────────────────────────────────────────────────────

app.on('before-quit', () => {
  logger.info('App quitting')
  globalShortcut.unregisterAll()
  const db = DatabaseService.getInstance()
  const settings = SettingsService.getInstance(db)
  ClipboardService.getInstance(db, settings).clearOnQuit()
  ClipboardService.getInstance(db, settings).stop()
  db.close()
})

// ─── Window all closed ───────────────────────────────────────────────────────

app.on('window-all-closed', () => {
  // On macOS, keep running even with no windows (lives in tray)
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// ─── Prevent navigation / new windows ────────────────────────────────────────

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault()
      logger.warn({ url }, 'Blocked navigation attempt')
    }
  })

  contents.setWindowOpenHandler(({ url }) => {
    // Open external URLs in the default browser
    if (url.startsWith('https://') || url.startsWith('http://')) {
      require('electron').shell.openExternal(url)
    }
    return { action: 'deny' }
  })
})

// ─── Unhandled errors ────────────────────────────────────────────────────────

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception in main process')
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection in main process')
})
