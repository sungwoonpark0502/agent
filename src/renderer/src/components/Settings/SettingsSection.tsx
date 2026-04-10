import React from 'react'

interface Props {
  title: string
  description?: string
  children: React.ReactNode
}

export function SettingsSection({ title, description, children }: Props): React.JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="font-semibold text-h4" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        {description && (
          <p className="text-caption mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        )}
      </div>
      <div
        className="flex flex-col gap-3 p-4 rounded-xl"
        style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)' }}
      >
        {children}
      </div>
    </div>
  )
}
