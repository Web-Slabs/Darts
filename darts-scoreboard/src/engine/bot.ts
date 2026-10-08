// Dartbot — a practice opponent with adjustable skill.
// Strategy mimics real play: score T20 until in checkout range, then follow the
// suggested route; scatter radius grows with difficulty distance (1-9).

import { mk, type Throw, value } from './board'
import { suggestCheckout, type OutMode, type X01State } from './games/x01'

export type BotSkill = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export const BOT_PROFILES: Record<BotSkill, { name: string; blurb: string; avg: string }> = {
  1: { name: 'Rookie Rob', blurb: 'Learning the board', avg: '~25' },
  2: { name: 'Pub Pat', blurb: 'Casual league night', avg: '~35' },
  3: { name: 'Steady Eddie', blurb: 'Solid club player', avg: '~45' },
  4: { name: 'County Craig', blurb: 'County standard', avg: '~55' },
  5: { name: 'Sharp Shane', blurb: 'Consistent trebles', avg: '~65' },
  6: { name: 'Premier Piers', blurb: 'High scoring', avg: '~75' },
  7: { name: 'Pro Pete', blurb: 'Tour card holder', avg: '~85' },
  8: { name: 'Worldie Walter', blurb: 'Televised averages', avg: '~95' },
  9: { name: 'Perfect Pat', blurb: 'Nine-darter danger', avg: '~105' },
}

/** Radius (in segment units) the bot scatters around its aim, by skill. */
const scatterRadius = (skill: BotSkill): number => 5.5 - skill * 0.5 // skill 1 → 5.0, skill 9 → 1.0

// Board layout: clockwise segment order from 20.
const SEG_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

const nearestSegments = (n: number, count: number): number[] => {
  const i = SEG_ORDER.indexOf(n)
  const out: number[] = []
  for (let d = 0; d <= count; d++) {
    out.push(SEG_ORDER[(i + d) % 20])
    if (d > 0) out.push(SEG_ORDER[(i - d + 20) % 20])
  }
  return out
}

/** What the bot aims at given the current state. Returns the intended throw. */
export function botAim(s: X01State, playerIdx: number, _skill: BotSkill): Throw {
  const rem = s.scores[playerIdx]
  const outMode: OutMode = s.outMode

  // In checkout range: follow the suggested route.
  const route = suggestCheckout(rem, outMode)
  if (route) {
    const first = route.split(' ')[0]
    if (first === 'BULL') return mk(25, 50)
    if (first === '25') return mk(25, 25)
    const m = first.startsWith('T') ? 3 : first.startsWith('D') ? 2 : 1
    return mk(parseInt(first.replace(/[TD]/, ''), 10), m)
  }

  // SA split-legs: from 1, the single 11 splits legs and wins the leg.
  if (rem === 1 && s.splitLegs) return mk(11, 1)

  // No finish: set up. Simple heuristic — big scoring unless we need odd/even.
  if (rem > 170) return mk(20, 3)
  if (rem > 100) return mk(20, 3)
  // Below 170 without a route: aim to leave a workable number.
  if (rem <= 70) {
    // try to leave 32/40/36 etc.
    for (const leave of [32, 40, 36, 34, 38]) {
      const need = rem - leave
      if (need >= 0 && need <= 60) {
        const m = need % 3 === 0 ? 3 : need % 2 === 0 ? 2 : 1
        const n = m === 3 ? need / 3 : m === 2 ? need / 2 : need
        if (n >= 1 && n <= 20 && Number.isInteger(n)) return mk(n, m)
      }
    }
  }
  return mk(20, 3)
}

/** Simulate the bot's actual dart given intent + skill. Pure randomness via rng param for testability. */
export function botThrow(aim: Throw, skill: BotSkill, rng: () => number = Math.random): Throw {
  const r = scatterRadius(skill)
  const roll = () => (rng() * 2 - 1) * r // -r..r

  // Offsets in "segment units": number offset (neighbours) and multipler offset.
  const numOff = Math.round(roll())
  const multOff = Math.round(roll() * 0.7)

  let n = aim.n
  let m = aim.m

  if (n === 25) {
    // bull aiming: scatter to bull/miss/odd singles
    if (numOff > r * 0.6) {
      const seg = SEG_ORDER[Math.floor(rng() * 20)]
      n = seg
      m = 1
    } else {
      m = m === 50 && numOff > 0 ? 25 : m // drop from inner to outer bull
    }
    return mk(n, m)
  }

  if (numOff !== 0) {
    const neighbours = nearestSegments(aim.n, 2)
    const idx = Math.min(Math.max(numOff, -2), 2)
    n = neighbours[Math.abs(idx)] ?? aim.n
  }
  m = Math.min(3, Math.max(1, m + (multOff > 0 ? 1 : multOff < 0 ? -1 : 0)))
  if (n === 25) n = 20
  return mk(n, m)
}

/** Average points of a simulated throw — used in tests to sanity-check skill curve. */
export function botExpectedValue(aim: Throw, skill: BotSkill, samples = 4000): number {
  let sum = 0
  for (let i = 0; i < samples; i++) sum += value(botThrow(aim, skill))
  return sum / samples
}
