import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Skills route now
// renders the real screen and no longer the stub.
describe('aether-shell skills route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports SkillsScreen', () => {
    expect(src.includes("import { SkillsScreen }")).toBe(true)
  })

  it('renders <SkillsScreen /> on the skills path', () => {
    expect(/<Route element=\{<SkillsScreen \/>\} path="skills" \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Skills stub', () => {
    expect(src.includes('<StubScreen title="Skills" />')).toBe(false)
  })
})
