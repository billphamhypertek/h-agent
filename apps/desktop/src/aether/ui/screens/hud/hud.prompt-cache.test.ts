import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// HARD prompt-cache guard: the HUD is a non-chat observation screen. It must read
// only list/metadata REST + non-conversation state — never open a stream or
// re-trigger the LLM. A static source-scan fails deterministically if a future
// edit reintroduces a stream symbol. (Mirrors agents-screen.prompt-cache.test.ts.)
const FORBIDDEN = ['message.delta', 'reasoning.delta', 'thinking.', 'appendAssistantDelta', 'getSessionMessages', 'resumeSession']

const FILES = [
  'src/aether/ui/screens/command-center.tsx',
  'src/aether/ui/screens/hud/use-hud-graph.ts',
  'src/aether/ui/screens/hud/constellation-overlay.tsx',
  'src/aether/ui/screens/hud/greeting-card.tsx',
  'src/aether/ui/screens/hud/system-vitals-card.tsx',
  'src/aether/ui/screens/hud/priorities-peek.tsx',
  'src/aether/ui/screens/hud/fleet-status.tsx',
  'src/aether/domain/engine/sessions-graph.ts',
  'src/aether/domain/engine/lifecycle-differ.ts',
  'src/aether/domain/agents/use-agents-poll.ts',
]

describe('HUD prompt-cache safety', () => {
  for (const rel of FILES) {
    it(`${rel} references no conversation-stream symbol`, () => {
      const source = readFileSync(resolve(process.cwd(), rel), 'utf8')

      for (const needle of FORBIDDEN) {
        expect(source.includes(needle), `${rel} must not reference "${needle}"`).toBe(false)
      }
    })
  }
})
