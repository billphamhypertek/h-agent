import { atom } from 'nanostores'

import {
  createProfile,
  deleteProfile,
  getGlobalModelOptions,
  getProfiles,
  getProfileSetupCommand,
  getProfileSoul,
  renameProfile,
  updateProfileSoul
} from '@/aether-api'
import type { ModelOptionsResponse, ProfileCreatePayload, ProfileInfo, ProfileSetupCommand, ProfileSoul } from '@/types/aether'

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

export const $profileSoul = atom<ProfileSoul | null>(null)
export const $profileSoulStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

export async function loadProfileSoul(name: string, _deps: ProfilesDeps = defaultDeps()): Promise<void> {
  $profileSoulStatus.set('loading')

  try {
    const soul = await getProfileSoul(name)
    $profileSoul.set(soul)
    $profileSoulStatus.set('ready')
  } catch {
    $profileSoulStatus.set('error')
  }
}

export async function saveProfileSoul(
  name: string,
  content: string,
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await updateProfileSoul(name, content)
  await loadProfileSoul(name, deps)
}

export const $modelOptions = atom<ModelOptionsResponse | null>(null)
export const $profileSetup = atom<ProfileSetupCommand | null>(null)

export async function loadModelOptions(_deps: ProfilesDeps = defaultDeps()): Promise<void> {
  try {
    $modelOptions.set(await getGlobalModelOptions())
  } catch {
    $modelOptions.set(null)
  }
}

export async function loadProfileSetup(name: string, _deps: ProfilesDeps = defaultDeps()): Promise<void> {
  try {
    $profileSetup.set(await getProfileSetupCommand(name))
  } catch {
    $profileSetup.set(null)
  }
}

// Raw api: no named helper exists for PUT /api/profiles/{name}/model.
export async function setProfileModelAction(
  name: string,
  provider: string,
  model: string,
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await deps.api({
    path: `/api/profiles/${encodeURIComponent(name)}/model`,
    method: 'PUT',
    body: { provider, model }
  })
  await loadProfiles(deps)
}

// Raw api: no named helper exists for POST /api/profiles/active. Sets the sticky
// active profile only (does NOT retarget the running backend — see backend
// docstring); surfaced in UI as "Đặt làm mặc định".
export async function setActiveProfileAction(
  name: string,
  deps: ProfilesDeps = defaultDeps()
): Promise<void> {
  await deps.api({
    path: '/api/profiles/active',
    method: 'POST',
    body: { name }
  })
  await loadProfiles(deps)
}
