import React, { useEffect, useCallback } from 'react'
import { useUIStore } from '../../store'
import type { Timer, Alarm } from '../../../../shared/types'

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatAlarmTime(timeStr: string): string {
  return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Timer Card ───────────────────────────────────────────────────────────────

function TimerCard({ timer }: { timer: Timer }) {
  const { removeTimer } = useUIStore()
  const progress = 1 - timer.remainingSeconds / timer.durationSeconds
  const circumference = 2 * Math.PI * 18

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 animate-fade-in"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--divider)',
        minWidth: 0
      }}
    >
      {/* Circular progress */}
      <div className="relative flex-shrink-0" style={{ width: 40, height: 40 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="20" cy="20" r="18" fill="none" stroke="var(--divider)" strokeWidth="3"/>
          <circle
            cx="20" cy="20" r="18" fill="none"
            stroke="var(--accent)" strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}
        >
          {timer.isPaused ? '⏸' : ''}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-caption font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {timer.label}
        </div>
        <div
          className="font-mono font-semibold"
          style={{ color: 'var(--accent)', fontSize: '15px', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}
        >
          {formatTime(timer.remainingSeconds)}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1">
        <button
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ color: 'var(--text-secondary)', background: 'transparent' }}
          onClick={() => timer.isPaused ? window.agent.timer.resume(timer.id) : window.agent.timer.pause(timer.id)}
          title={timer.isPaused ? 'Resume' : 'Pause'}
        >
          {timer.isPaused ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <polygon points="2,1 9,5 2,9"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1.5" y="1" width="2.5" height="8" rx="1"/>
              <rect x="6" y="1" width="2.5" height="8" rx="1"/>
            </svg>
          )}
        </button>
        <button
          className="w-6 h-6 rounded flex items-center justify-center"
          style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
          onClick={() => {
            window.agent.timer.cancel(timer.id)
            removeTimer(timer.id)
          }}
          title="Cancel timer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M2 2l6 6M8 2l-6 6"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Alarm Card ───────────────────────────────────────────────────────────────

function AlarmCard({ alarm }: { alarm: Alarm }) {
  const { removeAlarm } = useUIStore()

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 animate-fade-in"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--divider)',
        minWidth: 0
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(168, 200, 240, 0.15)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--accent)" strokeWidth="1.5">
          <circle cx="7" cy="7" r="5.5"/>
          <path d="M7 4v3l2 1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2.5 2L1 3.5M11.5 2L13 3.5" strokeLinecap="round"/>
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-caption font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {alarm.label}
        </div>
        <div className="text-caption" style={{ color: 'var(--text-secondary)' }}>
          {formatAlarmTime(alarm.time)}
          {alarm.repeat !== 'none' && <span className="ml-1 opacity-60">· {alarm.repeat}</span>}
        </div>
      </div>

      <button
        className="w-6 h-6 rounded flex items-center justify-center"
        style={{ color: 'var(--text-tertiary)', background: 'transparent' }}
        onClick={() => removeAlarm(alarm.id)}
        title="Dismiss alarm"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M2 2l6 6M8 2l-6 6"/>
        </svg>
      </button>
    </div>
  )
}

// ─── Timer complete notification ──────────────────────────────────────────────

function TimerCompleteCard({ timer, onDismiss }: { timer: Timer; onDismiss: () => void }) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 animate-scale-in"
      style={{
        background: 'rgba(168, 240, 196, 0.15)',
        border: '1px solid rgba(168, 240, 196, 0.4)'
      }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(168, 240, 196, 0.2)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--success)" strokeWidth="2">
          <polyline points="2,7 5.5,10.5 12,3.5"/>
        </svg>
      </div>
      <div className="flex-1">
        <div className="text-caption font-semibold" style={{ color: 'var(--success)' }}>Timer complete!</div>
        <div className="text-caption" style={{ color: 'var(--text-secondary)' }}>{timer.label}</div>
      </div>
      <button
        className="text-caption px-2 py-1 rounded"
        style={{ color: 'var(--success)', background: 'rgba(168, 240, 196, 0.2)' }}
        onClick={onDismiss}
      >
        Dismiss
      </button>
    </div>
  )
}

// ─── Main TimerPanel ──────────────────────────────────────────────────────────

export function TimerPanel(): React.JSX.Element | null {
  const { activeTimers, activeAlarms, completedTimers, updateTimer, removeTimer, removeAlarm, dismissCompletedTimer } = useUIStore()

  useEffect(() => {
    const unsubTick = window.agent.timer.onTick((t) => {
      updateTimer(t as Timer)
    })
    const unsubComplete = window.agent.timer.onComplete((t) => {
      updateTimer({ ...(t as Timer), completedAt: Date.now() })
    })
    return () => { unsubTick(); unsubComplete() }
  }, [updateTimer])

  if (activeTimers.length === 0 && activeAlarms.length === 0 && completedTimers.length === 0) {
    return null
  }

  return (
    <div
      className="flex-shrink-0 px-3 py-2 flex flex-col gap-2"
      style={{ borderBottom: '1px solid var(--divider)' }}
    >
      {completedTimers.map(t => (
        <TimerCompleteCard key={t.id} timer={t} onDismiss={() => dismissCompletedTimer(t.id)} />
      ))}
      {activeTimers.map(t => (
        <TimerCard key={t.id} timer={t} />
      ))}
      {activeAlarms.map(a => (
        <AlarmCard key={a.id} alarm={a} />
      ))}
    </div>
  )
}
