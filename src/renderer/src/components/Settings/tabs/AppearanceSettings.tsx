import React from 'react'
import { useSettingsStore, useUIStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import type { PillPosition } from '../../../../../shared/types'

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' }
] as const

const POSITIONS: PillPosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right']

function PillPositionIcon({ position, selected }: { position: PillPosition; selected: boolean }): React.JSX.Element {
  const isTop = position.startsWith('top')
  const isLeft = position.endsWith('left')

  return (
    <div
      className="w-full rounded-xl flex items-center justify-center transition-all"
      style={{
        border: selected ? '2px solid var(--accent-active)' : '1px solid var(--divider)',
        background: selected ? 'rgba(58,127,196,0.1)' : 'rgba(0,0,0,0.02)',
        padding: 10,
        aspectRatio: '1'
      }}
    >
      {/* Screen box */}
      <div className="relative w-full h-full rounded-lg" style={{ background: 'rgba(0,0,0,0.07)' }}>
        {/* Pill in the corner */}
        <div
          className="absolute"
          style={{
            width: 22,
            height: 8,
            background: selected ? 'var(--accent-active)' : 'var(--text-tertiary)',
            top: isTop ? 4 : undefined,
            bottom: isTop ? undefined : 4,
            left: isLeft ? 4 : undefined,
            right: isLeft ? undefined : 4,
            borderRadius: 4,
            opacity: selected ? 1 : 0.5
          }}
        />
      </div>
    </div>
  )
}

const POSITION_LABELS: Record<PillPosition, string> = {
  'top-left': 'Top Left',
  'top-right': 'Top Right',
  'bottom-left': 'Bottom Left',
  'bottom-right': 'Bottom Right'
}

export function AppearanceSettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()
  const { setTheme } = useUIStore()

  const handleThemeChange = (value: 'system' | 'light' | 'dark'): void => {
    updateSetting('theme', value)
    if (value === 'system') {
      setTheme(window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    } else {
      setTheme(value)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <SettingsSection title="Theme">
        <div className="flex gap-2">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="flex-1 py-2 rounded-lg text-center font-medium transition-all"
              style={{
                border: settings.theme === opt.value ? '2px solid var(--accent-active)' : '1px solid var(--divider)',
                background: settings.theme === opt.value ? 'rgba(58,127,196,0.1)' : 'transparent',
                color: settings.theme === opt.value ? 'var(--accent-active)' : 'var(--text-secondary)',
                fontSize: '12px'
              }}
              onClick={() => handleThemeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Pill Position" description="Where the pill appears on screen">
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              className="flex flex-col items-center gap-1"
              onClick={() => updateSetting('pillPosition', pos)}
            >
              <PillPositionIcon position={pos} selected={settings.pillPosition === pos} />
              <span style={{
                fontSize: '10px',
                color: settings.pillPosition === pos ? 'var(--accent-active)' : 'var(--text-tertiary)',
                fontWeight: settings.pillPosition === pos ? 600 : 400
              }}>
                {POSITION_LABELS[pos]}
              </span>
            </button>
          ))}
        </div>
      </SettingsSection>
    </div>
  )
}
