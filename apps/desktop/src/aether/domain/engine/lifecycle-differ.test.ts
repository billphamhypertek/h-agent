import { describe, expect, it } from 'vitest'

import type { AgentSessionRow } from '@/aether/domain/agents/agents-view'

import { diffSessions } from './lifecycle-differ'

function row(over: Partial<AgentSessionRow>): AgentSessionRow {
  return { id: 'x', title: 'X', source: 'local', profile: 'default', model: null, isActive: false, lastActive: 0, messageCount: 0, ...over }
}

describe('diffSessions', () => {
  it('new session id → mitosis', () => {
    expect(diffSessions([], [row({ id: 's1' })])).toEqual([{ sessionId: 's1', verb: 'mitosis' }])
  })
  it('active→inactive → crystallize', () => {
    const out = diffSessions([row({ id: 's1', isActive: true })], [row({ id: 's1', isActive: false })])
    expect(out).toEqual([{ sessionId: 's1', verb: 'crystallize' }])
  })
  it('messageCount increase → inhale (outranks flow)', () => {
    const out = diffSessions([row({ id: 's1', isActive: true, messageCount: 2 })], [row({ id: 's1', isActive: true, messageCount: 5 })])
    expect(out).toEqual([{ sessionId: 's1', verb: 'inhale' }])
  })
  it('still active, no message change → flow', () => {
    const out = diffSessions([row({ id: 's1', isActive: true, messageCount: 2 })], [row({ id: 's1', isActive: true, messageCount: 2 })])
    expect(out).toEqual([{ sessionId: 's1', verb: 'flow' }])
  })
  it('removed session id → prune', () => {
    expect(diffSessions([row({ id: 's1' })], [])).toEqual([{ sessionId: 's1', verb: 'prune' }])
  })
  it('unchanged inactive snapshot → no events', () => {
    expect(diffSessions([row({ id: 's1' })], [row({ id: 's1' })])).toEqual([])
  })
})
