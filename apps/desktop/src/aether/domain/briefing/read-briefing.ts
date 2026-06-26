import { COMPANY_OS_JOB_NAME, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

import type { Briefing } from './briefing-schema'

export interface ReadBriefingDeps {
  api?: <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

// Kept for back-compat: same value, same name string. HUD/Brief and the cron
// setup doc still reference this; the reader resolves by this job name.
export const BRIEFING_JOB_NAME = COMPANY_OS_JOB_NAME

// The briefing IS the company-os artifact's top-level slice (a CompanyOs is a
// Briefing superset). Force-bypass the company-os TTL cache so the briefing read
// is always fresh and never observes a cache another surface populated — the
// existing read-briefing tests assert a live fetch each call.
export async function readLatestBriefing(deps: ReadBriefingDeps = {}): Promise<Briefing | null> {
  return readLatestCompanyOs(deps, { force: true })
}
