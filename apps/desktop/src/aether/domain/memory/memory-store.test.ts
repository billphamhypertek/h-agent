import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryProviderConfig } from '@/aether-api'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
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
