import { describe, expect, it, vi, beforeEach } from 'vitest'

import { $platforms, $platformsStatus, loadPlatforms } from './messaging-store'
import { updatePlatform } from './messaging-store'

beforeEach(() => {
  $platforms.set(null)
  $platformsStatus.set('idle')
})

describe('loadPlatforms', () => {
  it('loads platforms via injected api and sets status ready', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path === '/api/messaging/platforms') {
        return { platforms: [{ id: 'telegram', name: 'Telegram', enabled: true, configured: true, state: 'connected', description: '', docs_url: '', gateway_running: true, env_vars: [] }] }
      }

      throw new Error('unexpected ' + req.path)
    })

    await loadPlatforms({ api: api as never })

    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/messaging/platforms' }))
    expect($platforms.get()).toHaveLength(1)
    expect($platforms.get()?.[0].id).toBe('telegram')
    expect($platformsStatus.get()).toBe('ready')
  })

  it('sets status empty when no platforms returned', async () => {
    const api = vi.fn(async () => ({ platforms: [] }))

    await loadPlatforms({ api: api as never })

    expect($platformsStatus.get()).toBe('empty')
  })

  it('sets status error when api throws', async () => {
    const api = vi.fn(async () => { throw new Error('boom') })

    await loadPlatforms({ api: api as never })

    expect($platformsStatus.get()).toBe('error')
    expect($platforms.get()).toBeNull()
  })
})

describe('updatePlatform', () => {
  it('PUTs the update then re-fetches the list', async () => {
    const calls: { path: string; method?: string; body?: unknown }[] = []
    const api = vi.fn(async (req: { path: string; method?: string; body?: unknown }) => {
      calls.push(req)

      if (req.method === 'PUT') { return { ok: true, platform: 'telegram' } }

      return { platforms: [{ id: 'telegram', name: 'Telegram', enabled: true, configured: true, state: 'connected', description: '', docs_url: '', gateway_running: true, env_vars: [] }] }
    })

    await updatePlatform('telegram', { env: { TELEGRAM_BOT_TOKEN: 'abc' } }, { api: api as never })

    expect(calls[0]).toMatchObject({
      path: '/api/messaging/platforms/telegram',
      method: 'PUT',
      body: { env: { TELEGRAM_BOT_TOKEN: 'abc' } },
    })
    expect(calls[1]).toMatchObject({ path: '/api/messaging/platforms' })
    expect($platformsStatus.get()).toBe('ready')
  })
})
