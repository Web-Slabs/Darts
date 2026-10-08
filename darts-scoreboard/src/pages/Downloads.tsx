import { useStore } from '../lib/store'
import { IconDownload, IconBot, IconDesktop, IconGlobe } from '../components/icons'

// Files are uploaded to the host alongside the app:
//   public_html/downloads/Bullseye-Darts-Setup-<version>.exe
//   public_html/downloads/Bullseye-Darts-<version>.apk
// so the links work no matter where the app itself is mounted.
const WIN_VERSION = '1.2.3'
const APK_VERSION = '1.2.3'

export default function Downloads() {
  const authUser = useStore((s) => s.authUser)

  return (
    <>
      <div className="hero">
        <h1>Get Bullseye everywhere</h1>
        <p>
          One account, every screen. Play the web app right here, or install the native apps —
          your match history and stats sync to the cloud when you're signed in, and come with you.
        </p>
        {!authUser && (
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            Tip: <a href="#/account">sign in first</a> on every device you install, so your history follows you.
          </p>
        )}
      </div>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        <div className="card" style={{ padding: 22 }}>
          <span className="tag">Windows · 64-bit · ~95 MB</span>
          <h3><IconDesktop size={18} /> Windows desktop app</h3>
          <p style={{ marginBottom: 14 }}>
            Full offline scoreboard for the pub PC or your laptop. Standard installer — choose the
            install directory, desktop shortcut included. Online features (logins + cloud stats)
            work when the PC has internet.
          </p>
          <a className="btn" href={`../../downloads/Bullseye-Darts-Setup-${WIN_VERSION}.exe`} download>
            <IconDownload size={16} /> Download for Windows
          </a>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            Version {WIN_VERSION} · Windows 10/11 · SmartScreen may ask "More info → Run anyway"
            until the certificate is added.
          </p>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <span className="tag">Android · 8.0+ · ~10 MB</span>
          <h3><IconBot size={17} /> Android app (APK)</h3>
          <p style={{ marginBottom: 14 }}>
            The same scoreboard in your pocket. Sideload the APK — on first install Android will
            ask permission to install from your browser (Settings → Install unknown apps → allow).
          </p>
          <a className="btn" href={`../../downloads/Bullseye-Darts-${APK_VERSION}.apk`} download>
            <IconDownload size={16} /> Download Android APK
          </a>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            Version {APK_VERSION} · after installing, open Bullseye and sign in on the Account page.
          </p>
        </div>

        <div className="card" style={{ padding: 22 }}>
          <span className="tag">Any device · always current</span>
          <h3><IconGlobe size={18} /> Web app</h3>
          <p style={{ marginBottom: 14 }}>
            You're already here! The web app is always the newest version — bookmark it or
            "Add to Home Screen" on any phone or tablet for a near-native feel.
          </p>
          <a className="btn secondary" href="#/">
            ▶ Play in the browser
          </a>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
            No install, no storage, works on iPhone/iPad too.
          </p>
        </div>
      </div>
    </>
  )
}
