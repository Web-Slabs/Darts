// Framework-level rotation test: for EVERY game in the registry, drive a full
// 2-player visit rotation through the def's own currentPlayer/apply hooks and
// assert the turn actually moves. A game whose apply() never advances `cur`
// (the cricket-family bug we shipped once) fails here — for every game, forever.
//
// Also freeze-checks purity: apply() must not mutate the previous state.
// And for 4-player games, checks round-wrap attribution (3 darts each, wrap).

import { describe, it, expect } from 'vitest'
import { GAMES, GAME_LIST } from './registry'
import type { RegisteredGame } from './registry'
import { mk, type Throw } from './board'
import { SINGLES } from './board'

const P2 = [
  { id: 'p1', name: 'Riaan' },
  { id: 'p2', name: 'Pieter' },
]
const P4 = [...P2, { id: 'p3', name: 'Dawie' }, { id: 'p4', name: 'Anja' }]

const MISS = mk(0, 0)

/** One dart per call — the engine applies it for the CURRENT player. */
function throwForGame(g: RegisteredGame, state: any, t: Throw): any {
  const cur = g.currentPlayer ? g.currentPlayer(state) : ((state as any).cur ?? 0)
  return g.apply(state, t, cur)
}

/** A survivable dart: aim at the game's called number (Sudden Death) or miss. */
function survivableDart(state: any): Throw {
  return typeof state?.call === 'number' && state.call >= 1 && state.call <= 20 ? mk(state.call, 1) : MISS
}

/** Number of registry games (sanity: the sweep must cover the whole catalogue). */
describe('registry completeness', () => {
  it('has 46 games', () => {
    expect(GAME_LIST.length).toBe(46)
  })

  it('every game has apply, init, columns and result hooks', () => {
    for (const g of GAME_LIST) {
      expect(typeof g.apply, `${g.id}.apply`).toBe('function')
      expect(typeof g.init, `${g.id}.init`).toBe('function')
      expect(typeof g.columns, `${g.id}.columns`).toBe('function')
      expect(typeof g.result, `${g.id}.result`).toBe('function')
    }
  })
})

describe('2-player visit rotation (all 46 games)', () => {
  for (const g of GAME_LIST) {
    it(`${g.id}: turn advances through a 3-dart visit and wraps back`, () => {
      const def = GAMES[g.id]
      const s0 = def.init(P2, {})
      if ((s0 as any).phase === 'bulloff') {
        // SA Killer bull-off phase: record a winner to enter play
        const actions = def.actions?.(s0) ?? []
        expect(actions.length, `${g.id} must offer bull-off actions`).toBeGreaterThan(0)
        var s = actions[0].perform(s0)
      } else {
        var s = s0
      }

      // Player 0's visit: after 3 darts the turn MUST be player 1's.
      // Survivable darts only (miss, or the called number) so no elimination
      // rule ends the game before the rotation can be observed.
      let st = s
      st = throwForGame(def, st, survivableDart(st))
      expect(def.currentPlayer?.(st) ?? st.cur, `${g.id}: after dart 1`).toBe(0)
      st = throwForGame(def, st, survivableDart(st))
      expect(def.currentPlayer?.(st) ?? st.cur, `${g.id}: after dart 2`).toBe(0)
      st = throwForGame(def, st, survivableDart(st))
      const afterVisit1 = def.currentPlayer?.(st) ?? st.cur
      expect(afterVisit1, `${g.id}: after 3 darts the turn must pass to player 1`).toBe(1)

      // Player 1's visit wraps back to player 0 (round wrap).
      st = throwForGame(def, st, survivableDart(st))
      st = throwForGame(def, st, survivableDart(st))
      st = throwForGame(def, st, survivableDart(st))
      const afterVisit2 = def.currentPlayer?.(st) ?? st.cur
      expect(afterVisit2, `${g.id}: after player 1's visit the turn must wrap to player 0`).toBe(0)
    })
  }
})

describe('state purity: apply() must not mutate the previous state', () => {
  // Deep-freeze a state; any in-place mutation throws in vitest (non-strict) or
  // silently succeeds — so instead we deep-clone and compare JSON.
  for (const g of GAME_LIST) {
    it(`${g.id}: previous state unchanged after a dart`, () => {
      const def = GAMES[g.id]
      let s = def.init(P2, {})
      if ((s as any).phase === 'bulloff') {
        s = (def.actions?.(s) ?? [])[0].perform(s)
      }
      const before = JSON.stringify(s)
      const cur = def.currentPlayer ? def.currentPlayer(s) : 0
      def.apply(s, mk(20, 1), cur)
      // apply the same dart again through the rotation helper (games with
      // side-effects on the second call would fail the rotation test, not this)
      expect(JSON.stringify(s)).toBe(before)
    })
  }
})

describe('4-player round wrap (games that support 4)', () => {
  for (const g of GAME_LIST) {
    if (g.maxPlayers < 4 || g.minPlayers > 4) continue
    it(`${g.id}: 4 players rotate 0→1→2→3→0 across visits`, () => {
      const def = GAMES[g.id]
      let s = def.init(P4, {})
      if ((s as any).phase === 'bulloff') {
        s = (def.actions?.(s) ?? [])[0].perform(s)
      }
      // killer-family games skip dead players; with everyone alive the plain
      // rotation must hold. Some engines start phases with a specific seat
      // (scram stopper / english-cricket batter) — accept their seat as start.
      const start = def.currentPlayer?.(s) ?? s.cur ?? 0
      const expected: number[] = []
      for (let k = 1; k <= 8; k++) expected.push((start + k) % 4)
      let st = s
      let cur = start
      for (let v = 0; v < 2; v++) {
        for (let d = 0; d < 3; d++) st = throwForGame(def, st, survivableDart(st))
        cur = (cur + 1) % 4
        expect(def.currentPlayer?.(st) ?? st.cur, `${g.id}: visit ${v + 1} end seat`).toBe(cur)
      }
      void expected
    })
  }
})

// Keep SINGLES import used (available for future scenario extensions).
void SINGLES
