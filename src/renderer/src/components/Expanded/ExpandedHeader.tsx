import React from 'react'
import { useUIStore, useSettingsStore } from '../../store'

interface Props {
  onOpenSettings: () => void
  onOpenHistory: () => void
  onMinimize: () => void
}

export function ExpandedHeader({ onOpenSettings, onOpenHistory, onMinimize }: Props): React.JSX.Element {
  const { pillState, theme, setTheme } = useUIStore()
  const { settings, updateSetting } = useSettingsStore()

  const toggleTheme = (): void => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    updateSetting('theme', next)
  }

  const statusColor =
    pillState === 'offline' ? 'var(--warning)' :
    pillState === 'error' ? 'var(--error)' :
    'var(--success)'

  const agentName = settings.agentName || 'Agent'

  // Avatar shows user's profile photo; initial falls back to userName then agentName
  const profileInitial = (settings.userName || settings.agentName || 'A').charAt(0).toUpperCase()

  return (
    <div
      className="flex items-center px-3 gap-2 flex-shrink-0 drag-region"
      style={{
        height: 46,
        borderBottom: '1px solid var(--divider)',
        background: 'var(--surface-elevated)'
      } as React.CSSProperties}
    >
      {/* Profile avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
        style={{ background: settings.userAvatar ? 'transparent' : 'linear-gradient(135deg, #5A9FD4, #9B87CC)' }}
      >
        {settings.userAvatar
          ? <img src={settings.userAvatar} className="w-full h-full object-cover" alt="Avatar" />
          : <span style={{ fontSize: '11px', color: 'white', fontWeight: 700 }}>{profileInitial}</span>
        }
      </div>

      {/* Title + status */}
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <span className="font-semibold truncate" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{agentName}</span>
        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: statusColor }} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 no-drag">
        {/* Theme toggle */}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* History */}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          onClick={onOpenHistory}
          title="History"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M1 7a6 6 0 106-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M1 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 4v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Settings */}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          onClick={onOpenSettings}
          title="Settings (⌘,)"
        >
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
            <path d="M7.5 9.5a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M12.2 9.1l.6 1a.6.6 0 01-.2.8l-1 .6a.6.6 0 01-.8-.2l-.6-1a4.5 4.5 0 01-1.1.4v1.2a.6.6 0 01-.6.6H7a.6.6 0 01-.6-.6v-1.2a4.5 4.5 0 01-1.1-.4l-.6 1a.6.6 0 01-.8.2l-1-.6a.6.6 0 01-.2-.8l.6-1A4.5 4.5 0 013 7.5a4.5 4.5 0 01.3-1.6l-.6-1a.6.6 0 01.2-.8l1-.6a.6.6 0 01.8.2l.6 1A4.5 4.5 0 016.4 4.3V3a.6.6 0 01.6-.6h1a.6.6 0 01.6.6v1.3c.4.1.8.3 1.1.5l.6-1a.6.6 0 01.8-.2l1 .6a.6.6 0 01.2.8l-.6 1c.2.5.3 1 .3 1.5s-.1 1.1-.3 1.6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Minimize */}
        <button
          className="w-7 h-7 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          onClick={onMinimize}
          title="Minimize (Esc)"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
