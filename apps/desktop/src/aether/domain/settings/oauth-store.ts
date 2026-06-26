import { atom } from 'nanostores'

import {
  cancelOAuthSession,
  disconnectOAuthProvider,
  listOAuthProviders,
  pollOAuthSession,
  startOAuthLogin,
  submitOAuthCode
} from '@/aether-api'
import type {
  OAuthPollResponse,
  OAuthProvidersResponse,
  OAuthStartResponse,
  OAuthSubmitResponse
} from '@/types/aether'

export interface OAuthFlowState {
  message?: string
  phase: 'awaiting' | 'done' | 'error' | 'idle' | 'starting' | 'submitting'
  providerId?: string
  sessionId?: string
  start?: OAuthStartResponse
}

export const $oauthProviders = atom<OAuthProvidersResponse | null>(null)
export const $oauthStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')
export const $oauthFlow = atom<OAuthFlowState>({ phase: 'idle' })

interface OAuthDeps {
  list?: () => Promise<OAuthProvidersResponse>
  start?: (id: string) => Promise<OAuthStartResponse>
  submit?: (id: string, sessionId: string, code: string) => Promise<OAuthSubmitResponse>
  poll?: (id: string, sessionId: string) => Promise<OAuthPollResponse>
  cancel?: (sessionId: string) => Promise<{ ok: boolean }>
  disc?: (id: string) => Promise<{ ok: boolean; provider: string }>
}

export async function loadOAuthProviders(deps: OAuthDeps = {}): Promise<void> {
  const list = deps.list ?? listOAuthProviders
  $oauthStatus.set('loading')

  try {
    $oauthProviders.set(await list())
    $oauthStatus.set('ready')
  } catch {
    $oauthStatus.set('error')
  }
}

export async function startFlow(providerId: string, deps: OAuthDeps = {}): Promise<void> {
  const start = deps.start ?? startOAuthLogin
  $oauthFlow.set({ phase: 'starting', providerId })

  try {
    const res = await start(providerId)
    $oauthFlow.set({ phase: 'awaiting', providerId, sessionId: res.session_id, start: res })
  } catch (err) {
    $oauthFlow.set({ phase: 'error', providerId, message: err instanceof Error ? err.message : String(err) })
  }
}

export async function submitCode(code: string, deps: OAuthDeps = {}): Promise<void> {
  const submit = deps.submit ?? submitOAuthCode
  const flow = $oauthFlow.get()

  if (!flow.providerId || !flow.sessionId) {
    return
  }

  $oauthFlow.set({ ...flow, phase: 'submitting' })

  try {
    const res = await submit(flow.providerId, flow.sessionId, code)

    if (res.status === 'approved' && res.ok) {
      $oauthFlow.set({ ...flow, phase: 'done' })
      await loadOAuthProviders(deps)
    } else {
      $oauthFlow.set({ ...flow, phase: 'error', message: res.message ?? 'Xác thực thất bại' })
    }
  } catch (err) {
    $oauthFlow.set({ ...flow, phase: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export async function pollOnce(deps: OAuthDeps = {}): Promise<void> {
  const poll = deps.poll ?? pollOAuthSession
  const flow = $oauthFlow.get()

  if (flow.phase !== 'awaiting' || !flow.providerId || !flow.sessionId) {
    return
  }

  try {
    const res = await poll(flow.providerId, flow.sessionId)

    if (res.status === 'approved') {
      $oauthFlow.set({ ...flow, phase: 'done' })
      await loadOAuthProviders(deps)
    } else if (res.status === 'denied' || res.status === 'error' || res.status === 'expired') {
      $oauthFlow.set({ ...flow, phase: 'error', message: res.error_message ?? res.status })
    }
  } catch (err) {
    $oauthFlow.set({ ...flow, phase: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export async function cancelFlow(deps: OAuthDeps = {}): Promise<void> {
  const cancel = deps.cancel ?? cancelOAuthSession
  const flow = $oauthFlow.get()

  if (flow.sessionId) {
    try {
      await cancel(flow.sessionId)
    } catch {
      // best-effort; reset anyway
    }
  }

  $oauthFlow.set({ phase: 'idle' })
}

export async function disconnect(providerId: string, deps: OAuthDeps = {}): Promise<void> {
  const disc = deps.disc ?? disconnectOAuthProvider
  await disc(providerId)
  await loadOAuthProviders(deps)
}
