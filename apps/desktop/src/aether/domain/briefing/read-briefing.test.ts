import { describe, expect, it, vi } from 'vitest'

import sample from './fixtures/briefing.sample.json'
import { readLatestBriefing } from './read-briefing'

describe('readLatestBriefing', () => {
  it('finds the job, fetches the latest run, parses the artifact', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path.startsWith('/api/cron/jobs?')) { return [{ id: 'job_abc', name: 'morning-briefing-aggregator' }] }

      if (req.path.includes('/runs')) { return { runs: [{ id: 'cron_job_abc_2026-06-25' }], limit: 1 } }

      throw new Error('unexpected ' + req.path)
    })

    const getMessages = vi.fn(async () => ({
      session_id: 'cron_job_abc_2026-06-25',
      messages: [{ role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' }],
    }))

    const out = await readLatestBriefing({ api: api as never, getMessages: getMessages as never })

    expect(out?.servers).toHaveLength(2)
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining('/api/cron/jobs?') }))
    expect(getMessages).toHaveBeenCalledWith('cron_job_abc_2026-06-25', 'default')
  })

  it('returns null when no briefing job exists', async () => {
    const api = vi.fn(async () => [])
    const getMessages = vi.fn()

    expect(await readLatestBriefing({ api: api as never, getMessages: getMessages as never })).toBeNull()
    expect(getMessages).not.toHaveBeenCalled()
  })
})
