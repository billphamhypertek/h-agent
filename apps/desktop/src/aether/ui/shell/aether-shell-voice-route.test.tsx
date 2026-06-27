// src/aether/ui/shell/aether-shell-voice-route.test.tsx
// Mirrors the existing aether-shell-content-route.test.tsx pattern.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell voice route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports VoiceScreen', () => {
    expect(src.includes('import { VoiceScreen }')).toBe(true)
  })

  it('renders <VoiceScreen /> on the voice path', () => {
    expect(/<Route element=\{<VoiceScreen \/>\} path=\{VOICE_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer leaves Voice as a stub', () => {
    expect(src.includes('<StubScreen title="Voice" />')).toBe(false)
  })
})
