// Split-legs (SA house rule): when you're left on 1, a single 11 finishes and
// wins. The 11 is the "split legs" number wherever it sits on the pie.
import { describe, it, expect } from 'vitest'
import { initX01, applyX01, type X01State } from './x01'
import { mk } from '../board'

const P = [{ id: 'a', name: 'Pieter' }, { id: 'b', name: 'Riaan' }]

/** Drop player 0 straight onto 1 remaining, mid-visit with 2 darts left. */
const onOne = (settings: Record<string, string> = {}): X01State => {
  const s = initX01(P, { start: '301', out: 'double', ...settings })
  return {
    ...s,
    scores: [1, 301],
    entered: [true, true],
    dartsThrown: [1, 0],
    pointsScored: [300, 0],
    visitDarts: [mk(20, 3)], // one dart thrown this visit, two left
  }
}

describe('X01 split-legs (SA rule)', () => {
  it('left on 1: single 11 finishes and wins the leg', () => {
    const s = onOne({ splitLegs: 'on' })
    const after = applyX01(s, mk(11, 1), 0)
    expect(after.legOver).toBe(true)
    expect(after.lastWinner).toBe(0)
    expect(after.scores[0]).toBe(0)
    expect(after.log.some((l) => l.includes('SPLIT LEGS'))).toBe(true)
  })

  it('left on 1: single 1 busts (below zero), D1 busts (overshoot)', () => {
    const s = onOne({ splitLegs: 'on' })
    const a = applyX01(s, mk(1, 1), 0)
    expect(a.legOver).toBe(false)
    expect(a.scores[0]).toBe(1)
    const b = applyX01(s, mk(1, 2), 0)
    expect(b.legOver).toBe(false)
    expect(b.scores[0]).toBe(1)
  })

  it('left on 1: bull does NOT finish (only 11 splits legs)', () => {
    const s = onOne({ splitLegs: 'on' })
    const a = applyX01(s, mk(25, 25), 0)
    expect(a.legOver).toBe(false)
  })

  it('option OFF: single 11 from 1 is a normal bust', () => {
    const s = onOne({})
    const after = applyX01(s, mk(11, 1), 0)
    expect(after.legOver).toBe(false)
    expect(after.scores[0]).toBe(1)
  })

  it('double 1 still finishes normally when on 2 (split-legs rule does not interfere)', () => {
    const s = { ...onOne({ splitLegs: 'on' }), scores: [2, 301] }
    const after = applyX01(s, mk(1, 2), 0)
    expect(after.legOver).toBe(true)
    expect(after.lastWinner).toBe(0)
  })

  // REGRESSION: the old on-1 bust rule fired on ANY dart leaving you on 1 in
  // double-out, so you could never BE on 1 and the split-legs win was
  // unreachable in a real game (tests seeded score=1 directly and hid it).
  it('split-legs ON: a dart that leaves you exactly on 1 is NOT a bust', () => {
    let s = initX01(P, { start: '301', out: 'double', splitLegs: 'on' })
    for (const t of [mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 1), mk(20, 1), mk(20, 1)]) s = applyX01(s, t, 0)
    // 301 → 241 → 181 → 121 → 61 → 41 → 21 → 1 (that last dart LEAVES 1)
    expect(s.busts[0]).toBe(0)
    expect(s.legOver).toBe(false)
    expect(s.scores[0]).toBe(1)
  })

  it('split-legs ON: reach 1 the hard way, then single 11 wins the leg', () => {
    let s = initX01(P, { start: '301', out: 'double', splitLegs: 'on' })
    for (const t of [mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 1), mk(20, 1), mk(20, 1)]) s = applyX01(s, t, 0)
    const win = applyX01(s, mk(11, 1), 0)
    expect(win.legOver).toBe(true)
    expect(win.lastWinner).toBe(0)
    expect(win.log.some((l) => l.includes('SPLIT LEGS'))).toBe(true)
  })

  it('split-legs OFF: leaving yourself on 1 remains a bust (unchanged rule)', () => {
    let s = initX01(P, { start: '301', out: 'double' })
    for (const t of [mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 3), mk(20, 1), mk(20, 1), mk(20, 1)]) s = applyX01(s, t, 0)
    expect(s.busts[0]).toBe(1)
    expect(s.legOver).toBe(false)
  })

  it('split-legs ON, straight-out: on-1 darts behave as straight-out (no interference)', () => {
    // From 2, single 1 → 1; from 1, single 1 → 0 wins (straight out allows it).
    const on2 = { ...initX01(P, { start: '301', out: 'straight', splitLegs: 'on' }), scores: [2, 301], entered: [true, true] as boolean[] }
    const a = applyX01(on2, mk(1, 1), 0)
    expect(a.scores[0]).toBe(1)
    const b = applyX01(a, mk(1, 1), 0)
    expect(b.legOver).toBe(true)
    expect(b.scores[0]).toBe(0)
  })
})
