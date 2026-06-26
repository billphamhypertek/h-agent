import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Messaging route now
// renders the real screen and no longer the stub.
describe('aether-shell messaging route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports MessagingScreen', () => {
    expect(src.includes("import { MessagingScreen }")).toBe(true)
  })

  it('renders <MessagingScreen /> on the messaging path', () => {
    expect(/<Route element=\{<MessagingScreen \/>\} path=\{MESSAGING_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Messaging stub', () => {
    expect(src.includes('<StubScreen title="Messaging" />')).toBe(false)
  })
})
