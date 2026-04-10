import { exec, spawn } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { createLogger } from './logger'

const execAsync = promisify(exec)
const logger = createLogger('voice')

export class VoiceService {
  private static instance: VoiceService
  private sayProcess: ReturnType<typeof spawn> | null = null
  private getOpenAIKey: () => Promise<string | null>
  private getSettings: () => { ttsVoice: string; ttsSpeed: number; ttsVolume: number; ttsEnabled: boolean; sttProvider: string }

  constructor(
    getOpenAIKey: () => Promise<string | null>,
    getSettings: () => { ttsVoice: string; ttsSpeed: number; ttsVolume: number; ttsEnabled: boolean; sttProvider: string }
  ) {
    this.getOpenAIKey = getOpenAIKey
    this.getSettings = getSettings
  }

  static getInstance(
    getOpenAIKey: () => Promise<string | null>,
    getSettings: () => { ttsVoice: string; ttsSpeed: number; ttsVolume: number; ttsEnabled: boolean; sttProvider: string }
  ): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService(getOpenAIKey, getSettings)
    }
    return VoiceService.instance
  }

  // ─── TTS ──────────────────────────────────────────────────────────────────────

  async speak(text: string): Promise<void> {
    const settings = this.getSettings()
    if (!settings.ttsEnabled) return

    // Stop any currently playing speech
    this.stopSpeaking()

    // Sanitize text: strip markdown, limit length
    const clean = text
      .replace(/```[\s\S]*?```/g, 'code block')
      .replace(/`[^`]+`/g, '')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 2000)
      .trim()

    if (!clean) return

    const voice = settings.ttsVoice || 'Samantha'
    // macOS `say` rate: 150-250 wpm is normal. Map ttsSpeed (0.5-2.0) → 120-300
    const rate = Math.round(180 * (settings.ttsSpeed || 1.0))
    // Volume: macOS say doesn't have volume flag, handled by system volume
    const safeText = clean.replace(/"/g, '\\"').replace(/'/g, "\\'")

    logger.info({ voice, rate }, 'Speaking via TTS')

    try {
      this.sayProcess = spawn('say', ['-v', voice, '-r', String(rate), clean], {
        detached: false,
        stdio: 'ignore'
      })

      this.sayProcess.on('error', (err) => {
        logger.error({ err }, 'say process error')
        this.sayProcess = null
      })

      this.sayProcess.on('exit', () => {
        this.sayProcess = null
      })
    } catch (err) {
      logger.error({ err }, 'Failed to start TTS')
      this.sayProcess = null
    }
  }

  stopSpeaking(): void {
    if (this.sayProcess) {
      try {
        this.sayProcess.kill('SIGTERM')
      } catch {}
      this.sayProcess = null
    }
    // Also kill any orphaned say processes
    exec('pkill -x say', () => {})
  }

  // ─── STT ──────────────────────────────────────────────────────────────────────

  async transcribe(audioData: Buffer): Promise<string> {
    const apiKey = await this.getOpenAIKey()
    if (!apiKey) {
      throw new Error('OpenAI API key required for voice transcription. Please add it in Settings.')
    }

    const tmpPath = join(tmpdir(), `agent-audio-${Date.now()}.webm`)

    try {
      await writeFile(tmpPath, audioData)

      const ky = (await import('ky')).default
      const formData = new FormData()
      const { readFile } = await import('fs/promises')
      const fileBuffer = await readFile(tmpPath)
      const blob = new Blob([fileBuffer], { type: 'audio/webm' })
      formData.append('file', blob, 'audio.webm')
      formData.append('model', 'whisper-1')
      formData.append('language', 'en')

      const response = await ky.post('https://api.openai.com/v1/audio/transcriptions', {
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        timeout: 30000
      }).json<{ text: string }>()

      return response.text?.trim() ?? ''
    } finally {
      unlink(tmpPath).catch(() => {})
    }
  }

  // ─── Available voices ─────────────────────────────────────────────────────────

  async getAvailableVoices(): Promise<Array<{ name: string; language: string }>> {
    try {
      const { stdout } = await execAsync('say -v "?"')
      const voices = stdout.trim().split('\n').map(line => {
        const match = line.match(/^(\S.*?)\s{2,}(\S+)\s+#/)
        if (!match) return null
        return { name: match[1].trim(), language: match[2].trim() }
      }).filter(Boolean) as Array<{ name: string; language: string }>
      return voices
    } catch {
      return [{ name: 'Samantha', language: 'en_US' }]
    }
  }
}
