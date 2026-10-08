# Rollback runbook (all three targets, under 10 minutes)

Every release is a git tag (`v1.2.2`, `v1.2.3`, …) and the server keeps only the
current installers — so a rollback means **rebuilding the old tag and re-shipping
it under its own version**. Never re-upload an old build against a newer version
number: versionCode must not go backwards on Android.

All commands run from the repo root. Requires `.release-env` (see DEPLOYMENT.md)
for FTP + keystore secrets.

## 0. Decide what you're rolling back to

```bash
git fetch origin --tags && git tag          # list releases
git log v1.2.2 -1 --format="%h %s"          # see what that tag shipped
```

**Web-only problems** (wrong bundle live, broken page): roll back web only.
**EXE or APK problems**: roll back that target too. In doubt, do all three.

## 1. Put the old release's code on a branch

```bash
git checkout -b rollback-v1.2.2 v1.2.2
```

If the rollback needs a fix ON TOP of the old code (usual case: the new release
broke something), cherry-pick or edit here, then bump the version so the
release is new, not stale:

```bash
# bump version everywhere (package.json, Downloads.tsx, stage-deploy.mjs,
# App.tsx footer, build.gradle versionCode +1 / versionName)
npm test   # version-consistency test enforces all five agree
git commit -am "Rollback release: v1.2.2 code + <fix>"
```

## 2. Ship it with the standard gates

```bash
npm run release          # web + EXE + APK, every verification gate built in
```

The script itself refuses to ship a stale bundle (fix-string + hash checks),
truncated EXEs (byte-exact check), or a stale APK (cap-sync guard + SHA-256
round-trip) — so a rollback through it is as verified as a normal release.

Web-only rollback:

```bash
npm run release:web      # never touches downloads/ installers
```

Rehearsal first (recommended when nervous):

```bash
npm run release:beta     # deploys darts-beta ONLY — live untouched
# check https://personal.handyservices.co.za/projects/darts-beta/ then:
npm run release
```

## 3. Verify live (30 seconds)

```bash
curl -s https://personal.handyservices.co.za/projects/darts/ | grep -o "index-[A-Za-z0-9]*\.js"
curl -sI https://personal.handyservices.co.za/downloads/Bullseye-Darts-Setup-<ver>.exe | grep -i content-length
curl -sI https://personal.handyservices.co.za/downloads/Bullseye-Darts-<ver>.apk | grep -i content-length
```

Open the app on a phone, confirm the footer version, throw three darts.

## 4. Land the rollback in git

```bash
git checkout main
git merge --ff-only rollback-v1.2.2    # or open a PR if others have landed since
git push origin main:refs/heads/rollback-v1.2.2   # if you want it reviewed via PR
git branch -d rollback-v1.2.2
```

Optionally tag it (e.g. `v1.2.3`) and let the Release workflow build a GitHub
Release from it, same as any normal version.

## Emergency: FTP is broken entirely

The web app is fully static — any web host will do for a few hours:

1. `npm run build && npm run stage`
2. Upload `deploy/deploy.zip` anywhere that serves files (DirectAdmin File
   Manager on another account, Netlify drop, even an S3 bucket).
3. Point users at that URL until FTP is back; the app stores everything
   locally, so nothing is lost in the meantime.
