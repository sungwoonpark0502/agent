import React, { useState, useRef } from 'react'
import { useSettingsStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import { SettingsToggle } from '../SettingsToggle'

export function GeneralSettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  const [anthropicKey, setAnthropicKey] = useState('')
  const [weatherKey, setWeatherKey] = useState('')
  const [keySaving, setKeySaving] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const saveKeys = async (): Promise<void> => {
    setKeySaving(true)
    try {
      if (anthropicKey) await window.agent.apiKey.set('anthropic', anthropicKey)
      if (weatherKey) await window.agent.apiKey.set('weather', weatherKey)
      setAnthropicKey('')
      setWeatherKey('')
      setKeySaved(true)
      setTimeout(() => setKeySaved(false), 2000)
    } finally {
      setKeySaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      updateSetting('userAvatar', dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const userInitial = (settings.userName || 'U').charAt(0).toUpperCase()

  return (
    <div className="flex flex-col gap-5">

      {/* Profile */}
      <SettingsSection title="Profile">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <button
              className="relative hover:opacity-80 transition-opacity"
              onClick={() => avatarInputRef.current?.click()}
              title="Change photo"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
                style={{ background: settings.userAvatar ? 'transparent' : 'linear-gradient(135deg, #5A9FD4, #9B87CC)' }}
              >
                {settings.userAvatar ? (
                  <img src={settings.userAvatar} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <span style={{ fontSize: '18px', color: 'white', fontWeight: 700 }}>{userInitial}</span>
                )}
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'var(--accent-active)' }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M5.5 1.5l1 1L2 7H1V6L5.5 1.5z" stroke="white" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </button>
            {settings.userAvatar && (
              <button
                className="hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}
                onClick={() => updateSetting('userAvatar', '')}
              >
                Remove
              </button>
            )}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

          {/* Name fields */}
          <div className="flex-1 flex flex-col gap-2 min-w-0">
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Your name</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 rounded-lg"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                placeholder="Your name"
                value={settings.userName}
                onChange={(e) => updateSetting('userName', e.target.value)}
              />
            </div>
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Agent name</label>
              <input
                type="text"
                className="w-full px-2.5 py-1.5 rounded-lg"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                placeholder="e.g. Alex, Amy, Chris…"
                value={settings.agentName}
                onChange={(e) => updateSetting('agentName', e.target.value)}
              />
            </div>
          </div>
        </div>
        <SettingsToggle
          label="Start at Login"
          description="Open automatically on startup"
          checked={settings.launchAtLogin}
          onChange={(v) => updateSetting('launchAtLogin', v)}
        />
      </SettingsSection>

      {/* API Keys */}
      <SettingsSection title="AI Connection">
        <div
          className="p-2.5 rounded-lg flex items-center gap-2"
          style={{
            background: settings.hasAnthropicKey ? 'rgba(52,168,83,0.08)' : 'rgba(217,48,37,0.06)',
            border: `1px solid ${settings.hasAnthropicKey ? 'rgba(52,168,83,0.25)' : 'rgba(217,48,37,0.2)'}`
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: settings.hasAnthropicKey ? 'var(--success)' : 'var(--error)' }} />
          <p style={{ color: 'var(--text-primary)', fontSize: '12px', flex: 1 }}>
            {settings.hasAnthropicKey ? 'Connected to Claude AI' : 'No AI key — demo mode'}
          </p>
        </div>

        {!settings.hasAnthropicKey && (
          <div>
            <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
              Anthropic API Key
            </label>
            <input
              type="password"
              className="w-full px-2.5 py-1.5 rounded-lg"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
              placeholder="sk-ant-api03-…"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
            <p style={{ color: 'var(--text-tertiary)', fontSize: '10px', marginTop: 2 }}>Get a key at console.anthropic.com</p>
          </div>
        )}

        <div>
          <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
            Weather API Key {settings.hasWeatherKey && <span style={{ color: 'var(--success)' }}>— connected</span>}
          </label>
          <input
            type="password"
            className="w-full px-2.5 py-1.5 rounded-lg"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
            placeholder={settings.hasWeatherKey ? '••••••••' : 'OpenWeatherMap key'}
            value={weatherKey}
            onChange={(e) => setWeatherKey(e.target.value)}
          />
        </div>

        {(anthropicKey || weatherKey) && (
          <button
            className="w-full py-2 rounded-lg font-medium transition-all"
            style={{ background: keySaved ? 'var(--success)' : 'var(--accent-active)', color: 'white', fontSize: '13px', opacity: keySaving ? 0.7 : 1 }}
            onClick={saveKeys}
            disabled={keySaving}
          >
            {keySaved ? 'Saved' : keySaving ? 'Saving…' : 'Save'}
          </button>
        )}
      </SettingsSection>

      {/* Behavior */}
      <SettingsSection title="Behavior">
        <SettingsToggle
          label="Enter to send"
          description="Shift+Enter for a new line"
          checked={settings.sendOnEnter}
          onChange={(v) => updateSetting('sendOnEnter', v)}
        />
        <SettingsToggle
          label="Remember things I say"
          description="Save useful info from conversations"
          checked={settings.autoMemory}
          onChange={(v) => updateSetting('autoMemory', v)}
        />
      </SettingsSection>
    </div>
  )
}
