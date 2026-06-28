import { describe, expect, it } from 'vitest'

import { hsgStandbyGraph } from '@/aether/domain/engine/demo-script'

import { $graphSpec, clearGraphSpec, setGraphSpec } from './graph-store'

describe('graph-store', () => {
  it('sets and clears the active graph spec', () => {
    expect($graphSpec.get()).toBeNull()
    setGraphSpec(hsgStandbyGraph())
    expect($graphSpec.get()?.nodes).toHaveLength(5)
    clearGraphSpec()
    expect($graphSpec.get()).toBeNull()
  })
})
