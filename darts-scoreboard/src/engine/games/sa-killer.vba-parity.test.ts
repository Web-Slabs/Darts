// VBA-PARITY SUITE — replays Worksheet_BeforeDoubleClick from KILLER (NEW).xlsm
// branch by branch against the TypeScript engine. Every test cites the macro
// lines it verifies. If any of these fail, the game is wrong.
//
// Macro map (columns): 6=D-tile-L, 7=T-tile-L, 8=spine-L (boxes C,D,E fill in
// that order), 9=spine-R (boxes L,M,N), 10=D-tile-R, 11=T-tile-R.
// Rows: 4..14 = numbers 20..10 · 15 = D row · 16 = T row · 17 = bull row.
// Score cells: B (left total), O (right total). H18 = |O18-B18| margin.
//
// Macro branches (verbatim behaviour):
//   c=8, box empty (E→D→C): chalk one X.                    [marking]
//   c=8, C="X" & r=17 (bull row): if N(box) full → +25.     [bull flat 25]
//   c=8, C="X" & r≤14: if N full → +Cells(r,8) (= the row number). [1×N]
//   c=7 (T tile, L) & C15="X": if N15 not full → +2×Cells(r,8).     [D-row 2×N]
//   c=6 (D tile, L) & C16="X": if N16 not full → +3×Cells(r,8).     [T-row 3×N]
//   c=9: mirror for the right player (L→M→N).
//   Dead rule: if the opponent's three boxes for that row are all "X", the tap
//   scores NOTHING (GoTo endd before the addition).
//   Colour: both 3 X's → red strikethrough (dead). One side 3 X's → green.

import { describe, it, expect } from 'vitest'
import {
  initSaKiller, applySaKiller, chalkSaKiller, channelState,
  cellFor, payFor, needsToWin, SA_NUMBERS,
} from './sa-killer'
import { mk } from '../board'

const P = [{ id: 'a', name: 'LEFT' }, { id: 'b', name: 'RIGHT' }]
const fresh = () => initSaKiller(P, {})

/** Open a channel by chalking 3 X's for the given player. */
const open = (s: ReturnType<typeof fresh>, pi: number, cell: Parameters<typeof chalkSaKiller>[2]) =>
  [0, 1, 2].reduce((acc) => chalkSaKiller(acc, pi, cell), s)

describe('VBA parity — marking (boxes C/D/E, L/M/N)', () => {
  it('c=8: taps fill boxes in order E→D→C, one X each (macro lines 39-57)', () => {
    let s = fresh()
    s = chalkSaKiller(s, 0, 'n20')
    expect(s.players[0].marks['n20']).toBe(1)
    s = chalkSaKiller(s, 0, 'n20')
    expect(s.players[0].marks['n20']).toBe(2)
    s = chalkSaKiller(s, 0, 'n20')
    expect(s.players[0].marks['n20']).toBe(3)
    // a 4th tap does nothing (box full)
    s = chalkSaKiller(s, 0, 'n20')
    expect(s.players[0].marks['n20']).toBe(3)
  })

  it('all 11 numbers + D/T/B channels accept marks (rows 4-17)', () => {
    let s = fresh()
    for (const n of SA_NUMBERS) s = chalkSaKiller(s, 0, `n${n}`)
    s = chalkSaKiller(s, 0, 'D')
    s = chalkSaKiller(s, 0, 'T')
    s = chalkSaKiller(s, 0, 'B')
    expect(s.players[0].marks['n20']).toBe(1)
    expect(s.players[0].marks['n10']).toBe(1)
    expect(s.players[0].marks['D']).toBe(1)
    expect(s.players[0].marks['T']).toBe(1)
    expect(s.players[0].marks['B']).toBe(1)
  })
})

describe('VBA parity — scoring through open channels', () => {
  it('c=8, r≤14, box full, N not full: +row number (1×N)', () => {
    let s = fresh()
    s = open(s, 0, 'n20') // left opens 20
    s = applySaKiller(s, mk(20, 1), 0) // single 20
    expect(s.scores[0]).toBe(20)
    expect(s.rowScores[0]['n20']).toBe(20)
  })

  it('c=8, r=17 (bull), box full, N not full: +25 flat (macro m=25)', () => {
    let s = fresh()
    s = open(s, 0, 'B')
    s = applySaKiller(s, mk(25, 25), 0) // outer bull
    expect(s.scores[0]).toBe(25)
    s = applySaKiller(s, mk(25, 50), 0) // inner bull — also 25
    expect(s.scores[0]).toBe(50)
  })

  it('c=7 (T tile) & C15=X: D row pays 2×row (macro: n + 2*m)', () => {
    let s = fresh()
    s = open(s, 0, 'n20') // the D-row check reads C15 = left's 20 boxes full
    s = open(s, 0, 'D') // D15 (row 15 box) full → D-tile taps pay
    s = applySaKiller(s, mk(19, 2), 0) // D19 → 2×19 = 38
    expect(s.scores[0]).toBe(38)
  })

  it('c=6 (D tile) & C16=X: T row pays 3×row (macro: n + 3*m)', () => {
    let s = fresh()
    s = open(s, 0, 'n20') // T-row check reads C16 = left's 20 boxes
    s = open(s, 0, 'T')
    s = applySaKiller(s, mk(20, 3), 0) // T20 → 3×20 = 60
    expect(s.scores[0]).toBe(60)
  })

  it('D tile pays 2×N once the D ROW is full — number row NOT required (macro guard is Cells(15,3))', () => {
    let s = fresh()
    s = open(s, 0, 'D') // D row full — the macro's only opening guard
    s = applySaKiller(s, mk(20, 2), 0) // D20 tile (c=7, r=4) → 2×20 = 40
    expect(s.scores[0]).toBe(40)
    s = applySaKiller(s, mk(16, 2), 0) // D16 tile → +32
    expect(s.scores[0]).toBe(72)
  })

  it('D/T tile taps die when the opponent also has the D/T row full (dead check N15/N16)', () => {
    let s = fresh()
    s = open(s, 0, 'D')
    s = open(s, 1, 'D') // both D rows full → dead
    s = applySaKiller(s, mk(20, 2), 0) // D20 → nothing
    expect(s.scores[0]).toBe(0)
  })
})

describe('VBA parity — dead channels (both 3 X\u2019s)', () => {
  it('opponent full → tap scores nothing (macro: If Cells(r,14)=X Then GoTo endd)', () => {
    let s = fresh()
    s = open(s, 0, 'n20')
    s = open(s, 1, 'n20') // both open → dead
    expect(channelState(s, 0, 'n20')).toBe('dead')
    expect(channelState(s, 1, 'n20')).toBe('dead')
    s = applySaKiller(s, mk(20, 1), 0)
    expect(s.scores[0]).toBe(0)
    s = applySaKiller(s, mk(20, 1), 1)
    expect(s.scores[1]).toBe(0)
  })

  it('dead D row: D-tile taps score nothing', () => {
    let s = fresh()
    s = open(s, 0, 'n20')
    s = open(s, 0, 'D')
    s = open(s, 1, 'n20') // 20 row dead on both sides
    s = open(s, 1, 'D')
    // D19 would pay 38 if alive; 20-row dead kills the D row for 20s...
    // NOTE: per the macro the dead check is per-ROW (r=15 boxes), not per
    // segment — D19 taps row 15 with m=19. Row 15 is dead → nothing.
    s = applySaKiller(s, mk(19, 2), 0)
    expect(s.scores[0]).toBe(0)
  })

  it('channels are independent: dead 20 does not block T row (T20 still 60)', () => {
    let s = fresh()
    s = open(s, 0, 'n20')
    s = open(s, 1, 'n20') // 20 row dead
    s = open(s, 0, 'T') // T row alive (16th row box)
    s = applySaKiller(s, mk(20, 3), 0) // T20 through the T row → 60
    expect(s.scores[0]).toBe(60)
  })
})

describe('VBA parity — classification helpers', () => {
  it('cellFor routes every dart to its macro column', () => {
    expect(cellFor(mk(18, 1))).toBe('n18') // c=8/9
    expect(cellFor(mk(19, 2))).toBe('D') // c=6/10
    expect(cellFor(mk(20, 3))).toBe('T') // c=7/11
    expect(cellFor(mk(25, 25))).toBe('B') // r=17
    expect(cellFor(mk(25, 50))).toBe('B')
    expect(cellFor(mk(0, 0))).toBeNull()
  })

  it('payFor matches the macro arithmetic', () => {
    expect(payFor(mk(18, 1))).toBe(18) // +m (row number)
    expect(payFor(mk(19, 2))).toBe(38) // +2×m (D tile)
    expect(payFor(mk(20, 3))).toBe(60) // +3×m (T tile)
    expect(payFor(mk(25, 25))).toBe(25) // bull flat
    expect(payFor(mk(25, 50))).toBe(25)
  })
})

describe('needs-to-win cells', () => {
  it('points at the best open dart; asks to open when nothing is open', () => {
    let s = fresh()
    expect(needsToWin(s)[0]).toContain('open')
    s = open(s, 0, 'n20')
    expect(needsToWin(s)[0]).toBe('single 20 — pays 20')
    s = open(s, 0, 'T')
    expect(needsToWin(s)[0]).toBe('TRIP 20 — pays 60')
  })
})
