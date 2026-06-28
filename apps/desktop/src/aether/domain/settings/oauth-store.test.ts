import { describe, expect, it, vi } from 'vitest'

import {
  $oauthFlow,
  $oauthProviders,
  $oauthStatus,
  cancelFlow,
  disconnect,
  loadOAuthProviders,
  pollOnce,
  startFlow,
  submitCode
} from './oauth-store'

describe('oauth-store', () => {
  it('loadOAuthProviders fills the atom and sets ready', async () => {
    $oauthStatus.set('idle')

    const list = vi.fn(async () => ({
      providers: [{ id: 'anthropic', name: 'Anthropic', flow: 'device_code', cli_command: '', docs_url: '', status: { logged_in: false } }]
    }))

    await loadOAuthProviders({ list: list as never })
    expect($oauthStatus.get()).toBe('ready')
    expect($oauthProviders.get()?.providers[0].id).toBe('anthropic')
  })

  it('startFlow stores session + start payload and enters awaiting', async () => {
    const start = vi.fn(async () => ({ flow: 'device_code', session_id: 's1', user_code: 'WXYZ', verification_url: 'https://v', expires_in: 600, poll_interval: 5 }))
    await startFlow('anthropic', { start: start as never })
    expect(start).toHaveBeenCalledWith('anthropic')
    expect($oauthFlow.get().phase).toBe('awaiting')
    expect($oauthFlow.get().sessionId).toBe('s1')
  })

  it('submitCode posts code and marks done on approved', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const submit = vi.fn(async () => ({ ok: true, status: 'approved' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await submitCode('CODE', { submit: submit as never, list: list as never })
    expect(submit).toHaveBeenCalledWith('anthropic', 's1', 'CODE')
    expect($oauthFlow.get().phase).toBe('done')
  })

  it('pollOnce marks done when poll returns approved', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const poll = vi.fn(async () => ({ session_id: 's1', status: 'approved' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await pollOnce({ poll: poll as never, list: list as never })
    expect(poll).toHaveBeenCalledWith('anthropic', 's1')
    expect($oauthFlow.get().phase).toBe('done')
  })

  it('cancelFlow cancels the session and returns to idle', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const cancel = vi.fn(async () => ({ ok: true }))
    await cancelFlow({ cancel: cancel as never })
    expect(cancel).toHaveBeenCalledWith('s1')
    expect($oauthFlow.get().phase).toBe('idle')
  })

  it('disconnect calls disconnectOAuthProvider then reloads', async () => {
    const disc = vi.fn(async () => ({ ok: true, provider: 'anthropic' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await disconnect('anthropic', { disc: disc as never, list: list as never })
    expect(disc).toHaveBeenCalledWith('anthropic')
    expect(list).toHaveBeenCalled()
  })
})
