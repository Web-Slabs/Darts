import { describe, it, expect } from 'vitest'
import { initAtc, applyAtc, initFives, applyFives } from './more'
import { initKiller, applyKiller } from './killer'
import { initCricket, applyCricket } from './cricket'
import { initShanghai, applyShanghai } from './more'
import { mk } from '../board'

const P3 = [{ id: 'a', name: 'Amy' }, { id: 'b', name: 'Ben' }, { id: 'c', name: 'Cal' }]

describe('Around the Clock', () => {
  it('advances on the right number only', () => {
    let s = initAtc(P3, { mode: 'any' })
    s = applyAtc(s, mk(1, 1), 0)
    expect(s.target[0]).toBe(2)
    s = applyAtc(s, mk(5, 1), 0) // wrong number
    expect(s.target[0]).toBe(2)
  })
  it('wins on hitting 20', () => {
    let s = initAtc(P3, { mode: 'any' })
    for (let n = 1; n <= 19; n++) s = applyAtc(s, mk(n, 1), 0)
    expect(s.finished).toBe(false)
    s = applyAtc(s, mk(20, 1), 0)
    expect(s.finished).toBe(true)
  })
})

describe('Killer (house doubles rules)', () => {
  it('needs a double of own number to become killer', () => {
    let s = initKiller(P3, { variant: 'house', lives: '3' })
    s = applyKiller(s, mk(s.players[0].number, 1), 0) // single: not enough
    expect(s.players[0].killer).toBe(false)
    s = applyKiller(s, mk(s.players[0].number, 2), 0) // double: killer
    expect(s.players[0].killer).toBe(true)
  })
  it('takes a life from the victim on their double', () => {
    let s = initKiller(P3, { variant: 'house', lives: '3' })
    s = applyKiller(s, mk(s.players[0].number, 2), 0) // become killer
    const victim = s.players.find((p) => p.number === (s.players[1].number)) ?? s.players[1]
    // hit player whose number is players[1]'s number with a double:
    const victimNum = s.players[1].number
    s = applyKiller(s, mk(victimNum, 2), 0)
    expect(s.players[1].lives).toBe(2)
    void victim
  })
})

describe('Cricket', () => {
  it('scores on a closed number while opponents have NOT closed it', () => {
    let s = initCricket(P3, { mode: 'standard' })
    // visit 1 (Amy): T20 closes 20, then two 5s finish the visit
    s = applyCricket(s, mk(20, 3), 0)
    expect(s.marks[0][0]).toBe(3)
    s = applyCricket(s, mk(5, 1), 0)
    s = applyCricket(s, mk(5, 1), 0)
    expect(s.cur).toBe(1)
    // Amy's next visit: extra hit on closed 20 scores while Ben & Cal have not closed it
    s = applyCricket(s, mk(20, 1), 0)
    expect(s.points[0]).toBe(20)
    // once every opponent has closed it too, no more points
    s = applyCricket(s, mk(20, 3), 1)
    s = applyCricket(s, mk(5, 1), 1)
    s = applyCricket(s, mk(5, 1), 1)
    s = applyCricket(s, mk(20, 3), 2)
    s = applyCricket(s, mk(5, 1), 2)
    s = applyCricket(s, mk(5, 1), 2)
    s = applyCricket(s, mk(20, 1), 0)
    expect(s.points[0]).toBe(20)
  })
  it('rotates players every 3 darts and bumps the round on wrap', () => {
    let s = initCricket(P3, { mode: 'standard' })
    for (let i = 0; i < 9; i++) s = applyCricket(s, mk(1, 1), s.cur)
    expect(s.round).toBe(2)
    expect(s.cur).toBe(0)
    expect(s.turnDarts).toBe(0)
  })
  it('scores overflow from the dart that closes the number', () => {
    let s = initCricket(P3, { mode: 'standard' })
    s = applyCricket(s, mk(20, 2), 0) // 2 marks
    s = applyCricket(s, mk(20, 3), 0) // closes with 2 marks of overflow → 2 × 20
    expect(s.points[0]).toBe(40)
  })
  it('cut-throat gives the points to opponents as penalties', () => {
    let s = initCricket(P3, { mode: 'cut-throat' })
    s = applyCricket(s, mk(19, 3), 0) // closes 19, no overflow
    s = applyCricket(s, mk(19, 1), 0) // same visit: scores while others open
    expect(s.points[0]).toBe(0)
    expect(s.points[1]).toBe(19)
    expect(s.points[2]).toBe(19)
  })
})

describe('Fives', () => {
  it('scores fives (total ÷ 5) only when the visit divides by 5', () => {
    let s = initFives(P3, { target: '51' })
    for (const t of [mk(10, 1), mk(10, 1), mk(5, 1)]) s = applyFives(s, t, 0) // 25 → 5 fives
    expect(s.total[0]).toBe(5)
    for (const t of [mk(20, 1), mk(20, 1), mk(20, 1)]) s = applyFives(s, t, 0) // 60 → 12 fives
    expect(s.total[0]).toBe(17)
    for (const t of [mk(20, 1), mk(19, 1), mk(5, 1)]) s = applyFives(s, t, 0) // 44 → nothing
    expect(s.total[0]).toBe(17)
  })
  it('wins only on exactly 51 — going over busts back to the visit start', () => {
    let s = initFives(P3, { target: '51' })
    // nine visits of 20+20+5 = 45 → 9 fives each
    for (let i = 0; i < 9; i++) for (const t of [mk(20, 1), mk(20, 1), mk(5, 1)]) s = applyFives(s, t, 0)
    expect(s.total[0]).toBe(45)
    expect(s.finished).toBe(false)
    // bust: 20+20+20 = 60 → 12 fives → 57 > 51 → back to 45
    for (const t of [mk(20, 1), mk(20, 1), mk(20, 1)]) s = applyFives(s, t, 0)
    expect(s.total[0]).toBe(45)
    expect(s.finished).toBe(false)
    // exact: 20+5+5 = 30 → 6 fives → 51 → win
    for (const t of [mk(20, 1), mk(5, 1), mk(5, 1)]) s = applyFives(s, t, 0)
    expect(s.finished).toBe(true)
    expect(s.total[0]).toBe(51)
  })
})

describe('Shanghai', () => {
  it('scores the round number only', () => {
    let s = initShanghai(P3, {})
    s = applyShanghai(s, mk(1, 1), 0)
    s = applyShanghai(s, mk(1, 3), 0)
    s = applyShanghai(s, mk(5, 3), 0)
    expect(s.points[0]).toBe(4) // 1 + 3, the 5 doesn't count in round 1
  })
})
