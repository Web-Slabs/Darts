// The framework every game plugs into.
import type { Throw } from './board'

export type GameId =
  | 'x01'
  | 'cricket'
  | 'scram'
  | 'english-cricket'
  | 'mickey-mouse'
  | 'mulligan'
  | 'killer'
  | 'sa-killer'
  | 'blind-killer'
  | 'around-the-clock'
  | 'around-the-clock-180'
  | 'shanghai'
  | 'chase-the-dragon'
  | 'bermuda-triangle'
  | 'nine-lives'
  | 'steeplechase'
  | 'grand-national'
  | 'hare-and-hounds'
  | 'follow-me'
  | 'follow-the-leader'
  | 'prisoner'
  | 'halve-it'
  | 'high-score'
  | 'fives'
  | 'bobs-27'
  | 'knockout'
  | 'sudden-death'
  | 'tic-tac-toe'
  | 'golf'
  | 'baseball'
  | 'football'
  | 'snooker'
  | 'tennis'
  | 'bowls'
  | 'warfare'
  | 'battleships'
  | 'count-up'
  | 'climb'
  | 'ho-no'
  | 'indy-500'
  | 'loop'
  | 'slip-up'
  | 'shove-hapenny'
  | 'scam'
  | 'gotcha'
  | 'quickfire'

export type PlayerConfig = {
  id: string
  name: string
  /** Optional per-player variant choice, e.g. Killer's allocated number */
  variant?: string
}

/** Game families, shown as sections on the home screen. */
export type GameType = 'x01' | 'cricket-family' | 'killer-family' | 'race' | 'practice' | 'sports'

export const GAME_TYPE_LABELS: Record<GameType, { title: string; blurb: string }> = {
  'x01': { title: 'X01 (301–901)', blurb: 'The championship format — race to zero, checkout on a double' },
  'cricket-family': { title: 'Cricket Family', blurb: 'Close the numbers, score on the open ones' },
  'killer-family': { title: 'Killer & SA Killer', blurb: 'Hunt your opponents — last one standing wins' },
  'race': { title: 'Race Games', blurb: 'Beat the board in order — around the clock and beyond' },
  'practice': { title: 'Practice & Accuracy', blurb: 'Sharpen your game under pressure' },
  'sports': { title: 'Sports Classics', blurb: 'Golf, baseball and other board sports' },
}

/** A game exposes three hooks and derives everything else from the throws log. */
export type GameDef<S> = {
  id: GameId
  name: string
  tagline: string
  type: GameType
  /** 1-4 typical; some games cap at 2 teams */
  minPlayers: number
  maxPlayers: number
  /** Names of variant options shown in setup */
  options?: GameOption[]
  init: (players: PlayerConfig[], settings: Record<string, string>) => S
  /** Apply one thrown dart; return new state (pure) */
  apply: (state: S, t: Throw, playerIdx: number) => S
  /** Who throws next — defaults to state.cur when omitted */
  currentPlayer?: (state: S) => number
  /** Custom action buttons (bull-off, victim picks…) shown instead of/above the dart pad */
  actions?: (state: S) => GameAction[]
  /** Rules + how-to-play content */
  guide?: Guide
  /** Per-player display columns rendered by the scoreboard UI */
  columns: (state: S) => Column[]
  /** Winner(s) when finished, else null */
  result: (state: S) => GameResult | null
  /** Short per-player status line, e.g. checkout hint */
  status?: (state: S, playerIdx: number) => string
}

export type GameOption = {
  key: string
  label: string
  choices: { value: string; label: string }[]
  default: string
}

export type Column = {
  key: string
  label: string
  value: string
  /** Highlight styling hint */
  tone?: 'good' | 'bad' | 'active' | 'muted'
}

export type Guide = {
  objective: string
  setup: string[]
  play: string[]
  winning: string
  tips: string[]
}

export type GameAction = { label: string; perform: (state: any) => any }

export type GameResult = {
  winnerIdxs: number[]
  summary: string
  /** Per-player final stats recorded to history */
  stats: { playerId: string; name: string; lines: Record<string, string | number>; won: boolean }[]
}

export type DartRecord = { playerIdx: number; t: Throw }
