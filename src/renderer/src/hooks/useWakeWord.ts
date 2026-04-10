import { useEffect, useRef } from 'react'

type SpeechRecognitionType = typeof SpeechRecognition

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionType
    webkitSpeechRecognition: SpeechRecognitionType
  }
}

/**
 * Always-on wake word listener using the Web Speech API.
 * Fires onActivate when "hey agent" or "agent" is detected.
 */
export function useWakeWord(enabled: boolean, onActivate: () => void): void {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const enabledRef = useRef(enabled)
  const activateRef = useRef(onActivate)

  useEffect(() => { enabledRef.current = enabled }, [enabled])
  useEffect(() => { activateRef.current = onActivate }, [onActivate])

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    if (!enabled) {
      recognitionRef.current?.stop()
      recognitionRef.current = null
      return
    }

    let stopped = false

    const start = (): void => {
      if (stopped) return
      const rec = new SR()
      rec.continuous = true
      rec.interimResults = true
      rec.lang = 'en-US'
      rec.maxAlternatives = 1

      rec.onresult = (event: SpeechRecognitionEvent) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript.toLowerCase().trim()
          if (t.includes('hey agent') || t.includes('hey, agent')) {
            activateRef.current()
          }
        }
      }

      rec.onend = () => {
        if (!stopped && enabledRef.current) {
          // Restart after brief pause to avoid rapid-fire restarts
          setTimeout(start, 300)
        }
      }

      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        // 'no-speech' and 'aborted' are expected — don't log
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('Wake word recognition error:', e.error)
        }
      }

      recognitionRef.current = rec
      try { rec.start() } catch { /* already started */ }
    }

    start()

    return () => {
      stopped = true
      try { recognitionRef.current?.stop() } catch { /* ignore */ }
      recognitionRef.current = null
    }
  }, [enabled])
}
