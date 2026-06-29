import { describe, expect, it } from 'vitest'

import type { AgentSessionRow } from '@/aether/domain/agents/agents-view'

import { HUD_NODE_CAP, orderSessions, sessionState, sessionsToGraph } from './sessions-graph'

const NOW = 1_000_000_000_000

function row(over: Partial<AgentSessionRow>): AgentSessionRow {
  return { id: 'x', title: 'X', source: 'local', profile: 'default', model: null, isActive: false, lastActive: NOW, messageCount: 0, ...over }
}

describe('orderSessions', () => {
  it('puts active sessions first, then most-recent, then id', () => {
    const out = orderSessions([
      row({ id: 'b', isActive: false, lastActive: 5 }),
      row({ id: 'a', isActive: true, lastActive: 1 }),
      row({ id: 'c', isActive: false, lastActive: 9 }),
    ])

    expect(out.map(r => r.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('sessionState', () => {
  it('maps isActive→busy, recent→online, stale→dormant', () => {
    expect(sessionState(row({ isActive: true }), NOW)).toBe('busy')
    expect(sessionState(row({ isActive: false, lastActive: NOW - 60_000 }), NOW)).toBe('online')
    expect(sessionState(row({ isActive: false, lastActive: NOW - 3_600_000 }), NOW)).toBe('dormant')
  })
})

describe('sessionsToGraph', () => {
  it('caps to HUD_NODE_CAP=12 nodes + one core orb', () => {
    const many = Array.from({ length: 20 }, (_, i) => row({ id: `s${i}`, lastActive: i }))
    const g = sessionsToGraph(many, { now: NOW })
    expect(g.nodes).toHaveLength(HUD_NODE_CAP)
    expect(g.orbs).toEqual([{ id: 'core', kind: 'core', state: 'online', x: 0, y: 0 }])
    expect(g.links).toHaveLength(HUD_NODE_CAP)
    expect(g.links.every(l => l.from === 'core')).toBe(true)
  })
  it('labels nodes by session title and links carry flow=1 only for busy nodes', () => {
    const g = sessionsToGraph([row({ id: 's1', title: 'Phiên A', isActive: true })], { now: NOW })
    expect(g.nodes[0]).toMatchObject({ id: 's1', label: 'Phiên A', state: 'busy' })
    expect(g.links[0]).toMatchObject({ from: 'core', to: 's1', flow: 1 })
    expect(g.orbs[0].state).toBe('busy') // core reflects fleet activity
  })
  it('is deterministic — identical input yields identical coords (no RNG jitter)', () => {
    const input = [row({ id: 'a', lastActive: 2 }), row({ id: 'b', lastActive: 1 })]
    expect(sessionsToGraph(input, { now: NOW })).toEqual(sessionsToGraph(input, { now: NOW }))
  })
  it('empty sessions → core only, no nodes (skeleton)', () => {
    const g = sessionsToGraph([], { now: NOW })
    expect(g.nodes).toHaveLength(0)
    expect(g.orbs).toHaveLength(1)
  })
})
