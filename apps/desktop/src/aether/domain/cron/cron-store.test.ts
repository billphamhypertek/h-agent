import { afterEach, describe, expect, it, vi } from 'vitest'

import type { CronJob, SessionInfo } from '@/types/aether'

import {
  $cronDeliveryTargets,
  $cronJobs,
  $cronJobsStatus,
  $cronRuns,
  $cronRunsStatus,
  createCronJobAction,
  deleteCronJobAction,
  loadCronDeliveryTargets,
  loadCronJobs,
  loadCronRuns,
  pauseCronJobAction,
  resumeCronJobAction,
  triggerCronJobAction,
  updateCronJobAction,
} from './cron-store'

function resetStore(): void {
  $cronJobs.set(null)
  $cronJobsStatus.set('idle')
  $cronRuns.set(null)
  $cronRunsStatus.set('idle')
  $cronDeliveryTargets.set([{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }])
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

describe('delivery targets', () => {
  it('GETs /api/cron/delivery-targets and unwraps { targets }', async () => {
    const targets = [{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }, { id: 'telegram', name: 'Telegram', home_target_set: true, home_env_var: 'TG' }]
    const api = vi.fn().mockResolvedValue({ targets })
    await loadCronDeliveryTargets({ api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/delivery-targets' })
    expect($cronDeliveryTargets.get()).toEqual(targets)
  })

  it('falls back to local-only when the endpoint rejects', async () => {
    const api = vi.fn().mockRejectedValue(new Error('nope'))
    await loadCronDeliveryTargets({ api })
    expect($cronDeliveryTargets.get()).toEqual([{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }])
  })
})

describe('create/update', () => {
  it('create POSTs the payload as the body then re-fetches', async () => {
    const api = vi.fn().mockResolvedValue([job])
    const payload = { prompt: 'Tóm tắt tin', schedule: '0 7 * * *', name: 'Brief', deliver: 'local' }
    await createCronJobAction(payload, { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs', method: 'POST', body: payload })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
  })

  it('update PUTs { updates } then re-fetches', async () => {
    const api = vi.fn().mockResolvedValue([job])
    await updateCronJobAction('job-1', { name: 'Mới' }, { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1', method: 'PUT', body: { updates: { name: 'Mới' } } })
  })
})

const run: SessionInfo = {
  id: 'run-1', title: 'Lần chạy 1', started_at: 1, ended_at: 2, last_active: 2,
  is_active: false, message_count: 4, model: 'x', input_tokens: 0, output_tokens: 0,
  preview: null, source: 'cron', tool_call_count: 0,
}

describe('loadCronRuns', () => {
  it('GETs the runs path with the limit and unwraps { runs } (metadata only)', async () => {
    const api = vi.fn().mockResolvedValue({ runs: [run] })
    await loadCronRuns('job-1', 10, { api })
    expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/runs?limit=10' })
    // HARD: only the runs path is hit — never a messages stream
    const paths = api.mock.calls.map(c => c[0].path as string)
    expect(paths.every(p => !p.includes('/messages'))).toBe(true)
    expect($cronRuns.get()).toEqual([run])
    expect($cronRunsStatus.get()).toBe('ready')
  })

  it('sets empty for no runs', async () => {
    const api = vi.fn().mockResolvedValue({ runs: [] })
    await loadCronRuns('job-1', 10, { api })
    expect($cronRunsStatus.get()).toBe('empty')
  })
})
