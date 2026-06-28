import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  type MemoryStatus
} from '@/aether/domain/memory/memory-store'
import * as store from '@/aether/domain/memory/memory-store'

import { MemoryScreen } from './memory-screen'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [{ name: 'mem0', description: 'Mem0', configured: true }],
  builtin_files: { memory: 1, user: 0 }
}

// The mount OAuth probe (memory-screen.tsx) calls loadMemoryOAuthStatus via the
// store namespace, which hits window.aetherDesktop.api — undefined under jsdom,
// so the real fn rejects with no try/catch. No-op it so the render test never
// produces an unhandled rejection.
beforeEach(() => {
  vi.spyOn(store, 'loadMemoryOAuthStatus').mockResolvedValue()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('MemoryScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    // fileURLToPath(import.meta.url) throws under this vitest config; read by
    // __dirname-relative path instead. From src/aether/ui/screens/ the store
    // lives at ../../domain/memory/memory-store.ts.
    const screenSrc = readFileSync(join(__dirname, 'memory-screen.tsx'), 'utf8')

    const storeSrc = readFileSync(
      join(__dirname, '..', '..', 'domain', 'memory', 'memory-store.ts'),
      'utf8'
    )

    const combined = `${screenSrc}\n${storeSrc}`

    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in memory screen/store: ${forbidden}`).toBe(false)
    }
  })

  it('renders the entries display without subscribing to any conversation', () => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(null)
    $memoryConfigStatus.set('idle')
    // No throw, no stream wiring — pure REST-fed render.
    expect(() => render(<MemoryScreen />)).not.toThrow()
  })
})
