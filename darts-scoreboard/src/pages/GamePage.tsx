import { useMemo, useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGame } from '../engine/registry'
import type { PlayerConfig } from '../engine/core'
import type { Throw } from '../engine/board'
import { mk } from '../engine/board'
import { useStore } from '../lib/store'
import { track } from '../lib/analytics'
import { BOT_PROFILES, botAim, botThrow, type BotSkill } from '../engine/bot'
import type { X01State } from '../engine/games/x01'
import type { ScramState, EngCricketState } from '../engine/games/extra'
import { suggestCheckout } from '../engine/games/x01'
import X01SpineBoard from '../components/X01SpineBoard'
import type { SaKillerState, SaCellKey } from '../engine/games/sa-killer'
import { chalkSaKiller, applySaKillerChoice } from '../engine/games/sa-killer'
import X01Board from '../components/X01Board'
import SaKillerBoard from '../components/SaKillerBoard'
import CricketBoard from '../components/CricketBoard'
import ScramBoard from '../components/ScramBoard'
import EngCricketBoard from '../components/EngCricketBoard'
import PhotoDartboard from '../components/PhotoDartboard'
import { IconBook, IconUndo, IconDart, IconSpine, IconTrophy, IconBot, IconTarget } from '../components/icons'

type Phase = 'setup' | 'play'

export default function GamePage() {
  const { gameId } = useParams<{ gameId: string }>()
  const game = useMemo(() => {
    try {
      return getGame(gameId as Parameters<typeof getGame>[0])
    } catch {
      return undefined
    }
  }, [gameId])

  if (!game) {
    return (
      <>
        <h1>Game not found</h1>
        <Link className="btn" to="/">← Back home</Link>
      </>
    )
  }
  return <GameRunner key={game.id} gameId={game.id} />
}

function GameRunner({ gameId }: { gameId: Parameters<typeof getGame>[0] }) {
  const game = getGame(gameId)
  const roster = useStore((s) => s.players)
  const addPlayer = useStore((s) => s.addPlayer)
  const recordMatch = useStore((s) => s.recordMatch)

  const [phase, setPhase] = useState<Phase>('setup')
  const [selected, setSelected] = useState<string[]>(roster.slice(0, 2).map((p) => p.id))
  const [settings, setSettings] = useState<Record<string, string>>(() =>
    Object.fromEntries((game.options ?? []).map((o) => [o.key, o.default])),
  )
  const [botSkill, setBotSkill] = useState<BotSkill>(3)
  const [botEnabled, setBotEnabled] = useState(false)
  const [inputMode, setInputMode] = useState<'board' | 'spine'>('board')
  const [saChoice, setSaChoice] = useState<{ pi: number; t: Throw } | null>(null)
  const [states, setStates] = useState<any[]>([])
  const [showGuide, setShowGuide] = useState(false)
  const recordedRef = useRef(false)

  const state = states[states.length - 1] ?? null
  const result = state ? game.result(state) : null

  useEffect(() => {
    if (result && !recordedRef.current) {
      recordedRef.current = true
      recordMatch({
        game: game.name,
        summary: result.summary,
        players: result.stats.map((st) => ({ id: st.playerId, name: st.name, won: st.won, lines: st.lines })),
      })
      track('match_finished', { game: game.name })
    }
  }, [result, game, recordMatch])

  // Dartbot loop: when it's the bot's turn, throw after a beat.
  useEffect(() => {
    if (!state || result || !botEnabled || game.id !== 'x01') return
    const x = state as X01State
    if (x.legOver || x.matchOver) return
    const botIdx = 1
    if (x.cur !== botIdx) return
    const timer = setTimeout(() => {
      setStates((ss) => {
        const cur = ss[ss.length - 1] as X01State
        if (!cur || cur.cur !== botIdx || cur.legOver || cur.matchOver) return ss
        const aim = botAim(cur, botIdx, botSkill)
        const t = botThrow(aim, botSkill)
        return [...ss, (getGame('x01').apply as (s: X01State, t: Throw, i: number) => X01State)(cur, t, botIdx)]
      })
    }, 900)
    return () => clearTimeout(timer)
  }, [state, result, botEnabled, botSkill, game])

  const selectedPlayers: PlayerConfig[] = selected
    .map((id) => roster.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => ({ id: p!.id, name: p!.name }))

  function start() {
    recordedRef.current = false
    setStates([game.init(selectedPlayers, settings)])
    setPhase('play')
  }

  function throwDart(t: Throw) {
    if (!state || result) return
    const cur = game.currentPlayer ? game.currentPlayer(state) : (state as any).cur ?? 0
    if (botEnabled && game.id === 'x01' && cur === 1) return // bot's turn
    // SA Killer: a dub/trip from the dartboard gets the same channel choice as
    // the spine buttons — 1 X in the D/T channel, or 2×/3× the number.
    if (isSaKiller && t.m >= 2 && t.n <= 20) {
      setSaChoice({ pi: cur, t })
      return
    }
    setStates((ss) => [...ss, game.apply(state, t, cur)])
  }

  function undo() {
    if (states.length > 1) setStates((ss) => ss.slice(0, -1))
  }

  // Exposed to boards that take direct dart input (SA Killer spine).
  function recordThrow(t: Throw) {
    throwDart(t)
  }

  // SA Killer can be chalked by hand: tapping a box on the board chalks the
  // mark through the same rules a real dart would follow.
  function chalkCell(playerIdx: number, cell: SaCellKey) {
    if (!state || result) return
    setStates((ss) => [...ss, chalkSaKiller(state, playerIdx, cell)])
  }

  // SA Killer D/T choice: the player decides if a dub/trip chalks the D/T
  // channel (1 X) or counts as 2×/3× on the number (chalk or score).
  function saKillerChoice(playerIdx: number, t: Throw, asNumber: boolean) {
    if (!state || result) return
    setStates((ss) => [...ss, applySaKillerChoice(state, playerIdx, t, asNumber)])
  }

  const cur = state && !result ? (game.currentPlayer ? game.currentPlayer(state) : (state as any).cur ?? 0) : -1
  const curName = cur >= 0 ? selectedPlayers[cur]?.name : ''
  const columns = state ? game.columns(state) : []
  const status = state && cur >= 0 && game.status ? game.status(state, cur) : ''
  const actions = state && game.actions ? game.actions(state) : []

  if (phase === 'setup') {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1>{game.name}</h1>
          <button className="btn ghost small" onClick={() => setShowGuide((v) => !v)}>
            {showGuide ? 'Hide' : <><IconBook size={15} /> How to play</>}
          </button>
        </div>
        <p style={{ color: 'var(--muted)', marginTop: 0 }}>{game.tagline}</p>
        {showGuide && game.guide && <GuidePanel guide={game.guide} />}
        <div className="panel">
          <h3>Players ({selected.length} selected — {game.minPlayers}–{game.maxPlayers} supported)</h3>
          <div className="chips" style={{ margin: '10px 0 14px' }}>
            {roster.map((p) => (
              <button
                key={p.id}
                className={`chip ${selected.includes(p.id) ? 'selected' : ''}`}
                onClick={() =>
                  setSelected((sel) => (sel.includes(p.id) ? sel.filter((x) => x !== p.id) : [...sel, p.id]))
                }
              >
                {p.name}
              </button>
            ))}
          </div>
          <NewPlayerInline onAdd={(name) => addPlayer(name)} />
        </div>
        {game.options && game.options.length > 0 && (
          <div className="panel">
            <h3>Game options</h3>
            {game.options.map((o) => (
              <div key={o.key} style={{ marginBottom: 12 }}>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>{o.label}</div>
                <div className="chips">
                  {o.choices.map((c) => (
                    <button
                      key={c.value}
                      className={`chip ${settings[o.key] === c.value ? 'selected' : ''}`}
                      onClick={() => setSettings((s) => ({ ...s, [o.key]: c.value }))}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {game.id === 'x01' && (
          <div className="panel">
            <h3><IconBot size={17} /> Play against a dartbot</h3>
            <div className="chips" style={{ margin: '10px 0' }}>
              <button className={`chip ${!botEnabled ? 'selected' : ''}`} onClick={() => setBotEnabled(false)}>
                No bot (humans only)
              </button>
              <button className={`chip ${botEnabled ? 'selected' : ''}`} onClick={() => setBotEnabled(true)}>
                Add dartbot (Player 2)
              </button>
            </div>
            {botEnabled && (
              <>
                <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>Skill</div>
                <div className="chips">
                  {([1, 2, 3, 4, 5, 6, 7, 8, 9] as BotSkill[]).map((s) => (
                    <button key={s} className={`chip ${botSkill === s ? 'selected' : ''}`} onClick={() => setBotSkill(s)}>
                      {s} — {BOT_PROFILES[s].name} ({BOT_PROFILES[s].avg} avg)
                    </button>
                  ))}
                </div>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {BOT_PROFILES[botSkill].blurb}. Select ONE human player; the bot fills the other seat.
                </p>
              </>
            )}
          </div>
        )}
        <button
          className="btn"
          disabled={selected.length < game.minPlayers || selected.length > game.maxPlayers}
          onClick={start}
        >
          ▶ Start {game.name}
        </button>
      </>
    )
  }

  const isX01 = game.id === 'x01'
  const isSaKiller = game.id === 'sa-killer'
  const isCricket = game.id === 'cricket'
  const isScram = game.id === 'scram'
  const isEngCricket = game.id === 'english-cricket'

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ marginRight: 'auto' }}>{game.name}</h1>
        <button className="btn ghost small" onClick={() => setShowGuide((v) => !v)}><IconBook size={15} /> Rules</button>
        <button className="btn secondary small" onClick={() => setPhase('setup')}>← New game</button>
      </div>
      {showGuide && game.guide && <GuidePanel guide={game.guide} />}

      {result && (
        <div className="panel" style={{ borderColor: 'var(--accent2)', background: 'rgba(48,164,108,0.08)' }}>
          <h2><IconTrophy size={22} /> {result.summary}</h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button className="btn" onClick={start}>Rematch</button>
            <Link className="btn secondary" to="/history">View history</Link>
            <Link className="btn secondary" to="/stats">Leaderboard</Link>
          </div>
        </div>
      )}

      {(isX01 || isScram || isEngCricket || isSaKiller) && status && !result && (
        <div className="panel" style={{ padding: '10px 16px', borderColor: 'var(--gold)' }}>
          <strong>{curName}</strong> — <strong style={{ color: 'var(--gold)' }}>{status}</strong>
        </div>
      )}

      {isX01 && state ? (
        <X01Board state={state as X01State} />
      ) : isScram && state ? (
        <ScramBoard state={state as ScramState} />
      ) : isEngCricket && state ? (
        <EngCricketBoard state={state as EngCricketState} />
      ) : isCricket && state ? (
        <CricketBoard state={state as any} />
      ) : isSaKiller && state ? (
        <SaKillerBoard
          state={state as SaKillerState}
          onThrow={recordThrow}
          onCellClick={chalkCell}
          onThrowChoice={saKillerChoice}
          onRematch={start}
          onReset={() => setPhase('setup')}
        />
      ) : (
        <div className="scoreboard">
          {columns.map((c) => (
            <div key={c.key} className={`score-row ${c.tone === 'active' ? 'active' : ''}`}>
              <div className="name">{c.label}</div>
              <div className="big">{c.value}</div>
              <div className="sub" />
            </div>
          ))}
        </div>
      )}

      {saChoice && (
        <div className="sk-choice" role="dialog" aria-label="How does this dart count?">
          <div className="sk-choice-box">
            <strong>{selectedPlayers[saChoice.pi]?.name} hit {saChoice.t.m === 2 ? 'DUB' : 'TRIP'} {saChoice.t.n}</strong>
            <span>Chalk it as:</span>
            <div className="sk-choice-btns">
              <button className="sk-btn" onClick={() => { saKillerChoice(saChoice.pi, saChoice.t, false); setSaChoice(null) }}>
                1 X in the {saChoice.t.m === 2 ? 'DUB' : 'TRIP'} channel
              </button>
              <button className="sk-btn" onClick={() => { saKillerChoice(saChoice.pi, saChoice.t, true); setSaChoice(null) }}>
                {saChoice.t.m}× {saChoice.t.n}'s ({saChoice.t.m * saChoice.t.n})
              </button>
            </div>
            <button className="sk-btn sk-choice-cancel" onClick={() => setSaChoice(null)}>Cancel</button>
          </div>
        </div>
      )}

      {actions.length > 0 && !result && (
        <div
          className="panel"
          style={
            actions.some((a) => a.label.includes('bull-off') || a.label.includes('Next leg'))
              ? { borderColor: 'var(--gold)', borderWidth: 2 }
              : undefined
          }
        >
          <h3 style={{ marginTop: 0 }}>
            {actions.some((a) => a.label.includes('bull-off') || a.label.includes('Next leg'))
              ? '⚠ Record it to keep playing — the board is locked until you do'
              : 'Table actions'}
          </h3>
          <div className="chips">
            {actions.map((a) => (
              <button key={a.label} className="chip" onClick={() => setStates((ss) => [...ss, a.perform(state)])}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isX01 && state && !result && (
        <div className="panel" style={{ borderColor: 'var(--gold)' }}>
          <h3 style={{ marginTop: 0 }}><IconTarget size={17} /> Checkout</h3>
          <p style={{ margin: 0, fontFamily: 'var(--font-chalk)', fontSize: 22, color: 'var(--chalk)' }}>
            {(state as X01State).scores[cur] > 170 || (state as X01State).scores[cur] < 2
              ? (state as X01State).scores[cur] <= 1 && (state as X01State).splitLegs
                ? 'Left on 1 — single 11 SPLIT LEGS to win!'
                : 'No checkout — keep scoring'
              : suggestCheckout((state as X01State).scores[cur], (state as X01State).outMode) ?? 'No checkout — keep scoring'}
          </p>
        </div>
      )}

      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ margin: 0 }}>
            Throwing: <span style={{ color: 'var(--accent)' }}>{curName || '—'}</span>
            {botEnabled && game.id === 'x01' && cur === 1 && <span style={{ color: 'var(--blue)' }}><IconBot size={14} /> {BOT_PROFILES[botSkill].name} is throwing…</span>}
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn ghost small" onClick={() => setInputMode(inputMode === 'board' ? 'spine' : 'board')}>
              {inputMode === 'board' ? <><IconSpine size={15} /> Score on spine</> : <><IconDart size={15} /> Use dartboard</>}
            </button>
            <button className="btn ghost small" onClick={undo} disabled={states.length <= 1 || !!result}>
              <IconUndo size={15} /> Undo
            </button>
          </div>
        </div>
        {inputMode === 'board' ? (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PhotoDartboard onThrow={throwDart} disabled={!!result || (botEnabled && game.id === 'x01' && cur === 1)} size={440} />
          </div>
        ) : isX01 ? (
          <X01SpineBoard onThrow={throwDart} disabled={!!result || (botEnabled && game.id === 'x01' && cur === 1)} />
        ) : (
          <DartPad onThrow={throwDart} disabled={!!result || (botEnabled && game.id === 'x01' && cur === 1)} />
        )}
        {isSaKiller && (
          <p style={{ color: 'var(--muted)' }}>
            Score on the blackboard above (it chalks itself), or throw on the dartboard — every dart lands on the board.
          </p>
        )}
      </div>
    </>
  )
}

function DartPad({ onThrow, disabled }: { onThrow: (t: Throw) => void; disabled: boolean }) {
  const [mod, setMod] = useState<1 | 2 | 3>(1)
  return (
    <>
      <div className="chips" style={{ marginBottom: 10 }}>
        {([1, 2, 3] as const).map((m) => (
          <button key={m} className={`chip ${mod === m ? 'selected' : ''}`} onClick={() => setMod(m)} disabled={disabled}>
            {m === 1 ? 'Single' : m === 2 ? 'Double' : 'Treble'}
          </button>
        ))}
      </div>
      <div className="pad">
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
          <button key={n} disabled={disabled} onClick={() => onThrow(mk(n, mod))}>
            {mod === 1 ? n : `${mod === 2 ? 'D' : 'T'}${n}`}
          </button>
        ))}
        <button className="miss" disabled={disabled} onClick={() => onThrow(mk(0, 0))}>MISS</button>
        <button disabled={disabled} onClick={() => onThrow(mk(25, 25))}>25</button>
        <button disabled={disabled} onClick={() => onThrow(mk(25, 50))}>BULL 50</button>
        <button style={{ visibility: 'hidden' }} />
        <button style={{ visibility: 'hidden' }} />
      </div>
    </>
  )
}

function NewPlayerInline({ onAdd }: { onAdd: (name: string) => void }) {
  const [v, setV] = useState('')
  return (
    <form
      style={{ display: 'flex', gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.trim()) return
        onAdd(v)
        setV('')
      }}
    >
      <input className="input" style={{ maxWidth: 240 }} placeholder="Quick-add new player…" value={v} onChange={(e) => setV(e.target.value)} />
      <button className="btn secondary small" type="submit">Add</button>
    </form>
  )
}

function GuidePanel({ guide }: { guide: import('../engine/core').Guide }) {
  return (
    <div className="panel guide">
      <h3><IconTarget size={17} /> Objective</h3>
      <p className="objective">{guide.objective}</p>
      <h3>Setup</h3>
      <ol>{guide.setup.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
      <h3>How to play</h3>
      <ol>{guide.play.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
      <h3>Winning</h3>
      <p className="objective">{guide.winning}</p>
      <h3>Tips</h3>
      <ol className="tips">{guide.tips.map((s: string, i: number) => <li key={i}>{s}</li>)}</ol>
    </div>
  )
}
