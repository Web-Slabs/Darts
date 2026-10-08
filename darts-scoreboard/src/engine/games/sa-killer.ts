// SA Killer — faithful TypeScript port of "KILLER ( NEW ).xlsm" (Web-Slabs house game).
//
// Core rules (from the workbook's VBA, verbatim behaviour):
//   • Two players share one spine: numbers 20→10 plus the D, T and B channels.
//   • A single hit marks the NUMBER channel of that row; ANY double marks the
//     player's D channel; ANY treble the T channel; ANY bull the B channel.
//   • 3 X's on a channel = OPEN for scoring. While open:
//       number channel pays +N per further single on that row
//       D channel pays +2N per further double (N = the row hit)
//       T channel pays +3N per further treble
//       B channel pays +25 per further bull (flat, per the macro)
//   • If BOTH players have 3 X's on the SAME channel it is CLOSED (dead):
//     struck through in red, no scoring for anyone through it. Channels are
//     independent — dead 20s never block an open T channel (T20 still pays 60).
//   • Turns rotate automatically after every 3 darts.
//   • Winner: higher total when the game is ended, or first to the points
//     target if one is set.
//
// Optional house starters (all default OFF, selectable in setup):
//   bull-off · opening shot (D/T/B) · close shot (D/T/B) · points target · legs.

import { type Throw, mk } from '../board'
import type { GameDef, GameOption, Column } from '../core'

export type ShotRule = 'none' | 'double' | 'treble' | 'bull'

export type SaCellKey = `n${number}` | 'D' | 'T' | 'B'

export type SaPlayerState = {
  id: string
  name: string
  marks: Record<SaCellKey, number> // X count per channel (3 = open)
  opened: boolean // optional opening-shot rule
  legs: number
}

/** Points earned per channel row — chalked in the row's score box. */
export type RowScores = Record<SaCellKey, number>

export const emptyRowScores = (): RowScores => {
  const r: Record<string, number> = {}
  for (const n of SA_NUMBERS) r[`n${n}`] = 0
  r['D'] = 0
  r['T'] = 0
  r['B'] = 0
  return r as RowScores
}

export type SaPhase = 'bulloff' | 'play'

export type SaKillerState = {
  players: SaPlayerState[]
  openRule: ShotRule
  closeRule: ShotRule
  target: number | null
  legsToWin: number
  bullOff: boolean
  phase: SaPhase
  cur: number
  visitDarts: number
  legOver: boolean
  matchOver: boolean
  endedManually: boolean
  lastWinner: number
  scores: number[]
  /** Per-player, per-channel points (the PUMA board's score boxes). */
  rowScores: RowScores[]
  log: string[]
}

export const SA_NUMBERS: readonly number[] = [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10]

export const saKillerOptions: GameOption[] = [
  {
    key: 'bullOff',
    label: '② Bull-off for first throw (optional)',
    choices: [
      { value: 'off', label: 'No bull-off' },
      { value: 'on', label: 'Bull-off (record winner)' },
    ],
    default: 'off',
  },
  {
    key: 'open',
    label: 'Opening shot required (optional)',
    choices: [
      { value: 'none', label: 'None — score from dart 1' },
      { value: 'double', label: 'Open with a double' },
      { value: 'treble', label: 'Open with a treble' },
      { value: 'bull', label: 'Open with a bull' },
    ],
    default: 'none',
  },
  {
    key: 'close',
    label: 'Close shot wins while ahead (optional)',
    choices: [
      { value: 'none', label: 'None' },
      { value: 'double', label: 'Close with a double' },
      { value: 'treble', label: 'Close with a treble' },
      { value: 'bull', label: 'Close with a bull' },
    ],
    default: 'none',
  },
  {
    key: 'target',
    label: 'Points target (optional)',
    choices: [
      { value: 'none', label: 'None — highest total wins' },
      { value: '200', label: '200' },
      { value: '301', label: '301' },
      { value: '501', label: '501' },
    ],
    default: 'none',
  },
  {
    key: 'legs',
    label: 'Legs to win (with a target)',
    choices: [
      { value: '1', label: '1' },
      { value: '2', label: '2' },
      { value: '3', label: '3' },
    ],
    default: '1',
  },
]

const emptyMarks = (): Record<SaCellKey, number> => {
  const m: Record<string, number> = {}
  for (const n of SA_NUMBERS) m[`n${n}`] = 0
  m['D'] = 0
  m['T'] = 0
  m['B'] = 0
  return m as Record<SaCellKey, number>
}

export function initSaKiller(players: { id: string; name: string }[], settings: Record<string, string>): SaKillerState {
  const target = settings['target'] && settings['target'] !== 'none' ? parseInt(settings['target'], 10) : null
  return {
    players: players.slice(0, 2).map((p) => ({ ...p, marks: emptyMarks(), opened: false, legs: 0 })),
    openRule: (settings['open'] as ShotRule) ?? 'none',
    closeRule: (settings['close'] as ShotRule) ?? 'none',
    target,
    legsToWin: parseInt(settings['legs'] ?? '1', 10),
    bullOff: settings['bullOff'] === 'on',
    phase: settings['bullOff'] === 'on' ? 'bulloff' : 'play',
    cur: 0,
    visitDarts: 0,
    legOver: false,
    matchOver: false,
    endedManually: false,
    lastWinner: -1,
    scores: players.slice(0, 2).map(() => 0),
    rowScores: players.slice(0, 2).map(() => emptyRowScores()),
    log: [],
  }
}

/** Which channel does this dart feed? */
export const cellFor = (t: Throw): SaCellKey | null => {
  if (t.n === 25) return t.m >= 25 ? 'B' : null
  if (t.n < 1 || t.n > 20) return null
  if (t.m === 2) return 'D'
  if (t.m === 3) return 'T'
  if (t.m === 1) return `n${t.n}` as SaCellKey
  return null
}

/** What an open channel pays for this dart (0 when the dart feeds no channel). */
export const payFor = (t: Throw): number => {
  if (t.n === 25) return t.m >= 25 ? 25 : 0 // flat 25 per the macro (any bull)
  if (t.n < 1 || t.n > 20) return 0
  if (t.m === 2) return 2 * t.n
  if (t.m === 3) return 3 * t.n
  if (t.m === 1) return t.n
  return 0
}

const opensWith = (t: Throw, rule: ShotRule) =>
  rule === 'none'
    ? true
    : rule === 'bull'
      ? t.n === 25 && t.m >= 25
      : rule === 'treble'
        ? t.n <= 20 && t.m === 3
        : t.n <= 20 && t.m === 2

/**
 * Start the next leg after one ends (the losing player throws first, matching
 * X01's convention). Clears the chalk: marks, score boxes and totals.
 */
export function saNextLeg(s: SaKillerState): SaKillerState {
  const legNo = s.players[0].legs + s.players[1].legs + 1
  return {
    ...s,
    phase: 'play',
    cur: (s.lastWinner + 1) % s.players.length,
    visitDarts: 0,
    legOver: false,
    endedManually: false,
    scores: s.players.map(() => 0),
    rowScores: s.players.map(() => emptyRowScores()),
    players: s.players.map((p) => ({ ...p, marks: emptyMarks(), opened: false })),
    log: [...s.log, `— Leg ${legNo} begins —`],
  }
}

/** Record the bull-off winner (only used when the bull-off option is on). */
export function saBullOff(s: SaKillerState, winnerIdx: number): SaKillerState {
  return {
    ...s,
    phase: 'play',
    cur: winnerIdx,
    log: [...s.log, `🎯 Bull-off: ${s.players[winnerIdx].name} was closest to the cherry — throws first. The game is NOT over; play starts now.`],
  }
}

/**
 * Needs-to-win: what each player should hit next to score/win right now.
 * Returns one short instruction per player: the highest-paying legal dart.
 */
export function needsToWin(s: SaKillerState): string[] {
  return s.players.map((p, i) => {
    const opp = s.players[1 - i]
    let best = { pay: 0, text: 'open a channel — any channel needs 3 X\u2019s' }
    for (const cell of Object.keys(p.marks) as SaCellKey[]) {
      const mine = p.marks[cell]
      const theirs = opp.marks[cell]
      if (mine >= 3 && theirs < 3) {
        // open channel: what pays best through it?
        if (cell === 'B') {
          if (best.pay < 25) best = { pay: 25, text: 'BULL — pays 25' }
        } else if (cell === 'D') {
          if (best.pay < 40) best = { pay: 40, text: 'DUB 20 — pays 40' }
        } else if (cell === 'T') {
          if (best.pay < 60) best = { pay: 60, text: 'TRIP 20 — pays 60' }
        } else {
          const n = Number(cell.slice(1))
          if (best.pay < n) best = { pay: n, text: `single ${n} — pays ${n}` }
        }
      } else if (mine < 3 && theirs < 3) {
        // still marking: one dart = one X — tell them what's left to open
        const left = 3 - mine
        if (best.pay < 1) {
          best = cell.startsWith('n')
            ? { pay: 1, text: `${left} more X on ${cell.slice(1)} to open it (hit ${cell.slice(1)}, or DUB/TRIP ${cell.slice(1)} and choose ${cell.slice(1)})` }
            : { pay: 1, text: `${left} more X on ${cell} to open it (hit any ${cell === 'B' ? 'bull' : cell === 'D' ? 'dub' : 'treble'})` }
        }
      }
    }
    return best.text
  })
}

function winLeg(s: SaKillerState, playerIdx: number, why: string): SaKillerState {
  const ns = { ...s, legOver: true, lastWinner: playerIdx, log: [...s.log, why] }
  ns.players = ns.players.map((p, i) => (i === playerIdx ? { ...p, legs: p.legs + 1 } : p))
  if (ns.players[playerIdx].legs >= ns.legsToWin) {
    ns.matchOver = true
    ns.log.push(`🏆 ${s.players[playerIdx].name} wins the match`)
  }
  return ns
}

/** Chalk one X into a player's channel (the scorer tapping the board by hand). */
export function chalkSaKiller(s: SaKillerState, playerIdx: number, cell: SaCellKey): SaKillerState {
  if (s.matchOver || s.legOver || s.phase === 'bulloff') return s
  const me = s.players[playerIdx]
  const marks = me.marks[cell]
  if (marks >= 3) return s // already open — nothing to chalk
  const ns: SaKillerState = {
    ...s,
    players: s.players.map((p, i) =>
      i === playerIdx ? { ...p, marks: { ...p.marks, [cell]: marks + 1 } } : p,
    ),
    log: [...s.log],
  }
  const now = ns.players[playerIdx].marks[cell]
  if (now === 3) {
    const oppFull = ns.players[1 - playerIdx].marks[cell] >= 3
    ns.log.push(oppFull ? `${me.name}'s ${cell} opens — but the channel is CLOSED (both 3 X's)` : `${me.name} opens the ${cell} channel`)
  }
  return ns
}

/**
 * The throw a manual chalk tap stands for. Number boxes chalk as singles; the
 * D / T / B boxes chalk as D20 / T20 / bull (their rows don't exist on the
 * board — the X is what matters).
 */
export const throwForCell = (cell: SaCellKey): Throw =>
  cell === 'D' ? mk(20, 2) : cell === 'T' ? mk(20, 3) : cell === 'B' ? mk(25, 25) : mk(Number(cell.slice(1)), 1)

/**
 * Apply a dart where the player CHOOSES how a double/treble counts (SA house
 * rule): a D20 can be chalked as 1 X in the D channel, or as 2 X's on 20 —
 * "either 1× dub's or 2× 20's" — and likewise T20 = 1 T-X or 3 X's on 20.
 * `asNumber: true` chalks the number channel instead of the D/T channel.
 * Bulls always feed the B channel (a bull is never 25 singles on 20).
 */
export function chalkSaKillerChoice(
  s: SaKillerState,
  playerIdx: number,
  t: Throw,
  asNumber: boolean,
): SaKillerState {
  const cell = cellFor(t)
  if (!cell) return s
  if (t.m >= 2 && t.n <= 20) {
    // D/T: route to the number channel when the player chooses.
    return asNumber ? chalkSaKiller(s, playerIdx, `n${t.n}` as SaCellKey) : chalkSaKiller(s, playerIdx, cell)
  }
  return chalkSaKiller(s, playerIdx, cell)
}

/**
 * Score a throw where the player chooses how a double/treble counts: the dart
 * can score through the D/T channel (2N/3N) or, if the number channel is open,
 * pay its face multiple straight onto the number row (D20 = 2×20 = 40 via 20).
 * `asNumber: true` = "2× 20's" instead of "1× dub".
 */
export function applySaKillerChoice(
  s: SaKillerState,
  playerIdx: number,
  t: Throw,
  asNumber: boolean,
): SaKillerState {
  if (t.m >= 2 && t.n <= 20 && asNumber) {
    // Route the dart through the number channel: 2 or 3 X's-on-20 worth of pay.
    const cell = `n${t.n}` as SaCellKey
    const ns: SaKillerState = {
      ...s,
      players: s.players.map((p) => ({ ...p, marks: { ...p.marks } })),
      rowScores: s.rowScores.map((r) => ({ ...r })),
      scores: [...s.scores],
      log: [...s.log],
    }
    const me = ns.players[playerIdx]
    const opp = ns.players[1 - playerIdx]
    if (me.marks[cell] >= 3 && opp.marks[cell] < 3) {
      const pay = t.m * t.n
      ns.scores[playerIdx] += pay
      ns.rowScores[playerIdx] = { ...ns.rowScores[playerIdx], [cell]: ns.rowScores[playerIdx][cell] + pay }
      ns.log.push(`${me.name} scores ${pay} (${t.m === 2 ? 'dub' : 'trip'} ${t.n} as ${t.m}× ${t.n}'s)`)
      // Target + close-shot win checks MUST run here too — this path has its
      // own rotation and used to early-return past them, so a player racing to
      // a points target through the choice dialog could never win the leg.
      // (Caught by the option audit.)
      if (ns.target !== null && ns.scores[playerIdx] >= ns.target) {
        return winLeg(ns, playerIdx, `🏆 ${me.name} reaches ${ns.target} and wins the leg`)
      }
      if (ns.closeRule !== 'none' && opensWith(t, ns.closeRule) && ns.scores[playerIdx] > ns.scores[1 - playerIdx]) {
        return winLeg(ns, playerIdx, `🔔 ${me.name} CLOSES the leg with the ${ns.closeRule} while ahead`)
      }
    } else if (me.marks[cell] < 3) {
      // A dub counts as ONE dart with two rings of chalk: it adds exactly ONE
      // X per dart (the choice is which channel the X lands in, not how many).
      me.marks[cell] = me.marks[cell] + 1
      ns.log.push(`${me.name} chalks 1 X on ${t.n} (${t.m === 2 ? 'dub' : 'trip'} ${t.n} as ${t.m}× ${t.n}'s)`)
      if (me.marks[cell] === 3) {
        const dead = opp.marks[cell] >= 3
        ns.log.push(dead ? `${cell} is CLOSED (both 3 X's)` : `${me.name} opens the ${cell} channel`)
      }
    }
    // rotation
    ns.visitDarts++
    if (ns.visitDarts >= 3) {
      ns.visitDarts = 0
      ns.cur = 1 - playerIdx
    }
    return ns
  }
  return applySaKiller(s, t, playerIdx)
}

export function applySaKiller(s: SaKillerState, t: Throw, playerIdx: number): SaKillerState {
  if (s.matchOver || s.legOver || s.phase === 'bulloff') return s

  const ns: SaKillerState = {
    ...s,
    players: s.players.map((p) => ({ ...p, marks: { ...p.marks } })),
    scores: [...s.scores],
    // copy rowScores deeply — the spread alone keeps the array (and its row
    // objects) by reference, and StrictMode's double-invoked updaters would
    // then chalk every payout twice.
    rowScores: s.rowScores.map((r) => ({ ...r })),
    log: [...s.log],
  }
  const me = ns.players[playerIdx]
  const opp = ns.players[1 - playerIdx]

  // Optional opening-shot rule: no marks, no score before it lands.
  if (ns.openRule !== 'none' && !me.opened) {
    if (opensWith(t, ns.openRule)) {
      me.opened = true
      ns.log.push(`${me.name} OPENS with the ${ns.openRule}`)
    } else {
      ns.log.push(`${me.name} needs a ${ns.openRule} to open`)
    }
    ns.visitDarts++
    if (ns.visitDarts >= 3) {
      ns.visitDarts = 0
      ns.cur = 1 - playerIdx
    }
    return ns
  }

  const cell = cellFor(t)
  if (cell) {
    const mine = me.marks[cell]
    if (mine < 3) {
      // Marking phase: chalk the X (an X that completes the set opens the channel).
      me.marks[cell] = mine + 1
      if (mine + 1 === 3) {
        const dead = opp.marks[cell] >= 3
        ns.log.push(dead ? `${me.name}'s ${cell} CLOSED (both 3 X's — dead)` : `${me.name} opens the ${cell} channel`)
      }
    } else if (opp.marks[cell] < 3) {
      // Open and not dead: pay through the channel.
      const pay = payFor(t)
      if (pay > 0) {
        ns.scores[playerIdx] += pay
        ns.rowScores[playerIdx] = { ...ns.rowScores[playerIdx], [cell]: ns.rowScores[playerIdx][cell] + pay }
        ns.log.push(`${me.name} scores ${pay} through ${cell} (${t.n === 25 ? 'bull' : t.m === 1 ? 'single' : t.m === 2 ? 'double' : 'treble'} ${t.n === 25 ? '' : t.n})`.replace(/\s+/g, ' ').trim())
      }
    }
    // else: dead channel — nothing.
  }

  // Optional points target.
  if (ns.target !== null && ns.scores[playerIdx] >= ns.target) {
    return winLeg(ns, playerIdx, `🏆 ${me.name} reaches ${ns.target} and wins the leg`)
  }

  // Optional close shot while ahead.
  if (ns.closeRule !== 'none' && opensWith(t, ns.closeRule) && ns.scores[playerIdx] > ns.scores[1 - playerIdx]) {
    return winLeg(ns, playerIdx, `🔔 ${me.name} CLOSES the leg with the ${ns.closeRule} while ahead`)
  }

  ns.visitDarts++
  if (ns.visitDarts >= 3) {
    ns.visitDarts = 0
    ns.cur = 1 - playerIdx
  }
  return ns
}

/** End a targetless game: higher total wins (table action). */
export function endSaKiller(s: SaKillerState): SaKillerState {
  if (s.matchOver) return s
  const w = s.scores[0] === s.scores[1] ? -1 : s.scores[0] > s.scores[1] ? 0 : 1
  return {
    ...s,
    endedManually: true,
    matchOver: true,
    lastWinner: w,
    log: [...s.log, w === -1 ? 'Game ended — a tie' : `Game ended — ${s.players[w].name} wins on points`],
  }
}

/** VBA colour states for the board: 'empty' | 'marking' | 'open' | 'dead'. */
export function channelState(s: SaKillerState, playerIdx: number, cell: SaCellKey): 'empty' | 'marking' | 'open' | 'dead' {
  const mine = s.players[playerIdx].marks[cell] ?? 0
  const theirs = s.players[1 - playerIdx].marks[cell] ?? 0
  if (mine >= 3 && theirs >= 3) return 'dead'
  if (mine >= 3) return 'open'
  if (mine > 0) return 'marking'
  return 'empty'
}

export function saKillerColumns(s: SaKillerState): Column[] {
  return [
    ...s.players.map((p, i) => ({
      key: `p${i}`,
      label: p.name,
      value: String(s.scores[i]),
      tone: (i === s.cur && !s.matchOver && !s.legOver ? 'active' : undefined) as Column['tone'],
    })),
  ]
}

export function saKillerStatus(s: SaKillerState, i: number): string {
  if (s.phase === 'bulloff') return 'Bull-off: closest to the cherry throws first — record the winner below'
  if (i !== s.cur) return ''
  return '3 darts — mark your channels; open channels score'
}

export const saKillerDef: GameDef<SaKillerState> = {
  id: 'sa-killer',
  name: 'SA Killer',
  tagline: 'Open channels with 3 X\u2019s · both 3 = closed · highest total wins',
  type: 'killer-family',
  minPlayers: 2,
  maxPlayers: 2,
  options: saKillerOptions,
  init: initSaKiller,
  apply: applySaKiller,
  currentPlayer: (s) => s.cur,
  columns: saKillerColumns,
  status: saKillerStatus,
  actions: (s) => {
    const acts: { label: string; perform: (state: SaKillerState) => SaKillerState }[] = []
    if (s.phase === 'bulloff') {
      s.players.forEach((p, i) =>
        acts.push({ label: `${p.name} won the bull-off`, perform: (state) => saBullOff(state, i) }),
      )
    }
    if (s.legOver && !s.matchOver) {
      const first = s.players[(s.lastWinner + 1) % s.players.length].name
      acts.push({ label: `Next leg — ${first} throws first`, perform: (state) => saNextLeg(state) })
    }
    if (!s.matchOver && !s.legOver && s.target === null) {
      acts.push({ label: 'End game — highest total wins', perform: endSaKiller })
    }
    return acts
  },
  result: (s) => {
    if (!s.matchOver) return null
    const w = s.lastWinner
    if (w < 0) {
      return {
        winnerIdxs: [],
        summary: 'A tie',
        stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: false, lines: { Points: s.scores[i] } })),
      }
    }
    const byLegs = s.players.some((p) => p.legs > 0)
    const summary = byLegs
      ? `${s.players[w].name} wins the match`
      : `${s.players[w].name} wins on points (${s.scores[0]}–${s.scores[1]})`
    return {
      winnerIdxs: [w],
      summary,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.scores[i], Legs: p.legs } })),
    }
  },
}
