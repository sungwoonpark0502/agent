import React, { useEffect, useState, useCallback } from 'react'
import { useSettingsStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import { SettingsToggle } from '../SettingsToggle'

interface ClipboardItem {
  id: string
  content: string
  type: string
  timestamp: number
  source_app: string
}

export function ClipboardSettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  const [history, setHistory] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const items = await window.agent.clipboard.getHistory()
      setHistory(items as ClipboardItem[])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleCopy = useCallback(async (item: ClipboardItem) => {
    await navigator.clipboard.writeText(item.content)
    setCopiedId(item.id)
    setTimeout(() => setCopiedId(null), 1500)
  }, [])

  const handleClear = useCallback(async () => {
    await window.agent.clipboard.clearHistory()
    setHistory([])
  }, [])

  function formatTime(ts: number): string {
    const d = new Date(ts)
    const diff = Date.now() - ts
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Clipboard History" description="Track recently copied text">
        <SettingsToggle
          label="Enable clipboard history"
          description="Tracks copied text for quick access"
          checked={settings.clipboardHistoryEnabled}
          onChange={v => updateSetting('clipboardHistoryEnabled', v)}
        />
        <SettingsToggle
          label="Clear history on quit"
          checked={settings.clipboardHistoryClearOnQuit}
          onChange={v => updateSetting('clipboardHistoryClearOnQuit', v)}
        />
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-body" style={{ color: 'var(--text-primary)' }}>History size</label>
            <span className="text-caption font-medium" style={{ color: 'var(--accent)' }}>
              {settings.clipboardHistorySize} items
            </span>
          </div>
          <input
            type="range" min={10} max={200} step={10}
            value={settings.clipboardHistorySize}
            onChange={e => updateSetting('clipboardHistorySize', Number(e.target.value))}
            className="w-full"
          />
        </div>
      </SettingsSection>

      <SettingsSection title={`Recent (${history.length})`}>
        <div className="flex items-center justify-between">
          <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
            Click any item to copy it again
          </span>
          {history.length > 0 && (
            <button
              className="text-caption hover:opacity-70 transition-opacity"
              style={{ color: 'var(--error)' }}
              onClick={handleClear}
            >
              Clear all
            </button>
          )}
        </div>

        {loading && (
          <div className="flex justify-center py-4">
            <div
              className="w-4 h-4 rounded-full border-2 animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}

        {!loading && history.length === 0 && (
          <p className="text-caption text-center py-4" style={{ color: 'var(--text-tertiary)' }}>
            No clipboard history yet
          </p>
        )}

        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {history.map(item => (
            <button
              key={item.id}
              className="flex items-start gap-2 px-3 py-2 rounded-lg text-left hover:opacity-80 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--divider)' }}
              onClick={() => handleCopy(item)}
            >
              <div
                className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: 'rgba(168,200,240,0.12)' }}
              >
                {item.type === 'url' ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <path d="M4 2H2a1 1 0 00-1 1v5a1 1 0 001 1h5a1 1 0 001-1V6" strokeLinecap="round"/>
                    <path d="M6 1h3v3M9 1L5 5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                    <rect x="1" y="1" width="8" height="8" rx="1"/>
                    <path d="M3 4h4M3 6h2" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-caption truncate"
                  style={{
                    color: 'var(--text-primary)',
                    fontFamily: item.type === 'url' ? "'SF Mono', monospace" : 'inherit',
                    fontSize: '12px'
                  }}
                >
                  {item.content}
                </p>
                <p className="text-caption" style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                  {formatTime(item.timestamp)}
                </p>
              </div>
              <span
                className="text-caption flex-shrink-0"
                style={{ color: copiedId === item.id ? 'var(--success)' : 'var(--text-tertiary)', fontSize: '10px' }}
              >
                {copiedId === item.id ? 'copied' : 'copy'}
              </span>
            </button>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
