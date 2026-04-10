import { Tray, Menu, app, nativeImage } from 'electron'
import { join } from 'path'
import { createLogger } from './services/logger'
import type { WindowManager } from './windows'

const logger = createLogger('tray')

export class TrayManager {
  private tray: Tray | null = null

  constructor(private readonly windowManager: WindowManager) {}

  create(): void {
    // Use a template image (monochrome) for proper dark/light menu bar support
    const iconPath = join(__dirname, '../../resources/tray-icon.png')
    let icon: Electron.NativeImage

    try {
      icon = nativeImage.createFromPath(iconPath)
      // Resize to proper tray size on macOS (18x18 pts = 36x36 @2x)
      icon = icon.resize({ width: 18, height: 18 })
      icon.setTemplateImage(true)
    } catch {
      // Fallback: create a simple circle icon programmatically
      icon = nativeImage.createEmpty()
    }

    this.tray = new Tray(icon)
    this.tray.setToolTip('Agent')
    this.updateMenu()

    this.tray.on('click', () => {
      const pill = this.windowManager.getPillWindow()
      if (pill?.isVisible()) {
        pill.hide()
      } else {
        this.windowManager.setMode('pill')
      }
    })

    this.tray.on('right-click', () => {
      this.tray?.popUpContextMenu()
    })

    logger.info('Tray created')
  }

  updateMenu(): void {
    if (!this.tray) return

    const menu = Menu.buildFromTemplate([
      {
        label: 'Show Agent',
        click: () => this.windowManager.setMode('pill')
      },
      {
        label: 'Open Chat',
        click: () => this.windowManager.setMode('expanded')
      },
      {
        label: 'Start Listening',
        click: () => {
          this.windowManager.getPillWindow()?.webContents.send('voice:start')
        }
      },
      { type: 'separator' },
      {
        label: 'Daily Briefing',
        click: () => {
          this.windowManager.setMode('expanded').then(() => {
            this.windowManager.getExpandedWindow()?.webContents.send('chat:send-command', '/briefing')
          })
        }
      },
      { type: 'separator' },
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+,',
        click: () => this.windowManager.setMode('settings')
      },
      {
        label: 'Check for Updates',
        click: () => {
          // Auto-updater logic
          this.windowManager.broadcastToAll('app:check-update')
        }
      },
      { type: 'separator' },
      {
        label: 'Quit Agent',
        accelerator: 'CommandOrControl+Q',
        click: () => app.quit()
      }
    ])

    this.tray.setContextMenu(menu)
  }

  destroy(): void {
    this.tray?.destroy()
    this.tray = null
  }
}
