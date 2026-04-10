import React, { useState, useEffect } from 'react'
import { useConversationStore } from '../../store'

interface QuickAction {
  id: string
  label: string
  query: string
  prefill?: boolean
}

const DEFAULT_ACTIONS: QuickAction[] = [
  { id: 'weather', label: 'Weather', query: "What's the weather today?" },
  { id: 'calendar', label: 'Calendar', query: "What's on my calendar today?" },
  { id: 'reminders', label: 'Reminders', query: "What's on my todo list?" },
]

const STORAGE_KEY = 'agent_quick_actions'

function loadActions(): QuickAction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as QuickAction[]
  } catch { /* ignore */ }
  return DEFAULT_ACTIONS
}

function saveActions(actions: QuickAction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(actions))
}

export function QuickActions(): React.JSX.Element {
  const { addMessage, setDraft } = useConversationStore()
  const [actions, setActions] = useState<QuickAction[]>(loadActions)
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editQuery, setEditQuery] = useState('')
  const [editPrefill, setEditPrefill] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)

  const prefillInput = (query: string): void => {
    setDraft(query)
    const input = document.querySelector<HTMLTextAreaElement>('#chat-input')
    if (input) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set
      if (nativeSetter) {
        nativeSetter.call(input, query)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
      input.focus()
      input.setSelectionRange(query.length, query.length)
    }
  }

  const handleAction = (action: QuickAction): void => {
    if (isEditing) return
    if (action.prefill) {
      prefillInput(action.query)
    } else {
      addMessage({ role: 'user', content: action.query })
      const msgs = useConversationStore.getState().messages
      window.agent.chat.send(msgs, useConversationStore.getState().conversationId)
    }
  }

  const startEdit = (action: QuickAction): void => {
    setEditingId(action.id)
    setEditLabel(action.label)
    setEditQuery(action.query)
    setEditPrefill(action.prefill ?? false)
  }

  const saveEdit = (): void => {
    if (!editLabel.trim() || !editQuery.trim()) return
    const updated = actions.map(a =>
      a.id === editingId
        ? { ...a, label: editLabel.trim(), query: editQuery.trim(), prefill: editPrefill }
        : a
    )
    setActions(updated)
    saveActions(updated)
    setEditingId(null)
  }

  const deleteAction = (id: string): void => {
    const updated = actions.filter(a => a.id !== id)
    setActions(updated)
    saveActions(updated)
  }

  const addAction = (): void => {
    if (!editLabel.trim() || !editQuery.trim()) return
    const newAction: QuickAction = {
      id: crypto.randomUUID(),
      label: editLabel.trim(),
      query: editQuery.trim(),
      prefill: editPrefill
    }
    const updated = [...actions, newAction]
    setActions(updated)
    saveActions(updated)
    setEditLabel('')
    setEditQuery('')
    setEditPrefill(false)
    setShowAddForm(false)
  }

  const resetDefaults = (): void => {
    setActions(DEFAULT_ACTIONS)
    saveActions(DEFAULT_ACTIONS)
  }

  if (isEditing) {
    return (
      <div
        className="flex-shrink-0 px-3 py-2"
        style={{ borderBottom: '1px solid var(--divider)', background: 'var(--surface-solid)' }}
      >
        {/* Edit header */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-caption font-medium" style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
            Edit Quick Actions
          </span>
          <div className="flex items-center gap-2">
            <button
              className="text-caption hover:opacity-70"
              style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}
              onClick={resetDefaults}
            >
              Reset
            </button>
            <button
              className="text-caption font-medium hover:opacity-70"
              style={{ color: 'var(--accent-active)', fontSize: '11px' }}
              onClick={() => { setIsEditing(false); setEditingId(null); setShowAddForm(false) }}
            >
              Done
            </button>
          </div>
        </div>

        {/* Action list */}
        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
          {actions.map(action => (
            <div key={action.id}>
              {editingId === action.id ? (
                <div className="flex flex-col gap-1 p-2 rounded-lg" style={{ background: 'rgba(168,200,240,0.08)', border: '1px solid rgba(168,200,240,0.2)' }}>
                  <div className="flex gap-1">
                    <input
                      className="flex-1 px-2 py-1 rounded text-caption"
                      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '12px' }}
                      placeholder="Label"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-caption cursor-pointer" style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                      <input type="checkbox" checked={editPrefill} onChange={e => setEditPrefill(e.target.checked)} />
                      Prefill
                    </label>
                  </div>
                  <input
                    className="w-full px-2 py-1 rounded text-caption"
                    style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '12px' }}
                    placeholder="Query text"
                    value={editQuery}
                    onChange={e => setEditQuery(e.target.value)}
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      className="px-2 py-0.5 rounded text-caption hover:opacity-70"
                      style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="px-2 py-0.5 rounded text-caption font-medium hover:opacity-70"
                      style={{ background: 'var(--accent-active)', color: 'white', fontSize: '11px' }}
                      onClick={saveEdit}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1 rounded-lg hover:opacity-80" style={{ background: 'var(--surface-elevated)' }}>
                  <span className="flex-1 text-caption truncate" style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                    <span className="font-medium">{action.label}</span>
                    <span style={{ color: 'var(--text-tertiary)' }}> — {action.query}</span>
                  </span>
                  <button
                    className="text-caption hover:opacity-70 px-1"
                    style={{ color: 'var(--accent-active)', fontSize: '11px', flexShrink: 0 }}
                    onClick={() => startEdit(action)}
                  >
                    Edit
                  </button>
                  <button
                    className="hover:opacity-70"
                    style={{ color: 'var(--error)', flexShrink: 0 }}
                    onClick={() => deleteAction(action.id)}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new */}
        {showAddForm ? (
          <div className="flex flex-col gap-1 mt-2 p-2 rounded-lg" style={{ background: 'rgba(168,200,240,0.06)', border: '1px solid var(--divider)' }}>
            <div className="flex gap-1">
              <input
                className="flex-1 px-2 py-1 rounded text-caption"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '12px' }}
                placeholder="Label"
                value={editLabel}
                onChange={e => setEditLabel(e.target.value)}
                autoFocus
              />
              <label className="flex items-center gap-1 text-caption cursor-pointer" style={{ color: 'var(--text-secondary)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={editPrefill} onChange={e => setEditPrefill(e.target.checked)} />
                Prefill
              </label>
            </div>
            <input
              className="w-full px-2 py-1 rounded text-caption"
              style={{ background: 'var(--surface-elevated)', border: '1px solid var(--divider)', color: 'var(--text-primary)', fontSize: '12px' }}
              placeholder="Query text sent to Agent"
              value={editQuery}
              onChange={e => setEditQuery(e.target.value)}
            />
            <div className="flex gap-1 justify-end">
              <button
                className="px-2 py-0.5 rounded text-caption hover:opacity-70"
                style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}
                onClick={() => { setShowAddForm(false); setEditLabel(''); setEditQuery(''); setEditPrefill(false) }}
              >
                Cancel
              </button>
              <button
                className="px-2 py-0.5 rounded text-caption font-medium hover:opacity-70"
                style={{ background: 'var(--accent-active)', color: 'white', fontSize: '11px' }}
                onClick={addAction}
              >
                Add
              </button>
            </div>
          </div>
        ) : (
          <button
            className="mt-1.5 flex items-center gap-1 text-caption hover:opacity-70"
            style={{ color: 'var(--accent-active)', fontSize: '11px' }}
            onClick={() => { setShowAddForm(true); setEditLabel(''); setEditQuery(''); setEditPrefill(false) }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add action
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-1.5 px-3 py-2 flex-shrink-0"
      style={{
        borderBottom: '1px solid var(--divider)',
        background: 'var(--surface-elevated)',
        height: 44,
        overflowX: 'auto',
        scrollbarWidth: 'none'
      }}
    >
      {actions.map((action) => (
        <button
          key={action.id}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full flex-shrink-0 transition-all hover:opacity-80 active:scale-95"
          style={{
            background: 'rgba(168, 200, 240, 0.1)',
            border: '1px solid rgba(168, 200, 240, 0.2)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            whiteSpace: 'nowrap'
          }}
          onClick={() => handleAction(action)}
        >
          {action.label}
        </button>
      ))}

      {/* Edit button — always visible */}
      <div className="flex-shrink-0 pl-1" style={{ borderLeft: '1px solid var(--divider)' }}>
        <button
          className="w-6 h-6 rounded-lg flex items-center justify-center hover:opacity-70 transition-opacity"
          style={{ color: 'var(--text-tertiary)' }}
          onClick={() => { setIsEditing(true); setEditingId(null) }}
          title="Customize"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M7.5 1.5l2 2L3.5 9.5H1.5V7.5L7.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
