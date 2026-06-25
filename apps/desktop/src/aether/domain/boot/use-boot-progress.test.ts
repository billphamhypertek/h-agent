import { describe, expect, it } from 'vitest'

import { BOOT_STEPS, bootStepStatus } from './boot-store'

const at = (phase: string, progress: number) => ({
  error: null, fakeMode: false, message: '', phase, progress, running: true, timestamp: 0,
})

describe('boot checklist mapping', () => {
  it('marks earlier phases done and the current phase active', () => {
    const p = at('backend.spawn', 84)
    expect(bootStepStatus(p, 'backend.resolve')).toBe('done')
    expect(bootStepStatus(p, 'backend.spawn')).toBe('active')
    expect(bootStepStatus(p, 'backend.ready')).toBe('pending')
  })
  it('covers the documented phase order', () => {
    expect(BOOT_STEPS.map(s => s.phase)).toEqual([
      'backend.resolve', 'backend.runtime', 'backend.spawn', 'backend.port', 'backend.wait', 'backend.ready',
    ])
  })
})
