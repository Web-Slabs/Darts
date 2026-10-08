// Anonymous usage analytics — the growth engine's instrumentation.
// Fires lightweight, non-personal events (game played, venue check-in, sign-in…)
// to the app_events table. Fire-and-forget: never blocks or breaks gameplay.

import { getSupabase, supabaseReady } from './supabase'
import { useStore } from './store'

export type EventName =
  | 'app_open'
  | 'sign_in'
  | 'register'
  | 'match_started'
  | 'match_finished'
  | 'venue_created'
  | 'venue_checkin'
  | 'league_created'
  | 'tournament_started'
  | 'bot_game'
  | 'dartboard_tap'

const countryGuess = () =>
  (navigator.language.split('-')[1] ?? '').toUpperCase() || null

export function track(event: EventName, props: Record<string, unknown> = {}): void {
  if (!supabaseReady) return
  const s = useStore.getState()
  void getSupabase()!
    .from('app_events')
    .insert({
      name: event,
      game: (props.game as string) ?? null,
      props,
      venue_id: s.venue?.id ?? null,
      user_id: s.authUser?.id ?? null,
      country: countryGuess(),
      user_agent: navigator.userAgent,
    })
}
