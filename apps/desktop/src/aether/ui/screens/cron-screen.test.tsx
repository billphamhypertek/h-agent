import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { $cronJobs, $cronJobsStatus, $cronRuns, $cronRunsStatus } from '@/aether/domain/cron/cron-store'
import * as store from '@/aether/domain/cron/cron-store'
import type { CronJob } from '@/types/aether'

import { CronScreen } from './cron-screen'

const jobs: CronJob[] = [
  { id: 'a', enabled: true, name: 'Brief sáng', state: 'scheduled', next_run_at: '2026-06-27T07:00:00Z', schedule_display: 'Hằng ngày 07:00' },
  { id: 'b', enabled: false, name: 'Báo cáo tuần', state: 'paused', next_run_at: null, schedule_display: 'Thứ 2 09:00' },
]

afterEach(() => {
  cleanup()
  $cronJobs.set(null)
  $cronJobsStatus.set('idle')
  $cronRuns.set(null)
  $cronRunsStatus.set('idle')
})

describe('CronScreen', () => {
  it('renders a row + schedule + state badge per job when ready', () => {
    $cronJobs.set(jobs)
    $cronJobsStatus.set('ready')
    render(<CronScreen />)
    expect(screen.getByText('Brief sáng')).toBeTruthy()
    expect(screen.getByText('Báo cáo tuần')).toBeTruthy()
    expect(screen.getAllByTestId('ae-cron-row')).toHaveLength(2)
    expect(screen.getByText('Hằng ngày 07:00')).toBeTruthy()
  })

  it('shows a skeleton while loading', () => {
    $cronJobsStatus.set('loading')
    render(<CronScreen />)
    expect(screen.getByTestId('ae-cron-skeleton')).toBeTruthy()
  })

  it('shows a Vietnamese empty state', () => {
    $cronJobsStatus.set('empty')
    render(<CronScreen />)
    expect(screen.getByText(/Chưa có tác vụ định kỳ/)).toBeTruthy()
  })

  it('shows an inline error with a retry button', () => {
    $cronJobsStatus.set('error')
    render(<CronScreen />)
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })
})

describe('CronScreen controls', () => {
  it('clicking pause calls pauseCronJobAction with the job id', () => {
    const spy = vi.spyOn(store, 'pauseCronJobAction').mockResolvedValue()
    $cronJobs.set(jobs)
    $cronJobsStatus.set('ready')
    render(<CronScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Tạm dừng' })[0])
    expect(spy).toHaveBeenCalledWith('a')
    spy.mockRestore()
  })

  it('clicking trigger calls triggerCronJobAction', () => {
    const spy = vi.spyOn(store, 'triggerCronJobAction').mockResolvedValue()
    $cronJobs.set(jobs)
    $cronJobsStatus.set('ready')
    render(<CronScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Chạy ngay' })[0])
    expect(spy).toHaveBeenCalledWith('a')
    spy.mockRestore()
  })
})

describe('CronScreen run history (prompt-cache safe)', () => {
  it('clicking a job loads its runs via getCronJobRuns metadata only', () => {
    const spy = vi.spyOn(store, 'loadCronRuns').mockResolvedValue()
    $cronJobs.set(jobs)
    $cronJobsStatus.set('ready')
    render(<CronScreen />)
    fireEvent.click(screen.getByText('Brief sáng'))
    expect(spy).toHaveBeenCalledWith('a')
    spy.mockRestore()
  })

  it('renders run rows from SessionInfo metadata (title + message_count) without opening a conversation', () => {
    $cronJobs.set(jobs)
    $cronJobsStatus.set('ready')
    $cronRuns.set([
      { id: 'r1', title: 'Lần chạy', started_at: 1, ended_at: 2, last_active: 2, is_active: false, message_count: 4, model: 'x', input_tokens: 0, output_tokens: 0, preview: null, source: 'cron', tool_call_count: 0 },
    ])
    $cronRunsStatus.set('ready')
    render(<CronScreen />)
    expect(screen.getByText('Lần chạy')).toBeTruthy()
    // HARD guard: the screen module must not reference a message-stream / delta API
    // (forbidden-import assertion lives in the source review below).
  })
})

describe('CronScreen prompt-cache forbidden symbols', () => {
  it('never imports a conversation/delta API', () => {
    const src = readFileSync(join(__dirname, 'cron-screen.tsx'), 'utf8')
    // Justification: the cron screen is non-chat; touching any of these would
    // open a conversation stream and poison the prompt cache.
    expect(src).not.toMatch(/appendAssistantDelta|getSessionMessages|message\.delta|reasoning\.delta|thinking\./)
  })
})
