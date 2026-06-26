import { atom } from 'nanostores'

import type { MessagingDeps } from './messaging-store'

export interface TelegramOnboardingStart {
  deep_link: string
  expires_at: string
  pairing_id: string
  qr_payload: string
  suggested_username: string
}

export type TelegramOnboardingStatus =
  | { expires_at: string; status: 'waiting' }
  | { bot_username: string; expires_at: string; owner_user_id?: string; status: 'ready' }

export interface TelegramOnboardingApply {
  bot_username?: string
  needs_restart: boolean
  ok: boolean
  platform: 'telegram'
  restart_started?: boolean
}

export type TelegramFsm = 'idle' | 'starting' | 'pending' | 'done' | 'error'

export interface TelegramOnboardingState {
  botUsername: null | string
  error: null | string
  fsm: TelegramFsm
  ownerId: null | string
  setup: TelegramOnboardingStart | null
}

const INITIAL: TelegramOnboardingState = {
  botUsername: null,
  error: null,
  fsm: 'idle',
  ownerId: null,
  setup: null,
}

export const $telegramOnboarding = atom<TelegramOnboardingState>({ ...INITIAL })

// Single guarded poll timer. REST-only chained setTimeout — never a chat/
// conversation socket, so no message/reasoning/thinking deltas are touched.
let pollTimer: null | ReturnType<typeof setTimeout> = null

function resolveApi(deps?: MessagingDeps) {
  return deps?.api ?? (<T>(request: { body?: unknown; method?: string; path: string }) => window.aetherDesktop.api<T>(request))
}

export function stopTelegramPoll(): void {
  if (pollTimer) {
    clearTimeout(pollTimer)
    pollTimer = null
  }
}

export function resetTelegramOnboarding(): void {
  stopTelegramPoll()
  $telegramOnboarding.set({ ...INITIAL })
}

function isTerminal(error: unknown, setup: TelegramOnboardingStart | null): boolean {
  const status = (error as { status?: number } | null)?.status

  if (status === 410 || status === 404) { return true }

  const expiry = setup ? Date.parse(setup.expires_at) : NaN

  return Number.isFinite(expiry) && Date.now() >= expiry
}

function schedulePoll(delay: number, deps?: MessagingDeps): void {
  stopTelegramPoll()
  pollTimer = setTimeout(() => void poll(deps), delay)
}

async function poll(deps?: MessagingDeps): Promise<void> {
  const state = $telegramOnboarding.get()

  if (state.fsm !== 'pending' || !state.setup) { return }

  const api = resolveApi(deps)

  try {
    const status = await api<TelegramOnboardingStatus>({
      path: `/api/messaging/telegram/onboarding/${encodeURIComponent(state.setup.pairing_id)}`,
    })

    if (status.status === 'ready') {
      stopTelegramPoll()
      $telegramOnboarding.set({
        ...$telegramOnboarding.get(),
        botUsername: status.bot_username ?? null,
        error: null,
        fsm: 'done',
        ownerId: status.owner_user_id ?? null,
      })

      return
    }

    $telegramOnboarding.set({ ...$telegramOnboarding.get(), error: null })
    schedulePoll(2000, deps)
  } catch (error) {
    if (isTerminal(error, state.setup)) {
      stopTelegramPoll()
      $telegramOnboarding.set({
        ...$telegramOnboarding.get(),
        error: 'Phiên ghép nối Telegram đã hết hạn. Hãy bắt đầu lại.',
        fsm: 'error',
      })

      return
    }

    schedulePoll(2000, deps)
  }
}

export async function startTelegramOnboarding(deps?: MessagingDeps): Promise<void> {
  stopTelegramPoll()
  $telegramOnboarding.set({ ...INITIAL, fsm: 'starting' })

  const api = resolveApi(deps)

  try {
    const setup = await api<TelegramOnboardingStart>({
      path: '/api/messaging/telegram/onboarding/start',
      method: 'POST',
      body: { bot_name: 'AETHER' },
    })

    $telegramOnboarding.set({ ...INITIAL, fsm: 'pending', setup })
    schedulePoll(1200, deps)
  } catch {
    $telegramOnboarding.set({ ...INITIAL, error: 'Không bắt đầu được thiết lập Telegram.', fsm: 'error' })
  }
}

export async function cancelTelegramOnboarding(deps?: MessagingDeps): Promise<void> {
  const { setup } = $telegramOnboarding.get()
  stopTelegramPoll()

  if (setup) {
    try {
      await resolveApi(deps)<{ ok: boolean }>({
        path: `/api/messaging/telegram/onboarding/${encodeURIComponent(setup.pairing_id)}`,
        method: 'DELETE',
      })
    } catch {
      // local cleanup still wins
    }
  }

  resetTelegramOnboarding()
}

export async function applyTelegramOnboarding(
  allowedUserIds: string[],
  deps?: MessagingDeps
): Promise<TelegramOnboardingApply> {
  const { setup } = $telegramOnboarding.get()

  if (!setup) { throw new Error('No active Telegram pairing') }

  stopTelegramPoll()

  const result = await resolveApi(deps)<TelegramOnboardingApply>({
    path: `/api/messaging/telegram/onboarding/${encodeURIComponent(setup.pairing_id)}/apply`,
    method: 'POST',
    body: { allowed_user_ids: allowedUserIds },
  })

  resetTelegramOnboarding()

  return result
}
