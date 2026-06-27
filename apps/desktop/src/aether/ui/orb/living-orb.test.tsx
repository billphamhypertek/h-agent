// apps/desktop/src/aether/ui/orb/living-orb.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { OrbState } from '@/aether/domain/motion/motion-store'

import { LivingOrb } from './living-orb'

afterEach(cleanup)

const ALL_STATES: OrbState[] = ['speaking', 'listening', 'thinking', 'idle', 'paused']

describe('LivingOrb forced state → class', () => {
  it.each(ALL_STATES)('renders ae-orb--%s for a forced state', state => {
    render(<LivingOrb state={state} />)
    expect(screen.getByRole('status').className).toContain(`ae-orb--${state}`)
  })
})

describe('LivingOrb', () => {
  it('renders an accessible status with the state label', () => {
    render(<LivingOrb state="thinking" label="ĐANG XỬ LÝ" />)
    const node = screen.getByRole('status')
    expect(node.getAttribute('aria-label')).toBe('ĐANG XỬ LÝ')
    expect(node.className).toContain('ae-orb--thinking')
  })
  it('applies the size as the --ae-orb-size custom property', () => {
    render(<LivingOrb size={118} label="x" />)
    const stage = screen.getByRole('status').querySelector('.ae-orb-stage') as HTMLElement
    expect(stage.style.getPropertyValue('--ae-orb-size')).toBe('118px')
  })
})
