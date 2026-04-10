import React from 'react'

interface Props {
  toolName?: string | null
}

export function TypingIndicator({ toolName }: Props): React.JSX.Element {
  return (
    <div className="flex justify-start animate-fade-in">
      <div
        className="px-3 py-2.5 rounded-xl rounded-bl-sm flex items-center gap-2"
        style={{
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid var(--divider)'
        }}
      >
        <div className="flex items-center gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="typing-dot w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--text-tertiary)' }}
            />
          ))}
        </div>
        {toolName && (
          <span className="text-caption" style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
            Using {toolName.replace(/_/g, ' ')}…
          </span>
        )}
      </div>
    </div>
  )
}
