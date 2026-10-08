import { Link } from 'react-router-dom'
import { IconDownload } from '../components/icons'
import { gamesByType } from '../engine/registry'
import { GAME_TYPE_LABELS } from '../engine/core'

export default function Home() {
  const groups = gamesByType()
  return (
    <>
      <div className="hero">
        <h1>The all-in-one darts scoreboard</h1>
        <p>
          46 games with official rules, step-by-step guides, live scoreboards, a practice dartbot and
          full player stats — including your own <strong>SA Killer</strong> house rules. Works offline,
          or sign in on the Account page to sync stats to the cloud.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link className="btn" to="/players">
            Start playing →
          </Link>
          <Link className="btn secondary" to="/downloads">
            <IconDownload size={16} /> Get the Windows & Android apps
          </Link>
        </div>
      </div>
      {groups.map(({ type, games }) => (
        <div key={type} style={{ marginBottom: 26 }}>
          <h2 style={{ marginBottom: 2 }}>{GAME_TYPE_LABELS[type].title}</h2>
          <p style={{ color: 'var(--muted)', margin: '0 0 12px', fontSize: 13 }}>{GAME_TYPE_LABELS[type].blurb}</p>
          <div className="grid">
            {games.map((g) => (
              <Link className="card" key={g.id} to={`/game/${g.id}`}>
                <span className="tag">{g.minPlayers === g.maxPlayers ? `${g.minPlayers} player` : `${g.minPlayers}–${g.maxPlayers} players`}</span>
                <h3>{g.name}</h3>
                <p>{g.tagline}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
