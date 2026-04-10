import { v4 as uuidv4 } from 'uuid'
import { createLogger } from './logger'
import type { DatabaseService } from './database'
import type { Memory, MemoryCategory } from '../../shared/types'

const logger = createLogger('memory')

interface RawMemory {
  id: string
  user_id: string
  content: string
  category: string
  tags: string
  created_at: string
  updated_at: string
  last_accessed: string | null
  access_count: number
  source: string
  is_pinned: number
  is_archived: number
}

function rowToMemory(row: RawMemory): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    content: row.content,
    category: row.category as MemoryCategory,
    tags: JSON.parse(row.tags) as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAccessed: row.last_accessed,
    accessCount: row.access_count,
    source: row.source as Memory['source'],
    isPinned: Boolean(row.is_pinned),
    isArchived: Boolean(row.is_archived)
  }
}

export class MemoryService {
  private static instance: MemoryService

  static getInstance(db: DatabaseService): MemoryService {
    if (!MemoryService.instance) {
      MemoryService.instance = new MemoryService(db)
    }
    return MemoryService.instance
  }

  constructor(private readonly db: DatabaseService) {}

  save(content: string, options: {
    category?: MemoryCategory
    tags?: string[]
    source?: Memory['source']
    userId?: string
  } = {}): Memory {
    const id = uuidv4()
    const now = new Date().toISOString()
    const category = options.category ?? 'other'
    const tags = options.tags ?? []
    const source = options.source ?? 'text'
    const userId = options.userId ?? 'default'

    this.db.run(
      `INSERT INTO memories (id, user_id, content, category, tags, created_at, updated_at, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, content, category, JSON.stringify(tags), now, now, source]
    )

    const row = this.db.get<RawMemory>('SELECT * FROM memories WHERE id = ?', [id])
    logger.info({ id, category }, 'Memory saved')
    return rowToMemory(row!)
  }

  search(query: string, options: { category?: MemoryCategory; limit?: number; userId?: string } = {}): Memory[] {
    const userId = options.userId ?? 'default'
    const limit = options.limit ?? 10

    let rows: RawMemory[]

    if (query.trim()) {
      // FTS search
      rows = this.db.all<RawMemory>(
        `SELECT m.* FROM memories m
         JOIN memories_fts fts ON m.rowid = fts.rowid
         WHERE fts MATCH ? AND m.user_id = ? AND m.is_archived = 0
         ${options.category ? `AND m.category = '${options.category}'` : ''}
         ORDER BY m.is_pinned DESC, rank
         LIMIT ?`,
        [query, userId, limit]
      )
    } else {
      rows = this.db.all<RawMemory>(
        `SELECT * FROM memories
         WHERE user_id = ? AND is_archived = 0
         ${options.category ? `AND category = '${options.category}'` : ''}
         ORDER BY is_pinned DESC, updated_at DESC
         LIMIT ?`,
        [userId, limit]
      )
    }

    // Track access
    const ids = rows.map(r => r.id)
    if (ids.length > 0) {
      const now = new Date().toISOString()
      const placeholders = ids.map(() => '?').join(',')
      this.db.run(
        `UPDATE memories SET last_accessed = ?, access_count = access_count + 1
         WHERE id IN (${placeholders})`,
        [now, ...ids]
      )
    }

    return rows.map(rowToMemory)
  }

  list(options: {
    category?: MemoryCategory
    includeArchived?: boolean
    userId?: string
    limit?: number
    offset?: number
  } = {}): Memory[] {
    const userId = options.userId ?? 'default'
    const limit = options.limit ?? 50
    const offset = options.offset ?? 0

    const rows = this.db.all<RawMemory>(
      `SELECT * FROM memories
       WHERE user_id = ?
       ${!options.includeArchived ? 'AND is_archived = 0' : ''}
       ${options.category ? `AND category = '${options.category}'` : ''}
       ORDER BY is_pinned DESC, updated_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    )

    return rows.map(rowToMemory)
  }

  getById(id: string): Memory | null {
    const row = this.db.get<RawMemory>('SELECT * FROM memories WHERE id = ?', [id])
    return row ? rowToMemory(row) : null
  }

  update(id: string, content: string): Memory | null {
    const now = new Date().toISOString()
    this.db.run(
      'UPDATE memories SET content = ?, updated_at = ? WHERE id = ?',
      [content, now, id]
    )
    return this.getById(id)
  }

  delete(id: string): boolean {
    const result = this.db.run('DELETE FROM memories WHERE id = ?', [id])
    return result.changes > 0
  }

  pin(id: string, isPinned: boolean): void {
    this.db.run('UPDATE memories SET is_pinned = ? WHERE id = ?', [isPinned ? 1 : 0, id])
  }

  archive(id: string): void {
    this.db.run('UPDATE memories SET is_archived = 1 WHERE id = ?', [id])
  }

  deleteAll(userId = 'default'): void {
    this.db.run('DELETE FROM memories WHERE user_id = ?', [userId])
    logger.info({ userId }, 'All memories deleted')
  }

  getPinned(userId = 'default'): Memory[] {
    const rows = this.db.all<RawMemory>(
      'SELECT * FROM memories WHERE user_id = ? AND is_pinned = 1 AND is_archived = 0 ORDER BY updated_at DESC',
      [userId]
    )
    return rows.map(rowToMemory)
  }

  getContextForQuery(query: string, limit = 5, userId = 'default'): string {
    const pinned = this.getPinned(userId)
    const searched = this.search(query, { limit: limit - pinned.length, userId })

    const all = [...pinned]
    for (const m of searched) {
      if (!all.find(p => p.id === m.id)) all.push(m)
    }

    if (all.length === 0) return ''
    return all.map(m => `[${m.category}] ${m.content}`).join('\n')
  }
}
