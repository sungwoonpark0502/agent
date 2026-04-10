import React, { useEffect, useState } from 'react'
import { useSettingsStore, useUIStore } from './store'
import { PillView } from './components/Pill/PillView'
import { ExpandedView } from './components/Expanded/ExpandedView'
import { FullscreenView } from './components/Fullscreen/FullscreenView'
import { ConfirmDialog } from './components/common/ConfirmDialog'
import { CommandPalette } from './components/CommandPalette/CommandPalette'

// Determine which view to render based on the URL hash
function getInitialView(): 'pill' | 'expanded' | 'fullscreen' {
  const hash = window.location.hash.replace('#', '')
  if (hash === 'expanded') return 'expanded'
  if (hash === 'fullscreen') return 'fullscreen'
  return 'pill'
}

export default function App(): React.JSX.Element {
  const [view] = useState(getInitialView)
  const { setSettings } = useSettingsStore()
  const { theme, setTheme, confirmDialog, isCommandPaletteOpen, setCommandPaletteOpen } = useUIStore()

  // Load settings and set up listeners
  useEffect(() => {
    window.agent.settings.get().then(s => {
      setSettings(s)
      // Apply saved theme or fall back to system
      if (s.theme === 'light' || s.theme === 'dark') {
        setTheme(s.theme)
      } else {
        const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
        setTheme(dark ? 'dark' : 'light')
      }
    })

    const unsubSettings = window.agent.settings.onUpdated((s) => {
      setSettings(s)
      if (s.theme === 'light' || s.theme === 'dark') setTheme(s.theme)
    })
    const unsubTheme = window.agent.app.onThemeChanged((t) => {
      // Only apply system theme if user hasn't pinned a preference
      const saved = useSettingsStore.getState().settings.theme
      if (saved === 'system' || !saved) setTheme(t)
    })
    const unsubCommandPalette = window.agent.commandPalette.onOpen(() => setCommandPaletteOpen(true))

    // System theme change listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      const saved = useSettingsStore.getState().settings.theme
      if (saved === 'system' || !saved) setTheme(e.matches ? 'dark' : 'light')
    })

    // Confirm dialog handler
    const unsubConfirm = window.agent.confirm.onShow(({ id, title, description }) => {
      useUIStore.getState().setConfirmDialog({
        id,
        title,
        description,
        onConfirm: () => {
          window.agent.confirm.respond(id, true)
          useUIStore.getState().setConfirmDialog(null)
        },
        onCancel: () => {
          window.agent.confirm.respond(id, false)
          useUIStore.getState().setConfirmDialog(null)
        }
      })
    })

    return () => {
      unsubSettings()
      unsubTheme()
      unsubCommandPalette()
      unsubConfirm()
    }
  }, [setSettings, setTheme, setCommandPaletteOpen])

  return (
    <div data-theme={theme} className="w-full h-full">
      {view === 'pill' && <PillView />}
      {view === 'expanded' && <ExpandedView />}
      {view === 'fullscreen' && <FullscreenView />}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          description={confirmDialog.description}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {isCommandPaletteOpen && (
        <CommandPalette onClose={() => setCommandPaletteOpen(false)} />
      )}
    </div>
  )
}
