import React, { useEffect, useRef, useCallback } from 'react'
import { useConversationStore, useUIStore, useSettingsStore } from '../../store'
import { MessageBubble } from './MessageBubble'
import { TypingIndicator } from './TypingIndicator'

function EmptyState(): React.JSX.Element {
  const settings = useSettingsStore(s => s.settings)
  const agentName = settings.agentName || 'Agent'
  const initial = agentName.charAt(0).toUpperCase()

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{ background: settings.userAvatar ? 'transparent' : 'linear-gradient(135deg, #5A9FD4, #9B87CC)' }}
      >
        {settings.userAvatar
          ? <img src={settings.userAvatar} className="w-full h-full object-cover" alt="Agent" />
          : <span style={{ fontSize: '22px', color: 'white', fontWeight: 700 }}>{initial}</span>
        }
      </div>
      <p className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '15px' }}>
        How can I help?
      </p>
    </div>
  )
}

export function ConversationThread(): React.JSX.Element {
  const { messages, isStreaming, activeToolName } = useConversationStore()
  const { autoScrollEnabled, setAutoScroll } = useUIStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (autoScrollEnabled && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isStreaming, autoScrollEnabled])

  // Detect manual scroll up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    setAutoScroll(isAtBottom)
  }, [setAutoScroll])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    setAutoScroll(true)
  }, [setAutoScroll])

  const visibleMessages = messages.filter(m => m.role !== 'tool_result')

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        className="thread-scroll h-full overflow-y-auto px-4 py-3 flex flex-col gap-3"
        onScroll={handleScroll}
        style={{ background: 'transparent' }}
      >
        {visibleMessages.length === 0 && (
          <EmptyState />
        )}

        {visibleMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && !messages.find(m => m.isStreaming) && (
          <TypingIndicator toolName={activeToolName} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* Scroll to bottom FAB */}
      {!autoScrollEnabled && (
        <button
          className="absolute bottom-3 right-3 w-8 h-8 rounded-full shadow-lg flex items-center justify-center animate-fade-in"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--divider)',
            boxShadow: 'var(--shadow-card)',
            color: 'var(--text-secondary)'
          }}
          onClick={scrollToBottom}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}
