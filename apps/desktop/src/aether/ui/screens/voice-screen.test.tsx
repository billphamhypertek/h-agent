// src/aether/ui/screens/voice-screen.test.tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type * as ReactRouterDom from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $voiceActive, $voiceListening, $voiceSession } from '@/aether/domain/voice/voice-presence'
import type { ChatMessage } from '@/lib/chat-messages'
import { $messages } from '@/store/session'

import { VoiceScreen } from './voice-screen'

// VoiceScreen calls useNavigate(); a bare render with no Router context would
// throw. Mock only useNavigate, preserve the rest of react-router-dom.
const navigateMock = vi.fn()
vi.mock('react-router-dom', async orig => ({ ...(await orig<typeof ReactRouterDom>()), useNavigate: () => navigateMock }))

const msg = (id: string, role: ChatMessage['role'], text: string): ChatMessage => ({ id, role, parts: [{ type: 'text', text }] })

afterEach(() => {
  cleanup()
  navigateMock.mockReset()
  $messages.set([])
  $voiceActive.set(false)
  $voiceListening.set(false)
  $voiceSession.set({ status: 'idle', level: 0, muted: false })
})

describe('VoiceScreen', () => {
  beforeEach(() => $voiceActive.set(false))

  it('renders the transcript of the active session', () => {
    $messages.set([msg('u1', 'user', 'thời tiết hôm nay'), msg('a1', 'assistant', 'Trời nắng đẹp')])
    render(<VoiceScreen />)
    expect(screen.getByText('thời tiết hôm nay')).toBeTruthy()
    expect(screen.getByText('Trời nắng đẹp')).toBeTruthy()
  })

  it('toggles $voiceActive when the Nghe/Dừng control is pressed', () => {
    render(<VoiceScreen />)
    fireEvent.click(screen.getByTestId('ae-voice-toggle'))
    expect($voiceActive.get()).toBe(true)
  })

  it('renders the Living Orb (role=status)', () => {
    render(<VoiceScreen />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('orb reflects the live listening state', () => {
    // $orbState is a `computed`; drive it through its real source. motion-store
    // priority (speaking > listening > thinking > idle > paused) gives `listening`
    // precedence over gateway state, so setting $voiceListening alone is
    // deterministic regardless of $gatewayState in jsdom.
    $voiceListening.set(true)
    const { container } = render(<VoiceScreen />)
    expect(container.querySelector('.ae-orb--listening')).toBeTruthy()
  })

  it('renders an honest empty hint when there is no conversation yet', () => {
    render(<VoiceScreen />)
    expect(screen.getByTestId('ae-voice-empty')).toBeTruthy()
  })

  it('navigates in-app to Settings → Voice (HashRouter-safe, not a raw href)', () => {
    render(<VoiceScreen />)
    fireEvent.click(screen.getByText('Settings → Voice'))
    expect(navigateMock).toHaveBeenCalledWith('/settings?tab=config:voice')
  })

  it('is presentation-only: source never imports the voice loop or send-path', () => {
    const src = readFileSync(join(__dirname, 'voice-screen.tsx'), 'utf8')

    for (const forbidden of ['use-voice-conversation', 'usePromptActions', 'submitText', 'appendAssistantDelta']) {
      expect(src.includes(forbidden), `voice-screen must not import ${forbidden}`).toBe(false)
    }
  })
})
