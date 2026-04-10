import React, { useCallback } from 'react'
import { useUIStore } from '../../store'
import { PillIdle } from './PillIdle'
import { PillListening } from './PillListening'
import { PillProcessing } from './PillProcessing'
import { PillResponding } from './PillResponding'

export function PillView(): React.JSX.Element {
  const { pillState } = useUIStore()

  const handleClick = useCallback(() => {
    window.agent.window.setMode('expanded')
  }, [])

  return (
    <div
      className="w-full h-full flex items-center drag-region rounded-pill overflow-hidden"
      style={{
        background: 'transparent',
        border: '1px solid rgba(168, 200, 240, 0.25)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
      }}
      onDoubleClick={handleClick}
    >
      {/* Drag grip — left edge stays draggable */}
      <div className="drag-region w-2 h-full flex-shrink-0" />

      {/* Content — no-drag so clicks work */}
      <div className="no-drag flex-1 h-full flex items-center px-2 gap-2 min-w-0">
        {pillState === 'idle' && <PillIdle onClick={handleClick} />}
        {pillState === 'listening' && <PillListening />}
        {pillState === 'processing' && <PillProcessing />}
        {pillState === 'responding' && <PillResponding />}
        {pillState === 'offline' && <PillIdle onClick={handleClick} isOffline />}
        {pillState === 'error' && <PillIdle onClick={handleClick} isError />}
      </div>

      {/* Drag grip — right edge stays draggable */}
      <div className="drag-region w-2 h-full flex-shrink-0" />
    </div>
  )
}
