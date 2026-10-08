import { useEffect, useState } from 'react'
import {
  listVenues, createVenue, joinVenue,
  listLeagues, createLeague, generateFixtures, listFixtures, reportFixture, standings, type Fixture,
  listTournaments, createTournament, startTournament, tournamentMatches, reportTournamentMatch,
} from '../lib/cloud'
import { supabaseReady } from '../lib/supabase'
import { useStore } from '../lib/store'
import { track } from '../lib/analytics'
import { IconPin, IconTick } from '../components/icons'

export default function Competition() {
  if (!supabaseReady) {
    return (
      <>
        <h1>Leagues & Tournaments</h1>
        <div className="panel">
          <p>
            Leagues, tournaments, venues and cross-pub player accounts run on the cloud (Supabase).
            This device is in <strong>offline mode</strong> — everything else works, but competitions
            need the server configured (see DEPLOYMENT.md).
          </p>
        </div>
      </>
    )
  }
  return <CompetitionTabs />
}

function CompetitionTabs() {
  const [tab, setTab] = useState<'leagues' | 'tournaments' | 'venues'>('leagues')
  return (
    <>
      <h1>Leagues & Tournaments</h1>
      <div className="chips" style={{ marginBottom: 16 }}>
        {(['leagues', 'tournaments', 'venues'] as const).map((t) => (
          <button key={t} className={`chip ${tab === t ? 'selected' : ''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {tab === 'leagues' && <Leagues />}
      {tab === 'tournaments' && <Tournaments />}
      {tab === 'venues' && <Venues />}
    </>
  )
}

/* ---------------- Leagues ---------------- */

function Leagues() {
  const authUser = useStore((s) => s.authUser)
  const players = useStore((s) => s.players)
  const [leagues, setLeagues] = useState<Awaited<ReturnType<typeof listLeagues>>>([])
  const [name, setName] = useState('')
  const [format, setFormat] = useState('singles')
  const [open, setOpen] = useState<string | null>(null)
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => { void listLeagues().then(setLeagues) }, [])

  async function refreshFixtures(id: string) {
    setFixtures(await listFixtures(id))
  }

  async function create() {
    if (!name.trim() || !authUser) return setMsg('Sign in first (Account page), then create.')
    const l = await createLeague(name, null, format, '501')
    if (l) {
      setLeagues(await listLeagues())
      setName('')
      setMsg('League created. Select players below and generate fixtures.')
    }
  }

  async function genFixtures(leagueId: string) {
    // pick the first N roster players as league entrants for v1 (cloud entrants picker TODO)
    const ids = players.slice(0, 8).map((p) => p.id)
    if (ids.length < 2) return setMsg('Add at least 2 players to the roster first.')
    await generateFixtures(leagueId, ids)
    await refreshFixtures(leagueId)
    setOpen(leagueId)
  }

  async function report(f: Fixture) {
    const hs = Number(prompt(`Score for ${f.homeName}:`, '0') ?? '0')
    const as = Number(prompt(`Score for ${f.awayName}:`, '0') ?? '0')
    await reportFixture(f.id, hs, as)
    await refreshFixtures(f.id ? (fixtures[0] ? '' : '') : '')
    setMsg('Result saved')
  }

  const table = standings(fixtures)

  return (
    <>
      <div className="panel">
        <h3>Create a league</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="League name (e.g. Handy Services Darts 2026)" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" style={{ maxWidth: 160 }} value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="singles">Singles</option>
            <option value="doubles">Doubles</option>
            <option value="teams">Teams</option>
          </select>
          <button className="btn" onClick={create}>Create</button>
        </div>
        {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
      </div>

      {leagues.map((l) => (
        <div className="panel" key={l.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>{l.name}</h3>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{l.format} · {l.game_type}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn secondary small" onClick={() => { setOpen(open === l.id ? null : l.id); void refreshFixtures(l.id) }}>
                {open === l.id ? 'Hide' : 'Fixtures & table'}
              </button>
              <button className="btn small" onClick={() => genFixtures(l.id)}>Generate fixtures</button>
            </div>
          </div>
          {open === l.id && (
            <>
              {table.length > 0 && (
                <table className="stats" style={{ marginTop: 12 }}>
                  <thead><tr><th>#</th><th>Player</th><th>P</th><th>W</th><th>D</th><th>L</th><th>Pts</th></tr></thead>
                  <tbody>
                    {table.map((r, i) => (
                      <tr key={r.player}><td>{i + 1}</td><td><strong>{r.player}</strong></td><td>{r.played}</td><td>{r.won}</td><td>{r.drawn}</td><td>{r.lost}</td><td><strong>{r.pts}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
              )}
              <table className="stats" style={{ marginTop: 8 }}>
                <thead><tr><th>Rd</th><th>Home</th><th></th><th>Away</th><th></th></tr></thead>
                <tbody>
                  {fixtures.map((f) => (
                    <tr key={f.id}>
                      <td>{f.round}</td>
                      <td>{f.homeName}</td>
                      <td>{f.homeScore ?? '–'} v {f.awayScore ?? '–'}</td>
                      <td>{f.awayName}</td>
                      <td><button className="btn ghost small" onClick={() => report(f)}>Report</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      ))}
    </>
  )
}

/* ---------------- Tournaments ---------------- */

function Tournaments() {
  const players = useStore((s) => s.players)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listTournaments>>>([])
  const [name, setName] = useState('')
  const [size, setSize] = useState(8)
  const [open, setOpen] = useState<string | null>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  useEffect(() => { void listTournaments().then(setRows) }, [])

  async function create() {
    if (!name.trim()) return setMsg('Give the night a name.')
    const t = await createTournament(name, null, size, '501')
    if (t) {
      setRows(await listTournaments())
      setName('')
      setMsg('Created. Add players and start.')
    }
  }

  async function start(id: string) {
    const ids = players.slice(0, size).map((p) => p.id)
    if (ids.length < 2) return setMsg('Add players to the roster first.')
    await startTournament(id, ids)
    setMatches(await tournamentMatches(id))
    setOpen(id)
  }

  async function report(m: any) {
    if (!m.player_a || !m.player_b) return
    const sa = Number(prompt('Score A:', '0') ?? '0')
    const sb = Number(prompt('Score B:', '0') ?? '0')
    const winner = sa > sb ? m.player_a : m.player_b
    await reportTournamentMatch(m.id, winner, sa, sb)
    setMatches(await tournamentMatches(m.tournament_id))
  }

  return (
    <>
      <div className="panel">
        <h3>Create a knockout night</h3>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 240 }} placeholder="Tournament name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" style={{ maxWidth: 120 }} value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {[4, 8, 16, 32].map((s) => <option key={s} value={s}>{s} players</option>)}
          </select>
          <button className="btn" onClick={create}>Create</button>
        </div>
        {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
      </div>
      {rows.map((t) => (
        <div className="panel" key={t.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ margin: 0 }}>{t.name}</h3>
              <span style={{ color: 'var(--muted)', fontSize: 13 }}>{t.size} players · {t.game_type} · {t.status}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn small" onClick={() => start(t.id)}>Draw & start</button>
              <button className="btn secondary small" onClick={async () => { setOpen(open === t.id ? null : t.id); setMatches(await tournamentMatches(t.id)) }}>
                {open === t.id ? 'Hide' : 'Bracket'}
              </button>
            </div>
          </div>
          {open === t.id && (
            <table className="stats" style={{ marginTop: 12 }}>
              <thead><tr><th>Rd</th><th>Player A</th><th></th><th>Player B</th><th></th></tr></thead>
              <tbody>
                {matches.map((m) => (
                  <tr key={m.id}>
                    <td>{m.round}</td>
                    <td style={{ fontWeight: m.winner === m.player_a ? 800 : 400 }}>{m.player_a?.slice(0, 8) ?? '—'}</td>
                    <td>{m.score_a ?? '–'} v {m.score_b ?? '–'}</td>
                    <td style={{ fontWeight: m.winner === m.player_b ? 800 : 400 }}>{m.player_b?.slice(0, 8) ?? '—'}</td>
                    <td>{!m.winner && m.player_a && m.player_b ? <button className="btn ghost small" onClick={() => report(m)}>Report</button> : <IconTick size={14} className="icon-good"/>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </>
  )
}

/* ---------------- Venues ---------------- */

function Venues() {
  const venue = useStore((s) => s.venue)
  const setVenue = useStore((s) => s.setVenue)
  const [rows, setRows] = useState<Awaited<ReturnType<typeof listVenues>>>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { void listVenues().then(setRows) }, [])

  async function create() {
    if (!name.trim()) return
    const v = await createVenue(name, code.trim().toUpperCase() || Math.random().toString(36).slice(2, 7).toUpperCase())
    if (v) {
      setRows(await listVenues())
      setVenue({ id: v.id, name: v.name })
      setName(''); setCode('')
      track('venue_created', { venue: v.name })
      setMsg(`Venue registered! Your check-in code is ${v.code} — give it to your players. You are listed as the venue owner.`)
    } else setMsg('Could not create venue (sign in first).')
  }

  async function join() {
    const v = await joinVenue(joinCode)
    if (v) {
      setVenue({ id: v.id, name: v.name })
      track('venue_checkin', { venue: v.name })
      setMsg(`Checked in at ${v.name} — your matches now count for this venue`)
    } else setMsg('No venue with that code')
  }

  return (
    <>
      <div className="panel">
        <h3>Check in to a venue</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Joe plays at Pub A on Monday and Pub B on Thursday — he signs in once and his stats follow him everywhere.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 180 }} placeholder="Venue code" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} />
          <button className="btn" onClick={join}>Check in</button>
        </div>
        {venue && <p><IconPin size={14} /> Currently playing at: <strong>{venue.name}</strong></p>}
        {msg && <p style={{ color: 'var(--muted)' }}>{msg}</p>}
      </div>
      <div className="panel">
        <h3>Register your pub</h3>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>
          Free for any venue. You become the venue owner: pick a short check-in code, hand it to your
          players, and every match they score at your pub counts toward your venue leaderboards and leagues.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input className="input" style={{ maxWidth: 220 }} placeholder="Venue name (e.g. Kim's Pub Harper's)" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" style={{ maxWidth: 140 }} placeholder="Check-in code" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn secondary" onClick={create}>Register venue</button>
        </div>
      </div>
      <div className="panel">
        <h3>All venues</h3>
        <table className="stats">
          <thead><tr><th>Name</th><th>Code</th><th></th></tr></thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.name}</strong></td>
                <td>{v.code}</td>
                <td><button className="btn ghost small" onClick={async () => { setVenue({ id: v.id, name: v.name }); setMsg(`Checked in at ${v.name}`) }}>Check in</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
