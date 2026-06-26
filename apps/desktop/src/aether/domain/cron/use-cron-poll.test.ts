import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as store from './cron-store'
import { useCronPoll } from './use-cron-poll'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useCronPoll', () => {
  it('re-fetches the job list on each interval tick', () => {
    const spy = vi.spyOn(store, 'loadCronJobs').mockResolvedValue()
    renderHook(() => useCronPoll(1000))
    expect(spy).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(spy).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1000)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('clears the interval on unmount — no leaked timer', () => {
    const spy = vi.spyOn(store, 'loadCronJobs').mockResolvedValue()
    const { unmount } = renderHook(() => useCronPoll(1000))
    vi.advanceTimersByTime(1000)
    expect(spy).toHaveBeenCalledTimes(1)
    unmount()
    vi.advanceTimersByTime(5000)
    expect(spy).toHaveBeenCalledTimes(1) // no further calls after unmount
  })
})
