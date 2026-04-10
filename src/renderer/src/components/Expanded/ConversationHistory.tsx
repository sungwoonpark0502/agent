import React, { useEffect, useState, useCallback } from 'react'
import { useConversationStore } from '../../store'
import type { ChatMessage } from '../../../../shared/types'

interface ConversationSummary {
  id: string
  title: string | null
  created_at: string
  updated_at: string
  message_count: number
}

interface Props {
  onClose: () => void
}

export function ConversationHistory({ onClose }: Props): React.JSX.Element {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [newestFirst, setNewestFirst] = useState(true)
  const { loadHistory } = useConversationStore()

  useEffect(() => {
    window.agent.conversation.list().then((convs) => {
      setConversations(convs as ConversationSummary[])
      setLoading(false)
    })
  }, [])

  const sortedConversations = newestFirst
    ? conversations
    : [...conversations].reverse()

  const handleLoad = useCallback(async (id: string) => {
    const msgs = await window.agent.conversation.load(id) as Array<{ id: string; role: string; content: string; created_at: string }>
    const chatMessages: ChatMessage[] = msgs.map(m => ({
      id: m.id,
      role: m.role as ChatMessage['role'],
      content: m.content,
      timestamp: new Date(m.created_at).getTime()
    }))
    loadHistory(chatMessages)
    onClose()
  }, [loadHistory, onClose])

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeleting(id)
    await window.agent.conversation.delete(id)
    setConversations(prev => prev.filter(c => c.id !== id))
    setDeleting(null)
  }, [])

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col animate-scale-in no-drag"
      style={{ WebkitAppRegion: 'no-drag' as React.CSSProperties['WebkitAppRegion'],
        background: 'var(--surface-solid)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 flex-shrink-0"
        style={{ height: 48, borderBottom: '1px solid var(--divider)' }}
      >
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          onClick={onClose}
          title="Back"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <span className="text-body font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
          History
        </span>
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}
          onClick={() => setNewestFirst(p => !p)}
          title={newestFirst ? 'Showing newest first' : 'Showing oldest first'}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d={newestFirst ? 'M2 3h6M3 5h4M4 7h2' : 'M2 7h6M3 5h4M4 3h2'} stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          {newestFirst ? 'Newest' : 'Oldest'}
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ opacity: 0.3 }}>
              <rect x="4" y="4" width="24" height="24" rx="4" stroke="var(--text-secondary)" strokeWidth="2"/>
              <path d="M10 11h12M10 16h8M10 21h6" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>No saved conversations yet</p>
          </div>
        )}

        {!loading && sortedConversations.map(conv => (
          <button
            key={conv.id}
            className="group w-full flex items-start gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
            style={{ borderBottom: '1px solid var(--divider)' }}
            onClick={() => handleLoad(conv.id)}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ background: 'var(--surface-solid)' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 3h10M2 7h10M2 11h6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-body font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {conv.title || 'Untitled conversation'}
                </span>
                <span className="text-caption flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                  {formatDate(conv.updated_at)}
                </span>
              </div>
              <span className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
                {conv.message_count} message{conv.message_count !== 1 ? 's' : ''}
              </span>
            </div>

            <button
              className="w-6 h-6 rounded flex items-center justify-center opacity-30 group-hover:opacity-100 flex-shrink-0 mt-1 transition-opacity"
              style={{ color: 'var(--text-tertiary)' }}
              onClick={(e) => handleDelete(e, conv.id)}
              disabled={deleting === conv.id}
              title="Delete"
            >
              {deleting === conv.id ? (
                <div className="w-3 h-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} />
              ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M2 2l6 6M8 2l-6 6"/>
                </svg>
              )}
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}
