import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHook = vi.fn((_opts: unknown) => ({ end: vi.fn(), level: 0, muted: false, start: vi.fn(), status: 'idle', stopTurn: vi.fn(), toggleMute: vi.fn() }))
vi.mock('@/app/chat/composer/hooks/use-voice-conversation', () => ({ useVoiceConversation: (opts: unknown) => mockHook(opts) }))

import { useVoiceSession } from './use-voice-session'
import { $voiceActive, $voiceListening, $voiceSession } from './voice-presence'

function Harness({ submitText }: { submitText: (t: string) => Promise<boolean> }) {
  useVoiceSession({ submitText, transcribeVoiceAudio: vi.fn() })

  return null
}

afterEach(() => {
  vi.clearAllMocks()
  $voiceActive.set(false)
  $voiceListening.set(false)
})

describe('useVoiceSession', () => {
  beforeEach(() => $voiceActive.set(false))

  it('passes enabled=false when the loop is inactive and never submits on mount', () => {
    const submitText = vi.fn(async () => true)
    render(<Harness submitText={submitText} />)
    expect(mockHook).toHaveBeenCalled()
    const opts = mockHook.mock.calls.at(-1)?.[0] as { enabled: boolean }
    expect(opts.enabled).toBe(false)
    expect(submitText).not.toHaveBeenCalled()
  })

  it('forwards the active flag as enabled', () => {
    $voiceActive.set(true)
    render(<Harness submitText={vi.fn(async () => true)} />)
    const opts = mockHook.mock.calls.at(-1)?.[0] as { enabled: boolean }
    expect(opts.enabled).toBe(true)
  })

  it('onSubmit routes the transcript to submitText', async () => {
    const submitText = vi.fn(async () => true)
    render(<Harness submitText={submitText} />)
    const opts = mockHook.mock.calls.at(-1)?.[0] as { onSubmit: (t: string) => Promise<void> }
    await opts.onSubmit('xin chào')
    expect(submitText).toHaveBeenCalledWith('xin chào')
  })

  it('publishes the conversation status into $voiceListening / $voiceSession', () => {
    mockHook.mockReturnValueOnce({ end: vi.fn(), level: 0.5, muted: false, start: vi.fn(), status: 'listening', stopTurn: vi.fn(), toggleMute: vi.fn() })
    render(<Harness submitText={vi.fn(async () => true)} />)
    expect($voiceListening.get()).toBe(true)
    expect($voiceSession.get().status).toBe('listening')
    expect($voiceSession.get().level).toBe(0.5)
  })
})
