import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $agents } from '@/aether/domain/agents/agents-store'
import type { AgentSessionRow, AgentsView } from '@/aether/domain/agents/agents-view'
import { createGraph } from '@/aether/domain/engine/graph-model'
import { $graphSpec } from '@/aether/domain/motion/graph-store'

import { $hudLifecycle, reconcileGraph, useHudGraph } from './use-hud-graph'

function session(over: Partial<AgentSessionRow>): AgentSessionRow {
  return { id: 'x', title: 'X', source: 'local', profile: 'default', model: null, isActive: false, lastActive: 0, messageCount: 0, ...over }
}

function view(sessions: AgentSessionRow[]): AgentsView {
  return { runningCount: sessions.filter(s => s.isActive).length, sessions, cron: [], skills: [], enabledSkillCount: 0 }
}

function Host() {
  useHudGraph()

  return null
}

beforeEach(() => { $agents.set(null); $graphSpec.set(null); $hudLifecycle.set([]) })
afterEach(cleanup)

describe('reconcileGraph', () => {
  it('marks enter on mitosis nodes', () => {
    const next = createGraph({ nodes: [{ id: 'a', label: 'A', state: 'online', x: 0, y: 0 }] })
    const out = reconcileGraph(null, next, [{ sessionId: 'a', verb: 'mitosis' }])
    expect(out.nodes[0].enter).toBe(true)
  })
  it('re-adds a pruned node once with exit:true from its previous coords', () => {
    const prev = createGraph({ nodes: [{ id: 'a', label: 'A', state: 'online', x: 0.5, y: -0.5 }] })
    const next = createGraph({ nodes: [] })
    const out = reconcileGraph(prev, next, [{ sessionId: 'a', verb: 'prune' }])
    expect(out.nodes).toHaveLength(1)
    expect(out.nodes[0]).toMatchObject({ id: 'a', exit: true, x: 0.5, y: -0.5 })
  })
})

describe('useHudGraph', () => {
  it('pushes a spec into $graphSpec from $agents and clears on unmount', () => {
    $agents.set(view([session({ id: 's1', title: 'Phiên A' })]))
    const { unmount } = render(<Host />)
    expect($graphSpec.get()?.nodes.map(n => n.id)).toEqual(['s1'])
    unmount()
    expect($graphSpec.get()).toBeNull()
    expect($hudLifecycle.get()).toEqual([])
  })
  it('marks a newly-appeared session as enter on the next snapshot', () => {
    $agents.set(view([session({ id: 's1' })]))
    render(<Host />)
    // React 19: a post-render store mutation must be flushed inside act() so the
    // recompute effect runs before we assert (same pattern as the gateway-boot /
    // session-state-cache hook tests). Without it the effect is still pending.
    act(() => { $agents.set(view([session({ id: 's1' }), session({ id: 's2' })])) })
    const s2 = $graphSpec.get()?.nodes.find(n => n.id === 's2')
    expect(s2?.enter).toBe(true)
  })
})
