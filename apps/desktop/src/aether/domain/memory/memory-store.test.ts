import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryProviderConfig, MemoryProviderOAuthStatus } from '@/aether-api'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryOAuth,
  $memoryProvider,
  $memoryStatus,
  loadMemoryConfig,
  loadMemoryStatus,
  type MemoryStatus
} from './memory-store'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [
    { name: 'mem0', description: 'Mem0 hosted memory', configured: true },
    { name: 'zep', description: 'Zep memory', configured: false }
  ],
  builtin_files: { memory: 3, user: 1 }
}

const CONFIG: MemoryProviderConfig = {
  name: 'mem0',
  label: 'Mem0',
  fields: [
    {
      key: 'MEM0_API_KEY',
      label: 'API Key',
      description: 'Mem0 key',
      kind: 'secret',
      is_set: false,
      placeholder: 'mem0-...',
      options: [],
      value: ''
    }
  ]
}

beforeEach(() => {
  $memoryProvider.set(null)
  $memoryConfig.set(null)
  $memoryStatus.set('idle')
  $memoryConfigStatus.set('idle')
  $memoryEntries.set(null)
  $memoryEntriesStatus.set('idle')
})

describe('loadMemoryStatus', () => {
  it('fetches /api/memory and fills entries + active provider', async () => {
    const api = vi.fn().mockResolvedValue(STATUS)
    await loadMemoryStatus({ api })
    expect(api).toHaveBeenCalledWith({ path: '/api/memory' })
    expect($memoryEntries.get()).toEqual(STATUS)
    expect($memoryProvider.get()).toBe('mem0')
    expect($memoryEntriesStatus.get()).toBe('ready')
  })

  it('sets empty when no providers and no builtin files', async () => {
    const api = vi.fn().mockResolvedValue({ active: '', providers: [], builtin_files: { memory: 0, user: 0 } })
    await loadMemoryStatus({ api })
    expect($memoryEntriesStatus.get()).toBe('empty')
  })

  it('sets error on failure', async () => {
    const api = vi.fn().mockRejectedValue(new Error('boom'))
    await loadMemoryStatus({ api })
    expect($memoryEntriesStatus.get()).toBe('error')
  })
})

describe('loadMemoryConfig', () => {
  it('fetches provider config and stores it', async () => {
    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    await loadMemoryConfig('mem0', { getConfig })
    expect(getConfig).toHaveBeenCalledWith('mem0')
    expect($memoryConfig.get()).toEqual(CONFIG)
    expect($memoryConfigStatus.get()).toBe('ready')
  })

  it('sets error on failure', async () => {
    const getConfig = vi.fn().mockRejectedValue(new Error('nope'))
    await loadMemoryConfig('mem0', { getConfig })
    expect($memoryConfigStatus.get()).toBe('error')
  })
})

describe('mutations', () => {
  it('saveMemoryConfig PUTs values then re-fetches config', async () => {
    const saveConfig = vi.fn().mockResolvedValue({ ok: true })
    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    const { saveMemoryConfig } = await import('./memory-store')
    await saveMemoryConfig('mem0', { MEM0_API_KEY: 'mem0-abc' }, { saveConfig, getConfig })
    expect(saveConfig).toHaveBeenCalledWith('mem0', { MEM0_API_KEY: 'mem0-abc' })
    expect(getConfig).toHaveBeenCalledWith('mem0')
  })

  it('switchMemoryProvider PUTs /api/memory/provider then re-fetches status + config', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ ok: true, active: 'zep' }) // PUT provider
      .mockResolvedValueOnce(STATUS) // GET /api/memory

    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    const { switchMemoryProvider } = await import('./memory-store')
    await switchMemoryProvider('zep', { api, getConfig })
    expect(api).toHaveBeenNthCalledWith(1, {
      path: '/api/memory/provider',
      method: 'PUT',
      body: { provider: 'zep' }
    })
    expect(api).toHaveBeenNthCalledWith(2, { path: '/api/memory' })
    expect(getConfig).toHaveBeenCalledWith('zep')
  })

  it('resetMemory POSTs /api/memory/reset then re-fetches status', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ ok: true, deleted: ['memory'] }) // POST reset
      .mockResolvedValueOnce(STATUS) // GET /api/memory

    const { resetMemory } = await import('./memory-store')
    await resetMemory('memory', { api })
    expect(api).toHaveBeenNthCalledWith(1, {
      path: '/api/memory/reset',
      method: 'POST',
      body: { target: 'memory' }
    })
    expect(api).toHaveBeenNthCalledWith(2, { path: '/api/memory' })
  })
})

const OAUTH_PENDING: MemoryProviderOAuthStatus = { auth: 'oauth', connected: false, detail: 'Đang chờ', state: 'pending' }
const OAUTH_DONE: MemoryProviderOAuthStatus = { auth: 'oauth', connected: true, detail: 'Đã kết nối', state: 'connected' }

describe('memory oauth', () => {
  beforeEach(() => $memoryOAuth.set(null))

  it('loadMemoryOAuthStatus stores the provider oauth status', async () => {
    const oauthStatus = vi.fn().mockResolvedValue(OAUTH_DONE)
    const { loadMemoryOAuthStatus } = await import('./memory-store')
    await loadMemoryOAuthStatus('mem0', { oauthStatus })
    expect(oauthStatus).toHaveBeenCalledWith('mem0')
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })

  it('startMemoryOAuth advances pending → connected via a status re-fetch', async () => {
    const oauthStart = vi.fn().mockResolvedValue(OAUTH_PENDING)
    const oauthStatus = vi.fn().mockResolvedValue(OAUTH_DONE)
    const { startMemoryOAuth } = await import('./memory-store')
    await startMemoryOAuth('mem0', { oauthStart, oauthStatus })
    expect(oauthStart).toHaveBeenCalledWith('mem0')
    expect(oauthStatus).toHaveBeenCalledWith('mem0')
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })

  it('startMemoryOAuth that returns connected does not re-poll', async () => {
    const oauthStart = vi.fn().mockResolvedValue(OAUTH_DONE)
    const oauthStatus = vi.fn()
    const { startMemoryOAuth } = await import('./memory-store')
    await startMemoryOAuth('mem0', { oauthStart, oauthStatus })
    expect(oauthStatus).not.toHaveBeenCalled()
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })
})
