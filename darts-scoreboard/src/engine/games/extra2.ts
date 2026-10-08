// Batch 3 — twelve more games from research (Darts Corner / darts-uk catalogs).
// Same conventions: cur = current player, td = darts this turn, 3 darts per visit.

import { type Throw, value, label, SEGMENTS } from '../board'
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

const clone2 = <T extends Base>(s: T, numKeys: (keyof T)[] = [], boolKeys: (keyof T)[] = []): T => {
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

/* ============ 180 Around the Clock ============ */

export type Atc180State = Base & { target: number[]; pts: number[] }

export function initAtc180(players: { id: string; name: string }[]): Atc180State {
  return { ...base(players), target: players.map(() => 1), pts: players.map(() => 0) }
}

export function applyAtc180(s: Atc180State, t: Throw, pi: number): Atc180State {
  if (s.finished) return s
  const ns = clone2(s, ['target', 'pts'])
  if (t.n === ns.target[pi]) ns.pts[pi] += t.m === 3 ? 3 : t.m === 2 ? 2 : 1
  endDart(ns)
  if (ns.td === 0) {
    // after everyone played this number, move target up
    const everyoneDone = ns.players.every(() => true)
    void everyoneDone
    if (ns.cur === 0 || ns.players.length === 1) {
      if (ns.target[0] < 20) ns.target = ns.target.map((x) => Math.min(20, x + 1))
      else ns.finished = true
    }
  }
  return ns
}

export const atc180Def: GameDef<Atc180State> = {
  id: 'around-the-clock-180',
  name: '180 Around the Clock',
  tagline: '1→20 scoring S=1 D=2 T=3 · perfect score 180',
  type: 'practice',
  minPlayers: 1,
  maxPlayers: 8,
  init: initAtc180,
  apply: applyAtc180,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.pts[i]} pts @${s.target[i]}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.pts.indexOf(Math.max(...s.pts))
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins with ${s.pts[w]}/180`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.pts[i] } })) }
  },
  guide: {
    objective: 'Accuracy test: throw at 1, then 2 … up to 20. Each hit scores 1 (single), 2 (double) or 3 (treble). Maximum 9 points per round, perfect game = 180.',
    setup: ['Everyone throws at the same number each round, 3 darts.'],
    play: ['Hits on the current number score; anything else is practice.', 'After all players have thrown, the number advances.'],
    winning: 'Highest total after number 20.',
    tips: ['The treble is worth 3× the single — always chase it.', 'Great solo benchmark: beat your own 180-score week on week.'],
  },
}

/* ============ Football ============ */

export type FootballState = Base & { kickedOff: boolean[]; goals: number[] }

export function initFootball(players: { id: string; name: string }[]): FootballState {
  return { ...base(players), kickedOff: players.map(() => false), goals: players.map(() => 0) }
}

export function applyFootball(s: FootballState, t: Throw, pi: number): FootballState {
  if (s.finished) return s
  const ns = clone2(s, ['goals'], ['kickedOff'])
  if (!ns.kickedOff[pi]) {
    if (t.n === 25 && t.m >= 25) {
      ns.kickedOff[pi] = true
      ns.log.push(`⚽ ${ns.players[pi].name} kicks off!`)
    }
  } else if (t.n === 25 && t.m >= 25) {
    ns.goals[pi]++
  } else if (t.n <= 20 && t.m === 2) {
    ns.goals[pi]++
  }
  if (ns.goals[pi] >= 10) {
    ns.finished = true
    ns.log.push(`🏆 ${ns.players[pi].name} wins 10 goals!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const footballDef: GameDef<FootballState> = {
  id: 'football',
  name: 'Football',
  tagline: 'Bull to kick off, doubles are goals — first to 10',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 4,
  init: initFootball,
  apply: applyFootball,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.kickedOff[i] ? `${s.goals[i]} ⚽` : 'kick off first', tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.goals.indexOf(10)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins the match!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Goals: s.goals[i] } })) }
  },
  guide: {
    objective: 'Hit the bull to kick off, then score 10 goals — any double on the board (the bull also counts).',
    setup: ['Everyone starts needing a kick-off bull.', '3 darts per turn.'],
    play: ['No kick-off: only the bull matters.', 'Kicked off: every double (and the bull) is a goal.', 'First to 10 goals wins.'],
    winning: 'First to 10 goals.',
    tips: ['D20 is the biggest target double.', 'Kick off fast — goals beat style.'],
  },
}

/* ============ Grand National ============ */

export type GnState = Base & { hurdle: number[]; out: boolean[]; visitStart: number[] }

// anticlockwise FROM 20: 20, 5, 12, 9 … (reverse the clockwise order but keep 20 first)
const GN_ORDER = [SEGMENTS[0], ...[...SEGMENTS].slice(1).reverse()]

export function initGrandNational(players: { id: string; name: string }[]): GnState {
  return { ...base(players), hurdle: players.map(() => 0), out: players.map(() => false), visitStart: players.map(() => 0) }
}

export function applyGrandNational(s: GnState, t: Throw, pi: number): GnState {
  if (s.finished) return s
  const ns = clone2(s, ['hurdle', 'visitStart'], ['out'])
  if (!ns.out[pi]) {
    const need = GN_ORDER[ns.hurdle[pi]]
    if (t.n === need) {
      ns.hurdle[pi]++
      if (ns.hurdle[pi] >= 20) {
        ns.finished = true
        ns.log.push(`🐎 ${ns.players[pi].name} wins the Grand National!`)
        return ns
      }
    }
  }
  endDart(ns)
  if (ns.td === 0 && !ns.out[pi]) {
    // fall if THIS visit made no progress (at ANY hurdle, not just the first)
    if (ns.hurdle[pi] === ns.visitStart[pi]) {
      ns.out[pi] = true
      ns.log.push(`💨 ${ns.players[pi].name} falls at hurdle ${Math.min(ns.hurdle[pi] + 1, 20)}!`)
    }
    ns.visitStart[pi] = ns.hurdle[pi]
  }
  return ns
}

export const grandNationalDef: GameDef<GnState> = {
  id: 'grand-national',
  name: 'Grand National',
  tagline: 'Anticlockwise race — fall at a hurdle and you are out',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 8,
  init: initGrandNational,
  apply: applyGrandNational,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.out[i] ? 'FELL' : `Hurdle ${Math.min(s.hurdle[i] + 1, 20)}/20`, tone: (s.out[i] ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.hurdle.indexOf(20)
    return { winnerIdxs: [w], summary: `${s.players[w].name} rides to victory!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Hurdles: s.hurdle[i], Fell: s.out[i] ? 'Yes' : 'No' } })) }
  },
  guide: {
    objective: 'Race the board ANTICLOCKWISE from 20. Clear a hurdle every visit — fail to hit the current segment with your 3 darts and you fall and are out.',
    setup: ['Hurdles run anticlockwise: 20, 5, 12, 9, 14, 11, 8, 16, 7, 19, 3, 17, 2, 15, 10, 6, 13, 4, 18, 1.'],
    play: ['Any part of the segment clears the hurdle.', 'A fruitless visit = fall = eliminated.'],
    winning: 'First rider to clear all 20 hurdles.',
    tips: ['Pressure game — small segments punish nerves.', 'One careful dart beats three wild ones.'],
  },
}

/* ============ Hare and Hounds ============ */

export type HhState = Base & { hareProgress: number[]; houndProgress: number[] }

export function initHareHounds(players: { id: string; name: string }[]): HhState {
  return { ...base(players), hareProgress: players.map(() => 0), houndProgress: players.map(() => -4) } // hound starts 4 hurdles behind (on 5)
}

export function applyHareHounds(s: HhState, t: Throw, pi: number): HhState {
  if (s.finished) return s
  const ns = clone2(s, ['hareProgress', 'houndProgress'])
  const isHare = pi % 2 === 0
  const needIdx = isHare ? ns.hareProgress[pi] : ns.houndProgress[pi]
  const need = SEGMENTS[((needIdx % 20) + 20) % 20]
  if (t.n === need) {
    if (isHare) ns.hareProgress[pi]++
    else ns.houndProgress[pi]++
    // catch check
    if (!isHare && ns.houndProgress[pi] >= ns.hareProgress[0]) {
      ns.finished = true
      ns.log.push(`🐕 ${ns.players[pi].name} catches the hare!`)
      return ns
    }
    if (isHare && ns.hareProgress[pi] >= 20) {
      ns.finished = true
      ns.log.push(`🐇 ${ns.players[pi].name} escapes around the board!`)
      return ns
    }
  }
  endDart(ns)
  return ns
}

export const hareHoundsDef: GameDef<HhState> = {
  id: 'hare-and-hounds',
  name: 'Hare & Hounds',
  tagline: 'The hare runs from 20, the hound chases from 5',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 2,
  init: initHareHounds,
  apply: applyHareHounds,
  currentPlayer: (s) => s.cur,
  columns: (s) =>
    s.players.map((p, i) => ({
      key: `p${i}`,
      label: `${i % 2 === 0 ? '🐇' : '🐕'} ${p.name}`,
      value: `at ${SEGMENTS[((((i % 2 === 0 ? s.hareProgress[i] : s.houndProgress[i]) % 20) + 20) % 20)]}`,
      tone: (i === s.cur ? 'active' : undefined) as Column['tone'],
    })),
  result: (s) => {
    if (!s.finished) return null
    const hareWon = s.log.some((l) => l.includes('escapes'))
    const w = hareWon ? 0 : 1
    return { winnerIdxs: [w], summary: hareWon ? 'The hare escapes!' : 'The hound catches the hare!', stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: {} })) }
  },
  guide: {
    objective: 'A chase: the hare starts at 20 and runs clockwise back to 20; the hound starts at 5 and must catch up before the hare escapes.',
    setup: ['Player 1 is the hare, player 2 the hound.', 'Both move clockwise through the board in order.'],
    play: ['Hit your current segment to advance.', 'The hare wins by completing the full loop; the hound wins by reaching the hare\u2019s position first.'],
    winning: 'Escape (hare) or catch (hound).',
    tips: ['The hound\u2019s head start deficit makes steady singles better than risky trebles.'],
  },
}

/* ============ Blind Killer ============ */

export type BlindKillerState = Base & { doubleMarks: number[]; number: number[]; revealed: boolean[]; lives: number[] }

export function initBlindKiller(players: { id: string; name: string }[]): BlindKillerState {
  // Random deals, but AT LEAST ONE SHARED PAIR IS GUARANTEED: a kill needs a
  // number shared by its owner and a hunter. Independent deals only produced a
  // duplicate ~5% of the time with 2 players — the game was unwinnable the
  // other 95%. (Caught by the fuzz suite: not finished in 4000 legal steps.)
  const nums = players.map(() => 1 + Math.floor(Math.random() * 20))
  if (new Set(nums).size === nums.length) {
    nums[1 % nums.length] = nums[0]
  }
  return { ...base(players), doubleMarks: players.map(() => 0), number: nums, revealed: players.map(() => false), lives: players.map(() => 3) }
}

export function applyBlindKiller(s: BlindKillerState, t: Throw, pi: number): BlindKillerState {
  if (s.finished) return s
  const ns = clone2(s, ['doubleMarks', 'number', 'lives'], ['revealed'])
  if (t.n <= 20 && t.m === 2 && !ns.revealed[pi]) {
    ns.doubleMarks[pi]++
    if (ns.doubleMarks[pi] >= 3) {
      ns.revealed[pi] = true
      ns.log.push(`🕵️ ${ns.players[pi].name} reveals their number: ${ns.number[pi]}!`)
    }
  } else if (ns.revealed[pi] && t.n === ns.number[pi] && t.m === 2) {
    const victim = ns.players.findIndex((_, i) => i !== pi && ns.number[i] === t.n)
    if (victim >= 0) {
      ns.lives[victim]--
      ns.log.push(`${ns.players[pi].name} hits ${ns.players[victim].name}! (${ns.lives[victim]} lives)`)
      if (ns.lives[victim] <= 0) ns.log.push(`💀 ${ns.players[victim].name} is out!`)
    }
  }
  const alive = ns.players.filter((_, i) => ns.lives[i] > 0)
  if (alive.length === 1) {
    ns.finished = true
    ns.log.push(`🏆 ${alive[0].name} survives the Blind Killer!`)
    return ns
  }
  endDart(ns)
  return ns
}

export const blindKillerDef: GameDef<BlindKillerState> = {
  id: 'blind-killer',
  name: 'Blind Killer',
  tagline: 'Hit any double ×3 to reveal your secret number — then hunt',
  type: 'killer-family',
  minPlayers: 2,
  maxPlayers: 6,
  init: initBlindKiller,
  apply: applyBlindKiller,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.lives[i] > 0 ? (s.revealed[i] ? `#${s.number[i]} ${'❤'.repeat(s.lives[i])}` : `D-marks ${s.doubleMarks[i]}/3`) : 'OUT', tone: (s.lives[i] <= 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.lives.findIndex((l) => l > 0)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins blind!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Number: s.revealed[i] ? s.number[i] : 'Hidden', Lives: s.lives[i] } })) }
  },
  guide: {
    objective: 'Killer with a twist: nobody knows their number. Hit ANY double three times to reveal your secret number, then eliminate that number\u2019s owner with its double.',
    setup: ['Secret numbers dealt randomly.', '3 lives each.', '3 darts per turn.'],
    play: ['Unrevealed: any double counts as a reveal mark (need 3).', 'Revealed: hit your number\u2019s DOUBLE to take a victim\u2019s life.', 'Last player alive wins.'],
    winning: 'Be the last survivor.',
    tips: ['Revealing fast matters less than knowing WHO to hunt — listen to the reveals.', 'Doubles practice disguised as chaos.'],
  },
}

/* ============ Knockout ============ */

export type KnockoutState = Base & { toBeat: number | null; lives: number[]; lastScore: number[] }

export function initKnockout(players: { id: string; name: string }[]): KnockoutState {
  return { ...base(players), toBeat: null, lives: players.map(() => 3), lastScore: players.map(() => 0) }
}

export function applyKnockout(s: KnockoutState, t: Throw, pi: number): KnockoutState {
  if (s.finished) return s
  const ns = clone2(s, ['lastScore', 'lives'])
  ns.lastScore[pi] += value(t)
  endDart(ns)
  if (ns.td === 0) {
    const total = ns.lastScore[pi]
    if (ns.toBeat === null || total > ns.toBeat) {
      ns.toBeat = total
    } else {
      ns.lives[pi]--
      ns.log.push(`${ns.players[pi].name} scored ${total} — needed more than ${ns.toBeat}. ${ns.lives[pi]} lives left`)
    }
    ns.lastScore[pi] = 0
    const alive = ns.players.filter((_, i) => ns.lives[i] > 0)
    if (alive.length === 1) {
      ns.finished = true
      ns.log.push(`🏆 ${alive[0].name} wins the Knockout!`)
    }
  }
  return ns
}

export const knockoutDef: GameDef<KnockoutState> = {
  id: 'knockout',
  name: 'Knockout',
  tagline: 'Beat the previous score or lose a life',
  type: 'practice',
  minPlayers: 2,
  maxPlayers: 8,
  init: initKnockout,
  apply: applyKnockout,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.lives[i] > 0 ? `${'❤'.repeat(s.lives[i])} · beat ${s.toBeat ?? '—'}` : 'OUT', tone: (s.lives[i] <= 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.lives.findIndex((l) => l > 0)
    return { winnerIdxs: [w], summary: `${s.players[w].name} survives the Knockout!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Lives: s.lives[i] } })) }
  },
  guide: {
    objective: 'The first player sets a 3-dart score. Everyone after must beat it. Fail and you lose a life (3 each).',
    setup: ['3 lives each.', '3 darts per visit.'],
    play: ['Any score counts — hit big or die.', 'Each successful beat raises the bar for the next player.'],
    winning: 'Last player with a life.',
    tips: ['A modest 45 keeps you alive; chasing 100+ on the bar is how you die.', 'Pressure mounts as the bar climbs — breath, throw.'],
  },
}

/* ============ Mickey Mouse ============ */

export type MmState = Base & { marks: number[][] } // per player, marks on 20..12 + bull (10 cells)

const MM_TARGETS = [20, 19, 18, 17, 16, 15, 14, 13, 12, 25]

export function initMickey(players: { id: string; name: string }[]): MmState {
  return { ...base(players), marks: players.map(() => MM_TARGETS.map(() => 0)) }
}

function mmCell(t: Throw, round: number): number {
  const want = MM_TARGETS[round - 1]
  if (want === 25) return t.n === 25 && t.m >= 25 ? (t.m === 50 ? 2 : 1) : 0
  if (t.n !== want) return 0
  return t.m
}

export function applyMickey(s: MmState, t: Throw, pi: number): MmState {
  if (s.finished) return s
  const ns = clone2(s)
  ns.marks = s.marks.map((m) => [...m])
  // The round advances ONLY on completion (below) — NOT on visit wrap. The old
  // code also let endDart's generic wrap-advance bump `round`, so round marched
  // past MM_TARGETS.length and wrote marks[pi][10] = NaN; the game could never
  // finish. (Caught by the fuzz suite: NaN at marks.0.10.)
  const round = Math.min(ns.round, MM_TARGETS.length)
  const marks = mmCell(t, round)
  const cap = MM_TARGETS[round - 1] === 25 ? 2 : 3
  ns.marks[pi][round - 1] = Math.min(cap, ns.marks[pi][round - 1] + marks)
  ns.td++
  if (ns.td >= 3) {
    ns.td = 0
    ns.cur = (ns.cur + 1) % ns.players.length
    if (ns.cur === 0 || ns.players.length === 1) {
      // check round completion once both players have thrown this round
      if (ns.players.every((_, i) => ns.marks[i][round - 1] >= cap)) {
        if (round >= MM_TARGETS.length) {
          ns.finished = true
          ns.log.push(`🐭 All segments closed!`)
        } else ns.round = round + 1
      }
    }
  }
  // individual win: someone closed everything
  const allDone = ns.players.findIndex((_, i) => ns.marks[i].every((m, r) => m >= (MM_TARGETS[r] === 25 ? 2 : 3)))
  if (allDone >= 0) {
    ns.finished = true
    ns.log.push(`🐭 ${ns.players[allDone].name} completes Mickey Mouse!`)
  }
  return ns
}

export const mickeyMouseDef: GameDef<MmState> = {
  id: 'mickey-mouse',
  name: 'Mickey Mouse',
  tagline: 'Cricket marks in strict order: 20→12 + bull, no points',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 4,
  init: initMickey,
  apply: applyMickey,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `R${s.round}: ${s.marks[i][s.round - 1]}/3`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.players.findIndex((_, i) => s.marks[i].every((m, r) => m >= (MM_TARGETS[r] === 25 ? 2 : 3)))
    return { winnerIdxs: w >= 0 ? [w] : [], summary: w >= 0 ? `${s.players[w].name} wins!` : 'Finished', stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: {} })) }
  },
  guide: {
    objective: 'Cricket without points: close 20, then 19 … down to 12, then the bull, in strict order. First to close everything wins.',
    setup: ['Targets in order: 20, 19, 18, 17, 16, 15, 14, 13, 12, bull.', 'S=1 mark, D=2, T=3; outer bull 1, inner bull 2.'],
    play: ['Only the current round\u2019s segment counts.', 'Everyone plays each segment before the game moves on.'],
    winning: 'First to close all 10 targets.',
    tips: ['T20 closes a round in one dart — always chase it.', 'The tail (13, 12) is where games slip away.'],
  },
}

/* ============ Mulligan ============ */

export type MullState = Base & { numbers: number[]; marks: number[]; bull: number[] }

export function initMulligan(players: { id: string; name: string }[]): MullState {
  const nums = Array.from({ length: 20 }, (_, i) => i + 1).sort(() => Math.random() - 0.5).slice(0, 6).sort((a, b) => b - a)
  return { ...base(players), numbers: nums, marks: players.map(() => 0), bull: players.map(() => 0) }
}

export function applyMulligan(s: MullState, t: Throw, pi: number): MullState {
  if (s.finished) return s
  const ns = clone2(s, ['marks', 'bull'])
  const stage = ns.marks[pi] // which of the 6 numbers we're on (0-5), 6 = bull
  if (stage < 6) {
    const want = ns.numbers[stage]
    if (t.n === want) ns.marks[pi] += t.m // treble jumps 3 stages
    if (ns.marks[pi] > stage + 3) ns.marks[pi] = stage + 3
  } else {
    if (t.n === 25 && t.m >= 25) ns.bull[pi] += t.m === 50 ? 2 : 1
    if (ns.bull[pi] >= 3) {
      ns.finished = true
      ns.log.push(`🍀 ${ns.players[pi].name} completes Mulligan!`)
      return ns
    }
  }
  endDart(ns)
  return ns
}

export const mulliganDef: GameDef<MullState> = {
  id: 'mulligan',
  name: 'Mulligan',
  tagline: 'Six random numbers + bull, cricket marks in order',
  type: 'cricket-family',
  minPlayers: 2,
  maxPlayers: 4,
  init: initMulligan,
  apply: applyMulligan,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.marks[i] < 6 ? `#${s.numbers[s.marks[i]]}` : `Bull ${s.bull[i]}/3`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.bull.findIndex((b) => b >= 3)
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins the luck of the Irish!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: {} })) }
  },
  guide: {
    objective: 'Mickey Mouse with dice: six random numbers drawn before play (plus the bull). Close them in order — trebles leapfrog up to three stages at once.',
    setup: ['Six numbers drawn at random, highest to lowest.', 'S=1 stage, D=2, T=3.', 'Bull last: outer 1, inner 2, need 3.'],
    play: ['Only your current stage\u2019s number counts.', 'A treble on target skips three stages — huge.'],
    winning: 'First to close the bull.',
    tips: ['The random draw is the fun — some nights are cruel.', 'T20 on a 20 draw is a jackpot.'],
  },
}

/* ============ Prisoner ============ */

export type PrisonerState = Base & { progress: number[]; prisoners: Record<string, number> } // "num" -> playerIdx

export function initPrisoner(players: { id: string; name: string }[]): PrisonerState {
  return { ...base(players), progress: players.map(() => 1), prisoners: {} }
}

export function applyPrisoner(s: PrisonerState, t: Throw, pi: number): PrisonerState {
  if (s.finished) return s
  const ns = clone2(s, ['progress'])
  ns.prisoners = { ...s.prisoners }
  const need = ns.progress[pi]
  if (t.n === need) {
    ns.progress[pi]++
    // free any prisoner on this number
    const key = String(t.n)
    if (ns.prisoners[key] !== undefined) delete ns.prisoners[key]
    if (ns.progress[pi] > 20) {
      ns.finished = true
      ns.log.push(`🔓 ${ns.players[pi].name} breaks out of prison and WINS!`)
      return ns
    }
  } else if (t.n >= 1 && t.n <= 20) {
    ns.prisoners[String(t.n)] = pi
  }
  endDart(ns)
  return ns
}

export const prisonerDef: GameDef<PrisonerState> = {
  id: 'prisoner',
  name: 'Prisoner',
  tagline: 'March 1→20; your stray darts can be captured',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 6,
  init: initPrisoner,
  apply: applyPrisoner,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `#${s.progress[i]}`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.progress.findIndex((p) => p > 20)
    return { winnerIdxs: [w], summary: `${s.players[w].name} escapes!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Progress: s.progress[i] } })) }
  },
  guide: {
    objective: 'Escape by hitting 1→20 in order. Misses stay stuck in the board as prisoners — hit a number where an opponent\u2019s dart is stranded and you capture it (their escape stalls while yours continues).',
    setup: ['Everyone starts on 1.', '3 darts per turn.'],
    play: ['Hit your current number to advance.', 'Missed darts become prisoners on their numbers.', 'Hitting a number that holds an opponent\u2019s prisoner captures it — in this version the captor simply keeps momentum.'],
    winning: 'First player past 20.',
    tips: ['Keep darts on YOUR number — stray prisoners are banners for your rivals.'],
  },
}

/* ============ Snooker ============ */

export type SnookerState = Base & { phase: 'red' | 'colour'; colourIdx: number; pts: number[]; reds: number[] }

const COLOURS: { name: string; n: number; pts: number }[] = [
  { name: 'Yellow', n: 16, pts: 2 },
  { name: 'Green', n: 17, pts: 3 },
  { name: 'Brown', n: 18, pts: 4 },
  { name: 'Blue', n: 19, pts: 5 },
  { name: 'Pink', n: 20, pts: 6 },
  { name: 'Black (bull)', n: 25, pts: 7 },
]

export function initSnooker(players: { id: string; name: string }[]): SnookerState {
  return { ...base(players), phase: 'red', colourIdx: 0, pts: players.map(() => 0), reds: players.map(() => 0) }
}

export function applySnooker(s: SnookerState, t: Throw, pi: number): SnookerState {
  if (s.finished) return s
  const ns = clone2(s, ['colourIdx', 'pts', 'reds'])
  if (ns.phase === 'red') {
    if (t.n >= 1 && t.n <= 15) {
      ns.pts[pi] += 1
      ns.reds[pi]++
      ns.phase = 'colour'
    }
  } else {
    const c = COLOURS[ns.colourIdx]
    const hit = c.n === 25 ? t.n === 25 && t.m >= 25 : t.n === c.n
    if (hit) {
      ns.pts[pi] += c.pts
      if (c.n === 25) {
        // black potted: cycle back to reds
        ns.colourIdx = 0
        ns.phase = 'red'
      } else {
        ns.colourIdx++
      }
      if (ns.pts[pi] >= 147) {
        ns.finished = true
        ns.log.push(`🎱 ${ns.players[pi].name} maksimum! 147!`)
        return ns
      }
    } else {
      // miss: turn passes, phase resets to red
      ns.phase = 'red'
    }
  }
  endDart(ns)
  return ns
}

export const snookerDef: GameDef<SnookerState> = {
  id: 'snooker',
  name: 'Snooker',
  tagline: 'Reds 1-15, then colours 16→20→bull — race to 147',
  type: 'sports',
  minPlayers: 2,
  maxPlayers: 4,
  init: initSnooker,
  apply: applySnooker,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: `${s.pts[i]} pts (${s.phase === 'red' ? 'red' : 'colour'})`, tone: (i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.pts.indexOf(Math.max(...s.pts))
    return { winnerIdxs: [w], summary: `${s.players[w].name} wins with ${s.pts[w]}`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Points: s.pts[i] } })) }
  },
  guide: {
    objective: 'Snooker on the board: pot a RED (any of 1-15, 1 point), then a COLOUR in order — Yellow 16 (2), Green 17 (3), Brown 18 (4), Blue 19 (5), Pink 20 (6), Black/bull (7) — then back to reds. First to 147 wins.',
    setup: ['Sequence: red → colour → red → colour…', 'A miss passes the turn.'],
    play: ['Reds: any segment 1-15 scores 1.', 'Colours must be potted in strict order.'],
    winning: 'First to 147 points (a maximum!).',
    tips: ['The bull as black is the killer pot — 7 points but tiny.', 'Steady reds build big breaks.'],
  },
}

/* ============ Sudden Death ============ */

export type SdState = Base & { call: number; alive: boolean[]; hitThisVisit: boolean[] }

export function initSuddenDeath(players: { id: string; name: string }[]): SdState {
  return { ...base(players), call: Math.ceil(Math.random() * 20), alive: players.map(() => true), hitThisVisit: players.map(() => false) }
}

export function applySuddenDeath(s: SdState, t: Throw, pi: number): SdState {
  if (s.finished) return s
  const ns = clone2(s, ['call'], ['alive', 'hitThisVisit'])
  if (ns.alive[pi] && t.n === ns.call) ns.hitThisVisit[pi] = true
  endDart(ns)
  if (ns.td === 0) {
    // the visit just ended: answer the call or die
    if (ns.alive[pi] && !ns.hitThisVisit[pi]) {
      ns.alive[pi] = false
      ns.log.push(`💀 ${ns.players[pi].name} misses the call (${ns.call}) — OUT!`)
    }
    ns.hitThisVisit[pi] = false
    const aliveIdxs = ns.players.map((_, i) => i).filter((i) => ns.alive[i])
    if (aliveIdxs.length <= 1) {
      ns.finished = true
      if (aliveIdxs.length === 1) ns.log.push(`🏆 ${ns.players[aliveIdxs[0]].name} survives Sudden Death!`)
      return ns
    }
    if (ns.cur === 0) {
      ns.call = Math.ceil(Math.random() * 20)
      ns.log.push(`📢 New call: ${ns.call}`)
    }
  }
  return ns
}

export const suddenDeathDef: GameDef<SdState> = {
  id: 'sudden-death',
  name: 'Sudden Death',
  tagline: 'Hit the called number or die — last one standing',
  type: 'practice',
  minPlayers: 2,
  maxPlayers: 8,
  init: initSuddenDeath,
  apply: applySuddenDeath,
  currentPlayer: (s) => s.cur,
  columns: (s) => [
    { key: 'call', label: 'Call', value: String(s.call), tone: 'muted' },
    ...s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.alive[i] ? 'alive' : 'OUT', tone: (!s.alive[i] ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  ],
  result: (s) => {
    if (!s.finished) return null
    const alive = s.alive.map((a, i) => (a ? i : -1)).filter((i) => i >= 0)
    if (alive.length === 1) {
      return { winnerIdxs: [alive[0]], summary: `${s.players[alive[0]].name} survives Sudden Death!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === alive[0], lines: {} })) }
    }
    return { winnerIdxs: [], summary: 'Nobody survives!', stats: s.players.map((p) => ({ playerId: p.id, name: p.name, won: false, lines: {} })) }
  },
  guide: {
    objective: 'The caller shouts a number each round. Hit it during your visit or you are eliminated. Last player standing wins.',
    setup: ['A random number is called every round.', '3 darts to answer the call.'],
    play: ['Any part of the called number saves you.', 'Miss the call with all 3 darts = out.'],
    winning: 'Be the last survivor.',
    tips: ['Small numbers (3, 7) are the graveyard — practise them.', 'Nerves win this game, not talent.'],
  },
}

/* ============ Follow the Leader (exact segment) ============ */

export type FtlState = Base & { targetN: number; targetM: number; lives: number[]; started: boolean }

export function initFtl(players: { id: string; name: string }[]): FtlState {
  return { ...base(players), targetN: 0, targetM: 0, lives: players.map(() => 3), started: false }
}

const sameSeg = (t: Throw, n: number, m: number) => t.n === n && t.m === m

export function applyFtl(s: FtlState, t: Throw, pi: number): FtlState {
  if (s.finished) return s
  const ns = clone2(s, ['targetN', 'targetM', 'lives'], ['started'])
  if (!ns.started) {
    // first dart ever sets the first target
    if (t.n >= 1 && t.n <= 20 && t.m >= 1) {
      ns.targetN = t.n
      ns.targetM = t.m
      ns.started = true
      ns.log.push(`First target set: ${label(t)}`)
    }
    endDart(ns)
    return ns
  }
  if (sameSeg(t, ns.targetN, ns.targetM)) {
    // passed! remaining darts set the next target; if 3rd dart, throw again (extra dart)
    ns.targetN = 0
    ns.targetM = 0
    ns.log.push(`${ns.players[pi].name} follows ${label(t)} — set a new target`)
  }
  endDart(ns)
  if (ns.td === 0) {
    // visit over without following = lose a life (if a target was live)
    if (ns.targetN !== 0) {
      ns.lives[pi]--
      ns.log.push(`${ns.players[pi].name} loses a life (${ns.lives[pi]} left)`)
      if (ns.lives[pi] <= 0) ns.log.push(`💀 ${ns.players[pi].name} is out`)
    }
    // set a fresh target from the last dart thrown this visit is handled by UI; keep last dart as target
    ns.targetN = t.n
    ns.targetM = t.m
  }
  const alive = ns.players.filter((_, i) => ns.lives[i] > 0)
  if (alive.length === 1) {
    ns.finished = true
    ns.log.push(`🏆 ${alive[0].name} wins Follow the Leader!`)
  }
  return ns
}

export const followLeaderDef: GameDef<FtlState> = {
  id: 'follow-the-leader',
  name: 'Follow the Leader',
  tagline: 'Match the EXACT segment the leader sets — 3 lives',
  type: 'race',
  minPlayers: 2,
  maxPlayers: 8,
  init: initFtl,
  apply: applyFtl,
  currentPlayer: (s) => s.cur,
  columns: (s) => s.players.map((p, i) => ({ key: `p${i}`, label: p.name, value: s.lives[i] > 0 ? `${'❤'.repeat(s.lives[i])}${s.targetN ? ` · match ${label({ n: s.targetN, m: s.targetM })}` : ''}` : 'OUT', tone: (s.lives[i] <= 0 ? 'bad' : i === s.cur ? 'active' : undefined) as Column['tone'] })),
  result: (s) => {
    if (!s.finished) return null
    const w = s.lives.findIndex((l) => l > 0)
    return { winnerIdxs: [w], summary: `${s.players[w].name} out-follows them all!`, stats: s.players.map((p, i) => ({ playerId: p.id, name: p.name, won: i === w, lines: { Lives: s.lives[i] } })) }
  },
  guide: {
    objective: 'The leader\u2019s dart sets an EXACT segment (e.g. small single 12). Everyone must hit that exact segment with their 3 darts or lose a life. Hit it and your remaining darts set the next brutal target.',
    setup: ['3 lives each.', 'First dart sets the opening target.'],
    play: ['Match the exact segment to pass the buck.', 'Leaders choose doubles/trebles to torture the table.'],
    winning: 'Last player with a life.',
    tips: ['When setting targets: D14 and T17 are Executioner\u2019s choices.', 'Mind the wire loops — the small singles are tiny.'],
  },
}
