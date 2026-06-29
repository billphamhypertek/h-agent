import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $graphSpec } from '@/aether/domain/motion/graph-store'
import { recordTurnEvent, resetTurnActivity } from '@/aether/domain/session/turn-activity'
import { $activeSessionId } from '@/store/session'
import { $subagentsBySession } from '@/store/subagents'

import { useChatGraph } from './use-chat-graph'

function Host() {
  useChatGraph()

  return null
}

beforeEach(() => {
  vi.useFakeTimers()
  resetTurnActivity(); $graphSpec.set(null); $subagentsBySession.set({}); $activeSessionId.set('s1')
})
afterEach(() => { vi.useRealTimers(); cleanup() })

describe('useChatGraph', () => {
  it('pushes a dock spec into $graphSpec on first compute and clears on unmount', () => {
    const { unmount } = render(<Host />)
    act(() => { recordTurnEvent({ type: 'message.start' }); recordTurnEvent({ type: 'tool.start', id: 'a', name: 'grep', label: 'Grep' }) })
    // The first content compute lands on the trailing edge (throttled); flush it,
    // mirroring how test 2 advances 160ms to observe its coalesced recompute.
    act(() => { vi.advanceTimersByTime(160) })
    expect($graphSpec.get()?.nodes.some(n => n.id === 'tool:a')).toBe(true)
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
  it('coalesces a burst into the trailing recompute within the throttle window', () => {
    render(<Host />)
    act(() => { recordTurnEvent({ type: 'message.start' }) })
    act(() => {
      recordTurnEvent({ type: 'tool.start', id: 'a', name: 'grep', label: 'Grep' })
      recordTurnEvent({ type: 'tool.start', id: 'b', name: 'read_file', label: 'Read File' })
    })
    act(() => { vi.advanceTimersByTime(160) })
    const ids = $graphSpec.get()?.nodes.map(n => n.id) ?? []
    expect(ids).toEqual(expect.arrayContaining(['tool:a', 'tool:b']))
  })
})
