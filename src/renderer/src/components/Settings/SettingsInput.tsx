import React, { useCallback, useRef } from 'react'

interface Props {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
  type?: 'text' | 'password'
  description?: string
}

export function SettingsInput({ label, value, placeholder, onChange, type = 'text', description }: Props): React.JSX.Element {
  const debounceRef = useRef<NodeJS.Timeout>()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onChange(val), 500)
  }, [onChange])

  return (
    <div className="flex flex-col gap-1">
      <label className="text-caption font-medium" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type={type}
        className="w-full px-3 py-2 rounded-lg text-body"
        style={{
          background: 'rgba(0,0,0,0.04)',
          border: '1px solid var(--divider)',
          color: 'var(--text-primary)',
          outline: 'none'
        }}
        defaultValue={value}
        placeholder={placeholder}
        onChange={handleChange}
      />
      {description && (
        <p className="text-caption" style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
          {description}
        </p>
      )}
    </div>
  )
}
