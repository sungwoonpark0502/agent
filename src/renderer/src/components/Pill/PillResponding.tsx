import React from 'react'
import { useConversationStore } from '../../store'

export function PillResponding(): React.JSX.Element {
  const messages = useConversationStore((s) => s.messages)
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const preview = lastAssistant?.content?.slice(0, 60) ?? ''

  return (
    <div className="flex items-center gap-2 w-full h-full px-1">
      <div
        className="w-5 h-5 rounded-full flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #A8C8F0, #C4B5E0)' }}
      />
      <span
        className="flex-1 text-caption truncate"
        style={{ color: 'var(--text-primary)' }}
        title={lastAssistant?.content}
      >
        {preview}
      </span>
    </div>
  )
}
