import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useConversationStore } from '../../store'

interface Command {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  action: () => boolean // returns true if should close palette
}

interface Props {
  onClose: () => void
}

const IconBriefing = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="5" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const IconWeather = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M3.5 11h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M2 11c0-1.38 1.12-2.5 2.5-2.5h5C10.88 8.5 12 9.62 12 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2.5" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 6h12" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4.5 1v2M9.5 1v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const IconEmail = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="3" width="12" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1 5l6 4 6-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconTimer = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="8" r="5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 5.5V8l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5 1h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const IconReminder = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="1.5" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M4.5 7l2 2L9.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)
const IconSettings = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 1v2M7 11v2M1 7h2M11 7h2M2.93 2.93l1.41 1.41M9.66 9.66l1.41 1.41M2.93 11.07l1.41-1.41M9.66 4.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)
const IconScreenshot = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1" y="2.5" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M5 2.5L5.5 1h3l.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
)
const IconMemory = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <ellipse cx="7" cy="4.5" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 4.5v5c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5v-5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M2 7c0 1.38 2.24 2.5 5 2.5S12 8.38 12 7" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M9.5 9.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export function CommandPalette({ onClose }: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addMessage, setDraft } = useConversationStore()

  const sendQuery = useCallback((text: string) => {
    addMessage({ role: 'user', content: text })
    const msgs = useConversationStore.getState().messages
    window.agent.chat.send(msgs, useConversationStore.getState().conversationId)
    window.agent.window.setMode('expanded')
    onClose()
  }, [addMessage, onClose])

  const prefillInput = useCallback((text: string) => {
    setDraft(text)
    const input = document.querySelector<HTMLTextAreaElement>('#chat-input')
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set
      if (nativeSetter) {
        nativeSetter.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      input.focus()
      input.setSelectionRange(text.length, text.length)
    }
    window.agent.window.setMode('expanded')
    onClose()
  }, [setDraft, onClose])

  const BASE_COMMANDS: Command[] = [
    {
      id: 'briefing', label: 'Daily Briefing', description: "Get today's overview", icon: <IconBriefing />,
      action: () => { sendQuery('Give me my daily briefing.'); return true }
    },
    {
      id: 'weather', label: 'Check Weather', description: 'Get current weather', icon: <IconWeather />,
      action: () => { sendQuery("What's the weather today?"); return true }
    },
    {
      id: 'calendar', label: "Today's Calendar", description: "See what's on your calendar", icon: <IconCalendar />,
      action: () => { sendQuery("What's on my calendar today?"); return true }
    },
    {
      id: 'email', label: 'Check Email', description: 'Read your latest emails', icon: <IconEmail />,
      action: () => { sendQuery('Read my latest emails.'); return true }
    },
    {
      id: 'timer', label: 'Set Timer', description: 'Set a countdown timer', icon: <IconTimer />,
      action: () => { prefillInput('Set a timer for '); return true }
    },
    {
      id: 'reminder', label: 'Add Reminder', description: 'Create a new reminder', icon: <IconReminder />,
      action: () => { prefillInput('Remind me to '); return true }
    },
    {
      id: 'settings', label: 'Open Settings', description: 'Configure Agent', icon: <IconSettings />,
      action: () => { window.agent.window.setMode('expanded'); onClose(); return true }
    },
    {
      id: 'screenshot', label: 'Take Screenshot', description: 'Capture your screen', icon: <IconScreenshot />,
      action: () => { sendQuery('Take a screenshot.'); return true }
    },
    {
      id: 'memory', label: 'View Memories', description: 'See saved memories', icon: <IconMemory />,
      action: () => { window.agent.window.setMode('expanded'); onClose(); return true }
    },
    {
      id: 'search', label: 'Web Search', description: 'Search the internet', icon: <IconSearch />,
      action: () => { prefillInput('Search for '); return true }
    }
  ]

  const filteredCommands = query.trim()
    ? BASE_COMMANDS.filter(
        c =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase())
      )
    : BASE_COMMANDS

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      const cmd = filteredCommands[selectedIndex]
      if (cmd) cmd.action()
    }
  }, [filteredCommands, selectedIndex, onClose])

  return (
    <div
      className="fixed inset-0 flex items-start justify-center z-50 pt-16 animate-fade-in no-drag"
      style={{
        background: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        WebkitAppRegion: 'no-drag'
      } as React.CSSProperties}
      onClick={onClose}
    >
      <div
        className="w-[500px] rounded-xl overflow-hidden animate-scale-in"
        style={{
          background: 'var(--surface-elevated)',
          backdropFilter: 'var(--blur)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.2)',
          border: '1px solid var(--divider)'
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4"
          style={{ borderBottom: '1px solid var(--divider)', height: 52 }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--text-tertiary)', flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-body outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Search commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <kbd
            className="text-caption px-1.5 py-0.5 rounded"
            style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--text-tertiary)', fontSize: '11px', fontFamily: 'inherit' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>No commands found</p>
            </div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: i === selectedIndex ? 'rgba(168,200,240,0.1)' : 'transparent',
                  borderLeft: i === selectedIndex ? '2px solid var(--accent)' : '2px solid transparent'
                }}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span style={{ color: 'var(--text-secondary)', flexShrink: 0 }}>{cmd.icon}</span>
                <div>
                  <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>{cmd.label}</p>
                  <p className="text-caption" style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{cmd.description}</p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-3 px-4 py-2"
          style={{ borderTop: '1px solid var(--divider)' }}
        >
          {[['↑↓', 'Navigate'], ['↵', 'Select'], ['Esc', 'Close']].map(([key, label]) => (
            <div key={key} className="flex items-center gap-1">
              <kbd
                className="px-1 py-0.5 rounded text-caption"
                style={{ background: 'rgba(0,0,0,0.08)', color: 'var(--text-tertiary)', fontSize: '10px' }}
              >
                {key}
              </kbd>
              <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
