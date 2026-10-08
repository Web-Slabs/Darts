import { describe, it, expect } from 'vitest'
import {
  initScram, applyScram,
  initEnglishCricket, applyEnglishCricket,
} from './extra'
import { mk, type Throw } from '../board'

const P2 = [{ id: 'a', name: 'Amy' }, { id: 'b', name: 'Ben' }]

const hand = (s: any, throws: Throw[], playerIdx: number) => {
  for (const t of throws) s = applyScram(s, t, playerIdx)
  return s
}

describe('Scram', () => {
  it('stopper closes with one hit of any kind; scorer only scores open numbers', () => {
    let s = initScram(P2, { cap: '30' })
    // phase 1: Amy stops, Ben scores. Amy hits single 20 → closed; misses do nothing.
    s = hand(s, [mk(20, 1), mk(0, 0), mk(0, 0)], 0)
    expect(s.closed[19]).toBe(true)
    expect(s.closed[0]).toBe(false)
    // Ben scores on open 19 (T19 = 57 + single 19 = 76), nothing on closed 20
    s = hand(s, [mk(19, 3), mk(20, 3), mk(19, 1)], 1)
    expect(s.scores[1]).toBe(76)
  })
  it('swaps roles after the board is fully closed and finishes after phase 2', () => {
    let s = initScram(P2, { cap: '30' })
    // Amy closes one number per visit; Ben misses everything (scores zero).
    let guard = 0
    while (s.phase === 1 && guard++ < 40) {
      const firstOpen = s.closed.findIndex((c) => !c) + 1
      s = applyScram(s, mk(firstOpen, 1), 0)
      s = applyScram(s, mk(0, 0), 0)
      s = applyScram(s, mk(0, 0), 0)
      // the swap fires at the end of Amy's board-completing visit — stop there
      if (s.phase === 1 && !s.closed.every(Boolean)) {
        s = applyScram(s, mk(0, 0), 1)
        s = applyScram(s, mk(0, 0), 1)
        s = applyScram(s, mk(0, 0), 1)
      }
    }
    expect(s.phase).toBe(2)
    expect(s.cur).toBe(1) // Ben (original scorer) stops first in phase 2
    expect(s.scores[1]).toBe(0) // Ben never found an open number
  })
  it('declares the higher scorer the winner after both phases', () => {
    let s = initScram(P2, { cap: '30' })
    // Drive to phase 2 quickly
    let guard = 0
    while (s.phase === 1 && guard++ < 60) {
      const firstOpen = s.closed.findIndex((c) => !c) + 1
      s = applyScram(s, mk(firstOpen, 1), 0)
      s = applyScram(s, mk(0, 0), 0)
      s = applyScram(s, mk(0, 0), 0)
      s = applyScram(s, mk(20, 1), 1)
      s = applyScram(s, mk(20, 1), 1)
      s = applyScram(s, mk(20, 1), 1)
    }
    const afterPhase1 = s.scores[1]
    // Phase 2: Ben stops everything immediately each visit; Amy scores nothing.
    guard = 0
    while (!s.finished && guard++ < 60) {
      const firstOpen = s.closed.findIndex((c) => !c) + 1
      s = applyScram(s, mk(firstOpen, 1), 1)
      s = applyScram(s, mk(0, 0), 1)
      s = applyScram(s, mk(0, 0), 1)
      s = applyScram(s, mk(0, 0), 0)
      s = applyScram(s, mk(0, 0), 0)
      s = applyScram(s, mk(0, 0), 0)
    }
    expect(s.finished).toBe(true)
    expect(s.scores[1]).toBe(afterPhase1)
    expect(s.scores[0]).toBe(0)
  })
})

describe('English Cricket', () => {
  it('scores runs = hand − 40 for the batsman', () => {
    let s = initEnglishCricket(P2, {})
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(5, 1), 0) // hand = 45 → 5 runs
    expect(s.runs[0]).toBe(5)
    s = applyEnglishCricket(s, mk(5, 1), 0)
    s = applyEnglishCricket(s, mk(5, 1), 0)
    s = applyEnglishCricket(s, mk(5, 1), 0) // hand = 15 → nothing
    expect(s.runs[0]).toBe(5)
  })
  it('bowler takes 1 wicket on outer bull, 2 on bull, and misses gift runs', () => {
    let s = initEnglishCricket(P2, {})
    s = applyEnglishCricket(s, mk(20, 3), 0) // Amy hand 60 → 20 runs
    s = applyEnglishCricket(s, mk(25, 25), 1) // outer bull → 1 wicket
    s = applyEnglishCricket(s, mk(25, 25), 1)
    s = applyEnglishCricket(s, mk(25, 25), 1)
    expect(s.wickets).toBe(3)
    s = applyEnglishCricket(s, mk(25, 50), 1) // inner bull takes 2
    expect(s.wickets).toBe(5)
  })
  it('misses by the bowler gift the batsman runs', () => {
    let s = initEnglishCricket(P2, {})
    s = applyEnglishCricket(s, mk(20, 3), 0) // Amy's hand in progress (60 so far, not banked)
    s = applyEnglishCricket(s, mk(19, 3), 1) // bowler miss → +57 to Amy immediately
    expect(s.runs[0]).toBe(57)
    expect(s.wickets).toBe(0)
  })
  it('ten wickets end the innings and the chase decides the winner', () => {
    let s = initEnglishCricket(P2, {})
    // Amy: one big hand (20+20+20 → 20 runs), then Ben bowls 5 bulls (50s take 2 each)
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(20, 1), 0)
    for (let i = 0; i < 5; i++) s = applyEnglishCricket(s, mk(25, 50), 1)
    expect(s.innings).toBe(2) // ten wickets ended the innings
    expect(s.firstInningsRuns).toBe(20)
    expect(s.wickets).toBe(0) // reset for the second innings
    // Ben bats: needs 21. Two hands of 65 (20+5+15? use T20+T5) — hand 65 → 25 runs → 25 ≥ 21 → win
    s = applyEnglishCricket(s, mk(20, 3), 1)
    s = applyEnglishCricket(s, mk(5, 1), 1)
    s = applyEnglishCricket(s, mk(0, 0), 1) // hand 65 → 25 runs
    expect(s.finished).toBe(true)
    expect(s.runs[1]).toBe(25)
  })
  it('a tied chase is a tie (all out on level scores)', () => {
    let s = initEnglishCricket(P2, {})
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(20, 1), 0)
    s = applyEnglishCricket(s, mk(20, 1), 0) // 20 runs
    for (let i = 0; i < 5; i++) s = applyEnglishCricket(s, mk(25, 50), 1)
    // Ben reaches exactly 20 (hand of 60) — level, innings continues
    s = applyEnglishCricket(s, mk(20, 3), 1)
    s = applyEnglishCricket(s, mk(0, 0), 1)
    s = applyEnglishCricket(s, mk(0, 0), 1)
    expect(s.finished).toBe(false)
    expect(s.runs[1]).toBe(20)
    // Amy (now the bowler) takes the last 10 wickets → all out, scores level
    for (let i = 0; i < 5; i++) s = applyEnglishCricket(s, mk(25, 50), 0)
    expect(s.finished).toBe(true)
    expect(s.runs[1]).toBe(20)
    expect(s.runs[0]).toBe(20)
  })
})
