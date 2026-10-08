import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { fetchOnlinePlayers, supabaseOnline } from '../lib/auth'

const HOUSE_ROSTER = ['Mike', 'Pieter', 'Pierre', 'Riaan', 'Carel', 'Vissie', 'Gerda', 'Elizabeth', 'Andre', 'Wayne', 'Charles', 'Schalk', 'Monti', 'Juan', 'Kallie', 'Leylane']

export default function Players() {
  const players = useStore((s) => s.players)
  const addPlayer = useStore((s) => s.addPlayer)
  const removePlayer = useStore((s) => s.removePlayer)
  const renamePlayer = useStore((s) => s.renamePlayer)
  const loadDemoRoster = useStore((s) => s.loadDemoRoster)
  const [name, setName] = useState('')
  const [online, setOnline] = useState<{ id: string; name: string }[]>([])

  // Live "who's at the pub" list — refreshed every 30s from the presence heartbeat.
  useEffect(() => {
    let alive = true
    const load = async () => {
      const list = await fetchOnlinePlayers()
      if (alive) setOnline(list)
    }
    void load()
    const t = setInterval(load, 30_000)
    return () => {
      alive = false
      clearInterval(t)
    }
  }, [])

  const onlineNames = new Set(online.map((o) => o.name.toLowerCase()))

  return (
    <>
      <h1>Players</h1>
      <p style={{ color: 'var(--muted)' }}>Add your regulars once — they appear in every game and collect stats across all matches.</p>

      {supabaseOnline && (
        <div className="panel">
          <h2>At the oche now</h2>
          {online.length === 0 ? (
            <p style={{ color: 'var(--muted)' }}>Nobody else is signed in right now — your stats sync the moment you log in.</p>
          ) : (
            <div className="online-row">
              {online.map((o) => (
                <span className="online-pill" key={o.id}>
                  <span className="dot" /> {o.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!name.trim()) return
            addPlayer(name)
            setName('')
          }}
          style={{ display: 'flex', gap: 8 }}
        >
          <input className="input" placeholder="Player name…" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" type="submit">Add player</button>
        </form>
        {players.length === 0 && (
          <div style={{ marginTop: 14 }}>
            <button className="btn secondary small" onClick={() => loadDemoRoster(HOUSE_ROSTER)}>
              Load the Web-Slabs house roster ({HOUSE_ROSTER.length} names from your Excel sheet)
            </button>
          </div>
        )}
      </div>
      <div className="panel">
        {players.length === 0 ? (
          <div className="empty">No players yet — add some above.</div>
        ) : (
          <table className="stats">
            <thead>
              <tr><th>Name</th><th></th></tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="player-cell">
                      <span className={`dot ${onlineNames.has(p.name.toLowerCase()) ? 'live' : ''}`} />
                      <input
                        className="input"
                        style={{ maxWidth: 260 }}
                        value={p.name}
                        onChange={(e) => renamePlayer(p.id, e.target.value)}
                      />
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn ghost small" onClick={() => removePlayer(p.id)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
