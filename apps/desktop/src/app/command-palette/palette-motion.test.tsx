// apps/desktop/src/app/command-palette/palette-motion.test.tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const css = readFileSync(
  join(__dirname, '..', '..', 'aether', 'ui', 'theme', 'aether.css'),
  'utf8'
)
const palette = readFileSync(join(__dirname, 'index.tsx'), 'utf8')

describe('AETHER palette restyle', () => {
  it('applies the ae-palette class to the dialog content', () => {
    expect(palette).toContain("'ae-palette'")
  })

  it('defines a token-driven ae-palette surface (no raw hex)', () => {
    const block = css.slice(css.indexOf('.ae-palette {'), css.indexOf('}', css.indexOf('.ae-palette {')))
    expect(block).toContain('var(--ae-')
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('ships a Depth open animation (scale + blur + fade)', () => {
    expect(css).toContain('@keyframes ae-palette-in')
    expect(css).toMatch(/ae-palette-in[\s\S]*scale/)
    expect(css).toMatch(/ae-palette-in[\s\S]*blur/)
  })

  it('collapses the Depth animation to a plain fade under reduced motion', () => {
    const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(rm).toContain('.ae-palette')
  })
})
