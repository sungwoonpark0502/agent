import React, { useState } from 'react'
import { GeneralSettings } from './tabs/GeneralSettings'
import { AppearanceSettings } from './tabs/AppearanceSettings'
import { VoiceSettings } from './tabs/VoiceSettings'
import { IntegrationsSettings } from './tabs/IntegrationsSettings'
import { MemorySettings } from './tabs/MemorySettings'
import { ClipboardSettings } from './tabs/ClipboardSettings'
import { AboutSettings } from './tabs/AboutSettings'

type Tab = 'general' | 'appearance' | 'voice' | 'integrations' | 'memory' | 'clipboard' | 'about'

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'general', label: 'General', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 9a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.4"/><path d="M11.4 8.6l.5.9a.5.5 0 01-.2.7l-.9.5a.5.5 0 01-.7-.2l-.5-.9c-.3.2-.6.3-1 .4v1a.5.5 0 01-.5.5H7a.5.5 0 01-.5-.5v-1a4 4 0 01-1-.4l-.5.9a.5.5 0 01-.7.2l-.9-.5a.5.5 0 01-.2-.7l.5-.9A4 4 0 013.4 7a4 4 0 01.3-1.6l-.5-.9a.5.5 0 01.2-.7l.9-.5a.5.5 0 01.7.2l.5.9c.3-.2.6-.3 1-.4V3a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v1c.4.1.7.2 1 .4l.5-.9a.5.5 0 01.7-.2l.9.5a.5.5 0 01.2.7l-.5.9c.2.5.3.9.3 1.6s-.1 1.1-.3 1.6z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
  )},
  { id: 'appearance', label: 'Appearance', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 1.5a5.5 5.5 0 010 11" stroke="currentColor" strokeWidth="1.5"/></svg>
  )},
  { id: 'voice', label: 'Voice', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="4" y="1" width="6" height="7" rx="3" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M7 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
  { id: 'integrations', label: 'Integrations', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="3" cy="7" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="3" r="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="11" cy="11" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 7h2M9 3.9l-2 2.1M9 10.1l-2-2.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
  { id: 'memory', label: 'Memory', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><ellipse cx="7" cy="4" rx="5" ry="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M2 4v6c0 1.38 2.24 2.5 5 2.5s5-1.12 5-2.5V4" stroke="currentColor" strokeWidth="1.5"/><path d="M2 7c0 1.38 2.24 2.5 5 2.5S12 8.38 12 7" stroke="currentColor" strokeWidth="1.5"/></svg>
  )},
  { id: 'clipboard', label: 'Clipboard', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 3V2a2 2 0 014 0v1" stroke="currentColor" strokeWidth="1.5"/><path d="M4 7h6M4 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
  { id: 'about', label: 'About', icon: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/><path d="M7 6v4M7 4.5v-.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
  )},
]

interface Props {
  onClose: () => void
  onLogout?: () => void
}

export function SettingsPanel({ onClose, onLogout }: Props): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('general')

  return (
    <div
      className="absolute inset-0 flex flex-col animate-fade-in z-50"
      style={{ background: 'var(--surface-solid)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Drag strip at top — matches the main header height so users can grab it */}
      <div
        className="drag-region flex-shrink-0 flex items-center px-4 gap-2"
        style={{ height: 46, borderBottom: '1px solid var(--divider)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="font-semibold flex-1" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>Settings</span>
        <button
          className="no-drag w-6 h-6 rounded flex items-center justify-center hover:opacity-70"
          style={{ color: 'var(--text-secondary)', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          onClick={onClose}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
      {/* Sidebar */}
      <div
        className="w-44 flex flex-col flex-shrink-0 py-3"
        style={{ borderRight: '1px solid var(--divider)', background: 'rgba(0,0,0,0.03)' }}
      >
        <div className="px-4 mb-3 flex items-center justify-between">
          <span className="font-semibold" style={{ color: 'var(--text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Menu</span>
          <button
            className="hidden"
            onClick={onClose}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 px-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(168, 200, 240, 0.15)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-active)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 500 : 400,
                fontSize: '13px'
              }}
              onClick={() => setActiveTab(tab.id)}
            >
              <span style={{ opacity: activeTab === tab.id ? 1 : 0.6 }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="settings-content flex-1 overflow-y-auto p-4 overflow-x-hidden">
        {activeTab === 'general' && <GeneralSettings />}
        {activeTab === 'appearance' && <AppearanceSettings />}
        {activeTab === 'voice' && <VoiceSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'memory' && <MemorySettings />}
        {activeTab === 'clipboard' && <ClipboardSettings />}
        {activeTab === 'about' && <AboutSettings onLogout={() => { onClose(); onLogout?.() }} />}
      </div>
      </div>{/* end body */}
    </div>
  )
}
