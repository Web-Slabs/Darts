// Self-hosted SVG icon set — crisp chalk-style line icons, no emoji, no
// third-party requests. 24×24 viewBox, stroke inherits currentColor.

type P = { size?: number; className?: string }

const base = (size?: number) => ({
  width: size ?? 18,
  height: size ?? 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

/** Dartboard (home) */
export const IconHome = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
)

/** Two players (users) */
export const IconPlayers = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.7-3 2.8-4.5 5.5-4.5S13.8 16 14.5 19" />
    <circle cx="16.5" cy="9" r="2.6" />
    <path d="M15.5 14.7c2.3.2 4 1.5 4.7 4.3" />
  </svg>
)

/** Podium (stats) */
export const IconStats = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20h16" />
    <rect x="5" y="11" width="4" height="9" rx="1" />
    <rect x="10" y="6" width="4" height="14" rx="1" />
    <rect x="15" y="14" width="4" height="6" rx="1" />
  </svg>
)

/** Clock with arrow (history) */
export const IconHistory = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
    <path d="M3.5 12a8.5 8.5 0 1 1 2 5.5" />
    <path d="M3.5 13.5 3.5 17l3-1" />
  </svg>
)

/** Down arrow into a tray (downloads) */
export const IconDownload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 4v10" />
    <path d="m8 10 4 4 4-4" />
    <path d="M5 18.5h14" />
  </svg>
)

/** Keyhole/lock (account) */
export const IconAccount = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="9" r="3.2" />
    <path d="M6.5 19c.8-2.8 2.9-4.3 5.5-4.3s4.7 1.5 5.5 4.3" />
  </svg>
)

/** Open book (rules) */
export const IconBook = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 6.5C10.5 5 8.5 4.5 5.5 4.5c-.6 0-1 .4-1 1v12c0 .6.4 1 1 1 3 0 5 .5 6.5 2 1.5-1.5 3.5-2 6.5-2 .6 0 1-.4 1-1v-12c0-.6-.4-1-1-1-3 0-5 .5-6.5 2Z" />
    <path d="M12 6.5v14" />
  </svg>
)

/** Curved back arrow (undo / back) */
export const IconUndo = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 5 4 9l4 4" />
    <path d="M4 9h10a5 5 0 0 1 0 10h-3" />
  </svg>
)

/** Dart (throw) */
export const IconDart = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 3l-9.5 9.5" />
    <path d="M21 3l-4 8-4-4 8-4Z" />
    <path d="m11.5 12.5-4 4" />
    <path d="m7.5 16.5-2.5 1 1-2.5" />
    <path d="m7 17-3 3" />
  </svg>
)

/** Target (aim / needs-to-win) */
export const IconTarget = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </svg>
)

/** Rotating arrows (rematch) */
export const IconRematch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 12a8 8 0 1 1-2.5-5.8" />
    <path d="M20 3v4h-4" />
  </svg>
)

/** Broom/reset (sweep clean) */
export const IconReset = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M19 3 9.5 12.5" />
    <path d="M13 7l4 4" />
    <path d="M5 21c3-1 5.5-2 8.5-5" />
    <path d="M6.5 13.5 10.5 17.5c1.5-1.5 2-3.5 1-4.5l-1-1c-1-1-3-.5-4 1.5Z" />
  </svg>
)

/** Robot (dartbot) */
export const IconBot = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="5" y="8" width="14" height="10" rx="2.5" />
    <circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none" />
    <path d="M12 8V5" />
    <circle cx="12" cy="4" r="1" />
  </svg>
)

/** Trophy (winner) */
export const IconTrophy = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 4h8v6a4 4 0 0 1-8 0V4Z" />
    <path d="M8 5H5a3 3 0 0 0 3 5" />
    <path d="M16 5h3a3 3 0 0 1-3 5" />
    <path d="M12 14v3" />
    <path d="M8.5 20h7" />
    <path d="M10 17h4l.5 3h-5l.5-3Z" />
  </svg>
)

/** Chevrons down (score on spine) */
export const IconSpine = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m6 5 6 5 6-5" />
    <path d="m6 12 6 5 6-5" />
  </svg>
)

/** Desktop computer (Windows app) */
export const IconDesktop = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="2.5" y="4" width="19" height="12.5" rx="1.5" />
    <path d="M8 20.5h8M12 16.5v4" />
  </svg>
)

/** Globe (web app) */
export const IconGlobe = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.7 2.6 4 5.6 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.6-4-9s1.3-6.4 4-9z" />
  </svg>
)

/** Rising chart (growth report) */
export const IconChartUp = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3.5 20.5h17" />
    <path d="M4 16l5-5 3.5 3L20 7" />
    <path d="M20 12V7h-5" />
  </svg>
)

/** Trophy cup (leaderboard) */
export const IconTrophyCup = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M8 4h8v6a4 4 0 0 1-8 0V4z" />
    <path d="M8 6H5a1 1 0 0 0-1 1c0 2 1.6 3.4 4 3.5M16 6h3a1 1 0 0 1 1 1c0 2-1.6 3.4-4 3.5" />
    <path d="M12 14v3M8.5 20.5h7M10 17h4l.5 3.5h-5L10 17z" />
  </svg>
)

/** Map pin (venue check-in) */
export const IconPin = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21s-6.5-5.3-6.5-10.2A6.5 6.5 0 0 1 12 4.3a6.5 6.5 0 0 1 6.5 6.5C18.5 15.7 12 21 12 21z" />
    <circle cx="12" cy="10.7" r="2.4" />
  </svg>
)

/** Chalk tick (done/reported) */
export const IconTick = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4.5 12.5l5 5L19.5 7" />
  </svg>
)
