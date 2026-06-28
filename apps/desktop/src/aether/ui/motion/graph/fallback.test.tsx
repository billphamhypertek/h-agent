import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { hsgStandbyGraph } from '@/aether/domain/engine/demo-script'

import { GraphFallback } from './fallback'

afterEach(cleanup)

describe('GraphFallback', () => {
  it('renders one SVG node dot per graph node + the centered living orb', () => {
    render(<GraphFallback spec={hsgStandbyGraph()} />)
    const root = screen.getByTestId('ae-graph-fallback')
    expect(root.querySelectorAll('[data-ae-node]')).toHaveLength(5)
    expect(root.querySelector('[role="status"]')).toBeTruthy() // CSS LivingOrb
  })
})
