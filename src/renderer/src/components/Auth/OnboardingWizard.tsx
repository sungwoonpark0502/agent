import React, { useState } from 'react'
import { useSettingsStore, useUIStore } from '../../store'
import type { PillPosition, AppTheme } from '../../../../shared/types'

interface Props {
  onComplete: () => void
}

const POSITIONS: Array<{ value: PillPosition; label: string }> = [
  { value: 'top-left', label: 'Top Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'bottom-right', label: 'Bottom Right' },
]

function PillCornerIcon({ position, selected }: { position: PillPosition; selected: boolean }): React.JSX.Element {
  const isTop = position.startsWith('top')
  const isLeft = position.endsWith('left')
  return (
    <div
      className="w-full rounded-xl flex items-center justify-center"
      style={{
        border: selected ? '2px solid var(--accent-active)' : '1px solid var(--divider)',
        background: selected ? 'rgba(58,127,196,0.08)' : 'var(--surface-elevated)',
        padding: 8,
        aspectRatio: '1'
      }}
    >
      <div className="relative w-full h-full rounded" style={{ background: 'var(--divider)' }}>
        <div
          className="absolute"
          style={{
            width: 20, height: 7,
            background: selected ? 'var(--accent-active)' : 'var(--text-tertiary)',
            top: isTop ? 3 : undefined,
            bottom: isTop ? undefined : 3,
            left: isLeft ? 3 : undefined,
            right: isLeft ? undefined : 3,
            borderRadius: 3,
            opacity: selected ? 1 : 0.4
          }}
        />
      </div>
    </div>
  )
}

export function OnboardingWizard({ onComplete }: Props): React.JSX.Element {
  const { setSettings } = useSettingsStore()
  const { setTheme } = useUIStore()

  const [name, setName] = useState('')
  const [agentName, setAgentName] = useState('Agent')
  const [theme, setLocalTheme] = useState<AppTheme>('system')
  const [pillPosition, setPillPosition] = useState<PillPosition>('bottom-right')
  const [step, setStep] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)

  const handleThemeSelect = (value: AppTheme): void => {
    setLocalTheme(value)
    if (value === 'system') {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      setTheme(value)
    }
  }

  const handleFinish = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.agent.settings.set({
        userName: name.trim() || 'User',
        agentName: agentName.trim() || 'Agent',
        theme,
        pillPosition,
        isOnboardingComplete: true
      })
      const updated = await window.agent.settings.get()
      setSettings(updated)
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col no-drag animate-fade-in overflow-hidden"
      style={{ background: 'transparent', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Drag header */}
      <div
        className="drag-region flex-shrink-0 flex items-center px-4 gap-3"
        style={{ height: 46, borderBottom: '1px solid var(--divider)', background: 'var(--surface-solid)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500, flex: 1 }}>
          Getting started
        </span>
        <div className="flex items-center gap-1.5 no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {([1, 2] as const).map((s) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: step === s ? 16 : 5,
                height: 5,
                background: step === s ? 'var(--accent-active)' : (s < step ? 'var(--success)' : 'var(--divider)')
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-3 pb-6" style={{ background: 'var(--surface-solid)' }}>

        {/* Step 1: Name */}
        {step === 1 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700, marginBottom: 3 }}>
                Welcome! What's your name?
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Your agent will address you by this name.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
                  Your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ background: 'transparent', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') setStep(2) }}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
                  Agent name
                </label>
                <input
                  type="text"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={{ background: 'transparent', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  onKeyDown={e => { if (e.key === 'Enter') setStep(2) }}
                />
              </div>
            </div>

            <button
              className="w-full py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Appearance + Pill position */}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-fade-in">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700, marginBottom: 3 }}>
                Set your preferences
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                You can always change these in Settings.
              </p>
            </div>

            {/* Theme */}
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 6 }}>
                Appearance
              </label>
              <div className="flex gap-2">
                {(['system', 'light', 'dark'] as AppTheme[]).map(t => (
                  <button
                    key={t}
                    className="flex-1 py-1.5 rounded-lg text-center font-medium transition-all"
                    style={{
                      border: theme === t ? '2px solid var(--accent-active)' : '1px solid var(--divider)',
                      background: theme === t ? 'rgba(58,127,196,0.1)' : 'transparent',
                      color: theme === t ? 'var(--accent-active)' : 'var(--text-secondary)',
                      fontSize: '12px'
                    }}
                    onClick={() => handleThemeSelect(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Pill position */}
            <div>
              <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 6 }}>
                Pill position
              </label>
              <div className="flex justify-center">
              <div className="grid grid-cols-2 gap-2" style={{ width: 160 }}>
                {POSITIONS.map(pos => (
                  <button
                    key={pos.value}
                    className="flex flex-col items-center gap-1"
                    onClick={() => setPillPosition(pos.value)}
                  >
                    <PillCornerIcon position={pos.value} selected={pillPosition === pos.value} />
                    <span style={{
                      fontSize: '10px',
                      color: pillPosition === pos.value ? 'var(--accent-active)' : 'var(--text-tertiary)',
                      fontWeight: pillPosition === pos.value ? 600 : 400
                    }}>
                      {pos.label}
                    </span>
                  </button>
                ))}
              </div>
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                className="flex-1 py-2.5 rounded-xl font-medium transition-opacity hover:opacity-70"
                style={{ border: '1px solid var(--divider)', color: 'var(--text-secondary)', fontSize: '13px' }}
                onClick={() => setStep(1)}
              >
                Back
              </button>
              <button
                className="flex-1 py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
                onClick={handleFinish}
                disabled={saving}
              >
                {saving ? 'Setting up…' : 'Get Started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
