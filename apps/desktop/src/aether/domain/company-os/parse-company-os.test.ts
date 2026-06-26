import { describe, expect, it } from 'vitest'

import oldBriefing from '@/aether/domain/briefing/fixtures/briefing.sample.json'
import { isBriefing, parseBriefingFromMessages } from '@/aether/domain/briefing/parse-briefing'

import companyOs from './fixtures/company-os.sample.json'
import type { CompanyOs } from './company-os-schema'

describe('company-os artifact (briefing superset)', () => {
  it('the new superset fixture passes the briefing guard', () => {
    expect(isBriefing(companyOs)).toBe(true)
  })

  it('the OLD briefing fixture still passes the guard (back-compat)', () => {
    expect(isBriefing(oldBriefing)).toBe(true)
  })

  it('the shared parser preserves the new pillar sections', () => {
    const messages = [{ role: 'assistant', content: '```json\n' + JSON.stringify(companyOs) + '\n```' }]
    const parsed = parseBriefingFromMessages(messages) as CompanyOs | null
    expect(parsed?.dev?.servers).toHaveLength(2)
    expect(parsed?.inbox?.threads[0].sender).toBe('ACME')
    expect(parsed?.ops?.tasks[0].severity).toBe('warn')
  })
})
