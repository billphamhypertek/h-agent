import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createGraph } from '@/aether/domain/engine/graph-model'

import { ConstellationOverlay, nodeViewPct } from './constellation-overlay'
import { $hudLifecycle } from './use-hud-graph'

function LocationPeek() {
  return <div data-testid="loc">{useLocation().pathname}</div>
}

beforeEach(() => { $hudLifecycle.set([]) })
afterEach(cleanup)

describe('nodeViewPct', () => {
  it('maps model space [-1,1] into 0..100 around center 50', () => {
    expect(nodeViewPct(0)).toBe(50)
    expect(nodeViewPct(1)).toBe(88)
    expect(nodeViewPct(-1)).toBe(12)
  })
})

describe('ConstellationOverlay', () => {
  it('navigates to the session route when a node hit-target is clicked', () => {
    const spec = createGraph({ nodes: [{ id: 's1', label: 'Phiên A', state: 'online', x: 0, y: 0 }] })
    render(
      <MemoryRouter initialEntries={['/hud']}>
        <ConstellationOverlay spec={spec} />
        <LocationPeek />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Mở phiên: Phiên A/ }))
    expect(screen.getByTestId('loc').textContent).toBe('/s1')
  })
  it('renders the empty skeleton hint when there are no nodes', () => {
    render(
      <MemoryRouter>
        <ConstellationOverlay spec={createGraph({ nodes: [] })} />
      </MemoryRouter>,
    )
    expect(screen.getByText(/Chưa có phiên/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
