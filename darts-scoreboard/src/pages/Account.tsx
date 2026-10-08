import { useEffect, useState, type ReactNode } from 'react'
import { getSupabase, supabaseReady } from '../lib/supabase'
import { syncAll } from '../lib/cloud'
import { useStore } from '../lib/store'
import {
  signIn,
  register,
  sendResetEmail,
  SOCIAL_PROVIDERS,
  signInWithSocial,
  updatePassword,
  updateDisplayName,
  handleAuthRedirect,
  exportMyData,
  deleteMyAccount,
} from '../lib/auth'
import { track } from '../lib/analytics'

type Mode = 'signin' | 'register' | 'forgot' | 'newpass'

export default function Account() {
  const authUser = useStore((s) => s.authUser)
  const setAuthUser = useStore((s) => s.setAuthUser)
  const cloudSync = useStore((s) => s.cloudSync)
  const setCloudSync = useStore((s) => s.setCloudSync)

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [consent, setConsent] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  // Handle OAuth / recovery links landing here (#/auth).
  useEffect(() => {
    if (window.location.hash.includes('#/auth')) {
      handleAuthRedirect().then((m) => {
        if (m) {
          setMode('newpass')
          setMsg(m)
        }
      })
    }
  }, [])

  if (!supabaseReady) {
    return (
      <>
        <h1>Account</h1>
        <div className="panel">
          <p>
            The app is running in <strong>offline mode</strong> — stats are stored on this device and
            everything works without an account.
          </p>
          <p style={{ color: 'var(--muted)' }}>
            Cloud logins (Google + email), password reset and synced stats activate automatically once the
            deployment is configured with a Supabase project URL and anon key — see DEPLOYMENT.md.
          </p>
        </div>
      </>
    )
  }

  const sb = getSupabase()!

  const say = (m: string, isErr = false) => {
    setMsg(m)
    setErr(isErr)
  }

  async function doSignIn() {
    setBusy(true)
    const error = await signIn(email, password)
    setBusy(false)
    if (error) return say(error, true)
    const u = (await sb.auth.getUser()).data.user
    setAuthUser({ id: u?.id, email: u?.email ?? email })
    say('Signed in — syncing your match history…')
    await syncAll()
    say('Signed in! Match history synced.')
  }

  async function doRegister() {
    if (password.length < 6) return say('Password must be at least 6 characters.', true)
    if (!consent) return say('Please accept the Terms & Privacy Policy first.', true)
    setBusy(true)
    const result = await register(email, password, displayName)
    setBusy(false)
    if (!/error|invalid|rate|too/i.test(result ?? '')) track('register')
    say(result ?? 'Done.', /error|invalid|rate|too/i.test(result ?? ''))
  }

  async function doForgot() {
    setBusy(true)
    const result = await sendResetEmail(email)
    setBusy(false)
    say(result ?? '', /error|invalid|rate/i.test(result ?? ''))
    if (result?.startsWith('Reset link')) setMode('signin')
  }

  async function doSetNewPassword() {
    if (password.length < 6) return say('Password must be at least 6 characters.', true)
    if (password !== password2) return say('Passwords do not match.', true)
    setBusy(true)
    const result = await updatePassword(password)
    setBusy(false)
    say(result ?? '', Boolean(result))
    if (result === 'Password updated!') setMode('signin')
  }

  async function doSaveName() {
    const result = await updateDisplayName(displayName)
    say(result ?? 'Display name updated!', Boolean(result))
  }

  async function doSocial(provider: 'google' | 'facebook' | 'twitter') {
    const error = await signInWithSocial(provider)
    if (error) say(error, true)
  }

  async function doSignOut() {
    await sb.auth.signOut()
    setAuthUser(null)
    setCloudSync('off')
    setMode('signin')
    setMsg('')
  }

  const field = (label: string, node: ReactNode) => (
    <label className="authfield">
      <span>{label}</span>
      {node}
    </label>
  )

  return (
    <>
      <h1>Account</h1>
      {authUser ? (
        <div className="panel">
          <p>
            Signed in as <strong>{authUser.name || authUser.email}</strong>
            {authUser.name ? <span style={{ color: 'var(--muted)' }}> ({authUser.email})</span> : null} ·
            cloud sync is <strong>{cloudSync}</strong>.
          </p>
          <div style={{ maxWidth: 340 }}>
            {field('Display name (shown on leagues & boards)', (
              <input
                className="input"
                value={displayName}
                placeholder={authUser.name || 'Your darting alias'}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            ))}
            <button className="btn" onClick={doSaveName} disabled={!displayName.trim()}>
              Save name
            </button>
          </div>
          <p style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn secondary" onClick={doSignOut}>
              Sign out
            </button>
            <button className="btn ghost" onClick={() => void exportMyData()} disabled={authUser.id == null}>
              Download my data (POPIA/GDPR)
            </button>
          </p>
          <details className="danger-zone">
            <summary>Danger zone — delete my account</summary>
            <p style={{ color: 'var(--muted)' }}>
              This erases your profile, match history and memberships everywhere. Irreversible.
            </p>
            <input
              className="input"
              style={{ maxWidth: 320 }}
              placeholder='Type DELETE to confirm'
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
            />
            <button
              className="btn danger"
              disabled={confirmDelete !== 'DELETE'}
              onClick={async () => {
                const error = await deleteMyAccount()
                if (error) say(error, true)
                else say('Account deleted. Goodbye and thanks for the darts.')
              }}
            >
              Permanently delete my account
            </button>
          </details>
        </div>
      ) : (
        <div className="panel authform">
          {mode === 'newpass' ? (
            <>
              <h2 style={{ marginTop: 0 }}>Set a new password</h2>
              {field('New password', (
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              ))}
              {field('Confirm new password', (
                <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
              ))}
              <button className="btn" onClick={doSetNewPassword} disabled={busy}>
                Update password
              </button>
            </>
          ) : (
            <>
              {SOCIAL_PROVIDERS.map((p) => (
                <button key={p.id} className={`btn social ${p.cls}`} onClick={() => doSocial(p.id)} disabled={busy}>
                  <span className={`gmark ${p.cls}`}>{p.mark}</span> {p.label}
                </button>
              ))}
              <div className="authdivider"><span>or with email</span></div>

              {mode === 'forgot' ? (
                <>
                  {field('Your account email', (
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  ))}
                  <button className="btn" onClick={doForgot} disabled={busy || !email}>
                    Send reset link
                  </button>
                  <p className="authswap">
                    Remembered it?{' '}
                    <button className="linklike" onClick={() => setMode('signin')}>Back to sign in</button>
                  </p>
                </>
              ) : (
                <>
                  {field('Email', (
                    <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                  ))}
                  {field('Password', (
                    <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  ))}
                  {mode === 'register' &&
                    field('Display name', (
                      <input
                        className="input"
                        value={displayName}
                        placeholder="What the chalkboard calls you"
                        onChange={(e) => setDisplayName(e.target.value)}
                      />
                    ))}
                  {mode === 'signin' ? (
                    <button className="btn" onClick={doSignIn} disabled={busy || !email || !password}>
                      Sign in
                    </button>
                  ) : (
                    <button className="btn" onClick={doRegister} disabled={busy || !email || !password}>
                      Create account
                    </button>
                  )}
                  {mode === 'register' && (
                    <label className="consent">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                      <span>
                        I agree to the <a href="#/legal">Terms of Service</a> and{' '}
                        <a href="#/legal">Privacy Policy</a> (POPIA/GDPR). I'm 13+ and understand I can
                        export or delete my data at any time.
                      </span>
                    </label>
                  )}
                  <p className="authswap">
                    {mode === 'signin' ? (
                      <>
                        New here? <button className="linklike" onClick={() => setMode('register')}>Register</button>
                        {' · '}
                        <button className="linklike" onClick={() => setMode('forgot')}>Forgot password?</button>
                      </>
                    ) : (
                      <>
                        Already registered?{' '}
                        <button className="linklike" onClick={() => setMode('signin')}>Sign in</button>
                      </>
                    )}
                  </p>
                </>
              )}
            </>
          )}
          {msg && <p style={{ color: err ? '#e8a48f' : 'var(--muted)' }}>{msg}</p>}
        </div>
      )}
    </>
  )
}
