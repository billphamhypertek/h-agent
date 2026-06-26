import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// HARD prompt-cache guard: the Agents screen is a non-chat observation view. It
// must read only list/metadata REST + non-conversation state — never open a
// conversation stream, subscribe deltas, or re-trigger the LLM. A static
// source-scan is the most robust guard: it holds regardless of runtime mocking
// and fails deterministically if a future edit reintroduces a stream symbol.
const FORBIDDEN = [
  'message.delta',
  'reasoning.delta',
  'thinking.',
  'appendAssistantDelta',
  'getSessionMessages', // would open a transcript = conversation read
  'resumeSession',
]

const FILES = [
  'src/aether/ui/screens/agents-screen.tsx',
  'src/aether/domain/agents/agents-store.ts',
  'src/aether/domain/agents/agents-view.ts',
]

describe('AgentsScreen prompt-cache safety', () => {
  for (const rel of FILES) {
    it(`${rel} references no conversation-stream symbol`, () => {
      const source = readFileSync(resolve(process.cwd(), rel), 'utf8')

      for (const needle of FORBIDDEN) {
        expect(source.includes(needle), `${rel} must not reference "${needle}"`).toBe(false)
      }
    })
  }
})
