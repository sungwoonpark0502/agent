import { contextBridge, ipcRenderer } from 'electron'
import type {
  ChatMessage,
  WindowMode,
  ApiKeySlot,
  MemoryCategory,
  AppSettings,
  StreamChunk
} from '../shared/types'

// ─── Type-safe IPC bridge ─────────────────────────────────────────────────────

const api = {
  // ─── Chat ──────────────────────────────────────────────────────────────────

  chat: {
    send: (messages: ChatMessage[], conversationId: string) =>
      ipcRenderer.invoke('chat:send', { messages, conversationId }),
    stop: () => ipcRenderer.invoke('chat:stop'),
    onStreamChunk: (cb: (chunk: StreamChunk) => void) => {
      const handler = (_: Electron.IpcRendererEvent, chunk: StreamChunk) => cb(chunk)
      ipcRenderer.on('chat:stream-chunk', handler)
      return () => ipcRenderer.off('chat:stream-chunk', handler)
    },
    onError: (cb: (err: { message: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, err: { message: string }) => cb(err)
      ipcRenderer.on('chat:error', handler)
      return () => ipcRenderer.off('chat:error', handler)
    },
    onToolExecuting: (cb: (data: { name: string; input: Record<string, unknown> }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { name: string; input: Record<string, unknown> }) => cb(data)
      ipcRenderer.on('tool:executing', handler)
      return () => ipcRenderer.off('tool:executing', handler)
    },
    sendCommand: (command: string) => {
      ipcRenderer.emit('chat:send-command', null, command)
    }
  },

  // ─── Settings ──────────────────────────────────────────────────────────────

  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke('settings:get'),
    set: (updates: Partial<AppSettings>): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('settings:set', updates),
    reset: (): Promise<{ success: boolean }> => ipcRenderer.invoke('settings:reset'),
    onUpdated: (cb: (settings: AppSettings) => void) => {
      const handler = (_: Electron.IpcRendererEvent, s: AppSettings) => cb(s)
      ipcRenderer.on('settings:updated', handler)
      return () => ipcRenderer.off('settings:updated', handler)
    }
  },

  // ─── Window ────────────────────────────────────────────────────────────────

  window: {
    setMode: (mode: WindowMode): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('window:set-mode', mode),
    getMode: (): Promise<WindowMode> => ipcRenderer.invoke('window:get-mode'),
    getBounds: (): Promise<{
      pillBounds: { x: number; y: number; width: number; height: number } | null
      expandedBounds: { x: number; y: number; width: number; height: number } | null
    }> => ipcRenderer.invoke('window:get-bounds'),
    onPillState: (cb: (state: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, state: string) => cb(state)
      ipcRenderer.on('window:pill-state', handler)
      return () => ipcRenderer.off('window:pill-state', handler)
    },
    onNavigate: (cb: (route: string) => void) => {
      const handler = (_: Electron.IpcRendererEvent, route: string) => cb(route)
      ipcRenderer.on('navigate', handler)
      return () => ipcRenderer.off('navigate', handler)
    }
  },

  // ─── API Keys ──────────────────────────────────────────────────────────────

  apiKey: {
    set: (slot: ApiKeySlot, value: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('apikey:set', { slot, value }),
    verify: (slot: ApiKeySlot): Promise<{ hasKey: boolean }> =>
      ipcRenderer.invoke('apikey:verify', slot)
  },

  // ─── Memory ────────────────────────────────────────────────────────────────

  memory: {
    save: (content: string, category?: MemoryCategory, tags?: string[]) =>
      ipcRenderer.invoke('memory:save', { content, category, tags }),
    search: (query: string, category?: MemoryCategory) =>
      ipcRenderer.invoke('memory:search', { query, category }),
    list: (options?: { category?: MemoryCategory; limit?: number; offset?: number }) =>
      ipcRenderer.invoke('memory:list', options),
    delete: (id: string) => ipcRenderer.invoke('memory:delete', id),
    update: (id: string, content: string) => ipcRenderer.invoke('memory:update', { id, content })
  },

  // ─── Timers ────────────────────────────────────────────────────────────────

  timer: {
    create: (durationSeconds: number, label?: string) =>
      ipcRenderer.invoke('timer:create', { durationSeconds, label }),
    cancel: (id: string) => ipcRenderer.invoke('timer:cancel', id),
    pause: (id: string) => ipcRenderer.invoke('timer:pause', id),
    resume: (id: string) => ipcRenderer.invoke('timer:resume', id),
    onTick: (cb: (timer: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, t: unknown) => cb(t)
      ipcRenderer.on('timer:tick', handler)
      return () => ipcRenderer.off('timer:tick', handler)
    },
    onComplete: (cb: (timer: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, t: unknown) => cb(t)
      ipcRenderer.on('timer:complete', handler)
      return () => ipcRenderer.off('timer:complete', handler)
    },
    onAlarmFire: (cb: (alarm: unknown) => void) => {
      const handler = (_: Electron.IpcRendererEvent, a: unknown) => cb(a)
      ipcRenderer.on('alarm:fire', handler)
      return () => ipcRenderer.off('alarm:fire', handler)
    }
  },

  // ─── Voice ────────────────────────────────────────────────────────────────

  voice: {
    transcribe: (audioBase64: string): Promise<{ transcript: string }> =>
      ipcRenderer.invoke('voice:transcribe', audioBase64),
    getVoices: (): Promise<Array<{ name: string; language: string }>> =>
      ipcRenderer.invoke('voice:get-voices'),
    onPTTTrigger: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('voice:ptt-trigger', handler)
      return () => ipcRenderer.off('voice:ptt-trigger', handler)
    }
  },

  // ─── TTS ──────────────────────────────────────────────────────────────────

  tts: {
    speak: (text: string) => ipcRenderer.send('tts:speak', text),
    stop: () => ipcRenderer.send('tts:stop')
  },

  // ─── Conversation history ─────────────────────────────────────────────────

  conversation: {
    list: () => ipcRenderer.invoke('conversation:list'),
    load: (id: string) => ipcRenderer.invoke('conversation:load', id),
    delete: (id: string) => ipcRenderer.invoke('conversation:delete', id),
    save: (id: string, title: string) => ipcRenderer.invoke('conversation:save', { id, title })
  },

  // ─── Clipboard history ─────────────────────────────────────────────────────

  clipboard: {
    getHistory: () => ipcRenderer.invoke('clipboard:get-history'),
    clearHistory: () => ipcRenderer.invoke('clipboard:clear-history')
  },

  // ─── Confirm dialog ────────────────────────────────────────────────────────

  confirm: {
    onShow: (cb: (data: { title: string; description: string; id: string }) => void) => {
      const handler = (_: Electron.IpcRendererEvent, data: { title: string; description: string; id: string }) => cb(data)
      ipcRenderer.on('confirm:show', handler)
      return () => ipcRenderer.off('confirm:show', handler)
    },
    respond: (id: string, confirmed: boolean) => {
      ipcRenderer.send(id, confirmed)
    }
  },

  // ─── System ────────────────────────────────────────────────────────────────

  system: {
    health: () => ipcRenderer.invoke('system:health')
  },

  // ─── App ───────────────────────────────────────────────────────────────────

  app: {
    version: (): Promise<string> => ipcRenderer.invoke('app:version'),
    quit: () => ipcRenderer.invoke('app:quit'),
    onThemeChanged: (cb: (theme: 'light' | 'dark') => void) => {
      const handler = (_: Electron.IpcRendererEvent, theme: 'light' | 'dark') => cb(theme)
      ipcRenderer.on('theme:changed', handler)
      return () => ipcRenderer.off('theme:changed', handler)
    }
  },

  // ─── Auth ─────────────────────────────────────────────────────────────────

  auth: {
    sendVerification: (email: string): Promise<{ success: boolean }> =>
      ipcRenderer.invoke('auth:send-verification', { email }),
    verifyCode: (email: string, code: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('auth:verify-code', { email, code })
  },

  // ─── Command palette ───────────────────────────────────────────────────────

  commandPalette: {
    onOpen: (cb: () => void) => {
      const handler = () => cb()
      ipcRenderer.on('command-palette:open', handler)
      return () => ipcRenderer.off('command-palette:open', handler)
    }
  }
}

contextBridge.exposeInMainWorld('agent', api)

// ─── Type declaration for renderer ────────────────────────────────────────────

declare global {
  interface Window {
    agent: typeof api
  }
}
