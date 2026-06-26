import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { AetherApiRequest } from '@/global'

import {
  $hubBusy,
  $hubInstalled,
  $hubResults,
  $hubStatus,
  installFromHub,
  searchHub,
  updateHub,
} from './skills-hub-store'
import type { SkillHubResult, SkillHubSearchResponse } from './skills-types'

const RESULT: SkillHubResult = {
  name: 'pdf-tools',
  description: 'Đọc/ghi PDF',
  source: 'aether-index',
  identifier: 'official/pdf-tools',
  trust_level: 'official',
  repo: null,
  tags: ['pdf'],
}
const SEARCH: SkillHubSearchResponse = {
  results: [RESULT],
  source_counts: { 'aether-index': 1 },
  timed_out: [],
  installed: {},
}

beforeEach(() => {
  $hubResults.set([])
  $hubInstalled.set({})
  $hubStatus.set('idle')
  $hubBusy.set(null)
})
afterEach(() => vi.restoreAllMocks())

describe('searchHub', () => {
  it('GETs /api/skills/hub/search with encoded q and stores results', async () => {
    const api = vi.fn(async (_req: AetherApiRequest) => SEARCH as never)
    await searchHub('pdf reader', { api })
    expect(api).toHaveBeenCalledTimes(1)
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/hub/search?q=pdf%20reader&source=all&limit=20',
    })
    expect($hubResults.get()).toEqual([RESULT])
    expect($hubInstalled.get()).toEqual({})
    expect($hubStatus.get()).toBe('ready')
  })

  it('sets empty when no results come back', async () => {
    const api = vi.fn(async () => ({ ...SEARCH, results: [] }) as never)
    await searchHub('zzz', { api })
    expect($hubStatus.get()).toBe('empty')
  })

  it('sets error when the search throws', async () => {
    const api = vi.fn(async () => {
      throw new Error('net')
    })
    await searchHub('x', { api })
    expect($hubStatus.get()).toBe('error')
  })

  it('does not call the backend for a blank query', async () => {
    const api = vi.fn()
    await searchHub('   ', { api })
    expect(api).not.toHaveBeenCalled()
    expect($hubStatus.get()).toBe('idle')
  })
})

describe('installFromHub', () => {
  it('POSTs /api/skills/hub/install with identifier then re-fetches skills', async () => {
    const api = vi.fn(async (_req: AetherApiRequest) => ({ name: 'install', ok: true, pid: 1 }) as never)
    const loadSkills = vi.fn(async () => {})
    await installFromHub('official/pdf-tools', { api, loadSkills })
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/hub/install',
      method: 'POST',
      body: { identifier: 'official/pdf-tools' },
    })
    expect(loadSkills).toHaveBeenCalledTimes(1)
    expect($hubBusy.get()).toBeNull()
  })
})

describe('updateHub', () => {
  it('POSTs /api/skills/hub/update then re-fetches skills', async () => {
    const api = vi.fn(async (_req: AetherApiRequest) => ({ name: 'update', ok: true, pid: 2 }) as never)
    const loadSkills = vi.fn(async () => {})
    await updateHub({ api, loadSkills })
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/hub/update',
      method: 'POST',
      body: {},
    })
    expect(loadSkills).toHaveBeenCalledTimes(1)
  })
})
