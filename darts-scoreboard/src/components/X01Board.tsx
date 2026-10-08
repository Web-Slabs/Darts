// Chalkboard X01: the way real pubs score it. Names across the top, big
// remaining number, each visit chalked under the previous one (T20 T20 T20 /
// 180), legs + darts + average in the footer. Current player's column glows.

import type { X01State } from '../engine/games/x01'
import { label } from '../engine/board'

export default function X01Board({ state }: { state: X01State }) {
  const maxVisits = Math.max(4, ...state.visits.map((v) => v.length))
  return (
    <div className="chalkboard">
      <div className="chalk-grid" style={{ gridTemplateColumns: `repeat(${state.players.length}, 1fr)` }}>
        {state.players.map((p, i) => (
          <div className={`chalk-col ${i === state.cur && !state.legOver ? 'current' : ''}`} key={p.id}>
            <div className="chalk-name">{p.name}</div>
            <div className="chalk-score">{state.scores[i]}</div>
            <div className="chalk-visits">
              {Array.from({ length: maxVisits }, (_, v) => (
                <div className="chalk-visit" key={v}>
                  {state.visits[i][v] ? (
                    <>
                      <span className="chalk-darts">
                        {state.visits[i][v].darts.map((d, k) => (
                          <span key={k} className={state.visits[i][v].bust ? 'bust' : ''}>{label(d)}</span>
                        ))}
                      </span>
                      <span className={`chalk-total ${state.visits[i][v].bust ? 'bust' : ''}`}>
                        {state.visits[i][v].bust ? 'BUST' : state.visits[i][v].scored}
                      </span>
                    </>
                  ) : (
                    <span className="chalk-empty">&nbsp;</span>
                  )}
                </div>
              ))}
            </div>
            <div className="chalk-foot">
              <span>legs {state.legs[i]}</span>
              <span>{state.dartsThrown[i]} darts</span>
              <span>
                {state.dartsThrown[i] > 0 ? ((state.pointsScored[i] / state.dartsThrown[i]) * 3).toFixed(1) : '—'} avg
              </span>
            </div>
          </div>
        ))}
      </div>
      {state.legOver && !state.matchOver && (
        <div className="chalk-legbanner">Leg to {state.players[state.lastWinner]?.name} — next leg starting…</div>
      )}
    </div>
  )
}
