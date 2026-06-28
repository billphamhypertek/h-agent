import { beforeEach, describe, expect, it, vi } from 'vitest'

import sample from './fixtures/company-os.sample.json'
import { __resetCompanyOsCache, readLatestCompanyOs } from './read-company-os'

const FIXED_NOW = () => 1_000_000

function makeApi() {
  return vi.fn(async (req: { path: string }) => {
    if (req.path.startsWith('/api/cron/jobs?')) { return [{ id: 'job_abc', name: 'morning-briefing-aggregator' }] }

    if (req.path.includes('/runs')) { return { runs: [{ id: 'cron_job_abc_2026-06-26' }], limit: 1 } }
    throw new Error('unexpected ' + req.path)
  })
}

const getMessages = () =>
  vi.fn(async () => ({ messages: [{ role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' }] }))

beforeEach(() => { __resetCompanyOsCache() })

describe('readLatestCompanyOs', () => {
  it('resolves the job, fetches the latest run, parses the superset', async () => {
    const api = makeApi()
    const gm = getMessages()
    const out = await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    expect(out?.dev?.servers).toHaveLength(2)
    expect(out?.servers).toHaveLength(2)
    expect(gm).toHaveBeenCalledWith('cron_job_abc_2026-06-26', 'default')
  })

  it('serves a second non-forced call from the TTL cache (no refetch)', async () => {
    const api = makeApi()
    const gm = getMessages()
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { now: FIXED_NOW })
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { now: FIXED_NOW })
    expect(api).toHaveBeenCalledTimes(2) // one jobs + one runs, from the first call only
  })

  it('force-bypasses the cache and refetches', async () => {
    const api = makeApi()
    const gm = getMessages()
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    expect(api).toHaveBeenCalledTimes(4)
  })

  it('returns null when no aggregator job exists', async () => {
    const api = vi.fn(async () => [])
    const gm = vi.fn()
    expect(await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true })).toBeNull()
    expect(gm).not.toHaveBeenCalled()
  })
})
