import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { hsgStandbyGraph } from '@/aether/domain/engine/demo-script'
import { createGraph } from '@/aether/domain/engine/graph-model'

import { GraphFallback } from './fallback'

afterEach(cleanup)

describe('GraphFallback', () => {
  it('renders one SVG node dot per graph node + the centered living orb', () => {
    render(<GraphFallback spec={hsgStandbyGraph()} />)
    const root = screen.getByTestId('ae-graph-fallback')
    expect(root.querySelectorAll('[data-ae-node]')).toHaveLength(5)
    expect(root.querySelector('[role="status"]')).toBeTruthy() // CSS LivingOrb
  })
  it('dims an exit ghost node to match the GL fade', () => {
    const spec = createGraph({
      nodes: [{ exit: true, id: 'g', label: 'G', state: 'dormant', x: 0, y: 0 }],
    })

    render(<GraphFallback spec={spec} />)
    const ghost = screen.getByTestId('ae-graph-fallback').querySelector('[data-ae-node]')
    expect(ghost?.getAttribute('fill-opacity')).toBe('0.18')
  })
})
