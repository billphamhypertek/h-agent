import { useEffect } from 'react'

import * as cronStore from './cron-store'

/**
 * Guarded light poll for live cron run status. Re-fetches the job LIST only
 * (REST, metadata) on a fixed interval, never a conversation socket — keeps the
 * "next run / state" badges fresh while a job fires. The interval is captured
 * in the effect and cleared in the cleanup so it never leaks past unmount.
 *
 * Calls `loadCronJobs` via the namespace binding (`cronStore.loadCronJobs`) so a
 * `vi.spyOn(store, 'loadCronJobs')` in tests intercepts the interval tick.
 */
export function useCronPoll(intervalMs = 15_000): void {
  useEffect(() => {
    const id = setInterval(() => {
      void cronStore.loadCronJobs()
    }, intervalMs)

    return () => {
      clearInterval(id)
    }
  }, [intervalMs])
}
