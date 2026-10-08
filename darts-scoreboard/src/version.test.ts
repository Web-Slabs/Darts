import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Guards the five version locations that must move together on every release.
// See DEPLOYMENT.md "Release checklist" step 0 and README "Versioning".
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p: string) => readFileSync(join(root, p), 'utf8')

const pkg = JSON.parse(read('package.json')) as { version: string }
const lock = JSON.parse(read('package-lock.json')) as {
  version: string
  packages: Record<string, { version?: string }>
}

describe('version consistency (all release locations must agree)', () => {
  const V = pkg.version

  it('package.json declares a plain semver version', () => {
    expect(V).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('package-lock.json root and packages[""] match package.json', () => {
    // This drifted to 1.1.0 during the 1.2.0 release — never again.
    expect(lock.version).toBe(V)
    expect(lock.packages['']?.version).toBe(V)
  })

  it('Downloads.tsx WIN_VERSION and APK_VERSION match', () => {
    const dl = read('src/pages/Downloads.tsx')
    expect(dl).toContain(`const WIN_VERSION = '${V}'`)
    expect(dl).toContain(`const APK_VERSION = '${V}'`)
  })

  it('stage-deploy.mjs mentions only the current version', () => {
    const sd = read('scripts/stage-deploy.mjs')
    expect(sd).toContain(`Setup ${V}.exe`)
    expect(sd).toContain(`Bullseye-Darts-${V}.apk`)
    const versions = [...sd.matchAll(/\b\d+\.\d+\.\d+\b/g)].map((m) => m[0])
    expect([...new Set(versions)]).toEqual([V])
  })

  it('App.tsx footer shows the current version', () => {
    expect(read('src/App.tsx')).toContain(`· v${V} ·`)
  })

  it('android/app/build.gradle versionName matches and versionCode increments', () => {
    const g = read('android/app/build.gradle')
    expect(g).toContain(`versionName "${V}"`)
    const code = Number(g.match(/versionCode (\d+)/)?.[1])
    expect(Number.isInteger(code)).toBe(true)
    // versionCode must never go backwards; it was 4 at v1.2.1.
    expect(code).toBeGreaterThanOrEqual(4)
  })
})
