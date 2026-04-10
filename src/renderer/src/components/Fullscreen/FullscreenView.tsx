import React, { useEffect } from 'react'
import { ExpandedHeader } from '../Expanded/ExpandedHeader'
import { QuickActions } from '../Expanded/QuickActions'
import { ConversationThread } from '../Expanded/ConversationThread'
import { InputBar } from '../Expanded/InputBar'
import { SettingsPanel } from '../Settings/SettingsPanel'
import { useUIStore } from '../../store'

export function FullscreenView(): React.JSX.Element {
  const { isSettingsOpen, setSettingsOpen } = useUIStore()

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setSettingsOpen(false)
        } else {
          window.agent.window.setMode('expanded')
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault()
        setSettingsOpen(true)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isSettingsOpen, setSettingsOpen])

  return (
    <div
      className="w-full h-full flex flex-col glass rounded-2xl overflow-hidden animate-scale-in"
      style={{
        border: '1px solid var(--divider)',
        boxShadow: '0 20px 80px rgba(0,0,0,0.2)'
      }}
    >
      <ExpandedHeader onOpenSettings={() => setSettingsOpen(true)} />
      <QuickActions />

      <div className="flex-1 overflow-hidden flex">
        {/* Main conversation area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ConversationThread />
          <InputBar />
        </div>
      </div>

      {isSettingsOpen && (
        <SettingsPanel onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  )
}
