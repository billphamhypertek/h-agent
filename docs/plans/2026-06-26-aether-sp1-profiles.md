# Profiles Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Profiles `<StubScreen>` with a tempered-runtime restyle screen that lists profiles and supports create/rename/delete, soul (context) editing, per-profile model selection, active-profile switching, and setup-command display — all over the existing REST surface with no backend changes.

**Architecture:** 3-tier. `aether/ui/screens/profiles-screen.tsx` (presentation, tokens/className only) → `aether/domain/profiles/profiles-store.ts` (nanostores atoms `$profiles`/`$profilesStatus`/`$activeProfile`/`$profileSoul`/`$profileSoulStatus`/`$profileSetup`/`$modelOptions` + injectable `deps.api`/`deps.modelOptions` actions) → existing `aether-api.ts` named helpers plus raw `window.aetherDesktop.api({path})` for the two endpoints that have no named wrapper (`/api/profiles/active` GET/POST, `/api/profiles/{name}/model` PUT). Profile-scoping uses `setApiRequestProfile` only where a call must hit a specific profile's backend (none of the Profiles endpoints are profile-scoped — they all run on the primary backend and take the profile in the path/body — so this screen needs NO `setApiRequestProfile` calls; documented in the store header).

**Tech Stack:** React 18, nanostores, Tailwind (--ae-* tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className. Do NOT import old web UI; reference logic only.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — REST + non-conversation events only; no `message.delta`/`reasoning.delta`/`thinking.*`, no `appendAssistantDelta`, no LLM re-trigger.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.

---

## Confirmed signatures & REST contracts (verified against source — DO NOT invent)

**`apps/desktop/src/aether-api.ts` named helpers (use these as-is):**
- `getProfiles(): Promise<ProfilesResponse>` → GET `/api/profiles`
- `createProfile(body: ProfileCreatePayload): Promise<{ name: string; ok: boolean; path: string }>` → POST `/api/profiles`
- `renameProfile(name: string, newName: string): Promise<{ name: string; ok: boolean; path: string }>` → PATCH `/api/profiles/{name}` body `{ new_name: newName }`
- `deleteProfile(name: string): Promise<{ ok: boolean; path: string }>` → DELETE `/api/profiles/{name}`
- `getProfileSoul(name: string): Promise<ProfileSoul>` → GET `/api/profiles/{name}/soul`
- `updateProfileSoul(name: string, content: string): Promise<{ ok: boolean }>` → PUT `/api/profiles/{name}/soul` body `{ content }`
- `getProfileSetupCommand(name: string): Promise<ProfileSetupCommand>` → GET `/api/profiles/{name}/setup-command`
- `getGlobalModelOptions(opts?: { refresh?: boolean }): Promise<ModelOptionsResponse>` → GET `/api/model/options` (used to populate the per-profile model selector)

**Endpoints WITHOUT a named wrapper — call via raw `window.aetherDesktop.api<T>({ path, method, body })` (confirmed: no helper exists in aether-api.ts):**
- `GET /api/profiles/active` → returns `{ active: string; current: string }` (backend `aether_cli/web_server.py:9956`). `current` = profile the running dashboard is scoped to; `active` = sticky default. We treat `current` as the active indicator.
- `POST /api/profiles/active` body `{ name: string }` → `{ ok: boolean; active: string }` (backend `:9977`, model `ProfileActiveUpdate{ name }`). NOTE: this sets the **sticky** active profile only; it does NOT retarget the running process (see backend docstring). We surface it as "Đặt làm mặc định".
- `PUT /api/profiles/{name}/model` body `{ provider: string; model: string }` → `{ ok: boolean; provider: string; model: string }` (backend `:10134`, model `ProfileModelUpdate{ provider, model }`).

**Types (`apps/desktop/src/types/aether.ts`, re-exported from `aether-api.ts`):**
```ts
interface ProfileInfo { has_env: boolean; is_default: boolean; model: null | string; name: string; path: string; provider: null | string; skill_count: number }
interface ProfilesResponse { profiles: ProfileInfo[] }
interface ProfileCreatePayload { clone_all?: boolean; clone_from?: null | string; clone_from_default?: boolean; name: string; no_skills?: boolean }
interface ProfileSoul { content: string; exists: boolean }
interface ProfileSetupCommand { command: string }
interface ModelOptionProvider { name: string; slug: string; models?: string[]; is_current?: boolean; authenticated?: boolean; /* … */ }
interface ModelOptionsResponse { model?: string; provider?: string; providers?: ModelOptionProvider[] }
```

**Window api typing** (from `src/global.d.ts` / existing tests): `window.aetherDesktop.api<T>(req: { path: string; method?: string; body?: unknown; profile?: string; timeoutMs?: number }): Promise<T>`.

**Shell route (confirmed):** `aether-shell.tsx:58` renders `<Route element={<StubScreen title="Profiles" />} path={PROFILES_ROUTE.slice(1)} />`. `PROFILES_ROUTE = '/profiles'` (`src/app/routes.ts:9`).

**Test runner:** `cd apps/desktop && npm run test:ui` → `vitest run --environment jsdom`. Run a single file with `npm run test:ui -- <path>`.

**Pattern refs:** store shape from `briefing-store.ts`; screen shape from `morning-brief.tsx` (root `.ae-screen-bare flex h-full min-w-0 flex-col`, mount-load `useEffect`, `<GlassSlab size>`); render test from `morning-brief.test.tsx`; profile-scope api-mock pattern from `aether-api-profile-scope.test.ts` (`window.aetherDesktop = { api: vi.fn() }`).

---

## Task 1 — `profiles-store.ts`: load + list status

**Files:**
- Create: `apps/desktop/src/aether/domain/profiles/profiles-store.ts`
- Test: `apps/desktop/src/aether/domain/profiles/profiles-store.test.ts`

**Interfaces:**
- Consumes: `getProfiles()`, raw api `GET /api/profiles/active`. Injectable `deps.api?: typeof window.aetherDesktop.api`.
- Produces: `$profiles: WritableAtom<ProfileInfo[] | null>`, `$profilesStatus: WritableAtom<'idle'|'loading'|'ready'|'empty'|'error'>`, `$activeProfile: WritableAtom<string | null>`, `loadProfiles(deps?): Promise<void>`.

- [ ] **Step 1.1 — failing test: `loadProfiles` sets atoms from getProfiles + active**

Write `apps/desktop/src/aether/domain/profiles/profiles-store.test.ts`:
```ts
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
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```
Expected: `Error: Failed to resolve import "./profiles-store"` (module does not exist yet).

- [ ] **Step 1.2 — minimal impl**

Write `apps/desktop/src/aether/domain/profiles/profiles-store.ts`:
```ts
import { atom } from 'nanostores'

import { getProfiles } from '@/aether-api'
import type { ModelOptionsResponse, ProfileInfo } from '@/types/aether'

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
```
The unused `ModelOptionsResponse` import will be consumed in Task 5; if the lint config flags unused imports as an error, omit it here and add it in Task 5 instead.

Run, expect PASS (3 passed):
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```

- [ ] **Step 1.3 — commit**
```
git add apps/desktop/src/aether/domain/profiles/profiles-store.ts apps/desktop/src/aether/domain/profiles/profiles-store.test.ts
git commit -m "feat(aether-desktop): profiles-store load + list status

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `profiles-screen.tsx`: list + skeleton/empty/error + active indicator

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/profiles-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx`

**Interfaces:**
- Consumes: `$profiles`, `$profilesStatus`, `$activeProfile`, `loadProfiles` from the store; `GlassSlab`.
- Produces: `export function ProfilesScreen(): JSX.Element`.

- [ ] **Step 2.1 — failing test: ready renders rows + active indicator; empty/error states**

Write `apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx`:
```ts
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $activeProfile, $profiles, $profilesStatus } from '@/aether/domain/profiles/profiles-store'
import type { ProfileInfo } from '@/types/aether'

import { ProfilesScreen } from './profiles-screen'

const ROWS: ProfileInfo[] = [
  { name: 'default', path: '/h/default', is_default: true, has_env: true, model: 'sonnet', provider: 'anthropic', skill_count: 3 },
  { name: 'coder', path: '/h/coder', is_default: false, has_env: false, model: null, provider: null, skill_count: 0 }
]

beforeEach(() => {
  $profiles.set(ROWS)
  $profilesStatus.set('ready')
  $activeProfile.set('coder')
})
afterEach(cleanup)

describe('ProfilesScreen', () => {
  it('renders one card per profile', () => {
    render(<ProfilesScreen />)
    expect(screen.getAllByTestId('ae-profile-row')).toHaveLength(2)
    expect(screen.getByText('default')).toBeTruthy()
    expect(screen.getByText('coder')).toBeTruthy()
  })

  it('marks the active profile', () => {
    render(<ProfilesScreen />)
    const active = screen.getByTestId('ae-profile-row-coder')
    expect(active.getAttribute('data-active')).toBe('true')
    expect(screen.getByTestId('ae-profile-row-default').getAttribute('data-active')).toBe('false')
  })

  it('shows a Vietnamese empty state', () => {
    $profiles.set([])
    $profilesStatus.set('empty')
    render(<ProfilesScreen />)
    expect(screen.getByText(/Chưa có hồ sơ nào/)).toBeTruthy()
  })

  it('shows an error state with a retry control', () => {
    $profilesStatus.set('error')
    render(<ProfilesScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })
})
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```
Expected: `Failed to resolve import "./profiles-screen"`.

- [ ] **Step 2.2 — minimal impl (list + states + active indicator; selection state for later tasks)**

Write `apps/desktop/src/aether/ui/screens/profiles-screen.tsx`:
```ts
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $activeProfile,
  $profiles,
  $profilesStatus,
  loadProfiles
} from '@/aether/domain/profiles/profiles-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { ProfileInfo } from '@/types/aether'

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" data-testid="ae-profiles-skeleton">
      {[0, 1, 2].map(i => (
        <div className="h-[58px] animate-pulse rounded-[13px] bg-[rgba(120,195,245,.06)]" key={i} />
      ))}
    </div>
  )
}

export function ProfilesScreen() {
  const profiles = useStore($profiles)
  const status = useStore($profilesStatus)
  const active = useStore($activeProfile)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if ($profilesStatus.get() === 'idle') { void loadProfiles() }
  }, [])

  const rows: ProfileInfo[] = profiles ?? []
  const selectedName = selected ?? active

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[26px] font-semibold leading-[1.05]">Hồ sơ</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">
            Mỗi hồ sơ có cấu hình, model và soul riêng.
          </div>
        </div>
      </div>

      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1fr_1.2fr] gap-3.5">
        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="mb-[11px] flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
              DANH SÁCH HỒ SƠ
            </span>
          </div>

          {status === 'loading' && <ProfileSkeleton />}

          {status === 'error' && (
            <div className="flex flex-col items-start gap-2 text-[12.5px] text-[color:var(--ae-warn)]">
              <span>Không tải được danh sách hồ sơ.</span>
              <button
                className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                onClick={() => void loadProfiles()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          )}

          {status === 'empty' && (
            <div className="text-[12.5px] text-[color:var(--ae-dim)]">
              Chưa có hồ sơ nào. Tạo hồ sơ đầu tiên để bắt đầu.
            </div>
          )}

          {status === 'ready' && (
            <div className="flex min-h-0 flex-col gap-2.5 overflow-auto">
              {rows.map(p => {
                const isActive = p.name === active
                const isSelected = p.name === selectedName

                return (
                  <button
                    className="flex items-center gap-[11px] rounded-[13px] p-[11px_13px] text-left"
                    data-active={isActive ? 'true' : 'false'}
                    data-testid={`ae-profile-row-${p.name}`}
                    key={p.name}
                    onClick={() => setSelected(p.name)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(160deg,rgba(74,163,255,.14),rgba(120,195,245,.04))'
                        : 'linear-gradient(160deg,rgba(120,195,245,.05),rgba(120,195,245,.01))',
                      border: `1px solid ${isSelected ? 'rgba(120,210,255,.4)' : 'rgba(120,200,255,.1)'}`
                    }}
                    type="button"
                  >
                    <span
                      className="h-[7px] w-[7px] flex-none rounded-full"
                      style={{
                        background: isActive ? 'var(--ae-ok)' : 'var(--ae-dim)',
                        boxShadow: isActive ? '0 0 8px var(--ae-ok)' : 'none'
                      }}
                    />
                    <span className="min-w-0 flex-1" data-testid="ae-profile-row">
                      <span className="block truncate text-[13px] font-semibold text-white">{p.name}</span>
                      <span className="block truncate text-[10.5px] text-[color:var(--ae-dim)]">
                        {p.model ? `${p.provider ?? '?'} · ${p.model}` : 'Chưa chọn model'}
                      </span>
                    </span>
                    {isActive && (
                      <span className="flex-none text-[10px] font-semibold text-[color:var(--ae-ok)]">
                        đang dùng
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </GlassSlab>

        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            CHI TIẾT
          </div>
          <div className="mt-2 text-[12px] text-[color:var(--ae-dim)]">
            {selectedName ? `Hồ sơ: ${selectedName}` : 'Chọn một hồ sơ để xem chi tiết.'}
          </div>
        </GlassSlab>
      </div>
    </div>
  )
}
```

Run, expect PASS (4 passed):
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```

- [ ] **Step 2.3 — commit**
```
git add apps/desktop/src/aether/ui/screens/profiles-screen.tsx apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx
git commit -m "feat(aether-desktop): profiles screen list with skeleton/empty/error + active indicator

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — create / rename / delete actions + interaction tests

**Files:**
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.ts`
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx`

**Interfaces:**
- Produces (store): `createProfileAction(name: string, deps?)`, `renameProfileAction(name: string, newName: string, deps?)`, `deleteProfileAction(name: string, deps?)` — each calls the matching `aether-api.ts` helper then `loadProfiles(deps)` to re-fetch.

- [ ] **Step 3.1 — failing test: mutations call REST then re-fetch**

Append to `profiles-store.test.ts`:
```ts
import {
  createProfileAction,
  deleteProfileAction,
  renameProfileAction
} from './profiles-store'

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
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```
Expected: `does not provide an export named 'createProfileAction'`.

- [ ] **Step 3.2 — store impl**

In `profiles-store.ts`, add the named-helper imports and actions. Update the import line:
```ts
import { createProfile, deleteProfile, getProfiles, renameProfile } from '@/aether-api'
import type { ProfileCreatePayload } from '@/types/aether'
```
(Merge the `ProfileCreatePayload` into the existing `@/types/aether` type import.)

Append actions:
```ts
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
```
NOTE: `createProfileAction('qa')` produces body `{ name: 'qa' }` (no extra options), matching the test.

Run, expect PASS (6 passed):
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```

- [ ] **Step 3.3 — failing test: screen create/rename/delete UI flow**

Append to `profiles-screen.test.tsx`:
```ts
import { fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

import * as store from '@/aether/domain/profiles/profiles-store'

describe('ProfilesScreen mutations', () => {
  it('create flow calls createProfileAction with the typed name', async () => {
    const spy = vi.spyOn(store, 'createProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ/ }))
    fireEvent.change(screen.getByTestId('ae-new-profile-name'), { target: { value: 'qa' } })
    fireEvent.click(screen.getByRole('button', { name: /^Tạo$/ }))
    expect(spy).toHaveBeenCalledWith('qa')
    spy.mockRestore()
  })

  it('rename flow calls renameProfileAction for the selected profile', () => {
    $activeProfile.set('coder')
    const spy = vi.spyOn(store, 'renameProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Đổi tên/ }))
    fireEvent.change(screen.getByTestId('ae-rename-profile-name'), { target: { value: 'coder2' } })
    fireEvent.click(screen.getByRole('button', { name: /^Lưu tên$/ }))
    expect(spy).toHaveBeenCalledWith('coder', 'coder2')
    spy.mockRestore()
  })

  it('delete flow calls deleteProfileAction for the selected profile', () => {
    const spy = vi.spyOn(store, 'deleteProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Xoá/ }))
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/ }))
    expect(spy).toHaveBeenCalledWith('coder')
    spy.mockRestore()
  })
})
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```
Expected: `Unable to find ... button name /Tạo hồ sơ/` (UI not built yet).

- [ ] **Step 3.4 — screen impl: create/rename/delete inline controls**

In `profiles-screen.tsx`:

1. Extend the store import to pull the actions:
```ts
import {
  $activeProfile,
  $profiles,
  $profilesStatus,
  createProfileAction,
  deleteProfileAction,
  loadProfiles,
  renameProfileAction
} from '@/aether/domain/profiles/profiles-store'
```

2. Add local UI state under the existing `selected` state:
```ts
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
```

3. In the list slab header, replace the empty `<span>` after the DANH SÁCH HỒ SƠ label area with a create toggle, and render the create form. Put this immediately after the `<div className="mb-[11px] flex items-center justify-between">…</div>` block:
```tsx
          <div className="mb-2.5">
            <button
              className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
              onClick={() => setCreating(v => !v)}
              type="button"
            >
              Tạo hồ sơ
            </button>
            {creating && (
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                  data-testid="ae-new-profile-name"
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Tên hồ sơ mới"
                  value={newName}
                />
                <button
                  className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                  disabled={!newName.trim()}
                  onClick={async () => {
                    await createProfileAction(newName.trim())
                    setNewName('')
                    setCreating(false)
                  }}
                  type="button"
                >
                  Tạo
                </button>
              </div>
            )}
          </div>
```

4. In the CHI TIẾT slab, after the "Hồ sơ: …" line, add rename + delete controls (only when a profile is selected). Replace the detail-slab body with:
```tsx
          <div className="mt-2 flex flex-col gap-3 overflow-auto">
            <div className="text-[13px] font-semibold text-white">
              {selectedName ? selectedName : 'Chọn một hồ sơ để xem chi tiết.'}
            </div>

            {selectedName && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                  onClick={() => { setRenaming(v => !v); setRenameValue(selectedName) }}
                  type="button"
                >
                  Đổi tên
                </button>
                <button
                  className="rounded-[9px] border border-[rgba(255,176,32,.4)] px-3 py-1.5 text-[12px] text-[color:var(--ae-warn)]"
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                >
                  Xoá
                </button>
              </div>
            )}

            {selectedName && renaming && (
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                  data-testid="ae-rename-profile-name"
                  onChange={e => setRenameValue(e.target.value)}
                  value={renameValue}
                />
                <button
                  className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                  disabled={!renameValue.trim() || renameValue.trim() === selectedName}
                  onClick={async () => {
                    await renameProfileAction(selectedName, renameValue.trim())
                    setSelected(renameValue.trim())
                    setRenaming(false)
                  }}
                  type="button"
                >
                  Lưu tên
                </button>
              </div>
            )}

            {selectedName && confirmingDelete && (
              <div className="flex flex-col gap-2 rounded-[11px] border border-[rgba(255,176,32,.3)] p-2.5">
                <span className="text-[12px] text-[color:var(--ae-warn)]">
                  Xoá hồ sơ "{selectedName}"? Hành động này không thể hoàn tác.
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded-[9px] bg-[var(--ae-warn)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                    onClick={async () => {
                      await deleteProfileAction(selectedName)
                      setSelected(null)
                      setConfirmingDelete(false)
                    }}
                    type="button"
                  >
                    Xác nhận xoá
                  </button>
                  <button
                    className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                    onClick={() => setConfirmingDelete(false)}
                    type="button"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}
          </div>
```
Remove the old single `<div className="mt-2 text-[12px] …">{selectedName ? … }</div>` line that this replaces.

Run, expect PASS (7 passed — 4 prior + 3 new):
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```

- [ ] **Step 3.5 — commit**
```
git add apps/desktop/src/aether/domain/profiles/profiles-store.ts apps/desktop/src/aether/domain/profiles/profiles-store.test.ts apps/desktop/src/aether/ui/screens/profiles-screen.tsx apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx
git commit -m "feat(aether-desktop): profile create/rename/delete flows

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Soul (context) editor: load + save sub-store + editor

**Files:**
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.ts`
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx`

**Interfaces:**
- Produces (store): `$profileSoul: WritableAtom<ProfileSoul | null>`, `$profileSoulStatus: WritableAtom<'idle'|'loading'|'ready'|'error'>`, `loadProfileSoul(name, deps?)` (→ `getProfileSoul`), `saveProfileSoul(name, content, deps?)` (→ `updateProfileSoul` then re-load soul).

- [ ] **Step 4.1 — failing test: soul load + save**

Append to `profiles-store.test.ts`:
```ts
import type { ProfileSoul } from '@/types/aether'

import {
  $profileSoul,
  $profileSoulStatus,
  loadProfileSoul,
  saveProfileSoul
} from './profiles-store'

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
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```
Expected: `does not provide an export named '$profileSoul'`.

- [ ] **Step 4.2 — store impl**

In `profiles-store.ts`, extend the api import:
```ts
import { createProfile, deleteProfile, getProfiles, getProfileSoul, renameProfile, updateProfileSoul } from '@/aether-api'
import type { ProfileCreatePayload, ProfileSoul } from '@/types/aether'
```

Append:
```ts
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
```
NOTE: `getProfileSoul`/`updateProfileSoul` are named helpers that internally call `window.aetherDesktop.api`, so the test's `mockApi` (which replaces `window.aetherDesktop`) still intercepts them — `_deps` is accepted for symmetry but the named helpers are the real call path. Prefix unused with `_` to satisfy lint.

Run, expect PASS (9 passed total):
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```

- [ ] **Step 4.3 — failing test: soul editor in screen**

Append to `profiles-screen.test.tsx`:
```ts
import { $profileSoul, $profileSoulStatus } from '@/aether/domain/profiles/profiles-store'

describe('ProfilesScreen soul editor', () => {
  it('renders the soul content for the selected profile and saves edits', () => {
    $activeProfile.set('coder')
    $profileSoul.set({ content: 'Bạn là trợ lý.', exists: true })
    $profileSoulStatus.set('ready')
    const spy = vi.spyOn(store, 'saveProfileSoul').mockResolvedValue()

    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))

    const textarea = screen.getByTestId('ae-soul-editor') as HTMLTextAreaElement
    expect(textarea.value).toBe('Bạn là trợ lý.')

    fireEvent.change(textarea, { target: { value: 'Bạn là kỹ sư.' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu soul/ }))

    expect(spy).toHaveBeenCalledWith('coder', 'Bạn là kỹ sư.')
    spy.mockRestore()
  })
})
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```
Expected: `Unable to find element by: [data-testid="ae-soul-editor"]`.

- [ ] **Step 4.4 — screen impl: soul editor + load-on-select**

In `profiles-screen.tsx`:

1. Extend store import to add soul atoms/actions:
```ts
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
} from '@/aether/domain/profiles/profiles-store'
```

2. Subscribe + load soul when selection changes. Add near the other `useStore`/`useState` hooks:
```ts
  const soul = useStore($profileSoul)
  const soulStatus = useStore($profileSoulStatus)
  const [soulDraft, setSoulDraft] = useState('')
```
Add an effect (after the mount-load effect):
```ts
  useEffect(() => {
    if (selectedName) { void loadProfileSoul(selectedName) }
  }, [selectedName])

  useEffect(() => {
    setSoulDraft(soul?.content ?? '')
  }, [soul])
```

3. In the CHI TIẾT slab body, after the rename/delete controls block, add the editor:
```tsx
            {selectedName && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  SOUL (BỐI CẢNH)
                </span>
                {soulStatus === 'loading' && (
                  <div className="h-[120px] animate-pulse rounded-[11px] bg-[rgba(120,195,245,.06)]" />
                )}
                {soulStatus === 'error' && (
                  <span className="text-[12px] text-[color:var(--ae-warn)]">Không tải được soul.</span>
                )}
                {soulStatus === 'ready' && (
                  <>
                    <textarea
                      className="min-h-[120px] w-full resize-y rounded-[11px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] p-2.5 text-[12px] leading-[1.5] text-white"
                      data-testid="ae-soul-editor"
                      onChange={e => setSoulDraft(e.target.value)}
                      value={soulDraft}
                    />
                    <button
                      className="self-start rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                      disabled={soulDraft === (soul?.content ?? '')}
                      onClick={() => void saveProfileSoul(selectedName, soulDraft)}
                      type="button"
                    >
                      Lưu soul
                    </button>
                  </>
                )}
              </div>
            )}
```

Run, expect PASS (8 passed):
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```

- [ ] **Step 4.5 — commit**
```
git add apps/desktop/src/aether/domain/profiles/profiles-store.ts apps/desktop/src/aether/domain/profiles/profiles-store.test.ts apps/desktop/src/aether/ui/screens/profiles-screen.tsx apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx
git commit -m "feat(aether-desktop): profile soul (context) editor load + save

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — per-profile model + set-active + setup command + prompt-cache guard

**Files:**
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.ts`
- Modify: `apps/desktop/src/aether/domain/profiles/profiles-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx`

**Interfaces:**
- Produces (store):
  - `$modelOptions: WritableAtom<ModelOptionsResponse | null>`, `loadModelOptions(deps?)` (→ `getGlobalModelOptions`).
  - `setProfileModelAction(name: string, provider: string, model: string, deps?)` → raw `PUT /api/profiles/{name}/model` body `{ provider, model }`, then `loadProfiles(deps)`.
  - `setActiveProfileAction(name: string, deps?)` → raw `POST /api/profiles/active` body `{ name }`, then `loadProfiles(deps)`.
  - `$profileSetup: WritableAtom<ProfileSetupCommand | null>`, `loadProfileSetup(name)` (→ `getProfileSetupCommand`).

- [ ] **Step 5.1 — failing test: model PUT, active POST, setup GET, model-options load**

Append to `profiles-store.test.ts`:
```ts
import type { ModelOptionsResponse, ProfileSetupCommand } from '@/types/aether'

import {
  $modelOptions,
  $profileSetup,
  loadModelOptions,
  loadProfileSetup,
  setActiveProfileAction,
  setProfileModelAction
} from './profiles-store'

describe('per-profile model + active + setup', () => {
  it('setProfileModelAction PUTs /model then reloads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles/coder/model' && req.method === 'PUT') { return { ok: true, provider: 'anthropic', model: 'opus' } }
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      return { active: 'default', current: 'default' }
    })

    await setProfileModelAction('coder', 'anthropic', 'opus')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles/coder/model',
      method: 'PUT',
      body: { provider: 'anthropic', model: 'opus' }
    }))
    expect($profilesStatus.get()).toBe('ready')
  })

  it('setActiveProfileAction POSTs /active then reloads', async () => {
    const api = mockApi(req => {
      if (req.path === '/api/profiles/active' && req.method === 'POST') { return { ok: true, active: 'coder' } }
      if (req.path === '/api/profiles') { return { profiles: ROWS } }
      return { active: 'coder', current: 'coder' }
    })

    await setActiveProfileAction('coder')

    expect(api).toHaveBeenCalledWith(expect.objectContaining({
      path: '/api/profiles/active',
      method: 'POST',
      body: { name: 'coder' }
    }))
  })

  it('loadProfileSetup GETs setup-command', async () => {
    const cmd: ProfileSetupCommand = { command: 'aether profile use coder' }
    mockApi(req => (req.path === '/api/profiles/coder/setup-command' ? cmd : { active: 'default', current: 'default' }))
    await loadProfileSetup('coder')
    expect($profileSetup.get()).toEqual(cmd)
  })

  it('loadModelOptions GETs /api/model/options', async () => {
    const opts: ModelOptionsResponse = { providers: [{ name: 'Anthropic', slug: 'anthropic', models: ['opus', 'sonnet'] }] }
    mockApi(req => (req.path === '/api/model/options' ? opts : { active: 'default', current: 'default' }))
    await loadModelOptions()
    expect($modelOptions.get()).toEqual(opts)
  })
})
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```
Expected: `does not provide an export named '$modelOptions'`.

- [ ] **Step 5.2 — store impl**

In `profiles-store.ts`, extend imports:
```ts
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
import type { ModelOptionsResponse, ProfileCreatePayload, ProfileSetupCommand, ProfileSoul } from '@/types/aether'
```

Append:
```ts
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
```

Run, expect PASS (13 passed total):
```
cd apps/desktop && npm run test:ui -- src/aether/domain/profiles/profiles-store.test.ts
```

- [ ] **Step 5.3 — failing test: screen model selector + set-active + setup + prompt-cache guard**

Append to `profiles-screen.test.tsx`:
```ts
import { $modelOptions, $profileSetup } from '@/aether/domain/profiles/profiles-store'
import type { ModelOptionsResponse, ProfileSetupCommand } from '@/types/aether'

describe('ProfilesScreen model + active + setup', () => {
  beforeEach(() => {
    const opts: ModelOptionsResponse = { providers: [{ name: 'Anthropic', slug: 'anthropic', models: ['opus', 'sonnet'] }] }
    $modelOptions.set(opts)
    const setup: ProfileSetupCommand = { command: 'aether profile use coder' }
    $profileSetup.set(setup)
  })

  it('sets the per-profile model from the selector', () => {
    $activeProfile.set('coder')
    const spy = vi.spyOn(store, 'setProfileModelAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.change(screen.getByTestId('ae-model-select'), { target: { value: 'anthropic::opus' } })
    fireEvent.click(screen.getByRole('button', { name: /Lưu model/ }))
    expect(spy).toHaveBeenCalledWith('coder', 'anthropic', 'opus')
    spy.mockRestore()
  })

  it('marks a non-active profile and lets the user set it active', () => {
    $activeProfile.set('default')
    const spy = vi.spyOn(store, 'setActiveProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Đặt làm mặc định/ }))
    expect(spy).toHaveBeenCalledWith('coder')
    spy.mockRestore()
  })

  it('shows the setup command for the selected profile', () => {
    $activeProfile.set('coder')
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    expect(screen.getByText('aether profile use coder')).toBeTruthy()
  })
})

// PROMPT-CACHE GUARD (hard): Profiles is a non-chat REST screen. It must never
// subscribe to conversation deltas or append assistant text — doing so would
// re-trigger the LLM and break prompt caching. We assert the source contains no
// forbidden conversation-stream identifiers (source-level guard chosen because
// the screen has no event subscription to spy on — absence is the contract).
describe('ProfilesScreen prompt-cache safety', () => {
  it('has no conversation-delta / appendAssistantDelta usage in source', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const src = fs.readFileSync(
      path.resolve(__dirname, 'profiles-screen.tsx'),
      'utf8'
    )
    for (const forbidden of ['appendAssistantDelta', 'message.delta', 'reasoning.delta', 'thinking.']) {
      expect(src.includes(forbidden)).toBe(false)
    }
  })
})
```

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```
Expected: `Unable to find element by: [data-testid="ae-model-select"]` (the prompt-cache guard already passes; the model/active/setup tests fail).

- [ ] **Step 5.4 — screen impl: model selector + set-active + setup command + mount-load options**

In `profiles-screen.tsx`:

1. Extend store import:
```ts
import {
  $activeProfile,
  $modelOptions,
  $profiles,
  $profilesStatus,
  $profileSetup,
  $profileSoul,
  $profileSoulStatus,
  createProfileAction,
  deleteProfileAction,
  loadModelOptions,
  loadProfiles,
  loadProfileSetup,
  loadProfileSoul,
  renameProfileAction,
  saveProfileSoul,
  setActiveProfileAction,
  setProfileModelAction
} from '@/aether/domain/profiles/profiles-store'
```

2. Add hooks + state:
```ts
  const modelOptions = useStore($modelOptions)
  const setup = useStore($profileSetup)
  const [modelChoice, setModelChoice] = useState('')
```

3. Extend the mount-load effect to also load model options:
```ts
  useEffect(() => {
    if ($profilesStatus.get() === 'idle') { void loadProfiles() }
    void loadModelOptions()
  }, [])
```

4. Extend the selection effect to also load the setup command and reset the model choice:
```ts
  useEffect(() => {
    if (selectedName) {
      void loadProfileSoul(selectedName)
      void loadProfileSetup(selectedName)
      setModelChoice('')
    }
  }, [selectedName])
```

5. In the CHI TIẾT slab, after the rename/delete controls and before the SOUL block, add the "set active" button (only when selected and not already active) and the model selector. Insert:
```tsx
            {selectedName && selectedName !== active && (
              <button
                className="self-start rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                onClick={() => void setActiveProfileAction(selectedName)}
                type="button"
              >
                Đặt làm mặc định
              </button>
            )}

            {selectedName && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  MODEL CHO HỒ SƠ
                </span>
                <div className="flex gap-2">
                  <select
                    className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                    data-testid="ae-model-select"
                    onChange={e => setModelChoice(e.target.value)}
                    value={modelChoice}
                  >
                    <option value="">Chọn model…</option>
                    {(modelOptions?.providers ?? []).flatMap(provider =>
                      (provider.models ?? []).map(m => (
                        <option key={`${provider.slug}::${m}`} value={`${provider.slug}::${m}`}>
                          {provider.name} · {m}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                    disabled={!modelChoice}
                    onClick={() => {
                      const [provider, model] = modelChoice.split('::')
                      if (provider && model) { void setProfileModelAction(selectedName, provider, model) }
                    }}
                    type="button"
                  >
                    Lưu model
                  </button>
                </div>
              </div>
            )}
```

6. After the SOUL block, add the setup-command display:
```tsx
            {selectedName && setup && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  LỆNH THIẾT LẬP
                </span>
                <code className="block overflow-auto rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] p-2.5 text-[11.5px] text-[#CFE2F7]">
                  {setup.command}
                </code>
              </div>
            )}
```

Run, expect PASS (12 passed: 8 prior + 3 new + 1 prompt-cache guard):
```
cd apps/desktop && npm run test:ui -- src/aether/ui/screens/profiles-screen.test.tsx
```

- [ ] **Step 5.5 — commit**
```
git add apps/desktop/src/aether/domain/profiles/profiles-store.ts apps/desktop/src/aether/domain/profiles/profiles-store.test.ts apps/desktop/src/aether/ui/screens/profiles-screen.tsx apps/desktop/src/aether/ui/screens/profiles-screen.test.tsx
git commit -m "feat(aether-desktop): per-profile model + set-active + setup command + prompt-cache guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — swap stub → `<ProfilesScreen/>` in the shell

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx`

**Interfaces:**
- Consumes: `ProfilesScreen`. Removes the `<StubScreen title="Profiles" />` route element.

- [ ] **Step 6.1 — failing test: shell renders ProfilesScreen at the profiles route**

First inspect the existing shell test to match its render harness (router setup, mocked stores):
```
cd apps/desktop && sed -n '1,80p' src/aether/ui/shell/aether-shell.test.tsx
```
Add a test that navigates to `/profiles` and asserts a Profiles-screen-only marker is present. Use the heading text "Hồ sơ" which only `ProfilesScreen` renders (the stub rendered "Sắp ra mắt"). Mirror the existing test's setup (MemoryRouter + `$bootDone.set(true)` if used). Example test body to append inside the existing `describe`:
```ts
  it('renders the Profiles screen (not the stub) at /profiles', () => {
    // Mirror this file's existing harness: set $bootDone true and render the
    // shell inside the same router wrapper used by sibling tests, with
    // initialEntries={['/profiles']}.
    // Assert the real screen rendered and the stub did NOT:
    expect(screen.getByText('Hồ sơ')).toBeTruthy()
    expect(screen.queryByText(/Sắp ra mắt/)).toBeNull()
  })
```
NOTE: the executor must adapt the harness lines to the actual `aether-shell.test.tsx` (its existing imports, providers, and how it sets the route). Do NOT invent a router — reuse exactly what the file already does for other routes. If `ProfilesScreen`'s mount-load throws under the shell's mock (no `window.aetherDesktop`), stub `window.aetherDesktop = { api: vi.fn().mockResolvedValue({ profiles: [], active: 'default', current: 'default' }) }` in this test's `beforeEach`.

Run, expect FAIL:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/shell/aether-shell.test.tsx
```
Expected: `Unable to find an element with the text: Hồ sơ` (stub still mounted).

- [ ] **Step 6.2 — swap the route**

In `aether-shell.tsx`:
1. Add the import (alphabetical with other screen imports):
```ts
import { ProfilesScreen } from '@/aether/ui/screens/profiles-screen'
```
2. Replace line:
```tsx
              <Route element={<StubScreen title="Profiles" />} path={PROFILES_ROUTE.slice(1)} />
```
with:
```tsx
              <Route element={<ProfilesScreen />} path={PROFILES_ROUTE.slice(1)} />
```
Leave all other `<StubScreen …>` routes untouched. Keep the `StubScreen` import (still used by Agents/Artifacts/etc.).

Run, expect PASS:
```
cd apps/desktop && npm run test:ui -- src/aether/ui/shell/aether-shell.test.tsx
```

- [ ] **Step 6.3 — full suite green + typecheck**
```
cd apps/desktop && npm run test:ui
```
Expected: all suites pass (including the three Profiles files and the shell file).

Then typecheck (confirm the exact script first with `grep -n '"typecheck"\|"build"\|"lint"' apps/desktop/package.json`):
```
cd apps/desktop && npm run typecheck
```
Expected: no errors. If `typecheck` doesn't exist, run `npx tsc --noEmit -p apps/desktop/tsconfig.json` from the repo root.

- [ ] **Step 6.4 — commit**
```
git add apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
git commit -m "feat(aether-desktop): mount Profiles screen in shell (replace stub)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review vs spec §5.1 Profiles bullets

Confirm each bullet is satisfied before declaring done:

- [ ] **List / create / rename / delete** — `loadProfiles` (Task 1) lists via `getProfiles()` + `/api/profiles/active`; `createProfileAction` → `createProfile(body)`, `renameProfileAction` → `renameProfile(name, newName)`, `deleteProfileAction` → `deleteProfile(name)` (Task 3), each re-fetching. Screen renders a card per profile with create/rename/delete controls (Tasks 2-3).
- [ ] **Soul (context) editor** — `loadProfileSoul(name)` → `getProfileSoul(name)`; `saveProfileSoul(name, content)` → `updateProfileSoul(name, content)` then re-load; textarea editor wired in the screen (Task 4).
- [ ] **Per-profile model** — `setProfileModelAction(name, provider, model)` → raw `PUT /api/profiles/{name}/model` body `{ provider, model }` (verified backend `ProfileModelUpdate`); selector populated from `getGlobalModelOptions()` (Task 5).
- [ ] **Active profile** — active indicator from `/api/profiles/active` `current`; `setActiveProfileAction(name)` → raw `POST /api/profiles/active` body `{ name }` (verified backend `ProfileActiveUpdate`). UI label "Đặt làm mặc định" reflects the backend semantics (sets sticky default; does not retarget the live process) (Task 5).
- [ ] **Setup command** — `loadProfileSetup(name)` → `getProfileSetupCommand(name)`; rendered as a `<code>` block (Task 5).
- [ ] **Global constraints** — Vietnamese UI, no "Đại lý"; colors via `--ae-*` tokens only; root `.ae-screen-bare flex h-full min-w-0 flex-col`; padding via `<GlassSlab>`; non-chat REST-only (no conversation-delta subscription, asserted by the prompt-cache guard test in Task 5).
