import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..')

const FILES = [
  'aether/ui/screens/settings-screen.tsx',
  'aether/ui/screens/settings/model-tab.tsx',
  'aether/domain/settings/model-store.ts',
  'aether/ui/screens/settings/providers-tab.tsx',
  'aether/domain/settings/oauth-store.ts',
  'aether/ui/screens/settings/env-tab.tsx',
  'aether/domain/settings/env-store.ts'
]

const FORBIDDEN = [
  'appendAssistantDelta',
  'message.delta',
  'reasoning.delta',
  'thinking.',
  'use-message-stream'
]

describe('settings prompt-cache safety', () => {
  for (const rel of FILES) {
    it(`${rel} references no conversation-delta symbols`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      for (const needle of FORBIDDEN) {
        expect(src.includes(needle)).toBe(false)
      }
    })
  }
})
