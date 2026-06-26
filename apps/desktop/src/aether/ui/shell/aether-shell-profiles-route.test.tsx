import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Profiles route now
// renders the real screen and no longer the stub.
describe('aether-shell profiles route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports ProfilesScreen', () => {
    expect(src.includes("import { ProfilesScreen }")).toBe(true)
  })

  it('renders <ProfilesScreen /> on the profiles path', () => {
    expect(/<Route element=\{<ProfilesScreen \/>\} path=\{PROFILES_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Profiles stub', () => {
    expect(src.includes('<StubScreen title="Profiles" />')).toBe(false)
  })
})
