import { useStore, playerStats } from '../lib/store'
import { IconChartUp, IconTick, IconTrophyCup } from '../components/icons'

/** Live usage snapshot for the growth dashboard (anon events via service key would
 *  be the production route; this reads the recent public slice). */
function GrowthCard() {
  const history = useStore((s) => s.history)
  const players = useStore((s) => s.players)
  const venue = useStore((s) => s.venue)
  const authUser = useStore((s) => s.authUser)

  const last30 = history.filter((h) => Date.now() - h.date < 30 * 86_400_000)
  const actives = new Set(last30.flatMap((h) => h.players.map((p) => p.id))).size

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2 style={{ marginBottom: 8 }}><IconChartUp size={20} /> Growth &amp; usage (this device/venue)</h2>
      <div className="grid">
        <div className="card"><h3>{history.length}</h3><p>matches recorded (all time)</p></div>
        <div className="card"><h3>{last30.length}</h3><p>matches in the last 30 days</p></div>
        <div className="card"><h3>{actives}</h3><p>active players (30 days)</p></div>
        <div className="card"><h3>{players.length}</h3><p>players on the roster</p></div>
        <div className="card"><h3>{venue ? <IconTick size={20} className="icon-good"/> : '—'}</h3><p>venue linked</p></div>
        <div className="card"><h3>{authUser ? <IconTick size={20} className="icon-good"/> : '—'}</h3><p>cloud account linked</p></div>
      </div>
      <p style={{ color: 'var(--muted)', marginBottom: 0 }}>
        Network-wide numbers (every venue, every country) come from the anonymous app_events
        table in your Supabase dashboard — see SCALING.md for the queries.
      </p>
    </div>
  )
}

export default function Reports() {
  const players = useStore((s) => s.players)
  const history = useStore((s) => s.history)
  const venue = useStore((s) => s.venue)

  const venueHistory = venue ? history.filter((h) => (h as any).venue === venue.id) : history

  const cards = players.map((p) => {
    const st = playerStats(venueHistory, p.id)
    const games = venueHistory.filter((h) => h.players.some((pl) => pl.id === p.id))
    const x01 = games.filter((g) => /x01|501|301|701/i.test(g.game))
    const avgs = x01
      .map((g) => {
        const me = g.players.find((pl) => pl.id === p.id)
        return me && me.lines && '3-dart avg' in me.lines ? Number(me.lines['3-dart avg']) : null
      })
      .filter((v): v is number => v !== null)
    const bestAvg = avgs.length ? Math.max(...avgs) : null
    const lastAvg = avgs.length ? avgs[0] : null
    return { p, st, bestAvg, lastAvg, x01Played: x01.length }
  })

  const byWins = [...cards].sort((a, b) => b.st.wins - a.st.wins)

  return (
    <>
      <h1>Reports</h1>
      <p style={{ color: 'var(--muted)' }}>
        {venue ? `Venue: ${venue.name}. ` : 'All games on this device. '}
        Print this page for the noticeboard (Ctrl/Cmd+P).
      </p>

      <GrowthCard />

      <div className="chalk-panel" style={{ marginBottom: 16 }}>
        <h2 style={{ marginBottom: 8 }}><IconTrophyCup size={20} /> Leaderboard</h2>
        <table className="stats">
          <thead>
            <tr><th>#</th><th>Player</th><th>Played</th><th>Wins</th><th>Win %</th><th>Best 3-dart avg</th></tr>
          </thead>
          <tbody>
            {byWins.map((c, i) => (
              <tr key={c.p.id}>
                <td>{i + 1}</td>
                <td><strong>{c.p.name}</strong></td>
                <td>{c.st.played}</td>
                <td>{c.st.wins}</td>
                <td>{c.st.winPct}%</td>
                <td>{c.bestAvg ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid">
        {cards.map((c) => (
          <div className="card" key={c.p.id}>
            <h3>{c.p.name}</h3>
            <p>
              {c.st.played} matches · {c.st.wins} wins ({c.st.winPct}%)
              {c.lastAvg !== null && <> · latest avg {c.lastAvg}</>}
              {c.bestAvg !== null && <> · best avg {c.bestAvg}</>}
            </p>
          </div>
        ))}
      </div>
    </>
  )
}
