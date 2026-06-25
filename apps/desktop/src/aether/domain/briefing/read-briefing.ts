import { getSessionMessages } from '@/aether-api'

import type { Briefing } from './briefing-schema'
import { parseBriefingFromMessages } from './parse-briefing'

interface CronJob { id: string; name: string }
interface CronRunsResponse { runs: { id: string }[]; limit: number }

export interface ReadBriefingDeps {
  api?: <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

export const BRIEFING_JOB_NAME = 'morning-briefing-aggregator'

export async function readLatestBriefing(deps: ReadBriefingDeps = {}): Promise<Briefing | null> {
  const api =
    deps.api ??
    (<T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) =>
      window.aetherDesktop.api<T>(request))

  const getMessages = deps.getMessages ?? getSessionMessages
  const jobName = deps.jobName ?? BRIEFING_JOB_NAME
  const profile = deps.profile ?? 'default'

  const jobs = await api<CronJob[]>({ path: `/api/cron/jobs?profile=${encodeURIComponent(profile)}` })
  const job = jobs.find(j => j.name === jobName)

  if (!job) { return null }

  const runs = await api<CronRunsResponse>({ path: `/api/cron/jobs/${encodeURIComponent(job.id)}/runs?limit=1` })
  const latest = runs.runs?.[0]

  if (!latest) { return null }

  const { messages } = await getMessages(latest.id, profile)

  return parseBriefingFromMessages(messages)
}
