// Batch 4 — the deep catalogue: Count Up, Climb, Bowls, Battleships, Ho No!,
// Indy 500, Loop, Slip-up, Shove Ha'penny, Warfare, Tennis, Scam, plus Gotcha
// and Quickfire X01 variants. Same turn conventions as previous batches.

import { type Throw, value, label } from '../board'
import type { GameDef, Column } from '../core'

type Base = {
  players: { id: string; name: string }[]
  cur: number
  td: number
  round: number
  finished: boolean
  log: string[]
}

const base = (players: { id: string; name: string }[]): Base => ({ players, cur: 0, td: 0, round: 1, finished: false, log: [] })

const clone3 = <T extends Base>(s: T, numKeys: (keyof T)[] = [], boolKeys: (keyof T)[] = []): T => {
  const out: any = { ...s, log: [...s.log] }
  for (const k of numKeys) out[k] = Array.isArray(s[k]) ? [...(s[k] as unknown as unknown[])] : s[k]
  for (const k of boolKeys) out[k] = Array.isArray(s[k]) ? [...(s[k] as unknown as unknown[])] : s[k]
  return out
}

const endDart = (ns: any) => {
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0) ns.round++
  }
}

/* ============ Count Up ============ */

export type CountUpState = Base & { total: number[]; target: number }

export function initCountUp(players: { id: string; name: string }[], settings: Record<string, string>): CountUpState {
  return { ...base(players), total: players.map(() => 0), target: parseInt(settings['target'] ?? '500', 10) }
}

export const countUpOptions = [
  {
    key: 'target',
    label: 'Race to',
    choices: [
      { value: '300', label: '300' },
      { value: '500', label: '500' },
      { value: '1000', label: '1000' },
    ],
    default: '500',
  },
]

export function applyCountUp(s: CountUpState, t: Throw, pi: number): CountUpState {
  if (s.finished) return s
  const ns = clone3(s, ['total'])
  ns.total[pi] += value(t)
  if (ns.total[pi] >= ns.target) {
    ns.finished = true
    ns.log.push(`🔢 ${ns.players[pi].name} counts up to ${ns.target}!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const countUpDef: GameDef<CountUpState> = {
  id: 'count-up',
  name: 'Count Up',
  tagline: 'Simple race: first to 300/500/1000 points',
  type: 'practice',
  minPlayers: 1,
  maxPlayers: 8,
  init: initCountUp,
  apply: applyCountUp,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.total[i]}/${s.target}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.total.findIndex((t) => t >= s.target)
    return { winnerIdxs: [w], summary: `${s.players[w].name} reaches ${s.target}!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.total[i] } })) }
  },
  guide: {
    objective: 'The purest beginner race: throw anything, first to the target number wins.',
    setup: ['Agree a target: 300 (quick), 500 (standard) or 1000 (marathon).'],
    play: ['Every dart scores its face value — T20 = 60.', 'No busts, no rules, just counting.'],
    winning: 'First past the target.',
    tips: ['The best game to teach someone how to keep score.', 'Watch your average — it is your 501 engine room.'],
  },
}

/* ============ Climb ============ */

export type ClimbState = Base & { total: number[]; target: number }

export function initClimb(players: { id: string; name: string }[]): ClimbState {
  return { ...base(players), total: players.map(() => 0), target: 301 }
}

export function applyClimb(s: ClimbState, t: Throw, pi: number): ClimbState {
  if (s.finished) return s
  const ns = clone3(s, ['total'])
  const nt = ns.total[pi] + value(t)
  if (nt > ns.target) {
    ns.total[pi] = 0 // bust: fall to the bottom!
    ns.log.push(`🧗 ${ns.players[pi].name} falls — back to 0`)
  } else {
    ns.total[pi] = nt
    if (nt === ns.target) {
      ns.finished = true
      ns.log.push(`🏔️ ${ns.players[pi].name} summits!`)
      return ns
    }
  }
  endDart(ns)
  return ns
}

export const climbDef: GameDef<ClimbState> = {
  id: 'climb',
  name: 'Climb',
  tagline: 'Race up to 301 — bust and fall back to zero',
  type: 'race',
  minPlayers: 1,
  maxPlayers: 8,
  init: initClimb,
  apply: applyClimb,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.total[i]}/301`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.total.findIndex((t) => t === 301)
    return { winnerIdxs: [w], summary: `${s.players[w].name} climbs the mountain!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Height: s.total[i] } })) }
  },
  guide: {
    objective: 'Climb to exactly 301. Overshoot and you tumble back to the bottom — the beginner\u2019s introduction to bust management.',
    setup: ['Target: exactly 301.'],
    play: ['Add dart values to your height.', 'Going over 301 resets you to 0 — bust!', 'Exactly 301 wins.'],
    winning: 'Land on exactly 301.',
    tips: ['Under the mountain, count backwards like 501: know your outs.', 'One safe single beats a greedy treble at 290.'],
  },
}

/* ============ Bowls ============ */

export type BowlsState = Base & { jackN: number; jackM: number; scores: number[]; setDarts: Throw[]; setOwners: number[] }

export function initBowls(players: { id: string; name: string }[]): BowlsState {
  return { ...base(players), jackN: 0, jackM: 0, scores: players.map(() => 0), setDarts: [], setOwners: [] }
}

const segDist = (t: Throw, n: number, m: number) => Math.abs(value(t) - value({ n, m })) + (t.n === n ? 0 : 12)  // eslint-disable-line

export function applyBowls(s: BowlsState, t: Throw, pi: number): BowlsState {
  if (s.finished) return s
  const ns = clone3(s, ['scores', 'jackN', 'jackM'])
  ns.setDarts = [...s.setDarts, t]
  ns.setOwners = [...s.setOwners, pi]
  if (ns.jackN === 0) {
    // first dart of the end sets the jack
    ns.jackN = t.n
    ns.jackM = t.m
    ns.log.push(`Jack set at ${label(t)}`)
  }
  endDart(ns)
  // an end completes only when every player has thrown their 3 darts
  // (the visit counter wrapped back to player 0), not after every single visit
  if (ns.td === 0 && ns.cur === 0 && ns.setDarts.length > 0) {
    const jack = { n: ns.jackN, m: ns.jackM }
    let bestPi = -1
    let bestD = Infinity
    ns.setDarts.forEach((d, i) => {
      const owner = ns.setOwners[i]
      const dist = segDist(d, jack.n, jack.m)
      if (dist < bestD) {
        bestD = dist
        bestPi = owner
      }
    })
    if (bestPi >= 0) {
      ns.scores[bestPi] += 1
      ns.log.push(`🥌 ${ns.players[bestPi].name} takes the end (${ns.setDarts.map(label).join(' ')})`)
    }
    if (ns.scores[bestPi] >= 10) {
      ns.finished = true
      ns.log.push(`🏆 ${ns.players[bestPi].name} wins 10 ends!`)
      return ns
    }
    ns.setDarts = []
    ns.setOwners = []
    ns.jackN = 0
    ns.jackM = 0
  }
  return ns
}

export const bowlsDef: GameDef<BowlsState> = {
  id: 'bowls',
  name: 'Bowls',
  tagline: 'Nearest to the jack wins the end — first to 10 ends',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 4,
  init: initBowls,
  apply: applyBowls,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.scores[i]} ends`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.scores.indexOf(10)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins on the green!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Ends: s.scores[i] } })) }
  },
  guide: {
    objective: 'Lawn bowls on the board: the first dart sets the jack, then everyone tries to land nearest. Nearest dart wins the end; first to 10 ends wins.',
    setup: ['First dart of each end sets the jack (any segment).'],
    play: ['Match the jack\u2019s exact value and segment as closely as you can.', 'Nearest dart after all players have thrown takes the end.'],
    winning: 'First to 10 ends.',
    tips: ['Consistency beats power — this is touch, not force.'],
  },
}

/* ============ Battleships ============ */

export type BattleshipsState = Base & {
  fleet: Record<string, string[]> // playerIdx -> segment cells "n-m" owned (their ships)
  hits: Record<string, string[]> // "pi:cell" hits
  placed: boolean[]
  winner: number | null
}

const FLEET_SIZE = 5 // 5 ships of one cell each on chosen numbers

export function initBattleships(players: { id: string; name: string }[]): BattleshipsState {
  return { ...base(players), fleet: {}, hits: {}, placed: players.map(() => false), winner: null }
}

export function applyBattleships(s: BattleshipsState, t: Throw, pi: number): BattleshipsState {
  if (s.finished) return s
  const ns: BattleshipsState = { ...s, fleet: { ...s.fleet }, hits: { ...s.hits }, log: [...s.log] }
  const cell = `${t.n}-${t.m}`
  const enemy = (pi + 1) % ns.players.length
  // placing phase: each player's first 5 distinct hits on numbers place their own fleet
  if (!ns.placed[pi]) {
    const mine = [...(ns.fleet[pi] ?? [])]
    if (t.n >= 1 && t.n <= 20 && !mine.includes(cell)) {
      mine.push(cell)
      ns.fleet[pi] = mine
      if (mine.length >= FLEET_SIZE) {
        ns.placed[pi] = true
        ns.log.push(`🚢 ${ns.players[pi].name} deploys their fleet`)
      }
    }
  } else {
    // firing phase: hit enemy cells
    const enemyFleet = ns.fleet[enemy] ?? []
    if (enemyFleet.includes(cell)) {
      const key = `${enemy}:${cell}`
      ns.hits[key] = [...(ns.hits[key] ?? [])]
      if (!ns.hits[key].includes(cell)) {
        ns.hits[key].push(cell)
        ns.log.push(`💥 ${ns.players[pi].name} hits a ship (${label(t)})!`)
        const totalHits = Object.keys(ns.hits).filter((k) => k.startsWith(`${enemy}:`)).length
        if (totalHits >= FLEET_SIZE) {
          ns.finished = true
          ns.winner = pi
          ns.log.push(`⚓ ${ns.players[pi].name} sinks the entire fleet!`)
          return ns
        }
      }
    }
  }
  endDart(ns)
  return ns
}

export const battleshipsDef: GameDef<BattleshipsState> = {
  id: 'battleships',
  name: 'Battleships',
  tagline: 'Place your fleet with your darts, then sink theirs',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 2,
  init: initBattleships,
  apply: applyBattleships,
  currentPlayer: (s) => s.cur,
  columns: (s) =>
    s.players.map((p, i) => {
      const fleet = s.fleet[i] ?? []
      const hits = Object.keys(s.hits).filter((k) => k.startsWith(`${i}:`)).length
      return { key: `p${i}`, label: p.name, value: s.placed[i] ? `${FLEET_SIZE - hits} ships left` : `placing ${fleet.length}/${FLEET_SIZE}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] }
    }),
  result: (s) => {
    if (!s.finished || s.winner === null) return null
    const w = s.winner
    return { winnerIdxs: [w], summary: `${s.players[w].name} rules the waves!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: {} })) }
  },
  guide: {
    objective: 'Naval warfare: first hit numbers with your darts to DEPLOY your 5 ships on distinct cells, then fire at the board — where your opponent\u2019s ships actually are. Sink all 5 to win.',
    setup: ['Deploy phase: your first 5 distinct segment hits become your fleet\u2019s positions.'],
    play: ['Once both fleets are placed, every dart is a shot.', 'Shots on enemy cells sink ships (5 hits wins).'],
    winning: 'Sink all 5 enemy ships.',
    tips: ['Spread your fleet — clustered ships sink together.', 'Memorise where their darts landed during deployment!'],
  },
}

/* ============ Ho No! ============ */

export type HoNoState = Base & { target: number; scores: number[] }

export function initHoNo(players: { id: string; name: string }[]): HoNoState {
  return { ...base(players), target: 301, scores: players.map(() => 0) }
}

export function applyHoNo(s: HoNoState, t: Throw, pi: number): HoNoState {
  if (s.finished) return s
  const ns = clone3(s, ['scores'])
  ns.scores[pi] += value(t)
  if (ns.scores[pi] >= ns.target) {
    ns.finished = true
    ns.log.push(`🎉 ${ns.players[pi].name} reaches ${ns.target}!`)
    return ns
  }
  // the signature cruelty: an inner bull (50) wipes the NEXT thrower's score
  if (t.n === 25 && t.m === 50) {
    const victim = (pi + 1) % ns.players.length
    if (ns.scores[victim] > 0) {
      ns.scores[victim] = 0
      ns.log.push(`😈 ${ns.players[pi].name} bulls — ${ns.players[victim].name} is wiped to zero!`)
    }
  }
  endDart(ns)
  return ns
}

export const hoNoDef: GameDef<HoNoState> = {
  id: 'ho-no',
  name: 'Ho No!',
  tagline: 'Race to 301 — but a bull sends the next player to zero',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 6,
  init: initHoNo,
  apply: applyHoNo,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.scores[i]}/301`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.scores.findIndex((v) => v >= s.target)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins — Ho Yes!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.scores[i] } })) }
  },
  guide: {
    objective: 'Race to 301 like Count Up — except any player hitting the inner bull sends the NEXT thrower\u2019s score crashing to zero. Ho no!',
    setup: ['Target 301.'],
    play: ['Score normally, but a 50 (inner bull) zeroes the following player.', 'Time your bulls for maximum cruelty.'],
    winning: 'First to 301 (surviving the bulls).',
    tips: ['Never celebrate a big total before the player before you has thrown.'],
  },
}

/* ============ Indy 500 ============ */

export type IndyState = Base & { laps: number[]; pitStops: number[] }

export function initIndy(players: { id: string; name: string }[]): IndyState {
  return { ...base(players), laps: players.map(() => 0), pitStops: players.map(() => 0) }
}

export function applyIndy(s: IndyState, t: Throw, pi: number): IndyState {
  if (s.finished) return s
  const ns = clone3(s, ['laps', 'pitStops'])
  // trebles drive fast (30 pts), singles cruise; a pit stop = hitting 3 (crash) skips your next visit
  if (t.n === 3 && t.m === 1) {
    ns.pitStops[pi]++
    ns.log.push(`🏎️ ${ns.players[pi].name} pits!`)
  } else {
    ns.laps[pi] += value(t) / 6 // laps are abstract units
  }
  if (ns.laps[pi] >= 83.34) {
    // 500 "miles" at 6 mph per lap unit
    ns.finished = true
    ns.log.push(`🏁 ${ns.players[pi].name} takes the checkered flag!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const indyDef: GameDef<IndyState> = {
  id: 'indy-500',
  name: 'Indy 500',
  tagline: 'Race to 500 — trebles fly, single 3s force a pit stop',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 6,
  init: initIndy,
  apply: applyIndy,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${Math.round(s.laps[i] * 6)}/500 mi`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.laps.findIndex((l) => l >= 83.34)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins the Indy 500!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Miles: Math.round(s.laps[i] * 6) } })) }
  },
  guide: {
    objective: 'Motor racing: race to 500 miles. Every point scores a mile. Trebles are your engine — but a single 3 sends you into the pits for a lost dart.',
    setup: ['Race distance 500 miles (= 500 points).'],
    play: ['Dart value = miles.', 'Single 3 = pit stop: that dart scores nothing.'],
    winning: 'First to 500 miles.',
    tips: ['T20 = 60 miles a dart. T19 = 57. The 20s are the racing line.'],
  },
}

/* ============ Loop / Loopy ============ */

export type LoopState = Base & { marks: number[][] }

const LOOP_NUMBERS = [20, 4, 6, 8, 9, 10, 14, 16, 18, 19] // numbers with wire loops on traditional boards

export function initLoop(players: { id: string; name: string }[]): LoopState {
  return { ...base(players), marks: players.map(() => LOOP_NUMBERS.map(() => 0)) }
}

export function applyLoop(s: LoopState, t: Throw, pi: number): LoopState {
  if (s.finished) return s
  const ns: LoopState = { ...s, log: [...s.log] }
  ns.marks = s.marks.map((m) => [...m])
  const idx = LOOP_NUMBERS.indexOf(t.n)
  if (idx >= 0 && t.m >= 1) ns.marks[pi][idx]++
  // win: all loop numbers hit at least once
  if (ns.marks[pi].every((m) => m > 0)) {
    ns.finished = true
    ns.log.push(`🔄 ${ns.players[pi].name} completes the Loop!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const loopDef: GameDef<LoopState> = {
  id: 'loop',
  name: 'Loop',
  tagline: 'Hit the wire-loop numbers: 20,4,6,8,9,10,14,16,18,19',
  type: 'practice',
  minPlayers: 2,
  maxPlayers: 8,
  init: initLoop,
  apply: applyLoop,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.marks[i].filter((m) => m > 0).length}/10 loops`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.players.findIndex((_, i) => s.marks[i].every((m) => m > 0))
    return { winnerIdxs: [w], summary: `${s.players[w].name} goes loopy!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Loops: s.marks[i].filter((m) => m > 0).length } })) }
  },
  guide: {
    objective: 'Hit every number that has a wire loop on a traditional board — 20, 4, 6, 8, 9, 10, 14, 16, 18, 19 — at least once. The awkward cluster is the challenge.',
    setup: ['Targets: 20, 4, 6, 8, 9, 10, 14, 16, 18, 19.'],
    play: ['Any segment of the number counts.', 'Mark each loop number once.'],
    winning: 'First to tick off all 10.',
    tips: ['4, 6, 8 sit in the cold zone between 20 and 12 — most misses live there.'],
  },
}

/* ============ Slip-up ============ */

export type SlipupState = Base & { target: number[]; slip: boolean[] }

export function initSlipup(players: { id: string; name: string }[]): SlipupState {
  return { ...base(players), target: players.map(() => 1), slip: players.map(() => false) }
}

export function applySlipup(s: SlipupState, t: Throw, pi: number): SlipupState {
  if (s.finished) return s
  const ns = clone3(s, ['target'], ['slip'])
  if (t.n === ns.target[pi]) ns.target[pi] = Math.min(20, ns.target[pi] + 1)
  endDart(ns)
  if (ns.td === 0) {
    // visit with no progress = slip: lose everything (back to 1)
    if (ns.target[pi] === s.target[pi]) {
      ns.target[pi] = 1
      ns.slip[pi] = true
      ns.log.push(`🍌 ${ns.players[pi].name} slips back to 1!`)
    }
    if (ns.target[pi] >= 20) {
      ns.finished = true
      ns.log.push(`✅ ${ns.players[pi].name} slips to the top and wins!`)
    }
  }
  return ns
}

export const slipupDef: GameDef<SlipupState> = {
  id: 'slip-up',
  name: 'Slip-up',
  tagline: 'Around the clock, but a barren visit sends you back to 1',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 6,
  init: initSlipup,
  apply: applySlipup,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `#${s.target[i]}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.target.findIndex((t) => t >= 20)
    return { winnerIdxs: [w], summary: `${s.players[w].name} never slipped!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Reached: s.target[i] } })) }
  },
  guide: {
    objective: 'Around the Clock with no safety net: hit your current number to advance, but a visit with zero hits sends you all the way back to 1.',
    setup: ['Start at 1.', '3 darts per visit.'],
    play: ['Any hit advances you one number.', 'A visit with no hit = slip back to 1.'],
    winning: 'Reach 20 first.',
    tips: ['The comeback is real — nothing is safe until 20 falls.'],
  },
}

/* ============ Shove Ha'penny ============ */

export type ShoveState = Base & { boardMarks: number[][] } // 9 "beds" = numbers 20,19,18,17,16,15,14,13,12... simplified to 9 numbers

const SHOVE_BEDS = [20, 19, 18, 17, 16, 15, 14, 13, 12]

export function initShove(players: { id: string; name: string }[]): ShoveState {
  return { ...base(players), boardMarks: players.map(() => SHOVE_BEDS.map(() => 0)) }
}

export function applyShove(s: ShoveState, t: Throw, pi: number): ShoveState {
  if (s.finished) return s
  const ns: ShoveState = { ...s, log: [...s.log] }
  ns.boardMarks = s.boardMarks.map((m) => [...m])
  const bed = SHOVE_BEDS.indexOf(t.n)
  if (bed >= 0 && ns.boardMarks[pi][bed] < 3) {
    ns.boardMarks[pi][bed]++
    if (ns.boardMarks[pi][bed] === 3) ns.log.push(`🪙 ${ns.players[pi].name} shoves a halfpenny in ${t.n}`)
  }
  // win: 3 marks in every bed
  if (ns.boardMarks[pi].every((m) => m >= 3)) {
    ns.finished = true
    ns.log.push(`🪙 ${ns.players[pi].name} shoves to victory!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const shoveDef: GameDef<ShoveState> = {
  id: 'shove-hapenny',
  name: "Shove Ha'penny",
  tagline: 'Three hits in each bed 20→12 — the pub classic',
  type: 'practice',
  minPlayers: 1,
  maxPlayers: 4,
  init: initShove,
  apply: applyShove,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.boardMarks[i].filter((m) => m >= 3).length}/9 beds`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.players.findIndex((_, i) => s.boardMarks[i].every((m) => m >= 3))
    return { winnerIdxs: [w], summary: `${s.players[w].name} masters the ha'penny!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Beds: s.boardMarks[i].filter((m) => m >= 3).length } })) }
  },
  guide: {
    objective: "The old pub game in darts form: land 3 hits in each \"bed\" — the numbers 20 down to 12 — to win.",
    setup: ['Beds: 20, 19, 18, 17, 16, 15, 14, 13, 12.'],
    play: ['Every dart in a bed chalks towards its 3.', '3 in a bed closes it.'],
    winning: 'Close all 9 beds.',
    tips: ['Singles count the same as trebles here — volume beats precision.'],
  },
}

/* ============ Warfare (Soldiers) ============ */

export type WarfareState = Base & { army: number[] } // soldiers alive per player

export function initWarfare(players: { id: string; name: string }[]): WarfareState {
  return { ...base(players), army: players.map(() => 10) }
}

export function applyWarfare(s: WarfareState, t: Throw, pi: number): WarfareState {
  if (s.finished) return s
  const ns = clone3(s, ['army'])
  // treble kills 3, double 2, single 1 — of the enemy of your choice (next living player)
  const dmg = t.m === 3 ? 3 : t.m === 2 ? 2 : 1
  const enemyIdx = ns.players.findIndex((_, i) => i !== pi && ns.army[i] > 0)
  if (enemyIdx >= 0 && t.n >= 1 && t.n <= 20) {
    ns.army[enemyIdx] = Math.max(0, ns.army[enemyIdx] - dmg)
    if (ns.army[enemyIdx] === 0) ns.log.push(`🎖️ ${ns.players[enemyIdx].name}'s army is wiped out!`)
  }
  const survivors = ns.players.filter((_, i) => ns.army[i] > 0)
  if (survivors.length === 1) {
    ns.finished = true
    ns.log.push(`🏆 ${survivors[0].name} conquers all!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const warfareDef: GameDef<WarfareState> = {
  id: 'warfare',
  name: 'Warfare',
  tagline: 'Armies of 10 — trebles kill 3, doubles 2, singles 1',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 4,
  init: initWarfare,
  apply: applyWarfare,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.army[i]} soldiers`, tone: (s.army[i] === 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.army.findIndex((a) => a > 0)
    return { winnerIdxs: [w], summary: `${s.players[w].name} conquers all!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Soldiers: s.army[i] } })) }
  },
  guide: {
    objective: 'Every player commands 10 soldiers. Each dart on a number kills enemies: single = 1, double = 2, treble = 3. Wipe out every other army to win.',
    setup: ['10 soldiers each.', '3 darts per turn — aim anywhere on 1-20.'],
    play: ['Damage applies to the next living opponent.', 'Trebles are artillery: 3 kills a dart.'],
    winning: 'Last army standing.',
    tips: ['This is a hidden 501 drill: your scoring power IS your firepower.'],
  },
}

/* ============ Tennis ============ */

export type TennisState = Base & { pts: number[]; games: number[]; server: number }

// scoring: 0,15,30,40,game — simplified to points 0..4
export function initTennis(players: { id: string; name: string }[]): TennisState {
  return { ...base(players), pts: players.map(() => 0), games: players.map(() => 0), server: 0 }
}

const TENNIS_NAMES = ['0', '15', '30', '40', 'GAME']

export function applyTennis(s: TennisState, t: Throw, pi: number): TennisState {
  if (s.finished) return s
  const ns = clone3(s, ['pts', 'games'], [])
  // must hit 15 (the "service line") or better to score: T15 = ace
  if (t.n === 15 && t.m === 3) ns.pts[pi] += 2
  else if (t.n === 15) ns.pts[pi] += 1
  else if (t.n === 25 && t.m >= 25) ns.pts[pi] += 2
  // resolve game points
  if (ns.pts[pi] >= 4) {
    ns.games[pi]++
    ns.pts = ns.players.map(() => 0)
    ns.log.push(`🎾 ${ns.players[pi].name} holds serve! (${ns.games[pi]} games)`)
    if (ns.games[pi] >= 6) {
      ns.finished = true
      ns.log.push(`🏆 ${ns.players[pi].name} wins the set 6–${ns.games[1 - pi]}!`)
      return ns
    }
  }
  endDart(ns)
  return ns
}

export const tennisDef: GameDef<TennisState> = {
  id: 'tennis',
  name: 'Tennis',
  tagline: 'Serve at 15s & bulls — 15/30/40/game, first to 6 games',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 2,
  init: initTennis,
  apply: applyTennis,
  currentPlayer: (s) => s.cur,
  columns: (s) => [
    { key: 'score', label: 'Score', value: `${TENNIS_NAMES[Math.min(4, s.pts[0])]}–${TENNIS_NAMES[Math.min(4, s.pts[1])]}`, tone: 'muted' },
    ...s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.games[i]} games`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  ],
  result: (s) => {
    if (!s.finished) return null
    const w = s.games.findIndex((g) => g >= 6)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins the set!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Games: s.games[i] } })) }
  },
  guide: {
    objective: 'Tennis scoring on the board: hit T15 (or the bull) for 2 points, single 15 for 1. Four points wins the game (0-15-30-40-game); first to 6 games takes the set.',
    setup: ['Two players.', 'The 15 segment and the bull are your "court".'],
    play: ['T15 or bull = 2 points; single 15 = 1 point.', '4 points = one game (0→15→30→40→GAME).', '6 games wins the set.'],
    winning: 'First to 6 games.',
    tips: ['T15 is the money shot — it is a big treble, honest for once.'],
  },
}

/* ============ Scam ============ */

export type ScamState = Base & {
  stopper: number        // seat currently blocking
  blocked: boolean[]     // index 1..20 — numbers the stopper has locked
  scorerPts: number[]    // per-seat scoring-phase totals
  chase: number | null   // target the current scorer must beat (null = setting it)
  winner: number | null
}

export function initScam(players: { id: string; name: string }[]): ScamState {
  return { ...base(players), stopper: 0, blocked: Array(21).fill(false), scorerPts: players.map(() => 0), chase: null, winner: null }
}

const blockedCount = (s: ScamState) => s.blocked.filter(Boolean).length

export function applyScam(s: ScamState, t: Throw, pi: number): ScamState {
  if (s.finished || s.players.length !== 2) return s
  const ns: ScamState = { ...s, log: [...s.log], blocked: [...s.blocked], scorerPts: [...s.scorerPts] }
  const scorer = 1 - ns.stopper
  if (pi === ns.stopper) {
    // stopper: one dart of any kind locks that number (distinct numbers).
    // Both seats throw concurrently — the stopper blocks WHILE the scorer farms.
    if (t.n >= 1 && t.n <= 20 && !ns.blocked[t.n]) {
      ns.blocked[t.n] = true
      if (blockedCount(ns) >= 20) {
        if (ns.chase === null) {
          // first innings over: bank the scorer's total, swap roles
          const banked = ns.scorerPts[scorer]
          ns.stopper = scorer
          ns.chase = banked
          ns.blocked = Array(21).fill(false)
          ns.log.push(`🔄 Board locked! ${ns.players[scorer].name} set ${banked} — roles swap, ${ns.players[1 - scorer].name} chases`)
        } else {
          // the chasing scorer ran out of board — the target-setter (current stopper) wins
          ns.finished = true
          ns.winner = ns.stopper
          ns.log.push(`🔒 Board locked again — ${ns.players[ns.stopper].name} defended the target!`)
          return ns
        }
      }
    }
  } else {
    // scorer: face value on any UNBLOCKED number
    if (t.n >= 1 && t.n <= 20 && !ns.blocked[t.n]) {
      ns.scorerPts[pi] += value(t)
      if (ns.chase !== null && ns.scorerPts[pi] >= ns.chase) {
        ns.finished = true
        ns.winner = pi
        ns.log.push(`🎯 ${ns.players[pi].name} passes ${ns.chase} and wins the Scam!`)
        return ns
      }
    }
  }
  endDart(ns)
  return ns
}

export const scamDef: GameDef<ScamState> = {
  id: 'scam',
  name: 'Scam',
  tagline: 'Stopper blocks 20 numbers, scorer chases — then swap',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 2,
  init: initScam,
  apply: applyScam,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: i === s.stopper ? `blocked ${blockedCount(s)}/20` : `${s.scorerPts[i]} pts${s.chase !== null ? ` / ${s.chase}` : ''}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished || s.winner === null) return null
    const w = s.winner
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins the Scam!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.scorerPts[i], Target: s.chase ?? '—' } })) }
  },
  guide: {
    objective: 'The Stopper hits any 20 different numbers to lock the board while the Scorer farms points on everything still unlocked. Then you swap — beat their score to win.',
    setup: ['Player 1 stops first, player 2 scores.', 'Stopper needs 20 distinct number hits to end the phase.'],
    play: ['Stopper: block the big numbers first — 20, 19, 18…', 'Scorer: farm whatever is left, singles are fine.', 'Swap roles; the new Scorer must beat the first total.'],
    winning: 'Highest score across your Scoring phase.',
    tips: ['Stoppers: the clock is your weapon — 20 hits comes fast.', 'Scorers: 60s before the 20s die.'],
  },
}

/* ============ Gotcha (X01 variant) ============ */

export type GotchaState = Base & { scores: number[]; target: number }

export function initGotcha(players: { id: string; name: string }[]): GotchaState {
  return { ...base(players), scores: players.map(() => 0), target: 301 }
}

export function applyGotcha(s: GotchaState, t: Throw, pi: number): GotchaState {
  if (s.finished) return s
  const ns = clone3(s, ['scores'])
  ns.scores[pi] += value(t)
  // exact landing on a prime number (2,3,5,7,11,...) = steal 25 from the leader
  const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251, 257, 263, 269, 271, 277, 281, 283, 293]
  if (PRIMES.includes(ns.scores[pi])) {
    const leader = ns.scores.indexOf(Math.max(...ns.scores))
    if (leader !== pi) {
      ns.scores[leader] = Math.max(0, ns.scores[leader] - 25)
      ns.log.push(`😈 ${ns.players[pi].name} lands on ${ns.scores[pi]} — steals 25 from ${ns.players[leader].name}!`)
    }
  }
  if (ns.scores[pi] >= ns.target) {
    ns.finished = true
    ns.log.push(`🎭 ${ns.players[pi].name} plays the perfect Gotcha!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const gotchaDef: GameDef<GotchaState> = {
  id: 'gotcha',
  name: 'Gotcha',
  tagline: 'Count-up to 301 — land on a prime and steal 25',
  type: 'x01',
  minPlayers: 2,
  maxPlayers: 6,
  init: initGotcha,
  apply: applyGotcha,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.scores[i]}/301`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.scores.findIndex((v) => v >= s.target)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins Gotcha!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.scores[i] } })) }
  },
  guide: {
    objective: 'Count-up race to 301 with betrayal: exactly landing your TOTAL on a prime number (23, 29, 31…) steals 25 points from the current leader.',
    setup: ['Target 301.', 'Prime ambushes: 2, 3, 5, 7, 11, 13, 17, 19, 23…'],
    play: ['Score normally, but know your primes!', 'Landing on a prime drains the leader by 25.'],
    winning: 'First to 301.',
    tips: ['Counting primes becomes a second nature — 271 is a dagger from 299.'],
  },
}

/* ============ Quickfire ============ */

export type QuickfireState = Base & { hits: number[]; timeLeft: number[]; done: boolean[] }

export function initQuickfire(players: { id: string; name: string }[]): QuickfireState {
  return { ...base(players), hits: players.map(() => 0), timeLeft: players.map(() => 60), done: players.map(() => false) }
}

export function applyQuickfire(s: QuickfireState, t: Throw, pi: number): QuickfireState {
  if (s.finished) return s
  const ns = clone3(s, ['hits', 'timeLeft'], ['done'])
  // per-player clock: the game ends when EVERY player's run is over
  if (ns.done[pi]) {
    endDart(ns)
    return ns
  }
  if (t.n % 2 === 1 && t.n >= 1) ns.hits[pi]++
  else ns.timeLeft[pi] = Math.max(0, ns.timeLeft[pi] - 5)
  ns.timeLeft[pi] = Math.max(0, ns.timeLeft[pi] - 2)
  if (ns.hits[pi] >= 15 || ns.timeLeft[pi] === 0) {
    ns.done[pi] = true
    ns.log.push(ns.hits[pi] >= 15 ? `⏱️ ${ns.players[pi].name} beats the clock (${ns.hits[pi]} hits)!` : `⏰ ${ns.players[pi].name} runs out of time (${ns.hits[pi]} hits)`)
  }
  if (ns.done.every((d) => d)) {
    ns.finished = true
    ns.log.push('⏱️ All clocks run down — game over')
    return ns
  }
  endDart(ns)
  return ns
}

export const quickfireDef: GameDef<QuickfireState> = {
  id: 'quickfire',
  name: 'Quickfire',
  tagline: '60 seconds: 15 odd-number hits before time dies',
  type: 'practice',
  minPlayers: 1,
  maxPlayers: 4,
  init: initQuickfire,
  apply: applyQuickfire,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.hits[i]}/15 · ${s.timeLeft[i]}s`, tone: (s.timeLeft[i] === 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.hits.findIndex((h) => h >= 15)
    return { winnerIdxs: [w], summary: w >= 0 ? `${s.players[w].name} fires fastest!` : 'Time beats everyone!', stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Hits: s.hits[i], Seconds: s.timeLeft[i] } })) }
  },
  guide: {
    objective: 'Beat the clock: 60 seconds on the clock, hit 15 odd numbers. Odd hits advance; misses and evens burn 5 seconds each. Every dart costs 2.',
    setup: ['60-second clock.', 'Target: 15 odd-number hits.'],
    play: ['Odd number hit = progress.', 'Miss or even = −5 seconds.', 'Each dart thrown = −2 seconds.'],
    winning: 'Land 15 odd hits before the clock dies.',
    tips: ['11, 15, 9 are big odd targets. Skip 1 and 3 — they are time traps.'],
  },
}
