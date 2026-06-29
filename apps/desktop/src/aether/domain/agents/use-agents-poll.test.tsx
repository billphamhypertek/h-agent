import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $agentsStatus } from './agents-store'
import { useAgentsPoll } from './use-agents-poll'

function Host({ load, isHidden }: { load: () => Promise<void>; isHidden: () => boolean }) {
  useAgentsPoll({ intervalMs: 5000, load, isHidden })

  return null
}

beforeEach(() => { vi.useFakeTimers(); $agentsStatus.set('idle') })
afterEach(() => { cleanup(); vi.useRealTimers() })

describe('useAgentsPoll', () => {
  it('loads once on mount when idle, then every interval while visible', () => {
    const load = vi.fn().mockResolvedValue(undefined)
    render(<Host isHidden={() => false} load={load} />)
    expect(load).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(5000)
    expect(load).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(5000)
    expect(load).toHaveBeenCalledTimes(3)
  })
  it('skips the tick while the document is hidden', () => {
    const load = vi.fn().mockResolvedValue(undefined)
    render(<Host isHidden={() => true} load={load} />)
    load.mockClear() // ignore the mount load
    vi.advanceTimersByTime(15000)
    expect(load).not.toHaveBeenCalled()
  })
  it('clears the interval on unmount', () => {
    const load = vi.fn().mockResolvedValue(undefined)
    const { unmount } = render(<Host isHidden={() => false} load={load} />)
    unmount()
    load.mockClear()
    vi.advanceTimersByTime(10000)
    expect(load).not.toHaveBeenCalled()
  })
})
