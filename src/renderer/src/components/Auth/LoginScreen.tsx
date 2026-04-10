import React, { useState } from 'react'

interface Props {
  onLogin: (needsOnboarding: boolean) => void
  onCreateAccount: () => void
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function LoginScreen({ onLogin, onCreateAccount }: Props): React.JSX.Element {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (): Promise<void> => {
    if (!identifier.trim() || !password) {
      setError('Please enter your username or email and password.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const settings = await window.agent.settings.get()
      const hash = await hashPassword(password)
      const id = identifier.trim().toLowerCase()
      const identifierMatch =
        id === settings.userEmail.toLowerCase() ||
        id === settings.username.toLowerCase()
      if (identifierMatch && hash === settings.userPasswordHash) {
        onLogin(!settings.isOnboardingComplete)
      } else {
        setError('Incorrect username or password.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col no-drag"
      style={{ background: 'transparent', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Drag header */}
      <div
        className="drag-region flex-shrink-0 flex items-center px-4"
        style={{ height: 46, borderBottom: '1px solid var(--divider)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500 }}>Agent</span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-7 pb-6">
        {/* Logo */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(135deg, #A8C8F0, #C4B5E0)',
            boxShadow: '0 6px 20px rgba(168,200,240,0.35)'
          }}
        >
          <span style={{ fontSize: '24px', color: 'white', fontWeight: 700 }}>A</span>
        </div>

        <h1 style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, marginBottom: 4 }}>
          Sign in
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: 20 }}>
          Welcome back
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
              Username or email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => { setIdentifier(e.target.value); setError('') }}
              placeholder=""
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'transparent',
                border: `1px solid ${error ? 'var(--error)' : 'var(--divider)'}`,
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
              autoFocus
            />
          </div>

          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder=""
              className="w-full px-3 py-2 rounded-lg"
              style={{
                background: 'transparent',
                border: `1px solid ${error ? 'var(--error)' : 'var(--divider)'}`,
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin() }}
            />
          </div>

          {error && (
            <p style={{ color: 'var(--error)', fontSize: '11px', marginTop: -4 }}>{error}</p>
          )}

          <button
            className="w-full py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </div>

        <div className="w-full flex items-center gap-3 my-4">
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
          <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--divider)' }} />
        </div>

        <button
          className="w-full py-2.5 rounded-xl font-medium transition-all hover:opacity-80"
          style={{
            border: '1px solid var(--divider)',
            color: 'var(--text-primary)',
            fontSize: '13px',
            background: 'transparent'
          }}
          onClick={onCreateAccount}
        >
          Create Account
        </button>
      </div>
    </div>
  )
}
