import { BrowserWindow, screen, app } from 'electron'
import { join } from 'path'
import { createLogger } from './services/logger'
import type { SettingsService } from './services/settings'
import type { WindowMode, PillPosition } from '../shared/types'

const logger = createLogger('windows')

const PILL_WIDTH = 280
const PILL_HEIGHT = 44
const EXPANDED_WIDTH = 420
const EXPANDED_HEIGHT = 620
const EXPANDED_MIN_HEIGHT = 300
const EXPANDED_MAX_WIDTH = 600
const EXPANDED_MAX_HEIGHT = 800
const EDGE_MARGIN = 16

function getPreloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function getRendererURL(hash = ''): string {
  const devURL = process.env['ELECTRON_RENDERER_URL']
  if (devURL) {
    return devURL + (hash ? `#${hash}` : '')
  }
  return 'file://' + join(__dirname, '../renderer/index.html') + (hash ? `#${hash}` : '')
}

export class WindowManager {
  private pillWindow: BrowserWindow | null = null
  private expandedWindow: BrowserWindow | null = null
  private fullscreenWindow: BrowserWindow | null = null
  private settingsWindow: BrowserWindow | null = null

  constructor(private readonly settings: SettingsService) {
    // Store reference globally for second-instance handler
    ;(global as Record<string, unknown>).__windowManager = this
  }

  // ─── Pill Window ────────────────────────────────────────────────────────────

  async createPillWindow(): Promise<BrowserWindow> {
    if (this.pillWindow && !this.pillWindow.isDestroyed()) {
      this.pillWindow.show()
      return this.pillWindow
    }

    const position = this.calculatePillPosition()

    this.pillWindow = new BrowserWindow({
      width: PILL_WIDTH,
      height: PILL_HEIGHT,
      x: position.x,
      y: position.y,
      frame: false,
      transparent: true,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      roundedCorners: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        preload: getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    this.pillWindow.loadURL(getRendererURL('pill'))
    this.pillWindow.setAlwaysOnTop(true, 'floating')
    this.pillWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    this.pillWindow.on('closed', () => {
      this.pillWindow = null
    })

    this.pillWindow.on('moved', () => {
      this.savePillPosition()
    })

    // Pill is too small for DevTools

    logger.info({ position }, 'Pill window created')
    return this.pillWindow
  }

  // ─── Expanded Window ─────────────────────────────────────────────────────────

  async createExpandedWindow(): Promise<BrowserWindow> {
    if (this.expandedWindow && !this.expandedWindow.isDestroyed()) {
      this.expandedWindow.show()
      this.expandedWindow.focus()
      return this.expandedWindow
    }

    const pillPos = this.pillWindow?.getPosition() ?? [0, 0]
    const pillBounds = this.pillWindow?.getBounds() ?? { x: 0, y: 0, width: PILL_WIDTH, height: PILL_HEIGHT }
    const position = this.calculateExpandedPosition(pillBounds)

    this.expandedWindow = new BrowserWindow({
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
      x: position.x,
      y: position.y,
      frame: false,
      transparent: true,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      minWidth: EXPANDED_WIDTH,
      minHeight: EXPANDED_MIN_HEIGHT,
      maxWidth: EXPANDED_MAX_WIDTH,
      maxHeight: EXPANDED_MAX_HEIGHT,
      webPreferences: {
        preload: getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    this.expandedWindow.loadURL(getRendererURL('expanded'))
    this.expandedWindow.setAlwaysOnTop(true, 'floating')
    this.expandedWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    this.expandedWindow.on('closed', () => {
      this.expandedWindow = null
    })

    logger.info({ position }, 'Expanded window created')
    return this.expandedWindow
  }

  // ─── Fullscreen Window ────────────────────────────────────────────────────────

  async createFullscreenWindow(): Promise<BrowserWindow> {
    if (this.fullscreenWindow && !this.fullscreenWindow.isDestroyed()) {
      this.fullscreenWindow.show()
      this.fullscreenWindow.focus()
      return this.fullscreenWindow
    }

    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    const width = Math.min(1200, Math.round(screenW * 0.8))
    const height = Math.min(800, Math.round(screenH * 0.8))
    const x = Math.round((screenW - width) / 2)
    const y = Math.round((screenH - height) / 2)

    this.fullscreenWindow = new BrowserWindow({
      width,
      height,
      x,
      y,
      frame: false,
      transparent: true,
      resizable: true,
      alwaysOnTop: true,
      skipTaskbar: false,
      vibrancy: 'under-window',
      visualEffectState: 'active',
      webPreferences: {
        preload: getPreloadPath(),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })

    this.fullscreenWindow.loadURL(getRendererURL('fullscreen'))
    this.fullscreenWindow.setAlwaysOnTop(true, 'floating')

    this.fullscreenWindow.on('closed', () => {
      this.fullscreenWindow = null
    })

    return this.fullscreenWindow
  }

  // ─── Settings Window ─────────────────────────────────────────────────────────

  async openSettings(): Promise<BrowserWindow> {
    if (this.settingsWindow && !this.settingsWindow.isDestroyed()) {
      this.settingsWindow.show()
      this.settingsWindow.focus()
      return this.settingsWindow
    }

    const expanded = this.expandedWindow
    if (expanded && !expanded.isDestroyed()) {
      expanded.webContents.send('settings:open')
      return expanded
    }

    // Open in fullscreen mode with settings view
    const win = await this.createFullscreenWindow()
    win.webContents.send('navigate', 'settings')
    return win
  }

  // ─── Mode switching ───────────────────────────────────────────────────────────

  async setMode(mode: WindowMode): Promise<void> {
    logger.info({ mode }, 'Setting window mode')

    switch (mode) {
      case 'pill':
        this.expandedWindow?.hide()
        this.fullscreenWindow?.hide()
        this.pillWindow?.show()
        break

      case 'expanded':
        await this.createExpandedWindow()
        this.fullscreenWindow?.hide()
        this.pillWindow?.show()
        this.expandedWindow?.show()
        this.expandedWindow?.focus()
        break

      case 'fullscreen':
        await this.createFullscreenWindow()
        this.expandedWindow?.hide()
        this.fullscreenWindow?.show()
        this.fullscreenWindow?.focus()
        break

      case 'settings':
        await this.openSettings()
        break
    }
  }

  // ─── Getters ──────────────────────────────────────────────────────────────────

  getPillWindow(): BrowserWindow | null { return this.pillWindow }
  getExpandedWindow(): BrowserWindow | null { return this.expandedWindow }
  getFullscreenWindow(): BrowserWindow | null { return this.fullscreenWindow }

  repositionPill(): void {
    if (!this.pillWindow || this.pillWindow.isDestroyed()) return
    const { x, y } = this.calculatePillPosition()
    this.pillWindow.setPosition(x, y, true)
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────────

  broadcastToAll(channel: string, ...args: unknown[]): void {
    for (const win of [this.pillWindow, this.expandedWindow, this.fullscreenWindow, this.settingsWindow]) {
      if (win && !win.isDestroyed()) {
        win.webContents.send(channel, ...args)
      }
    }
  }

  // ─── Position helpers ─────────────────────────────────────────────────────────

  private calculatePillPosition(): { x: number; y: number } {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    const position = this.settings.get('pillPosition') as PillPosition
    const offsetX = this.settings.get('pillOffsetX') as number
    const offsetY = this.settings.get('pillOffsetY') as number

    switch (position) {
      case 'top-left':
        return { x: offsetX, y: offsetY }
      case 'top-right':
        return { x: screenW - PILL_WIDTH - offsetX, y: offsetY }
      case 'bottom-left':
        return { x: offsetX, y: screenH - PILL_HEIGHT - offsetY }
      case 'bottom-right':
      default:
        return { x: screenW - PILL_WIDTH - offsetX, y: screenH - PILL_HEIGHT - offsetY }
    }
  }

  private calculateExpandedPosition(pillBounds: { x: number; y: number; width: number; height: number }): { x: number; y: number } {
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize
    const position = this.settings.get('pillPosition') as PillPosition

    let x: number
    let y: number

    switch (position) {
      case 'top-left':
        x = pillBounds.x
        y = pillBounds.y + pillBounds.height + EDGE_MARGIN
        break
      case 'top-right':
        x = pillBounds.x + pillBounds.width - EXPANDED_WIDTH
        y = pillBounds.y + pillBounds.height + EDGE_MARGIN
        break
      case 'bottom-left':
        x = pillBounds.x
        y = pillBounds.y - EXPANDED_HEIGHT - EDGE_MARGIN
        break
      case 'bottom-right':
      default:
        x = pillBounds.x + pillBounds.width - EXPANDED_WIDTH
        y = pillBounds.y - EXPANDED_HEIGHT - EDGE_MARGIN
        break
    }

    // Clamp to screen bounds
    x = Math.max(0, Math.min(x, screenW - EXPANDED_WIDTH))
    y = Math.max(0, Math.min(y, screenH - EXPANDED_MIN_HEIGHT))

    return { x, y }
  }

  private savePillPosition(): void {
    if (!this.pillWindow || this.pillWindow.isDestroyed()) return
    const [x, y] = this.pillWindow.getPosition()
    const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

    // Determine which corner the pill is closest to
    const fromLeft = x
    const fromRight = screenW - x - PILL_WIDTH
    const fromTop = y
    const fromBottom = screenH - y - PILL_HEIGHT

    const isLeft = fromLeft <= fromRight
    const isTop = fromTop <= fromBottom

    let pillPosition: PillPosition
    let offsetX: number
    let offsetY: number

    if (isLeft && isTop) { pillPosition = 'top-left'; offsetX = fromLeft; offsetY = fromTop }
    else if (!isLeft && isTop) { pillPosition = 'top-right'; offsetX = fromRight; offsetY = fromTop }
    else if (isLeft && !isTop) { pillPosition = 'bottom-left'; offsetX = fromLeft; offsetY = fromBottom }
    else { pillPosition = 'bottom-right'; offsetX = fromRight; offsetY = fromBottom }

    this.settings.set('pillPosition', pillPosition)
    this.settings.set('pillOffsetX', Math.max(0, offsetX))
    this.settings.set('pillOffsetY', Math.max(0, offsetY))
  }
}
