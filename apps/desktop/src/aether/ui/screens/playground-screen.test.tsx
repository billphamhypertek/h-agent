import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $graphSpec } from '@/aether/domain/motion/graph-store'

import { PlaygroundScreen } from './playground-screen'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('aetherDesktop', { getRemoteDisplayReason: vi.fn().mockResolvedValue(null) })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); $graphSpec.set(null) })

describe('PlaygroundScreen', () => {
  it('seeds the graph store on mount and clears it on unmount', () => {
    const { unmount } = render(<PlaygroundScreen />)
    expect($graphSpec.get()?.nodes).toHaveLength(5)
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
  it('shows the static fallback when the WebGL gate is closed (jsdom has no GL)', () => {
    render(<PlaygroundScreen />)
    expect(screen.getByTestId('ae-graph-fallback')).toBeTruthy()
  })
})
