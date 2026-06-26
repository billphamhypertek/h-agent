import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores awkward to mount in jsdom; the route
// swap is a one-line wiring change, so a source assertion is the robust guard.
describe('aether-shell dev route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports DevScreen', () => {
    expect(src.includes('import { DevScreen }')).toBe(true)
  })

  it('renders <DevScreen /> on the dev path', () => {
    expect(/<Route element=\{<DevScreen \/>\} path=\{DEV_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})
