import { describe, expect, it } from 'vitest'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'

import { labelText } from './labels'

describe('labelText', () => {
  it('returns the node label verbatim', () => {
    const n: NodeSpec = { id: 'n1', label: 'Vận hành', state: 'online', x: 0, y: 0 }
    expect(labelText(n)).toBe('Vận hành')
  })
})
