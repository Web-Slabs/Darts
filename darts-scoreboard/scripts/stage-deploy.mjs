// Stages the darts app for upload to handyservices hosting (DirectAdmin / cPanel / any Apache):
//
//   deploy/
//   ├── deploy.zip                   ← one archive: upload + "Extract" in DirectAdmin File Manager
//   ├── deploy.tar.gz                ← same content, for ssh/tar workflows
//   ├── public_html/                 ← the exact tree to land in the host's public_html
//   │   ├── .htaccess                ← caching + no-index listing (safe, generic)
//   │   ├── index.html               ← handyservices.co.za/projects landing page
//   │   └── projects/
//   │       ├── darts/               ← the live app (personal.handyservices.co.za/projects/darts/)
//   │       │   ├── index.html
//   │       │   └── assets/…
//   │       └── darts-beta/          ← UNLISTED test copy, not linked anywhere
//   │           ├── index.html       ← injected BETA banner + noindex meta
//   │           ├── assets/…
//   │           └── .htaccess        ← Basic-Auth template (set password via DA or --beta-password)
//
// The app uses relative asset paths (vite base './') and hash routing, so it runs
// unchanged at any subpath.
//
// Usage:
//   npm run build && npm run stage
//   npm run stage -- --beta-password=MySecret   ← also generate working .htpasswd lines
//                                                 (user "beta"; on DirectAdmin you'd normally
//                                                  use File Manager → "Password Protected
//                                                  Directories" instead)

import { cpSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import AdmZip from 'adm-zip'

const root = process.cwd()
const dist = join(root, 'dist')
const deployDir = join(root, 'deploy')
const out = join(deployDir, 'public_html')
const darts = join(out, 'projects', 'darts')
const beta = join(out, 'projects', 'darts-beta')

const betaPasswordArg = process.argv.find((a) => a.startsWith('--beta-password='))
const betaPassword = betaPasswordArg ? betaPasswordArg.split('=').slice(1).join('=') : null

// Desktop installer + Android APK staged into public_html/downloads/ for the
// app's "Get the apps" page. Missing files are skipped with a warning so web-only
// deploys still work.
const exeSrc = join(root, 'release', 'Bullseye Darts Scoreboard Setup 1.2.3.exe')
const apkSrc = join(root, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'Bullseye-Darts-1.2.3.apk')
const downloadsDir = join(root, 'deploy', 'downloads-staging')
const downloadFiles = [
  { src: exeSrc, name: 'Bullseye-Darts-Setup-1.2.3.exe' },
  { src: apkSrc, name: 'Bullseye-Darts-1.2.3.apk' },
]
for (const f of downloadFiles) {
  if (!existsSync(f.src)) console.warn(`  (will skip ${f.name} — not built yet)`)
}

if (!existsSync(join(dist, 'index.html'))) {
  console.error('dist/index.html not found — run `npm run build` first.')
  process.exit(1)
}

// Fresh staging area
rmSync(deployDir, { recursive: true, force: true })
mkdirSync(darts, { recursive: true })
mkdirSync(beta, { recursive: true })

// 1. App into /projects/darts (live) and /projects/darts-beta (unlisted test copy)
cpSync(dist, darts, { recursive: true })
cpSync(dist, beta, { recursive: true })

// 1b. Downloadable apps into /downloads (linked from the app's Downloads page).
//     Copied straight from release/ + android/ AFTER the deploy/ reset above.
const downloadsOut = join(out, 'downloads')
mkdirSync(downloadsOut, { recursive: true })
for (const f of downloadFiles) {
  if (existsSync(f.src)) cpSync(f.src, join(downloadsOut, f.name))
}

// 2. Beta banner + noindex injected into the beta copy only.
//    Pure string splices on Vite's generated index.html — no build change needed.
const betaIndexPath = join(beta, 'index.html')
const betaHtml = readFileSync(betaIndexPath, 'utf8')
const bannerHtml = `<div id="beta-banner" style="position:fixed;left:0;right:0;bottom:0;z-index:2147483647;background:#8a1f1f;color:#fff;font:600 12px/1.4 system-ui,sans-serif;text-align:center;padding:6px 10px 6px;letter-spacing:.04em;pointer-events:none;">BETA TEST BUILD — darts-beta · not the live app</div>`
writeFileSync(
  betaIndexPath,
  betaHtml
    .replace('<head>', '<head>\n<meta name="robots" content="noindex, nofollow" />')
    .replace('<body>', `<body>\n${bannerHtml}`),
)

// 3. Landing page for handyservices.co.za/projects (lists deployed projects).
//    NOTE: no link to darts-beta on purpose — it stays unlisted.
writeFileSync(
  join(out, 'index.html'),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Web-Slabs Projects</title>
<style>
  body { font-family: system-ui, sans-serif; background: #101512; color: #e9e6da;
         display: grid; place-items: center; min-height: 100vh; margin: 0; }
  .card { background: #141a17; border: 1px solid #2c3833; border-radius: 14px;
          padding: 40px 48px; max-width: 420px; text-align: center; }
  a { color: #8fb7e8; text-decoration: none; font-size: 20px; font-weight: 600; }
  a:hover { text-decoration: underline; }
  p { color: #97a29b; }
</style>
</head>
<body>
  <div class="card">
    <h1>🇿🇦 Web-Slabs Projects</h1>
    <p>Live apps on this server:</p>
    <p><a href="./projects/darts/">🎯 Bullseye Darts Scoreboard</a></p>
    <p style="font-size:13px;margin-top:18px">
      Native apps: <a href="./downloads/Bullseye-Darts-Setup-1.2.3.exe">Windows installer</a> ·
      <a href="./downloads/Bullseye-Darts-1.2.3.apk">Android APK</a>
    </p>
  </div>
</body>
</html>
`,
)

// 4. Root .htaccess — caching + friendly 404. No rewrites needed: the darts app is hash-routed.
writeFileSync(
  join(out, '.htaccess'),
  `# Web-Slabs — handyservices static hosting
Options -Indexes

<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType font/woff2 "access plus 1 year"
  ExpiresByType text/html "access plus 0 seconds"
</IfModule>

ErrorDocument 404 /index.html
`,
)

// 5. Beta .htaccess — keeps the folder unlisted/uncrawlable. Basic-Auth is left as a
//    COMMENTED template on purpose: Apache needs an absolute AuthUserFile path that only
//    exists server-side, so activating it here by default would 500 the folder.
//    Recommended: DirectAdmin → File Manager → "Password Protected Directories" on
//    projects/darts-beta (DA then writes its own working Auth directives + htpasswd).
//    NOTE: .ht* files are already blocked by Apache's default "<FilesMatch "^\\.ht">" rule.
writeFileSync(
  join(beta, '.htaccess'),
  `# darts-beta — unlisted test build (no link from the landing page).
Options -Indexes

# Keep crawlers out entirely (belt & braces with the noindex meta tag in index.html).
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteCond %{HTTP_USER_AGENT} (bot|crawl|spider) [NC]
  RewriteRule ^ - [F]
</IfModule>

# --- Basic-Auth protection (enable ONE of these two ways) ---
# Way 1 (recommended on DirectAdmin):
#   File Manager → open projects/darts-beta → "Password Protected Directories"
#   → set it protected with a user + password. DA writes the working directives itself.
#
# Way 2 (generic Apache): uncomment the three lines below and point AuthUserFile at a
#   real htpasswd file (create one with:  htpasswd -nb beta YOURPASSWORD )
# AuthType Basic
# AuthName "Darts Beta"
# AuthUserFile "/home/YOUR_DA_USER/.htpasswds/public_html/projects/darts-beta/.htpasswd"
# Require valid-user
`,
)

// 6. If --beta-password given, emit a ready-made htpasswd OUTSIDE public_html (never
//    shipped) so it can be pasted into DA's password UI or an AuthUserFile location.
if (betaPassword) {
  const line = `beta:{SHA}${createHash('sha1').update(betaPassword).digest('base64')}`
  writeFileSync(join(deployDir, 'htpasswd-beta.txt'), line + '\n')
}

// 6. Package deploy/public_html → deploy/deploy.zip (single File Manager upload)
const zip = new AdmZip()
zip.addLocalFolder(out, 'public_html')
const zipPath = join(deployDir, 'deploy.zip')
zip.writeZip(zipPath)

// 7. Same tree as tar.gz for ssh/tar users (skip if `tar` is unavailable).
//    Relative names only — GNU tar would treat "D:" in an absolute Windows path as a
//    remote hostname and fail.
const tarPath = join(deployDir, 'deploy.tar.gz')
const tar = spawnSync('tar', ['-czf', 'deploy.tar.gz', 'public_html'], { cwd: deployDir })

function dirSize(dir) {
  let total = 0
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    total += entry.isDirectory() ? dirSize(p) : statSync(p).size
  }
  return total
}
const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

console.log('Staged OK:')
console.log('  deploy/public_html/index.html                (projects landing page)')
console.log('  deploy/public_html/.htaccess')
console.log('  deploy/public_html/projects/darts/           (the live darts app)')
console.log('  deploy/public_html/projects/darts-beta/      (unlisted BETA copy, banner + noindex')
console.log(`                                                + Basic-Auth ${betaPassword ? 'htpasswd generated' : 'template — set a password!'})`)
console.log('  deploy/public_html/downloads/                (Windows installer + Android APK)')
console.log(`  deploy/deploy.zip                            (${mb(statSync(zipPath).size)}) ← upload this one`)
if (tar.status === 0) console.log(`  deploy/deploy.tar.gz                         (${mb(statSync(tarPath).size)})`)
else console.log('  (deploy.tar.gz skipped — tar unavailable; deploy.zip is all you need)')
console.log('')
console.log('DirectAdmin → File Manager → public_html → Upload deploy.zip → Extract here.')
console.log('Live:      https://personal.handyservices.co.za/projects/darts/')
console.log('Beta:      https://personal.handyservices.co.za/projects/darts-beta/   (unlisted)')
if (!betaPassword) {
  console.log('')
  console.log('Beta password: use DirectAdmin "Password Protected Directories" on darts-beta,')
  console.log('or re-stage with:  npm run stage -- --beta-password=YourSecret')
}
