import { clipboard, app } from 'electron'
import { createLogger } from './logger'
import type { DatabaseService } from './database'
import type { SettingsService } from './settings'

const logger = createLogger('clipboard')

export class ClipboardService {
  private static instance: ClipboardService
  private db: DatabaseService
  private settings: SettingsService
  private lastContent: string = ''
  private pollInterval: ReturnType<typeof setInterval> | null = null
  private maxSize: number = 50

  constructor(db: DatabaseService, settings: SettingsService) {
    this.db = db
    this.settings = settings
  }

  static getInstance(db: DatabaseService, settings: SettingsService): ClipboardService {
    if (!ClipboardService.instance) {
      ClipboardService.instance = new ClipboardService(db, settings)
    }
    return ClipboardService.instance
  }

  start(): void {
    if (this.pollInterval) return
    // Initialize with current clipboard content
    this.lastContent = clipboard.readText()

    // Poll every 1 second
    this.pollInterval = setInterval(() => this.poll(), 1000)
    logger.info('Clipboard monitoring started')
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
    }
  }

  clearOnQuit(): void {
    if (this.settings.get('clipboardHistoryClearOnQuit')) {
      this.db.run('DELETE FROM clipboard_history')
      logger.info('Clipboard history cleared on quit')
    }
  }

  private poll(): void {
    if (!this.settings.get('clipboardHistoryEnabled')) return

    const current = clipboard.readText()
    if (!current || current === this.lastContent) return
    this.lastContent = current

    const type = this.detectType(current)
    const id = crypto.randomUUID()
    const timestamp = Date.now()

    // Avoid duplicates of recent items
    const recent = this.db.get<{ content: string }>(
      'SELECT content FROM clipboard_history ORDER BY timestamp DESC LIMIT 1'
    )
    if (recent?.content === current) return

    this.db.run(
      'INSERT INTO clipboard_history (id, content, type, timestamp, source_app) VALUES (?, ?, ?, ?, ?)',
      [id, current, type, timestamp, 'unknown']
    )

    // Trim to max size
    this.maxSize = this.settings.get('clipboardHistorySize') ?? 50
    this.db.run(
      `DELETE FROM clipboard_history WHERE id NOT IN (
         SELECT id FROM clipboard_history ORDER BY timestamp DESC LIMIT ?
       )`,
      [this.maxSize]
    )
  }

  private detectType(text: string): 'text' | 'url' | 'image' {
    if (/^https?:\/\/\S+$/.test(text.trim())) return 'url'
    return 'text'
  }
}
