import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProfileInfo } from '@/types/aether'

import {
  $activeProfile,
  $profiles,
  $profilesStatus,
  loadProfiles
} from './profiles-store'

const ROWS: ProfileInfo[] = [
  { name: 'default', path: '/h/default', is_default: true, has_env: true, model: 'sonnet', provider: 'anthropic', skill_count: 3 },
  { name: 'coder', path: '/h/coder', is_default: false, has_env: false, model: null, provider: null, skill_count: 0 }
]

function mockApi(impl: (req: { path: string; method?: string; body?: unknown }) => unknown) {
  const api = vi.fn(async (req: { path: string; method?: string; body?: unknown }) => impl(req) as never)
  ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }
  return api
}

beforeEach(() => {
  $profiles.set(null)
  $profilesStatus.set('idle')
  $activeProfile.set(null)
})
afterEach(() => {
  vi.restoreAllMocks()
  delete (window as { aetherDesktop?: unknown }).aetherDesktop
})

describe('loadProfiles', () => {
  it('populates $profiles + $activeProfile and sets status ready', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      if (req.path === '/api/profiles/active') { return { active: 'coder', current: 'coder' } }
      throw new Error(`unexpected path ${req.path}`)
    })

    await loadProfiles()

    expect($profilesStatus.get()).toBe('ready')
    expect($profiles.get()).toEqual(ROWS)
    expect($activeProfile.get()).toBe('coder')
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/profiles' }))
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/profiles/active' }))
  })

  it('sets status empty when no profiles returned', async () => {
    mockApi(req => (req.path === '/api/profiles' ? { profiles: [] } : { active: 'default', current: 'default' }))
    await loadProfiles()
    expect($profilesStatus.get()).toBe('empty')
  })

  it('sets status error when getProfiles throws', async () => {
    mockApi(() => { throw new Error('boom') })
    await loadProfiles()
    expect($profilesStatus.get()).toBe('error')
  })
})
