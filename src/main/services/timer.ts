import { v4 as uuidv4 } from 'uuid'
import { createLogger } from './logger'
import type { Timer, Alarm } from '../../shared/types'

const logger = createLogger('timer')

type TimerCallback = (timer: Timer) => void
type AlarmCallback = (alarm: Alarm) => void

export class TimerService {
  private static instance: TimerService
  private timers = new Map<string, Timer>()
  private alarms = new Map<string, Alarm>()
  private intervals = new Map<string, NodeJS.Timeout>()
  private onTimerComplete?: TimerCallback
  private onAlarmFire?: AlarmCallback
  private onTick?: TimerCallback

  static getInstance(): TimerService {
    if (!TimerService.instance) {
      TimerService.instance = new TimerService()
    }
    return TimerService.instance
  }

  setCallbacks(cbs: {
    onTimerComplete?: TimerCallback
    onAlarmFire?: AlarmCallback
    onTick?: TimerCallback
  }): void {
    this.onTimerComplete = cbs.onTimerComplete
    this.onAlarmFire = cbs.onAlarmFire
    this.onTick = cbs.onTick
  }

  // ─── Timers ──────────────────────────────────────────────────────────────────

  createTimer(durationSeconds: number, label = 'Timer'): Timer {
    const timer: Timer = {
      id: uuidv4(),
      label,
      durationSeconds,
      remainingSeconds: durationSeconds,
      isPaused: false,
      startedAt: Date.now(),
      completedAt: null
    }

    this.timers.set(timer.id, timer)
    this.startTimerInterval(timer.id)
    logger.info({ id: timer.id, label, durationSeconds }, 'Timer created')
    return timer
  }

  private startTimerInterval(id: string): void {
    const interval = setInterval(() => {
      const timer = this.timers.get(id)
      if (!timer || timer.isPaused) return

      timer.remainingSeconds -= 1
      this.onTick?.(timer)

      if (timer.remainingSeconds <= 0) {
        timer.remainingSeconds = 0
        timer.completedAt = Date.now()
        clearInterval(interval)
        this.intervals.delete(id)
        logger.info({ id }, 'Timer completed')
        this.onTimerComplete?.(timer)
      }
    }, 1000)

    this.intervals.set(id, interval)
  }

  pauseTimer(id: string): boolean {
    const timer = this.timers.get(id)
    if (!timer) return false
    timer.isPaused = true
    return true
  }

  resumeTimer(id: string): boolean {
    const timer = this.timers.get(id)
    if (!timer) return false
    timer.isPaused = false
    return true
  }

  cancelTimer(id: string): boolean {
    const interval = this.intervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(id)
    }
    return this.timers.delete(id)
  }

  getTimers(): Timer[] {
    return Array.from(this.timers.values())
  }

  getTimer(id: string): Timer | undefined {
    return this.timers.get(id)
  }

  // ─── Alarms ──────────────────────────────────────────────────────────────────

  createAlarm(time: string, label = 'Alarm', repeat: Alarm['repeat'] = 'none'): Alarm {
    const alarm: Alarm = {
      id: uuidv4(),
      label,
      time,
      repeat,
      isActive: true,
      lastFiredAt: null
    }

    this.alarms.set(alarm.id, alarm)
    this.scheduleAlarm(alarm)
    logger.info({ id: alarm.id, time, label }, 'Alarm created')
    return alarm
  }

  private scheduleAlarm(alarm: Alarm): void {
    const fireTime = new Date(alarm.time).getTime()
    const now = Date.now()
    const delay = fireTime - now

    if (delay <= 0) {
      // Already passed — fire immediately for one-time alarms
      if (alarm.repeat === 'none') {
        logger.info({ id: alarm.id }, 'Alarm in the past, ignoring')
        return
      }
    }

    const effectiveDelay = delay > 0 ? delay : 1000
    setTimeout(() => {
      const a = this.alarms.get(alarm.id)
      if (!a || !a.isActive) return
      a.lastFiredAt = new Date().toISOString()
      logger.info({ id: a.id }, 'Alarm fired')
      this.onAlarmFire?.(a)

      // Reschedule if repeating
      if (a.repeat !== 'none') {
        const nextTime = this.getNextAlarmTime(a)
        if (nextTime) {
          a.time = nextTime
          this.scheduleAlarm(a)
        }
      }
    }, effectiveDelay)
  }

  private getNextAlarmTime(alarm: Alarm): string | null {
    const d = new Date(alarm.time)
    switch (alarm.repeat) {
      case 'daily':
        d.setDate(d.getDate() + 1)
        return d.toISOString()
      case 'weekdays':
        do { d.setDate(d.getDate() + 1) } while (d.getDay() === 0 || d.getDay() === 6)
        return d.toISOString()
      case 'weekends':
        do { d.setDate(d.getDate() + 1) } while (d.getDay() !== 0 && d.getDay() !== 6)
        return d.toISOString()
      case 'weekly':
        d.setDate(d.getDate() + 7)
        return d.toISOString()
      default:
        return null
    }
  }

  cancelAlarm(id: string): boolean {
    const alarm = this.alarms.get(id)
    if (alarm) alarm.isActive = false
    return this.alarms.delete(id)
  }

  getAlarms(): Alarm[] {
    return Array.from(this.alarms.values())
  }
}
