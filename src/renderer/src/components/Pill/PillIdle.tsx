import React from 'react'

interface PillIdleProps {
  onClick: () => void
  isOffline?: boolean
  isError?: boolean
}

export function PillIdle({ onClick, isOffline, isError }: PillIdleProps): React.JSX.Element {
  return (
    <button
      className="flex items-center gap-2 w-full h-full text-left"
      onClick={onClick}
    >
      {/* Agent icon — simple circle */}
      <div
        className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #A8C8F0, #C4B5E0)' }}
      >
        <span style={{ fontSize: '9px', color: 'white', fontWeight: 700 }}>A</span>
      </div>

      <span
        className="flex-1 text-caption font-medium truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        Agent
      </span>

      {/* Status indicator */}
      {isOffline && (
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--warning)' }} />
      )}
      {isError && (
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--error)' }} />
      )}
      {!isOffline && !isError && (
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--success)' }} />
      )}
    </button>
  )
}
