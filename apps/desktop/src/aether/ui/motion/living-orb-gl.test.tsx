import { describe, expect, it } from 'vitest'

import type { OrbState } from '@/aether/domain/motion/motion-store'

import { STATE_VALUE } from './living-orb-gl'

const ALL_STATES: OrbState[] = ['speaking', 'listening', 'thinking', 'idle', 'paused']

describe('LivingOrbGL STATE_VALUE', () => {
  it('maps every OrbState to a uniform value', () => {
    for (const state of ALL_STATES) {
      expect(typeof STATE_VALUE[state]).toBe('number')
    }
  })

  it('gives listening and speaking distinct values from idle/paused/thinking', () => {
    const values = new Set(ALL_STATES.map(s => STATE_VALUE[s]))
    expect(values.size).toBe(ALL_STATES.length)
    // listening/speaking sit in the "animated, not dimmed" range (> 0.55, <= 1)
    expect(STATE_VALUE.listening).toBeGreaterThan(0.55)
    expect(STATE_VALUE.speaking).toBeGreaterThan(0.55)
  })
})
