import React, { useState, useCallback } from 'react'
import { useSettingsStore } from '../../store'

interface Props {
  onComplete: () => void
}

type Step = 'welcome' | 'api-key' | 'name' | 'done'

export function OnboardingScreen({ onComplete }: Props): React.JSX.Element {
  const [step, setStep] = useState<Step>('welcome')
  const [apiKey, setApiKey] = useState('')
  const [userName, setUserName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { setSettings } = useSettingsStore()

  const handleSaveKey = useCallback(async () => {
    const key = apiKey.trim()
    if (!key.startsWith('sk-ant-')) {
      setError('That doesn\'t look like an Anthropic API key. It should start with sk-ant-')
      return
    }

    setSaving(true)
    setError('')
    try {
      await window.agent.apiKey.set('anthropic', key)
      setStep('name')
    } catch (err) {
      setError('Failed to save API key. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [apiKey])

  const handleSaveName = useCallback(async () => {
    if (userName.trim()) {
      await window.agent.settings.set({ userName: userName.trim() })
      const updated = await window.agent.settings.get()
      setSettings(updated)
    }
    setStep('done')
  }, [userName, setSettings])

  const handleComplete = useCallback(() => {
    window.agent.settings.set({ hasAnthropicKey: true })
    onComplete()
  }, [onComplete])

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 no-drag"
      style={{ background: 'var(--surface)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {step === 'welcome' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-xs animate-fade-in">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #A8C8F0, #C4B5E0)', boxShadow: '0 8px 24px rgba(168,200,240,0.4)' }}
          >
            <span style={{ fontSize: '28px', color: 'white', fontWeight: 700 }}>A</span>
          </div>
          <div className="text-center">
            <h1 className="text-h3 font-bold" style={{ color: 'var(--text-primary)' }}>Welcome to Agent</h1>
            <p className="text-body mt-2" style={{ color: 'var(--text-secondary)' }}>
              Your personal AI assistant. Let's get you set up in 2 quick steps.
            </p>
          </div>
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-body transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-active)', color: 'white' }}
            onClick={() => setStep('api-key')}
          >
            Get started
          </button>
        </div>
      )}

      {step === 'api-key' && (
        <div className="flex flex-col gap-4 w-full max-w-xs animate-fade-in">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-bold" style={{ color: 'var(--text-primary)' }}>Connect to Claude</h2>
            <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
              Agent uses Anthropic's Claude API. You'll need an API key from{' '}
              <button
                className="underline"
                style={{ color: 'var(--accent)' }}
                onClick={() => window.agent.app.quit()}
              >
                console.anthropic.com
              </button>
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-caption font-medium" style={{ color: 'var(--text-secondary)' }}>
              Anthropic API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setError('') }}
              placeholder="sk-ant-api03-..."
              className="w-full px-3 py-2 rounded-lg text-body outline-none"
              style={{
                background: 'var(--surface-elevated)',
                border: `1px solid ${error ? 'var(--error)' : 'var(--divider)'}`,
                color: 'var(--text-primary)'
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveKey() }}
              autoFocus
            />
            {error && (
              <p className="text-caption" style={{ color: 'var(--error)' }}>{error}</p>
            )}
            <p className="text-caption" style={{ color: 'var(--text-tertiary)' }}>
              Stored securely in macOS Keychain. Never sent anywhere except Anthropic's API.
            </p>
          </div>

          <button
            className="w-full py-2.5 rounded-xl font-semibold text-body transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--accent-active)', color: 'white' }}
            onClick={handleSaveKey}
            disabled={saving || !apiKey.trim()}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      )}

      {step === 'name' && (
        <div className="flex flex-col gap-4 w-full max-w-xs animate-fade-in">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-bold" style={{ color: 'var(--text-primary)' }}>What's your name?</h2>
            <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
              Agent will address you personally. You can change this later in Settings.
            </p>
          </div>

          <input
            type="text"
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 rounded-lg text-body outline-none"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--divider)',
              color: 'var(--text-primary)'
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
            autoFocus
          />

          <div className="flex gap-2">
            <button
              className="flex-1 py-2 rounded-xl text-body transition-opacity hover:opacity-70"
              style={{ background: 'var(--surface-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--divider)' }}
              onClick={() => setStep('done')}
            >
              Skip
            </button>
            <button
              className="flex-1 py-2 rounded-xl font-semibold text-body transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-active)', color: 'white' }}
              onClick={handleSaveName}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center gap-5 w-full max-w-xs animate-fade-in">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(168, 240, 196, 0.2)', border: '2px solid var(--success)' }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="var(--success)" strokeWidth="2.5">
              <polyline points="4,14 10.5,20.5 24,7"/>
            </svg>
          </div>
          <div className="text-center">
            <h2 className="text-h4 font-bold" style={{ color: 'var(--text-primary)' }}>You're all set!</h2>
            <p className="text-body mt-2" style={{ color: 'var(--text-secondary)' }}>
              Agent is ready. Click the pill at the bottom of your screen anytime to start chatting.
            </p>
          </div>
          <ul className="w-full flex flex-col gap-2">
            {[
              'Click the pill or press Cmd+K',
              'Double-click for expanded view',
              'Try: "Set a timer for 10 minutes"',
              'Ask for the weather, calendar events'
            ].map(tip => (
              <li key={tip} className="flex items-center gap-2 text-caption" style={{ color: 'var(--text-secondary)' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                  <path d="M2 5h6M6 2.5L8.5 5 6 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {tip}
              </li>
            ))}
          </ul>
          <button
            className="w-full py-2.5 rounded-xl font-semibold text-body transition-opacity hover:opacity-90"
            style={{ background: 'var(--accent-active)', color: 'white' }}
            onClick={handleComplete}
          >
            Start using Agent
          </button>
        </div>
      )}
    </div>
  )
}
