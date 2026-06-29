import { beforeEach, describe, expect, it } from 'vitest'

import { $turnActivity, recordTurnEvent, resetTurnActivity } from './turn-activity'

// Simulates the exact coarse-branch dispatch order use-message-stream.ts performs.
// If a future refactor accidentally routes a delta through recordTurnEvent, this fails.
describe('use-message-stream → $turnActivity contract', () => {
  beforeEach(() => resetTurnActivity())

  it('a tool turn drives the dock; per-token deltas are simply never dispatched here', () => {
    recordTurnEvent({ type: 'message.start' })
    recordTurnEvent({ type: 'tool.start', id: 'tc1', name: 'read_file', label: 'Read File', filePath: 'README.md' })
    // (message.delta / reasoning.delta arrive ~30×/s in the real stream but call NOTHING here)
    recordTurnEvent({ type: 'tool.complete', id: 'tc1', ok: true })
    recordTurnEvent({ type: 'message.complete' })

    const turn = $turnActivity.get()
    expect(turn.busy).toBe(false)
    expect(turn.tools).toEqual([{ id: 'tc1', name: 'read_file', label: 'Read File', status: 'ok', filePath: 'README.md' }])
  })
})
