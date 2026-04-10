import Anthropic from '@anthropic-ai/sdk'
import { createLogger } from './logger'
import type { KeychainService } from './keychain'
import type { DatabaseService } from './database'
import type { SettingsService } from './settings'
import type { ChatMessage } from '../../shared/types'
import { TOOL_DEFINITIONS } from '../tools/definitions'

const logger = createLogger('claude')

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOOL_DEPTH = 10
const MAX_CONTEXT_MESSAGES = 20

interface ClaudeServiceDeps {
  keychain: KeychainService
  db: DatabaseService
  settings: SettingsService
}

interface StreamCallbacks {
  onChunk: (text: string) => void
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<string>
  onError: (err: Error) => void
  onDone: (fullText: string, usage: { inputTokens: number; outputTokens: number }) => void
}

export class ClaudeService {
  private static instance: ClaudeService
  private client: Anthropic | null = null
  private deps!: ClaudeServiceDeps

  static getInstance(deps: ClaudeServiceDeps): ClaudeService {
    if (!ClaudeService.instance) {
      ClaudeService.instance = new ClaudeService()
    }
    ClaudeService.instance.deps = deps
    return ClaudeService.instance
  }

  private async getClient(): Promise<Anthropic | null> {
    if (this.client) return this.client
    const apiKey = await this.deps.keychain.get('anthropic')
    if (!apiKey) return null
    this.client = new Anthropic({ apiKey })
    return this.client
  }

  // ─── Demo responses when no API key is configured ────────────────────────────

  private async streamDemo(
    messages: ChatMessage[],
    callbacks: StreamCallbacks
  ): Promise<void> {
    const last = messages.filter(m => m.role === 'user').pop()?.content?.toLowerCase() ?? ''

    let response = ''

    if (last.includes('weather')) {
      response = "I'd check the weather for you, but I need an Anthropic API key first. Add it in **Settings > General > API Keys** to get started."
    } else if (last.includes('timer') || last.includes('alarm')) {
      response = "I can set timers and alarms once you've connected your API key. Head to **Settings > General** to add it."
    } else if (last.includes('hello') || last.includes('hi') || last.includes('hey')) {
      response = `Hi! I'm Agent, your personal AI assistant. I'm running in **demo mode** right now — I can respond, but I can't use my full capabilities yet.\n\nTo unlock everything, add your Anthropic API key in **Settings > General > API Keys**. Once connected, I can:\n\n- Check your calendar and email\n- Set timers and reminders\n- Search the web\n- Control your Mac\n- Remember things about you\n\nWhat would you like to know?`
    } else if (last.includes('what') && (last.includes('do') || last.includes('can'))) {
      response = "In full mode, I can check weather, manage your calendar, send messages, search the web, control media, take screenshots, remember things, run calculations, and much more.\n\nAdd your Anthropic API key in **Settings > General** to get started."
    } else if (last.includes('setting') || last.includes('api') || last.includes('key')) {
      response = "To add your API key: open **Settings** (gear icon in the header), go to **General**, and paste your Anthropic API key. You can get one at console.anthropic.com."
    } else if (last.includes('memory') || last.includes('remember')) {
      response = "Memory is fully functional even in demo mode! I can save things you want to remember. Try: *\"Remember that I prefer dark mode\"*"
    } else {
      response = `I'm running in **demo mode** — I can see your message, but I need an Anthropic API key to give you a real response.\n\nGo to **Settings > General > API Keys** to add your key. It only takes a moment.`
    }

    // Stream character by character for realism
    for (let i = 0; i < response.length; i++) {
      callbacks.onChunk(response[i])
      if (i % 8 === 0) await new Promise(r => setTimeout(r, 12))
    }

    callbacks.onDone(response, { inputTokens: 0, outputTokens: 0 })
  }

  invalidateClient(): void {
    this.client = null
  }

  // ─── Build system prompt ──────────────────────────────────────────────────────

  private buildSystemPrompt(context: {
    userName: string
    activeApp?: string
    todayCalendarSummary?: string
    relevantMemories?: string
  }): string {
    const now = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return `You are Agent, a personal AI assistant running natively on the user's Mac. You are helpful, concise, and warm but professional. You have access to the user's calendar, email, files, system controls, and memory.

Key behaviors:
- Be concise. Prefer 1-3 sentences unless the user asks for detail.
- When performing actions (sending email, creating events, deleting things), ALWAYS confirm with the user before executing.
- Format responses cleanly. Use markdown for lists and code blocks.
- If you're unsure about something, say so rather than guessing.
- Reference the user's memories when relevant but don't be creepy about it.
- Be aware of the current time and date: ${now}
- The user's name is: ${context.userName || 'the user'}
${context.activeApp ? `- Active application: ${context.activeApp}` : ''}
${context.todayCalendarSummary ? `- Today's calendar summary: ${context.todayCalendarSummary}` : ''}
${context.relevantMemories ? `\nRelevant memories:\n${context.relevantMemories}` : ''}`
  }

  // ─── Convert internal messages to Anthropic format ────────────────────────────

  private toAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
    const result: Anthropic.MessageParam[] = []

    // Keep last MAX_CONTEXT_MESSAGES
    const recent = messages.slice(-MAX_CONTEXT_MESSAGES)

    for (const msg of recent) {
      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content })
      } else if (msg.role === 'assistant') {
        result.push({ role: 'assistant', content: msg.content })
      }
    }

    return result
  }

  // ─── Main streaming chat ──────────────────────────────────────────────────────

  async streamChat(
    messages: ChatMessage[],
    context: Parameters<typeof this.buildSystemPrompt>[0],
    callbacks: StreamCallbacks,
    toolDepth = 0
  ): Promise<void> {
    if (toolDepth >= MAX_TOOL_DEPTH) {
      callbacks.onChunk('\n\n*(Reached maximum tool call limit)*')
      callbacks.onDone('', { inputTokens: 0, outputTokens: 0 })
      return
    }

    let client: Anthropic | null
    try {
      client = await this.getClient()
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)))
      return
    }

    // No API key — use demo mode
    if (!client) {
      return this.streamDemo(messages, callbacks)
    }

    const systemPrompt = this.buildSystemPrompt(context)

    let fullText = ''
    let inputTokens = 0
    let outputTokens = 0
    const pendingToolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = []

    try {
      const stream = await client.messages.stream({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: this.toAnthropicMessages(messages),
        tools: TOOL_DEFINITIONS as Anthropic.Tool[]
      })

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullText += event.delta.text
            callbacks.onChunk(event.delta.text)
          } else if (event.delta.type === 'input_json_delta') {
            // Tool input accumulating — handled at stop_reason
          }
        } else if (event.type === 'content_block_start') {
          if (event.content_block.type === 'tool_use') {
            pendingToolUses.push({
              id: event.content_block.id,
              name: event.content_block.name,
              input: {}
            })
          }
        } else if (event.type === 'message_delta') {
          if (event.usage) {
            outputTokens = event.usage.output_tokens
          }
        } else if (event.type === 'message_start') {
          inputTokens = event.message.usage?.input_tokens ?? 0
        }
      }

      const finalMessage = await stream.finalMessage()

      if (finalMessage.stop_reason === 'tool_use') {
        // Execute tools and recurse
        const toolResultMessages: ChatMessage[] = [...messages]

        // Add assistant message with tool calls
        toolResultMessages.push({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: finalMessage.content.map(block => {
            if (block.type === 'text') return block.text
            return ''
          }).filter(Boolean).join(''),
          timestamp: Date.now()
        })

        // Execute each tool
        for (const block of finalMessage.content) {
          if (block.type === 'tool_use') {
            logger.info({ tool: block.name, input: block.input }, 'Executing tool')
            let result: string
            try {
              result = await callbacks.onToolCall(block.name, block.input as Record<string, unknown>)
            } catch (toolErr) {
              result = `Error: ${toolErr instanceof Error ? toolErr.message : String(toolErr)}`
            }

            toolResultMessages.push({
              id: crypto.randomUUID(),
              role: 'tool_result',
              content: JSON.stringify({ toolCallId: block.id, result }),
              timestamp: Date.now()
            })
          }
        }

        // Recurse
        await this.streamChat(toolResultMessages, context, callbacks, toolDepth + 1)
      } else {
        // Track usage
        this.trackUsage(inputTokens, outputTokens)
        callbacks.onDone(fullText, { inputTokens, outputTokens })
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))

      if (error.message.includes('429')) {
        // Rate limit — retry with backoff
        const retryAfter = this.parseRetryAfter(error) ?? 2000
        logger.warn({ retryAfter }, 'Rate limited, retrying')
        await new Promise(resolve => setTimeout(resolve, retryAfter))
        return this.streamChat(messages, context, callbacks, toolDepth)
      }

      logger.error({ err }, 'Claude API error')
      callbacks.onError(error)
    }
  }

  private parseRetryAfter(err: Error): number | null {
    const match = err.message.match(/retry after (\d+)/i)
    if (match) return parseInt(match[1], 10) * 1000
    return null
  }

  private trackUsage(inputTokens: number, outputTokens: number): void {
    try {
      this.deps.db.run(
        `INSERT INTO usage_stats (id, model, input_tokens, output_tokens, tool_calls)
         VALUES (?, ?, ?, ?, 0)`,
        [crypto.randomUUID(), MODEL, inputTokens, outputTokens]
      )
      const current = this.deps.settings.get('totalTokensUsed')
      this.deps.settings.set('totalTokensUsed', current + inputTokens + outputTokens)
      const calls = this.deps.settings.get('totalApiCalls')
      this.deps.settings.set('totalApiCalls', calls + 1)
    } catch (err) {
      logger.warn({ err }, 'Failed to track usage')
    }
  }
}
