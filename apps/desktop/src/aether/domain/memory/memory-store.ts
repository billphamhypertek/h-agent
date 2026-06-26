import { atom } from 'nanostores'

import {
  getMemoryProviderConfig,
  getMemoryProviderOAuthStatus,
  saveMemoryProviderConfig,
  startMemoryProviderOAuth
} from '@/aether-api'
import type { MemoryProviderConfig, MemoryProviderOAuthStatus } from '@/aether-api'

// `/api/memory` GET — read-only status/entries display. Not exported from
// aether-api.ts (web-only type), so mirror the REST shape here verbatim.
export interface MemoryProviderInfo {
  name: string
  description: string
  configured: boolean
}

export interface MemoryStatus {
  active: string
  providers: MemoryProviderInfo[]
  builtin_files: { memory: number; user: number }
}

type StoreStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

// Raw api fn signature (mirrors window.aetherDesktop.api + briefing read-briefing).
type ApiFn = <T>(request: {
  path: string
  method?: string
  body?: unknown
  timeoutMs?: number
  profile?: string
}) => Promise<T>

export interface MemoryStoreDeps {
  api?: ApiFn
  getConfig?: (provider: string) => Promise<MemoryProviderConfig>
  saveConfig?: (provider: string, values: Record<string, string>) => Promise<{ ok: boolean }>
  oauthStart?: (provider: string) => Promise<MemoryProviderOAuthStatus>
  oauthStatus?: (provider: string) => Promise<MemoryProviderOAuthStatus>
}

function resolveApi(deps: MemoryStoreDeps): ApiFn {
  return deps.api ?? (<T>(request: Parameters<ApiFn>[0]) => window.aetherDesktop.api<T>(request))
}

// data atoms
export const $memoryProvider = atom<string | null>(null)
export const $memoryConfig = atom<MemoryProviderConfig | null>(null)
export const $memoryEntries = atom<MemoryStatus | null>(null)
export const $memoryOAuth = atom<MemoryProviderOAuthStatus | null>(null)

// status atoms
export const $memoryStatus = atom<StoreStatus>('idle')
export const $memoryConfigStatus = atom<StoreStatus>('idle')
export const $memoryEntriesStatus = atom<StoreStatus>('idle')

// Read-only status/entries. REST GET only — no conversation poll, no deltas.
export async function loadMemoryStatus(deps: MemoryStoreDeps = {}): Promise<void> {
  const api = resolveApi(deps)
  $memoryEntriesStatus.set('loading')

  try {
    const status = await api<MemoryStatus>({ path: '/api/memory' })
    $memoryEntries.set(status)
    $memoryProvider.set(status.active || null)

    const isEmpty =
      status.providers.length === 0 &&
      status.builtin_files.memory === 0 &&
      status.builtin_files.user === 0

    $memoryEntriesStatus.set(isEmpty ? 'empty' : 'ready')
  } catch {
    $memoryEntriesStatus.set('error')
  }
}

export async function loadMemoryConfig(provider: string, deps: MemoryStoreDeps = {}): Promise<void> {
  const getConfig = deps.getConfig ?? getMemoryProviderConfig
  $memoryConfigStatus.set('loading')

  try {
    const config = await getConfig(provider)
    $memoryConfig.set(config)
    $memoryConfigStatus.set('ready')
  } catch {
    $memoryConfigStatus.set('error')
  }
}

// Re-exported so later tasks (save/switch/reset/oauth) wire to the same module.
export { getMemoryProviderOAuthStatus, saveMemoryProviderConfig, startMemoryProviderOAuth }
