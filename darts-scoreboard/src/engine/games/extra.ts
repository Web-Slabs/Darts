// Extra games from research: Scram, English Cricket, Steeplechase, Follow Me,
// Bobs 27, Tic-Tac-Toe. Same conventions as more.ts.

import { type Throw, value } from '../board'
import type { GameDef, GameOption, Column } from '../core'

/* =============================== Scram =============================== */

// Two-phase game (rules researched: gldproducts.com, dartspiks.com). The
// Stopper throws first each phase and closes a number with a single hit of any
// kind (a double or treble still closes just that one number); the Scorer
// throws next and piles up face value on whatever is still open. No bull.
// When all 20 are closed the roles swap and the board resets; the better
// Scoring phase wins the game.

export type ScramState = {
  players: { id: string; name: string }[]
  closed: boolean[]
  phase: 1 | 2
  scores: number[]
  cap: number
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

export const scramOptions: GameOption[] = [
  {
    key: 'cap',
    label: 'Round cap per phase',
    choices: [
      { value: '20', label: '20 rounds' },
      { value: '30', label: '30 rounds' },
      { value: '50', label: '50 rounds' },
    ],
    default: '30',
  },
]

export function initScram(players: { id: string; name: string }[], settings: Record<string, string>): ScramState {
  return {
    players,
    closed: Array.from({ length: 20 }, () => false),
    phase: 1,
    scores: players.map(() => 0),
    cap: parseInt(settings['cap'] ?? '30', 10) || 30,
    cur: 0,
    td: 0,
    round: 1,
    finished: false,
    log: [],
  }
}

function swapScramRoles(ns: ScramState) {
  if (ns.phase === 1) {
    ns.phase = 2
    ns.cur = 1 // the new stopper (original scorer) throws first
    ns.round = 1
    ns.td = 0
    ns.closed = Array.from({ length: 20 }, () => false)
    ns.log.push(`🔄 Roles swap — ${ns.players[1].name} now stops, ${ns.players[0].name} scores`)
  } else {
    ns.finished = true
    const w = ns.scores.indexOf(Math.max(...ns.scores))
    ns.log.push(`🏁 ${ns.players[w].name} wins the scram ${ns.scores[0]}–${ns.scores[1]}!`)
  }
}

export function applyScram(s: ScramState, t: Throw, playerIdx: number): ScramState {
  if (s.finished) return s
  const ns: ScramState = { ...s, closed: [...s.closed], scores: [...s.scores], log: [...s.log] }
  const stopper = ns.phase === 1 ? 0 : 1
  const scorer = 1 - stopper

  if (playerIdx === stopper) {
    // one hit of any kind closes the number (miss does nothing)
    if (t.n >= 1 && t.n <= 20) ns.closed[t.n - 1] = true
  } else if (t.n >= 1 && t.n <= 20 && !ns.closed[t.n - 1]) {
    // scorer: full face value on open numbers, nothing on closed ones
    ns.scores[scorer] += value(t)
  }

  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    if (ns.closed.every(Boolean)) {
      swapScramRoles(ns)
    } else {
      ns.cur = (ns.cur + 1) % 2
      if (ns.cur === 0) ns.round++
      if (ns.round > ns.cap) {
        ns.log.push(`⏱ Round cap — ${ns.players[scorer].name}'s scoring phase ends`)
        swapScramRoles(ns)
      }
    }
  }
  return ns
}

export const scramColumns = (s: ScramState): Column[] =>
  s.players.map((p, i) => ({
    key: `p${i}`,
    label: `${p.name}${(s.phase === 1 ? 0 : 1) === i ? ' (stopping)' : ' (scoring)'}`,
    value: `${s.scores[i]}`,
    tone: i === s.cur ? 'active' : undefined,
  }))

export const scramDef: GameDef<ScramState> = {
  id: 'scram',
  name: 'Scram',
  tagline: 'Stopper vs Scorer — close the board, then swap',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 2,
  options: scramOptions,
  init: initScram,
  apply: applyScram,
  currentPlayer: (s) => s.cur,
  columns: scramColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.scores.indexOf(Math.max(...s.scores))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins the scram ${s.scores[0]}–${s.scores[1]}`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.scores[i] } })),
    }
  },
  status: (s, pi) => {
    const stopper = s.phase === 1 ? 0 : 1
    const open = s.closed.filter((c) => !c).length
    return pi === stopper ? `Stopper — ${open} number${open === 1 ? '' : 's'} still open` : 'Scorer — pile on the open numbers'
  },
}

/* =============================== English Cricket =============================== */

// The pub classic (rules researched: greenman / classic rule sheets). The
// batsman's 3-dart hand scores runs = hand total − 40 (40 or under scores
// nothing). The bowler throws for the bull: outer bull takes 1 wicket, inner
// bull takes 2, and every bowler dart that misses the bull gifts the batsman
// its face value as runs. Ten wickets end the innings; then roles swap and the
// second batsman chases the first total. Most runs wins — a tie is a tie.

export type EngCricketState = {
  players: { id: string; name: string }[]
  /** current batter: 0 in innings 1, 1 in innings 2 */
  batter: 0 | 1
  runs: number[]
  visitSum: number
  wickets: number
  innings: 1 | 2
  firstInningsRuns: number
  cur: number
  td: number
  finished: boolean
  log: string[]
}

export function initEnglishCricket(players: { id: string; name: string }[], _settings: Record<string, string>): EngCricketState {
  return {
    players,
    batter: 0,
    runs: players.map(() => 0),
    visitSum: 0,
    wickets: 0,
    innings: 1,
    firstInningsRuns: 0,
    cur: 0,
    td: 0,
    finished: false,
    log: [],
  }
}

function endEnglishInnings(ns: EngCricketState) {
  if (ns.innings === 1) {
    ns.firstInningsRuns = ns.runs[0]
    ns.innings = 2
    ns.batter = 1
    ns.wickets = 0
    ns.visitSum = 0
    ns.td = 0
    ns.cur = 1 // the new batsman faces first
    ns.log.push(`🏏 Innings break — ${ns.players[0].name} made ${ns.firstInningsRuns}; ${ns.players[1].name} needs ${ns.firstInningsRuns + 1}`)
  } else {
    ns.finished = true
    if (ns.runs[1] >= ns.firstInningsRuns + 1) {
      ns.log.push(`🏁 ${ns.players[1].name} chases it down!`)
    } else if (ns.runs[1] === ns.firstInningsRuns) {
      ns.log.push('🤝 Scores level — a tie!')
    } else {
      ns.log.push(`🏁 ${ns.players[0].name} defends the total — ${ns.players[1].name} all out ${ns.runs[1]}`)
    }
  }
}

export function applyEnglishCricket(s: EngCricketState, t: Throw, playerIdx: number): EngCricketState {
  if (s.finished) return s
  const ns: EngCricketState = { ...s, runs: [...s.runs], log: [...s.log] }

  if (playerIdx === ns.batter) {
    ns.visitSum += value(t)
  } else {
    if (t.n === 25) {
      ns.wickets += t.m === 50 ? 2 : 1
    } else {
      // every dart that misses the bull gifts its value to the batsman
      ns.runs[ns.batter] += value(t)
    }
    if (ns.wickets >= 10) {
      ns.log.push(`🎳 That's ten — ${ns.players[ns.batter].name} is all out!`)
      endEnglishInnings(ns)
      return ns
    }
  }

  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    if (playerIdx === ns.batter) {
      const hand = ns.visitSum
      const runs = Math.max(0, hand - 40)
      ns.runs[ns.batter] += runs
      ns.visitSum = 0
      ns.log.push(`🏏 ${ns.players[ns.batter].name}'s hand: ${hand} → ${runs} run${runs === 1 ? '' : 's'}`)
      if (ns.innings === 2 && ns.runs[1] >= ns.firstInningsRuns + 1) {
        ns.finished = true
        ns.log.push(`🏁 ${ns.players[1].name} passes ${ns.firstInningsRuns} and wins!`)
        return ns
      }
    }
    ns.cur = ns.cur === 0 ? 1 : 0
  }
  return ns
}

export const englishCricketColumns = (s: EngCricketState): Column[] =>
  s.players.map((p, i) => ({
    key: `p${i}`,
    label: p.name,
    value: i === s.batter ? `${s.runs[i]}` : `${s.wickets} wkts`,
    tone: i === s.cur ? 'active' : undefined,
  }))

export const englishCricketDef: GameDef<EngCricketState> = {
  id: 'english-cricket',
  name: 'English Cricket',
  tagline: 'Batsman vs bowler — runs over 40, wickets on the bull',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 2,
  init: initEnglishCricket,
  apply: applyEnglishCricket,
  currentPlayer: (s) => s.cur,
  columns: englishCricketColumns,
  result: (s) => {
    if (!s.finished) return null
    const tie = s.runs[1] === s.firstInningsRuns
    const w = tie ? -1 : s.runs[1] >= s.firstInningsRuns + 1 ? 1 : 0
    return {
      winnerIdxs: tie ? [0, 1] : [w],
      summary: tie ? 'Scores level — a tie!' : `${s.players[w].name} wins by ${Math.abs(s.runs[0] - s.runs[1])} runs`,
      stats: s.players.map((p, i) => ({
        playerId: p.id,
        name: p.name,
        won: tie || i === w,
        lines: { Runs: s.runs[i] },
      })),
    }
  },
  status: (s, pi) => {
    if (pi === s.batter) {
      return s.innings === 2 ? `Batting — need ${s.firstInningsRuns + 1} to win` : 'Batting — hands over 40 score runs'
    }
    return `Bowling — ${10 - s.wickets} wicket${10 - s.wickets === 1 ? '' : 's'} to take`
  },
}

/* =============================== Steeplechase =============================== */

export type SteepleState = {
  players: { id: string; name: string }[]
  hurdle: number[]
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

// Hurdles: the classic route 20-1-18-4-13... then 11-14-9-12-5 finish (board order),
// using doubles/trebles/bull as jumps. We use the simplified 20→5 clockwise sequence.
const HURDLES = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5]

export function initSteeple(players: { id: string; name: string }[], _settings: Record<string, string>): SteepleState {
  return { players, hurdle: players.map(() => 0), cur: 0, td: 0, round: 1, finished: false, log: [] }
}

export function applySteeple(s: SteepleState, t: Throw, playerIdx: number): SteepleState {
  if (s.finished) return s
  const ns: SteepleState = { ...s, hurdle: [...s.hurdle], log: [...s.log] }
  const need = HURDLES[ns.hurdle[playerIdx]]
  if (t.n === need) ns.hurdle[playerIdx]++
  if (ns.hurdle[playerIdx] >= HURDLES.length) {
    ns.finished = true
    ns.log.push(`🏁 ${ns.players[playerIdx].name} clears the final hurdle and WINS!`)
    return ns
  }
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
  }
  return ns
}

export const steeplechaseDef: GameDef<SteepleState> = {
  id: 'steeplechase',
  name: 'Steeplechase',
  tagline: 'Race around the board in clock order 20→5',
  type: 'race',
  minPlayers: 1,
  maxPlayers: 8,
  init: initSteeple,
  apply: applySteeple,
  currentPlayer: (s) => s.cur,
  columns: (s) =>
    s.players.map((p, i) => ({
      key: `p${i}`,
      label: p.name,
      value: `Hurdle ${Math.min(s.hurdle[i] + 1, 20)}/20`,
      tone: (i === s.cur ? 'active' : undefined) as Column['tone'],
    })),
  result: (s) =>
    s.finished
      ? {
          winnerIdxs: [s.cur],
          summary: `${s.players[s.cur].name} wins the Steeplechase!`,
          stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === s.cur, lines: { Hurdle: s.hurdle[i] } })),
        }
      : null,
  guide: {
    objective: 'A horse race around the board: clear all 20 "hurdles" — the segments in clockwise order starting at 20 — before anyone else.',
    setup: ['Hurdle order = board order: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5.', 'Any part of the segment clears the hurdle (singles, doubles, trebles all count).'],
    play: ['Throw 3 darts per turn.', 'Hit the current hurdle segment to advance; everything else is a no-score.', 'The awkward low numbers (3, 4, 5) are where races are lost.'],
    winning: 'First player to clear hurdle 20 (segment 5).',
    tips: ['Learn the board order — the race is won on muscle memory.', 'Small segments cluster late: 11, 14, 9, 12, 5 need calm darts.'],
  },
}

/* =============================== Follow Me =============================== */

export type FollowMeState = {
  players: { id: string; name: string }[]
  target: number
  lives: number[]
  hitThisVisit: boolean[]
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

export function initFollowMe(players: { id: string; name: string }[], _settings: Record<string, string>): FollowMeState {
  return { players, target: 20, lives: players.map(() => 3), hitThisVisit: players.map(() => false), cur: 0, td: 0, round: 1, finished: false, log: [] }
}

export function applyFollowMe(s: FollowMeState, t: Throw, playerIdx: number): FollowMeState {
  if (s.finished) return s
  const ns: FollowMeState = { ...s, lives: [...s.lives], hitThisVisit: [...s.hitThisVisit], log: [...s.log] }
  if (t.n === ns.target) {
    ns.hitThisVisit[playerIdx] = true
    ns.target = ((t.n % 20) + 1) as number // next number up from the hit
  }
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    // a visit with no hit on the target costs a life
    if (!ns.hitThisVisit[playerIdx]) {
      ns.lives[playerIdx]--
      ns.log.push(`${ns.players[playerIdx].name} misses — ${Math.max(0, ns.lives[playerIdx])} lives left`)
      if (ns.lives[playerIdx] <= 0) ns.log.push(`💀 ${ns.players[playerIdx].name} is out`)
    }
    ns.hitThisVisit[playerIdx] = false
    const alive = ns.players.map((_, i) => i).filter((i) => ns.lives[i] > 0)
    if (alive.length <= 1) {
      ns.finished = true
      if (alive.length === 1) ns.log.push(`🏆 ${ns.players[alive[0]].name} outlasts everyone!`)
      return ns
    }
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
  }
  return ns
}

export const followMeDef: GameDef<FollowMeState> = {
  id: 'follow-me',
  name: 'Follow Me',
  tagline: 'Hit the target, set the next — miss and lose a life',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 8,
  init: initFollowMe,
  apply: applyFollowMe,
  currentPlayer: (s) => s.cur,
  columns: (s) => [
    { key: 'target', label: 'Target', value: String(s.target), tone: 'muted' },
    ...s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: '❤'.repeat(s.lives[i]) || 'OUT', tone: (s.lives[i] === 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  ],
  result: (s) => {
    if (!s.finished) return null
    const alive = s.players.map((_, i) => i).filter((i) => s.lives[i] > 0)
    const w = alive.length === 1 ? alive[0] : -1
    return {
      winnerIdxs: w >= 0 ? [w] : [],
      summary: w >= 0 ? `${s.players[w].name} outlasts everyone` : 'All out!',
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { 'Lives left': Math.max(0, s.lives[i]) } })),
    }
  },
  guide: {
    objective: 'Hit the current target number with any dart to "pass the baton" — the next player must hit the number one higher. Miss three times and you are out.',
    setup: ['Start at 20.', 'Any hit on the target (single/double/treble) counts.'],
    play: [
      'Each player throws 3 darts; if any dart hits the target, the next target is the following number (target 20 → 1).',
      'If nobody in the visit hits the target, that player loses a life (3 lives each).',
      'Last player with lives wins.',
    ],
    winning: 'Outlast the other players.',
    tips: ['The wrap from 20 to 1 catches people out.', 'Wide segments (20, 12, 5) are your friends.'],
  },
}

/* =============================== Bobs 27 =============================== */

export type Bobs27State = {
  players: { id: string; name: string }[]
  target: number[]
  score: number[]
  alive: boolean[]
  done: boolean[]
  visitHit: boolean[]
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

export function initBobs27(players: { id: string; name: string }[], _settings: Record<string, string>): Bobs27State {
  return { players, target: players.map(() => 20), score: players.map(() => 27), alive: players.map(() => true), done: players.map(() => false), visitHit: players.map(() => false), cur: 0, td: 0, round: 1, finished: false, log: [] }
}

export function applyBobs27(s: Bobs27State, t: Throw, playerIdx: number): Bobs27State {
  if (s.finished) return s
  const ns: Bobs27State = { ...s, score: [...s.score], alive: [...s.alive], target: [...s.target], done: [...s.done], visitHit: [...s.visitHit], log: [...s.log] }
  if (!ns.alive[playerIdx] || ns.done[playerIdx]) {
    ns.td++
    if (ns.td >= 3) {
      ns.td = 0
      ns.cur = (ns.cur + 1) % ns.players.length
      if (ns.cur === 0) ns.round++
    }
    return ns
  }
  // each double hit on the current target adds target × 2
  if (t.n === ns.target[playerIdx] && t.m === 2) {
    ns.score[playerIdx] += ns.target[playerIdx] * 2
    ns.visitHit[playerIdx] = true
  }
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    // end of visit: a visit with zero doubles subtracts 2 × target
    if (!ns.visitHit[playerIdx]) {
      ns.score[playerIdx] -= ns.target[playerIdx] * 2
      if (ns.score[playerIdx] <= 0) {
        ns.alive[playerIdx] = false
        ns.log.push(`💀 ${ns.players[playerIdx].name} is out of Bobs 27`)
      }
    }
    ns.visitHit[playerIdx] = false
    // advance D20 → D19 … D1 → done
    if (ns.target[playerIdx] === 1) {
      ns.done[playerIdx] = true
    } else {
      ns.target[playerIdx] -= 1
    }
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
    // game over when everyone is out or has finished the sequence
    if (ns.players.every((_, i) => !ns.alive[i] || ns.done[i])) ns.finished = true
  }
  return ns
}

export const bobs27Def: GameDef<Bobs27State> = {
  id: 'bobs-27',
  name: "Bob's 27",
  tagline: 'The double drill: D20 down to D1, start on 27',
  type: 'practice',
  minPlayers: 1,
  maxPlayers: 4,
  init: initBobs27,
  apply: applyBobs27,
  currentPlayer: (s) => s.cur,
  columns: (s) =>
    s.players.map((p, i) => ({
      key: `p${i}`,
      label: p.name,
      value: s.alive[i] ? `${s.score[i]}` : 'OUT',
      tone: (!s.alive[i] ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'],
    })),
  result: (s) => {
    if (!s.finished) return null
    const contenders = s.players.map((_, i) => i).filter((i) => s.alive[i])
    const w = contenders.sort((a, b) => s.score[b] - s.score[a])[0] ?? -1
    return {
      winnerIdxs: w >= 0 ? [w] : [],
      summary: w >= 0 ? `${s.players[w].name} wins Bob's 27 with ${s.score[w]}` : 'Nobody survives Bob!',
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w,      lines: { Score: s.score[i], Out: s.alive[i] ? 'No' : 'Yes' } })),
    }
  },
  guide: {
    objective: 'The legendary doubles practice game. Start on 27 points; throw 3 darts at D20. Hit at least one double and you ADD double-the-target; miss all three and you SUBTRACT double-the-target. Work down to D1; bust out (≤0) and you are eliminated.',
    setup: ['Everyone starts on 27 points and targets D20.', '3 darts per target.'],
    play: [
      'D20 round: any hit adds 40 total? Per-hit scoring here: each double hit adds target×2 (simplified).',
      'After the D20 visit, move to D19, then D18 … down to D1.',
      'Zero or negative score at any point = elimination.',
    ],
    winning: 'Highest surviving score when everyone has finished the sequence (or been eliminated).',
    tips: ['This is THE finishing drill — 20 minutes of Bobs beats an hour of random throwing.', 'Two hits on a double usually beat one miss twice over: keep throwing.'],
  },
}

/* =============================== Tic-Tac-Toe =============================== */

export type TttState = {
  players: { id: string; name: string }[]
  grid: (number | null)[] // 9 cells: null empty, playerId owned
  claims: number[] // hits claimed per cell this visit
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

const TTT_CELLS: number[] = [20, 3, 17, 16, 19, 18, 7, 13, 11] // corner/top/center numbers used by the popular variant

export function initTtt(players: { id: string; name: string }[], _settings: Record<string, string>): TttState {
  return { players, grid: Array(9).fill(null), claims: Array(9).fill(0), cur: 0, td: 0, round: 1, finished: false, log: [] }
}

function tttWinner(grid: (number | null)[]): number | null {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
  for (const [a, b, c] of lines) {
    if (grid[a] !== null && grid[a] === grid[b] && grid[b] === grid[c]) return grid[a]
  }
  return grid.every((c) => c !== null) ? -1 : null
}

export function applyTtt(s: TttState, t: Throw, playerIdx: number): TttState {
  if (s.finished) return s
  const ns: TttState = { ...s, grid: [...s.grid], claims: [...s.claims], log: [...s.log] }
  const cellIdx = TTT_CELLS.indexOf(t.n)
  if (cellIdx >= 0 && ns.grid[cellIdx] === null) {
    ns.claims[cellIdx]++
    if (ns.claims[cellIdx] >= 2) {
      ns.grid[cellIdx] = playerIdx // two hits claim the square
      ns.claims[cellIdx] = 0
      ns.log.push(`${ns.players[playerIdx].name} claims square (${TTT_CELLS[cellIdx]})`)
      const w = tttWinner(ns.grid)
      if (w !== null) {
        ns.finished = true
        if (w >= 0) ns.log.push(`⭕️ ${ns.players[w].name} wins Tic-Tac-Toe!`)
      }
    }
  }
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
  }
  return ns
}

export const tttDef: GameDef<TttState> = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  tagline: 'Claim squares with doubles — two hits to own one',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 2,
  init: initTtt,
  apply: applyTtt,
  currentPlayer: (s) => s.cur,
  columns: (s) => {
    const sym = (v: number | null) => (v === null ? '·' : s.players[v]?.name.slice(0, 1) ?? '?')
    return [
      { key: 'row1', label: 'Board', value: `${sym(s.grid[0])} ${sym(s.grid[1])} ${sym(s.grid[2])}` },
      { key: 'row2', label: '', value: `${sym(s.grid[3])} ${sym(s.grid[4])} ${sym(s.grid[5])}` },
      { key: 'row3', label: '', value: `${sym(s.grid[6])} ${sym(s.grid[7])} ${sym(s.grid[8])}` },
    ]
  },
  result: (s) => {
    if (!s.finished) return null
    const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]
    let w = -1
    for (const [a, b, c] of lines) {
      if (s.grid[a] !== null && s.grid[a] === s.grid[b] && s.grid[b] === s.grid[c]) w = s.grid[a] as number
    }
    return {
      winnerIdxs: w >= 0 ? [w] : [],
      summary: w >= 0 ? `${s.players[w].name} wins Tic-Tac-Toe!` : 'Draw — the board filled up',
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: {} })),
    }
  },
  guide: {
    objective: 'Darts meets noughts and crosses: each square of the grid is a number on the board. Hit that number twice (in total, across turns) to claim the square; get three in a row.',
    setup: ['The grid squares map to: 20, 3, 17 / 16, 19, 18 / 7, 13, 11.', 'Two hits on a number claim it (hits accumulate across turns).'],
    play: ['Throw 3 darts per turn.', 'Any hit on an unclaimed number counts toward claiming it.', 'Hitting an owned square does nothing.'],
    winning: 'First to three claimed squares in a row (or the last square wins a full board).',
    tips: ['The center square (19) is the tactical prize.', 'Block: if your opponent has two in a line, double-hit their square before they can.'],
  },
}

// Re-exports for registry convenience