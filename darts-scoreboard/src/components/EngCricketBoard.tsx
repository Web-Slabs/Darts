// English Cricket chalkboard: batsman's runs on the left, bowler's wickets on
// the right, innings situation chalked underneath.

import type { EngCricketState } from '../engine/games/extra'

export default function EngCricketBoard({ state }: { state: EngCricketState }) {
  const batter = state.batter
  const bowler = 1 - batter
  const chasing = state.innings === 2

  return (
    <div className="cricket-board">
      <div style={{ color: 'var(--chalk)', fontFamily: 'var(--font-chalk)', fontSize: 18, marginBottom: 10, textAlign: 'center' }}>
        Innings {state.innings} — <strong>{state.players[batter].name}</strong> batting, {state.players[bowler].name} bowling
      </div>
      <div className="cricket-grid" style={{ ['--players' as any]: 2 }}>
        <div className="cricket-row">
          <div className="cricket-head">RUNS</div>
          <div className="cricket-head"></div>
          <div className="cricket-head">WKTS</div>
        </div>
        {Array.from({ length: 10 }, (_, i) => (
          <div className="cricket-row" key={i}>
            <div className={`cricket-cell ${state.runs[batter] >= 10 - i ? 'closed' : ''}`}>
              {state.runs[batter] >= 10 - i ? '/' : ''}
            </div>
            <div className="cricket-cell num" style={{ cursor: 'default' }}>{10 - i}</div>
            <div className={`cricket-cell ${state.wickets >= 10 - i ? 'closed' : ''}`}>
              {state.wickets >= 10 - i ? '✗' : ''}
            </div>
          </div>
        ))}
        <div className="cricket-row" style={{ marginTop: 8 }}>
          <div className="cricket-cell num" style={{ gridColumn: '1 / -1', fontSize: 24, cursor: 'default' }}>
            {state.players[0].name} {state.runs[0]}
            {chasing ? '' : ' (batting)'} · {state.players[1].name} {state.runs[1]}
            {chasing ? ' (batting)' : ''}
            {chasing && state.innings === 2 && !state.finished
              ? ` — needs ${state.firstInningsRuns + 1 - state.runs[1]} more`
              : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
