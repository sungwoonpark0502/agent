import React, { useState } from 'react'

interface Props {
  onBackToLogin: () => void
}

type Step = 'info' | 'verify' | 'success'

const STEPS: Step[] = ['info', 'verify', 'success']

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function CreateAccountScreen({ onBackToLogin }: Props): React.JSX.Element {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step1Error, setStep1Error] = useState('')

  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const [step, setStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)

  const handleSendCode = async (): Promise<void> => {
    setStep1Error('')
    if (!username.trim()) { setStep1Error('Please choose a username.'); return }
    if (username.trim().includes(' ')) { setStep1Error('Username cannot contain spaces.'); return }
    if (!email.trim() || !email.includes('@')) { setStep1Error('Please enter a valid email.'); return }
    if (password.length < 6) { setStep1Error('Password must be at least 6 characters.'); return }
    if (password !== confirmPassword) { setStep1Error('Passwords do not match.'); return }

    setLoading(true)
    try {
      await window.agent.auth.sendVerification(email.trim())
      setStep('verify')
      startResendCooldown()
    } catch {
      setStep1Error('Failed to send verification email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const startResendCooldown = (): void => {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleResend = async (): Promise<void> => {
    setLoading(true)
    try {
      await window.agent.auth.sendVerification(email.trim())
      startResendCooldown()
      setCodeError('')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (): Promise<void> => {
    if (!code.trim()) { setCodeError('Please enter the verification code.'); return }
    setLoading(true)
    setCodeError('')
    try {
      const result = await window.agent.auth.verifyCode(email.trim(), code.trim())
      if (!result.success) {
        setCodeError(result.error ?? 'Incorrect code. Please try again.')
        return
      }
      const hash = await hashPassword(password)
      await window.agent.settings.set({
        username: username.trim().toLowerCase(),
        userEmail: email.trim().toLowerCase(),
        userPasswordHash: hash,
        isAccountCreated: true,
        isEmailVerified: true,
        isOnboardingComplete: false
      })
      setStep('success')
    } catch {
      setCodeError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = (hasError = false): React.CSSProperties => ({
    background: 'transparent',
    border: `1px solid ${hasError ? 'var(--error)' : 'var(--divider)'}`,
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none'
  })

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col no-drag overflow-hidden"
      style={{ background: 'transparent', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Drag header */}
      <div
        className="drag-region theme-opaque flex-shrink-0 flex items-center px-4 gap-3"
        style={{ height: 46, borderBottom: '1px solid var(--divider)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontWeight: 500, flex: 1 }}>
          Create Account
        </span>
        {/* Step dots */}
        <div className="flex items-center gap-1.5 no-drag" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {STEPS.map((s) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: step === s ? 16 : 5,
                height: 5,
                background: step === s
                  ? 'var(--accent-active)'
                  : STEPS.indexOf(s) < STEPS.indexOf(step)
                    ? 'var(--success)'
                    : 'var(--divider)'
              }}
            />
          ))}
        </div>
      </div>

      <div className="theme-opaque flex-1 overflow-y-auto px-7 py-5 pb-6">

        {/* ── Step 1: Account info ── */}
        {step === 'info' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700, marginBottom: 3 }}>
                Create Account
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Set up your personal Agent
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setStep1Error('') }}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={inputStyle()}
                  autoFocus
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setStep1Error('') }}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={inputStyle()}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setStep1Error('') }}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={inputStyle()}
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setStep1Error('') }}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg"
                  style={inputStyle(step1Error.includes('match'))}
                  onKeyDown={e => { if (e.key === 'Enter') handleSendCode() }}
                />
              </div>

              {step1Error && (
                <p style={{ color: 'var(--error)', fontSize: '11px' }}>{step1Error}</p>
              )}

              <button
                className="w-full py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
                style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
                onClick={handleSendCode}
                disabled={loading}
              >
                {loading ? 'Sending code…' : 'Continue'}
              </button>

              <button
                className="w-full py-1.5 transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}
                onClick={onBackToLogin}
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Email verification ── */}
        {step === 'verify' && (
          <div className="flex flex-col gap-4">
            <div>
              <h1 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700, marginBottom: 3 }}>
                Verify your email
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                We sent a 6-digit code to{' '}
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{email}</span>
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <div>
                <label style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: 3 }}>
                  Verification code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError('') }}
                  placeholder=""
                  className="w-full px-3 py-2 rounded-lg text-center"
                  style={{
                    ...inputStyle(!!codeError),
                    fontSize: '22px',
                    letterSpacing: '0.3em',
                    fontWeight: 600
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') handleVerify() }}
                  autoFocus
                  maxLength={6}
                />
              </div>

              {codeError && (
                <p style={{ color: 'var(--error)', fontSize: '11px' }}>{codeError}</p>
              )}

              <button
                className="w-full py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
                style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
                onClick={handleVerify}
                disabled={loading || code.length < 6}
              >
                {loading ? 'Verifying…' : 'Verify'}
              </button>

              <div className="flex items-center justify-between">
                <button
                  className="transition-opacity hover:opacity-70"
                  style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}
                  onClick={() => setStep('info')}
                >
                  Change email
                </button>
                <button
                  className="transition-opacity hover:opacity-70 disabled:opacity-40"
                  style={{ color: resendCooldown > 0 ? 'var(--text-tertiary)' : 'var(--accent-active)', fontSize: '12px' }}
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'success' && (
          <div className="flex flex-col items-center gap-5 pt-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(52,168,83,0.1)', border: '2px solid var(--success)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="text-center">
              <h1 style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: 700, marginBottom: 4 }}>
                Account created!
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Your account is ready. Sign in to get started.
              </p>
            </div>
            <button
              className="w-full py-2.5 rounded-xl font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-active)', color: 'white', fontSize: '13px' }}
              onClick={onBackToLogin}
            >
              Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
