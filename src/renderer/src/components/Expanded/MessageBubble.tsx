import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage } from '../../../../shared/types'

interface Props {
  message: ChatMessage
}

export function MessageBubble({ message }: Props): React.JSX.Element {
  const [showTimestamp, setShowTimestamp] = useState(false)
  const isUser = message.role === 'user'

  const time = new Date(message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <div className="flex flex-col gap-1 max-w-[85%] min-w-0">
        <div
          className={`px-3 py-2.5 rounded-xl ${
            isUser ? 'rounded-br-sm' : 'rounded-bl-sm bubble-assistant'
          }`}
          style={
            isUser
              ? {
                  background: 'var(--accent-active)',
                  color: '#ffffff'
                }
              : {
                  color: 'var(--text-primary)'
                }
          }
        >
          {isUser ? (
            <p className="selectable text-body whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <div className="selectable markdown-content text-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span
                  className="inline-block w-0.5 h-4 ml-0.5 animate-pulse"
                  style={{ background: 'var(--accent)' }}
                />
              )}
            </div>
          )}
        </div>

        {showTimestamp && (
          <p
            className="text-caption animate-fade-in"
            style={{
              color: 'var(--text-tertiary)',
              textAlign: isUser ? 'right' : 'left',
              fontSize: '11px'
            }}
          >
            {time}
          </p>
        )}
      </div>
    </div>
  )
}
