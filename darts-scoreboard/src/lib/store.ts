import { create } from 'zustand'

export type Player = { id: string; name: string }

export type MatchRecord = {
  id: string
  game: string
  date: number
  players: { id: string; name: string; won: boolean; lines: Record<string, string | number> }[]
  summary: string
  venue?: string | null
}

export type AppState = {
  players: Player[]
  history: MatchRecord[]
  onboarded: boolean
  authUser: { id?: string; email: string; name?: string } | null
  cloudSync: 'off' | 'on' | 'error'
  venue: { id: string; name: string } | null
  setVenue: (v: { id: string; name: string } | null) => void
  addPlayer: (name: string) => void
  removePlayer: (id: string) => void
  renamePlayer: (id: string, name: string) => void
  recordMatch: (rec: Omit<MatchRecord, 'id' | 'date'>) => void
  setAuthUser: (u: { id?: string; email: string; name?: string } | null) => void
  setCloudSync: (s: AppState['cloudSync']) => void
  finishOnboarding: () => void
  loadDemoRoster: (names: string[]) => void
  hydrate: () => void
}

const KEY = 'bullseye-darts-v1'

const persist = (s: Partial<AppState>) => {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ players: s.players, history: s.history, onboarded: s.onboarded }),
    )
  } catch {
    /* storage unavailable */
  }
}

export const uid = () => Math.random().toString(36).slice(2, 10)

export const useStore = create<AppState>((set, get) => ({
  players: [],
  history: [],
  onboarded: false,
  authUser: null,
  cloudSync: 'off',
  venue: null,
  hydrate: () => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) {
        const d = JSON.parse(raw)
        set({ players: d.players ?? [], history: d.history ?? [], onboarded: !!d.onboarded })
      }
    } catch {
      /* ignore */
    }
  },
  addPlayer: (name) => {
    const p = { id: uid(), name: name.trim() || `Player ${get().players.length + 1}` }
    set({ players: [...get().players, p] })
    persist(get())
  },
  removePlayer: (id) => {
    set({ players: get().players.filter((p) => p.id !== id) })
    persist(get())
  },
  renamePlayer: (id, name) => {
    set({ players: get().players.map((p) => (p.id === id ? { ...p, name } : p)) })
    persist(get())
  },
  recordMatch: (rec) => {
    const entry: MatchRecord = { venue: get().venue?.id ?? null, ...rec, id: uid(), date: Date.now() }
    set({ history: [entry, ...get().history].slice(0, 500) })
    persist(get())
  },
  setAuthUser: (u) => set({ authUser: u }),
  setVenue: (v) => set({ venue: v }),
  setCloudSync: (s) => set({ cloudSync: s }),
  finishOnboarding: () => {
    set({ onboarded: true })
    persist(get())
  },
  loadDemoRoster: (names) => {
    const existing = get().players
    const add = names
      .filter((n) => !existing.some((e) => e.name.toLowerCase() === n.toLowerCase()))
      .map((n) => ({ id: uid(), name: n }))
    set({ players: [...existing, ...add] })
    persist(get())
  },
}))

/** Aggregated stats per player across all recorded matches. */
export function playerStats(history: MatchRecord[], playerId: string) {
  const games = history.filter((h) => h.players.some((p) => p.id === playerId))
  const wins = games.filter((h) => h.players.find((p) => p.id === playerId)?.won).length
  return { played: games.length, wins, winPct: games.length ? Math.round((wins / games.length) * 100) : 0 }
}
