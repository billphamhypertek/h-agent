import { describe, expect, it } from 'vitest'

import { createGraph, type NodeSpec } from './graph-model'

describe('createGraph', () => {
  it('returns an empty breathing graph by default', () => {
    const g = createGraph()
    expect(g).toEqual({ phase: 'breathe', orbs: [], nodes: [], links: [] })
  })
  it('merges partial input over the defaults', () => {
    const g = createGraph({ phase: 'flow', nodes: [{ id: 'n1', label: 'Inbox', state: 'busy', x: 1, y: 0 }] })
    expect(g.phase).toBe('flow')
    expect(g.nodes).toHaveLength(1)
    expect(g.orbs).toEqual([])
  })
})

describe('NodeSpec lifecycle hints', () => {
  it('accepts optional enter/exit flags and defaults them undefined', () => {
    const node: NodeSpec = { id: 'n1', label: 'A', state: 'online', x: 0, y: 0, enter: true }
    expect(node.enter).toBe(true)
    expect(node.exit).toBeUndefined()
  })
  it('createGraph still defaults to an empty breathe graph', () => {
    expect(createGraph()).toEqual({ phase: 'breathe', orbs: [], nodes: [], links: [] })
  })
})
