import { describe, expect, it } from 'vitest'

import type { CronJob, SessionInfo, SkillInfo } from '@/types/aether'

import { composeAgentsView } from './agents-view'

function session(over: Partial<SessionInfo>): SessionInfo {
  return {
    ended_at: null,
    id: 's1',
    input_tokens: 0,
    is_active: false,
    last_active: 0,
    message_count: 0,
    model: null,
    output_tokens: 0,
    preview: null,
    source: null,
    started_at: 0,
    title: null,
    tool_call_count: 0,
    ...over,
  }
}

describe('composeAgentsView', () => {
  it('maps + sorts sessions by lastActive desc and counts active ones', () => {
    const view = composeAgentsView(
      [
        session({ id: 'old', last_active: 100, title: 'Cũ', is_active: false }),
        session({ id: 'new', last_active: 900, title: null, preview: 'Xem trước', is_active: true, source: 'cron', profile: 'work', model: 'm', message_count: 3 }),
      ],
      [],
      [],
    )

    expect(view.sessions.map(s => s.id)).toEqual(['new', 'old'])
    expect(view.sessions[0].title).toBe('Xem trước')
    expect(view.sessions[0].source).toBe('cron')
    expect(view.sessions[0].profile).toBe('work')
    expect(view.runningCount).toBe(1)
  })

  it('falls back to a non-empty title and default source/profile', () => {
    const view = composeAgentsView([session({ id: 'x', title: null, preview: null })], [], [])
    expect(view.sessions[0].title).toBe('Phiên không tên')
    expect(view.sessions[0].source).toBe('local')
    expect(view.sessions[0].profile).toBe('default')
  })

  it('maps cron schedule with display fallback chain', () => {
    const job: CronJob = { id: 'j1', enabled: true, name: 'Brief', schedule_display: null, schedule: { display: 'Mỗi 8h' }, next_run_at: '2026-06-27T08:00:00Z', last_error: null }
    const view = composeAgentsView([], [job], [])
    expect(view.cron[0]).toEqual({ id: 'j1', name: 'Brief', schedule: 'Mỗi 8h', enabled: true, nextRunAt: '2026-06-27T08:00:00Z', lastError: null })
  })

  it('maps skills and counts enabled ones', () => {
    const skills: SkillInfo[] = [
      { name: 'a', category: 'core', description: '', enabled: true },
      { name: 'b', category: 'core', description: '', enabled: false },
    ]
    const view = composeAgentsView([], [], skills)
    expect(view.skills).toHaveLength(2)
    expect(view.enabledSkillCount).toBe(1)
  })
})
