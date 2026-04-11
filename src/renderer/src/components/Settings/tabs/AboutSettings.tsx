import React, { useEffect, useState } from 'react'
import { useSettingsStore } from '../../../store'

interface Props {
  onLogout?: () => void
}

export function AboutSettings({ onLogout }: Props): React.JSX.Element {
  const { updateSetting } = useSettingsStore()
  const [version, setVersion] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    window.agent.app.version().then(setVersion)
  }, [])

  const handleLogout = async (): Promise<void> => {
    setLoggingOut(true)
    try {
      await window.agent.apiKey.set('anthropic', '')
      updateSetting('hasAnthropicKey', false)
      onLogout?.()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* App info */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #5A9FD4, #9B87CC)' }}
        >
          <span style={{ fontSize: '24px', color: 'white', fontWeight: 700 }}>A</span>
        </div>
        <div className="text-center">
          <h1 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: '16px' }}>Agent</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: 2 }}>v{version || '0.1.0'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          className="w-full py-2 rounded-lg font-medium transition-all hover:opacity-80"
          style={{
            background: 'rgba(217,48,37,0.1)',
            color: 'var(--error)',
            border: '1px solid rgba(217,48,37,0.2)',
            fontSize: '13px',
            opacity: loggingOut ? 0.6 : 1
          }}
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? 'Logging out…' : 'Log Out'}
        </button>
        <button
          className="w-full py-2 rounded-lg font-medium transition-all hover:opacity-80"
          style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--divider)', fontSize: '13px' }}
          onClick={() => window.agent.app.quit()}
        >
          Quit Agent
        </button>
      </div>
    </div>
  )
}
