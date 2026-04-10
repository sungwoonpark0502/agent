import React from 'react'
import { useSettingsStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import { SettingsToggle } from '../SettingsToggle'

export function VoiceSettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="Voice Input">
        <SettingsToggle
          label="Enable Microphone"
          description="Use your microphone to talk to Agent"
          checked={settings.voiceEnabled}
          onChange={(v) => updateSetting('voiceEnabled', v)}
        />
        <div
          className="p-3 rounded-lg"
          style={{ background: 'rgba(90,159,212,0.08)', border: '1px solid rgba(90,159,212,0.2)' }}
        >
          <p className="font-medium" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
            Open Agent with a shortcut
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: 2 }}>
            Press <strong>⌘K</strong> from anywhere on your Mac to open Agent instantly.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection title="How Agent Transcribes Your Voice">
        <p style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
          When you tap the mic button, Agent records your voice and converts it to text.
          Cloud transcription is more accurate; offline works without internet.
        </p>
        <div className="flex gap-2">
          {[
            { value: 'whisper-api', label: 'Cloud (Accurate)', desc: 'Requires internet' },
            { value: 'whisper-local', label: 'Offline', desc: 'Works without internet' }
          ].map((opt) => (
            <button
              key={opt.value}
              className="flex-1 p-2.5 rounded-lg text-left transition-all"
              style={{
                border: settings.sttProvider === opt.value
                  ? '2px solid var(--accent-active)'
                  : '1px solid var(--divider)',
                background: settings.sttProvider === opt.value ? 'rgba(90,159,212,0.08)' : 'transparent'
              }}
              onClick={() => updateSetting('sttProvider', opt.value as 'whisper-api' | 'whisper-local')}
            >
              <p style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500 }}>{opt.label}</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Agent Speaks Back to You">
        <SettingsToggle
          label="Read Responses Aloud"
          description="Agent will speak its answers out loud"
          checked={settings.ttsEnabled}
          onChange={(v) => updateSetting('ttsEnabled', v)}
        />
        <SettingsToggle
          label="Always Read Aloud"
          description="Speak responses even when you type (not just voice)"
          checked={settings.alwaysSpeak}
          onChange={(v) => updateSetting('alwaysSpeak', v)}
        />
        <div>
          <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: 4 }}>
            Speaking speed: {settings.ttsSpeed.toFixed(1)}×
          </label>
          <input
            type="range" min="0.8" max="1.5" step="0.1"
            value={settings.ttsSpeed}
            onChange={(e) => updateSetting('ttsSpeed', parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label style={{ color: 'var(--text-secondary)', fontSize: '12px', display: 'block', marginBottom: 4 }}>
            Volume: {settings.ttsVolume}%
          </label>
          <input
            type="range" min="0" max="100" step="5"
            value={settings.ttsVolume}
            onChange={(e) => updateSetting('ttsVolume', parseInt(e.target.value))}
            className="w-full"
          />
        </div>
      </SettingsSection>
    </div>
  )
}
