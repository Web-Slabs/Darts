// Cloud layer v2 — pub/commercial features.
// All functions are safe no-ops when Supabase is not configured.

import { getSupabase, supabaseReady } from './supabase'
import { useStore, uid, type MatchRecord } from './store'

export type Venue = { id: string; name: string; code: string }
export type LeagueRow = {
  id: string
  name: string
  venue_id: string | null
  format: string
  game_type: string
  played?: number
  won?: number
  lost?: number
  points?: number
}
export type Fixture = {
  id: string
  round: number
  home: string
  away: string
  homeName: string
  awayName: string
  homeScore: number | null
  awayScore: number | null
}
export type TournamentRow = {
  id: string
  name: string
  size: number
  status: string
  game_type: string
}

const ok = () => supabaseReady && getSupabase() !== null

/* ---------------- Venues ---------------- */

export async function listVenues(): Promise<Venue[]> {
  if (!ok()) return []
  const { data } = await getSupabase()!.from('venues').select('*').order('name')
  return (data ?? []) as Venue[]
}

export async function createVenue(name: string, code: string): Promise<Venue | null> {
  if (!ok()) return null
  const { data, error } = await getSupabase()!.from('venues').insert({ name, code }).select().single()
  if (error) return null
  return data as Venue
}

export async function joinVenue(code: string): Promise<Venue | null> {
  if (!ok()) return null
  const { data } = await getSupabase()!.from('venues').select('*').eq('code', code.trim().toUpperCase()).single()
  if (!data) return null
  const user = (await getSupabase()!.auth.getUser()).data.user
  if (user) {
    await getSupabase()!.from('venue_players').upsert({ venue_id: data.id, user_id: user.id })
  }
  return data as Venue
}

/* ---------------- Matches (venue-tagged, cross-venue) ---------------- */

export async function pullMatches(): Promise<void> {
  if (!ok()) return
  const { data, error } = await getSupabase()!.from('matches').select('*').order('played_at', { ascending: false }).limit(500)
  if (error || !data) return
  const local = useStore.getState().history
  const byId = new Map(local.map((m) => [m.id, m]))
  for (const row of data) {
    if (!byId.has(row.id)) {
      byId.set(row.id, {
        id: row.id,
        game: row.game,
        date: new Date(row.played_at).getTime(),
        summary: row.summary,
        players: row.players,
        venue: row.venue_id ?? null,
      })
    }
  }
  const merged = [...byId.values()].sort((a, b) => b.date - a.date).slice(0, 500)
  useStore.setState({ history: merged as MatchRecord[], cloudSync: 'on' })
}

export async function pushMatches(venueId?: string | null): Promise<void> {
  if (!ok()) return
  const sb = getSupabase()!
  const user = (await sb.auth.getUser()).data.user
  if (!user) return
  const history = useStore.getState().history
  const rows = history.map((m: MatchRecord) => ({
    id: m.id || uid(),
    user_id: user.id,
    venue_id: venueId ?? (m as any).venue ?? null,
    game: m.game,
    played_at: new Date(m.date).toISOString(),
    summary: m.summary,
    players: m.players,
  }))
  if (rows.length === 0) return
  const { error } = await sb.from('matches').upsert(rows)
  useStore.getState().setCloudSync(error ? 'error' : 'on')
}

export async function syncAll(): Promise<void> {
  if (!supabaseReady) return
  await pushMatches()
  await pullMatches()
}

/* ---------------- Leagues ---------------- */

export async function createLeague(name: string, venueId: string | null, format: string, gameType: string) {
  if (!ok()) return null
  const { data, error } = await getSupabase()!
    .from('leagues')
    .insert({ name, venue_id: venueId, format, game_type: gameType })
    .select()
    .single()
  return error ? null : (data as LeagueRow)
}

export async function listLeagues(): Promise<LeagueRow[]> {
  if (!ok()) return []
  const { data } = await getSupabase()!.from('leagues').select('*').order('created_at', { ascending: false })
  return (data ?? []) as LeagueRow[]
}

export async function listFixtures(leagueId: string): Promise<Fixture[]> {
  if (!ok()) return []
  const sb = getSupabase()!
  const { data } = await sb.from('league_fixtures').select('*').eq('league_id', leagueId).order('round')
  if (!data) return []
  const ids = [...new Set(data.flatMap((f) => [f.home_user, f.away_user].filter(Boolean)))]
  const { data: profiles } = await sb.from('profiles').select('id, display_name').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  const nameOf = (id: string | null) => profiles?.find((p) => p.id === id)?.display_name ?? 'TBD'
  return data.map((f) => ({
    id: f.id,
    round: f.round,
    home: f.home_user,
    away: f.away_user,
    homeName: nameOf(f.home_user),
    awayName: nameOf(f.away_user),
    homeScore: f.home_score,
    awayScore: f.away_score,
  }))
}

/** Round-robin fixture generator (classic circle method). */
export function roundRobin(playerIds: string[]): { round: number; home: string; away: string }[] {
  const ids = [...playerIds]
  if (ids.length % 2 === 1) ids.push('BYE')
  const n = ids.length
  const rounds = n - 1
  const out: { round: number; home: string; away: string }[] = []
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i]
      const away = ids[n - 1 - i]
      if (home !== 'BYE' && away !== 'BYE') out.push({ round: r + 1, home, away: away })
    }
    ids.splice(1, 0, ids.pop()!)
  }
  return out
}

export async function generateFixtures(leagueId: string, playerIds: string[]) {
  if (!ok() || playerIds.length < 2) return false
  const rows = roundRobin(playerIds).map((f) => ({ league_id: leagueId, round: f.round, home_user: f.home, away_user: f.away }))
  const { error } = await getSupabase()!.from('league_fixtures').insert(rows)
  return !error
}

export async function reportFixture(fixtureId: string, homeScore: number, awayScore: number) {
  if (!ok()) return false
  const { error } = await getSupabase()!
    .from('league_fixtures')
    .update({ home_score: homeScore, away_score: awayScore, played_at: new Date().toISOString() })
    .eq('id', fixtureId)
  return !error
}

/** Standings computed from fixtures. */
export function standings(fixtures: Fixture[], pointsWin = 3, pointsDraw = 1) {
  const table = new Map<string, { player: string; played: number; won: number; drawn: number; lost: number; pts: number }>()
  const bump = (p: string) => {
    if (!table.has(p)) table.set(p, { player: p, played: 0, won: 0, drawn: 0, lost: 0, pts: 0 })
    return table.get(p)!
  }
  for (const f of fixtures) {
    if (f.homeScore === null || f.awayScore === null) continue
    const h = bump(f.home)
    const a = bump(f.away)
    h.played++
    a.played++
    if (f.homeScore > f.awayScore) {
      h.won++; a.lost++; h.pts += pointsWin
    } else if (f.homeScore < f.awayScore) {
      a.won++; h.lost++; a.pts += pointsWin
    } else {
      h.drawn++; a.drawn++; h.pts += pointsDraw; a.pts += pointsDraw
    }
  }
  return [...table.values()].sort((x, y) => y.pts - x.pts || y.won - x.won)
}

/* ---------------- Tournaments ---------------- */

export async function createTournament(name: string, venueId: string | null, size: number, gameType: string) {
  if (!ok()) return null
  const { data, error } = await getSupabase()!
    .from('tournaments')
    .insert({ name, venue_id: venueId, size, game_type: gameType })
    .select()
    .single()
  return error ? null : (data as TournamentRow)
}

export async function listTournaments(): Promise<TournamentRow[]> {
  if (!ok()) return []
  const { data } = await getSupabase()!.from('tournaments').select('*').order('created_at', { ascending: false })
  return (data ?? []) as TournamentRow[]
}

/** Seeded single-elimination bracket slots (1 vs lowest, etc). */
export function bracketOrder(size: number): number[] {
  let order = [1, 2]
  while (order.length < size) {
    const next: number[] = []
    const seedCount = order.length * 2 + 1
    for (const s of order) {
      next.push(s)
      next.push(seedCount - s)
    }
    order = next.length === size ? next : next.flatMap((s) => [s * 2 - 1, s * 2])
  }
  return order
}

export async function startTournament(tournamentId: string, playerIds: string[]) {
  if (!ok() || playerIds.length < 2) return false
  const shuffled = [...playerIds].sort(() => Math.random() - 0.5)
  const rows = []
  for (let i = 0; i < shuffled.length; i += 2) {
    rows.push({
      tournament_id: tournamentId,
      round: 1,
      slot: i / 2,
      player_a: shuffled[i],
      player_b: shuffled[i + 1] ?? null,
    })
  }
  const sb = getSupabase()!
  const { error } = await sb.from('tournament_matches').insert(rows)
  if (error) return false
  await sb.from('tournaments').update({ status: 'running' }).eq('id', tournamentId)
  return true
}

export async function tournamentMatches(tournamentId: string) {
  if (!ok()) return []
  const { data } = await getSupabase()!
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('slot')
  return data ?? []
}

export async function reportTournamentMatch(matchId: string, winner: string, scoreA: number, scoreB: number) {
  if (!ok()) return false
  const sb = getSupabase()!
  const { data: m } = await sb.from('tournament_matches').select('*').eq('id', matchId).single()
  if (!m) return false
  await sb.from('tournament_matches').update({ winner, score_a: scoreA, score_b: scoreB }).eq('id', matchId)
  // advance winner: find next slot in the following round
  const nextSlot = Math.floor(m.slot / 2)
  const position = m.slot % 2 === 0 ? 'player_a' : 'player_b'
  const { data: existing } = await sb
    .from('tournament_matches')
    .select('*')
    .eq('tournament_id', m.tournament_id)
    .eq('round', m.round + 1)
    .eq('slot', nextSlot)
    .single()
  if (existing) {
    await sb.from('tournament_matches').update({ [position]: winner }).eq('id', existing.id)
  } else {
    // final round won — tournament done
    await sb.from('tournaments').update({ status: 'done' }).eq('id', m.tournament_id)
  }
  return true
}
