import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  $telegramOnboarding,
  resetTelegramOnboarding,
  startTelegramOnboarding,
  stopTelegramPoll,
} from './telegram-onboarding-store'

beforeEach(() => {
  vi.useFakeTimers()
  resetTelegramOnboarding()
})
afterEach(() => {
  stopTelegramPoll()
  vi.useRealTimers()
})

describe('telegram onboarding FSM', () => {
  it('transitions idle → starting → pending → done across start + poll', async () => {
    const api = vi.fn(async (req: { path: string; method?: string }) => {
      if (req.path === '/api/messaging/telegram/onboarding/start') {
        return { pairing_id: 'p1', suggested_username: 'AetherBot', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '2099-01-01T00:00:00Z' }
      }

      if (req.path === '/api/messaging/telegram/onboarding/p1') {
        return { status: 'ready', bot_username: 'AetherBot', owner_user_id: '12345', expires_at: '2099-01-01T00:00:00Z' }
      }

      throw new Error('unexpected ' + req.path)
    })

    const promise = startTelegramOnboarding({ api: api as never })
    expect($telegramOnboarding.get().fsm).toBe('starting')
    await promise
    expect($telegramOnboarding.get().fsm).toBe('pending')
    expect($telegramOnboarding.get().setup?.pairing_id).toBe('p1')

    // first poll fires after the initial delay
    await vi.advanceTimersByTimeAsync(1300)
    expect($telegramOnboarding.get().fsm).toBe('done')
    expect($telegramOnboarding.get().botUsername).toBe('AetherBot')
    expect($telegramOnboarding.get().ownerId).toBe('12345')
  })

  it('clears the poll timer on stopTelegramPoll (no further GET after done)', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path === '/api/messaging/telegram/onboarding/start') {
        return { pairing_id: 'p1', suggested_username: '', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '2099-01-01T00:00:00Z' }
      }

      return { status: 'waiting', expires_at: '2099-01-01T00:00:00Z' }
    })

    await startTelegramOnboarding({ api: api as never })
    await vi.advanceTimersByTimeAsync(1300) // one poll → still waiting/pending
    const callsAfterFirstPoll = api.mock.calls.length
    stopTelegramPoll()
    await vi.advanceTimersByTimeAsync(10000) // no further polls
    expect(api.mock.calls.length).toBe(callsAfterFirstPoll)
  })

  it('goes to error when a poll throws a terminal (410) error', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path === '/api/messaging/telegram/onboarding/start') {
        return { pairing_id: 'p1', suggested_username: '', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '1970-01-01T00:00:00Z' }
      }

      throw Object.assign(new Error('gone'), { status: 410 })
    })

    await startTelegramOnboarding({ api: api as never })
    await vi.advanceTimersByTimeAsync(1300)
    expect($telegramOnboarding.get().fsm).toBe('error')
  })
})
