import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Artifacts route now
// renders the real screen and no longer the stub.
describe('aether-shell artifacts route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports ArtifactsScreen', () => {
    expect(src.includes("import { ArtifactsScreen }")).toBe(true)
  })

  it('renders <ArtifactsScreen /> on the artifacts path', () => {
    expect(/<Route element=\{<ArtifactsScreen \/>\} path=\{ARTIFACTS_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Artifacts stub', () => {
    expect(src.includes('<StubScreen title="Artifacts" />')).toBe(false)
  })
})
