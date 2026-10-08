// Fine-tooth-comb audit tests: one scenario per repaired engine rule.
// Each test pins the exact behaviour that was broken before the audit.

import { describe, it, expect } from 'vitest'
import { GAMES } from './registry'
import { mk } from './board'
import {
  initSuddenDeath, applySuddenDeath,
  initGrandNational, applyGrandNational,
  initBlindKiller, applyBlindKiller,
} from './games/extra2'
import {
  initHoNo, applyHoNo,
  initQuickfire, applyQuickfire,
  initBowls, applyBowls,
  initScam, applyScam,
} from './games/extra3'
import {
  initNineLives, applyNineLives,
} from './games/more'
import {
  initFollowMe, applyFollowMe,
  initBobs27, applyBobs27,
} from './games/extra'
import type { PlayerConfig } from './core'

const P2: PlayerConfig[] = [
  { id: 'p1', name: 'Riaan' },
  { id: 'p2', name: 'Pieter' },
]

describe('Sudden Death — answer the call or die (was: nobody could ever be eliminated)', () => {
  it('a player who misses the call for a whole visit is OUT; a survivor wins', () => {
    let s = initSuddenDeath(P2)
    s = { ...s, call: 5 }
    // P0 answers the call on dart 1, then misses twice — survives the visit
    s = applySuddenDeath(s, mk(5, 1), 0)
    s = applySuddenDeath(s, mk(0, 0), 0)
    s = applySuddenDeath(s, mk(0, 0), 0)
    expect(s.alive[0]).toBe(true)
    // P1 misses the call all visit — eliminated
    s = applySuddenDeath(s, mk(0, 0), 1)
    s = applySuddenDeath(s, mk(0, 0), 1)
    s = applySuddenDeath(s, mk(0, 0), 1)
    expect(s.alive[1]).toBe(false)
    expect(s.finished).toBe(true)
    const r = GAMES['sudden-death'].result(s)!
    expect(r.winnerIdxs).toEqual([0])
  })
})

describe('Grand National — you can fall at ANY hurdle (was: only the first)', () => {
  it('a fruitless visit at a later hurdle still eliminates', () => {
    let s = initGrandNational(P2)
    // P1 clears hurdle 1 (segment 20) with one dart, then two misses
    s = applyGrandNational(s, mk(20, 1), 1)
    s = applyGrandNational(s, mk(0, 0), 1)
    s = applyGrandNational(s, mk(0, 0), 1)
    expect(s.hurdle[1]).toBe(1)
    expect(s.out[1]).toBe(false)
    // next visit all misses → falls at hurdle 2
    s = applyGrandNational(s, mk(0, 0), 1)
    s = applyGrandNational(s, mk(0, 0), 1)
    s = applyGrandNational(s, mk(0, 0), 1)
    expect(s.out[1]).toBe(true)
    expect(s.log.some((l) => l.includes('falls at hurdle 2'))).toBe(true)
    // and P0 falling at the FIRST still works
    s = applyGrandNational(s, mk(0, 0), 0)
    s = applyGrandNational(s, mk(0, 0), 0)
    s = applyGrandNational(s, mk(0, 0), 0)
    expect(s.out[0]).toBe(true)
  })
})

describe('Blind Killer — shared numbers make hunting possible (was: unique deals, no kills)', () => {
  it('revealing then hitting your number\u2019s double takes a victim\u2019s life', () => {
    let s = initBlindKiller(P2)
    s = { ...s, number: [7, 7] } // forced shared deal
    // P0 reveals with three arbitrary doubles
    s = applyBlindKiller(s, mk(10, 2), 0)
    s = applyBlindKiller(s, mk(11, 2), 0)
    s = applyBlindKiller(s, mk(12, 2), 0)
    expect(s.revealed[0]).toBe(true)
    // D7 takes P1's life
    s = applyBlindKiller(s, mk(7, 2), 0)
    expect(s.lives[1]).toBe(2)
    // two more D7s end P1 — game over, P0 wins
    s = applyBlindKiller(s, mk(7, 2), 0)
    s = applyBlindKiller(s, mk(7, 2), 0)
    expect(s.finished).toBe(true)
    expect(GAMES['blind-killer'].result(s)!.winnerIdxs).toEqual([0])
  })
})

describe('Ho No! — an inner bull wipes the NEXT thrower (was: a void placeholder)', () => {
  it('50 from P0 zeroes P1', () => {
    let s = initHoNo(P2)
    s = applyHoNo(s, mk(20, 3), 0) // 60
    s = applyHoNo(s, mk(20, 3), 1) // 60
    s = applyHoNo(s, mk(25, 50), 0) // the dagger
    expect(s.scores[0]).toBe(110)
    expect(s.scores[1]).toBe(0)
    expect(s.log.some((l) => l.includes('wiped to zero'))).toBe(true)
  })
})

describe('Quickfire — per-player clocks (was: first finished clock ended the whole game)', () => {
  it('the game runs until every player\u2019s clock is done', () => {
    let s = initQuickfire(P2)
    // P0: five perfect visits of 3 odd hits (15 hits, clock 60−30=30 left)
    for (let i = 0; i < 15; i++) {
      s = applyQuickfire(s, mk(11, 1), 0)
      if (s.finished) break
      // interleave one P1 dart per P0 dart except on the last
      if (i < 14) s = applyQuickfire(s, mk(0, 0), 1)
    }
    // P1 clock: 60 − 7/dart; after 14 darts 60−98 → dead long before P0's 15th
    expect(s.done[1]).toBe(true)
    expect(s.finished).toBe(true)
    expect(s.hits[0]).toBeGreaterThanOrEqual(14)
    const r = GAMES['quickfire'].result(s)!
    expect(r.winnerIdxs).toEqual([0])
  })
})

describe('Bowls — an end completes after ALL players throw (was: after every visit)', () => {
  it('end is judged once per round with correct owners; nearest dart wins', () => {
    let s = initBowls(P2)
    // P0's visit sets the jack at S20 and drops two more at 20
    s = applyBowls(s, mk(20, 1), 0)
    s = applyBowls(s, mk(20, 1), 0)
    s = applyBowls(s, mk(20, 1), 0)
    // NOT end of the end yet — P1 still to throw
    expect(s.setDarts.length).toBe(3)
    expect(s.scores[0]).toBe(0)
    // P1 throws wide of the jack (19 ≠ 20 → +12 distance)
    s = applyBowls(s, mk(19, 1), 1)
    s = applyBowls(s, mk(19, 1), 1)
    s = applyBowls(s, mk(19, 1), 1)
    // now the end completes: P0's touching 20s beat P1's 19s
    expect(s.scores).toEqual([1, 0])
    expect(s.setDarts.length).toBe(0) // reset for the next end
    expect(s.setOwners.length).toBe(0)
  })
})

describe('Scam — stopper blocks WHILE the scorer farms, then roles swap (was: both stopped, then self-destruct)', () => {
  it('blocked numbers stop scoring; swap sets the chase; the chaser wins by passing it', () => {
    let s = initScam(P2)
    // stopper blocks 5, scorer farms elsewhere
    s = applyScam(s, mk(5, 1), 0)
    s = applyScam(s, mk(5, 3), 1) // blocked → no score
    s = applyScam(s, mk(20, 3), 1) // 60
    expect(s.scorerPts[1]).toBe(60)
    // force 19 numbers blocked, then the stopper closes the last one → swap
    const blocked = Array(21).fill(false)
    for (let n = 1; n <= 20; n++) blocked[n] = n !== 20
    s = { ...s, blocked, scorerPts: [0, 45] }
    s = applyScam(s, mk(20, 1), 0)
    expect(s.stopper).toBe(1)
    expect(s.chase).toBe(45)
    // P0 is now the scorer and passes the chase
    s = applyScam(s, mk(20, 3), 0)
    expect(s.finished).toBe(true)
    const r = GAMES['scam'].result(s)!
    expect(r.winnerIdxs).toEqual([0])
  })
  it('if the chaser runs out of board, the target-setter defends', () => {
    let s = initScam(P2)
    const blocked = Array(21).fill(false)
    for (let n = 1; n <= 20; n++) blocked[n] = n !== 20
    s = { ...s, blocked, scorerPts: [0, 45], chase: 45, stopper: 1 }
    // P1 (stopper now) blocks the final number while P0 (chaser, 0 pts) can't pass 45
    s = applyScam(s, mk(20, 1), 1)
    expect(s.finished).toBe(true)
    const r = GAMES['scam'].result(s)!
    expect(r.winnerIdxs).toEqual([1])
  })
})

describe('Nine Lives — a fruitless VISIT costs one life (was: every missed dart)', () => {
  it('hits inside a visit protect it; a barren visit costs exactly one life', () => {
    let s = initNineLives(P2, {})
    // P0: three misses → one life
    s = applyNineLives(s, mk(0, 0), 0)
    s = applyNineLives(s, mk(0, 0), 0)
    s = applyNineLives(s, mk(0, 0), 0)
    expect(s.lives[0]).toBe(8)
    // P0: hit 1 then two misses → NO life lost, target advanced
    s = applyNineLives(s, mk(1, 1), 0)
    s = applyNineLives(s, mk(0, 0), 0)
    s = applyNineLives(s, mk(0, 0), 0)
    expect(s.lives[0]).toBe(8)
    expect(s.target[0]).toBe(2)
  })
})

describe('Follow Me — a visit without a hit costs a life (was: lives never deducted at all)', () => {
  it('miss visit −1 life; hit visit safe and target wraps 20→1', () => {
    let s = initFollowMe(P2, {})
    // P0 misses the target (20) all visit
    s = applyFollowMe(s, mk(5, 1), 0)
    s = applyFollowMe(s, mk(6, 1), 0)
    s = applyFollowMe(s, mk(7, 1), 0)
    expect(s.lives[0]).toBe(2)
    // P1 hits 20 → target wraps to 1, no life lost
    s = applyFollowMe(s, mk(20, 1), 1)
    s = applyFollowMe(s, mk(3, 1), 1)
    s = applyFollowMe(s, mk(3, 1), 1)
    expect(s.lives[1]).toBe(3)
    expect(s.target).toBe(1)
  })
  it('a player with 0 lives is out and the last survivor wins', () => {
    let s = initFollowMe(P2, {})
    for (let v = 0; v < 3; v++) {
      s = applyFollowMe(s, mk(5, 1), 0)
      s = applyFollowMe(s, mk(6, 1), 0)
      s = applyFollowMe(s, mk(7, 1), 0)
      if (s.finished) break
      s = applyFollowMe(s, mk(20, 1), 1)
      s = applyFollowMe(s, mk(1, 1), 1) // follows 20→1... wait target moved
      s = applyFollowMe(s, mk(1, 1), 1)
    }
    expect(s.finished).toBe(true)
    expect(s.lives[0]).toBeLessThanOrEqual(0)
    const r = GAMES['follow-me'].result(s)!
    expect(r.winnerIdxs).toEqual([1])
  })
})

describe("Bob's 27 — targets descend D20→D1 and bust-out eliminates (was: stuck on D20 forever)", () => {
  it('target steps down every visit regardless of hits; three bust visits eliminate', () => {
    let s = initBobs27(P2, {})
    // P0 hits D20 once, misses twice: +40 → 67, target 19
    s = applyBobs27(s, mk(20, 2), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    expect(s.score[0]).toBe(67)
    expect(s.target[0]).toBe(19)
    // P0 misses all: −38 → 29, target 18
    s = applyBobs27(s, mk(0, 0), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    expect(s.score[0]).toBe(29)
    expect(s.target[0]).toBe(18)
    // P0 misses all: −36 → −7 → out
    s = applyBobs27(s, mk(0, 0), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    s = applyBobs27(s, mk(0, 0), 0)
    expect(s.alive[0]).toBe(false)
  })
})

describe('Battleships — the fleet-sinker wins (was: winner picked from a map key)', () => {
  it('sinking all 5 enemy cells crowns the shooter', () => {
    const def = GAMES['battleships']
    let s = def.init(P2, {})
    // P0 places: S1..S5
    for (const n of [1, 2, 3, 4, 5]) s = def.apply(s, mk(n, 1), 0)
    expect(s.placed[0]).toBe(true)
    // P1 places: S6..S10
    for (const n of [6, 7, 8, 9, 10]) s = def.apply(s, mk(n, 1), 1)
    expect(s.placed[1]).toBe(true)
    // P0 knows P1's deployment and sinks all five
    for (const n of [6, 7, 8, 9, 10]) s = def.apply(s, mk(n, 1), 0)
    expect(s.finished).toBe(true)
    const r = def.result(s)!
    expect(r.winnerIdxs).toEqual([0])
  })
})
