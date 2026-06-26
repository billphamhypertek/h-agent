import { describe, expect, it } from 'vitest'
import { deriveOrbState } from './motion-store'

describe('deriveOrbState (orb-state mapping table)', () => {
  it('busy ⇒ thinking regardless of gateway', () => {
    expect(deriveOrbState(true, 'open')).toBe('thinking')
    expect(deriveOrbState(true, 'closed')).toBe('thinking')
  })
  it('not busy + gateway open ⇒ idle', () => {
    expect(deriveOrbState(false, 'open')).toBe('idle')
  })
  it('not busy + gateway not open ⇒ paused (dim)', () => {
    expect(deriveOrbState(false, 'closed')).toBe('paused')
    expect(deriveOrbState(false, 'idle')).toBe('paused')
    expect(deriveOrbState(false, 'error')).toBe('paused')
  })
})
