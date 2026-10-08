// X01 (301/501/701/...) — authentic match play.
// Tracks visits (3-dart turns) the way a real chalkboard does, with busts,
// double/master in & out, legs, a checkout suggester and full stats.

import { type Throw, value, label } from '../board'
import type { GameDef, GameOption, Column } from '../core'

export type OutMode = 'straight' | 'double' | 'master'

/** One completed visit (turn) as chalked on the board. */
export type Visit = {
  darts: Throw[]
  scored: number
  bust: boolean
  out: boolean
}

export type X01State = {
  players: { id: string; name: string }[]
  start: number
  inMode: OutMode
  outMode: OutMode
  splitLegs: boolean
  legsToWin: number
  scores: number[]
  legs: number[]
  cur: number
  legNo: number
  visitDarts: Throw[]
  visitScored: number
  visits: Visit[][]
  entered: boolean[]
  dartsThrown: number[]
  pointsScored: number[]
  busts: number[]
  highestTurn: number[]
  bestFinish: number[]
  legDarts: number[]
  legOver: boolean
  matchOver: boolean
  lastWinner: number
  log: string[]
}

const isMaster = (t: Throw) => (t.n === 25 ? t.m === 50 : t.m >= 2)
const isDoubleSegment = (t: Throw) => t.n <= 20 && t.m === 2

export const x01Options: GameOption[] = [
  {
    key: 'start',
    label: 'Start score',
    choices: [
      { value: '301', label: '301' },
      { value: '501', label: '501' },
      { value: '701', label: '701' },
      { value: '901', label: '901' },
    ],
    default: '501',
  },
  {
    key: 'in',
    label: 'Begin',
    choices: [
      { value: 'straight', label: 'Straight in' },
      { value: 'double', label: 'Double in' },
    ],
    default: 'straight',
  },
  {
    key: 'out',
    label: 'Finish',
    choices: [
      { value: 'straight', label: 'Straight out' },
      { value: 'double', label: 'Double out' },
      { value: 'master', label: 'Master out' },
    ],
    default: 'double',
  },
  {
    key: 'splitLegs',
    label: 'Split legs (SA house rule)',
    choices: [
      { value: 'off', label: 'Off' },
      { value: 'on', label: 'On — left on 1, single 11 wins' },
    ],
    default: 'off',
  },
  {
    key: 'legs',
    label: 'Legs to win',
    choices: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '5', label: '5' },
      { value: '7', label: '7' },
    ],
    default: '1',
  },
]

export function initX01(players: { id: string; name: string }[], settings: Record<string, string>): X01State {
  const start = parseInt(settings['start'] ?? '501', 10)
  return {
    players,
    start,
    inMode: (settings['in'] as OutMode) ?? 'straight',
    outMode: (settings['out'] as OutMode) ?? 'double',
    splitLegs: settings['splitLegs'] === 'on',
    legsToWin: parseInt(settings['legs'] ?? '1', 10),
    scores: players.map(() => start),
    legs: players.map(() => 0),
    cur: 0,
    legNo: 1,
    visitDarts: [],
    visitScored: 0,
    visits: players.map(() => []),
    entered: players.map(() => false),
    dartsThrown: players.map(() => 0),
    pointsScored: players.map(() => 0),
    busts: players.map(() => 0),
    highestTurn: players.map(() => 0),
    bestFinish: players.map(() => 0),
    legDarts: players.map(() => 0),
    legOver: false,
    matchOver: false,
    lastWinner: -1,
    log: [],
  }
}

const finishAllowed = (s: X01State, t: Throw) =>
  s.outMode === 'straight' ? true : s.outMode === 'master' ? isMaster(t) : isDoubleSegment(t)

function startNewLeg(s: X01State, firstPlayer: number): X01State {
  return {
    ...s,
    scores: s.players.map(() => s.start),
    cur: firstPlayer,
    legNo: s.legNo + 1,
    visitDarts: [],
    visitScored: 0,
    visits: s.players.map(() => []),
    entered: s.players.map(() => false),
    legDarts: s.players.map(() => 0),
    legOver: false,
  }
}

/** Apply one dart; returns a new state (pure). Handles busts, visits, legs, match. */
export function applyX01(s: X01State, t: Throw, playerIdx: number): X01State {
  if (s.matchOver) return s
  // previous leg finished → start the next one with this throw
  if (s.legOver) s = startNewLeg(s, (s.lastWinner + 1) % s.players.length)

  const ns: X01State = {
    ...s,
    scores: [...s.scores],
    legs: [...s.legs],
    visits: s.visits.map((v) => [...v]),
    entered: [...s.entered],
    dartsThrown: [...s.dartsThrown],
    pointsScored: [...s.pointsScored],
    busts: [...s.busts],
    highestTurn: [...s.highestTurn],
    bestFinish: [...s.bestFinish],
    legDarts: [...s.legDarts],
    visitDarts: [...s.visitDarts],
    log: [...s.log],
  }

  const endVisit = (visit: Visit) => {
    ns.visits[playerIdx].push(visit)
    ns.visitDarts = []
    ns.visitScored = 0
    ns.cur = (playerIdx + 1) % ns.players.length
  }

  const current = ns.scores[playerIdx]
  const v = value(t)
  const needsEntry = ns.inMode === 'double' && !ns.entered[playerIdx]

  // Double-in failure: dart counts as thrown but scores nothing; visit continues.
  if (needsEntry && !isDoubleSegment(t)) {
    ns.dartsThrown[playerIdx]++
    ns.legDarts[playerIdx]++
    ns.visitDarts.push(t)
    if (ns.visitDarts.length >= 3) endVisit({ darts: [...ns.visitDarts], scored: 0, bust: false, out: false })
    return ns
  }

  // SA split-legs rule: from 1, a single 11 counts as a 1 — the dart splits
  // the wire between the two 1's, so only ONE is counted. That takes you to
  // exactly 0 and wins the leg.
  const splitLegsShot = ns.splitLegs && current === 1 && t.n === 11 && t.m === 1
  const effV = splitLegsShot ? 1 : v
  const newScore = current - effV
  const wouldFinish = newScore === 0 && (finishAllowed(s, t) || splitLegsShot)
  const bust =
    newScore < 0 ||
    (newScore === 0 && !finishAllowed(s, t) && !splitLegsShot) ||
    // Leaving yourself on 1 busts under double/master out — UNLESS the SA
    // split-legs rule is on, which exists precisely so you can sit on 1 and
    // take out the single 11.
    ((ns.outMode !== 'straight' && !ns.splitLegs) && newScore === 1)

  // A bust ends the visit immediately and the score stays as it was.
  if (bust) {
    ns.busts[playerIdx]++
    ns.dartsThrown[playerIdx]++
    ns.legDarts[playerIdx]++
    ns.log.push(`${ns.players[playerIdx].name}: BUST (${label(t)} from ${current})`)
    endVisit({ darts: [...ns.visitDarts, t], scored: 0, bust: true, out: false })
    return ns
  }

  ns.scores[playerIdx] = newScore
  ns.entered[playerIdx] = true
  ns.pointsScored[playerIdx] += effV
  ns.visitScored += effV
  ns.dartsThrown[playerIdx]++
  ns.legDarts[playerIdx]++
  ns.visitDarts.push(t)

  if (wouldFinish) {
    if (current > ns.bestFinish[playerIdx]) ns.bestFinish[playerIdx] = current
    ns.scores[playerIdx] = 0
    ns.visits[playerIdx].push({ darts: [...ns.visitDarts, t], scored: ns.visitScored, bust: false, out: true })
    ns.visitDarts = []
    ns.visitScored = 0
    ns.legOver = true
    ns.lastWinner = playerIdx
    ns.legs[playerIdx]++
    ns.log.push(
      splitLegsShot
        ? `${ns.players[playerIdx].name} SPLIT LEGS — the 11 splits, counts as 1, checks out from 1!`
        : `${ns.players[playerIdx].name} checks out ${current}!`,
    )
    if (ns.legs[playerIdx] >= ns.legsToWin) ns.matchOver = true
    return ns
  }

  if (ns.visitDarts.length >= 3) {
    const turnTotal = ns.visitScored
    if (turnTotal > ns.highestTurn[playerIdx]) ns.highestTurn[playerIdx] = turnTotal
    endVisit({ darts: [...ns.visitDarts], scored: turnTotal, bust: false, out: false })
  }
  return ns
}

export function x01Columns(s: X01State): Column[] {
  const cols: Column[] = []
  for (let i = 0; i < s.players.length; i++) {
    const rem = s.scores[i]
    cols.push({ key: `score${i}`, label: s.players[i].name, value: String(rem), tone: i === s.cur ? 'active' : undefined })
    cols.push({ key: `legs${i}`, label: 'Legs', value: String(s.legs[i]), tone: 'muted' })
  }
  return cols
}

/** Suggest a checkout route; last dart respects the finishing mode. */
export function suggestCheckout(remaining: number, outMode: OutMode): string | null {
  const noFinish = [159, 162, 163, 165, 166, 168, 169]
  if (remaining > 170 || remaining < 2 || noFinish.includes(remaining)) return null

  const finisher = (rem: number): string | null => {
    if (rem === 50) return 'BULL'
    if (rem === 25 && outMode === 'straight') return '25'
    if (outMode === 'double') {
      for (let n = 20; n >= 1; n--) if (n * 2 === rem) return `D${n}`
      return null
    }
    if (outMode === 'master') {
      for (let n = 20; n >= 1; n--) if (n * 2 === rem) return `D${n}`
      for (let n = 20; n >= 1; n--) if (n * 3 === rem) return `T${n}`
      return null
    }
    for (let n = 20; n >= 1; n--) if (n * 3 === rem) return `T${n}`
    for (let n = 20; n >= 1; n--) if (n * 2 === rem) return `D${n}`
    for (let n = 20; n >= 1; n--) if (n === rem) return `${n}`
    return null
  }

  const setupOrder: [number, string][] = []
  for (let n = 20; n >= 1; n--) setupOrder.push([n * 3, `T${n}`], [n, `${n}`])

  const f1 = finisher(remaining)
  if (f1) return f1
  for (const [v, lab] of setupOrder) {
    const rest = remaining - v
    if (rest >= 2) {
      const f = finisher(rest)
      if (f) return `${lab} ${f}`
    }
  }
  for (const [v, lab] of setupOrder) {
    const rest = remaining - v
    if (rest >= 2) {
      for (const [v2, lab2] of setupOrder) {
        const rest2 = rest - v2
        if (rest2 >= 2) {
          const f = finisher(rest2)
          if (f) return `${lab} ${lab2} ${f}`
        }
      }
    }
  }
  return null
}

export function x01Status(s: X01State, i: number): string {
  if (s.matchOver || s.legOver) return ''
  if (i !== s.cur) return ''
  const rem = s.scores[i]
  return suggestCheckout(rem, s.outMode) ?? 'No finish'
}

export function x01Result(s: X01State) {
  if (!s.matchOver) return null
  const winner = s.legs.indexOf(Math.max(...s.legs))
  return {
    winnerIdxs: [winner],
    summary: `${s.players[winner].name} wins the match`,
    stats: s.players.map((p, i) => ({
      playerId: p.id,
      name: p.name,
      won: i === winner,
      lines: {
        Legs: s.legs[i],
        '3-dart avg': s.dartsThrown[i] > 0 ? Number((s.pointsScored[i] / s.dartsThrown[i] * 3).toFixed(1)) : 0,
        'Best turn': s.highestTurn[i],
        'Best finish': s.bestFinish[i],
        Busts: s.busts[i],
        Darts: s.dartsThrown[i],
      },
    })),
  }
}

export const x01Def: GameDef<X01State> = {
  id: 'x01',
  name: 'X01',
  tagline: 'The classic: 301, 501, 701 and up',
  type: 'x01',
  minPlayers: 1,
  maxPlayers: 8,
  options: x01Options,
  init: initX01,
  apply: applyX01,
  currentPlayer: (s) => s.cur,
  columns: x01Columns,
  result: x01Result,
  status: x01Status,
}
