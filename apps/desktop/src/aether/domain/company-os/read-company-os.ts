import { getSessionMessages } from '@/aether-api'
import { parseBriefingFromMessages } from '@/aether/domain/briefing/parse-briefing'

import type { CompanyOs } from './company-os-schema'

interface CronJob { id: string; name: string }
interface CronRunsResponse { runs: { id: string }[]; limit: number }

type ApiFn = <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>

export interface ReadCompanyOsDeps {
  api?: ApiFn
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

// Frozen for cron back-compat: the user's registered job keeps this name, and
// the reader resolves the run by name. The skill *content* is renamed to
// company-os-aggregator separately (see skills/productivity/company-os-aggregator).
export const COMPANY_OS_JOB_NAME = 'morning-briefing-aggregator'

// Light TTL cache so four pillar screens mounting at once don't quadruple the
// cron fetch. "Làm mới" buttons pass { force: true } to bypass it.
const CACHE_TTL_MS = 10_000
let cache: { value: CompanyOs | null; at: number } | null = null

export function __resetCompanyOsCache(): void { cache = null }

export async function readLatestCompanyOs(
  deps: ReadCompanyOsDeps = {},
  opts: { force?: boolean; now?: () => number } = {},
): Promise<CompanyOs | null> {
  const now = opts.now ?? Date.now

  if (!opts.force && cache && now() - cache.at < CACHE_TTL_MS) { return cache.value }

  const api =
    deps.api ??
    (<T>(request: Parameters<ApiFn>[0]) => window.aetherDesktop.api<T>(request))

  const getMessages = deps.getMessages ?? getSessionMessages
  const jobName = deps.jobName ?? COMPANY_OS_JOB_NAME
  const profile = deps.profile ?? 'default'

  const jobs = await api<CronJob[]>({ path: `/api/cron/jobs?profile=${encodeURIComponent(profile)}` })
  const job = jobs.find(j => j.name === jobName)

  if (!job) { cache = { value: null, at: now() };

 return null }

  const runs = await api<CronRunsResponse>({ path: `/api/cron/jobs/${encodeURIComponent(job.id)}/runs?limit=1` })
  const latest = runs.runs?.[0]

  if (!latest) { cache = { value: null, at: now() };

 return null }

  const { messages } = await getMessages(latest.id, profile)
  const parsed = parseBriefingFromMessages(messages) as CompanyOs | null

  cache = { value: parsed, at: now() }

  return parsed
}
