import React, { useEffect } from 'react'

interface Props {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel
}: Props): React.JSX.Element {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onConfirm, onCancel])

  return (
    <div
      className="absolute inset-0 flex items-center justify-center z-50 animate-fade-in no-drag"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      onClick={onCancel}
    >
      <div
        className="w-72 p-5 rounded-xl flex flex-col gap-4 animate-scale-in"
        style={{
          background: 'var(--surface-elevated)',
          backdropFilter: 'var(--blur)',
          boxShadow: 'var(--shadow-elevated)',
          border: '1px solid var(--divider)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="font-semibold text-h4 mb-1" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
          <p className="text-caption whitespace-pre-wrap selectable" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            className="flex-1 py-2 rounded-lg text-body font-medium transition-all hover:opacity-80"
            style={{
              background: 'rgba(0,0,0,0.06)',
              color: 'var(--text-primary)'
            }}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="flex-1 py-2 rounded-lg text-body font-medium transition-all hover:opacity-80"
            style={{
              background: destructive ? 'var(--error)' : 'var(--accent-active)',
              color: 'white'
            }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
