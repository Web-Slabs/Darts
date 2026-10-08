// Authentic SVG dartboard with click-to-throw hit detection.
// Standard proportions: double outer 170mm, treble 100mm, bull 12.7/31.8mm on a 451mm board.

import { useMemo, useState } from 'react'
import type { Throw } from '../engine/board'

type Props = {
  onThrow: (t: Throw) => void
  disabled?: boolean
  size?: number
}

const SEG_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

// radii (viewBox units, board radius 225)
const R_OUTER = 225
const R_DOUBLE_OUT = 170
const R_DOUBLE_IN = 162
const R_TREBLE_OUT = 107
const R_TREBLE_IN = 99
const R_BULL_OUT = 15.9
const R_BULL_IN = 6.35

const segAngle = (i: number) => (i * 18 - 99) * (Math.PI / 180) // segment i spans 18°, 20 at top

function ringPath(rIn: number, rOut: number, i: number): string {
  const a1 = segAngle(i) - Math.PI / 180 * 9
  const a2 = segAngle(i) + Math.PI / 180 * 9
  const x1 = Math.cos(a1), y1 = Math.sin(a1)
  const x2 = Math.cos(a2), y2 = Math.sin(a2)
  return [
    `M ${225 + rIn * x1} ${225 + rIn * y1}`,
    `L ${225 + rOut * x1} ${225 + rOut * y1}`,
    `A ${rOut} ${rOut} 0 0 1 ${225 + rOut * x2} ${225 + rOut * y2}`,
    `L ${225 + rIn * x2} ${225 + rIn * y2}`,
    `A ${rIn} ${rIn} 0 0 0 ${225 + rIn * x1} ${225 + rIn * y1}`,
    'Z',
  ].join(' ')
}

export default function Dartboard({ onThrow, disabled, size = 420 }: Props) {
  const [hover, setHover] = useState<string | null>(null)

  const segs = useMemo(() => {
    const out: { d: string; fill: string; throw: Throw; key: string }[] = []
    for (let i = 0; i < 20; i++) {
      const n = SEG_ORDER[i]
      const dark = i % 2 === 0
      // Medalist palette (user's photo): natural tan sisal, red/green rings,
      // near-black playing sectors.
      out.push({ d: ringPath(R_TREBLE_IN, R_TREBLE_OUT, i), fill: dark ? '#c8281e' : '#1d9e4b', throw: { n, m: 3 }, key: `t${n}` })
      out.push({ d: ringPath(R_DOUBLE_IN, R_DOUBLE_OUT, i), fill: dark ? '#c8281e' : '#1d9e4b', throw: { n, m: 2 }, key: `d${n}` })
      out.push({ d: ringPath(R_TREBLE_OUT, R_DOUBLE_IN, i), fill: dark ? '#171310' : '#d9b98a', throw: { n, m: 1 }, key: `s${n}` })
      out.push({ d: ringPath(R_DOUBLE_OUT, R_DOUBLE_OUT + 26, i), fill: dark ? '#171310' : '#d9b98a', throw: { n, m: 2 }, key: `do${n}` })
    }
    return out
  }, [])

  const click = (t: Throw) => {
    if (!disabled) onThrow(t)
  }

  return (
    <svg viewBox="0 0 450 450" width={size} height={size} style={{ display: 'block', touchAction: 'manipulation' }}>
      {/* outer black surround */}
      <circle cx="225" cy="225" r={R_OUTER} fill="#111" />
      {/* number ring text */}
      {SEG_ORDER.map((n, i) => {
        const a = segAngle(i)
        const r = 205
        return (
          <text
            key={`lab${n}`}
            x={225 + r * Math.cos(a)}
            y={225 + r * Math.sin(a)}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ddd"
            fontSize="16"
            fontWeight="700"
          >
            {n}
          </text>
        )
      })}
      {segs.map((s) => (
        <path
          key={s.key}
          d={s.d}
          fill={s.fill}
          stroke="#c9c9c9"
          strokeWidth="0.6"
          className="dart-seg"
          style={{ cursor: disabled ? 'default' : 'pointer', opacity: hover === s.key ? 0.75 : 1 }}
          onClick={() => click(s.throw as Throw)}
          onMouseEnter={() => setHover(s.key)}
          onMouseLeave={() => setHover(null)}
        />
      ))}
      {/* outer bull */}
      <circle
        cx="225" cy="225" r={R_BULL_OUT} fill="#1d9e4b" stroke="#c9c9c9" strokeWidth="0.8"
        style={{ cursor: disabled ? 'default' : 'pointer' }}
        onClick={() => click({ n: 25, m: 25 })}
      />
      {/* inner bull */}
      <circle
        cx="225" cy="225" r={R_BULL_IN} fill="#d82020" stroke="#c9c9c9" strokeWidth="0.8"
        style={{ cursor: disabled ? 'default' : 'pointer' }}
        onClick={() => click({ n: 25, m: 50 })}
      />
    </svg>
  )
}
