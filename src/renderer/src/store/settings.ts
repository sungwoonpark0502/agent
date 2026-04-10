import { create } from 'zustand'
import { DEFAULT_SETTINGS, type AppSettings } from '../../../shared/types'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean
  setSettings: (settings: AppSettings) => void
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  updateMany: (updates: Partial<AppSettings>) => void
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  setSettings: (settings) => set({ settings, isLoaded: true }),

  updateSetting: (key, value) => {
    const updated = { ...get().settings, [key]: value }
    set({ settings: updated })
    window.agent.settings.set({ [key]: value } as Partial<AppSettings>)
  },

  updateMany: (updates) => {
    const updated = { ...get().settings, ...updates }
    set({ settings: updated })
    window.agent.settings.set(updates)
  }
}))
