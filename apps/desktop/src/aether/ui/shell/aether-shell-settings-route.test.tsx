import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Settings route now
// renders the real screen and no longer the stub.
describe('aether-shell settings route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports SettingsScreen', () => {
    expect(src.includes("import { SettingsScreen }")).toBe(true)
  })

  it('renders <SettingsScreen /> on the settings path', () => {
    expect(/<Route element=\{<SettingsScreen \/>\} path="settings" \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Settings stub', () => {
    expect(src.includes('<StubScreen title="Settings" />')).toBe(false)
  })
})
