import { atom } from 'nanostores'

import { createProfile, deleteProfile, getProfiles, renameProfile } from '@/aether-api'
import type { ProfileCreatePayload, ProfileInfo } from '@/types/aether'

// NOTE: None of the Profiles endpoints are profile-scoped — they all run on the
// primary backend and take the target profile in the path or body. So this
// store never calls setApiRequestProfile; it talks to the default backend.
// Two endpoints have no named helper in aether-api.ts (active GET/POST,
// per-profile model PUT), so they go through the injected raw `api`.

type Api = <T>(req: { path: string; method?: string; body?: unknown }) => Promise<T>

export interface ProfilesDeps {
  api: Api
}

function defaultDeps(): ProfilesDeps {
  return { api: req => window.aetherDesktop.api(req) }
}

export const $profiles = atom<ProfileInfo[] | null>(null)
export const $profilesStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
export const $activeProfile = atom<string | null>(null)

interface ActiveProfileResponse {
  active: string
  current: string
}

export async function loadProfiles(deps: ProfilesDeps = defaultDeps()): Promise<void> {
  $profilesStatus.set('loading')

  try {
    const [{ profiles }, active] = await Promise.all([
      getProfiles(),
      deps.api<ActiveProfileResponse>({ path: '/api/profiles/active' })
    ])

    $profiles.set(profiles)
    $activeProfile.set(active.current || 'default')
    $profilesStatus.set(profiles.length === 0 ? 'empty' : 'ready')
  } catch {
    $profilesStatus.set('error')
  }
}

export async function createProfileAction(
  name: string,
  options: Omit<ProfileCreatePayload, 'name'> = {},
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await createProfile({ name, ...options })
  await loadProfiles(deps)
}

export async function renameProfileAction(
  name: string,
  newName: string,
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await renameProfile(name, newName)
  await loadProfiles(deps)
}

export async function deleteProfileAction(
  name: string,
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await deleteProfile(name)
  await loadProfiles(deps)
}
