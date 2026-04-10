import React from 'react'

export function PillProcessing(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 w-full h-full px-1">
      <div className="flex items-center gap-1">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="typing-dot w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--accent)', animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
      <span className="text-caption" style={{ color: 'var(--text-secondary)' }}>
        Thinking...
      </span>
    </div>
  )
}
