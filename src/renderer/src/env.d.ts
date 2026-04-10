import type {
  ChatMessage,
  WindowMode,
  ApiKeySlot,
  MemoryCategory,
  AppSettings,
  StreamChunk
} from '../../shared/types'

declare global {
  interface Window {
    agent: {
      chat: {
        send: (messages: ChatMessage[], conversationId: string) => Promise<unknown>
        stop: () => Promise<unknown>
        onStreamChunk: (cb: (chunk: StreamChunk) => void) => () => void
        onError: (cb: (err: { message: string }) => void) => () => void
        onToolExecuting: (cb: (data: { name: string; input: Record<string, unknown> }) => void) => () => void
        sendCommand: (command: string) => void
      }
      settings: {
        get: () => Promise<AppSettings>
        set: (updates: Partial<AppSettings>) => Promise<{ success: boolean }>
        reset: () => Promise<{ success: boolean }>
        onUpdated: (cb: (settings: AppSettings) => void) => () => void
      }
      window: {
        setMode: (mode: WindowMode) => Promise<{ success: boolean }>
        getMode: () => Promise<WindowMode>
        getBounds: () => Promise<{
          pillBounds: { x: number; y: number; width: number; height: number } | null
          expandedBounds: { x: number; y: number; width: number; height: number } | null
        }>
        onPillState: (cb: (state: string) => void) => () => void
        onNavigate: (cb: (route: string) => void) => () => void
      }
      apiKey: {
        set: (slot: ApiKeySlot, value: string) => Promise<{ success: boolean }>
        verify: (slot: ApiKeySlot) => Promise<{ hasKey: boolean }>
      }
      memory: {
        save: (content: string, category?: MemoryCategory, tags?: string[]) => Promise<unknown>
        search: (query: string, category?: MemoryCategory) => Promise<unknown>
        list: (options?: { category?: MemoryCategory; limit?: number; offset?: number }) => Promise<unknown>
        delete: (id: string) => Promise<unknown>
        update: (id: string, content: string) => Promise<unknown>
      }
      timer: {
        create: (durationSeconds: number, label?: string) => Promise<unknown>
        cancel: (id: string) => Promise<unknown>
        pause: (id: string) => Promise<unknown>
        resume: (id: string) => Promise<unknown>
        onTick: (cb: (timer: unknown) => void) => () => void
        onComplete: (cb: (timer: unknown) => void) => () => void
        onAlarmFire: (cb: (alarm: unknown) => void) => () => void
      }
      voice: {
        transcribe: (audioBase64: string) => Promise<{ transcript: string }>
        getVoices: () => Promise<Array<{ name: string; language: string }>>
        onPTTTrigger: (cb: () => void) => () => void
      }
      tts: {
        speak: (text: string) => void
        stop: () => void
      }
      conversation: {
        list: () => Promise<unknown>
        load: (id: string) => Promise<unknown>
        delete: (id: string) => Promise<unknown>
        save: (id: string, title: string) => Promise<unknown>
      }
      clipboard: {
        getHistory: () => Promise<unknown>
        clearHistory: () => Promise<unknown>
      }
      confirm: {
        onShow: (cb: (data: { title: string; description: string; id: string }) => void) => () => void
        respond: (id: string, confirmed: boolean) => void
      }
      system: {
        health: () => Promise<unknown>
      }
      app: {
        version: () => Promise<string>
        quit: () => Promise<unknown>
        onThemeChanged: (cb: (theme: 'light' | 'dark') => void) => () => void
      }
      auth: {
        sendVerification: (email: string) => Promise<{ success: boolean }>
        verifyCode: (email: string, code: string) => Promise<{ success: boolean; error?: string }>
      }
      commandPalette: {
        onOpen: (cb: () => void) => () => void
      }
    }
  }
}

export {}
