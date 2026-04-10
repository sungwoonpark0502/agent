import { create } from 'zustand'
import type { PillState, WindowMode, Timer, Alarm } from '../../../shared/types'

interface ConfirmDialog {
  id: string
  title: string
  description: string
  onConfirm: () => void
  onCancel: () => void
}

interface UIState {
  windowMode: WindowMode
  pillState: PillState
  theme: 'light' | 'dark'
  isCommandPaletteOpen: boolean
  isSettingsOpen: boolean
  isHistoryOpen: boolean
  confirmDialog: ConfirmDialog | null
  autoScrollEnabled: boolean
  activeTimers: Timer[]
  activeAlarms: Alarm[]
  completedTimers: Timer[]
  voiceState: 'idle' | 'listening' | 'processing'

  setWindowMode: (mode: WindowMode) => void
  setPillState: (state: PillState) => void
  setTheme: (theme: 'light' | 'dark') => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setHistoryOpen: (open: boolean) => void
  setConfirmDialog: (dialog: ConfirmDialog | null) => void
  setAutoScroll: (enabled: boolean) => void
  updateTimer: (timer: Timer) => void
  removeTimer: (id: string) => void
  addAlarm: (alarm: Alarm) => void
  removeAlarm: (id: string) => void
  dismissCompletedTimer: (id: string) => void
  setVoiceState: (state: 'idle' | 'listening' | 'processing') => void
}

export const useUIStore = create<UIState>((set) => ({
  windowMode: 'pill',
  pillState: 'idle',
  theme: 'light',
  isCommandPaletteOpen: false,
  isSettingsOpen: false,
  isHistoryOpen: false,
  confirmDialog: null,
  autoScrollEnabled: true,
  activeTimers: [],
  activeAlarms: [],
  completedTimers: [],
  voiceState: 'idle',

  setWindowMode: (mode) => set({ windowMode: mode }),
  setPillState: (state) => set({ pillState: state }),
  setTheme: (theme) => {
    set({ theme })
    document.documentElement.setAttribute('data-theme', theme)
  },
  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setSettingsOpen: (open) => set({ isSettingsOpen: open }),
  setHistoryOpen: (open) => set({ isHistoryOpen: open }),
  setConfirmDialog: (dialog) => set({ confirmDialog: dialog }),
  setAutoScroll: (enabled) => set({ autoScrollEnabled: enabled }),

  updateTimer: (timer) => set((state) => {
    if (timer.completedAt !== null) {
      // Move to completed
      return {
        activeTimers: state.activeTimers.filter(t => t.id !== timer.id),
        completedTimers: [...state.completedTimers.filter(t => t.id !== timer.id), timer]
      }
    }
    const exists = state.activeTimers.find(t => t.id === timer.id)
    if (exists) {
      return { activeTimers: state.activeTimers.map(t => t.id === timer.id ? timer : t) }
    }
    return { activeTimers: [...state.activeTimers, timer] }
  }),

  removeTimer: (id) => set((state) => ({
    activeTimers: state.activeTimers.filter(t => t.id !== id),
    completedTimers: state.completedTimers.filter(t => t.id !== id)
  })),

  addAlarm: (alarm) => set((state) => ({
    activeAlarms: [...state.activeAlarms.filter(a => a.id !== alarm.id), alarm]
  })),

  removeAlarm: (id) => set((state) => ({
    activeAlarms: state.activeAlarms.filter(a => a.id !== id)
  })),

  dismissCompletedTimer: (id) => set((state) => ({
    completedTimers: state.completedTimers.filter(t => t.id !== id)
  })),

  setVoiceState: (state) => set({ voiceState: state })
}))
