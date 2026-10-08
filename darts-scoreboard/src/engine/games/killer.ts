// Killer — includes the Web-Slabs house rules from the Excel scorers:
// bull-off for order, each player allocated a number, hit the DOUBLE of your
// own number to become a killer, hitting an opponent's DOUBLE costs a life,
// 3 lives, last player standing wins. Also supports the standard variant.

import { type Throw, label } from '../board'
import type { GameDef, GameOption, Column } from '../core'

export type KillerState = {
  players: { id: string; name: string; number: number; lives: number; killer: boolean; former: boolean }[]
  houseDoubles: boolean // true = Excel house rules (double of number)
  turnDarts: number
  currentIdx: number
  phase: 'choose' | 'play' | 'done'
  winnerIdx: number
  lastAction: string
  log: string[]
}

export const killerOptions: GameOption[] = [
  {
    key: 'variant',
    label: 'Variant',
    choices: [
      { value: 'house', label: 'House rules (doubles — from your Excel sheet)' },
      { value: 'standard', label: 'Standard (singles)' },
    ],
    default: 'house',
  },
  {
    key: 'lives',
    label: 'Lives',
    choices: [
      { value: '3', label: '3' },
      { value: '5', label: '5' },
    ],
    default: '3',
  },
]

export function initKiller(players: { id: string; name: string }[], settings: Record<string, string>): KillerState {
  const n = players.length
  const nums = numbersFor(n)
  return {
    players: players.map((p, i) => ({ ...p, number: nums[i], lives: parseInt(settings['lives'] ?? '3', 10), killer: false, former: false })),
    houseDoubles: (settings['variant'] ?? 'house') === 'house',
    turnDarts: 0,
    currentIdx: 0,
    phase: 'play',
    winnerIdx: -1,
    lastAction: '',
    log: [],
  }
}

/** Allocate distinct numbers 1..N (or 1..20 if more than 20 players, wrap). */
export function numbersFor(n: number): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push((i % 20) + 1)
  return out
}

export function applyKiller(s: KillerState, t: Throw, playerIdx: number): KillerState {
  if (s.phase === 'done') return s
  const ns: KillerState = { ...s, players: s.players.map((p) => ({ ...p })), log: [...s.log], lastAction: '' }
  const p = ns.players[playerIdx]
  const need = ns.houseDoubles ? 2 : 1

  if (!p.killer) {
    if (t.n === p.number && t.m >= need && t.n <= 20) {
      p.killer = true
      ns.lastAction = `${p.name} is a KILLER!`
      ns.log.push(ns.lastAction)
    } else {
      ns.lastAction = `${p.name} misses becoming killer (${label(t)})`
    }
  } else {
    if (t.n >= 1 && t.n <= 20 && t.n !== p.number) {
      const victim = ns.players.find((q) => q.number === t.n && q !== p)
      if (victim && !victim.former && victim.lives > 0) {
        const validHit = ns.houseDoubles ? t.m === 2 : true
        if (validHit) {
          victim.lives--
          ns.lastAction = `${p.name} hits ${victim.name}! ${victim.lives} ${victim.lives === 1 ? 'life' : 'lives'} left`
          ns.log.push(ns.lastAction)
          if (victim.lives === 0) {
            victim.former = true
            ns.lastAction = `${victim.name} is OUT!`
            ns.log.push(ns.lastAction)
          }
        } else {
          ns.lastAction = `${p.name} hit ${victim.name}'s single — no kill (needs a double)`
        }
      } else {
        ns.lastAction = `${p.name} hits an empty number (${label(t)})`
      }
    } else if (t.n === p.number) {
      // House ruling: hitting your own double as a killer does nothing
      ns.lastAction = `${p.name} hits their own number — nothing happens`
    }
  }

  ns.turnDarts++
  if (ns.turnDarts >= 3) {
    ns.turnDarts = 0
    // advance to next living player
    let next = ns.currentIdx
    for (let k = 0; k < ns.players.length; k++) {
      next = (next + 1) % ns.players.length
      if (ns.players[next].lives > 0) break
    }
    ns.currentIdx = next
    const alive = ns.players.filter((q) => q.lives > 0)
    if (alive.length === 1) {
      ns.phase = 'done'
      ns.winnerIdx = ns.players.indexOf(alive[0])
      ns.log.push(`${alive[0].name} WINS!`)
    }
  }
  return ns
}

/** Index of player to throw next: round-robin, skipping eliminated players. */
export function killerTurn(s: KillerState): number {
  if (s.phase === 'done') return -1
  return s.currentIdx
}

export function killerColumns(s: KillerState): Column[] {
  const cols: Column[] = []
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i]
    cols.push({
      key: `p${i}`,
      label: `${p.number} — ${p.name}`,
      value: p.lives > 0 ? '❤'.repeat(p.lives) : 'OUT',
      tone: p.lives === 0 ? 'bad' : p.killer ? 'good' : undefined,
    })
  }
  return cols
}

export const killerDef: GameDef<KillerState> = {
  id: 'killer',
  name: 'Killer',
  tagline: 'Become the killer, hunt the others',
  type: 'killer-family',
  minPlayers: 3,
  maxPlayers: 10,
  options: killerOptions,
  init: initKiller,
  apply: applyKiller,
  currentPlayer: killerTurn,
  columns: killerColumns,
  result: (s) => {
    if (s.phase !== 'done') return null
    return {
      winnerIdxs: [s.winnerIdx],
      summary: `${s.players[s.winnerIdx].name} is the last killer standing`,
      stats: s.players.map((p, i) => ({
        playerId: p.id,
        name: p.name,
        won: i === s.winnerIdx,
        lines: { Lives: p.lives, Number: p.number },
      })),
    }
  },
}
