// Real-photo dartboard: the user's Medalist board photo, with invisible
// click zones mapped over it — every segment (single/double/treble of 1-20,
// outer bull, cherry) is a hit target. 20 is top centre in the photo, matching
// the standard clock layout used by every game.
//
// Geometry (measured from the photo): board centre (339.5, 341) in a 679×682
// image; playing disc radius ≈ 234.5 px. Standard rings scaled to that radius:
//   double outer 170/225.5 · double inner 162/225.5 · treble outer 107/225.5 ·
//   treble inner 99/225.5 · outer bull 15.9/225.5 · cherry 6.35/225.5.
//
// Misses: clicks outside the double ring but inside the photo's black surround
// score MISS (thrown into the surround), same as a real off-dart.

import { useMemo, useState } from 'react'
import type { Throw } from '../engine/board'
import { mk } from '../engine/board'

type Props = {
  onThrow: (t: Throw) => void
  disabled?: boolean
  size?: number
}

const SEG_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

// photo geometry
const IMG_W = 679
const IMG_H = 682
const CX = 339.5
const CY = 341
const R_BOARD = 234.5 // sisal disc radius

// ring radii scaled from standard 225.5-unit proportions
const R_DOUBLE_OUT = (170 / 225.5) * R_BOARD
const R_DOUBLE_IN = (162 / 225.5) * R_BOARD
const R_TREBLE_OUT = (107 / 225.5) * R_BOARD
const R_TREBLE_IN = (99 / 225.5) * R_BOARD
const R_BULL_OUT = (15.9 / 225.5) * R_BOARD
const R_BULL_IN = (6.35 / 225.5) * R_BOARD

const segAngle = (i: number) => ((i * 18 - 99) * Math.PI) / 180 // segment i spans 18°, 20 at top

function ringPath(rIn: number, rOut: number, i: number): string {
  const a1 = segAngle(i) - (Math.PI / 180) * 9
  const a2 = segAngle(i) + (Math.PI / 180) * 9
  const x1 = Math.cos(a1)
  const y1 = Math.sin(a1)
  const x2 = Math.cos(a2)
  const y2 = Math.sin(a2)
  return [
    `M ${CX + rIn * x1} ${CY + rIn * y1}`,
    `L ${CX + rOut * x1} ${CY + rOut * y1}`,
    `A ${rOut} ${rOut} 0 0 1 ${CX + rOut * x2} ${CY + rOut * y2}`,
    `L ${CX + rIn * x2} ${CY + rIn * y2}`,
    `A ${rIn} ${rIn} 0 0 0 ${CX + rIn * x1} ${CY + rIn * y1}`,
    'Z',
  ].join(' ')
}

export default function PhotoDartboard({ onThrow, disabled, size = 440 }: Props) {
  const [hover, setHover] = useState<string | null>(null)

  const zones = useMemo(() => {
    const out: { d: string; throw: Throw; key: string; title: string }[] = []
    for (let i = 0; i < 20; i++) {
      const n = SEG_ORDER[i]
      out.push({ d: ringPath(R_TREBLE_IN, R_TREBLE_OUT, i), throw: mk(n, 3), key: `t${n}`, title: `Treble ${n}` })
      out.push({ d: ringPath(R_DOUBLE_IN, R_DOUBLE_OUT, i), throw: mk(n, 2), key: `d${n}`, title: `Double ${n}` })
      out.push({ d: ringPath(R_TREBLE_OUT, R_DOUBLE_IN, i), throw: mk(n, 1), key: `s${n}`, title: `Single ${n}` })
    }
    return out
  }, [])

  const click = (t: Throw) => {
    if (!disabled) onThrow(t)
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'block' }}>
      <img
        src="/dartboard.jpg"
        alt="Dartboard"
        width={size}
        height={size}
        style={{ display: 'block', borderRadius: '50%', userSelect: 'none', pointerEvents: 'none' }}
        draggable={false}
      />
      <svg
        viewBox={`0 0 ${IMG_W} ${IMG_H}`}
        width={size}
        height={size}
        style={{ position: 'absolute', inset: 0, touchAction: 'manipulation' }}
      >
        {/* miss zone: the black surround outside the double ring */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BOARD}
          fill="transparent"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onClick={() => click(mk(0, 0))}
          onMouseEnter={() => setHover('miss')}
          onMouseLeave={() => setHover(null)}
        />
        {zones.map((z) => (
          <path
            key={z.key}
            d={z.d}
            fill="transparent"
            stroke={hover === z.key ? 'rgba(245,194,107,0.9)' : 'transparent'}
            strokeWidth="1.5"
            style={{ cursor: disabled ? 'default' : 'pointer' }}
            onClick={() => click(z.throw as Throw)}
            onMouseEnter={() => setHover(z.key)}
            onMouseLeave={() => setHover(null)}
          >
            <title>{z.title}</title>
          </path>
        ))}
        {/* outer bull (25) */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BULL_OUT}
          fill="transparent"
          stroke={hover === 'bull' ? 'rgba(245,194,107,0.9)' : 'transparent'}
          strokeWidth="1.5"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onClick={() => click(mk(25, 25))}
          onMouseEnter={() => setHover('bull')}
          onMouseLeave={() => setHover(null)}
        >
          <title>Bull (25)</title>
        </circle>
        {/* cherry (50) */}
        <circle
          cx={CX}
          cy={CY}
          r={R_BULL_IN}
          fill="transparent"
          stroke={hover === 'cherry' ? 'rgba(245,194,107,0.9)' : 'transparent'}
          strokeWidth="1.5"
          style={{ cursor: disabled ? 'default' : 'pointer' }}
          onClick={() => click(mk(25, 50))}
          onMouseEnter={() => setHover('cherry')}
          onMouseLeave={() => setHover(null)}
        >
          <title>Cherry (50)</title>
        </circle>
      </svg>
    </div>
  )
}
