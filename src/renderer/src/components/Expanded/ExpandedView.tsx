import React, { useEffect, useCallback, useState, useRef } from 'react'
import { useUIStore, useSettingsStore } from '../../store'
import { ExpandedHeader } from './ExpandedHeader'
import { QuickActions } from './QuickActions'
import { ConversationThread } from './ConversationThread'
import { InputBar } from './InputBar'
import { TimerPanel } from './TimerPanel'
import { SettingsPanel } from '../Settings/SettingsPanel'
import { ConversationHistory } from './ConversationHistory'
import { LoginScreen } from '../Auth/LoginScreen'
import { CreateAccountScreen } from '../Auth/CreateAccountScreen'
import { OnboardingWizard } from '../Auth/OnboardingWizard'
import type { Alarm } from '../../../../shared/types'

type AuthView = 'loading' | 'login' | 'create-account' | 'onboarding' | 'app'

export function ExpandedView(): React.JSX.Element {
  const { isSettingsOpen, setSettingsOpen, isHistoryOpen, setHistoryOpen, addAlarm } = useUIStore()
  const { setSettings, settings } = useSettingsStore()
  const [authView, setAuthView] = useState<AuthView>('loading')
  const [isClosing, setIsClosing] = useState(false)
  const [transformOrigin, setTransformOrigin] = useState('bottom right')
  const closingRef = useRef(false)

  // On mount: load settings + calculate exact animation origin from window bounds
  useEffect(() => {
    window.agent.settings.get().then((s) => {
      setSettings(s)
      if (!s.isAccountCreated) {
        setAuthView('login')
      } else {
        setAuthView(s.isOnboardingComplete ? 'app' : 'onboarding')
      }
    })

    window.agent.window.getBounds().then(({ pillBounds, expandedBounds }) => {
      if (pillBounds && expandedBounds) {
        const pillCenterX = pillBounds.x + pillBounds.width / 2
        const pillCenterY = pillBounds.y + pillBounds.height / 2
        const relX = ((pillCenterX - expandedBounds.x) / expandedBounds.width) * 100
        const relY = ((pillCenterY - expandedBounds.y) / expandedBounds.height) * 100
        setTransformOrigin(`${relX.toFixed(1)}% ${relY.toFixed(1)}%`)
      }
    })
  }, [setSettings])

  // Alarm listener
  useEffect(() => {
    const unsub = window.agent.timer.onAlarmFire((alarm) => {
      addAlarm(alarm as Alarm)
    })
    return unsub
  }, [addAlarm])

  // Animate out then actually close
  const handleMinimize = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setIsClosing(true)
    setTimeout(() => {
      window.agent.window.setMode('pill')
      // Reset for next open
      setIsClosing(false)
      closingRef.current = false
    }, 300)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (authView !== 'app') return
      if (e.key === 'Escape') {
        if (isSettingsOpen) { setSettingsOpen(false) }
        else { handleMinimize() }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault(); setSettingsOpen(true)
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault(); window.agent.window.setMode('fullscreen')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSettingsOpen, setSettingsOpen, authView, handleMinimize])

  const handleLogout = useCallback(() => {
    setSettingsOpen(false)
    setAuthView('login')
  }, [setSettingsOpen])

  const handleLogin = useCallback((needsOnboarding: boolean) => {
    setAuthView(needsOnboarding ? 'onboarding' : 'app')
  }, [])

  if (authView === 'loading') {
    return <div className="w-full h-full rounded-xl" />
  }

  return (
    <div
      className={`w-full h-full flex flex-col rounded-xl overflow-hidden ${isClosing ? 'animate-scale-out' : 'animate-scale-in'}`}
      style={{
        background: 'transparent',
        border: '1px solid var(--divider)',
        boxShadow: 'var(--shadow-elevated)',
        transformOrigin
      } as React.CSSProperties}
    >
      {authView === 'app' ? (
        <>
          <ExpandedHeader
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenHistory={() => setHistoryOpen(true)}
            onMinimize={handleMinimize}
          />
          <QuickActions />
          <TimerPanel />
          <ConversationThread />
          <InputBar />

          {isSettingsOpen && (
            <SettingsPanel
              onClose={() => setSettingsOpen(false)}
              onLogout={handleLogout}
            />
          )}
          {isHistoryOpen && (
            <ConversationHistory onClose={() => setHistoryOpen(false)} />
          )}
        </>
      ) : authView === 'login' ? (
        <LoginScreen
          onLogin={handleLogin}
          onCreateAccount={() => setAuthView('create-account')}
        />
      ) : authView === 'create-account' ? (
        <CreateAccountScreen
          onBackToLogin={() => setAuthView('login')}
        />
      ) : authView === 'onboarding' ? (
        <OnboardingWizard
          onComplete={() => setAuthView('app')}
        />
      ) : null}
    </div>
  )
}
