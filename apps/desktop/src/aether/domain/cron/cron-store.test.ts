import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CronJob } from '@/types/aether'

import { $cronJobs, $cronJobsStatus, loadCronJobs } from './cron-store'

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
