import { useStore, playerStats } from "../lib/store";

export default function Stats() {
  const players = useStore((s) => s.players);
  const history = useStore((s) => s.history);

  const rows = players
    .map((p) => ({ ...p, ...playerStats(history, p.id) }))
    .sort((a, b) => b.wins - a.wins || b.winPct - a.winPct);

  return (
    <>
      <h1>Stats</h1>
      <p style={{ color: "var(--muted)" }}>
        Wins and match counts across all recorded games on this device.
      </p>
      {rows.length === 0 ? (
        <div className="panel">
          <div className="empty">
            Add players and play some games to see stats.
          </div>
        </div>
      ) : (
        <table className="stats">
          <thead>
            <tr>
              <th>#</th>
              <th>Player</th>
              <th>Played</th>
              <th>Wins</th>
              <th>Win %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.played}</td>
                <td>{p.wins}</td>
                <td>{p.winPct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
