import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useConversationStore, useUIStore, useSettingsStore } from '../../store'
import type { StreamChunk } from '../../../../shared/types'

const MAX_CHARS = 10000
const WARN_AT = 8000

export function InputBar(): React.JSX.Element {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { messages, addMessage, appendToMessage, finalizeMessage, setStreaming, setActiveTool, conversationId, draft, setDraft } = useConversationStore()
  const { isStreaming, setPillState } = useUIStore()
  const settings = useSettingsStore((s) => s.settings)

  // Restore draft on mount
  useEffect(() => {
    if (draft) setText(draft)
  }, [])

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [text])

  // Stream listeners
  useEffect(() => {
    let currentMessageId: string | null = null

    const unsubChunk = window.agent.chat.onStreamChunk((chunk: StreamChunk) => {
      if (!currentMessageId) {
        const msg = addMessage({ role: 'assistant', content: chunk.delta, isStreaming: true })
        currentMessageId = msg.id
        setStreaming(true, msg.id)
        setPillState('responding')
      } else if (chunk.isDone) {
        const { settings: s } = useSettingsStore.getState()
        if (s.ttsEnabled && s.alwaysSpeak && currentMessageId) {
          const msg = useConversationStore.getState().messages.find(m => m.id === currentMessageId)
          if (msg?.content) window.agent.tts.speak(msg.content)
        }
        finalizeMessage(currentMessageId)
        setStreaming(false)
        setPillState('idle')
        currentMessageId = null
      } else {
        appendToMessage(currentMessageId, chunk.delta)
      }
    })

    const unsubError = window.agent.chat.onError(({ message }) => {
      addMessage({ role: 'assistant', content: `Error: ${message}` })
      setStreaming(false)
      setPillState('error')
      setTimeout(() => setPillState('idle'), 3000)
      currentMessageId = null
    })

    const unsubTool = window.agent.chat.onToolExecuting(({ name }) => {
      setActiveTool(name)
    })

    return () => { unsubChunk(); unsubError(); unsubTool() }
  }, [addMessage, appendToMessage, finalizeMessage, setStreaming, setPillState, setActiveTool])

  // PTT trigger from global shortcut
  useEffect(() => {
    const unsub = window.agent.voice.onPTTTrigger(() => {
      if (!isRecording) startVoice()
    })
    return unsub
  }, [isRecording])

  const sendMessage = useCallback(() => {
    const content = text.trim()
    if (!content || isStreaming) return
    setText('')
    setDraft('')
    setActiveTool(null)
    setStreaming(true)
    setPillState('processing')
    addMessage({ role: 'user', content })
    window.agent.chat.send(useConversationStore.getState().messages, conversationId)
  }, [text, isStreaming, addMessage, setStreaming, setPillState, conversationId, setDraft, setActiveTool])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (settings.sendOnEnter && !e.shiftKey) {
        e.preventDefault(); sendMessage()
      } else if (!settings.sendOnEnter && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); sendMessage()
      }
    }
  }, [settings.sendOnEnter, sendMessage])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) { setText(val); setDraft(val) }
  }, [setDraft])

  const startVoice = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(100)
      recorderRef.current = recorder
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch (err) {
      console.error('Microphone access denied:', err)
    }
  }

  const stopVoice = useCallback(async (): Promise<void> => {
    const recorder = recorderRef.current
    if (!recorder) return

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    setIsRecording(false)
    setRecordingSeconds(0)

    recorder.stop()
    recorder.stream.getTracks().forEach(t => t.stop())
    recorderRef.current = null

    await new Promise<void>(r => { recorder.onstop = () => r() })

    setIsTranscribing(true)
    try {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      chunksRef.current = []
      const arrayBuffer = await blob.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
      const { transcript } = await window.agent.voice.transcribe(base64)
      if (transcript?.trim()) {
        const newText = text ? text + ' ' + transcript.trim() : transcript.trim()
        setText(newText.slice(0, MAX_CHARS))
        setDraft(newText)
        // Inject into textarea for React to pick up
        const input = textareaRef.current
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
          setter?.call(input, newText.slice(0, MAX_CHARS))
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.focus()
        }
      }
    } catch (err) {
      console.error('Transcription failed:', err)
    } finally {
      setIsTranscribing(false)
    }
  }, [text, setDraft])

  const toggleVoice = useCallback((): void => {
    if (isRecording) {
      stopVoice()
    } else {
      startVoice()
    }
  }, [isRecording, stopVoice])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recorderRef.current?.stop()
    }
  }, [])

  const charCount = text.length

  return (
    <div
      className="flex-shrink-0 px-3 pb-3 pt-2"
      style={{ borderTop: '1px solid var(--divider)', background: 'var(--surface-elevated)' }}
    >
      <div
        className="input-box flex items-end gap-2 rounded-xl px-3 py-2"
        style={{
          border: `1px solid ${isRecording ? 'rgba(232,114,106,0.4)' : 'var(--divider)'}`,
          minHeight: 48
        }}
      >
        {/* Mic button */}
        <button
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
          style={{
            color: isRecording ? 'var(--error)' : isTranscribing ? 'var(--accent)' : 'var(--text-secondary)',
            background: isRecording ? 'rgba(232,114,106,0.12)' : isTranscribing ? 'rgba(168,200,240,0.12)' : 'transparent'
          }}
          onClick={toggleVoice}
          disabled={isTranscribing}
          title={isRecording ? 'Stop recording' : isTranscribing ? 'Transcribing…' : 'Voice input'}
        >
          {isTranscribing ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="1" width="6" height="9" rx="3" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M2 8c0 3.31 2.69 6 6 6s6-2.69 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M8 14v1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              {isRecording && (
                <circle cx="8" cy="5.5" r="2" fill="var(--error)">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/>
                </circle>
              )}
            </svg>
          )}
        </button>

        {/* Recording state display */}
        {isRecording ? (
          <div className="flex-1 flex items-center gap-2">
            <RecordingWaveform />
            <span style={{ color: 'var(--error)', fontSize: '12px', flexShrink: 0 }}>
              {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
          </div>
        ) : isTranscribing ? (
          <div className="flex-1 flex items-center">
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Transcribing…</span>
          </div>
        ) : (
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={text}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Message Agent…"
            className="flex-1 resize-none bg-transparent text-body outline-none leading-normal"
            style={{
              color: 'var(--text-primary)',
              minHeight: 24,
              maxHeight: 120,
              overflow: 'auto',
              lineHeight: '1.47'
            }}
            rows={1}
          />
        )}

        {/* Char count */}
        {charCount > WARN_AT && !isRecording && !isTranscribing && (
          <span
            className="self-center flex-shrink-0"
            style={{ color: charCount > MAX_CHARS - 500 ? 'var(--error)' : 'var(--warning)', fontSize: '11px' }}
          >
            {MAX_CHARS - charCount}
          </span>
        )}

        {/* Send button */}
        {!isRecording && !isTranscribing && (
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
            style={{
              background: text.trim() && !isStreaming ? 'var(--accent-active)' : 'transparent',
              color: text.trim() && !isStreaming ? 'white' : 'var(--text-tertiary)'
            }}
            onClick={sendMessage}
            disabled={!text.trim() || isStreaming}
            title="Send"
          >
            {isStreaming ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M12 7L2 2l2.5 5L2 12l10-5z" fill="currentColor"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

function RecordingWaveform(): React.JSX.Element {
  return (
    <div className="flex items-center gap-0.5 flex-1">
      {[3, 5, 8, 5, 7, 4, 9, 5, 3, 6, 8, 4].map((h, i) => (
        <div
          key={i}
          className="waveform-bar rounded-full flex-shrink-0"
          style={{
            width: 2,
            height: h,
            background: 'var(--error)',
            opacity: 0.7,
            animationDelay: `${i * 0.08}s`
          }}
        />
      ))}
    </div>
  )
}
