// SA Killer board — the PUMA chalk scoreboard, upgraded per the user's brief:
//
//   • The X box (3 sections) sits RIGHT AGAINST the spine (it "hugs" it); the
//     score box sits outside it. Left player: [score][X] | spine. Right player
//     mirrored: spine | [X][score].
//   • X's are plain chalk X's only — /, ✗, ⊗ are gone. Choice of how a dub or
//     trip counts is made with the spine's D/T buttons, not different symbols.
//   • The spine has per-number DUB/TRIP buttons: tapping "D" next to 20 chalks
//     a D-channel X or scores 2×20 (player chooses at the prompt), same for T.
//   • A "Needs to win" cell under the names tells each player the best dart
//     right now, taking open channels and the score into account.
//
// Macro colour language kept: green X's = open, red struck-through = dead.

import { useState } from 'react'
import type { Throw } from '../engine/board'
import type { SaKillerState, SaCellKey } from '../engine/games/sa-killer'
import { SA_NUMBERS, channelState, needsToWin, throwForCell } from '../engine/games/sa-killer'
import { mk } from '../engine/board'

type Props = {
  state: SaKillerState
  /** Record one dart for the current player (single/BULL spine taps, MISS). */
  onThrow?: (t: Throw) => void
  onCellClick?: (playerIdx: number, cell: SaCellKey) => void
  /** Dart entry with a choice: fired when a D/T button is used. */
  onThrowChoice?: (playerIdx: number, t: Throw, asNumber: boolean) => void
  onRematch?: () => void
  onReset?: () => void
}

/** Spine order per the PUMA board: 20→10, D, T, BULL. */
const CHANNELS: SaCellKey[] = [...SA_NUMBERS.map((n) => `n${n}` as SaCellKey), 'D', 'T', 'B']

const spineLabel = (cell: SaCellKey) =>
  cell === 'B' ? 'BULL' : cell === 'D' ? 'D' : cell === 'T' ? 'T' : cell.slice(1)

function XBox({ marks, dead, onTap, label }: { marks: number; dead: boolean; onTap?: () => void; label: string }) {
  return (
    <button
      className={`sk-xbox${dead ? ' dead' : ''}`}
      onClick={onTap}
      disabled={!onTap}
      title={label}
      aria-label={`${label} — ${marks} of 3`}
    >
      {[0, 1, 2].map((k) => (
        <span key={k} className={`sk-x${marks > k ? ' on' : ''}`}>
          {marks > k ? '✗' : ''}
        </span>
      ))}
    </button>
  )
}

function Pair({
  s,
  pi,
  cell,
  mirrored,
  onCellClick,
}: {
  s: SaKillerState
  pi: number
  cell: SaCellKey
  mirrored?: boolean
  onCellClick?: Props['onCellClick']
}) {
  const st = channelState(s, pi, cell)
  const marks = s.players[pi].marks[cell] ?? 0
  const rowScore = s.rowScores[pi][cell]
  const label = `${s.players[pi].name} — ${cell === 'B' ? 'bull' : cell === 'D' ? 'double' : cell === 'T' ? 'treble' : cell.slice(1)} (${marks}/3)`
  // The X box hugs the spine; the score box sits on the outside.
  const xb = (
    <XBox marks={marks} dead={st === 'dead'} onTap={onCellClick ? () => onCellClick(pi, cell) : undefined} label={label} />
  )
  const sb = (
    <div className={`sk-scorebox${rowScore > 0 ? ' has' : ''}${st === 'dead' ? ' dead' : ''}`}>
      {rowScore > 0 ? rowScore : ''}
    </div>
  )
  return <>{mirrored ? <>{xb}{sb}</> : <>{sb}{xb}</>}</>
}

export default function SaKillerBoard({ state: s, onThrow, onCellClick, onThrowChoice, onRematch, onReset }: Props) {
  const margin = Math.abs(s.scores[0] - s.scores[1])
  const leader = s.scores[0] === s.scores[1] ? null : s.scores[0] > s.scores[1] ? 0 : 1
  const needs = needsToWin(s)
  // Pending D/T choice: which spine button was tapped and for whom.
  const [pending, setPending] = useState<{ pi: number; t: Throw } | null>(null)
  // Flash feedback on the spine label just thrown.
  const [lastHit, setLastHit] = useState<string | null>(null)
  const gameLive = !s.matchOver && !s.legOver && s.phase !== 'bulloff'

  const tap = (cell: SaCellKey, t: Throw) => {
    if (!gameLive || !onThrow) return
    setLastHit(cell)
    onThrow(t)
    setTimeout(() => setLastHit((k) => (k === cell ? null : k)), 350)
  }

  const spineBtn = (n: number, kind: 'D' | 'T') => {
    const t = kind === 'D' ? mk(n, 2) : mk(n, 3)
    return (
      <button
        className={`sk-spinebtn ${kind.toLowerCase()}`}
        title={`${kind === 'D' ? 'Dub' : 'Trip'} ${n}: 1 X in the ${kind} channel, or score/chalk ${kind === 'D' ? 2 : 3}× ${n} — choose after tapping`}
        onClick={() => onThrowChoice && setPending({ pi: s.cur, t })}
      >
        {kind}
      </button>
    )
  }

  return (
    <div className="sk-board">
      <div className="sk-header">KILLER</div>
      <div className="sk-sub">
        <div className="sk-playername left">{s.players[0].name}</div>
        <div className="sk-center">{leader === null ? '·' : `leads by ${margin}`}</div>
        <div className="sk-playername right">{s.players[1].name}</div>
      </div>

      {/* Needs-to-win cell */}
      <div className="sk-needswin">
        <div className="sk-needswin-cell">
          <span className="sk-needswin-name">{s.players[0].name} needs</span>
          <span className="sk-needswin-text">{needs[0]}</span>
        </div>
        <div className="sk-needswin-cell right">
          <span className="sk-needswin-name">{s.players[1].name} needs</span>
          <span className="sk-needswin-text">{needs[1]}</span>
        </div>
      </div>

      {/* Waiting state: explain WHY the spine is locked and what unlocks it. */}
      {!gameLive && (
        <div className="sk-needswin" style={{ borderColor: 'var(--gold)', borderWidth: 2 }}>
          <div className="sk-needswin-cell" style={{ gridColumn: '1 / -1', textAlign: 'center' }}>
            <span className="sk-needswin-text">
              {s.phase === 'bulloff'
                ? 'BULL-OFF — closest to the cherry throws first. Record the winner in the panel below the board; the spine unlocks straight after.'
                : s.matchOver
                  ? 'Match over — hit Rematch or Reset below.'
                  : `Leg to ${s.players[s.lastWinner]?.name ?? ''} — hit “Next leg” below the board to keep playing.`}
            </span>
          </div>
        </div>
      )}

      <div className="sk-grid">
        {CHANNELS.map((cell) => {
          const isNum = cell.startsWith('n')
          const n = isNum ? Number(cell.slice(1)) : 0
          return (
            <div className="sk-gridrow" key={cell}>
              <div className="sk-row">
                <Pair s={s} pi={0} cell={cell} onCellClick={onCellClick} />
              </div>
              <div className="sk-spinewrap">
                {isNum && onThrowChoice ? (
                  <div className="sk-spinecol">
                    <button
                      className={`sk-spinelabel btn${lastHit === cell ? ' hit' : ''}`}
                      title={`Single ${n}: chalk 1 X on ${n}, or score ${n} when the channel is open`}
                      onClick={() => tap(cell, mk(n, 1))}
                      disabled={!gameLive || !onThrow}
                    >
                      {spineLabel(cell)}
                    </button>
                    <div className="sk-spinebtns">
                      {spineBtn(n, 'D')}
                      {spineBtn(n, 'T')}
                    </div>
                  </div>
                ) : (
                  <button
                    className={`sk-spinelabel btn${lastHit === cell ? ' hit' : ''}`}
                    title={
                      cell === 'B'
                        ? 'BULL: chalk 1 X in the BULL channel, or score 25 when it is open'
                        : `Single ${n}: chalk 1 X on ${n}, or score ${n} when the channel is open`
                    }
                    onClick={() => tap(cell, throwForCell(cell))}
                    disabled={!gameLive || !onThrow}
                  >
                    {spineLabel(cell)}
                  </button>
                )}
              </div>
              <div className="sk-row right">
                <Pair s={s} pi={1} cell={cell} mirrored onCellClick={onCellClick} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="sk-totals">
        <div className="sk-total left">{s.scores[0]}</div>
        <div className="sk-totalcenter">{margin > 0 ? margin : ''}</div>
        <div className="sk-total right">{s.scores[1]}</div>
      </div>

      <div className="sk-footer">
        <button className="sk-btn" onClick={onRematch}>Rematch</button>
        <button className="sk-btn" onClick={onReset}>Reset</button>
      </div>

      {/* D/T choice prompt */}
      {pending && onThrowChoice && (
        <div className="sk-choice" role="dialog" aria-label="How does this dart count?">
          <div className="sk-choice-box">
            <p>
              <strong>{s.players[pending.pi].name}</strong> hit {pending.t.m === 2 ? 'DUB' : 'TRIP'} {pending.t.n} — chalk it as:
            </p>
            <div className="sk-choice-btns">
              <button
                className="sk-btn"
                onClick={() => { onThrowChoice(pending.pi, pending.t, false); setPending(null) }}
              >
                1 X in the {pending.t.m === 2 ? 'DUB' : 'TRIP'} channel
              </button>
              <button
                className="sk-btn"
                onClick={() => { onThrowChoice(pending.pi, pending.t, true); setPending(null) }}
              >
                {pending.t.m}× {pending.t.n}'s ({pending.t.m === 2 ? '2 X' : '3 X'}'s on {pending.t.n} / {pending.t.m * pending.t.n} points)
              </button>
            </div>
            <button className="sk-btn sk-choice-cancel" onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}
