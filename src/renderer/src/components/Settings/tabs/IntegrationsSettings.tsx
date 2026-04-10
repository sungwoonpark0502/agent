import React from 'react'
import { useSettingsStore } from '../../../store'
import { SettingsSection } from '../SettingsSection'
import { SettingsToggle } from '../SettingsToggle'

export function IntegrationsSettings(): React.JSX.Element {
  const { settings, updateSetting } = useSettingsStore()

  const integrations = [
    {
      id: 'calendarEnabled',
      label: 'Calendar',
      description: 'Access macOS Calendar via AppleScript',
      status: 'available'
    },
    {
      id: 'messagesEnabled',
      label: 'Messages',
      description: 'Read and send iMessages (requires Full Disk Access)',
      status: 'requires_permission'
    },
    {
      id: 'contactsEnabled',
      label: 'Contacts',
      description: 'Resolve contact names and phone numbers',
      status: 'available'
    },
    {
      id: 'gmailConnected',
      label: 'Gmail',
      description: 'Connect Gmail via OAuth2 for full email access',
      status: 'coming_soon'
    }
  ] as const

  return (
    <div className="flex flex-col gap-6">
      <SettingsSection title="macOS Integrations" description="These use AppleScript and system APIs">
        {integrations.map((integration) => (
          <div key={integration.id} className="flex items-start justify-between gap-4">
            <div>
              <p className="text-body font-medium" style={{ color: 'var(--text-primary)' }}>
                {integration.label}
              </p>
              <p className="text-caption" style={{ color: 'var(--text-secondary)' }}>
                {integration.description}
              </p>
              {integration.status === 'requires_permission' && (
                <p className="text-caption mt-0.5" style={{ color: 'var(--warning)', fontSize: '11px' }}>
                  ⚠ Requires permission in System Settings
                </p>
              )}
              {integration.status === 'coming_soon' && (
                <p className="text-caption mt-0.5" style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                  Coming soon
                </p>
              )}
            </div>
            <SettingsToggle
              label=""
              checked={Boolean(settings[integration.id as keyof typeof settings])}
              onChange={(v) => updateSetting(integration.id as never, v as never)}
              disabled={integration.status === 'coming_soon'}
            />
          </div>
        ))}
      </SettingsSection>
    </div>
  )
}
