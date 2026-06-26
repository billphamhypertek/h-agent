import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// A non-chat cockpit must never couple to the live conversation stream. Assert
// the screen + store source contain none of the forbidden tokens.
describe('DevScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(join(__dirname, 'dev-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(join(__dirname, '..', '..', 'domain', 'dev', 'dev-store.ts'), 'utf8')
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in dev screen/store: ${forbidden}`).toBe(false)
    }
  })
})
