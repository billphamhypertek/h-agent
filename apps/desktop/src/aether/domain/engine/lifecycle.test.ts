import { describe, expect, it } from 'vitest'

import { LIFECYCLE_PHASES, lifecycleReducer } from './lifecycle'

describe('6-verb lifecycle', () => {
  it('exposes the 6 verbs in order', () => {
    expect(LIFECYCLE_PHASES).toEqual(['breathe', 'reach', 'mitosis', 'flow', 'inhale', 'crystallize'])
  })
  it('walks the canonical HSG path on the scripted events', () => {
    let p = lifecycleReducer('breathe', 'think')
    expect(p).toBe('reach')
    p = lifecycleReducer(p, 'spawn')
    expect(p).toBe('mitosis')
    p = lifecycleReducer(p, 'work')
    expect(p).toBe('flow')
    p = lifecycleReducer(p, 'absorb')
    expect(p).toBe('inhale')
    p = lifecycleReducer(p, 'crystallize')
    expect(p).toBe('crystallize')
  })
  it('allows reach → flow directly (no sub-agent spawned)', () => {
    expect(lifecycleReducer('reach', 'work')).toBe('flow')
  })
  it('reset always returns to breathe; invalid events are no-ops', () => {
    expect(lifecycleReducer('flow', 'reset')).toBe('breathe')
    expect(lifecycleReducer('breathe', 'absorb')).toBe('breathe')
    expect(lifecycleReducer('crystallize', 'spawn')).toBe('crystallize')
  })
})
