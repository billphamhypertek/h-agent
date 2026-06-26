import { atom } from 'nanostores'

import { getCronJobs, getSkills, listAllProfileSessions } from '@/aether-api'
import type { CronJob, PaginatedSessions, SkillInfo } from '@/types/aether'

import type { AgentsView } from './agents-view'
import { composeAgentsView } from './agents-view'

export const $agents = atom<AgentsView | null>(null)
export const $agentsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

export interface LoadAgentsDeps {
  listSessions?: () => Promise<PaginatedSessions>
  listCron?: () => Promise<CronJob[]>
  listSkills?: () => Promise<SkillInfo[]>
}

// Read-only aggregation only. Recents excludes scheduler sessions so a burst of
// (always-newest) cron runs can't starve real conversations — the cron section
// surfaces schedules via getCronJobs() instead.
export async function loadAgents(deps: LoadAgentsDeps = {}): Promise<void> {
  const listSessions = deps.listSessions ?? (() => listAllProfileSessions(40, 0, 'exclude', 'recent', 'all', { excludeSources: ['cron'] }))
  const listCron = deps.listCron ?? getCronJobs
  const listSkills = deps.listSkills ?? getSkills

  $agentsStatus.set('loading')

  try {
    const [sessionsPage, cronJobs, skills] = await Promise.all([listSessions(), listCron(), listSkills()])
    const view = composeAgentsView(sessionsPage.sessions, cronJobs, skills)

    $agents.set(view)

    const empty = view.sessions.length === 0 && view.cron.length === 0 && view.skills.length === 0
    $agentsStatus.set(empty ? 'empty' : 'ready')
  } catch {
    $agents.set(null)
    $agentsStatus.set('error')
  }
}
