// Cricket family: standard and cut-throat. Scram and English Cricket are
// separate engines (extra.ts) built on the same marks model.
// Marks model: singles=1, doubles=2, trebles=3, outer bull=1, inner bull=2.

import { type Throw } from '../board'
import type { GameDef, GameOption, Column } from '../core'

export const CRICKET_TARGETS: readonly number[] = [20, 19, 18, 17, 16, 15, 25]
export const targetLabel = (n: number) => (n === 25 ? 'B' : String(n))

export type CricketMode = 'standard' | 'cut-throat'

export type CricketState = {
  mode: CricketMode
  players: { id: string; name: string }[]
  /** marks[i][targetIdx] 0-3 for numbers, 0-2 for bull */
  marks: number[][]
  points: number[]
  /** 0 = no limit */
  roundLimit: number
  round: number
  /** index of the player currently throwing */
  cur: number
  turnDarts: number
  finished: boolean
  log: string[]
}

export const cricketOptions: GameOption[] = [
  {
    key: 'mode',
    label: 'Variant',
    choices: [
      { value: 'standard', label: 'Standard (points race)' },
      { value: 'cut-throat', label: 'Cut-Throat (points are penalties)' },
    ],
    default: 'standard',
  },
  {
    key: 'rounds',
    label: 'Rounds limit',
    choices: [
      { value: '0', label: 'No limit' },
      { value: '20', label: '20 rounds' },
      { value: '25', label: '25 rounds' },
      { value: '30', label: '30 rounds' },
    ],
    default: '20',
  },
]

export function initCricket(players: { id: string; name: string }[], settings: Record<string, string>): CricketState {
  return {
    mode: (settings['mode'] as CricketMode) ?? 'standard',
    players,
    marks: players.map(() => CRICKET_TARGETS.map(() => 0)),
    points: players.map(() => 0),
    roundLimit: parseInt(settings['rounds'] ?? '20', 10) || 0,
    round: 1,
    cur: 0,
    turnDarts: 0,
    finished: false,
    log: [],
  }
}

const marksFor = (t: Throw): { idx: number; n: number } | null => {
  if (t.n === 0) return null
  if (t.n === 25) return { idx: 6, n: t.m === 50 ? 2 : 1 }
  if (t.n >= 15 && t.n <= 20) {
    const idx = 20 - t.n
    return { idx, n: t.m }
  }
  return null
}

export function applyCricket(s: CricketState, t: Throw, playerIdx: number): CricketState {
  if (s.finished) return s
  const ns: CricketState = { ...s, marks: s.marks.map((m) => [...m]), points: [...s.points], log: [...s.log], turnDarts: s.turnDarts + 1 }

  const hit = marksFor(t)
  if (hit) {
    const cur = ns.marks[playerIdx][hit.idx]
    const cap = hit.idx === 6 ? 2 : 3
    if (cur < cap) {
      ns.marks[playerIdx][hit.idx] = Math.min(cap, cur + hit.n)
      const overflow = Math.max(0, cur + hit.n - cap)
      // A dart that closes the number scores its overflow points straight away,
      // as long as not every opponent has closed it too.
      if (overflow > 0) {
        const othersClosed = ns.marks.every((m, i) => i === playerIdx || m[hit.idx] >= cap)
        if (!othersClosed) ns.points = awardPoints(ns, playerIdx, hit.idx, overflow)
      }
    } else {
      // Number already closed for the owner: score while opponents have NOT closed it.
      const someOpen = ns.marks.some((m, i) => i !== playerIdx && m[hit.idx] < cap)
      if (someOpen) ns.points = awardPoints(ns, playerIdx, hit.idx, hit.n)
    }
  }

  if (ns.turnDarts >= 3) {
    ns.turnDarts = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
  }

  if (!ns.finished) checkRoundLimit(ns)
  return ns
}

function awardPoints(s: CricketState, scorer: number, targetIdx: number, marks: number): number[] {
  const pts = [...s.points]
  if (s.mode === 'cut-throat') {
    for (let i = 0; i < pts.length; i++) if (i !== scorer) pts[i] += marks * CRICKET_TARGETS[targetIdx]
  } else {
    pts[scorer] += marks * CRICKET_TARGETS[targetIdx]
  }
  return pts
}

function checkRoundLimit(s: CricketState) {
  if (s.roundLimit > 0 && s.round > s.roundLimit) {
    s.finished = true
  }
}

export function cricketWinner(s: CricketState): number | null {
  if (!s.finished) return null
  if (s.mode === 'cut-throat') return s.points.indexOf(Math.min(...s.points))
  return s.points.indexOf(Math.max(...s.points))
}

export function cricketColumns(s: CricketState): Column[] {
  const cols: Column[] = []
  for (let i = 0; i < s.players.length; i++) {
    cols.push({ key: `p${i}`, label: s.players[i].name, value: String(s.points[i]), tone: 'active' })
  }
  return cols
}

export const cricketDef: GameDef<CricketState> = {
  id: 'cricket',
  name: 'Cricket',
  tagline: 'Close 15-20 + bull, then score',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 4,
  options: cricketOptions,
  init: initCricket,
  apply: applyCricket,
  currentPlayer: (s) => s.cur,
  columns: cricketColumns,
  result: (s) => {
    const w = cricketWinner(s)
    if (w === null) return null
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.points[i] } })),
    }
  },
}
