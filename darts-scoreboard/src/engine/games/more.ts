// Ten more games in one compact module. Each has init / apply / columns / result.
// Convention: cur = current player index, td = darts thrown this turn; on the
// 3rd dart we advance to the next player, and when play wraps to player 0 the
// round increments.

import { type Throw, value } from '../board'
import type { GameDef, GameOption, Column } from '../core'

type BaseState = {
  players: { id: string; name: string }[]
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

const mkBase = (players: { id: string; name: string }[]): BaseState => ({
  players,
  cur: 0,
  td: 0,
  round: 1,
  finished: false,
  log: [],
})

type TurnTracked = BaseState & { /** darts thrown this turn, per player (reset on turn end) */ turnVals: number[][] }

const mkTracked = (players: { id: string; name: string }[]): TurnTracked => ({
  ...mkBase(players),
  turnVals: players.map(() => []),
})

/** Record dart for the player and advance turn/round when 3 darts are thrown. */
function endOfDart<T extends TurnTracked>(ns: T, playerIdx: number, v: number) {
  // copy the inner arrays — they are shared with the previous state by the
  // shallow clone, and mutating them would corrupt undo/history snapshots
  ns.turnVals = ns.turnVals.map((a, i) => (i === playerIdx ? [...a, v] : [...a]))
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
    ns.turnVals = ns.turnVals.map(() => [])
  }
}

const clone = <T>(s: T, numKeys: (keyof T)[], boolKeys: (keyof T)[] = []): T => {
  const out: any = { ...s, log: [...(s as any).log] }
  for (const k of numKeys) out[k] = [...(s[k] as unknown as number[])]
  for (const k of boolKeys) out[k] = [...(s[k] as unknown as boolean[])]
  return out
}

/* =============================== Around the Clock =============================== */

export type AtcState = TurnTracked & {
  target: number[]
  mode: 'any' | 'doubles' | 'trebles'
  lives: number[] // 0 = no lives mode
}

export const atcOptions: GameOption[] = [
  {
    key: 'mode',
    label: 'Segment',
    choices: [
      { value: 'any', label: 'Any (singles count)' },
      { value: 'doubles', label: 'Doubles only' },
      { value: 'trebles', label: 'Trebles only' },
    ],
    default: 'any',
  },
]

export function initAtc(players: { id: string; name: string }[], settings: Record<string, string>): AtcState {
  return { ...mkTracked(players), target: players.map(() => 1), mode: (settings['mode'] as AtcState['mode']) ?? 'any', lives: players.map(() => 0) }
}

export function applyAtc(s: AtcState, t: Throw, playerIdx: number): AtcState {
  if (s.finished) return s
  const ns = clone(s, ['target', 'lives', 'turnVals'])
  const need = ns.target[playerIdx]
  const ok = ns.mode === 'any' ? t.n === need : ns.mode === 'doubles' ? t.n === need && t.m === 2 : t.n === need && t.m === 3
  if (ok) {
    if (need === 20) {
      ns.finished = true
      ns.log.push(`🏆 ${ns.players[playerIdx].name} went Around the Clock and WINS!`)
      return ns
    }
    ns.target[playerIdx] = need + 1
  }
  endOfDart(ns, playerIdx, value(t))
  return ns
}

export const atcColumns = (s: AtcState): Column[] =>
  s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `#${s.target[i]}`, tone: i === s.cur ? 'active' : undefined }))

export const atcDef: GameDef<AtcState> = {
  id: 'around-the-clock',
  type: 'race',
  name: 'Around the Clock',
  tagline: 'Hit 1 to 20 in order',
  minPlayers: 1,
  maxPlayers: 8,
  options: atcOptions,
  init: initAtc,
  apply: applyAtc,
  currentPlayer: (s) => s.cur,
  columns: atcColumns,
  result: (s) =>
    s.finished
      ? {
          winnerIdxs: [s.cur],
          summary: `${s.players[s.cur].name} went Around the Clock!`,
          stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === s.cur, lines: { Reached: s.target[i] } })),
        }
      : null,
}

/* =============================== Shanghai =============================== */

export type ShanghaiState = TurnTracked & { points: number[]; turnMarks: number[][] }

export function initShanghai(players: { id: string; name: string }[], _settings: Record<string, string>): ShanghaiState {
  return { ...mkTracked(players), points: players.map(() => 0), turnMarks: players.map(() => []) }
}

export function applyShanghai(s: ShanghaiState, t: Throw, playerIdx: number): ShanghaiState {
  if (s.finished) return s
  const ns = clone(s, ['points', 'turnVals', 'turnMarks'])
  const target = ns.round // global target = round number, rounds 1..7
  if (t.n === target) {
    ns.points[playerIdx] += value(t)
    // copy the inner array — shared with the previous state by the shallow clone
    ns.turnMarks = ns.turnMarks.map((a, i) => (i === playerIdx ? [...a, t.m] : [...a]))
  }
  const wasTd = ns.td
  endOfDart(ns, playerIdx, value(t))
  if (wasTd === 2) {
    // turn ended: check for Shanghai (single+double+treble of target in one turn)
    const marks = [...ns.turnMarks[playerIdx]].sort()
    if (JSON.stringify(marks) === JSON.stringify([1, 2, 3])) {
      ns.finished = true
      ns.log.push(`🎯 SHANGHAI! ${ns.players[playerIdx].name} wins on the spot!`)
      return ns
    }
    ns.turnMarks[playerIdx] = []
    // after round 7 the game ends
    if (ns.round > 7) ns.finished = true
  }
  return ns
}

export const shanghaiColumns = (s: ShanghaiState): Column[] =>
  s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: String(s.points[i]), tone: i === s.cur ? 'active' : undefined }))

export const shanghaiDef: GameDef<ShanghaiState> = {
  id: 'shanghai',
  type: 'race',
  name: 'Shanghai',
  tagline: '7 rounds, S+D+T of the round number',
  minPlayers: 2,
  maxPlayers: 8,
  init: initShanghai,
  apply: applyShanghai,
  currentPlayer: (s) => s.cur,
  columns: shanghaiColumns,
  result: (s) => {
    if (!s.finished && s.round <= 7) return null
    const w = s.points.indexOf(Math.max(...s.points))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins Shanghai`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.points[i] } })),
    }
  },
}

/* =============================== Halve It =============================== */

export type HalveItState = TurnTracked & {
  total: number[]
  alive: boolean[]
  hitsThisTurn: number[]
}

const HALVE_TARGETS: { labelStr: string; match: (t: Throw) => boolean }[] = [
  { labelStr: '20', match: (t) => t.n === 20 },
  { labelStr: '16', match: (t) => t.n === 16 },
  { labelStr: 'Double 16', match: (t) => t.n === 16 && t.m === 2 },
  { labelStr: 'Treble 16', match: (t) => t.n === 16 && t.m === 3 },
  { labelStr: '17', match: (t) => t.n === 17 },
  { labelStr: 'Double 17', match: (t) => t.n === 17 && t.m === 2 },
  { labelStr: 'Treble 19', match: (t) => t.n === 19 && t.m === 3 },
  { labelStr: '18', match: (t) => t.n === 18 },
  { labelStr: 'Bull', match: (t) => t.n === 25 },
  { labelStr: '19', match: (t) => t.n === 19 },
  { labelStr: 'Treble 20', match: (t) => t.n === 20 && t.m === 3 },
  { labelStr: 'Bull', match: (t) => t.n === 25 && t.m === 50 },
]

export const halveItRounds = HALVE_TARGETS.length

export function initHalveIt(players: { id: string; name: string }[], _settings: Record<string, string>): HalveItState {
  return { ...mkTracked(players), total: players.map(() => 0), alive: players.map(() => true), hitsThisTurn: players.map(() => 0) }
}

export function applyHalveIt(s: HalveItState, t: Throw, playerIdx: number): HalveItState {
  if (s.finished) return s
  const ns = clone(s, ['total', 'turnVals', 'hitsThisTurn'], ['alive'])
  if (!ns.alive[playerIdx]) {
    endOfDart(ns, playerIdx, 0)
    // FINISH CHECKS MUST RUN HERE TOO: the old early-return skipped them, so
    // when ALL players were eliminated the round counter marched forever and
    // the game never ended — a dead board. (Caught by the fuzz suite.)
    if (ns.round > halveItRounds || ns.players.every((_, i) => !ns.alive[i])) ns.finished = true
    return ns
  }
  const target = HALVE_TARGETS[(ns.round - 1) % halveItRounds]
  const hit = target.match(t)
  if (hit) {
    ns.total[playerIdx] += value(t)
    ns.hitsThisTurn[playerIdx]++
  }
  const wasTd = ns.td
  endOfDart(ns, playerIdx, value(t))
  // turn just ended for this player?
  if (wasTd === 2) {
    if (ns.hitsThisTurn[playerIdx] === 0) {
      if (ns.total[playerIdx] === 0) {
        ns.alive[playerIdx] = false
        ns.log.push(`💀 ${ns.players[playerIdx].name} is eliminated!`)
      } else {
        ns.total[playerIdx] = Math.ceil(ns.total[playerIdx] / 2)
        ns.log.push(`${ns.players[playerIdx].name} misses — score halved to ${ns.total[playerIdx]}`)
      }
    }
    ns.hitsThisTurn[playerIdx] = 0
  }
  // game over when the final round completes or everyone is eliminated
  if (ns.round > halveItRounds || ns.players.every((_, i) => !ns.alive[i])) ns.finished = true
  return ns
}

export const halveItColumns = (s: HalveItState): Column[] => [
  { key: 'round', label: 'Target', value: `R${s.round}: ${HALVE_TARGETS[(s.round - 1) % halveItRounds].labelStr}`, tone: 'muted' },
  ...s.players.map((p, i) => ({
    key: `p${i}`,
    label: p.name,
    value: s.alive[i] ? String(s.total[i]) : 'OUT',
    tone: (!s.alive[i] ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'],
  })),
]

export const halveItDef: GameDef<HalveItState> = {
  id: 'halve-it',
  type: 'practice',
  name: 'Halve It',
  tagline: 'Hit the target or your score is halved',
  minPlayers: 1,
  maxPlayers: 8,
  init: initHalveIt,
  apply: applyHalveIt,
  currentPlayer: (s) => s.cur,
  columns: halveItColumns,
  result: (s) => {
    if (!s.finished) return null
    const contenders = s.players.map((_, i) => i).filter((i) => s.alive[i])
    const w = contenders.sort((a, b) => s.total[b] - s.total[a])[0] ?? -1
    return {
      winnerIdxs: w >= 0 ? [w] : [],
      summary: w >= 0 ? `${s.players[w].name} survives Halve It with ${s.total[w]}` : 'Nobody survives!',
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Score: s.total[i], Alive: s.alive[i] ? 'Yes' : 'No' } })),
    }
  },
}

/* =============================== Golf =============================== */

export type GolfState = TurnTracked & { strokes: number[]; total: number[]; holes: number }

export const GOLF_HOLES = 18
export const golfOptions: GameOption[] = [
  {
    key: 'holes',
    label: 'Holes',
    choices: [
      { value: '9', label: '9 holes' },
      { value: '18', label: '18 holes' },
    ],
    default: '18',
  },
]

export function initGolf(players: { id: string; name: string }[], settings: Record<string, string>): GolfState {
  return { ...mkTracked(players), strokes: players.map(() => 0), total: players.map(() => 0), holes: parseInt(settings['holes'] ?? '18', 10) }
}

/** One dart at the hole: treble=1 stroke, double=2, single=3, anything else=4. */
export function golfStrokeFor(t: Throw, hole: number): number {
  if (t.n === hole) return t.m === 3 ? 1 : t.m === 2 ? 2 : 3
  return 4
}

export function applyGolf(s: GolfState, t: Throw, playerIdx: number): GolfState {
  if (s.finished) return s
  const ns = clone(s, ['strokes', 'total', 'turnVals'])
  const hole = ((ns.round - 1) % GOLF_HOLES) + 1
  ns.strokes[playerIdx] += golfStrokeFor(t, hole)
  const wasTd = ns.td
  endOfDart(ns, playerIdx, golfStrokeFor(t, hole))
  if (wasTd === 2) {
    // turn = one hole played: bank the strokes
    ns.total[playerIdx] += ns.strokes[playerIdx]
    ns.strokes[playerIdx] = 0
    if (ns.round > ns.holes) ns.finished = true
  }
  return ns
}

export const golfColumns = (s: GolfState): Column[] => [
  { key: 'hole', label: 'Hole', value: `${Math.min(s.round, s.holes)}/${s.holes}`, tone: 'muted' },
  ...s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.total[i]} st`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
]

export const golfDef: GameDef<GolfState> = {
  id: 'golf',
  type: 'sports',
  name: 'Golf',
  tagline: '18 holes · T=1, D=2, S=3, miss=4 strokes',
  minPlayers: 1,
  maxPlayers: 4,
  options: golfOptions,
  init: initGolf,
  apply: applyGolf,
  currentPlayer: (s) => s.cur,
  columns: golfColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.total.indexOf(Math.min(...s.total))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins with ${Math.min(...s.total)} strokes`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Strokes: s.total[i] } })),
    }
  },
}

/* =============================== Baseball =============================== */

export type BaseballState = TurnTracked & { runs: number[] }

export function initBaseball(players: { id: string; name: string }[], _settings: Record<string, string>): BaseballState {
  return { ...mkTracked(players), runs: players.map(() => 0) }
}

export function applyBaseball(s: BaseballState, t: Throw, playerIdx: number): BaseballState {
  if (s.finished) return s
  const ns = clone(s, ['runs', 'turnVals'])
  const inning = Math.min(ns.round, 9)
  if (t.n === inning) ns.runs[playerIdx] += t.m // single/double/treble = 1/2/3 runs
  endOfDart(ns, playerIdx, t.n === inning ? t.m : 0)
  if (ns.round > 9) ns.finished = true
  return ns
}

export const baseballColumns = (s: BaseballState): Column[] =>
  s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.runs[i]} runs`, tone: i === s.cur ? 'active' : undefined }))
export const baseballDef: GameDef<BaseballState> = {
  id: 'baseball',
  type: 'sports',
  name: 'Baseball',
  tagline: '9 innings · hit your inning for runs',
  minPlayers: 2,
  maxPlayers: 8,
  init: initBaseball,
  apply: applyBaseball,
  currentPlayer: (s) => s.cur,
  columns: baseballColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.runs.indexOf(Math.max(...s.runs))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins ${Math.max(...s.runs)}–${Math.min(...s.runs)}`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Runs: s.runs[i] } })),
    }
  },
}

/* =============================== High Score =============================== */

export type HighScoreState = TurnTracked & { total: number[]; rounds: number }

export const highScoreOptions: GameOption[] = [
  {
    key: 'rounds',
    label: 'Rounds',
    choices: [
      { value: '4', label: '4' },
      { value: '8', label: '8' },
      { value: '10', label: '10' },
    ],
    default: '8',
  },
]

export function initHighScore(players: { id: string; name: string }[], settings: Record<string, string>): HighScoreState {
  return { ...mkTracked(players), total: players.map(() => 0), rounds: parseInt(settings['rounds'] ?? '8', 10) }
}

export function applyHighScore(s: HighScoreState, t: Throw, playerIdx: number): HighScoreState {
  if (s.finished) return s
  const ns = clone(s, ['total', 'turnVals'])
  ns.total[playerIdx] += value(t)
  endOfDart(ns, playerIdx, value(t))
  if (ns.round > ns.rounds) ns.finished = true
  return ns
}

export const highScoreColumns = (s: HighScoreState): Column[] =>
  s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: String(s.total[i]), tone: i === s.cur ? 'active' : undefined }))

export const highScoreDef: GameDef<HighScoreState> = {
  id: 'high-score',
  type: 'practice',
  name: 'High Score',
  tagline: 'Most points after N rounds',
  minPlayers: 1,
  maxPlayers: 8,
  options: highScoreOptions,
  init: initHighScore,
  apply: applyHighScore,
  currentPlayer: (s) => s.cur,
  columns: highScoreColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.total.indexOf(Math.max(...s.total))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins with ${Math.max(...s.total)} points`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.total[i] } })),
    }
  },
}

/* =============================== Fives (All Fives / 51 by 5s) =============================== */

// Classic rules: a 3-dart visit only counts when its total divides evenly by 5,
// and the player then scores the number of FIVES (sum ÷ 5). Win by reaching the
// target exactly — going over busts and the score reverts to the visit's start.

export type FivesState = TurnTracked & { total: number[]; turnStart: number[]; target: number; turnSum: number[] }

export const fivesOptions: GameOption[] = [
  {
    key: 'target',
    label: 'Fives to win (exact)',
    choices: [
      { value: '51', label: '51' },
      { value: '61', label: '61' },
      { value: '71', label: '71' },
      { value: '81', label: '81' },
      { value: '91', label: '91' },
    ],
    default: '51',
  },
]

export function initFives(players: { id: string; name: string }[], settings: Record<string, string>): FivesState {
  return { ...mkTracked(players), total: players.map(() => 0), turnStart: players.map(() => 0), target: parseInt(settings['target'] ?? '51', 10), turnSum: players.map(() => 0) }
}

export function applyFives(s: FivesState, t: Throw, playerIdx: number): FivesState {
  if (s.finished) return s
  const ns = clone(s, ['total', 'turnVals', 'turnStart', 'turnSum'])
  if (ns.td === 0) ns.turnStart[playerIdx] = ns.total[playerIdx]
  ns.turnSum[playerIdx] += value(t)
  const wasTd = ns.td
  endOfDart(ns, playerIdx, value(t))
  if (wasTd === 2) {
    // visit complete: only a total divisible by 5 scores, as FIVES (sum ÷ 5)
    const sum = ns.turnSum[playerIdx]
    if (sum > 0 && sum % 5 === 0) {
      const fives = sum / 5
      ns.total[playerIdx] += fives
      if (ns.total[playerIdx] === ns.target) {
        ns.finished = true
        ns.log.push(`✋ ${ns.players[playerIdx].name} hits exactly ${ns.target} fives and WINS!`)
        return ns
      }
      if (ns.total[playerIdx] > ns.target) {
        // bust: revert to the score at the start of the visit
        ns.total[playerIdx] = ns.turnStart[playerIdx]
        ns.log.push(`💥 ${ns.players[playerIdx].name} busts past ${ns.target} — back to ${ns.turnStart[playerIdx]}`)
      }
    }
    ns.turnSum[playerIdx] = 0
  }
  return ns
}

export const fivesColumns = (s: FivesState): Column[] =>
  s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.total[i]}`, tone: i === s.cur ? 'active' : undefined }))

export const fivesDef: GameDef<FivesState> = {
  id: 'fives',
  type: 'x01',
  name: 'Fives',
  tagline: 'Score fives (visit total ÷ 5) — race to exactly 51',
  minPlayers: 2,
  maxPlayers: 8,
  options: fivesOptions,
  init: initFives,
  apply: applyFives,
  currentPlayer: (s) => s.cur,
  columns: fivesColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.total.indexOf(Math.max(...s.total))
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} reaches ${s.target}!`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.total[i] } })),
    }
  },
}

/* =============================== Chase the Dragon =============================== */

export type ChaseState = TurnTracked & { step: number[] } // 0..6: T10..T20, 7 = bull done

const CHASE_STEPS: { labelStr: string; match: (t: Throw) => boolean }[] = [
  ...[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) => ({ labelStr: `T${n}`, match: (t: Throw) => t.n === n && t.m === 3 })),
  { labelStr: 'BULL', match: (t) => t.n === 25 && t.m === 50 },
]

export function initChase(players: { id: string; name: string }[], _settings: Record<string, string>): ChaseState {
  return { ...mkTracked(players), step: players.map(() => 0) }
}

export function applyChase(s: ChaseState, t: Throw, playerIdx: number): ChaseState {
  if (s.finished) return s
  const ns = clone(s, ['step', 'turnVals'])
  const step = CHASE_STEPS[ns.step[playerIdx]]
  if (step && step.match(t)) {
    ns.step[playerIdx]++
    if (ns.step[playerIdx] >= CHASE_STEPS.length) {
      ns.finished = true
      ns.log.push(`🐉 ${ns.players[playerIdx].name} chased the dragon and WINS!`)
      return ns
    }
  }
  endOfDart(ns, playerIdx, value(t))
  return ns
}

export const chaseColumns = (s: ChaseState): Column[] =>
  s.players.map((p, i) => ({
    key: `p${i}`,
    label: p.name,
    value: CHASE_STEPS[s.step[i]]?.labelStr ?? 'DONE',
    tone: i === s.cur ? 'active' : undefined,
  }))

export const chaseDef: GameDef<ChaseState> = {
  id: 'chase-the-dragon',
  type: 'practice',
  name: 'Chase the Dragon',
  tagline: 'Trebles 10→20 then the bull',
  minPlayers: 1,
  maxPlayers: 8,
  init: initChase,
  apply: applyChase,
  currentPlayer: (s) => s.cur,
  columns: chaseColumns,
  result: (s) =>
    s.finished
      ? {
          winnerIdxs: [s.cur],
          summary: `${s.players[s.cur].name} chased the dragon!`,
          stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === s.cur, lines: { Step: s.step[i] } })),
        }
      : null,
}

/* =============================== Nine Lives =============================== */

export type NineLivesState = TurnTracked & { target: number[]; lives: number[]; hitThisTurn: boolean[]; winner: number | null }

export function initNineLives(players: { id: string; name: string }[], _settings: Record<string, string>): NineLivesState {
  return { ...mkTracked(players), target: players.map(() => 1), lives: players.map(() => 9), hitThisTurn: players.map(() => false), winner: null }
}

export function applyNineLives(s: NineLivesState, t: Throw, playerIdx: number): NineLivesState {
  if (s.finished) return s
  const ns = clone(s, ['target', 'lives', 'turnVals', 'hitThisTurn'], []) as NineLivesState
  const need = ns.target[playerIdx]
  if (t.n === need) {
    ns.hitThisTurn[playerIdx] = true
    if (need === 20) {
      ns.finished = true
      ns.winner = playerIdx
      ns.log.push(`😻 ${ns.players[playerIdx].name} kept all lives and finished — WINS!`)
      return ns
    }
    ns.target[playerIdx] = need + 1
  }
  const wasTd = ns.td
  endOfDart(ns, playerIdx, value(t))
  if (wasTd === 2) {
    // a FRUITLESS VISIT costs one life (per the rules), not each missed dart
    if (!ns.hitThisTurn[playerIdx]) {
      ns.lives[playerIdx]--
      ns.log.push(`${ns.players[playerIdx].name} misses the visit — ${Math.max(0, ns.lives[playerIdx])} lives left`)
      if (ns.lives[playerIdx] <= 0) ns.log.push(`💀 ${ns.players[playerIdx].name} is out of lives!`)
    }
    ns.hitThisTurn[playerIdx] = false
    const living = ns.players.map((_, i) => i).filter((i) => ns.lives[i] > 0)
    if (!ns.finished && living.length <= 1) {
      ns.finished = true
      ns.winner = living.length === 1 ? living[0] : playerIdx
      if (living.length === 1) ns.log.push(`🏆 ${ns.players[living[0]].name} outlasts the table!`)
    }
  }
  return ns
}

export const nineLivesColumns = (s: NineLivesState): Column[] =>
  s.players.map((p, i) => ({
    key: `p${i}`,
    label: p.name,
    value: s.lives[i] > 0 ? `#${s.target[i]} · ${'❤'.repeat(s.lives[i])}` : 'OUT',
    tone: s.lives[i] <= 0 ? 'bad' : i === s.cur ? 'active' : undefined,
  }))

export const nineLivesDef: GameDef<NineLivesState> = {
  id: 'nine-lives',
  type: 'race',
  name: 'Nine Lives',
  tagline: 'Around the clock with 9 lives',
  minPlayers: 2,
  maxPlayers: 8,
  init: initNineLives,
  apply: applyNineLives,
  currentPlayer: (s) => s.cur,
  columns: nineLivesColumns,
  result: (s) => {
    if (!s.finished) return null
    const w = s.winner ?? s.cur
    return {
      winnerIdxs: [w],
      summary: `${s.players[w].name} wins Nine Lives`,
      stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { 'Lives left': Math.max(0, s.lives[i]), Reached: s.target[i] } })),
    }
  },
}

/* =============================== Bermuda Triangle =============================== */

export type BermudaState = TurnTracked & { step: number[] }

const BERMUDA_STEPS: { labelStr: string; match: (t: Throw) => boolean }[] = [
  { labelStr: '12', match: (t) => t.n === 12 },
  { labelStr: '13', match: (t) => t.n === 13 },
  { labelStr: '14', match: (t) => t.n === 14 },
  { labelStr: 'Any double', match: (t) => t.n >= 1 && t.n <= 20 && t.m === 2 },
  { labelStr: '15', match: (t) => t.n === 15 },
  { labelStr: '16', match: (t) => t.n === 16 },
  { labelStr: '17', match: (t) => t.n === 17 },
  { labelStr: 'Any treble', match: (t) => t.n >= 1 && t.n <= 20 && t.m === 3 },
  { labelStr: '18', match: (t) => t.n === 18 },
  { labelStr: '19', match: (t) => t.n === 19 },
  { labelStr: '20', match: (t) => t.n === 20 },
  { labelStr: 'Bull', match: (t) => t.n === 25 && t.m === 50 },
]

export function initBermuda(players: { id: string; name: string }[], _settings: Record<string, string>): BermudaState {
  return { ...mkTracked(players), step: players.map(() => 0) }
}

export function applyBermuda(s: BermudaState, t: Throw, playerIdx: number): BermudaState {
  if (s.finished) return s
  const ns = clone(s, ['step', 'turnVals'])
  const step = BERMUDA_STEPS[ns.step[playerIdx]]
  if (step && step.match(t)) {
    ns.step[playerIdx]++
    if (ns.step[playerIdx] >= BERMUDA_STEPS.length) {
      ns.finished = true
      ns.log.push(`🔺 ${ns.players[playerIdx].name} escaped the Bermuda Triangle and WINS!`)
      return ns
    }
  }
  endOfDart(ns, playerIdx, value(t))
  return ns
}

export const bermudaColumns = (s: BermudaState): Column[] =>
  s.players.map((p, i) => ({
    key: `p${i}`,
    label: p.name,
    value: BERMUDA_STEPS[s.step[i]]?.labelStr ?? 'DONE',
    tone: i === s.cur ? 'active' : undefined,
  }))

export const bermudaDef: GameDef<BermudaState> = {
  id: 'bermuda-triangle',
  type: 'race',
  name: 'Bermuda Triangle',
  tagline: '12→20 in order, plus any double, any treble & bull',
  minPlayers: 1,
  maxPlayers: 8,
  init: initBermuda,
  apply: applyBermuda,
  currentPlayer: (s) => s.cur,
  columns: bermudaColumns,
  result: (s) =>
    s.finished
      ? {
          winnerIdxs: [s.cur],
          summary: `${s.players[s.cur].name} escaped the Triangle!`,
          stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === s.cur, lines: { Step: s.step[i] } })),
        }
      : null,
}
