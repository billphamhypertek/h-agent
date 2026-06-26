// apps/desktop/src/aether/domain/skills/skills-hub-store.ts
import { atom } from 'nanostores'

import { loadSkills as defaultLoadSkills } from './skills-store'
import type {
  SkillHubActionResponse,
  SkillHubInstalledEntry,
  SkillHubResult,
  SkillHubSearchResponse,
} from './skills-types'

export type HubStatus = 'idle' | 'searching' | 'ready' | 'empty' | 'error'

type ApiFn = typeof window.aetherDesktop.api

export const $hubResults = atom<SkillHubResult[]>([])
export const $hubInstalled = atom<Record<string, SkillHubInstalledEntry>>({})
export const $hubStatus = atom<HubStatus>('idle')
// identifier currently installing, or '__update__' while updating all. Drives
// per-row spinners + disabled buttons.
export const $hubBusy = atom<string | null>(null)

function resolveApi(deps: { api?: ApiFn }): ApiFn {
  return deps.api ?? window.aetherDesktop.api
}

export async function searchHub(q: string, deps: { api?: ApiFn } = {}): Promise<void> {
  const query = q.trim()

  if (!query) {
    return
  }

  const api = resolveApi(deps)
  $hubStatus.set('searching')

  try {
    const res = await api<SkillHubSearchResponse>({
      path: `/api/skills/hub/search?q=${encodeURIComponent(query)}&source=all&limit=20`,
    })
    $hubResults.set(res.results)
    $hubInstalled.set(res.installed ?? {})
    $hubStatus.set(res.results.length > 0 ? 'ready' : 'empty')
  } catch {
    $hubStatus.set('error')
  }
}

// REST install, then re-fetch the installed list so a freshly-installed skill
// shows up as a card. No socket subscription — prompt-cache safe.
export async function installFromHub(
  identifier: string,
  deps: { api?: ApiFn; loadSkills?: typeof defaultLoadSkills } = {}
): Promise<SkillHubActionResponse> {
  const api = resolveApi(deps)
  const loadSkills = deps.loadSkills ?? defaultLoadSkills
  $hubBusy.set(identifier)

  try {
    const res = await api<SkillHubActionResponse>({
      path: '/api/skills/hub/install',
      method: 'POST',
      body: { identifier },
    })
    await loadSkills()

    return res
  } finally {
    $hubBusy.set(null)
  }
}

export async function updateHub(
  deps: { api?: ApiFn; loadSkills?: typeof defaultLoadSkills } = {}
): Promise<SkillHubActionResponse> {
  const api = resolveApi(deps)
  const loadSkills = deps.loadSkills ?? defaultLoadSkills
  $hubBusy.set('__update__')

  try {
    const res = await api<SkillHubActionResponse>({
      path: '/api/skills/hub/update',
      method: 'POST',
      body: {},
    })
    await loadSkills()

    return res
  } finally {
    $hubBusy.set(null)
  }
}
