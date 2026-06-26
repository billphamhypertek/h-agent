import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProfileInfo, ProfileSoul } from '@/types/aether'

import {
  $activeProfile,
  $profiles,
  $profilesStatus,
  $profileSoul,
  $profileSoulStatus,
  createProfileAction,
  deleteProfileAction,
  loadProfiles,
  loadProfileSoul,
  renameProfileAction,
  saveProfileSoul
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

describe('profile mutations call REST then re-fetch', () => {
  it('createProfileAction POSTs /api/profiles then reloads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles' && req.method === 'POST') { return { ok: true, name: 'qa', path: '/h/qa' } }
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      if (req.path === '/api/profiles/active') { return { active: 'default', current: 'default' } }
      throw new Error(`unexpected ${req.method ?? 'GET'} ${req.path}`)
    })

    await createProfileAction('qa')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles',
      method: 'POST',
      body: { name: 'qa' }
    }))
    expect($profilesStatus.get()).toBe('ready') // re-fetch ran
  })

  it('renameProfileAction PATCHes with new_name then reloads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles/coder' && req.method === 'PATCH') { return { ok: true, name: 'coder2', path: '/h/coder2' } }
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      return { active: 'default', current: 'default' }
    })

    await renameProfileAction('coder', 'coder2')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles/coder',
      method: 'PATCH',
      body: { new_name: 'coder2' }
    }))
  })

  it('deleteProfileAction DELETEs then reloads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles/coder' && req.method === 'DELETE') { return { ok: true, path: '/h/coder' } }
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      return { active: 'default', current: 'default' }
    })

    await deleteProfileAction('coder')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles/coder',
      method: 'DELETE'
    }))
  })
})

describe('soul editor sub-store', () => {
  beforeEach(() => {
    $profileSoul.set(null)
    $profileSoulStatus.set('idle')
  })

  it('loadProfileSoul GETs /soul and stores content', async () => {
    const soul: ProfileSoul = { content: 'Bạn là trợ lý.', exists: true }
    const api = mockApi(req => {
      if (req.path === '/api/profiles/coder/soul') { return soul }
      throw new Error(`unexpected ${req.path}`)
    })

    await loadProfileSoul('coder')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/profiles/coder/soul' }))
    expect($profileSoul.get()).toEqual(soul)
    expect($profileSoulStatus.get()).toBe('ready')
  })

  it('saveProfileSoul PUTs content then re-loads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles/coder/soul' && req.method === 'PUT') { return { ok: true } }
      if (req.path === '/api/profiles/coder/soul') { return { content: 'updated', exists: true } }
      throw new Error(`unexpected ${req.method ?? 'GET'} ${req.path}`)
    })

    await saveProfileSoul('coder', 'updated')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles/coder/soul',
      method: 'PUT',
      body: { content: 'updated' }
    }))
    expect($profileSoul.get()?.content).toBe('updated')
  })

  it('loadProfileSoul sets error on failure', async () => {
    mockApi(() => { throw new Error('nope') })
    await loadProfileSoul('coder')
    expect($profileSoulStatus.get()).toBe('error')
  })
})
