// Cricket chalkboard: numbers 20→15 + Bull down the middle, one column per
// player. Marks drawn chalk-style: / for 1, X for 2, ⊗ (circled X) for closed.

import type { CricketState } from '../engine/games/cricket'
import { CRICKET_TARGETS, targetLabel } from '../engine/games/cricket'

export default function CricketBoard({ state }: { state: CricketState }) {
  const cap = (idx: number) => (CRICKET_TARGETS[idx] === 25 ? 2 : 3)
  const sym = (marks: number, max: number) => (marks === 0 ? '' : marks === 1 ? '/' : marks === 2 ? '✗' : max === 2 ? '◎' : '⊗')
  const cur = state.marks.length ? (state as any).cur ?? 0 : 0

  return (
    <div className="cricket-board">
      <div className="cricket-grid" style={{ ['--players' as any]: state.players.length }}>
        <div className="cricket-row">
          <div className="cricket-head"></div>
          {state.players.map((p, i) => (
            <div className="cricket-head" key={p.id} style={{ textDecoration: i === cur ? 'underline' : undefined }}>
              {p.name}
            </div>
          ))}
        </div>
        {CRICKET_TARGETS.map((t, ti) => (
          <div className="cricket-row" key={t}>
            <div className="cricket-cell num">{targetLabel(t)}</div>
            {state.players.map((p, i) => {
              const m = state.marks[i]?.[ti] ?? 0
              return (
                <div key={p.id} className={`cricket-cell ${m >= cap(ti) ? 'closed' : ''}`}>
                  {sym(m, cap(ti))}
                </div>
              )
            })}
          </div>
        ))}
        <div className="cricket-row" style={{ marginTop: 8 }}>
          <div className="cricket-cell num">Pts</div>
          {state.players.map((p, i) => (
            <div className="cricket-head" key={p.id} style={{ fontSize: 26 }}>
              {state.points[i]}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
