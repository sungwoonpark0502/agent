// ─── Core domain types shared between main and renderer ───────────────────────

export type AppTheme = 'light' | 'dark' | 'system'
export type WindowMode = 'pill' | 'expanded' | 'fullscreen' | 'settings'
export type PillState = 'idle' | 'listening' | 'processing' | 'responding' | 'offline' | 'error'
export type PillPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
export type MessageRole = 'user' | 'assistant' | 'tool_result'
export type MemoryCategory = 'personal' | 'work' | 'preference' | 'fact' | 'credential' | 'other'
export type ReminderPriority = 'low' | 'medium' | 'high'
export type RepeatMode = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly'
export type MediaAction = 'play' | 'pause' | 'next' | 'previous' | 'now_playing'
export type ScreenshotType = 'fullscreen' | 'window' | 'selection'
export type SystemInfoType = 'battery' | 'storage' | 'cpu' | 'memory' | 'network' | 'all'
export type EmailFilter = 'unread' | 'all' | 'starred' | 'important'

// ─── Messages ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  isStreaming?: boolean
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  metadata?: Record<string, unknown>
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  content: string
  isError?: boolean
}

// ─── Memory ───────────────────────────────────────────────────────────────────

export interface Memory {
  id: string
  userId: string
  content: string
  category: MemoryCategory
  tags: string[]
  createdAt: string
  updatedAt: string
  lastAccessed: string | null
  accessCount: number
  source: 'voice' | 'text' | 'auto'
  isPinned: boolean
  isArchived: boolean
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface AppSettings {
  // Auth
  username: string
  userEmail: string
  userPasswordHash: string
  isAccountCreated: boolean
  isEmailVerified: boolean
  isOnboardingComplete: boolean

  // General
  userName: string
  agentName: string
  userAvatar: string  // base64 data URL or empty string
  theme: AppTheme
  launchAtLogin: boolean
  showInDock: boolean

  // Window
  pillPosition: PillPosition
  pillOffsetX: number
  pillOffsetY: number
  alwaysOnTop: boolean

  // Voice
  voiceEnabled: boolean
  wakeWordEnabled: boolean
  wakeWord: string
  sttProvider: 'whisper-api' | 'whisper-local'
  whisperLocalModel: 'base.en' | 'small.en'
  ttsEnabled: boolean
  ttsProvider: 'macos' | 'elevenlabs'
  ttsVoice: string
  ttsSpeed: number
  ttsVolume: number
  alwaysSpeak: boolean
  continuousConversationTimeout: number
  pushToTalkKey: string
  pushToTalkMode: 'hold' | 'toggle'
  sendOnEnter: boolean

  // API Keys (stored in keychain, these are just UI references)
  hasAnthropicKey: boolean
  hasOpenAIKey: boolean
  hasWeatherKey: boolean
  hasElevenLabsKey: boolean

  // Integrations
  gmailConnected: boolean
  calendarEnabled: boolean
  messagesEnabled: boolean
  contactsEnabled: boolean

  // Memory
  autoMemory: boolean
  memoryContextCount: number

  // Privacy
  clipboardHistoryEnabled: boolean
  clipboardHistorySize: number
  clipboardHistoryClearOnQuit: boolean

  // Usage
  totalTokensUsed: number
  totalApiCalls: number
}

export const DEFAULT_SETTINGS: AppSettings = {
  username: '',
  userEmail: '',
  userPasswordHash: '',
  isAccountCreated: false,
  isEmailVerified: false,
  isOnboardingComplete: false,
  userName: '',
  agentName: 'Agent',
  userAvatar: '',
  theme: 'system',
  launchAtLogin: false,
  showInDock: false,
  pillPosition: 'bottom-right',
  pillOffsetX: 16,
  pillOffsetY: 16,
  alwaysOnTop: true,
  voiceEnabled: true,
  wakeWordEnabled: true,
  wakeWord: 'hey agent',
  sttProvider: 'whisper-api',
  whisperLocalModel: 'base.en',
  ttsEnabled: true,
  ttsProvider: 'macos',
  ttsVoice: 'Samantha',
  ttsSpeed: 1.0,
  ttsVolume: 80,
  alwaysSpeak: false,
  continuousConversationTimeout: 8,
  pushToTalkKey: 'Option+Space',
  pushToTalkMode: 'hold',
  sendOnEnter: true,
  hasAnthropicKey: false,
  hasOpenAIKey: false,
  hasWeatherKey: false,
  hasElevenLabsKey: false,
  gmailConnected: false,
  calendarEnabled: true,
  messagesEnabled: false,
  contactsEnabled: true,
  autoMemory: true,
  memoryContextCount: 5,
  clipboardHistoryEnabled: true,
  clipboardHistorySize: 50,
  clipboardHistoryClearOnQuit: false,
  totalTokensUsed: 0,
  totalApiCalls: 0
}

// ─── Timer / Alarm ────────────────────────────────────────────────────────────

export interface Timer {
  id: string
  label: string
  durationSeconds: number
  remainingSeconds: number
  isPaused: boolean
  startedAt: number
  completedAt: number | null
}

export interface Alarm {
  id: string
  label: string
  time: string
  repeat: RepeatMode
  isActive: boolean
  lastFiredAt: string | null
}

// ─── Clipboard History ────────────────────────────────────────────────────────

export interface ClipboardItem {
  id: string
  content: string
  type: 'text' | 'image' | 'url'
  timestamp: number
  sourceApp: string
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface SystemHealth {
  battery?: {
    percentage: number
    isCharging: boolean
    timeRemaining: string | null
  }
  storage?: {
    total: string
    used: string
    available: string
    percentUsed: number
  }
  cpu?: {
    usage: number
  }
  memory?: {
    total: string
    used: string
    available: string
    percentUsed: number
  }
  network?: {
    ssid: string | null
    isConnected: boolean
    signalStrength: number | null
  }
  uptime?: string
}

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export type IPCChannel =
  | 'chat:send'
  | 'chat:stop'
  | 'chat:stream-chunk'
  | 'chat:stream-end'
  | 'chat:error'
  | 'settings:get'
  | 'settings:set'
  | 'settings:reset'
  | 'window:set-mode'
  | 'window:get-mode'
  | 'window:pill-state'
  | 'window:position'
  | 'voice:start'
  | 'voice:stop'
  | 'voice:state-change'
  | 'voice:transcript'
  | 'tts:speak'
  | 'tts:stop'
  | 'memory:save'
  | 'memory:search'
  | 'memory:list'
  | 'memory:delete'
  | 'memory:update'
  | 'timer:create'
  | 'timer:cancel'
  | 'timer:pause'
  | 'timer:resume'
  | 'timer:tick'
  | 'timer:complete'
  | 'alarm:create'
  | 'alarm:cancel'
  | 'alarm:fire'
  | 'clipboard:get-history'
  | 'clipboard:copy'
  | 'system:health'
  | 'auth:check'
  | 'auth:login'
  | 'auth:logout'
  | 'apikey:set'
  | 'apikey:verify'
  | 'confirm:show'
  | 'confirm:result'
  | 'app:version'
  | 'app:quit'

// ─── API key slots ────────────────────────────────────────────────────────────

export type ApiKeySlot = 'anthropic' | 'openai' | 'weather' | 'elevenlabs' | 'gmail-refresh'

// ─── Claude streaming ─────────────────────────────────────────────────────────

export interface StreamChunk {
  messageId: string
  delta: string
  isDone: boolean
}

export interface ConfirmDialogOptions {
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}
