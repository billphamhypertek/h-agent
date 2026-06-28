import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CronJob, PaginatedSessions, SessionInfo, SkillInfo } from '@/types/aether'

import { $agents, $agentsStatus, loadAgents } from './agents-store'

function session(over: Partial<SessionInfo>): SessionInfo {
  return {
    ended_at: null, id: 's1', input_tokens: 0, is_active: false, last_active: 0,
    message_count: 0, model: null, output_tokens: 0, preview: null, source: null,
    started_at: 0, title: null, tool_call_count: 0, ...over,
  }
}

function page(sessions: SessionInfo[]): PaginatedSessions {
  return { limit: 40, offset: 0, total: sessions.length, sessions }
}

beforeEach(() => {
  $agents.set(null)
  $agentsStatus.set('idle')
})
afterEach(() => { vi.restoreAllMocks() })

describe('loadAgents', () => {
  it('aggregates sessions+cron+skills into the view and sets ready', async () => {
    const cron: CronJob[] = [{ id: 'j1', enabled: true, name: 'Brief', schedule: { display: 'Mỗi 8h' } }]
    const skills: SkillInfo[] = [{ name: 'a', category: 'core', description: '', enabled: true }]

    await loadAgents({
      listSessions: async () => page([session({ id: 'live', is_active: true, last_active: 5 })]),
      listCron: async () => cron,
      listSkills: async () => skills,
    })

    expect($agentsStatus.get()).toBe('ready')
    const view = $agents.get()
    expect(view?.runningCount).toBe(1)
    expect(view?.cron).toHaveLength(1)
    expect(view?.enabledSkillCount).toBe(1)
  })

  it('sets empty when all sources are empty', async () => {
    await loadAgents({
      listSessions: async () => page([]),
      listCron: async () => [],
      listSkills: async () => [],
    })

    expect($agentsStatus.get()).toBe('empty')
  })

  it('sets error when any source throws', async () => {
    await loadAgents({
      listSessions: async () => { throw new Error('boom') },
      listCron: async () => [],
      listSkills: async () => [],
    })

    expect($agentsStatus.get()).toBe('error')
    expect($agents.get()).toBeNull()
  })

  it('passes loading status during the fetch', async () => {
    let observed = ''
    await loadAgents({
      listSessions: async () => { observed = $agentsStatus.get();

 return page([]) },
      listCron: async () => [],
      listSkills: async () => [],
    })

    expect(observed).toBe('loading')
  })
})
