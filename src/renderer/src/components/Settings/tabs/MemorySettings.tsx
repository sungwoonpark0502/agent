import React, { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import { SettingsToggle } from '../SettingsToggle'
import type { Memory } from '../../../../../shared/types'

export function MemorySettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  const [memories, setMemories] = useState<Memory[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const loadMemories = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await window.agent.memory.list({ limit: 100 })
      setMemories(result as Memory[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const searchMemories = useCallback(async (query: string) => {
    if (!query.trim()) {
      loadMemories()
      return
    }
    const result = await window.agent.memory.search(query)
    setMemories(result as Memory[])
  }, [loadMemories])

  useEffect(() => {
    loadMemories()
  }, [loadMemories])

  const handleDelete = async (id: string): Promise<void> => {
    await window.agent.memory.delete(id)
    setMemories((prev) => prev.filter((m) => m.id !== id))
  }

  const CATEGORY_COLORS: Record<string, string> = {
    personal: '#A8C8F0',
    work: '#C4B5E0',
    preference: '#A8D5A2',
    fact: '#F5D89A',
    credential: '#F0A8A8',
    other: '#AEAEB2'
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Memory Settings">
        <SettingsToggle
          label="Auto-save Memories"
          description="Automatically save important information from conversations"
          checked={settings.autoMemory}
          onChange={(v) => updateSetting('autoMemory', v)}
        />
        <div>
          <label className="block text-caption mb-1" style={{ color: 'var(--text-secondary)' }}>
            Context memories per query: {settings.memoryContextCount}
          </label>
          <input
            type="range" min="1" max="10" step="1"
            value={settings.memoryContextCount}
            onChange={(e) => updateSetting('memoryContextCount', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </SettingsSection>

      <SettingsSection title={`Saved Memories (${memories.length})`}>
        <input
          type="text"
          className="w-full px-3 py-2 rounded-lg text-body"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--divider)',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
          placeholder="Search memories..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            searchMemories(e.target.value)
          }}
        />

        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {isLoading && (
            <p className="text-caption text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
              Loading...
            </p>
          )}
          {!isLoading && memories.length === 0 && (
            <p className="text-caption text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
              No memories saved yet
            </p>
          )}
          {memories.map((memory) => (
            <div
              key={memory.id}
              className="flex items-start gap-2 p-2 rounded-lg"
              style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid var(--divider)' }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-1.5 py-0.5 rounded text-caption"
                    style={{
                      background: `${CATEGORY_COLORS[memory.category] ?? '#AEAEB2'}20`,
                      color: CATEGORY_COLORS[memory.category] ?? '#AEAEB2',
                      fontSize: '10px',
                      fontWeight: 500
                    }}
                  >
                    {memory.category}
                  </span>
                  {memory.isPinned && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--warning)', flexShrink: 0 }}>
                      <path d="M5 1l1 3h3l-2.5 2 1 3L5 7.5 2.5 9l1-3L1 4h3z" stroke="currentColor" strokeWidth="1" fill="currentColor" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <p className="text-caption selectable" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                  {memory.content}
                </p>
              </div>
              <button
                className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-tertiary)' }}
                onClick={() => handleDelete(memory.id)}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
