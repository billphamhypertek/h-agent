import { describe, expect, it } from 'vitest'

import { computeMotionEnabled } from './use-motion-enabled'

describe('computeMotionEnabled (multi-layer gate)', () => {
  const ok = { reducedMotion: false, remoteDisplayReason: null as string | null, webglOk: true }
  it('all three layers green ⇒ true', () => {
    expect(computeMotionEnabled(ok)).toBe(true)
  })
  it('reduced-motion ⇒ false', () => {
    expect(computeMotionEnabled({ ...ok, reducedMotion: true })).toBe(false)
  })
  it('remote display (GPU off) ⇒ false even if reduced-motion is off', () => {
    expect(computeMotionEnabled({ ...ok, remoteDisplayReason: 'ssh' })).toBe(false)
  })
  it('webgl probe fail ⇒ false', () => {
    expect(computeMotionEnabled({ ...ok, webglOk: false })).toBe(false)
  })
})
