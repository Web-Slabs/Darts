import { useEffect } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import { IconTarget } from './components/icons'
import { useStore } from './lib/store'
import { restoreSession } from './lib/auth'
import { supabaseReady } from './lib/supabase'
import Home from './pages/Home'
import GamePage from './pages/GamePage'
import Players from './pages/Players'
import Stats from './pages/Stats'
import History from './pages/History'
import Account from './pages/Account'
import Downloads from './pages/Downloads'
import { IconHome, IconPlayers, IconStats, IconHistory, IconDownload, IconAccount } from './components/icons'
import Legal from './pages/Legal'

export default function App() {
  const hydrate = useStore((s) => s.hydrate)
  const authUser = useStore((s) => s.authUser)
  useEffect(() => {
    hydrate()
    void restoreSession()
  }, [hydrate])

  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="logo">
          <IconTarget size={22} /> Bull<span>seye</span>
        </div>
        <NavLink to="/" end><IconHome /> Home</NavLink>
        <NavLink to="/players"><IconPlayers /> Players</NavLink>
        <NavLink to="/stats"><IconStats /> Stats</NavLink>
        <NavLink to="/history"><IconHistory /> History</NavLink>
        <NavLink to="/downloads"><IconDownload /> Get the apps</NavLink>
        <NavLink to="/account"><IconAccount /> Account</NavLink>
        <div className="spacer" />
        <div className="userbox">
          {authUser
            ? `Signed in: ${authUser.name || authUser.email}`
            : supabaseReady
              ? 'Not signed in — tap Account to log in'
              : 'Offline mode — stats on this device'}
        </div>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/players" element={<Players />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/history" element={<History />} />
          <Route path="/account" element={<Account />} />
        <Route path="/downloads" element={<Downloads />} />
          <Route path="/auth" element={<Account />} />
          <Route path="/legal" element={<Legal />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <div className="footer">
          Bullseye Darts Scoreboard · v1.2.3 · Built for Web-Slabs ·{' '}
          <a href="#/legal">Privacy (POPIA/GDPR)</a> · <a href="#/legal">Terms</a>
        </div>
      </main>
    </div>
  )
}
