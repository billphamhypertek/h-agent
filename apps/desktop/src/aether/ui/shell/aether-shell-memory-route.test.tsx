import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Memory route now
// renders the real screen and no longer the stub.
describe('aether-shell memory route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports MemoryScreen', () => {
    expect(src.includes("import { MemoryScreen }")).toBe(true)
  })

  it('renders <MemoryScreen /> on the memory path', () => {
    expect(/<Route element=\{<MemoryScreen \/>\} path=\{MEMORY_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Memory stub', () => {
    expect(src.includes('<StubScreen title="Memory" />')).toBe(false)
  })
})
