# Skills Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `<StubScreen title="Skills" />` with a real, restyled AETHER Skills screen that lists skills with enable/disable, exposes the skills hub (search/install/update), and an inline SKILL.md editor — all REST-driven against the existing backend, no new Python endpoints.

**Architecture:** 3-tier. `aether/ui/screens/skills-screen.tsx` (presentation, AETHER glass restyle) → `aether/domain/skills/skills-store.ts` (+ `skills-hub-store.ts`, `skills-content-store.ts` — nanostores atoms + actions, `deps.api` injected for testability) → existing `aether-api.ts` named helpers (`getSkills`, `toggleSkill`) for the list/toggle and **raw `window.aetherDesktop.api({path})` calls** for hub + content (the desktop `aether-api.ts` has NO hub/content helpers — those live only in `web/src/lib/api.ts`; we reference their logic/REST paths, not their shadcn markup). The screen never imports `web/src/pages/*`.

**Tech Stack:** React 18, nanostores, Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className; no runtime rewrite. Do NOT import old web UI (`web/src/pages/*`) — reference logic only (schema binding, hub flow), don't copy markup/shadcn.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — REST + non-conversation events only; no `message.delta`/`reasoning.delta`/`thinking.*` subscription, no `appendAssistantDelta`, no LLM re-trigger.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.

---

## Confirmed source facts (read before coding — do NOT invent)

**Types** (`apps/desktop/src/types/aether.ts`):
```ts
export interface SkillInfo {
  category: string
  description: string
  enabled: boolean
  name: string
}
```
> `SkillInfo` has exactly 4 fields — `name`, `description`, `category`, `enabled`. There is **no** `provider` field. The card "badge" is the **category** (and an "đã bật/đã tắt" state). Do NOT render a provider badge for installed skills; hub results carry `source`/`trust_level`/`tags` (see below) which the hub panel may badge.

**Named helpers** (`apps/desktop/src/aether-api.ts`) — already profile-scoped via `profileScoped()`:
```ts
export function getSkills(): Promise<SkillInfo[]>                 // GET  /api/skills
export function toggleSkill(name: string, enabled: boolean):
  Promise<{ ok: boolean; name: string; enabled: boolean }>       // PUT  /api/skills/toggle  body { name, enabled }
```

**Hub + content REST paths** — NO desktop named helpers exist; call raw `window.aetherDesktop.api({path,...})`. Paths/shapes mirror `web/src/lib/api.ts` (logic source of truth):
- `GET  /api/skills/hub/search?q=<q>&source=all&limit=20` → `SkillHubSearchResponse`
- `POST /api/skills/hub/install`  body `{ identifier }` → `ActionResponse`
- `POST /api/skills/hub/update`   body `{}` → `ActionResponse`
- `GET  /api/skills/content?name=<name>` → `SkillContent`
- `PUT  /api/skills/content`      body `{ name, content }` → `SkillWriteResult`

> Web helpers also send `profile`. For SP-1 the desktop store relies on `profileScoped()` for the named helpers, and for raw hub/content calls we DO NOT pass `profile` (primary backend serves the window's profile for these; SP-1 is single-profile-on-the-window). Keep it omitted — matches the `AetherApiRequest` default. (Cross-profile skill management is out of SP-1 scope.)

**Hub/content response shapes** (mirror verbatim into `skills-types.ts`, from `web/src/lib/api.ts`):
```ts
export interface SkillHubResult {
  name: string; description: string; source: string; identifier: string
  trust_level: string; repo: string | null; tags: string[]
}
export interface SkillHubInstalledEntry {
  name: string | null; trust_level: string | null; scan_verdict: string | null
}
export interface SkillHubSearchResponse {
  results: SkillHubResult[]
  source_counts: Record<string, number>
  timed_out: string[]
  installed: Record<string, SkillHubInstalledEntry>
}
export interface SkillHubActionResponse {
  name: string; ok: boolean; pid: number | null
  error?: string; message?: string; update_command?: string
}
export interface SkillContent { name: string; content: string; path: string }
export interface SkillWriteResult { success: boolean; message?: string; path?: string; error?: string }
```

**`window.aetherDesktop.api` typing** (`apps/desktop/src/global.d.ts`):
```ts
api: <T>(request: AetherApiRequest) => Promise<T>
interface AetherApiRequest { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string | null }
```

**Patterns to follow:**
- Store shape: `apps/desktop/src/aether/domain/briefing/briefing-store.ts` (`$x` atom + `$xStatus` atom of `'idle'|'loading'|'ready'|'empty'|'error'`, async `loadX()` sets status).
- Screen shape: `apps/desktop/src/aether/ui/screens/morning-brief.tsx` (root `.ae-screen-bare flex h-full min-w-0 flex-col`, mount-load `useEffect(() => { if ($status.get()==='idle') void load() }, [])`, `<GlassSlab size>` cards, `--ae-*` colors).
- Test shape: `apps/desktop/src/aether/ui/screens/morning-brief.test.tsx` (set atom + status in `beforeEach`, `afterEach(cleanup)`).
- API-injection mock: `apps/desktop/src/aether-api-profile-scope.test.ts` (`window.aetherDesktop = { api: vi.fn() }`, assert `api.mock.calls.at(-1)?.[0]`).
- `GlassSlab` (`apps/desktop/src/aether/ui/components/glass-slab.tsx`): `<GlassSlab size="sm|md|lg" className>`.
- Shell route swap: `apps/desktop/src/aether/ui/shell/aether-shell.tsx` line `<Route element={<StubScreen title="Skills" />} path="skills" />`.

**Test command** (run from `apps/desktop`): `npm run test:ui` → `vitest run --environment jsdom`. To scope a single file: `npm run test:ui -- src/aether/domain/skills/skills-store.test.ts`.

---

## Task 1 — Skills store: load + toggle

**Files:**
- Create `apps/desktop/src/aether/domain/skills/skills-types.ts`
- Create `apps/desktop/src/aether/domain/skills/skills-store.ts`
- Test `apps/desktop/src/aether/domain/skills/skills-store.test.ts`

**Interfaces:**
- Consumes: `getSkills(): Promise<SkillInfo[]>`, `toggleSkill(name, enabled): Promise<{ok;name;enabled}>` from `@/aether-api`.
- Produces:
  ```ts
  export const $skills: WritableAtom<SkillInfo[] | null>
  export const $skillsStatus: WritableAtom<'idle'|'loading'|'ready'|'empty'|'error'>
  export function loadSkills(deps?: { getSkills?: typeof getSkills }): Promise<void>
  export function toggleSkillEnabled(
    name: string, enabled: boolean,
    deps?: { toggleSkill?: typeof toggleSkill; getSkills?: typeof getSkills }
  ): Promise<void>
  ```

- [ ] **Step 1.1 — Write the failing test.**
  Create `apps/desktop/src/aether/domain/skills/skills-store.test.ts`:
  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import type { SkillInfo } from '@/types/aether'

  import { $skills, $skillsStatus, loadSkills, toggleSkillEnabled } from './skills-store'

  const SAMPLE: SkillInfo[] = [
    { name: 'deep-research', description: 'Nghiên cứu sâu', category: 'research', enabled: true },
    { name: 'code-review', description: 'Rà soát code', category: 'dev', enabled: false },
  ]

  beforeEach(() => {
    $skills.set(null)
    $skillsStatus.set('idle')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('loadSkills', () => {
    it('loading → ready and fills $skills on success', async () => {
      const getSkills = vi.fn(async () => SAMPLE)
      await loadSkills({ getSkills })
      expect(getSkills).toHaveBeenCalledTimes(1)
      expect($skills.get()).toEqual(SAMPLE)
      expect($skillsStatus.get()).toBe('ready')
    })

    it('sets empty when the backend returns no skills', async () => {
      const getSkills = vi.fn(async () => [] as SkillInfo[])
      await loadSkills({ getSkills })
      expect($skillsStatus.get()).toBe('empty')
      expect($skills.get()).toEqual([])
    })

    it('sets error when the fetch throws', async () => {
      const getSkills = vi.fn(async () => {
        throw new Error('boom')
      })
      await loadSkills({ getSkills })
      expect($skillsStatus.get()).toBe('error')
    })
  })

  describe('toggleSkillEnabled', () => {
    it('calls toggleSkill with name+enabled then re-fetches via getSkills', async () => {
      const toggleSkill = vi.fn(async () => ({ ok: true, name: 'code-review', enabled: true }))
      const getSkills = vi.fn(async () => SAMPLE)
      await toggleSkillEnabled('code-review', true, { toggleSkill, getSkills })
      expect(toggleSkill).toHaveBeenCalledWith('code-review', true)
      expect(getSkills).toHaveBeenCalledTimes(1)
      expect($skillsStatus.get()).toBe('ready')
    })
  })
  ```

- [ ] **Step 1.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-store.test.ts`
  Expected: failure with `Failed to resolve import "./skills-store"` (file does not exist yet).

- [ ] **Step 1.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/domain/skills/skills-types.ts`:
  ```ts
  // apps/desktop/src/aether/domain/skills/skills-types.ts
  // Hub + content response shapes. Mirrors the contract in web/src/lib/api.ts
  // (logic source of truth) — desktop has no named hub/content API helpers, so
  // the stores call window.aetherDesktop.api({ path }) directly and type the
  // result with these. Do NOT import from web/*.

  export interface SkillHubResult {
    name: string
    description: string
    source: string
    identifier: string
    trust_level: string
    repo: string | null
    tags: string[]
  }

  export interface SkillHubInstalledEntry {
    name: string | null
    trust_level: string | null
    scan_verdict: string | null
  }

  export interface SkillHubSearchResponse {
    results: SkillHubResult[]
    source_counts: Record<string, number>
    timed_out: string[]
    installed: Record<string, SkillHubInstalledEntry>
  }

  export interface SkillHubActionResponse {
    name: string
    ok: boolean
    pid: number | null
    error?: string
    message?: string
    update_command?: string
  }

  export interface SkillContent {
    name: string
    content: string
    path: string
  }

  export interface SkillWriteResult {
    success: boolean
    message?: string
    path?: string
    error?: string
  }
  ```
  Create `apps/desktop/src/aether/domain/skills/skills-store.ts`:
  ```ts
  // apps/desktop/src/aether/domain/skills/skills-store.ts
  import { atom } from 'nanostores'

  import { getSkills as apiGetSkills, toggleSkill as apiToggleSkill } from '@/aether-api'
  import type { SkillInfo } from '@/types/aether'

  export type SkillsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

  export const $skills = atom<SkillInfo[] | null>(null)
  export const $skillsStatus = atom<SkillsStatus>('idle')

  export async function loadSkills(deps: { getSkills?: typeof apiGetSkills } = {}): Promise<void> {
    const getSkills = deps.getSkills ?? apiGetSkills
    $skillsStatus.set('loading')

    try {
      const skills = await getSkills()
      $skills.set(skills)
      $skillsStatus.set(skills.length > 0 ? 'ready' : 'empty')
    } catch {
      $skillsStatus.set('error')
    }
  }

  // REST-only mutation: write the toggle, then re-fetch so the atom reflects the
  // backend's authoritative state (no socket subscription — prompt-cache safe).
  export async function toggleSkillEnabled(
    name: string,
    enabled: boolean,
    deps: { toggleSkill?: typeof apiToggleSkill; getSkills?: typeof apiGetSkills } = {}
  ): Promise<void> {
    const toggleSkill = deps.toggleSkill ?? apiToggleSkill
    await toggleSkill(name, enabled)
    await loadSkills({ getSkills: deps.getSkills })
  }
  ```

- [ ] **Step 1.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-store.test.ts`
  Expected: `Test Files  1 passed`, `Tests  5 passed`.

- [ ] **Step 1.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/skills/skills-types.ts \
          apps/desktop/src/aether/domain/skills/skills-store.ts \
          apps/desktop/src/aether/domain/skills/skills-store.test.ts
  git commit -m "feat(desktop): add AETHER skills store (load + toggle, REST-only)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 2 — Skills screen: list + skeleton/empty/error

**Files:**
- Create `apps/desktop/src/aether/ui/screens/skills-screen.tsx`
- Test `apps/desktop/src/aether/ui/screens/skills-screen.test.tsx`

**Interfaces:**
- Consumes: `$skills`, `$skillsStatus`, `loadSkills` from `@/aether/domain/skills/skills-store`; `GlassSlab`.
- Produces: `export function SkillsScreen(): JSX.Element`.

- [ ] **Step 2.1 — Write the failing test.**
  Create `apps/desktop/src/aether/ui/screens/skills-screen.test.tsx`:
  ```tsx
  import { cleanup, render, screen } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it } from 'vitest'

  import { $skills, $skillsStatus } from '@/aether/domain/skills/skills-store'
  import type { SkillInfo } from '@/types/aether'

  import { SkillsScreen } from './skills-screen'

  const SAMPLE: SkillInfo[] = [
    { name: 'deep-research', description: 'Nghiên cứu sâu', category: 'research', enabled: true },
    { name: 'code-review', description: 'Rà soát code', category: 'dev', enabled: false },
  ]

  afterEach(cleanup)

  describe('SkillsScreen — list states', () => {
    beforeEach(() => {
      $skills.set(SAMPLE)
      $skillsStatus.set('ready')
    })

    it('renders a card with name, description and category badge per skill', () => {
      render(<SkillsScreen />)
      expect(screen.getByText('deep-research')).toBeTruthy()
      expect(screen.getByText('Nghiên cứu sâu')).toBeTruthy()
      expect(screen.getAllByTestId('ae-skill-card')).toHaveLength(2)
      expect(screen.getByText('research')).toBeTruthy()
    })

    it('shows a Vietnamese empty state when there are no skills', () => {
      $skills.set([])
      $skillsStatus.set('empty')
      render(<SkillsScreen />)
      expect(screen.getByText(/Chưa có skill nào/)).toBeTruthy()
    })

    it('shows an inline error with a retry affordance on error', () => {
      $skills.set(null)
      $skillsStatus.set('error')
      render(<SkillsScreen />)
      expect(screen.getByText(/Không tải được/)).toBeTruthy()
      expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
    })

    it('shows a skeleton while loading', () => {
      $skills.set(null)
      $skillsStatus.set('loading')
      render(<SkillsScreen />)
      expect(screen.getByTestId('ae-skills-skeleton')).toBeTruthy()
    })
  })
  ```

- [ ] **Step 2.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: failure `Failed to resolve import "./skills-screen"`.

- [ ] **Step 2.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/ui/screens/skills-screen.tsx`:
  ```tsx
  // apps/desktop/src/aether/ui/screens/skills-screen.tsx
  import { useStore } from '@nanostores/react'
  import { useEffect } from 'react'

  import { $skills, $skillsStatus, loadSkills } from '@/aether/domain/skills/skills-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'
  import type { SkillInfo } from '@/types/aether'

  function SkillCard({ skill }: { skill: SkillInfo }) {
    return (
      <GlassSlab className="flex flex-col gap-2" data-testid="ae-skill-card" size="sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">{skill.name}</div>
            <div className="mt-1 line-clamp-2 text-[11.5px] leading-[1.35] text-[color:var(--ae-dim)]">
              {skill.description}
            </div>
          </div>
          <span
            className="flex-none rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.1em]"
            style={{
              background: 'rgba(120,195,245,.07)',
              border: '1px solid rgba(120,200,255,.18)',
              color: 'var(--ae-azure-soft)',
            }}
          >
            {skill.category}
          </span>
        </div>
      </GlassSlab>
    )
  }

  export function SkillsScreen() {
    const skills = useStore($skills)
    const status = useStore($skillsStatus)

    useEffect(() => {
      if ($skillsStatus.get() === 'idle') {
        void loadSkills()
      }
    }, [])

    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <div className="ae-grid-floor" />
        <div className="ae-vignette" />

        <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
          <div className="flex flex-col gap-[7px]">
            <div className="text-[24px] font-semibold leading-[1.05]">Skills</div>
            <div className="text-[12.5px] text-[color:var(--ae-dim)]">
              Bật/tắt và quản lý các skill của Agent.
            </div>
          </div>
        </div>

        {status === 'loading' && (
          <div
            className="z-[2] mt-4 grid grid-cols-2 gap-3.5"
            data-testid="ae-skills-skeleton"
          >
            {[0, 1, 2, 3].map(i => (
              <GlassSlab className="h-[78px] animate-pulse opacity-60" key={i} size="sm">
                <span className="sr-only">Đang tải…</span>
              </GlassSlab>
            ))}
          </div>
        )}

        {status === 'error' && (
          <GlassSlab className="z-[2] mt-4 flex items-center justify-between gap-3" size="md">
            <span className="text-[12.5px]" style={{ color: 'var(--ae-warn)' }}>
              Không tải được danh sách skill.
            </span>
            <button
              className="flex-none rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
              onClick={() => void loadSkills()}
              style={{
                background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
                border: '1px solid rgba(120,210,255,.34)',
              }}
              type="button"
            >
              Thử lại
            </button>
          </GlassSlab>
        )}

        {status === 'empty' && (
          <GlassSlab className="z-[2] mt-4 text-center" size="lg">
            <div className="text-[13px] font-semibold text-white">Chưa có skill nào</div>
            <div className="mt-1 text-[11.5px] text-[color:var(--ae-dim)]">
              Cài thêm skill từ Hub bên dưới.
            </div>
          </GlassSlab>
        )}

        {status === 'ready' && (
          <div className="z-[2] mt-4 grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3.5 overflow-auto">
            {(skills ?? []).map(s => (
              <SkillCard key={s.name} skill={s} />
            ))}
          </div>
        )}
      </div>
    )
  }
  ```
  > Note: `GlassSlab` spreads only `size`/`className`/`children`. To attach `data-testid` to the slab, extend `GlassSlab` to forward `data-testid` (see Step 2.3a) — do NOT wrap in an extra div (would double-pad).

- [ ] **Step 2.3a — Allow `data-testid` passthrough on GlassSlab.**
  Modify `apps/desktop/src/aether/ui/components/glass-slab.tsx` to accept and forward an optional `data-testid`:
  ```tsx
  import { cn } from '@/lib/utils'

  export function GlassSlab({
    size = 'md',
    className,
    children,
    'data-testid': dataTestid,
  }: {
    size?: 'sm' | 'md' | 'lg'
    className?: string
    children: React.ReactNode
    'data-testid'?: string
  }) {
    return (
      <div
        className={cn('ae-slab', className)}
        data-testid={dataTestid}
        style={{ ['--ae-slab-pad' as string]: `var(--ae-slab-pad-${size})` }}
      >
        {children}
      </div>
    )
  }
  ```

- [ ] **Step 2.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: `Tests  4 passed`.

- [ ] **Step 2.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/screens/skills-screen.tsx \
          apps/desktop/src/aether/ui/screens/skills-screen.test.tsx \
          apps/desktop/src/aether/ui/components/glass-slab.tsx
  git commit -m "feat(desktop): AETHER skills screen list + skeleton/empty/error

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 3 — Enable/disable interaction on a card

**Files:**
- Modify `apps/desktop/src/aether/ui/screens/skills-screen.tsx`
- Modify `apps/desktop/src/aether/ui/screens/skills-screen.test.tsx`

**Interfaces:**
- Consumes: `toggleSkillEnabled(name, enabled)` from the store (default deps → real `toggleSkill`/`getSkills`, which use `window.aetherDesktop.api`).
- Produces: per-card toggle `<button role="switch" aria-checked>`.

- [ ] **Step 3.1 — Write the failing interaction test.**
  Append to `apps/desktop/src/aether/ui/screens/skills-screen.test.tsx` (add `fireEvent`, `vi`, `waitFor` to imports):
  ```tsx
  import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
  ```
  Then add a new describe block:
  ```tsx
  describe('SkillsScreen — toggle interaction', () => {
    afterEach(() => {
      vi.restoreAllMocks()
      delete (window as { aetherDesktop?: unknown }).aetherDesktop
    })

    it('clicking a card switch calls /api/skills/toggle then re-fetches', async () => {
      // First call = toggle PUT; second call = re-fetch GET /api/skills.
      const api = vi
        .fn()
        .mockResolvedValueOnce({ ok: true, name: 'code-review', enabled: true })
        .mockResolvedValueOnce(SAMPLE.map(s => (s.name === 'code-review' ? { ...s, enabled: true } : s)))
      ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

      $skills.set(SAMPLE)
      $skillsStatus.set('ready')
      render(<SkillsScreen />)

      fireEvent.click(screen.getByRole('switch', { name: /code-review/ }))

      await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
      expect(api.mock.calls[0][0]).toMatchObject({
        path: '/api/skills/toggle',
        method: 'PUT',
        body: { name: 'code-review', enabled: true },
      })
      expect(api.mock.calls[1][0]).toMatchObject({ path: '/api/skills' })
    })
  })
  ```

- [ ] **Step 3.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: failure — `Unable to find an accessible element with the role "switch"`.

- [ ] **Step 3.3 — Minimal implementation.**
  In `skills-screen.tsx`, import the action and add a toggle to `SkillCard`:
  ```tsx
  import { $skills, $skillsStatus, loadSkills, toggleSkillEnabled } from '@/aether/domain/skills/skills-store'
  ```
  Replace `SkillCard` with:
  ```tsx
  function SkillCard({ skill }: { skill: SkillInfo }) {
    return (
      <GlassSlab className="flex flex-col gap-2" data-testid="ae-skill-card" size="sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-white">{skill.name}</div>
            <div className="mt-1 line-clamp-2 text-[11.5px] leading-[1.35] text-[color:var(--ae-dim)]">
              {skill.description}
            </div>
          </div>
          <span
            className="flex-none rounded-full px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.1em]"
            style={{
              background: 'rgba(120,195,245,.07)',
              border: '1px solid rgba(120,200,255,.18)',
              color: 'var(--ae-azure-soft)',
            }}
          >
            {skill.category}
          </span>
        </div>
        <button
          aria-checked={skill.enabled}
          aria-label={`${skill.enabled ? 'Tắt' : 'Bật'} ${skill.name}`}
          className="mt-auto flex items-center gap-2 self-start rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
          onClick={() => void toggleSkillEnabled(skill.name, !skill.enabled)}
          role="switch"
          style={{
            background: skill.enabled
              ? 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))'
              : 'rgba(120,195,245,.04)',
            border: `1px solid ${skill.enabled ? 'rgba(120,210,255,.34)' : 'rgba(120,200,255,.12)'}`,
            color: skill.enabled ? 'var(--ae-azure-soft)' : 'var(--ae-dim)',
          }}
          type="button"
        >
          <span
            className="h-[7px] w-[7px] rounded-full"
            style={{
              background: skill.enabled ? 'var(--ae-ok)' : 'var(--ae-dim)',
              boxShadow: skill.enabled ? '0 0 8px var(--ae-ok)' : 'none',
            }}
          />
          {skill.enabled ? 'Đã bật' : 'Đã tắt'}
        </button>
      </GlassSlab>
    )
  }
  ```

- [ ] **Step 3.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: all tests pass (list states + toggle interaction).

- [ ] **Step 3.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/screens/skills-screen.tsx \
          apps/desktop/src/aether/ui/screens/skills-screen.test.tsx
  git commit -m "feat(desktop): AETHER skills card enable/disable toggle (REST + re-fetch)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 4 — Skills Hub: search / install / update

**Files:**
- Create `apps/desktop/src/aether/domain/skills/skills-hub-store.ts`
- Test `apps/desktop/src/aether/domain/skills/skills-hub-store.test.ts`
- Create `apps/desktop/src/aether/ui/screens/skills-hub-panel.tsx`
- Test `apps/desktop/src/aether/ui/screens/skills-hub-panel.test.tsx`
- Modify `apps/desktop/src/aether/ui/screens/skills-screen.tsx` (mount the panel)

**Interfaces:**
- Consumes: raw `window.aetherDesktop.api` (default), injectable via `deps.api: <T>(req: AetherApiRequest) => Promise<T>`.
- Produces:
  ```ts
  export const $hubResults: WritableAtom<SkillHubResult[]>
  export const $hubInstalled: WritableAtom<Record<string, SkillHubInstalledEntry>>
  export const $hubStatus: WritableAtom<'idle'|'searching'|'ready'|'empty'|'error'>
  export const $hubBusy: WritableAtom<string | null>   // identifier mid-install, or '__update__'
  export function searchHub(q: string, deps?): Promise<void>
  export function installFromHub(identifier: string, deps?): Promise<SkillHubActionResponse>
  export function updateHub(deps?): Promise<SkillHubActionResponse>
  ```
  After a successful install/update, the action calls `loadSkills()` from `skills-store` so the installed list refreshes (REST re-fetch — no socket).

- [ ] **Step 4.1 — Write the failing store test.**
  Create `apps/desktop/src/aether/domain/skills/skills-hub-store.test.ts`:
  ```ts
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
      const api = vi.fn(async () => ({ name: 'install', ok: true, pid: 1 }) as never)
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
      const api = vi.fn(async () => ({ name: 'update', ok: true, pid: 2 }) as never)
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
  ```

- [ ] **Step 4.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-hub-store.test.ts`
  Expected: failure `Failed to resolve import "./skills-hub-store"`.

- [ ] **Step 4.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/domain/skills/skills-hub-store.ts`:
  ```ts
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
  ```

- [ ] **Step 4.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-hub-store.test.ts`
  Expected: `Tests  6 passed`.

- [ ] **Step 4.5 — Write the failing panel render/interaction test.**
  Create `apps/desktop/src/aether/ui/screens/skills-hub-panel.test.tsx`:
  ```tsx
  import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import { $hubResults, $hubStatus } from '@/aether/domain/skills/skills-hub-store'
  import type { SkillHubResult } from '@/aether/domain/skills/skills-types'

  import { SkillsHubPanel } from './skills-hub-panel'

  const RESULT: SkillHubResult = {
    name: 'pdf-tools',
    description: 'Đọc/ghi PDF',
    source: 'aether-index',
    identifier: 'official/pdf-tools',
    trust_level: 'official',
    repo: null,
    tags: ['pdf'],
  }

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (window as { aetherDesktop?: unknown }).aetherDesktop
  })

  describe('SkillsHubPanel', () => {
    beforeEach(() => {
      $hubResults.set([])
      $hubStatus.set('idle')
    })

    it('submitting the search box GETs the hub search endpoint', async () => {
      const api = vi.fn().mockResolvedValue({ results: [RESULT], source_counts: {}, timed_out: [], installed: {} })
      ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

      render(<SkillsHubPanel />)
      fireEvent.change(screen.getByPlaceholderText(/Tìm skill/), { target: { value: 'pdf' } })
      fireEvent.submit(screen.getByTestId('ae-hub-search-form'))

      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
      expect(api.mock.calls[0][0].path).toContain('/api/skills/hub/search?q=pdf')
    })

    it('renders a result row with an install button and trust badge', () => {
      $hubResults.set([RESULT])
      $hubStatus.set('ready')
      render(<SkillsHubPanel />)
      expect(screen.getByText('pdf-tools')).toBeTruthy()
      expect(screen.getByText('official')).toBeTruthy()
      expect(screen.getByRole('button', { name: /Cài đặt/ })).toBeTruthy()
    })

    it('clicking install POSTs the install endpoint', async () => {
      const api = vi
        .fn()
        .mockResolvedValueOnce({ name: 'install', ok: true, pid: 1 }) // install
        .mockResolvedValueOnce([]) // loadSkills re-fetch GET /api/skills
      ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

      $hubResults.set([RESULT])
      $hubStatus.set('ready')
      render(<SkillsHubPanel />)
      fireEvent.click(screen.getByRole('button', { name: /Cài đặt/ }))

      await waitFor(() => expect(api.mock.calls[0][0].path).toBe('/api/skills/hub/install'))
      expect(api.mock.calls[0][0].body).toEqual({ identifier: 'official/pdf-tools' })
    })

    it('the Update-all button POSTs the update endpoint', async () => {
      const api = vi
        .fn()
        .mockResolvedValueOnce({ name: 'update', ok: true, pid: 2 })
        .mockResolvedValueOnce([])
      ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

      render(<SkillsHubPanel />)
      fireEvent.click(screen.getByRole('button', { name: /Cập nhật tất cả/ }))

      await waitFor(() => expect(api.mock.calls[0][0].path).toBe('/api/skills/hub/update'))
    })
  })
  ```

- [ ] **Step 4.6 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-hub-panel.test.tsx`
  Expected: failure `Failed to resolve import "./skills-hub-panel"`.

- [ ] **Step 4.7 — Minimal implementation.**
  Create `apps/desktop/src/aether/ui/screens/skills-hub-panel.tsx`:
  ```tsx
  // apps/desktop/src/aether/ui/screens/skills-hub-panel.tsx
  import { useStore } from '@nanostores/react'
  import { useState } from 'react'

  import {
    $hubBusy,
    $hubResults,
    $hubStatus,
    installFromHub,
    searchHub,
    updateHub,
  } from '@/aether/domain/skills/skills-hub-store'
  import type { SkillHubResult } from '@/aether/domain/skills/skills-types'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'

  function HubRow({ result }: { result: SkillHubResult }) {
    const busy = useStore($hubBusy)
    const installing = busy === result.identifier

    return (
      <div
        className="flex items-center gap-3 rounded-[11px] p-[9px_11px]"
        data-testid="ae-hub-row"
        style={{
          background: 'linear-gradient(160deg,rgba(120,195,245,.06),rgba(120,195,245,.02))',
          border: '1px solid rgba(120,200,255,.1)',
        }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-semibold text-white">{result.name}</span>
            <span
              className="flex-none rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[.1em]"
              style={{ background: 'rgba(120,195,245,.07)', color: 'var(--ae-azure-soft)' }}
            >
              {result.trust_level}
            </span>
          </div>
          <div className="mt-0.5 line-clamp-1 text-[11px] text-[color:var(--ae-dim)]">
            {result.description}
          </div>
        </div>
        <button
          className="flex-none rounded-[9px] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
          disabled={installing}
          onClick={() => void installFromHub(result.identifier)}
          style={{
            background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
            border: '1px solid rgba(120,210,255,.34)',
            color: 'var(--ae-azure-soft)',
          }}
          type="button"
        >
          {installing ? 'Đang cài…' : 'Cài đặt'}
        </button>
      </div>
    )
  }

  export function SkillsHubPanel() {
    const results = useStore($hubResults)
    const status = useStore($hubStatus)
    const busy = useStore($hubBusy)
    const [query, setQuery] = useState('')

    return (
      <GlassSlab className="z-[2] mt-4 flex min-h-0 flex-col gap-3" size="md">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            Hub skill
          </div>
          <button
            className="flex-none rounded-[9px] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
            disabled={busy === '__update__'}
            onClick={() => void updateHub()}
            style={{ background: 'rgba(120,195,245,.06)', border: '1px solid rgba(120,200,255,.18)' }}
            type="button"
          >
            {busy === '__update__' ? 'Đang cập nhật…' : 'Cập nhật tất cả'}
          </button>
        </div>

        <form
          className="flex items-center gap-2"
          data-testid="ae-hub-search-form"
          onSubmit={e => {
            e.preventDefault()
            void searchHub(query)
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-[10px] px-3 py-1.5 text-[12px] text-white outline-none"
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm skill trong Hub…"
            style={{ background: 'rgba(8,24,46,.55)', border: '1px solid rgba(120,200,255,.16)' }}
            value={query}
          />
          <button
            className="flex-none rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
            style={{
              background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
              border: '1px solid rgba(120,210,255,.34)',
              color: 'var(--ae-azure-soft)',
            }}
            type="submit"
          >
            Tìm
          </button>
        </form>

        <div className="flex min-h-0 flex-col gap-2 overflow-auto">
          {status === 'searching' && (
            <div className="text-[11.5px] text-[color:var(--ae-dim)]">Đang tìm…</div>
          )}
          {status === 'empty' && (
            <div className="text-[11.5px] text-[color:var(--ae-dim)]">Không tìm thấy skill phù hợp.</div>
          )}
          {status === 'error' && (
            <div className="text-[11.5px]" style={{ color: 'var(--ae-warn)' }}>
              Lỗi tìm kiếm Hub. Thử lại.
            </div>
          )}
          {status === 'ready' && results.map(r => <HubRow key={r.identifier} result={r} />)}
        </div>
      </GlassSlab>
    )
  }
  ```

- [ ] **Step 4.8 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-hub-panel.test.tsx`
  Expected: `Tests  4 passed`.

- [ ] **Step 4.9 — Mount the panel in the screen.**
  In `apps/desktop/src/aether/ui/screens/skills-screen.tsx`, add the import and render the panel below the list grid (inside the root `div`, after the `status === 'ready'` block — the panel is always visible so the user can install even when the list is empty/error):
  ```tsx
  import { SkillsHubPanel } from './skills-hub-panel'
  ```
  Add just before the closing `</div>` of the root:
  ```tsx
        <SkillsHubPanel />
  ```

- [ ] **Step 4.10 — Run the screen test again, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: still green (the panel's own `searchHub` does nothing without a query; mount triggers no extra API call). If a render test now sees an unexpected `window.aetherDesktop` access, confirm the panel makes NO call on mount (it does not).

- [ ] **Step 4.11 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/skills/skills-hub-store.ts \
          apps/desktop/src/aether/domain/skills/skills-hub-store.test.ts \
          apps/desktop/src/aether/ui/screens/skills-hub-panel.tsx \
          apps/desktop/src/aether/ui/screens/skills-hub-panel.test.tsx \
          apps/desktop/src/aether/ui/screens/skills-screen.tsx
  git commit -m "feat(desktop): AETHER skills hub panel (search/install/update, REST-only)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 5 — Inline SKILL.md editor (content GET/PUT) + prompt-cache guard

**Files:**
- Create `apps/desktop/src/aether/domain/skills/skills-content-store.ts`
- Test `apps/desktop/src/aether/domain/skills/skills-content-store.test.ts`
- Create `apps/desktop/src/aether/ui/screens/skill-editor.tsx`
- Test `apps/desktop/src/aether/ui/screens/skill-editor.test.tsx`
- Modify `apps/desktop/src/aether/ui/screens/skills-screen.tsx` (open editor from a card)

**Interfaces:**
- Consumes: raw `window.aetherDesktop.api` (default), injectable via `deps.api`.
- Produces:
  ```ts
  export const $editorSkill: WritableAtom<string | null>     // name of the skill being edited, or null
  export const $editorContent: WritableAtom<string>
  export const $editorStatus: WritableAtom<'idle'|'loading'|'ready'|'saving'|'error'>
  export function openEditor(name: string, deps?): Promise<void>   // GET /api/skills/content?name=
  export function closeEditor(): void
  export function setEditorContent(value: string): void
  export function saveEditor(deps?): Promise<SkillWriteResult>     // PUT /api/skills/content
  ```

- [ ] **Step 5.1 — Write the failing content-store test.**
  Create `apps/desktop/src/aether/domain/skills/skills-content-store.test.ts`:
  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import type { AetherApiRequest } from '@/global'

  import {
    $editorContent,
    $editorSkill,
    $editorStatus,
    closeEditor,
    openEditor,
    saveEditor,
  } from './skills-content-store'
  import type { SkillContent, SkillWriteResult } from './skills-types'

  const CONTENT: SkillContent = {
    name: 'deep-research',
    content: '# Deep research\nNội dung skill.',
    path: '/skills/deep-research/SKILL.md',
  }

  beforeEach(() => {
    $editorSkill.set(null)
    $editorContent.set('')
    $editorStatus.set('idle')
  })
  afterEach(() => vi.restoreAllMocks())

  describe('openEditor', () => {
    it('GETs /api/skills/content?name= and fills the editor', async () => {
      const api = vi.fn(async (_req: AetherApiRequest) => CONTENT as never)
      await openEditor('deep-research', { api })
      expect(api.mock.calls[0][0]).toMatchObject({
        path: '/api/skills/content?name=deep-research',
      })
      expect($editorSkill.get()).toBe('deep-research')
      expect($editorContent.get()).toBe(CONTENT.content)
      expect($editorStatus.get()).toBe('ready')
    })

    it('sets error when the read fails', async () => {
      const api = vi.fn(async () => {
        throw new Error('404')
      })
      await openEditor('nope', { api })
      expect($editorStatus.get()).toBe('error')
    })
  })

  describe('saveEditor', () => {
    it('PUTs /api/skills/content with name + edited content', async () => {
      const written: SkillWriteResult = { success: true, path: CONTENT.path }
      const api = vi.fn(async () => written as never)
      $editorSkill.set('deep-research')
      $editorContent.set('# edited')
      const res = await saveEditor({ api })
      expect(api.mock.calls[0][0]).toMatchObject({
        path: '/api/skills/content',
        method: 'PUT',
        body: { name: 'deep-research', content: '# edited' },
      })
      expect(res.success).toBe(true)
      expect($editorStatus.get()).toBe('ready')
    })
  })

  describe('closeEditor', () => {
    it('resets editor atoms', () => {
      $editorSkill.set('x')
      $editorContent.set('y')
      $editorStatus.set('ready')
      closeEditor()
      expect($editorSkill.get()).toBeNull()
      expect($editorContent.get()).toBe('')
      expect($editorStatus.get()).toBe('idle')
    })
  })
  ```

- [ ] **Step 5.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-content-store.test.ts`
  Expected: failure `Failed to resolve import "./skills-content-store"`.

- [ ] **Step 5.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/domain/skills/skills-content-store.ts`:
  ```ts
  // apps/desktop/src/aether/domain/skills/skills-content-store.ts
  import { atom } from 'nanostores'

  import type { SkillContent, SkillWriteResult } from './skills-types'

  export type EditorStatus = 'idle' | 'loading' | 'ready' | 'saving' | 'error'

  type ApiFn = typeof window.aetherDesktop.api

  export const $editorSkill = atom<string | null>(null)
  export const $editorContent = atom<string>('')
  export const $editorStatus = atom<EditorStatus>('idle')

  function resolveApi(deps: { api?: ApiFn }): ApiFn {
    return deps.api ?? window.aetherDesktop.api
  }

  export async function openEditor(name: string, deps: { api?: ApiFn } = {}): Promise<void> {
    const api = resolveApi(deps)
    $editorSkill.set(name)
    $editorContent.set('')
    $editorStatus.set('loading')

    try {
      const res = await api<SkillContent>({
        path: `/api/skills/content?name=${encodeURIComponent(name)}`,
      })
      $editorContent.set(res.content)
      $editorStatus.set('ready')
    } catch {
      $editorStatus.set('error')
    }
  }

  export function setEditorContent(value: string): void {
    $editorContent.set(value)
  }

  export function closeEditor(): void {
    $editorSkill.set(null)
    $editorContent.set('')
    $editorStatus.set('idle')
  }

  export async function saveEditor(deps: { api?: ApiFn } = {}): Promise<SkillWriteResult> {
    const api = resolveApi(deps)
    const name = $editorSkill.get()

    if (!name) {
      throw new Error('No skill open in the editor')
    }

    $editorStatus.set('saving')

    try {
      const res = await api<SkillWriteResult>({
        path: '/api/skills/content',
        method: 'PUT',
        body: { name, content: $editorContent.get() },
      })
      $editorStatus.set('ready')

      return res
    } catch (err) {
      $editorStatus.set('error')
      throw err
    }
  }
  ```

- [ ] **Step 5.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/skills/skills-content-store.test.ts`
  Expected: `Tests  4 passed`.

- [ ] **Step 5.5 — Write the failing editor render + prompt-cache guard test.**
  Create `apps/desktop/src/aether/ui/screens/skill-editor.test.tsx`:
  ```tsx
  import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
  import { readFileSync } from 'node:fs'
  import { dirname, resolve } from 'node:path'
  import { fileURLToPath } from 'node:url'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import { $editorContent, $editorSkill, $editorStatus } from '@/aether/domain/skills/skills-content-store'

  import { SkillEditor } from './skill-editor'

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    delete (window as { aetherDesktop?: unknown }).aetherDesktop
  })

  describe('SkillEditor', () => {
    beforeEach(() => {
      $editorSkill.set('deep-research')
      $editorContent.set('# Deep research')
      $editorStatus.set('ready')
    })

    it('shows the skill name and current content in a textarea', () => {
      render(<SkillEditor />)
      expect(screen.getByText(/deep-research/)).toBeTruthy()
      expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('# Deep research')
    })

    it('Save PUTs the edited content', async () => {
      const api = vi.fn().mockResolvedValue({ success: true })
      ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

      render(<SkillEditor />)
      fireEvent.change(screen.getByRole('textbox'), { target: { value: '# Edited body' } })
      fireEvent.click(screen.getByRole('button', { name: /Lưu/ }))

      await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
      expect(api.mock.calls[0][0]).toMatchObject({
        path: '/api/skills/content',
        method: 'PUT',
        body: { name: 'deep-research', content: '# Edited body' },
      })
    })

    it('renders nothing when no skill is open', () => {
      $editorSkill.set(null)
      const { container } = render(<SkillEditor />)
      expect(container.firstChild).toBeNull()
    })

    // PROMPT-CACHE GUARD (HARD): a non-chat settings screen must never touch the
    // conversation stream. We assert by source inspection — the cheapest robust
    // signal — that the editor module subscribes to no conversation-delta event
    // and never calls appendAssistantDelta, so editing a skill cannot re-trigger
    // the LLM or invalidate the prompt cache.
    it('does not subscribe to conversation deltas or append assistant text', () => {
      const here = dirname(fileURLToPath(import.meta.url))
      const sources = [
        readFileSync(resolve(here, 'skill-editor.tsx'), 'utf8'),
        readFileSync(resolve(here, '../../domain/skills/skills-content-store.ts'), 'utf8'),
        readFileSync(resolve(here, '../../domain/skills/skills-hub-store.ts'), 'utf8'),
        readFileSync(resolve(here, '../../domain/skills/skills-store.ts'), 'utf8'),
      ].join('\n')

      expect(sources).not.toMatch(/appendAssistantDelta/)
      expect(sources).not.toMatch(/message\.delta/)
      expect(sources).not.toMatch(/reasoning\.delta/)
      expect(sources).not.toMatch(/thinking\./)
    })
  })
  ```

- [ ] **Step 5.6 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skill-editor.test.tsx`
  Expected: failure `Failed to resolve import "./skill-editor"`.

- [ ] **Step 5.7 — Minimal implementation.**
  Create `apps/desktop/src/aether/ui/screens/skill-editor.tsx`:
  ```tsx
  // apps/desktop/src/aether/ui/screens/skill-editor.tsx
  import { useStore } from '@nanostores/react'

  import {
    $editorContent,
    $editorSkill,
    $editorStatus,
    closeEditor,
    saveEditor,
    setEditorContent,
  } from '@/aether/domain/skills/skills-content-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'

  export function SkillEditor() {
    const skill = useStore($editorSkill)
    const content = useStore($editorContent)
    const status = useStore($editorStatus)

    if (!skill) {
      return null
    }

    return (
      <div
        className="absolute inset-0 z-[40] grid place-items-center bg-[rgba(2,12,29,.55)] backdrop-blur-sm"
        onClick={() => closeEditor()}
      >
        <GlassSlab
          className="flex max-h-[78vh] w-[min(720px,90vw)] flex-col gap-3"
          size="lg"
        >
          <div className="flex items-center justify-between gap-3" onClick={e => e.stopPropagation()}>
            <div className="text-[13px] font-semibold text-white">
              Sửa skill · <span className="text-[color:var(--ae-azure-soft)]">{skill}</span>
            </div>
            <button
              aria-label="Đóng"
              className="rounded-[8px] px-2 py-1 text-[12px] text-[color:var(--ae-dim)]"
              onClick={() => closeEditor()}
              type="button"
            >
              Đóng
            </button>
          </div>

          {status === 'loading' && (
            <div className="text-[12px] text-[color:var(--ae-dim)]" onClick={e => e.stopPropagation()}>
              Đang tải nội dung…
            </div>
          )}

          {status === 'error' && (
            <div className="text-[12px]" onClick={e => e.stopPropagation()} style={{ color: 'var(--ae-warn)' }}>
              Không đọc/ghi được nội dung skill.
            </div>
          )}

          {status !== 'loading' && (
            <textarea
              className="min-h-[320px] flex-1 resize-none rounded-[10px] p-3 font-mono text-[12px] leading-[1.5] text-white outline-none"
              onChange={e => setEditorContent(e.target.value)}
              onClick={e => e.stopPropagation()}
              spellCheck={false}
              style={{ background: 'rgba(8,24,46,.6)', border: '1px solid rgba(120,200,255,.16)' }}
              value={content}
            />
          )}

          <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50"
              disabled={status === 'saving'}
              onClick={() => void saveEditor()}
              style={{
                background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
                border: '1px solid rgba(120,210,255,.34)',
                color: 'var(--ae-azure-soft)',
              }}
              type="button"
            >
              {status === 'saving' ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </GlassSlab>
      </div>
    )
  }
  ```

- [ ] **Step 5.8 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skill-editor.test.tsx`
  Expected: `Tests  4 passed` (render, save, empty, prompt-cache guard).

- [ ] **Step 5.9 — Wire the editor open trigger into the card + mount the modal.**
  In `apps/desktop/src/aether/ui/screens/skills-screen.tsx`:
  Add imports:
  ```tsx
  import { openEditor } from '@/aether/domain/skills/skills-content-store'
  import { SkillEditor } from './skill-editor'
  ```
  In `SkillCard`, add an "Sửa" (edit) button next to the toggle (inside the `mt-auto` row — change the toggle wrapper to a flex row containing both):
  ```tsx
        <div className="mt-auto flex items-center gap-2">
          {/* existing toggle button (role="switch") goes here, drop its `mt-auto self-start` classes */}
          <button
            className="rounded-[9px] px-2.5 py-1 text-[11px] font-semibold"
            onClick={() => void openEditor(skill.name)}
            style={{ background: 'rgba(120,195,245,.05)', border: '1px solid rgba(120,200,255,.14)', color: 'var(--ae-dim)' }}
            type="button"
          >
            Sửa
          </button>
        </div>
  ```
  Mount the modal once at the end of the root `div` (after `<SkillsHubPanel />`):
  ```tsx
        <SkillEditor />
  ```

- [ ] **Step 5.10 — Run the screen test, expect PASS (no regressions).**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/skills-screen.test.tsx`
  Expected: still green. (`SkillEditor` returns `null` when `$editorSkill` is null, so it adds nothing to the default render.)

- [ ] **Step 5.11 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/skills/skills-content-store.ts \
          apps/desktop/src/aether/domain/skills/skills-content-store.test.ts \
          apps/desktop/src/aether/ui/screens/skill-editor.tsx \
          apps/desktop/src/aether/ui/screens/skill-editor.test.tsx \
          apps/desktop/src/aether/ui/screens/skills-screen.tsx
  git commit -m "feat(desktop): AETHER inline skill editor (content GET/PUT) + prompt-cache guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 6 — Swap the stub route for the real screen

**Files:**
- Modify `apps/desktop/src/aether/ui/shell/aether-shell.tsx`

**Interfaces:**
- Consumes: `SkillsScreen` from `@/aether/ui/screens/skills-screen`.
- Produces: `<Route element={<SkillsScreen />} path="skills" />`.

- [ ] **Step 6.1 — Make the change.**
  In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add the import:
  ```tsx
  import { SkillsScreen } from '@/aether/ui/screens/skills-screen'
  ```
  Replace:
  ```tsx
  <Route element={<StubScreen title="Skills" />} path="skills" />
  ```
  with:
  ```tsx
  <Route element={<SkillsScreen />} path="skills" />
  ```

- [ ] **Step 6.2 — Run the full UI suite, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui`
  Expected: whole `vitest run --environment jsdom` suite green (all new skills tests + existing tests). Note that the route swap has no dedicated test — its correctness is the imported `SkillsScreen` rendering, already covered by Task 2/3. Confirm no remaining reference to `StubScreen title="Skills"` exists: `grep -n 'title="Skills"' apps/desktop/src/aether/ui/shell/aether-shell.tsx` returns nothing.

- [ ] **Step 6.3 — Typecheck.**
  Command: `cd apps/desktop && npx tsc --noEmit`
  Expected: no errors (confirms the `GlassSlab` `data-testid` prop, store imports, and types line up). If `tsc` is not wired as a script, this invocation still uses the local `tsconfig.json`.

- [ ] **Step 6.4 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/shell/aether-shell.tsx
  git commit -m "feat(desktop): mount AETHER SkillsScreen on /skills (replace stub)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 7 (optional, only if trivial) — ⌘K "Skills: bật/tắt…" item

> Only do this if a command-palette registry already exists and accepting a new item is a one-liner. Otherwise SKIP and leave it to the dedicated command-palette plan.

- [ ] **Step 7.1 — Check for an existing palette registry.**
  Command: `grep -rln "command-palette\|commandPalette\|⌘K\|registerCommand" apps/desktop/src`
  - If NOTHING relevant turns up, or wiring requires new infrastructure → **SKIP Task 7 entirely** (note it in the final report). Do not invent a palette.
  - If a simple registry exists, add a single navigate-to-`/skills` item labeled "Skills: bật/tắt…", with a focused test asserting the item dispatches navigation to `SKILLS_ROUTE`. Follow the same TDD loop (failing test → impl → pass → commit) and commit with the standard trailer.

---

## Self-Review vs spec §5.1 Skills bullets

Confirm before declaring done:

- **List + enable/disable** (`getSkills()`, `toggleSkill(name, enabled)`, card glass + provider/category badge):
  - ✅ List via `loadSkills()` → `getSkills()`; cards are `<GlassSlab>` with name + description + **category** badge (Task 2).
  - ✅ Enable/disable via per-card `role="switch"` → `toggleSkillEnabled` → `toggleSkill` PUT `/api/skills/toggle` then REST re-fetch (Task 3).
  - ⚠️ Deviation to note in report: `SkillInfo` has **no `provider` field** (only name/description/category/enabled), so installed-skill cards badge **category**, not provider. Provider/trust info appears only on **hub** results, which the hub panel badges via `trust_level` (Task 4). This is a corrected-fact deviation from the spec's "provider/category badge" wording, driven by the actual type.

- **Hub: search/install/update** (`/api/skills/hub/*`):
  - ✅ `searchHub` → GET `/api/skills/hub/search?q=&source=all&limit=20`; `installFromHub` → POST `/api/skills/hub/install` `{identifier}`; `updateHub` → POST `/api/skills/hub/update` `{}` — all raw `window.aetherDesktop.api` (no desktop named helper exists), then re-fetch the installed list (Task 4).

- **Inline editor** (`/api/skills/content` GET/PUT):
  - ✅ `openEditor` → GET `/api/skills/content?name=`; `saveEditor` → PUT `/api/skills/content` `{name, content}` (Task 5).

- **Global constraints:**
  - ✅ No `web/src/pages/*` import; logic mirrored only.
  - ✅ Vietnamese UI throughout; "Agent" untranslated ("skill của Agent").
  - ✅ Colors via `--ae-*` tokens / inline rgba on the AETHER azure ramp; no new hardcoded brand hex outside tokens.
  - ✅ Prompt-cache safety: REST-only stores, no delta subscription, no `appendAssistantDelta` — enforced by the source-inspection guard test (Task 5, Step 5.5).
  - ✅ Layering: each screen/modal root uses `.ae-screen-bare …` / single gutter; padding via `<GlassSlab size>`; no wrapper double-pad (GlassSlab extended to forward `data-testid` instead of wrapping).
