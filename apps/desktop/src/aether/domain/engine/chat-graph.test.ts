import { describe, expect, it } from 'vitest'

import { EMPTY_TURN, type ToolActivity, type TurnActivity } from '@/aether/domain/session/turn-activity'
import type { SubagentProgress } from '@/store/subagents'

import { BUD_CAP, chatGraph, dockLayout, reconcileChatGraph } from './chat-graph'
import { createGraph } from './graph-model'

const tool = (over: Partial<ToolActivity>): ToolActivity => ({ id: 't', name: 'grep', label: 'Grep', status: 'running', ...over })

const sub = (over: Partial<SubagentProgress>): SubagentProgress =>
  ({ id: 's', parentId: null, goal: 'Goal', status: 'running', taskCount: 1, taskIndex: 0, startedAt: 0, updatedAt: 0, filesRead: [], filesWritten: [], stream: [], ...over })

const turn = (over: Partial<TurnActivity>): TurnActivity => ({ ...EMPTY_TURN, ...over })

describe('dockLayout', () => {
  it('is deterministic and clusters every point in the right half (x > 0.4)', () => {
    const a = dockLayout(5)
    const b = dockLayout(5)
    expect(a).toEqual(b)
    expect(a.every(p => p.x > 0.4)).toBe(true)
  })
  it('returns no points for an empty turn', () => {
    expect(dockLayout(0)).toEqual([])
  })
})

describe('chatGraph', () => {
  it('an idle empty turn is the lone breathing core (online, no nodes)', () => {
    const g = chatGraph(EMPTY_TURN, [])
    expect(g.orbs).toHaveLength(1)
    expect(g.orbs[0]).toMatchObject({ id: 'core', kind: 'core', state: 'online' })
    expect(g.nodes).toEqual([])
  })
  it('busy turn → core is busy', () => {
    expect(chatGraph(turn({ busy: true }), []).orbs[0].state).toBe('busy')
  })
  it('a running tool becomes a busy bud node + a flowing link', () => {
    const g = chatGraph(turn({ busy: true, tools: [tool({ id: 'a', status: 'running' })] }), [])
    const bud = g.nodes.find(n => n.id === 'tool:a')!
    expect(bud.state).toBe('busy')
    expect(g.links.find(l => l.to === 'tool:a')?.flow).toBe(1)
  })
  it('an ok tool is online, an error tool is dormant (color lives in the DOM overlay)', () => {
    const g = chatGraph(turn({ tools: [tool({ id: 'a', status: 'ok' }), tool({ id: 'b', status: 'error' })] }), [])
    expect(g.nodes.find(n => n.id === 'tool:a')!.state).toBe('online')
    expect(g.nodes.find(n => n.id === 'tool:b')!.state).toBe('dormant')
  })
  it('a running sub-agent becomes a busy node id sub:<id>', () => {
    const g = chatGraph(turn({ busy: true }), [sub({ id: 'x', status: 'running' })])
    expect(g.nodes.find(n => n.id === 'sub:x')!.state).toBe('busy')
  })
  it('caps buds at BUD_CAP and adds a single "+k" overflow node', () => {
    const tools = Array.from({ length: BUD_CAP + 3 }, (_, i) => tool({ id: `t${i}`, status: 'running' }))
    const g = chatGraph(turn({ busy: true, tools }), [])
    const buds = g.nodes.filter(n => n.id.startsWith('tool:'))
    const more = g.nodes.find(n => n.id === 'more')
    expect(buds).toHaveLength(BUD_CAP)
    expect(more?.label).toBe('+3')
  })
  it('is deterministic — identical input yields identical node coordinates', () => {
    const t = turn({ busy: true, tools: [tool({ id: 'a' }), tool({ id: 'b' })] })
    expect(chatGraph(t, [])).toEqual(chatGraph(t, []))
  })
})

describe('reconcileChatGraph', () => {
  it('marks enter on newly-appeared nodes', () => {
    const next = createGraph({ nodes: [{ id: 'tool:a', label: 'A', state: 'busy', x: 0.8, y: 0 }] })
    expect(reconcileChatGraph(null, next).nodes[0].enter).toBe(true)
  })
  it('re-adds a removed node once as an exit ghost from its prior coords', () => {
    const prev = createGraph({ nodes: [{ id: 'tool:a', label: 'A', state: 'busy', x: 0.8, y: -0.3 }] })
    const out = reconcileChatGraph(prev, createGraph({ nodes: [] }))
    expect(out.nodes).toHaveLength(1)
    expect(out.nodes[0]).toMatchObject({ id: 'tool:a', exit: true, state: 'dormant', x: 0.8, y: -0.3 })
  })
})
