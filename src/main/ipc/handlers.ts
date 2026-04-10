import { ipcMain, BrowserWindow, dialog } from 'electron'
import { createLogger } from '../services/logger'
import { ClaudeService } from '../services/claude'
import { MemoryService } from '../services/memory'
import { VoiceService } from '../services/voice'
import { executeTool, DESTRUCTIVE_TOOLS } from '../tools/executor'
import type { DatabaseService } from '../services/database'
import type { KeychainService } from '../services/keychain'
import type { SettingsService } from '../services/settings'
import type { WindowManager } from '../windows'
import type { TrayManager } from '../tray'
import type { TimerService } from '../services/timer'
import type { ChatMessage, WindowMode, ApiKeySlot } from '../../shared/types'

const logger = createLogger('ipc')

interface HandlerDeps {
  db: DatabaseService
  keychain: KeychainService
  settings: SettingsService
  windowManager: WindowManager
  trayManager: TrayManager
  timerService: TimerService
}

export function registerIPCHandlers(deps: HandlerDeps): void {
  const { db, keychain, settings, windowManager, trayManager, timerService } = deps

  const memory = MemoryService.getInstance(db)
  const claude = ClaudeService.getInstance({ keychain, db, settings })
  const voice = VoiceService.getInstance(
    () => keychain.get('openai'),
    () => ({
      ttsVoice: settings.get('ttsVoice'),
      ttsSpeed: settings.get('ttsSpeed'),
      ttsVolume: settings.get('ttsVolume'),
      ttsEnabled: settings.get('ttsEnabled'),
      sttProvider: settings.get('sttProvider')
    })
  )

  // Set timer callbacks to broadcast events to windows
  timerService.setCallbacks({
    onTick: (timer) => windowManager.broadcastToAll('timer:tick', timer),
    onTimerComplete: (timer) => {
      windowManager.broadcastToAll('timer:complete', timer)
      // Play system sound
      require('child_process').exec('afplay /System/Library/Sounds/Glass.aiff')
    },
    onAlarmFire: (alarm) => {
      windowManager.broadcastToAll('alarm:fire', alarm)
      require('child_process').exec('afplay /System/Library/Sounds/Submarine.aiff')
    }
  })

  // ─── Chat ──────────────────────────────────────────────────────────────────

  ipcMain.handle('chat:send', async (event, { messages, conversationId }: { messages: ChatMessage[]; conversationId: string }) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)
    const messageId = crypto.randomUUID()

    const userName = settings.get('userName')
    const lastMessage = messages[messages.length - 1]
    const relevantMemories = memory.getContextForQuery(lastMessage?.content ?? '', settings.get('memoryContextCount'))

    try {
      await claude.streamChat(
        messages,
        { userName, relevantMemories },
        {
          onChunk: (text) => {
            senderWindow?.webContents.send('chat:stream-chunk', { messageId, delta: text, isDone: false })
          },
          onToolCall: async (toolName, toolInput) => {
            // Confirm destructive tools
            if (DESTRUCTIVE_TOOLS.has(toolName)) {
              const confirmed = await showConfirmDialog(senderWindow, toolName, toolInput)
              if (!confirmed) {
                return JSON.stringify({ cancelled: true, message: 'User cancelled this action.' })
              }
            }

            senderWindow?.webContents.send('tool:executing', { name: toolName, input: toolInput })

            const result = await executeTool(toolName, toolInput, {
              memory,
              timer: timerService,
              db,
              getWeatherApiKey: () => keychain.get('weather'),
              showConfirm: async (title, description) => {
                return showConfirmDialog(senderWindow, title, { description })
              }
            })

            senderWindow?.webContents.send('tool:result', { name: toolName, result })
            return result
          },
          onError: (err) => {
            logger.error({ err }, 'Claude stream error')
            senderWindow?.webContents.send('chat:error', {
              message: formatErrorMessage(err)
            })
          },
          onDone: (fullText, usage) => {
            senderWindow?.webContents.send('chat:stream-chunk', { messageId, delta: '', isDone: true })
            // Save assistant message to DB
            if (fullText && conversationId) {
              db.run(
                'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
                [messageId, conversationId, 'assistant', fullText]
              )
            }
          }
        }
      )
    } catch (err) {
      logger.error({ err }, 'Chat handler error')
      senderWindow?.webContents.send('chat:error', { message: formatErrorMessage(err instanceof Error ? err : new Error(String(err))) })
    }

    return { messageId }
  })

  ipcMain.handle('chat:stop', () => {
    // Claude streaming doesn't have a direct cancel — track AbortController in future
    return { success: true }
  })

  // ─── Settings ──────────────────────────────────────────────────────────────

  ipcMain.handle('settings:get', () => settings.getAll())

  ipcMain.handle('settings:set', (_event, updates: Partial<typeof settings.getAll extends () => infer R ? R : never>) => {
    settings.setMany(updates as Parameters<typeof settings.setMany>[0])
    const cast = updates as Record<string, unknown>
    if ('launchAtLogin' in cast) {
      const { app } = require('electron')
      app.setLoginItemSettings({ openAtLogin: Boolean(cast.launchAtLogin) })
    }
    if ('pillPosition' in cast) {
      windowManager.repositionPill()
    }
    windowManager.broadcastToAll('settings:updated', settings.getAll())
    return { success: true }
  })

  ipcMain.handle('settings:reset', () => {
    settings.reset()
    return { success: true }
  })

  // ─── Window management ─────────────────────────────────────────────────────

  ipcMain.handle('window:set-mode', async (_event, mode: WindowMode) => {
    await windowManager.setMode(mode)
    return { success: true }
  })

  ipcMain.handle('window:get-mode', () => {
    if (windowManager.getFullscreenWindow()?.isVisible()) return 'fullscreen'
    if (windowManager.getExpandedWindow()?.isVisible()) return 'expanded'
    return 'pill'
  })

  ipcMain.handle('window:get-bounds', () => {
    const pillBounds = windowManager.getPillWindow()?.getBounds() ?? null
    const expandedBounds = windowManager.getExpandedWindow()?.getBounds() ?? null
    return { pillBounds, expandedBounds }
  })

  // ─── API Keys ──────────────────────────────────────────────────────────────

  ipcMain.handle('apikey:set', async (_event, { slot, value }: { slot: ApiKeySlot; value: string }) => {
    await keychain.set(slot, value)

    // Update settings flag
    const flagMap: Record<ApiKeySlot, keyof ReturnType<typeof settings.getAll>> = {
      anthropic: 'hasAnthropicKey',
      openai: 'hasOpenAIKey',
      weather: 'hasWeatherKey',
      elevenlabs: 'hasElevenLabsKey',
      'gmail-refresh': 'gmailConnected'
    }
    const flag = flagMap[slot]
    if (flag) settings.set(flag as never, (value.length > 0) as never)

    // Invalidate cached client
    if (slot === 'anthropic') claude.invalidateClient()

    return { success: true }
  })

  ipcMain.handle('apikey:verify', async (_event, slot: ApiKeySlot) => {
    const hasKey = await keychain.has(slot)
    return { hasKey }
  })

  // ─── Auth ──────────────────────────────────────────────────────────────────

  // In-memory store for pending verification codes { email -> { code, expiresAt } }
  const pendingVerifications = new Map<string, { code: string; expiresAt: number }>()

  ipcMain.handle('auth:send-verification', async (_event, { email }: { email: string }) => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes
    pendingVerifications.set(email.toLowerCase(), { code, expiresAt })
    logger.info({ email }, `Verification code generated: ${code}`)

    // TODO: integrate real email sending (nodemailer/SendGrid/etc.)
    // For now, log the code so developers can test without email setup
    console.log(`\n[AUTH] Verification code for ${email}: ${code}\n`)

    return { success: true }
  })

  ipcMain.handle('auth:verify-code', (_event, { email, code }: { email: string; code: string }) => {
    const pending = pendingVerifications.get(email.toLowerCase())
    if (!pending) return { success: false, error: 'No verification code sent to this email.' }
    if (Date.now() > pending.expiresAt) {
      pendingVerifications.delete(email.toLowerCase())
      return { success: false, error: 'Verification code expired. Please request a new one.' }
    }
    if (pending.code !== code.trim()) {
      return { success: false, error: 'Incorrect code. Please try again.' }
    }
    pendingVerifications.delete(email.toLowerCase())
    return { success: true }
  })

  // ─── Memory ────────────────────────────────────────────────────────────────

  ipcMain.handle('memory:save', (_event, { content, category, tags }: { content: string; category?: string; tags?: string[] }) => {
    const mem = memory.save(content, { category: category as never, tags, source: 'text' })
    return mem
  })

  ipcMain.handle('memory:search', (_event, { query, category }: { query: string; category?: string }) => {
    return memory.search(query, { category: category as never })
  })

  ipcMain.handle('memory:list', (_event, options?: { category?: string; limit?: number; offset?: number }) => {
    return memory.list({ category: options?.category as never, limit: options?.limit, offset: options?.offset })
  })

  ipcMain.handle('memory:delete', (_event, id: string) => {
    return { success: memory.delete(id) }
  })

  ipcMain.handle('memory:update', (_event, { id, content }: { id: string; content: string }) => {
    return memory.update(id, content)
  })

  // ─── Timers ────────────────────────────────────────────────────────────────

  ipcMain.handle('timer:create', (_event, { durationSeconds, label }: { durationSeconds: number; label?: string }) => {
    return timerService.createTimer(durationSeconds, label)
  })

  ipcMain.handle('timer:cancel', (_event, id: string) => {
    return { success: timerService.cancelTimer(id) }
  })

  ipcMain.handle('timer:pause', (_event, id: string) => {
    return { success: timerService.pauseTimer(id) }
  })

  ipcMain.handle('timer:resume', (_event, id: string) => {
    return { success: timerService.resumeTimer(id) }
  })

  // ─── Voice / TTS / STT ─────────────────────────────────────────────────────

  ipcMain.on('tts:speak', (_event, text: string) => {
    voice.speak(text).catch((err) => logger.error({ err }, 'TTS error'))
  })

  ipcMain.on('tts:stop', () => {
    voice.stopSpeaking()
  })

  ipcMain.handle('voice:transcribe', async (_event, audioBase64: string) => {
    const buf = Buffer.from(audioBase64, 'base64')
    const transcript = await voice.transcribe(buf)
    return { transcript }
  })

  ipcMain.handle('voice:get-voices', async () => {
    const voices = await voice.getAvailableVoices()
    return voices
  })

  // ─── Conversation history ───────────────────────────────────────────────────

  ipcMain.handle('conversation:list', () => {
    return db.all<{ id: string; title: string; created_at: string; updated_at: string; message_count: number }>(
      `SELECT c.id, c.title, c.created_at, c.updated_at,
              COUNT(m.id) as message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT 50`
    )
  })

  ipcMain.handle('conversation:load', (_event, id: string) => {
    const messages = db.all<{ id: string; role: string; content: string; created_at: string }>(
      'SELECT id, role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
      [id]
    )
    return messages
  })

  ipcMain.handle('conversation:delete', (_event, id: string) => {
    db.run('DELETE FROM conversations WHERE id = ?', [id])
    return { success: true }
  })

  ipcMain.handle('conversation:save', (_event, { id, title }: { id: string; title: string }) => {
    const existing = db.get<{ id: string }>('SELECT id FROM conversations WHERE id = ?', [id])
    if (existing) {
      db.run('UPDATE conversations SET title = ?, updated_at = datetime(\'now\') WHERE id = ?', [title, id])
    } else {
      db.run('INSERT INTO conversations (id, title) VALUES (?, ?)', [id, title])
    }
    return { success: true }
  })

  // ─── Clipboard history ──────────────────────────────────────────────────────

  ipcMain.handle('clipboard:get-history', () => {
    return db.all<{ id: string; content: string; type: string; timestamp: number; source_app: string }>(
      'SELECT id, content, type, timestamp, source_app FROM clipboard_history ORDER BY timestamp DESC LIMIT 100'
    )
  })

  ipcMain.handle('clipboard:clear-history', () => {
    db.run('DELETE FROM clipboard_history')
    return { success: true }
  })

  // ─── System health ─────────────────────────────────────────────────────────

  ipcMain.handle('system:health', async () => {
    const result = await executeTool('get_system_info', { info_type: 'all' }, {
      memory,
      timer: timerService,
      db,
      getWeatherApiKey: () => keychain.get('weather'),
      showConfirm: async () => true
    })
    return JSON.parse(result)
  })

  // ─── App ───────────────────────────────────────────────────────────────────

  ipcMain.handle('app:version', () => {
    return require('electron').app.getVersion()
  })

  ipcMain.handle('app:quit', () => {
    require('electron').app.quit()
  })

  logger.info('IPC handlers registered')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatErrorMessage(err: Error): string {
  const msg = err.message.toLowerCase()
  if (msg.includes('429') || msg.includes('rate limit')) {
    return "I'm a bit overloaded right now. Give me a moment and try again."
  }
  if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) {
    return "I can't connect — please check your API key in Settings."
  }
  if (msg.includes('network') || msg.includes('fetch') || msg.includes('enotfound')) {
    return "I'm having trouble connecting. Check your internet connection."
  }
  if (msg.includes('500') || msg.includes('503')) {
    return "The AI service is temporarily unavailable. Try again in a moment."
  }
  return "Something went wrong. Please try again."
}

async function showConfirmDialog(
  win: BrowserWindow | null,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<boolean> {
  const actionDescriptions: Record<string, string> = {
    send_email: `Send email to ${toolInput.to}:\nSubject: ${toolInput.subject}`,
    send_message: `Send message to ${toolInput.to}: "${toolInput.message}"`,
    delete_calendar_event: `Delete calendar event: "${toolInput.title ?? toolInput.event_id}"`,
    close_application: `Close application: "${toolInput.app_name}"`
  }

  const description = actionDescriptions[toolName] ?? `Execute: ${toolName}`

  // Use renderer-side confirm dialog for better UX
  if (win && !win.isDestroyed()) {
    return new Promise((resolve) => {
      const channel = `confirm:result:${crypto.randomUUID()}`
      win.webContents.send('confirm:show', {
        title: 'Confirm Action',
        description,
        id: channel
      })
      ipcMain.once(channel, (_e, result: boolean) => resolve(result))
      // Timeout after 60 seconds
      setTimeout(() => resolve(false), 60000)
    })
  }

  // Fallback: native dialog
  const { response } = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Cancel', 'Confirm'],
    defaultId: 1,
    cancelId: 0,
    title: 'Confirm Action',
    message: description
  })
  return response === 1
}
