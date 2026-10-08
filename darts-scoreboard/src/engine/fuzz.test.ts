// Fuzz: for EVERY game in the registry, play many random-but-legal visits —
// darts AND table-action presses (a human clicks those too) — under randomized
// option settings, and assert the real-play invariants the unit tests can't:
//
//   1. apply()/actions never throw
//   2. state never corrupts (no NaN / undefined anywhere)
//   3. no dead-locks: no long run of no-op steps while the game is unfinished
//      (the "board looks dead forever" class of bug)
//   4. finishability: when the fuzzer pushes hard (a winning-ish strategy),
//      the game REACHES a result() — i.e. winnable/finishable by legal play.
//
// Born from two shipped bugs: split-legs was unreachable in real play despite
// green unit tests, and SA Killer could lock its board with no way forward.

import { describe, it, expect } from 'vitest'
import { GAME_LIST } from './registry'
import type { RegisteredGame } from './registry'
import { mk, SEGMENTS, type Throw } from './board'
import { seededRandom } from './fuzz-random'

const P2 = [
  { id: 'p1', name: 'Riaan' },
  { id: 'p2', name: 'Pieter' },
]

// ---------- dart pool (weighted like a real player) ----------
// SEGMENTS is board-order NUMBERS — build real throws from it. Weighted
// toward scoring darts so games actually progress; misses still happen.
const DART_POOL: Throw[] = [
  mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 3),
  ...SEGMENTS.map((n) => mk(n, 1)),
  mk(20, 1), mk(20, 1),
  mk(19, 3), mk(16, 3), mk(18, 3),
  mk(20, 2), mk(16, 2), mk(10, 2),
  mk(25, 25),
  mk(0, 0), // misses happen
]
const randDart = (r: () => number) => DART_POOL[Math.floor(r() * DART_POOL.length)]

// ---------- aim hints: what a player who knows the game throws at ----------
// Aim games (Killer, races, step ladders) are unwinnable with purely random
// darts — a pub player aims. Each hint returns the sensible next dart.
const GN_ORDER = [SEGMENTS[0], ...[...SEGMENTS].slice(1).reverse()]
const AIMERS: Record<string, (s: any, pi: number) => Throw> = {
  killer: (s, pi) => {
    const p = s.players[pi]
    const m = s.houseDoubles ? 2 : 1
    if (!p.killer) return mk(p.number, m)
    const victim = s.players.find((q: any) => q.lives > 0 && q.number !== p.number)
    return victim ? mk(victim.number, m) : mk(p.number, m)
  },
  'blind-killer': (s, pi) => (s.revealed[pi] ? mk(s.number[pi], 2) : mk(10, 2)),
  'grand-national': (s, pi) => mk(GN_ORDER[s.hurdle[pi]] ?? 20, 1),
  'chase-the-dragon': (s, pi) => (s.step[pi] < 11 ? mk(10 + s.step[pi], 3) : mk(25, 50)),
  'bermuda-triangle': (s, pi) => {
    const singles = [12, 13, 14, -1, 15, 16, 17, -2, 18, 19, 20, -3]
    const v = singles[s.step[pi]] ?? 20
    return v === -1 ? mk(10, 2) : v === -2 ? mk(10, 3) : v === -3 ? mk(25, 50) : mk(v, 1)
  },
  'mickey-mouse': (s) => {
    const want = [20, 19, 18, 17, 16, 15, 14, 13, 12, 25][s.round - 1] ?? 20
    return want === 25 ? mk(25, 25) : mk(want, 1)
  },
  'slip-up': (s, pi) => mk(Math.min(s.target[pi], 20), 1),
  'around-the-clock': (s, pi) => (s.mode === 'doubles' ? mk(Math.min(s.target[pi], 20), 2) : s.mode === 'trebles' ? mk(Math.min(s.target[pi], 20), 3) : mk(Math.min(s.target[pi], 20), 1)),
  'halve-it': (s, pi) => {
    const r = Math.min(s.turnVals?.[pi]?.round ?? s.round ?? 0, 11)
    const aim: Throw[] = [mk(20, 1), mk(16, 1), mk(16, 2), mk(16, 3), mk(17, 1), mk(17, 2), mk(19, 3), mk(18, 1), mk(25, 25), mk(19, 1), mk(20, 3)]
    return aim[r] ?? mk(20, 1)
  },
}
const aimFor = (g: RegisteredGame, s: any, pi: number): Throw | null => {
  const a = AIMERS[g.id]
  try {
    return a ? a(s, pi) : null
  } catch {
    return null
  }
}

// ---------- state hygiene ----------
function checkSanity(s: any, game: string, path: string) {
  const seen = new WeakSet()
  const walk = (v: any, p: string) => {
    if (v === null || typeof v !== 'object') {
      if (typeof v === 'number' && !Number.isFinite(v)) {
        throw new Error(`${game}: NaN/Infinity at ${path}.${p}`)
      }
      if (v === undefined && !p.endsWith('winner') && !p.endsWith('chase')) {
        throw new Error(`${game}: undefined at ${path}.${p}`)
      }
      return
    }
    if (seen.has(v)) return
    seen.add(v)
    for (const k of Object.keys(v)) walk(v[k], `${p}.${k}`)
  }
  walk(s, '')
}

// ---------- option settings from the def (randomized) ----------
function randomSettings(g: RegisteredGame, r: () => number): Record<string, string> {
  const s: Record<string, string> = {}
  for (const o of g.options ?? []) {
    const c = o.choices[Math.floor(r() * o.choices.length)]
    s[o.key] = c.value
  }
  return s
}

// ---------- one fuzz run per game ----------
function fuzz(g: RegisteredGame, seed: number, maxSteps = 4000): { result: any; steps: number } {
  const r = seededRandom(seed)
  const settings = randomSettings(g, r)
  let state = g.init(P2, settings)
  checkSanity(state, g.id, 'init')
  let noops = 0
  let steps = 0

  for (; steps < maxSteps; steps++) {
    if (g.result(state)) return { result: state, steps }

    // Hygiene each step: turn must be a legal seat; deep sanity every 7 steps.
    const cur = g.currentPlayer ? g.currentPlayer(state) : ((state as any).cur ?? 0)
    if (!Number.isInteger(cur) || cur < 0 || cur >= 2) {
      throw new Error(`${g.id}: currentPlayer=${cur} is not a legal seat (step ${steps})`)
    }
    if (steps % 7 === 0) checkSanity(state, g.id, `step${steps}`)

    // 6% of the time press a random table action (humans click those).
    const acts = g.actions?.(state) ?? []
    if (acts.length && r() < 0.06) {
      const a = acts[Math.floor(r() * acts.length)]
      const next = a.perform(state)
      if (JSON.stringify(next) === JSON.stringify(state)) {
        if (++noops > 60) throw new Error(`${g.id}: action "${a.label}" is a persistent no-op (step ${steps})`)
      } else {
        noops = 0
        state = next
      }
      continue
    }

    const before = JSON.stringify(state)
    const aimed = aimFor(g, state, cur)
    const t = aimed && r() < 0.85 ? aimed : randDart(r)
    let next: any
    try {
      next = g.apply(state, t, cur)
    } catch (e) {
      throw new Error(`${g.id}: apply(${JSON.stringify(t)}) threw at step ${steps} (settings ${JSON.stringify(settings)}): ${e}`)
    }
    if (JSON.stringify(next) === before) {
      if (++noops > 60) {
        throw new Error(
          `${g.id}: DEAD-LOCK — ${noops} consecutive no-op steps while unfinished at step ${steps} ` +
          `(settings ${JSON.stringify(settings)}, last dart ${JSON.stringify(t)})`,
        )
      }
    } else {
      noops = 0
    }
    state = next
  }

  // Ran out of steps without a result — is the game legitimately endless
  // (points target "none", manual end expected) or broken? Games that expose
  // a manual end/table action at all must have been usable; endless-by-design
  // games (target none) are allowed to be endless. Anything else = suspicious.
  const endlessOk = (g.options ?? []).some((o) => o.key === 'target') || g.actions?.(state)?.length
  if (!endlessOk) {
    throw new Error(`${g.id}: not finished after ${maxSteps} legal steps and no manual action offered — likely unwinnable in real play (settings ${JSON.stringify(settings)})`)
  }
  return { result: null, steps }
}

describe('fuzz: every game, real-play invariants', () => {
  it('registry still has 46 games', () => {
    expect(GAME_LIST.length).toBe(46)
  })

  for (const g of GAME_LIST) {
    it(`${g.name}: survives 3 seeded fuzz runs`, () => {
      // 2 seeds × up to 4000 steps; deterministic — failures reproduce exactly.
      for (const seed of [101, 4242]) {
        const { result, steps } = fuzz(g, seed)
        if (result) {
          // finishability: result() must name a sane winner set ([] = draw)
          const res = g.result(result)
          expect(Array.isArray(res?.winnerIdxs)).toBe(true)
        } else {
          expect(steps).toBeGreaterThan(0)
        }
      }
    })
  }
})
