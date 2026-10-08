# Bullseye Darts Scoreboard

An all-in-one darts scoreboard: **46 games**, official rules, step-by-step how-to-play
guides, live chalk scoreboards, player stats, match history, a practice dartbot and
Supabase cloud sync for registered players.

Ships as **three** apps from one TypeScript codebase:

- a **website** (any static host — see `DEPLOYMENT.md` for the handyservices subdomain),
- a **Windows desktop installer** (`release/Bullseye Darts Scoreboard Setup 1.2.3.exe`) that works fully offline, and
- an **Android APK** (`android/`, Capacitor build — see `DEPLOYMENT.md` for the vendored toolchain).

Built for Web-Slabs.

## Highlights

- **Authentic chalk-and-slate presentation**: every score surface is a blackboard —
  the PUMA-style **spine boards** (numbers down the middle, X-box + score-box per
  player per row), chalk-ledger tables for Stats/History, and a real-photo
  **Medalist dartboard** with click-mapped segments for dart entry.
- **SA Killer house game** rebuilt from the original Excel macro (VBA-extracted and
  covered by a branch-for-branch parity test suite): 3 X's open a channel, both
  players at 3 X's close it (dead — nobody scores through it), channels are
  independent (dead 20s never block an open Trip channel), singles pay N, D-channel
  2N, T-channel 3N, bull 25. A dub/trip can be chalked as **1 X in the D/T channel
  or 2×/3× the number — the player chooses**. Bull-off, opening shot, close shot,
  target and legs are selectable options, all default OFF.
- **X01 with SA house rules**: Split Legs option (left on 1, a single 11 wins the
  leg), checkout calculator on the spine, per-visit averages.
- Self-hosted fonts (Caveat, Patrick Hand) and an inline SVG icon set — **no
  third-party requests, no tracking**.
- Supabase auth + sync: sign in from any pub and your history and stats follow you.

## Games (46)

Highlights — every game has a full rules panel and guide in-app:

| Family | Games |
| --- | --- |
| X01 | 301 / 501 / 701 / 901, straight/double/master in & out, Split Legs (SA), checkout suggester |
| Cricket family | Cricket (standard + cut-throat), Tactics, Mickey Mouse, Scram |
| Killer family | SA Killer (house board), Killer (standard + house doubles rules), Assassination |
| Around the board | Around the Clock, Nine Lives, Chase the Dragon, 180 Around the Clock |
| Accumulation | Shanghai, Halve It, Golf, Baseball, High Score, Fives, Bermuda Triangle |
| Practice | Dartbot sparring, doubles/trebles practice, checkout practice |

## Features

- Spine chalkboards for SA Killer and X01 (S/D/T per number + BULL/CHERRY/MISS);
  hand-chalking on the board or dart entry on the real dartboard
- Needs-to-win cells: each player is told exactly what to hit to win
- Undo everywhere, Rematch/Reset on the boards
- Player roster, stats & leaderboard, full match history
- Cloud sync via Supabase (POPIA/GDPR-conscious: self-service account deletion)

## Development

```bash
npm install
npm run dev        # Vite dev server
npm test           # Vitest (46 tests incl. VBA-parity + split-legs suites)
npx tsc --noEmit   # typecheck
npm run build      # production web build to dist/
```

- `src/engine/games/` — one pure module per game family; rules live here, not in the UI
- `src/components/` — chalk boards (SaKillerBoard, X01SpineBoard, PhotoDartboard, icons)
- `scripts/stage-deploy.mjs` — stages web + installers for FTP upload
- `supabase/schema.sql` — full idempotent cloud schema

**Never commit:** `keystore/` (Android signing key — back it up somewhere safe),
`.env`, `vendor/` (Android SDK/JDK), build outputs. See `.gitignore`.

## Versioning

Version lives in: `package.json`, `src/pages/Downloads.tsx` (WIN_VERSION/APK_VERSION),
`android/app/build.gradle` (versionCode + versionName), `scripts/stage-deploy.mjs`
(installer filenames) and the `src/App.tsx` footer. Bump all together.
