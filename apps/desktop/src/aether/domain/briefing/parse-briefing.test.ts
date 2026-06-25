import { describe, expect, it } from 'vitest'

import sample from './fixtures/briefing.sample.json'
import { extractJsonBlock, isBriefing, parseBriefingFromMessages } from './parse-briefing'

describe('briefing parser', () => {
  it('validates the sample fixture against the guard', () => {
    expect(isBriefing(sample)).toBe(true)
  })

  it('extracts a fenced ```json block from message text', () => {
    const text = 'Đây là brief:\n```json\n{"a":1}\n```\nxong.'

    expect(extractJsonBlock(text)).toEqual({ a: 1 })
  })

  it('reads the last assistant message and returns a Briefing', () => {
    const messages = [
      { role: 'user', content: 'run' },
      { role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' },
    ]

    const b = parseBriefingFromMessages(messages)

    expect(b?.priorities).toHaveLength(4)
    expect(b?.servers[1].status).toBe('warn')
  })

  it('returns null when no valid artifact is present', () => {
    expect(parseBriefingFromMessages([{ role: 'assistant', content: 'no json here' }])).toBeNull()
  })
})
