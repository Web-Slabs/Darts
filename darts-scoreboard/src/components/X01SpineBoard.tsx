// X01 input spine — the PUMA chalk layout the user asked for: numbers 20→1 in
// one column, then a D column, then a T column, plus BULL (25) and CHERRY
// (double bull, 50) and MISS. A S/D/T mode chip set is NOT needed: each number
// has three buttons of its own (single, D, T), so scoring is one tap.
//
// Layout per row:  [S n] [D n] [T n]   … then BULL / CHERRY / MISS rows.
// The current player's tap feeds the X01 engine directly (score is applied on
// the chalkboard above, never on the pad).

import { useState } from 'react'
import type { Throw } from '../engine/board'
import { mk } from '../engine/board'

type Props = {
  onThrow: (t: Throw) => void
  disabled?: boolean
}

const NUMBERS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]

export default function X01SpineBoard({ onThrow, disabled }: Props) {
  const [last, setLast] = useState<string | null>(null)

  const tap = (key: string, t: Throw) => {
    if (disabled) return
    setLast(key)
    onThrow(t)
    setTimeout(() => setLast((k) => (k === key ? null : k)), 350)
  }

  return (
    <div className="x1-spine" aria-label="X01 scoring spine">
      <div className="x1-spinehead">
        <span>S</span>
        <span>D</span>
        <span>T</span>
      </div>
      <div className="x1-spinegrid">
        {NUMBERS.map((n) => (
          <div className="x1-srow" key={n}>
            <button className={`x1-btn s${last === `s${n}` ? ' hit' : ''}`} disabled={disabled} onClick={() => tap(`s${n}`, mk(n, 1))}>
              {n}
            </button>
            <button className={`x1-btn d${last === `d${n}` ? ' hit' : ''}`} disabled={disabled} onClick={() => tap(`d${n}`, mk(n, 2))} title={`Double ${n} = ${n * 2}`}>
              D
            </button>
            <button className={`x1-btn t${last === `t${n}` ? ' hit' : ''}`} disabled={disabled} onClick={() => tap(`t${n}`, mk(n, 3))} title={`Treble ${n} = ${n * 3}`}>
              T
            </button>
          </div>
        ))}
        <div className="x1-srow special">
          <button className={`x1-btn bull${last === 'bull' ? ' hit' : ''}`} disabled={disabled} onClick={() => tap('bull', mk(25, 25))} title="Bull = 25">
            BULL
          </button>
          <button className={`x1-btn cherry${last === 'cherry' ? ' hit' : ''}`} disabled={disabled} onClick={() => tap('cherry', mk(25, 50))} title="Cherry (double bull) = 50">
            CHERRY
          </button>
          <button className={`x1-btn miss${last === 'miss' ? ' hit' : ''}`} disabled={disabled} onClick={() => tap('miss', mk(0, 0))}>
            MISS
          </button>
        </div>
      </div>
    </div>
  )
}
