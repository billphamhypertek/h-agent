import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC = readFileSync(resolve(process.cwd(), 'src/components/assistant-ui/tool-fallback.tsx'), 'utf8')

describe('tool-fallback is tokenized + dock-aware', () => {
  it('has no hardcoded state colors and no dark fork', () => {
    expect(SRC).not.toMatch(/text-emerald-/)
    expect(SRC).not.toMatch(/text-amber-/)
    expect(SRC).not.toMatch(/text-rose-/)
    expect(SRC).not.toMatch(/text-destructive\b/)
    expect(SRC).not.toMatch(/\bdark:/)
  })
  it('uses the --ae-* state tokens', () => {
    expect(SRC).toMatch(/--ae-state-online|--ae-ok/)
    expect(SRC).toMatch(/--ae-warn/)
    expect(SRC).toMatch(/--ae-error/)
  })
  it('stamps a scroll anchor id on each tool row', () => {
    expect(SRC).toMatch(/ae-tool-\$\{/)
  })
})
