import { createLogger } from './logger'
import type { DatabaseService } from './database'
import { DEFAULT_SETTINGS, type AppSettings } from '../../shared/types'

const logger = createLogger('settings')

export class SettingsService {
  private static instance: SettingsService
  private cache: AppSettings = { ...DEFAULT_SETTINGS }

  static getInstance(db: DatabaseService): SettingsService {
    if (!SettingsService.instance) {
      SettingsService.instance = new SettingsService(db)
    }
    return SettingsService.instance
  }

  constructor(private readonly db: DatabaseService) {}

  async load(): Promise<void> {
    const rows = this.db.all<{ key: string; value: string }>('SELECT key, value FROM settings')
    for (const { key, value } of rows) {
      try {
        ;(this.cache as Record<string, unknown>)[key] = JSON.parse(value)
      } catch {
        ;(this.cache as Record<string, unknown>)[key] = value
      }
    }
    logger.info('Settings loaded')
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.cache[key] ?? DEFAULT_SETTINGS[key]
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.cache[key] = value
    this.db.run(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, JSON.stringify(value)]
    )
  }

  getAll(): AppSettings {
    return { ...this.cache }
  }

  setMany(updates: Partial<AppSettings>): void {
    this.db.transaction(() => {
      for (const [key, value] of Object.entries(updates)) {
        ;(this.cache as Record<string, unknown>)[key] = value
        this.db.run(
          'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
          [key, JSON.stringify(value)]
        )
      }
    })
  }

  reset(): void {
    this.cache = { ...DEFAULT_SETTINGS }
    this.db.run('DELETE FROM settings')
    logger.info('Settings reset to defaults')
  }
}
