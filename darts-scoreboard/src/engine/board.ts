// Dartboard geometry/data shared by every game.

export const SINGLES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const

/** Clockwise segment order from the top (20) — used for "around the board" games. */
export const SEGMENTS: readonly number[] = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

export type Throw = {
  /** Base number hit: 1-20, 25 for the bull, 0 for a miss */
  n: number
  /** 1 single, 2 double, 3 treble; for the bull: 25 outer, 50 inner */
  m: number
}

export const mk = (n: number, m: number): Throw => ({ n, m })
export const S1 = mk(1, 1)
export const miss = mk(0, 0)
export const innerBull = mk(25, 50)
export const outerBull = mk(25, 25)

export const isBull = (t: Throw) => t.n === 25
export const isDouble = (t: Throw) => t.n <= 20 && t.m === 2
export const isTreble = (t: Throw) => t.n <= 20 && t.m === 3
export const value = (t: Throw) => (t.n === 0 ? 0 : t.n === 25 ? t.m : t.n * t.m)

/** Human label, e.g. T20, D16, 5, BULL, 25 */
export function label(t: Throw): string {
  if (t.n === 0) return 'MISS'
  if (t.n === 25) return t.m === 50 ? 'BULL' : '25'
  return `${t.m === 2 ? 'D' : t.m === 3 ? 'T' : ''}${t.n}`
}

export const throwsForNumber = (n: number): Throw[] =>
  n === 25 ? [outerBull, innerBull] : [mk(n, 1), mk(n, 2), mk(n, 3)]

/** All 62 valid segments (singles 1-20 + 25, doubles, trebles, inner bull). */
export const ALL_THROWABLES: Throw[] = [
  ...SINGLES.map((n) => mk(n, 1)),
  outerBull,
  ...SINGLES.map((n) => mk(n, 2)),
  ...SINGLES.map((n) => mk(n, 3)),
  innerBull,
]
