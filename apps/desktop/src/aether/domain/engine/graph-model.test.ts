import { describe, expect, it } from 'vitest'

import { createGraph } from './graph-model'

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
