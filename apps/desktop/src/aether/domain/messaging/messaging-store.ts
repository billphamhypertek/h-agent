import { atom } from 'nanostores'

import type { MessagingPlatformInfo, MessagingPlatformsResponse } from '@/types/aether'

export type MessagingApi = <T>(request: {
  body?: unknown
  method?: string
  path: string
  profile?: string
  timeoutMs?: number
}) => Promise<T>

export interface MessagingDeps {
  api?: MessagingApi
}

export const $platforms = atom<MessagingPlatformInfo[] | null>(null)
export const $platformsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

// Default api binds to the desktop bridge lazily (per-call), mirroring
// read-briefing.ts so the module never touches window at import time and stays
// injectable in jsdom tests.
function resolveApi(deps?: MessagingDeps): MessagingApi {
  return deps?.api ?? (<T>(request: Parameters<MessagingApi>[0]) => window.aetherDesktop.api<T>(request))
}

export async function loadPlatforms(deps?: MessagingDeps): Promise<void> {
  const api = resolveApi(deps)
  $platformsStatus.set('loading')

  try {
    const result = await api<MessagingPlatformsResponse>({ path: '/api/messaging/platforms' })
    const platforms = result.platforms ?? []
    $platforms.set(platforms)
    $platformsStatus.set(platforms.length === 0 ? 'empty' : 'ready')
  } catch {
    $platforms.set(null)
    $platformsStatus.set('error')
  }
}
