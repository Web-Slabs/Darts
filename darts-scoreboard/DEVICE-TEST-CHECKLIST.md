# On-device test checklist (APK)

One page. Run it on a real Android phone for every APK release — the build
pipeline verifies bytes and signatures, but **only a phone proves touch input,
storage and installs**. Print it, tick it, keep it with the release notes.

**Setup:** install `Bullseye-Darts-<ver>.apk` from `personal.handyservices.co.za/downloads/`
(open the link in the phone's browser → allow "install from this source").
Note the version shown in the app footer before starting: it must read `v<ver>`.

## 1. Install & first launch

- [ ] APK installs without Play-Protect blocking (or: warn → "install anyway" works and is expected for self-signed builds)
- [ ] App launches to the home page; footer shows the new version
- [ ] Rotating the phone keeps the current screen (no restart to setup)

## 2. Touch input on every board type (the phones-only part)

Play a few darts on each of these — every tap must land exactly where you
touched, no mis-hits on adjacent buttons:

- [ ] **X01** — dartboard overlay: singles, doubles, trebles, outer bull, cherry, MISS all register the right value
- [ ] **X01** — "Score on spine" pad: S/D/T buttons per number, BULL/CHERRY/MISS rows
- [ ] **SA Killer** — spine labels + D/T buttons + the choice dialog (tap DUB → both dialog options)
- [ ] **Cricket** — the numbers-and-bull board
- [ ] **PhotoDartboard games** (Scam, Bob's 27, any with the board picture) — segments respond on first tap
- [ ] **Scoreboard games** (the rest of the catalogue) — open 3 random ones, throw a visit each

## 3. Game flow on-device

- [ ] Start a 501 with split-legs ON: throw down to exactly 1 (no bust!), then single 11 → leg wins
- [ ] SA Killer with bull-off ON: banner shows, record winner in the panel, spine unlocks
- [ ] SA Killer legs=2: win a leg → "Next leg" button appears → leg 2 starts clean
- [ ] Undo works mid-visit; Rematch and Reset work from a finished game
- [ ] Finish a game → result banner, it appears in History and Stats

## 4. Offline & storage

- [ ] Airplane mode ON: play a full game — everything works, no network errors surfaced
- [ ] Close the app completely, reopen: players and match history are still there (localStorage)
- [ ] Airplane mode OFF: no crash on reconnect

## 5. Upgrade from the previous version

- [ ] With v1.2.x (or earlier) installed, install the new APK **over it** — no uninstall
- [ ] App opens normally, version footer updated
- [ ] Players + history survive the upgrade

## 6. Sign-off

| | |
|---|---|
| APK version | __________ |
| Device / Android version | __________ |
| Date / tester | __________ |
| Result | PASS / FAIL (issues: __________) |
