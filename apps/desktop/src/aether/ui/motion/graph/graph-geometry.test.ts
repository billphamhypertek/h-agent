import { describe, expect, it } from 'vitest'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'
import { AETHER } from '@/aether/ui/theme/tokens'

import { linkPoints, nodeScale, stateColor } from './graph-geometry'

describe('graph render helpers', () => {
  it('maps node state to the shared state color', () => {
    expect(stateColor('online')).toBe(AETHER.stateOnline)
    expect(stateColor('busy')).toBe(AETHER.stateBusy)
    expect(stateColor('dormant')).toBe(AETHER.stateDormant)
  })
  it('scales busy > online > dormant buds', () => {
    expect(nodeScale('busy')).toBeGreaterThan(nodeScale('online'))
    expect(nodeScale('online')).toBeGreaterThan(nodeScale('dormant'))
  })
  it('resolves link endpoints, treating "core" as the origin', () => {
    const nodes: NodeSpec[] = [{ id: 'n1', label: 'X', state: 'online', x: 1, y: 2 }]
    const pts = linkPoints({ id: 'l', from: 'core', to: 'n1', flow: 0 }, nodes)
    expect(pts).toEqual({ from: { x: 0, y: 0 }, to: { x: 1, y: 2 } })
  })
  it('returns null when an endpoint is missing', () => {
    expect(linkPoints({ id: 'l', from: 'core', to: 'ghost', flow: 0 }, [])).toBeNull()
  })
})
