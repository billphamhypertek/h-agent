import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CronJob } from '@/types/aether'

import {
  $cronJobs,
  $cronJobsStatus,
  deleteCronJobAction,
  loadCronJobs,
  pauseCronJobAction,
  resumeCronJobAction,
  triggerCronJobAction,
} from './cron-store'

function resetStore(): void {
  $cronJobs.set(null)
  $cronJobsStatus.set('idle')
}

afterEach(() => {
  resetStore()
  vi.restoreAllMocks()
})

const job: CronJob = { id: 'job-1', enabled: true, name: 'Brief sáng', state: 'scheduled', next_run_at: '2026-06-27T07:00:00Z' }

describe('loadCronJobs', () => {
  it('GETs /api/cron/jobs and fills $cronJobs + ready', async () => {
    const api = vi.fn().mockResolvedValue([job])
    await loadCronJobs({ api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
    expect($cronJobs.get()).toEqual([job])
    expect($cronJobsStatus.get()).toBe('ready')
  })

  it('sets empty when the list is empty', async () => {
    const api = vi.fn().mockResolvedValue([])
    await loadCronJobs({ api })
    expect($cronJobsStatus.get()).toBe('empty')
    expect($cronJobs.get()).toEqual([])
  })

  it('sets error when the request rejects', async () => {
    const api = vi.fn().mockRejectedValue(new Error('boom'))
    await loadCronJobs({ api })
    expect($cronJobsStatus.get()).toBe('error')
  })
})

describe('control actions', () => {
  it('pause POSTs the pause path then re-fetches the list', async () => {
    const api = vi.fn().mockImplementation((req: { path: string }) =>
      req.path === '/api/cron/jobs' ? Promise.resolve([job]) : Promise.resolve(job),
    )
    await pauseCronJobAction('job-1', { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/pause', method: 'POST' })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
    expect($cronJobsStatus.get()).toBe('ready')
  })

  it('resume POSTs the resume path then re-fetches', async () => {
    const api = vi.fn().mockResolvedValue([job])
    await resumeCronJobAction('job-1', { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/resume', method: 'POST' })
  })

  it('trigger POSTs the trigger path then re-fetches', async () => {
    const api = vi.fn().mockResolvedValue([job])
    await triggerCronJobAction('job-1', { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/trigger', method: 'POST' })
  })

  it('delete DELETEs the job path then re-fetches', async () => {
    const api = vi.fn().mockImplementation((req: { path: string }) =>
      req.path === '/api/cron/jobs' ? Promise.resolve([]) : Promise.resolve({ ok: true }),
    )
    await deleteCronJobAction('job-1', { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1', method: 'DELETE' })
    expect($cronJobsStatus.get()).toBe('empty')
  })
})
