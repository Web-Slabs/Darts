#!/usr/bin/env node
/**
 * Post-build step: inject Subresource-Integrity hashes into dist/index.html
 * for every local hashed asset (script + stylesheet), so a tampered or
 * partially-updated deploy fails to load instead of silently mixing versions.
 * Runs after `vite build` in both the web and electron build scripts.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const index = join(dist, 'index.html')
if (!existsSync(index)) {
  console.error('add-sri: dist/index.html not found — run vite build first')
  process.exit(1)
}

const sri = (p) => `sha256-${createHash('sha256').update(readFileSync(p)).digest('base64')}`
const local = (m) => join(dist, m[1].replace(/^\.?\//, ''))

let html = readFileSync(index, 'utf8')
const scriptTags = [...html.matchAll(/<script[^>]*\ssrc="(\.?\/assets\/[^" ]+\.js)"[^>]*><\/script>/g)]
const linkTags = [...html.matchAll(/<link[^>]*\shref="(\.?\/assets\/[^" ]+\.css)"[^>]*>/g)]

let n = 0
for (const m of scriptTags) {
  const file = local(m)
  if (!existsSync(file)) continue
  html = html.replace(m[0], m[0].replace('<script', `<script integrity="${sri(file)}"`))
  n++
}
for (const m of linkTags) {
  const file = local(m)
  if (!existsSync(file)) continue
  html = html.replace(m[0], m[0].replace('<link', `<link integrity="${sri(file)}"`))
  n++
}
writeFileSync(index, html)
console.log(`add-sri: integrity hashes injected into ${n} asset tag(s)`)
if (n === 0) {
  console.error('add-sri: no asset tags matched — check index.html shape')
  process.exit(1)
}
