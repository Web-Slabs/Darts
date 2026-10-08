import { useState } from 'react'

const UPDATED = '24 September 2026'

export default function Legal() {
  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy')
  return (
    <>
      <h1>Legal</h1>
      <div className="chips" style={{ marginBottom: 16 }}>
        <button className={`chip ${tab === 'privacy' ? 'selected' : ''}`} onClick={() => setTab('privacy')}>Privacy Policy (POPIA / GDPR)</button>
        <button className={`chip ${tab === 'terms' ? 'selected' : ''}`} onClick={() => setTab('terms')}>Terms of Service</button>
      </div>

      {tab === 'privacy' && (
        <div className="panel legal">
          <p className="muted-line">Last updated {UPDATED}</p>
          <h2>1. Who we are</h2>
          <p>
            Bullseye Darts Scoreboard ("the App") is operated by Web-Slabs ("we", "us"). For POPIA
            (South Africa) and GDPR (EU/UK) purposes, we are the responsible party for the personal
            information processed through the App.
          </p>

          <h2>2. What we collect</h2>
          <ul>
            <li><strong>Account data:</strong> email address, display name, and — if you use social sign-in — your name and profile picture reference from that provider. Passwords are never stored by us in readable form.</li>
            <li><strong>Game data:</strong> match results, scores, checkouts and averages you record.</li>
            <li><strong>Venue data:</strong> venues you register or check in to, including the venue's check-in code.</li>
            <li><strong>Presence data:</strong> a "last seen" timestamp so players can see who is currently at the oche.</li>
            <li><strong>Usage analytics:</strong> anonymous events (games played, features used) with a pseudonymous id, device/browser type and derived country. Analytics contain no name or email.</li>
          </ul>

          <h2>3. Why we process it (lawful basis)</h2>
          <ul>
            <li><strong>To provide the service (contract):</strong> accounts, synced match history across venues and devices, leagues and tournaments.</li>
            <li><strong>Legitimate interest:</strong> keeping the leaderboard fair, preventing abuse, aggregate product analytics to improve the App.</li>
            <li><strong>Consent (optional features):</strong> social sign-in and presence visibility — you choose these and can withdraw at any time.</li>
          </ul>

          <h2>4. Who we share with</h2>
          <p>
            We only use processors necessary to run the service: Supabase (database, authentication,
            hosting of the API, EU/US regions) and your chosen sign-in provider (Google, Facebook/Meta,
            X). We never sell personal information. Venue scoreboards and leaderboards show
            display names — never emails.
          </p>

          <h2>5. Where data lives &amp; how long</h2>
          <p>
            Cloud data is stored on Supabase infrastructure. We keep your account and match data for
            as long as your account is active. Analytics events are pruned after 180 days. If you
            delete your account, we delete your profile, matches and memberships (see section 6).
          </p>

          <h2>6. Your rights</h2>
          <ul>
            <li><strong>Access &amp; portability:</strong> Account → <em>Download my data</em> exports everything as JSON, free, any time.</li>
            <li><strong>Rectification:</strong> edit your display name in Account; match scores via your venue coordinator.</li>
            <li><strong>Erasure:</strong> Account → <em>Delete my account</em> — immediate, self-service, irreversible.</li>
            <li><strong>Objection/restriction:</strong> email the address on the venue's registration to exercise these rights.</li>
            <li>You may complain to the <strong>Information Regulator (South Africa)</strong> or your local EU/UK supervisory authority.</li>
          </ul>

          <h2>7. Security</h2>
          <p>
            Transport encryption (TLS) everywhere; passwords hashed by our auth provider; database
            row-level security so players can only modify their own records; least-privilege anon key
            (no service credentials ship in the app).
          </p>

          <h2>8. Children</h2>
          <p>
            The App is not directed at children under 13 (or the minimum age in your country). Venue
            operators must ensure players meet the legal drinking-age environment of their premises;
            we process accounts for players of any age with guardian consent where required by law.
          </p>

          <h2>9. Changes</h2>
          <p>We'll announce material changes in the App and update the date above.</p>

          <h2>10. Contact</h2>
          <p>Privacy questions: use the contact email registered with your venue, or the address published on the site hosting this App.</p>
        </div>
      )}

      {tab === 'terms' && (
        <div className="panel legal">
          <p className="muted-line">Last updated {UPDATED}</p>
          <h2>1. The service</h2>
          <p>
            Bullseye Darts Scoreboard is a scoring, statistics and competition-management tool for
            darts players and venues. We provide the software; you provide the darts, the board and
            the honest counting.
          </p>

          <h2>2. Your account</h2>
          <ul>
            <li>You're responsible for activity under your login. One account per person.</li>
            <li>Keep your password safe. Notify us of unauthorised use.</li>
            <li>Don't impersonate others, create bot accounts, or scrape the service.</li>
          </ul>

          <h2>3. Acceptable use</h2>
          <ul>
            <li>No attempts to breach security, probe vulnerabilities, or disrupt other venues' play.</li>
            <li>No uploading unlawful, hateful or infringing content in names or venue descriptions.</li>
            <li>Venue owners are responsible for how their venue pages and leaderboards are used on their premises.</li>
          </ul>

          <h2>4. Competitions &amp; scoring</h2>
          <ul>
            <li>Scores are entered by players/venues and accepted as recorded — the chalkboard's word is final.</li>
            <li>We provide fixture generation and standings "as scored"; dispute resolution lives at the venue/league, not with us.</li>
            <li>Tournament brackets are randomly seeded unless a venue seeds them manually.</li>
          </ul>

          <h2>5. Fees</h2>
          <p>
            The core app is free for players. Venue/league premium features (if introduced) will be
            announced with clear pricing before any charge; we will never surprise-bill anyone.
          </p>

          <h2>6. Disclaimers</h2>
          <p>
            The service is provided "as is" without warranties of any kind. We don't guarantee
            uninterrupted availability (cloud maintenance happens), and we're not liable for a
            lost leg you blame on the software — settle it at the board like everyone else.
          </p>

          <h2>7. Liability</h2>
          <p>
            To the maximum extent permitted by law, our aggregate liability to you is limited to the
            amount you paid us in the 12 months before the claim (which, for free users, is zero).
            Nothing limits liability that cannot be limited by law.
          </p>

          <h2>8. Termination</h2>
          <p>
            You can delete your account any time. We may suspend accounts that breach these terms,
            with notice where practical.
          </p>

          <h2>9. Law &amp; venue</h2>
          <p>
            South African law governs these terms (POPIA chapter 3 conditions apply to data);
            courts of your residence retain any mandatory local protections (EU/UK consumers).
          </p>

          <h2>10. Contact</h2>
          <p>Legal notices via the contact email published on the hosting site.</p>
        </div>
      )}
    </>
  )
}
