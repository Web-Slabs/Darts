// Tests written from the KILLER (NEW).xlsm VBA behaviour (extracted with olevba).
import { describe, it, expect } from 'vitest'
import {
  initSaKiller, applySaKiller, chalkSaKiller, endSaKiller,
  cellFor, payFor, channelState, saBullOff, saNextLeg, saKillerDef, SA_NUMBERS,
} from './sa-killer'
import { mk } from '../board'

const P = [{ id: 'a', name: 'Pieter' }, { id: 'b', name: 'Riaan' }]
const fresh = () => initSaKiller(P, {}) // defaults: no bull-off, no open/close, no target

describe('SA Killer (VBA-faithful)', () => {
  it('has the full 20→10 spine plus D, T, B channels', () => {
    expect([...SA_NUMBERS]).toEqual([20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10])
  })

  it('routes darts to channels: single→number, any double→D, any treble→T, any bull→B', () => {
    expect(cellFor(mk(18, 1))).toBe('n18')
    expect(cellFor(mk(3, 2))).toBe('D') // any double, not row-specific
    expect(cellFor(mk(20, 3))).toBe('T')
    expect(cellFor(mk(25, 25))).toBe('B')
    expect(cellFor(mk(25, 50))).toBe('B')
    expect(cellFor(mk(0, 0))).toBeNull()
  })

  it('pays N / 2N / 3N / flat 25 through an open channel', () => {
    expect(payFor(mk(18, 1))).toBe(18)
    expect(payFor(mk(20, 2))).toBe(40)
    expect(payFor(mk(20, 3))).toBe(60)
    expect(payFor(mk(25, 25))).toBe(25)
    expect(payFor(mk(25, 50))).toBe(25)
  })

  it('marks 3 X’s then scores through the open channel (macro: +row on further hits)', () => {
    let s = fresh()
    // P0 throws three singles at 20 → n20 open
    s = applySaKiller(s, mk(20, 1), 0)
    s = applySaKiller(s, mk(20, 1), 0)
    s = applySaKiller(s, mk(20, 1), 0) // visit ends, but channel is open
    expect(channelState(s, 0, 'n20')).toBe('open')
    // P1 throws nothing useful
    s = applySaKiller(s, mk(1, 1), 1)
    s = applySaKiller(s, mk(1, 1), 1)
    s = applySaKiller(s, mk(1, 1), 1)
    // P0 hits 20 again → +20
    s = applySaKiller(s, mk(20, 1), 0)
    expect(s.scores[0]).toBe(20)
  })

  it('dead channel: both players 3 X’s → nobody scores through it', () => {
    let s = fresh()
    // Both open n20 with three singles each.
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 1), 0)
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 1), 1)
    expect(channelState(s, 0, 'n20')).toBe('dead')
    expect(channelState(s, 1, 'n20')).toBe('dead')
    s = applySaKiller(s, mk(20, 1), 0)
    expect(s.scores[0]).toBe(0)
  })

  it('channels are independent: dead 20s don’t block the open T channel (T20 pays 60)', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 1), 0)
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 1), 1) // n20 dead
    // P0 opens the T channel with three trebles (any rows)
    s = applySaKiller(s, mk(19, 3), 0)
    s = applySaKiller(s, mk(18, 3), 0)
    s = applySaKiller(s, mk(17, 3), 0)
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(5, 1), 1)
    s = applySaKiller(s, mk(20, 3), 0) // T20 through open T channel
    expect(s.scores[0]).toBe(60)
  })

  it('D channel pays 2×row on any row (macro: +2×row via D tiles)', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(16, 2), 0) // open D
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(11, 1), 1)
    s = applySaKiller(s, mk(19, 2), 0) // D19 → +38
    expect(s.scores[0]).toBe(38)
  })

  it('bull pays a flat 25 per the macro (r=17 branch adds 25)', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(25, 25), 0) // open B
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(7, 1), 1)
    s = applySaKiller(s, mk(25, 50), 0) // inner bull → +25, not 50
    expect(s.scores[0]).toBe(25)
  })

  it('rotation is 3 darts per visit', () => {
    let s = fresh()
    s = applySaKiller(s, mk(1, 1), 0)
    s = applySaKiller(s, mk(1, 1), 0)
    expect(s.cur).toBe(0)
    s = applySaKiller(s, mk(1, 1), 0)
    expect(s.cur).toBe(1)
  })

  it('ends with the higher total when there is no target', () => {
    let s = fresh()
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 1), 0)
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(11, 1), 1)
    s = applySaKiller(s, mk(20, 1), 0)
    for (let i = 0; i < 2; i++) s = applySaKiller(s, mk(4, 1), 1)
    s = endSaKiller(s)
    expect(s.matchOver).toBe(true)
    expect(saKillerDef.result!(s)!.summary).toContain('Pieter wins on points (20–0)')
  })

  it('optional open-shot rule blocks marking until it lands', () => {
    let s = initSaKiller(P, { open: 'double' })
    s = applySaKiller(s, mk(20, 1), 0) // single: ignored
    expect(s.players[0].marks['n20']).toBe(0)
    s = applySaKiller(s, mk(20, 2), 0) // double: opens
    expect(s.players[0].opened).toBe(true)
    s = applySaKiller(s, mk(20, 1), 0)
    expect(s.players[0].marks['n20']).toBe(1)
  })

  it('optional bull-off gates play', () => {
    let s = initSaKiller(P, { bullOff: 'on' })
    expect(s.phase).toBe('bulloff')
    const before = applySaKiller(s, mk(20, 2), 0)
    expect(before.scores[0]).toBe(0) // ignored during bull-off
    s = saBullOff(s, 1)
    expect(s.phase).toBe('play')
    expect(s.cur).toBe(1)
    // bull-off resolution appears as a table action (the UI's unlock button)
    const acts = saKillerDef.actions?.(initSaKiller(P, { bullOff: 'on' })) ?? []
    expect(acts.map((a) => a.label)).toContain('Riaan won the bull-off')
  })

  it('leg ends → Next-leg action appears and starts a clean leg, loser first', () => {
    // legsToWin 2: one ended leg must NOT end the match — the game must offer
    // a Next-leg action instead of leaving the board dead (REGRESSION pin).
    const s0 = initSaKiller(P, { legs: '2' })
    // A leg that just ended, as winLeg leaves it: leg over, 1 leg to P0.
    const ended = { ...s0, legOver: true, lastWinner: 0, players: s0.players.map((p, i) => (i === 0 ? { ...p, legs: 1 } : p)) }
    expect(ended.matchOver).toBe(false)
    const acts = saKillerDef.actions?.(ended) ?? []
    expect(acts.some((a) => a.label.startsWith('Next leg'))).toBe(true)
    const s2 = saNextLeg(ended)
    expect(s2.legOver).toBe(false)
    expect(s2.scores).toEqual([0, 0])
    expect(s2.players.every((p) => Object.values(p.marks).every((m) => m === 0))).toBe(true)
    expect(s2.cur).toBe(1) // loser throws first
    expect(s2.log.some((l) => l.includes('Leg 2 begins'))).toBe(true)
  })

  it('optional target ends the leg at the target', () => {
    let s = initSaKiller(P, { target: '25' })
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(20, 3), 0) // marks the T channel (no score)
    for (let i = 0; i < 3; i++) s = applySaKiller(s, mk(3, 1), 1)
    s = applySaKiller(s, mk(10, 3), 0) // T10 through the open T channel → +30 ≥ 25
    expect(s.legOver).toBe(true)
    expect(s.matchOver).toBe(true)
    expect(saKillerDef.result!(s)!.summary).toContain('Pieter wins')
  })

  it('hand-chalking goes through the same rules', () => {
    let s = fresh()
    s = chalkSaKiller(s, 0, 'n20')
    s = chalkSaKiller(s, 0, 'n20')
    s = chalkSaKiller(s, 0, 'n20')
    expect(channelState(s, 0, 'n20')).toBe('open')
    expect(s.players[0].marks['n20']).toBe(3)
    // chalking a 4th X does nothing
    s = chalkSaKiller(s, 0, 'n20')
    expect(s.players[0].marks['n20']).toBe(3)
  })
})
