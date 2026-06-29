import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const SRC = readFileSync(resolve(ROOT, 'src/components/assistant-ui/thread.tsx'), 'utf8')

describe('thread.tsx is dock-aligned', () => {
  it('no longer mounts ThreadTimeline (the dock subsumes the prompt-rail)', () => {
    expect(SRC).not.toMatch(/ThreadTimeline/)
  })
  it('has no dark fork', () => {
    expect(SRC).not.toMatch(/\bdark:/)
  })
  it('the thread-timeline files are deleted', () => {
    expect(existsSync(resolve(ROOT, 'src/components/assistant-ui/thread-timeline.tsx'))).toBe(false)
    expect(existsSync(resolve(ROOT, 'src/components/assistant-ui/thread-timeline-data.ts'))).toBe(false)
  })
})
