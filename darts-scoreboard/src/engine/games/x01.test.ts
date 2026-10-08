import { describe, it, expect } from 'vitest'
import { initX01, applyX01, suggestCheckout, x01Result } from './x01'
import { mk } from '../board'

const P = [{ id: 'a', name: 'Amy' }, { id: 'b', name: 'Ben' }]

describe('X01', () => {
  it('subtracts single darts and rotates turns', () => {
    let s = initX01(P, { start: '301', out: 'straight', legs: '1' })
    s = applyX01(s, mk(20, 3), 0)
    expect(s.scores[0]).toBe(241)
    expect(s.cur).toBe(0)
    s = applyX01(s, mk(20, 3), 0)
    s = applyX01(s, mk(20, 3), 0)
    expect(s.cur).toBe(1) // Ben's turn
    expect(s.visits[0]).toHaveLength(1)
    expect(s.visits[0][0].scored).toBe(180)
  })

  it('busts when going below zero and restores the score', () => {
    let s = initX01(P, { start: '60', out: 'straight', legs: '1' })
    s = applyX01(s, mk(20, 3), 0) // 0 left? 60-60=0 -> win actually; use different setup
    // restart: score 50, throw 60 = bust
    s = initX01(P, { start: '50', out: 'straight', legs: '1' })
    s = applyX01(s, mk(20, 3), 0)
    expect(s.scores[0]).toBe(50) // bust -> score restored
    expect(s.busts[0]).toBe(1)
  })

  it('requires a double to finish in double-out', () => {
    let s = initX01(P, { start: '32', out: 'double', legs: '1' })
    s = applyX01(s, mk(16, 2), 0)
    expect(s.legOver).toBe(true)
    expect(s.legs[0]).toBe(1)
    expect(x01Result(s)?.winnerIdxs).toEqual([0])
  })

  it('treats non-double on 0 as a bust in double-out', () => {
    let s = initX01(P, { start: '20', out: 'double', legs: '1' })
    s = applyX01(s, mk(10, 1), 0) // would leave 10 with a single 10? no: 20-10=10 not 0. Use 2 left:
    // aim: 20 -> T? simpler: start 40, D20 wins; start 40 single 20 leaves 20 etc.
    s = initX01(P, { start: '40', out: 'double', legs: '1' })
    s = applyX01(s, mk(20, 1), 0) // 20 left
    s = applyX01(s, mk(20, 1), 0) // would be 0 via single -> bust
    expect(s.scores[0]).toBe(20) // restored
    expect(s.busts[0]).toBe(1)
  })

  it('treats leaving 1 as a bust in double-out', () => {
    let s = initX01(P, { start: '21', out: 'double', legs: '1' })
    s = applyX01(s, mk(20, 1), 0) // leaves 1 -> bust
    expect(s.scores[0]).toBe(21)
    expect(s.busts[0]).toBe(1)
  })

  it('suggests the standard 170 checkout', () => {
    expect(suggestCheckout(170, 'double')).toBe('T20 T20 BULL')
    expect(suggestCheckout(32, 'double')).toBe('D16')
    expect(suggestCheckout(40, 'double')).toBe('D20')
  })

  it('suggests no finish for impossible numbers', () => {
    expect(suggestCheckout(169, 'double')).toBeNull()
    expect(suggestCheckout(171, 'double')).toBeNull()
  })
})
