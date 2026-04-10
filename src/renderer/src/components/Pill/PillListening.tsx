import React from 'react'

export function PillListening(): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 w-full h-full px-1">
      {/* Waveform animation */}
      <div className="flex items-center gap-0.5 h-5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="waveform-bar w-0.5 rounded-full"
            style={{
              height: '16px',
              background: 'var(--accent)',
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>
      <span className="text-caption" style={{ color: 'var(--accent-active)' }}>
        Listening...
      </span>
    </div>
  )
}
