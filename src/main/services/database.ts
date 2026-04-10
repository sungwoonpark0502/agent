import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'
import { createLogger } from './logger'

const logger = createLogger('database')

const SCHEMA_VERSION = 1

export class DatabaseService {
  private static instance: DatabaseService
  private db: Database.Database | null = null

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  async initialize(): Promise<void> {
    const dbPath = join(app.getPath('userData'), 'agent.db')
    logger.info({ dbPath }, 'Opening database')

    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.db.pragma('synchronous = NORMAL')

    this.runMigrations()
    logger.info('Database initialized')
  }

  get raw(): Database.Database {
    if (!this.db) throw new Error('Database not initialized')
    return this.db
  }

  close(): void {
    if (this.db?.open) {
      this.db.close()
      logger.info('Database closed')
    }
  }

  // ─── Migrations ──────────────────────────────────────────────────────────────

  private runMigrations(): void {
    const db = this.raw

    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER NOT NULL
      );
    `)

    const versionRow = db.prepare('SELECT version FROM schema_version LIMIT 1').get() as { version: number } | undefined
    const currentVersion = versionRow?.version ?? 0

    if (currentVersion < 1) {
      this.migrate_v1()
      db.prepare('INSERT OR REPLACE INTO schema_version (version) VALUES (?)').run(1)
      logger.info('Applied migration v1')
    }

    if (currentVersion < 2) {
      this.migrate_v2()
      db.prepare('UPDATE schema_version SET version = 2').run()
      logger.info('Applied migration v2')
    }
  }

  private migrate_v1(): void {
    const db = this.raw

    db.exec(`
      -- Settings table
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      -- Conversations
      CREATE TABLE IF NOT EXISTS conversations (
        id         TEXT PRIMARY KEY NOT NULL,
        title      TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Messages
      CREATE TABLE IF NOT EXISTS messages (
        id              TEXT PRIMARY KEY NOT NULL,
        conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role            TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'tool_result')),
        content         TEXT NOT NULL,
        metadata        TEXT,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);

      -- Memories
      CREATE TABLE IF NOT EXISTS memories (
        id           TEXT PRIMARY KEY NOT NULL,
        user_id      TEXT NOT NULL DEFAULT 'default',
        content      TEXT NOT NULL,
        category     TEXT NOT NULL DEFAULT 'other',
        tags         TEXT NOT NULL DEFAULT '[]',
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
        last_accessed TEXT,
        access_count INTEGER NOT NULL DEFAULT 0,
        source       TEXT NOT NULL DEFAULT 'text' CHECK(source IN ('voice', 'text', 'auto')),
        is_pinned    INTEGER NOT NULL DEFAULT 0,
        is_archived  INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
      CREATE INDEX IF NOT EXISTS idx_memories_user    ON memories(user_id);

      -- Full-text search for memories
      CREATE VIRTUAL TABLE IF NOT EXISTS memories_fts USING fts5(
        content, tags, category,
        content='memories',
        content_rowid='rowid'
      );

      -- FTS triggers
      CREATE TRIGGER IF NOT EXISTS memories_ai AFTER INSERT ON memories BEGIN
        INSERT INTO memories_fts(rowid, content, tags, category)
          VALUES (new.rowid, new.content, new.tags, new.category);
      END;
      CREATE TRIGGER IF NOT EXISTS memories_ad AFTER DELETE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags, category)
          VALUES ('delete', old.rowid, old.content, old.tags, old.category);
      END;
      CREATE TRIGGER IF NOT EXISTS memories_au AFTER UPDATE ON memories BEGIN
        INSERT INTO memories_fts(memories_fts, rowid, content, tags, category)
          VALUES ('delete', old.rowid, old.content, old.tags, old.category);
        INSERT INTO memories_fts(rowid, content, tags, category)
          VALUES (new.rowid, new.content, new.tags, new.category);
      END;

      -- Notes
      CREATE TABLE IF NOT EXISTS notes (
        id         TEXT PRIMARY KEY NOT NULL,
        title      TEXT,
        content    TEXT NOT NULL,
        folder     TEXT NOT NULL DEFAULT 'Agent Notes',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
        title, content, folder,
        content='notes',
        content_rowid='rowid'
      );

      -- Timers
      CREATE TABLE IF NOT EXISTS timers (
        id               TEXT PRIMARY KEY NOT NULL,
        label            TEXT NOT NULL DEFAULT 'Timer',
        duration_seconds INTEGER NOT NULL,
        remaining_seconds INTEGER NOT NULL,
        is_paused        INTEGER NOT NULL DEFAULT 0,
        started_at       INTEGER NOT NULL,
        completed_at     INTEGER,
        created_at       TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Alarms
      CREATE TABLE IF NOT EXISTS alarms (
        id           TEXT PRIMARY KEY NOT NULL,
        label        TEXT NOT NULL DEFAULT 'Alarm',
        time         TEXT NOT NULL,
        repeat       TEXT NOT NULL DEFAULT 'none',
        is_active    INTEGER NOT NULL DEFAULT 1,
        last_fired_at TEXT,
        created_at   TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Usage stats
      CREATE TABLE IF NOT EXISTS usage_stats (
        id              TEXT PRIMARY KEY NOT NULL,
        model           TEXT NOT NULL,
        input_tokens    INTEGER NOT NULL DEFAULT 0,
        output_tokens   INTEGER NOT NULL DEFAULT 0,
        tool_calls      INTEGER NOT NULL DEFAULT 0,
        created_at      TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)
  }

  private migrate_v2(): void {
    this.raw.exec(`
      -- Clipboard history
      CREATE TABLE IF NOT EXISTS clipboard_history (
        id         TEXT PRIMARY KEY NOT NULL,
        content    TEXT NOT NULL,
        type       TEXT NOT NULL DEFAULT 'text' CHECK(type IN ('text', 'url', 'image')),
        timestamp  INTEGER NOT NULL,
        source_app TEXT NOT NULL DEFAULT 'unknown',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_clipboard_ts ON clipboard_history(timestamp DESC);
    `)
  }

  // ─── Generic helpers ─────────────────────────────────────────────────────────

  get<T>(sql: string, params: unknown[] = []): T | undefined {
    return this.raw.prepare(sql).get(...params) as T | undefined
  }

  all<T>(sql: string, params: unknown[] = []): T[] {
    return this.raw.prepare(sql).all(...params) as T[]
  }

  run(sql: string, params: unknown[] = []): Database.RunResult {
    return this.raw.prepare(sql).run(...params)
  }

  transaction<T>(fn: () => T): T {
    return this.raw.transaction(fn)()
  }
}
