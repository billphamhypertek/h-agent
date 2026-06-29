import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// Every AETHER UI surface must source color from `--ae-*` tokens (defined in
// aether.css, which flip dark "Spatial Depth" ↔ light "Arctic Glass"). Hardcoded
// hex/rgba literals don't flip with the mode and were the root cause of the
// "light/dark mixed up" regression. This test bans them across the UI tree.
//
// Excluded — these legitimately hold raw colors and are NOT CSS-token surfaces:
//   - theme/        → tokens.ts is the palette source of truth
//   - motion/       → WebGL/Three.js shaders take hex via `new Color(...)` uniforms
//                     (their light variants are driven by renderedMode, not CSS vars)
const UI_ROOT = resolve(process.cwd(), 'src/aether/ui')
const EXCLUDE_DIRS = new Set(['theme', 'motion'])
const HEX = /#[0-9a-fA-F]{3,8}\b/
const RGB = /\brgba?\(/
// Tailwind named colors that DON'T flip with the mode (white text stays white in
// light mode → invisible). Use a mode-aware token (e.g. text-[color:var(--ae-ink)]).
const NAMED = /\b(?:text|bg|border|ring|fill|stroke)-(?:white|black)\b/

function collectFiles(dir: string, topRel = ''): string[] {
  const out: string[] = []

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = topRel ? `${topRel}/${entry.name}` : entry.name

    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name) && topRel === '') { continue }
      out.push(...collectFiles(join(dir, entry.name), rel))

      continue
    }

    if (!/\.(ts|tsx)$/.test(entry.name)) { continue }

    if (entry.name.includes('.test.')) { continue }
    out.push(join(dir, entry.name))
  }

  return out
}

describe('AETHER UI color tokenization (no hardcoded colors)', () => {
  const files = collectFiles(UI_ROOT)

  it('discovers the UI tree', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  for (const abs of files) {
    const rel = relative(process.cwd(), abs)

    it(`${rel} has no hex/rgb/named-color literal`, () => {
      const lines = readFileSync(abs, 'utf8').split('\n')

      const offenders = lines
        .map((line, i) => ({ line, n: i + 1 }))
        .filter(({ line }) => HEX.test(line) || RGB.test(line) || NAMED.test(line))
        .map(({ line, n }) => `  L${n}: ${line.trim()}`)

      expect(offenders, `${rel} must use --ae-* tokens, not raw colors:\n${offenders.join('\n')}`).toEqual([])
    })
  }
})
