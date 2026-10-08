// Optional Supabase integration. The app is fully functional offline; when
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are provided (build-time), auth
// and cloud sync activate automatically.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseReady = Boolean(url && key)

let client: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseReady) return null
  if (!client) {
    client = createClient(url!, key!, {
      auth: {
        // PKCE flow: required for Google/Facebook/X OAuth and safe for email links,
        // works from static hosting and inside Electron.
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
