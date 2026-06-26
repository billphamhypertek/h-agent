import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Cron route now
// renders the real screen and no longer the stub.
describe('aether-shell cron route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports CronScreen', () => {
    expect(src.includes("import { CronScreen }")).toBe(true)
  })

  it('renders <CronScreen /> on the cron path', () => {
    expect(/<Route element=\{<CronScreen \/>\} path="cron" \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Cron stub', () => {
    expect(src.includes('<StubScreen title="Cron" />')).toBe(false)
  })
})
