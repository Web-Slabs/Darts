// Scram chalkboard: all 20 numbers, chalked ✗ when the Stopper closes them.
// One column — closed is global, so the state column spans the board.

import type { ScramState } from '../engine/games/extra'

export default function ScramBoard({ state }: { state: ScramState }) {
  const stopper = state.phase === 1 ? 0 : 1
  const scorer = 1 - stopper
  const open = state.closed.filter((c) => !c).length

  return (
    <div className="cricket-board">
      <div style={{ color: 'var(--chalk)', fontFamily: 'var(--font-chalk)', fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
        Phase {state.phase} · round {state.round}/{state.cap} —{' '}
        <strong>{state.players[stopper].name}</strong> stops, <strong>{state.players[scorer].name}</strong> scores
        {open > 0 && <> · {open} still open</>}
      </div>
      <div className="cricket-grid" style={{ ['--players' as any]: 3 }}>
        <div className="cricket-row">
          <div className="cricket-head">No.</div>
          <div className="cricket-head">Board</div>
          <div className="cricket-head">No.</div>
          <div className="cricket-head">Board</div>
        </div>
        {Array.from({ length: 10 }, (_, row) => {
          const left = 20 - row
          const right = 10 - row
          const cell = (n: number) => {
            const closed = state.closed[n - 1]
            return (
              <>
                <div key={`n${n}`} className="cricket-cell num">{n}</div>
                <div key={`c${n}`} className={`cricket-cell ${closed ? 'closed' : ''}`}>{closed ? '✗' : ''}</div>
              </>
            )
          }
          return (
            <div className="cricket-row" key={row}>
              {cell(left)}
              {cell(right)}
            </div>
          )
        })}
        <div className="cricket-row" style={{ marginTop: 8 }}>
          {state.players.map((p, i) => (
            <div key={p.id} className="cricket-cell num" style={{ gridColumn: i === 0 ? '1 / span 2' : '3 / span 2', fontSize: 24 }}>
              {p.name}: {state.scores[i]}{i === scorer ? ' 🎯' : ' 🛡'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
