#!/usr/bin/env node
/**
 * One-command release: build → stage → EXE → cap sync → APK → sign → FTP → verify.
 *
 * Implements DEPLOYMENT.md "Release checklist" as code, including the gates that
 * previously had to be remembered by hand:
 *   - cap sync BEFORE gradle (stale-APK guard, verified against the fresh bundle name)
 *   - bundle-hash + fix-string check on the served web JS
 *   - Content-Length byte-exact check on the uploaded EXE
 *   - SHA-256 round-trip (local == remote) on the uploaded APK
 *
 * Secrets/config come from .release-env (git-ignored) or the environment:
 *   RELEASE_FTP_URL       e.g. ftp://user%40host:pass@ftp.example.invalid
 *   RELEASE_WEB_ROOT      e.g. https://personal.handyservices.co.za
 *   RELEASE_KS_PASS       Android keystore password
 *   RELEASE_FIX_STRING    optional bundle grep marker (default: wiped to zero)
 *
 * Usage:  node scripts/release.mjs [--web-only] [--beta-only] [--skip-exe] [--skip-apk]
 */
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Load .release-env (KEY=VALUE lines; real environment wins)
const envPath = join(root, '.release-env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const FTP = process.env.RELEASE_FTP_URL
const WEB = process.env.RELEASE_WEB_ROOT ?? 'https://personal.handyservices.co.za'
const FIX = process.env.RELEASE_FIX_STRING ?? 'wiped to zero'

const args = process.argv.slice(2)
const opt = (n) => args.includes(`--${n}`)
const WEB_ONLY = opt('web-only')
const BETA_ONLY = opt('beta-only') // rehearsal: deploy darts-beta ONLY, never live darts
const SKIP_EXE = WEB_ONLY || BETA_ONLY || opt('skip-exe')
const SKIP_APK = WEB_ONLY || BETA_ONLY || opt('skip-apk')

const step = (m) => console.log(`\n=== ${m} ===`)
const die = (m) => { console.error(`\n✗ ${m}`); process.exit(1) }
const sh = (cmd, opts = {}) => { console.log(`\n$ ${cmd}`); execSync(cmd, { stdio: 'inherit', ...opts }) }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sha256 = (p) => createHash('sha256').update(readFileSync(p)).digest('hex')

if (!FTP) die('RELEASE_FTP_URL not set — put it in .release-env (git-ignored)')

async function ftpPut(local, remote, { retries = 3 } = {}) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      sh(`curl -sS --ftp-pasv --ftp-skip-pasv-ip -T "${local}" "${FTP}${remote}"`)
      await sleep(1000) // server 550 rate limit between rapid uploads
      return
    } catch (e) {
      console.error(`  upload attempt ${attempt}/${retries} failed (exit ${e.status})`)
      if (attempt === retries) throw e
      await sleep(3000)
    }
  }
}

// ---------- version ----------
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const V = pkg.version
if (!/^\d+\.\d+\.\d+$/.test(V)) die(`bad version in package.json: ${V}`)
console.log(`Releasing v${V}${BETA_ONLY ? ' (BETA ONLY — live darts untouched)' : WEB_ONLY ? ' (web only)' : ''} → ${WEB}`)

// ---------- 1. web ----------
step('1/4 web: build + stage')
sh('npm run build')
sh('npm run stage')

// Stale-cache guard: the staged .htaccess must keep HTML uncacheable, or users
// can end up with a new bundle name in an old cached index.html (broken app).
const ht = readFileSync(join(root, 'deploy', 'public_html', '.htaccess'), 'utf8')
if (!ht.includes('text/html "access plus 0 seconds"')) {
  die('deploy/public_html/.htaccess no longer keeps text/html uncacheable — fix caching rules before deploying')
}

const indexHtml = readFileSync(join(root, 'dist', 'index.html'), 'utf8')
const bundle = indexHtml.match(/index-[A-Za-z0-9]+\.js/)?.[0]
if (!bundle) die('could not find hashed bundle name in dist/index.html')
console.log(`fresh bundle: ${bundle}`)

step('1/4 web: upload')
const targets = BETA_ONLY ? ['darts-beta'] : ['darts', 'darts-beta']
for (const t of targets) {
  await ftpPut(join(root, 'deploy', 'public_html', 'projects', t, 'index.html'), `/projects/${t}/index.html`)
  const assets = join(root, 'deploy', 'public_html', 'projects', t, 'assets')
  for (const a of readdirSync(assets)) await ftpPut(join(assets, a), `/projects/${t}/assets/${a}`)
}
if (!BETA_ONLY) await ftpPut(join(root, 'deploy', 'public_html', 'index.html'), '/index.html')

step('1/4 web: verify served bundle')
const checkTarget = BETA_ONLY ? 'darts-beta' : 'darts'
const servedBundle = execSync(`curl -s ${WEB}/projects/${checkTarget}/`).toString().match(/index-[A-Za-z0-9]+\.js/)?.[0]
if (servedBundle !== bundle) die(`server serves ${servedBundle}, not the fresh ${bundle}`)
const servedJs = execSync(`curl -s ${WEB}/projects/${checkTarget}/assets/${bundle}`).toString()
if (!servedJs.includes(FIX)) die(`served bundle is missing fix string "${FIX}" — stale deploy`)
if (!servedJs.includes(V)) die(`served bundle is missing version ${V}`)
console.log(`✓ ${WEB}/projects/${checkTarget}/ serves ${bundle} (fix string + v${V} present)`)

if (WEB_ONLY) { console.log(`\n✓ web-only release v${V} complete`); process.exit(0) }

// ---------- 2. exe ----------
let exeLen = 0
let apkHash = ''
if (SKIP_EXE) {
  console.log('\n--- 2/4 exe: SKIPPED (--beta-only / --skip-exe) ---')
} else {
step('2/4 exe: build')
sh('npm run electron:build')
const exeLocal = join(root, 'release', `Bullseye Darts Scoreboard Setup ${V}.exe`)
if (!existsSync(exeLocal)) die(`electron-builder did not produce ${exeLocal}`)

step('2/4 exe: upload + byte check')
await ftpPut(exeLocal, `/downloads/Bullseye-Darts-Setup-${V}.exe`)
const exeHead = execSync(`curl -sI ${WEB}/downloads/Bullseye-Darts-Setup-${V}.exe`).toString()
const remoteLen = Number(exeHead.match(/content-length:\s*(\d+)/i)?.[1])
exeLen = statSync(exeLocal).size
if (remoteLen !== exeLen) die(`EXE truncated: remote ${remoteLen} != local ${exeLen} bytes`)
console.log(`✓ EXE byte-exact: ${exeLen} bytes`)
}

// ---------- 3. apk ----------
if (SKIP_APK) {
  console.log('\n--- 3/4 apk: SKIPPED (--beta-only / --skip-apk) ---')
} else {
step('3/4 apk: cap sync BEFORE gradle (stale-APK guard)')
sh('npx cap sync android')
const capAsset = join(root, 'android', 'app', 'src', 'main', 'assets', 'public', 'assets', bundle)
if (!existsSync(capAsset)) die(`synced assets are missing the fresh bundle ${bundle} — cap sync failed`)
if (!readFileSync(capAsset, 'utf8').includes(FIX)) die('synced assets are missing the fix string — cap sync shipped stale content')
console.log('✓ synced assets contain the fresh bundle')

step('3/4 apk: gradle assembleRelease')
execSync('call .\\gradlew.bat assembleRelease --no-daemon -q', {
  cwd: join(root, 'android'),
  stdio: 'inherit',
  env: {
    ...process.env,
    JAVA_HOME: process.env.RELEASE_JAVA_HOME ?? 'D:/Projects/Darts/vendor/jdk21/jdk-21.0.12.1+1',
    ANDROID_HOME: process.env.RELEASE_ANDROID_HOME ?? 'D:/Projects/Darts/vendor/android-sdk',
  },
})
const apkDir = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release')
const apkLocal = join(apkDir, `Bullseye-Darts-${V}.apk`)
if (!existsSync(apkLocal)) die(`gradle did not produce ${apkLocal}`)

step('3/4 apk: zipalign + sign + verify')
const BT = process.env.RELEASE_BT ?? 'D:/Projects/Darts/vendor/android-sdk/build-tools/35.0.0'
const KS = process.env.RELEASE_KS ?? 'D:/Projects/Darts/keystore/bullseye-release.keystore'
const KP = process.env.RELEASE_KS_PASS
if (!KP) die('RELEASE_KS_PASS not set — put it in .release-env (git-ignored)')
sh(`"${BT}/zipalign.exe" -f -p 4 "Bullseye-Darts-${V}.apk" aligned.apk`, { cwd: apkDir })
sh(`"${BT}/apksigner.bat" sign --ks "${KS}" --ks-key-alias bullseye --ks-pass pass:${KP} --key-pass pass:${KP} aligned.apk`, { cwd: apkDir })
renameSync(join(apkDir, 'aligned.apk'), join(apkDir, `Bullseye-Darts-${V}.apk`))
sh(`"${BT}/apksigner.bat" verify "Bullseye-Darts-${V}.apk"`, { cwd: apkDir })

step('3/4 apk: upload + SHA-256 round-trip')
await ftpPut(apkLocal, `/downloads/Bullseye-Darts-${V}.apk`)
const rtPath = join(root, 'deploy', 'apk-roundtrip.apk')
execSync(`curl -s -o "${rtPath}" ${WEB}/downloads/Bullseye-Darts-${V}.apk`)
const localHash = sha256(apkLocal)
const remoteHash = sha256(rtPath)
unlinkSync(rtPath)
if (localHash !== remoteHash) die(`APK hash mismatch: local ${localHash} != remote ${remoteHash}`)
apkHash = localHash
console.log(`✓ APK SHA-256 local == remote: ${apkHash}`)
}

// ---------- 4. tidy ----------
step('4/4 done')
console.log(`v${V} shipped:`)
console.log(`  web  ${WEB}/projects/${BETA_ONLY ? 'darts-beta' : 'darts'}/  (${bundle})`)
if (!SKIP_EXE) console.log(`  exe  ${WEB}/downloads/Bullseye-Darts-Setup-${V}.exe  (${exeLen} bytes)`)
if (!SKIP_APK) console.log(`  apk  ${WEB}/downloads/Bullseye-Darts-${V}.apk  (sha256 ${apkHash})`)
if (BETA_ONLY) console.log('  (live darts untouched — rehearsal mode)')
console.log("Consider deleting the superseded release's EXE/APK from downloads/ (FTP quota — see DEPLOYMENT.md).")
