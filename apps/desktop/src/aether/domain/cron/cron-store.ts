import { atom } from 'nanostores'

import type { AetherApiRequest } from '@/global'
import type { CronJob } from '@/types/aether'

export interface CronStoreDeps {
  api: <T>(req: AetherApiRequest) => Promise<T>
}

function defaultDeps(): CronStoreDeps {
  return { api: req => window.aetherDesktop.api(req) }
}

export const $cronJobs = atom<CronJob[] | null>(null)
export const $cronJobsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

export async function loadCronJobs(deps: CronStoreDeps = defaultDeps()): Promise<void> {
  $cronJobsStatus.set('loading')

  try {
    const jobs = await deps.api<CronJob[]>({ path: '/api/cron/jobs' })
    $cronJobs.set(jobs)
    $cronJobsStatus.set(jobs.length === 0 ? 'empty' : 'ready')
  } catch {
    $cronJobsStatus.set('error')
  }
}

export async function pauseCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
  await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/pause`, method: 'POST' })
  await loadCronJobs(deps)
}

export async function resumeCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
  await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/resume`, method: 'POST' })
  await loadCronJobs(deps)
}

export async function triggerCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
  await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/trigger`, method: 'POST' })
  await loadCronJobs(deps)
}

export async function deleteCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
  await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}`, method: 'DELETE' })
  await loadCronJobs(deps)
}
