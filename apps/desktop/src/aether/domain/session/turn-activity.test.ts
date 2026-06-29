import { beforeEach, describe, expect, it } from 'vitest'

import {
  $turnActivity,
  EMPTY_TURN,
  recordTurnEvent,
  resetTurnActivity,
  type TurnActivity,
  turnActivityReducer,
} from './turn-activity'

const base: TurnActivity = EMPTY_TURN

describe('turnActivityReducer', () => {
  it('message.start resets tools and enters reach/busy', () => {
    const dirty: TurnActivity = { phase: 'breathe', busy: false, tools: [{ id: 't', name: 'x', label: 'x', status: 'ok' }] }
    const out = turnActivityReducer(dirty, { type: 'message.start' })
    expect(out).toEqual({ phase: 'reach', busy: true, tools: [] })
  })
  it('tool.start adds a running bud and enters flow', () => {
    const out = turnActivityReducer({ ...base, busy: true, phase: 'reach' }, { type: 'tool.start', id: 't1', name: 'read_file', label: 'Read File', filePath: 'a.md' })
    expect(out.phase).toBe('flow')
    expect(out.tools).toEqual([{ id: 't1', name: 'read_file', label: 'Read File', status: 'running', filePath: 'a.md' }])
  })
  it('tool.complete ok flips the matching bud to ok and crystallizes', () => {
    const running = turnActivityReducer({ ...base, busy: true }, { type: 'tool.start', id: 't1', name: 'grep', label: 'Grep' })
    const out = turnActivityReducer(running, { type: 'tool.complete', id: 't1', ok: true })
    expect(out.tools[0].status).toBe('ok')
    expect(out.phase).toBe('crystallize')
  })
  it('tool.complete error flips the matching bud to error', () => {
    const running = turnActivityReducer({ ...base, busy: true }, { type: 'tool.start', id: 't1', name: 'grep', label: 'Grep' })
    const out = turnActivityReducer(running, { type: 'tool.complete', id: 't1', ok: false })
    expect(out.tools[0].status).toBe('error')
  })
  it('subagent.start enters mitosis', () => {
    const out = turnActivityReducer({ ...base, busy: true }, { type: 'subagent.start' })
    expect(out.phase).toBe('mitosis')
  })
  it('message.complete settles to breathe, idle, keeps the tool record', () => {
    const running = turnActivityReducer({ ...base, busy: true }, { type: 'tool.start', id: 't1', name: 'grep', label: 'Grep' })
    const out = turnActivityReducer(running, { type: 'message.complete' })
    expect(out.phase).toBe('breathe')
    expect(out.busy).toBe(false)
    expect(out.tools).toHaveLength(1)
  })
  // The single most important cache-safety assertion in #3:
  it('returns the SAME reference for an ignored (per-token) event — never recomputes on a delta', () => {
    const state: TurnActivity = { ...base, busy: true, tools: [{ id: 't', name: 'x', label: 'x', status: 'running' }] }
    expect(turnActivityReducer(state, { type: 'ignored' })).toBe(state)
  })
})

describe('$turnActivity store', () => {
  beforeEach(() => resetTurnActivity())
  it('recordTurnEvent applies the reducer; resetTurnActivity restores EMPTY_TURN', () => {
    recordTurnEvent({ type: 'message.start' })
    recordTurnEvent({ type: 'tool.start', id: 'a', name: 'read_file', label: 'Read File' })
    expect($turnActivity.get().tools.map(t => t.id)).toEqual(['a'])
    resetTurnActivity()
    expect($turnActivity.get()).toBe(EMPTY_TURN)
  })
})
