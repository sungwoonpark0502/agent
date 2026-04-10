import React from 'react'

interface Props {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function SettingsToggle({ label, description, checked, onChange, disabled }: Props): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4">
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <span
              className="text-body"
              style={{ color: disabled ? 'var(--text-tertiary)' : 'var(--text-primary)' }}
            >
              {label}
            </span>
          )}
          {description && (
            <span className="text-caption" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
              {description}
            </span>
          )}
        </div>
      )}
      <label className="toggle-switch flex-shrink-0" style={{ opacity: disabled ? 0.4 : 1 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
