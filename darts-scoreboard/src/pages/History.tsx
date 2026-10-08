import { useStore } from "../lib/store";

export default function History() {
  const history = useStore((s) => s.history);

  return (
    <>
      <h1>Match history</h1>
      {history.length === 0 ? (
        <div className="panel">
          <div className="empty">
            No matches recorded yet. Finish a game and it lands here
            automatically.
          </div>
        </div>
      ) : (
        <table className="stats">
          <thead>
            <tr>
              <th>Date</th>
              <th>Game</th>
              <th>Result</th>
              <th>Players</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id}>
                <td>{new Date(h.date).toLocaleDateString()}</td>
                <td>{h.game}</td>
                <td>{h.summary}</td>
                <td>
                  {h.players.map((p) => (
                    <span
                      key={p.id}
                      className={`badge ${p.won ? "win" : "loss"}`}
                      style={{ marginRight: 6 }}
                    >
                      {p.name}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
