// Auth layer — Google sign-in, email register/sign-in, password reset,
// persistent sessions and a presence heartbeat for the "current players" list.
// Everything degrades gracefully when Supabase is not configured (offline mode).

import { getSupabase, supabaseReady } from './supabase'
import { useStore } from './store'
import { syncAll } from './cloud'
import { track } from './analytics'

const HEARTBEAT_MS = 45_000 // stays comfortably under any typical 60s "online" cutoff

/** True when cloud auth is configured (drives the "current players" UI). */
export const supabaseOnline = supabaseReady

/** Restore any existing session (called once at app start). */
export async function restoreSession(): Promise<void> {
  if (!supabaseReady) return
  const sb = getSupabase()!
  try {
    const { data } = await sb.auth.getSession()
    const user = data.session?.user
    if (user) await adoptUser(user.id, user.email ?? null)
  } catch {
    /* ignore corrupt tokens — stay offline */
  }

  // React to future changes: Google redirect returning a session, sign-outs in
  // other tabs, token refresh failures, etc.
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      await adoptUser(session.user.id, session.user.email ?? null)
    } else if (event === 'SIGNED_OUT') {
      useStore.getState().setAuthUser(null)
      useStore.getState().setCloudSync('off')
    }
  })
}

/** Shared sign-in side effects: store user, ensure profile, start heartbeat, sync. */
async function adoptUser(userId: string, email: string | null): Promise<void> {
  const sb = getSupabase()!
  useStore.getState().setAuthUser({ id: userId, email: email ?? '' })
  useStore.getState().setCloudSync('on')

  // Make sure a profile row exists (also covers users created before the trigger).
  const { data: prof } = await sb.from('profiles').select('display_name').eq('id', userId).single()
  if (!prof) {
    await sb.from('profiles').upsert({
      id: userId,
      display_name: email?.split('@')[0] ?? 'Player',
    })
  }
  const name = prof?.display_name ?? email?.split('@')[0] ?? 'Player'
  useStore.getState().setAuthUser({ id: userId, email: email ?? '', name })

  await heartbeat()
  if (!heartbeatTimer) startHeartbeat()
  await syncAll()
  track('sign_in', { via: 'account_page' })
}

/* ---------------------- Email + password ---------------------- */

export async function signIn(email: string, password: string): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const { error } = await getSupabase()!.auth.signInWithPassword({ email, password })
  return error ? error.message : null
}

export async function register(email: string, password: string, displayName: string): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const { error } = await getSupabase()!.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName || email.split('@')[0] } },
  })
  if (error) return error.message
  return 'Account created! Check your email to confirm your address, then sign in.'
}

export async function sendResetEmail(email: string): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const redirectTo = `${window.location.origin}${window.location.pathname}#/auth`
  const { error } = await getSupabase()!.auth.resetPasswordForEmail(email, { redirectTo })
  return error ? error.message : 'Reset link sent! Check your email (check spam too).'
}

/* ---------------------- Social sign-in (provider-agnostic) ---------------------- */

export type SocialProvider = 'google' | 'facebook' | 'twitter'

export const SOCIAL_PROVIDERS: { id: SocialProvider; label: string; cls: string; mark: string }[] = [
  { id: 'google', label: 'Continue with Google', cls: 'google', mark: 'G' },
  { id: 'facebook', label: 'Continue with Facebook', cls: 'facebook', mark: 'f' },
  { id: 'twitter', label: 'Continue with X', cls: 'x', mark: '𝕏' },
]

/** Google / Facebook / X — same PKCE redirect flow for all three. */
export async function signInWithSocial(provider: SocialProvider): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const redirectTo = `${window.location.origin}${window.location.pathname}#/auth`
  const { error } = await getSupabase()!.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
  return error ? error.message : null
}

/** Back-compat alias used in earlier UI. */
export async function signInWithGoogle(): Promise<string | null> {
  return signInWithSocial('google')
}

/* ---------------------- Privacy: export & delete (POPIA/GDPR) ---------------------- */

/** Download everything we hold about the signed-in user as a JSON file. */
export async function exportMyData(): Promise<void> {
  if (!supabaseReady) return
  const sb = getSupabase()!
  const user = (await sb.auth.getUser()).data.user
  if (!user) return
  const [{ data: profile }, { data: matches }, { data: memberships }] = await Promise.all([
    sb.from('profiles').select('*').eq('id', user.id),
    sb.from('matches').select('*').eq('user_id', user.id),
    sb.from('venue_players').select('*').eq('user_id', user.id),
  ])
  const bundle = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at },
    profile: profile ?? [],
    matches: matches ?? [],
    venue_memberships: memberships ?? [],
  }
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `bullseye-my-data-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(a.href)
}

/** POPIA/GDPR right-to-erasure: wipes profile, history and auth user. Irreversible. */
export async function deleteMyAccount(): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const sb = getSupabase()!
  stopHeartbeat()
  const { error } = await sb.rpc('delete_own_account')
  if (error) return error.message
  await sb.auth.signOut()
  useStore.getState().setAuthUser(null)
  useStore.getState().setCloudSync('off')
  return null
}

/* ---------------------- Recovery/callback handling ---------------------- */

/**
 * Handle OAuth (?code=...) or password-recovery links landing on the /auth route.
 * Returns a human message to show, or null if nothing was pending.
 */
export async function handleAuthRedirect(): Promise<string | null> {
  if (!supabaseReady) return null
  const sb = getSupabase()!
  const hash = window.location.hash
  const isRecovery = hash.includes('type=recovery')

  // detect_oauth_callback handles PKCE ?code= in the URL
  const { data: pkce, error: pkceErr } = await sb.auth.exchangeCodeForSession(window.location.href)
  if (pkce?.session) {
    window.history.replaceState(null, '', window.location.pathname + '#/')
    return null // onAuthStateChange adopts the user
  }
  if (pkceErr && !/no.*code|invalid/i.test(pkceErr.message)) return `Sign-in error: ${pkceErr.message}`

  // Legacy implicit flow: tokens live in the hash fragment
  if (hash.includes('access_token')) {
    const params = new URLSearchParams(hash.slice(1))
    const at = params.get('access_token')
    const rt = params.get('refresh_token')
    if (at && rt) {
      const { error } = await sb.auth.setSession({ access_token: at, refresh_token: rt })
      window.history.replaceState(null, '', window.location.pathname + '#/')
      if (error) return `Sign-in error: ${error.message}`
      return isRecovery ? 'Set a new password below.' : null
    }
  }

  if (isRecovery) {
    window.history.replaceState(null, '', window.location.pathname + '#/')
    return 'Set a new password below.'
  }
  return null
}

/* ---------------------- Password management ---------------------- */

export async function updatePassword(newPassword: string): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const { error } = await getSupabase()!.auth.updateUser({ password: newPassword })
  return error ? error.message : 'Password updated!'
}

export async function updateDisplayName(name: string): Promise<string | null> {
  if (!supabaseReady) return 'Cloud is not configured (offline mode).'
  const sb = getSupabase()!
  const user = (await sb.auth.getUser()).data.user
  if (!user) return 'Not signed in.'
  await sb.auth.updateUser({ data: { display_name: name } })
  const { error } = await sb.from('profiles').update({ display_name: name }).eq('id', user.id)
  if (error) return error.message
  useStore.getState().setAuthUser({
    id: user.id,
    email: user.email ?? '',
    name,
  })
  return null
}

/* ---------------------- Presence heartbeat ---------------------- */

let heartbeatTimer: ReturnType<typeof setInterval> | null = null

/** Mark this user as "at the oche" — powers the current-players list. */
export async function heartbeat(): Promise<void> {
  if (!supabaseReady) return
  const sb = getSupabase()!
  const user = (await sb.auth.getUser()).data.user
  if (!user) return
  await sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', user.id)
}

export function startHeartbeat(): void {
  if (heartbeatTimer || !supabaseReady) return
  heartbeatTimer = setInterval(() => {
    void heartbeat()
  }, HEARTBEAT_MS)
}

export function stopHeartbeat(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
}

/** Fetch currently-online players (active in the last 2 minutes). */
export async function fetchOnlinePlayers(): Promise<{ id: string; name: string; email: string }[]> {
  if (!supabaseReady) return []
  const cutoff = new Date(Date.now() - 120_000).toISOString()
  const { data } = await getSupabase()!
    .from('profiles')
    .select('id, display_name, last_seen')
    .gte('last_seen', cutoff)
    .order('last_seen', { ascending: false })
  return (data ?? []).map((p) => ({ id: p.id, name: p.display_name, email: '' }))
}
