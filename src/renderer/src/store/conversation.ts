import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { ChatMessage } from '../../../shared/types'

interface ConversationState {
  conversationId: string
  messages: ChatMessage[]
  isStreaming: boolean
  currentStreamId: string | null
  draft: string
  activeToolName: string | null

  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => ChatMessage
  appendToMessage: (id: string, delta: string) => void
  finalizeMessage: (id: string) => void
  setStreaming: (streaming: boolean, messageId?: string) => void
  setDraft: (text: string) => void
  setActiveTool: (name: string | null) => void
  clearMessages: () => void
  resetConversation: () => void
  loadHistory: (messages: ChatMessage[]) => void
  saveConversation: () => void
}

export const useConversationStore = create<ConversationState>((set, get) => ({
  conversationId: uuidv4(),
  messages: [],
  isStreaming: false,
  currentStreamId: null,
  draft: '',
  activeToolName: null,

  addMessage: (msg) => {
    const message: ChatMessage = {
      id: uuidv4(),
      timestamp: Date.now(),
      ...msg
    }
    set((state) => ({ messages: [...state.messages, message] }))

    // Auto-save conversation title from first user message
    const state = get()
    if (msg.role === 'user' && state.messages.filter(m => m.role === 'user').length === 1) {
      const title = msg.content.slice(0, 60) + (msg.content.length > 60 ? '…' : '')
      window.agent.conversation.save(state.conversationId, title).catch(() => {})
    }

    return message
  },

  appendToMessage: (id, delta) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, content: m.content + delta } : m
      )
    }))
  },

  finalizeMessage: (id) => {
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, isStreaming: false } : m
      )
    }))
  },

  setStreaming: (streaming, messageId) => {
    set({ isStreaming: streaming, currentStreamId: messageId ?? null })
  },

  setDraft: (text) => set({ draft: text }),

  setActiveTool: (name) => set({ activeToolName: name }),

  clearMessages: () => set({ messages: [] }),

  resetConversation: () => set({
    conversationId: uuidv4(),
    messages: [],
    isStreaming: false,
    currentStreamId: null,
    draft: '',
    activeToolName: null
  }),

  loadHistory: (messages) => {
    set({
      conversationId: uuidv4(),
      messages,
      isStreaming: false,
      currentStreamId: null,
      draft: '',
      activeToolName: null
    })
  },

  saveConversation: () => {
    const state = get()
    const firstUser = state.messages.find(m => m.role === 'user')
    if (!firstUser) return
    const title = firstUser.content.slice(0, 60) + (firstUser.content.length > 60 ? '…' : '')
    window.agent.conversation.save(state.conversationId, title).catch(() => {})
  }
}))
