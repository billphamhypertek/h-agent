import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $cronJobs, $cronJobsStatus } from '@/aether/domain/cron/cron-store'
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
