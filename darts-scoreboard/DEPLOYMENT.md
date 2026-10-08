# Deploying the web version to handyservices

The web build in `dist/` is 100% static — one `index.html` plus an `assets/` folder.
Any web server can serve it. Pick the option matching your hosting:

---

## Option A — handyservices (DirectAdmin): `personal.handyservices.co.za` + per-project folders

**What `npm run stage` produces locally:**

```
deploy/
├── deploy.zip                     ← upload this ONE file via DirectAdmin File Manager
├── deploy.tar.gz                  ← same tree, for ssh/tar workflows
├── htpasswd-beta.txt              ← only with --beta-password (see Beta below)
└── public_html/                   ← the exact tree that lands on the server
    ├── .htaccess                  ← caching + no-index listing (safe, generic)
    ├── index.html                 ← projects landing page
    └── projects/
        ├── darts/                 ← the live app
        │   ├── index.html
        │   └── assets/…
        └── darts-beta/            ← UNLISTED test copy (banner + noindex, auth-ready .htaccess)
            ├── index.html
            ├── assets/…
            └── .htaccess
```

Live URLs after upload:
- **`https://personal.handyservices.co.za/projects/darts/`** ← the app
- `https://personal.handyservices.co.za/` → projects landing page
- `https://personal.handyservices.co.za/projects/darts-beta/` → beta test copy (unlisted)

### Step-by-step

1. **Subdomain** — already created (`personal.handyservices.co.za`). DirectAdmin gives it its
   own web root, typically `public_html/personal/` under your domain. Note the exact path
   File Manager shows for it — that's where the zip's contents go.

2. **Stage the upload** on your PC:
   ```
   npm run build
   npm run stage
   ```
   This assembles everything in **`deploy/public_html/`** and packages it as
   **`deploy/deploy.zip`** (one file, easy File-Manager upload).

3. **Upload** — DirectAdmin → *File Manager* → open the subdomain's web root
   (usually `public_html/personal/`):
   - Upload `deploy.zip`.
   - Tick it → **Extract** → contents land as `index.html`, `.htaccess`, `projects/…`.
   - Delete the zip after extracting.
   - ⚠️ If the folder already has an `index.html` you care about, don't overwrite it —
     extract into a temp folder and move only `projects/` + `.htaccess` lines across.
   - (The `.htaccess` is optional: the app is hash-routed with relative assets, so it
     works without any rewrite rules. It just adds caching + hides directory listings.)

4. **HTTPS** — DirectAdmin → *Account Manager* → *SSL/TLS Certificates* → **Let's Encrypt**:
   select the `personal` subdomain and Save. Free certificate, auto-renews. Do this
   before enabling cloud logins (Supabase requires https redirect URLs).

5. **Cloud logins (when ready)** — after configuring Supabase (section below), add your
   real URL everywhere:
   - Supabase → Authentication → URL Configuration → Site URL:
     `https://personal.handyservices.co.za/projects/darts/`
   - Redirect URLs: `https://personal.handyservices.co.za/projects/darts/**`
   - Google/Facebook/X OAuth redirect URI (in each provider's console):
     `https://YOURPROJECT.supabase.co/auth/v1/callback`
   - Rebuild with real keys (`npm run build && npm run stage`) and re-upload.

6. **Future projects** — each new app gets its own folder: `npm run stage` copies `dist/`
   to `projects/darts/`; for the next app, drop its build into `projects/<name>/` and add
   a card to the landing page. One server, many projects, tidy URLs.

### Updating the deployed app

```
npm run build && npm run stage
```
then re-upload `deploy.zip`, Extract (overwrite), delete the zip. Stale hashed assets in
`assets/` are harmless but you can delete the `projects/darts/` folder first to keep it tidy.

Because the app uses hash routing (`#/game/x01`) **no URL-rewrite rules are needed**.

---

## Beta testing: `projects/darts-beta/` (unlisted + password-protected)

`npm run stage` copies the same build to `projects/darts-beta/` so you can test on the
real server before touching the live app:

- **Unlisted** — the landing page does not link it; the beta copy carries a
  `noindex, nofollow` meta tag, a red BETA banner at the bottom, and a `.htaccess` that
  blocks directory listings and bot user-agents.
- **Password-protect it** — DirectAdmin → *Account Manager* → *Password Protected
  Directories* → point it at `projects/darts-beta` → set a username + password.
  That's the whole job; DirectAdmin writes its own working auth directives.
- **No DirectAdmin UI access?** Re-stage with
  `npm run stage -- --beta-password=YourSecret` — it writes `deploy/htpasswd-beta.txt`
  (user `beta`, Apache `{SHA}` hash) that you can paste into an `.htpasswd` file next to
  the app and uncomment the three `Auth*` lines in the staged beta `.htaccess`.

Test the beta, then ship: re-upload the live `projects/darts/` when happy.

---

## Option B — Nginx

```nginx
server {
  listen 443 ssl;
  server_name darts.handyservices.co.za;
  root /var/www/darts;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

Upload the contents of `dist/` to `/var/www/darts`, then `nginx -s reload`.

---

## Option C — Free host (Vercel / Netlify / Cloudflare Pages) + subdomain DNS

1. Push this repo to GitHub.
2. Import it in Vercel/Netlify — build command `npm run build`, output dir `dist`.
3. In the host's dashboard add the custom domain `darts.handyservices.co.za`.
4. At your DNS provider create a `CNAME` record:
   `darts  →  cname.vercel-dns.com` (or the host's equivalent).
5. HTTPS is issued automatically.

---

## Enabling logins & cloud-synced stats (Supabase, free)

The app works fully offline. To switch on accounts + synced history:

1. Create a project at [supabase.com](https://supabase.com) (free tier is plenty).
2. SQL Editor → paste the contents of `supabase/schema.sql` → Run.
   This creates the `matches` table with row-level security so each user only sees their own games.
3. Project Settings → API: copy the **Project URL** and **anon public key**.
4. Build the app with those values:

   **PowerShell:**
   ```powershell
   $env:VITE_SUPABASE_URL = "https://YOURPROJECT.supabase.co"
   $env:VITE_SUPABASE_ANON_KEY = "eyJ...your-anon-key"
   npm run build
   ```

   Or create a `.env` file in the project root (git-ignored):
   ```
   VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```

5. Rebuild and redeploy. The ⚙️ Account page now shows **Continue with Google**, Sign in /
   Create account (email + password), and Forgot password.
   Signing in merges cloud + local history; every finished match uploads automatically.

6. In Supabase → Authentication → Providers, keep Email enabled. For private use also
   consider disabling open sign-ups and inviting players.

### Google sign-in (one-time console setup)

1. Supabase Dashboard → Authentication → Providers → **Google** → enable.
2. It asks for a **Google OAuth client** — create one at
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) →
   *Create credentials → OAuth client ID → Web application*.
3. In that Google client add these **Authorised redirect URIs** (exact, incl. https):
   - `https://YOURPROJECT.supabase.co/auth/v1/callback`
   - plus your own domain if you want Google to bounce back visibly,
     e.g. `https://personal.handyservices.co.za/#/auth`
4. Paste the Google **Client ID** and **Client Secret** into the Supabase Google provider → Save.
5. Also add your deployed domain under Authentication → URL Configuration → **Site URL**
   and **Redirect URLs** (e.g. `https://personal.handyservices.co.za/**`).

### Password reset / "Forgot password"

Works out of the box with Supabase's built-in email sender (rate-limited, fine for testing).
For real pub use, plug in your own SMTP so mails come from your domain:

1. Supabase → Project Settings → Authentication → SMTP → enter your SMTP host, user, pass
   (any transactional mail provider works: Gmail app-password, Mailgun, Brevo, etc.).
2. Authentication → Emails → Templates → **Reset Password** — brand the subject/body if you like;
   the link it sends opens the app's Account page in "set new password" mode.
3. Authentication → URL Configuration → add your deployed domain to Redirect URLs so the
   reset link lands on your site, not localhost.

### What players get

| Feature | Where |
| --- | --- |
| Google one-tap sign-in | ⚙️ Account → Continue with Google |
| Email register (6+ char password, email confirmation) | ⚙️ Account → Register |
| Forgot password → email link → set new password | ⚙️ Account → Forgot password? |
| Change display name (shown on leagues/boards) | ⚙️ Account (when signed in) |
| Session survives refresh & restarts | automatic |
| Match history synced per account across devices | automatic on sign-in |
| "At the oche now" — live list of signed-in players | 👥 Players (top card) |

---

## Desktop exe + web from the same code

The desktop installer embeds the same `dist/` build (`npm run electron:build`),
so one codebase ships both. Build the exe with the Supabase env vars set if you
want cloud logins inside the desktop app too.

## Updating

Make changes → `npm run build && npm run stage` → upload `deploy.zip` (Option A) or push (Option C).
Users' local stats persist in their browser/app storage; cloud users get everything re-synced.

## FTP quick-deploy (curl)

The FTP account root **is** the web root of `personal.handyservices.co.za`
(`projects/…`, `downloads/…` live at the top level — there is no `domains/…` prefix).

```bash
FTP="ftp://buffy%40handyservices.co.za:PASSWORD@da02.ondedicatedhosting.co.za"
# web app (index, assets/, fonts/, dartboard.jpg) → projects/darts/ and projects/darts-beta/
curl -s --ftp-pasv -T deploy/public_html/projects/darts/index.html "$FTP/projects/darts/index.html"
# installers → downloads/
curl -s --ftp-pasv -T "release/Bullseye Darts Scoreboard Setup 1.2.0.exe" "$FTP/downloads/Bullseye-Darts-Setup-1.2.0.exe"
```

Upload files one at a time (rapid-fire sequential uploads can trip the server's
550 rate limit — add `sleep 1` between font/asset uploads). Verify with HTTPS
status checks afterwards, not just curl's 226.

## Release checklist (all three targets)

Every release touches **all three targets** — web, Windows EXE, Android APK — plus the
version string in five places. Run the steps **in this order** (the EXE and the APK both
embed the web build, and the APK silently ships stale assets if you skip the sync).

**Automated path:** `npm run release` (`scripts/release.mjs`) implements steps 1–3 with
all gates built in (bundle-hash + fix-string check, EXE byte-exact check, cap-sync guard,
SHA-256 round-trip). Secrets live in `.release-env` (git-ignored — see `.release-env`
keys documented in the script header). Use `npm run release:web` for a web-only deploy.
The manual steps below are the reference/fallback.

### 0. Bump the version (five places — bump all together)

- `package.json` — `"version": "1.2.1"` (keep the `package-lock.json` root entries in sync)
- `src/pages/Downloads.tsx` — `WIN_VERSION` / `APK_VERSION`
- `scripts/stage-deploy.mjs` — `exeSrc` / `apkSrc` filenames + landing-page download links
- `src/App.tsx` — footer version string
- `android/app/build.gradle` — `versionCode` (+1 every release) and `versionName`

### 1. Web

```
npm run build && npm run stage
```

`npm run stage` copies from `dist/` — **always build first** or the deploy ships stale assets.
Upload `deploy/public_html/projects/darts/` (index.html + `assets/`) and the same tree for
`darts-beta/` (one file at a time, `sleep 1` between uploads — the server trips a 550 rate
limit on rapid-fire uploads).

Verify — the hashed bundle name must match the fresh `dist/assets/`, and the served JS must
contain a known fix string:

```bash
curl -s https://personal.handyservices.co.za/projects/darts/ | grep -o "index-[A-Za-z0-9]*\.js"
grep -o "index-[A-Za-z0-9]*\.js" dist/assets/index.html   # must be the same hash
curl -s https://personal.handyservices.co.za/projects/darts/assets/<that-bundle>.js | grep -c "<known fix string>"
```

Also upload `deploy/public_html/index.html` (the landing page links the current installers).

### 2. Windows EXE

```
npm run electron:build
```

Upload `release/Bullseye Darts Scoreboard Setup <ver>.exe` to `downloads/`, then verify the
remote byte size against the local file — a "successful" upload can still be truncated:

```bash
curl -sI https://personal.handyservices.co.za/downloads/Bullseye-Darts-Setup-1.2.3.exe | grep -i content-length
ls -la "release/Bullseye Darts Scoreboard Setup 1.2.1.exe"   # sizes must match exactly
```

> **FTP disk-quota trap:** the FTP account has limited headroom. Superseded installers from
> previous releases count against it — if uploads start failing with 550 **even for brand-new
> files**, delete the old `Bullseye-Darts-Setup-<old>.exe` / `.apk` pair from `downloads/`
> (and any truncated partial) and retry. Freeing the old pair is what un-stuck v1.2.1.

### 3. Android APK — cap sync BEFORE gradle (critical)

```bash
npm run build                                  # already done in step 1, but never skip it
npx cap sync android                           # ★ THE STEP THAT GETS FORGOTTEN ★
cd android
JAVA_HOME="D:/Projects/Darts/vendor/jdk21/jdk-21.0.12.1+1" \
ANDROID_HOME="D:/Projects/Darts/vendor/android-sdk" \
./gradlew.bat assembleRelease --no-daemon -q
```

**Skipping `npx cap sync android` ships an APK with stale web assets.** This bit once
(v1.2.0 shipped with the previous bundle inside); don't let it happen again. If in doubt,
check the synced assets directly:

```bash
grep -c "<known fix string>" android/app/src/main/assets/public/assets/index-*.js
```

Sign (build-tools live in the vendored SDK):

```bash
BT="D:/Projects/Darts/vendor/android-sdk/build-tools/35.0.0"
cd android/app/build/outputs/apk/release
"$BT/zipalign.exe" -f -p 4 Bullseye-Darts-<ver>.apk aligned.apk
"$BT/apksigner.bat" sign --ks "D:/Projects/Darts/keystore/bullseye-release.keystore" \
  --ks-key-alias bullseye --ks-pass pass:<pass> --key-pass pass:<pass> aligned.apk
mv aligned.apk Bullseye-Darts-<ver>.apk
"$BT/apksigner.bat" verify Bullseye-Darts-<ver>.apk
```

Upload to `downloads/`, then **SHA-256 round-trip — local vs freshly downloaded remote**:

```bash
sha256sum android/app/build/outputs/apk/release/Bullseye-Darts-1.2.3.apk
cd /tmp && curl -s -o apk.apk https://personal.handyservices.co.za/downloads/Bullseye-Darts-1.2.3.apk && sha256sum apk.apk
```

The two hashes must match **and** must differ from the previously shipped APK's hash — an
identical hash means the build was stale (usually a missed cap sync).

### 4. Post-release tidy-up

- Delete the superseded `<ver−1>` EXE + APK from `downloads/` — nothing links to them and
  they will fill the FTP quota before the next release.
- Confirm `https://personal.handyservices.co.za/` links the **current** versions.
- Confirm the app footer shows the new version (it's baked into the bundle).

## Android APK build (vendored toolchain)

The Android SDK and JDK 21 are vendored in `vendor/` (not committed). Build:

```bash
cd android
JAVA_HOME="D:/Projects/Darts/vendor/jdk21/jdk-21.0.12.1+1" \
ANDROID_HOME="D:/Projects/Darts/vendor/android-sdk" \
./gradlew.bat assembleRelease --no-daemon -q
# zipalign + apksigner with keystore/bullseye-release.keystore (alias bullseye)
```

**The keystore is required for every future APK update — back it up outside this
repo and never commit it.** Bump `versionCode`/`versionName` in
`android/app/build.gradle` for each release.

## Downloads page files

`/downloads/` on the server holds `Bullseye-Darts-Setup-<ver>.exe` and
`Bullseye-Darts-<ver>.apk`; `scripts/stage-deploy.mjs` copies them from
`release/` and `android/app/build/outputs/apk/release/` into the staged tree.
Version is pinned in `src/pages/Downloads.tsx`, `package.json`,
`android/app/build.gradle` and `scripts/stage-deploy.mjs` — bump all together
(see README "Versioning").
