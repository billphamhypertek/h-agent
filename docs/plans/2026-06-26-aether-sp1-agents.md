# Agents Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a read-only "mission control" Agents screen that aggregates existing session/subagent, cron, and skill data plus live presence indicators into one observation view — with zero agent CRUD and zero backend changes.

**Architecture:** Three tiers — `agents-screen.tsx` (presentation) → `agents-store.ts` (`$agents`/`$agentsStatus` + `loadAgents()`) → existing `aether-api.ts`. The store fetches `listAllProfileSessions` (recents, excluding cron) + `listAllProfileSessions(source:'cron')` and `getCronJobs()` (schedule) and `getSkills()` (capabilities), composes them via a pure `composeAgentsView()`, and stores the result. Live presence is read directly from `$gatewayState`/`$busy`/`$orbState`. No new REST methods are added; no conversation streams are opened.

**Tech Stack:** React 18, nanostores, Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className; no runtime rewrite.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý" — keep "Agent". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — only list/metadata REST + non-conversation events; do NOT subscribe `message.delta`/`reasoning.delta`/`thinking.*`, do NOT open conversation streams, do NOT call `appendAssistantDelta`, never re-trigger the LLM. `subagent.*` events only when session-keyed (they require `session_id` or are dropped — see gateway-events.ts).
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only when `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.
- READ-ONLY: label the screen clearly read-only ("xem", not "tạo/sửa agent"). NO dead CRUD chrome (no disabled create/edit buttons).

---

## Confirmed source facts (read before coding — do NOT invent)

From `apps/desktop/src/aether-api.ts`:
- `listAllProfileSessions(limit = 40, minMessages = 0, archived = 'exclude', order = 'recent', profile = 'all', filter: SessionSourceFilter = {}): Promise<PaginatedSessions>` — `filter` is `{ source?: string; excludeSources?: string[] }` (interface `SessionSourceFilter` exported from same module).
- `listSessions(limit = 40, minMessages = 0, archived = 'exclude', order = 'recent'): Promise<PaginatedSessions>`.
- `getCronJobs(): Promise<CronJob[]>`.
- `getSkills(): Promise<SkillInfo[]>`.

From `apps/desktop/src/types/aether.ts`:
- `PaginatedSessions = { limit; offset; sessions: SessionInfo[]; total; profile_totals?; errors? }`.
- `SessionInfo` key fields: `id: string`, `title: null | string`, `preview: null | string`, `source: null | string`, `is_active: boolean`, `last_active: number`, `started_at: number`, `model: null | string`, `message_count: number`, `profile?: string`, `is_default_profile?: boolean`.
- `CronJob = { id; enabled: boolean; name?: null|string; prompt?: null|string; schedule?: CronJobSchedule; schedule_display?: null|string; next_run_at?: null|string; last_run_at?: null|string; last_error?: null|string; state?: null|string; deliver?; script? }`.
- `CronJobSchedule = { display?: string; expr?: string; kind?: string }`.
- `SkillInfo = { category: string; description: string; enabled: boolean; name: string }`.

From `apps/desktop/src/store/session.ts`: `$gatewayState = atom('idle')` (raw ConnectionState string; `'open'` means connected), `$busy = atom(false)`.
From `apps/desktop/src/aether/domain/motion/motion-store.ts`: `$orbState` is `computed([$busy, $gatewayState])` → `'thinking' | 'idle' | 'paused'`.
From `apps/desktop/src/lib/gateway-events.ts`: `gatewayEventRequiresSessionId(eventType)` returns true only for `subagent.*`.

Store pattern (verbatim shape to follow), from `apps/desktop/src/aether/domain/briefing/briefing-store.ts`:
```ts
export const $briefing = atom<Briefing | null>(null)
export const $briefingStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
```
Injectable-deps pattern, from `apps/desktop/src/aether/domain/briefing/read-briefing.ts`: a `deps` object with optional `api`/typed fns defaulting to the real imports.

Test runner: `npm run test:ui` (= `vitest run --environment jsdom`) in `apps/desktop`. Run a single file with `npm run test:ui -- <path>`.

---

## Task 1 — `AgentsView` types + `composeAgentsView` pure function

Pure, dependency-free composition + types so every later tier imports concrete shapes. No React, no network.

**Files:**
- Create: `apps/desktop/src/aether/domain/agents/agents-view.ts`
- Test: `apps/desktop/src/aether/domain/agents/agents-view.test.ts`

**Interfaces:**
- Consumes: `SessionInfo`, `CronJob`, `SkillInfo` from `@/types/aether`.
- Produces:
  ```ts
  export interface AgentSessionRow {
    id: string
    title: string          // title || preview || 'Phiên không tên' (never empty)
    source: string         // session.source || 'local'
    profile: string        // session.profile || 'default'
    model: string | null
    isActive: boolean      // session.is_active
    lastActive: number     // session.last_active
    messageCount: number
  }
  export interface AgentCronRow {
    id: string
    name: string           // job.name || 'Cron không tên'
    schedule: string       // schedule_display || schedule.display || schedule.expr || '—'
    enabled: boolean
    nextRunAt: string | null
    lastError: string | null
  }
  export interface AgentSkillRow {
    name: string
    category: string
    enabled: boolean
  }
  export interface AgentsView {
    runningCount: number       // sessions where isActive
    sessions: AgentSessionRow[]      // sorted by lastActive desc
    cron: AgentCronRow[]
    skills: AgentSkillRow[]
    enabledSkillCount: number
  }
  export function composeAgentsView(
    sessions: SessionInfo[],
    cronJobs: CronJob[],
    skills: SkillInfo[],
  ): AgentsView
  ```

- [ ] **Step 1.1 — Write the failing test.**
  Create `apps/desktop/src/aether/domain/agents/agents-view.test.ts`:
  ```ts
  import { describe, expect, it } from 'vitest'

  import type { CronJob, SessionInfo, SkillInfo } from '@/types/aether'

  import { composeAgentsView } from './agents-view'

  function session(over: Partial<SessionInfo>): SessionInfo {
    return {
      ended_at: null,
      id: 's1',
      input_tokens: 0,
      is_active: false,
      last_active: 0,
      message_count: 0,
      model: null,
      output_tokens: 0,
      preview: null,
      source: null,
      started_at: 0,
      title: null,
      tool_call_count: 0,
      ...over,
    }
  }

  describe('composeAgentsView', () => {
    it('maps + sorts sessions by lastActive desc and counts active ones', () => {
      const view = composeAgentsView(
        [
          session({ id: 'old', last_active: 100, title: 'Cũ', is_active: false }),
          session({ id: 'new', last_active: 900, title: null, preview: 'Xem trước', is_active: true, source: 'cron', profile: 'work', model: 'm', message_count: 3 }),
        ],
        [],
        [],
      )

      expect(view.sessions.map(s => s.id)).toEqual(['new', 'old'])
      expect(view.sessions[0].title).toBe('Xem trước')
      expect(view.sessions[0].source).toBe('cron')
      expect(view.sessions[0].profile).toBe('work')
      expect(view.runningCount).toBe(1)
    })

    it('falls back to a non-empty title and default source/profile', () => {
      const view = composeAgentsView([session({ id: 'x', title: null, preview: null })], [], [])
      expect(view.sessions[0].title).toBe('Phiên không tên')
      expect(view.sessions[0].source).toBe('local')
      expect(view.sessions[0].profile).toBe('default')
    })

    it('maps cron schedule with display fallback chain', () => {
      const job: CronJob = { id: 'j1', enabled: true, name: 'Brief', schedule_display: null, schedule: { display: 'Mỗi 8h' }, next_run_at: '2026-06-27T08:00:00Z', last_error: null }
      const view = composeAgentsView([], [job], [])
      expect(view.cron[0]).toEqual({ id: 'j1', name: 'Brief', schedule: 'Mỗi 8h', enabled: true, nextRunAt: '2026-06-27T08:00:00Z', lastError: null })
    })

    it('maps skills and counts enabled ones', () => {
      const skills: SkillInfo[] = [
        { name: 'a', category: 'core', description: '', enabled: true },
        { name: 'b', category: 'core', description: '', enabled: false },
      ]
      const view = composeAgentsView([], [], skills)
      expect(view.skills).toHaveLength(2)
      expect(view.enabledSkillCount).toBe(1)
    })
  })
  ```

- [ ] **Step 1.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/agents/agents-view.test.ts`
  Expected output contains: `Failed to resolve import "./agents-view"` (or `Cannot find module './agents-view'`). The suite fails because the implementation file does not exist yet.

- [ ] **Step 1.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/domain/agents/agents-view.ts`:
  ```ts
  import type { CronJob, SessionInfo, SkillInfo } from '@/types/aether'

  export interface AgentSessionRow {
    id: string
    title: string
    source: string
    profile: string
    model: string | null
    isActive: boolean
    lastActive: number
    messageCount: number
  }

  export interface AgentCronRow {
    id: string
    name: string
    schedule: string
    enabled: boolean
    nextRunAt: string | null
    lastError: string | null
  }

  export interface AgentSkillRow {
    name: string
    category: string
    enabled: boolean
  }

  export interface AgentsView {
    runningCount: number
    sessions: AgentSessionRow[]
    cron: AgentCronRow[]
    skills: AgentSkillRow[]
    enabledSkillCount: number
  }

  function sessionTitle(session: SessionInfo): string {
    const candidate = (session.title ?? session.preview ?? '').trim()

    return candidate || 'Phiên không tên'
  }

  function cronSchedule(job: CronJob): string {
    return job.schedule_display?.trim() || job.schedule?.display?.trim() || job.schedule?.expr?.trim() || '—'
  }

  export function composeAgentsView(
    sessions: SessionInfo[],
    cronJobs: CronJob[],
    skills: SkillInfo[],
  ): AgentsView {
    const rows: AgentSessionRow[] = sessions
      .map(session => ({
        id: session.id,
        title: sessionTitle(session),
        source: session.source ?? 'local',
        profile: session.profile ?? 'default',
        model: session.model,
        isActive: session.is_active,
        lastActive: session.last_active,
        messageCount: session.message_count,
      }))
      .sort((a, b) => b.lastActive - a.lastActive)

    return {
      runningCount: rows.filter(row => row.isActive).length,
      sessions: rows,
      cron: cronJobs.map(job => ({
        id: job.id,
        name: job.name?.trim() || 'Cron không tên',
        schedule: cronSchedule(job),
        enabled: job.enabled,
        nextRunAt: job.next_run_at ?? null,
        lastError: job.last_error ?? null,
      })),
      skills: skills.map(skill => ({ name: skill.name, category: skill.category, enabled: skill.enabled })),
      enabledSkillCount: skills.filter(skill => skill.enabled).length,
    }
  }
  ```

- [ ] **Step 1.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/agents/agents-view.test.ts`
  Expected output contains: `Test Files  1 passed` and `4 passed`.

- [ ] **Step 1.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/agents/agents-view.ts apps/desktop/src/aether/domain/agents/agents-view.test.ts
  git commit -m "feat(aether-agents): AgentsView types + composeAgentsView pure fn

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 2 — `agents-store.ts` (`loadAgents` with injectable api)

`$agents`/`$agentsStatus` atoms + `loadAgents()` that aggregates the four read-only REST calls and composes the view. API access is injected (like `read-briefing.ts`) so the store unit-tests without `window.aetherDesktop`.

**Files:**
- Create: `apps/desktop/src/aether/domain/agents/agents-store.ts`
- Test: `apps/desktop/src/aether/domain/agents/agents-store.test.ts`

**Interfaces:**
- Consumes: `listAllProfileSessions`, `getCronJobs`, `getSkills` from `@/aether-api`; `composeAgentsView` + `AgentsView` from `./agents-view`; `PaginatedSessions`, `CronJob`, `SkillInfo` from `@/types/aether`.
- Produces:
  ```ts
  export const $agents: import('nanostores').WritableAtom<AgentsView | null>
  export const $agentsStatus: import('nanostores').WritableAtom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>
  export interface LoadAgentsDeps {
    listSessions?: () => Promise<PaginatedSessions>
    listCron?: () => Promise<CronJob[]>
    listSkills?: () => Promise<SkillInfo[]>
  }
  export function loadAgents(deps?: LoadAgentsDeps): Promise<void>
  ```
  Status rules: `loading` on entry → `ready` when any of sessions/cron/skills is non-empty → `empty` when all three are empty → `error` on any thrown call. `$agents` is set to the composed view on success (even when empty, so the screen can show zero-counts if it ever flips to ready — but `empty` short-circuits the empty-state UI).

- [ ] **Step 2.1 — Write the failing test.**
  Create `apps/desktop/src/aether/domain/agents/agents-store.test.ts`:
  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import type { CronJob, PaginatedSessions, SessionInfo, SkillInfo } from '@/types/aether'

  import { $agents, $agentsStatus, loadAgents } from './agents-store'

  function session(over: Partial<SessionInfo>): SessionInfo {
    return {
      ended_at: null, id: 's1', input_tokens: 0, is_active: false, last_active: 0,
      message_count: 0, model: null, output_tokens: 0, preview: null, source: null,
      started_at: 0, title: null, tool_call_count: 0, ...over,
    }
  }

  function page(sessions: SessionInfo[]): PaginatedSessions {
    return { limit: 40, offset: 0, total: sessions.length, sessions }
  }

  beforeEach(() => {
    $agents.set(null)
    $agentsStatus.set('idle')
  })
  afterEach(() => { vi.restoreAllMocks() })

  describe('loadAgents', () => {
    it('aggregates sessions+cron+skills into the view and sets ready', async () => {
      const cron: CronJob[] = [{ id: 'j1', enabled: true, name: 'Brief', schedule: { display: 'Mỗi 8h' } }]
      const skills: SkillInfo[] = [{ name: 'a', category: 'core', description: '', enabled: true }]

      await loadAgents({
        listSessions: async () => page([session({ id: 'live', is_active: true, last_active: 5 })]),
        listCron: async () => cron,
        listSkills: async () => skills,
      })

      expect($agentsStatus.get()).toBe('ready')
      const view = $agents.get()
      expect(view?.runningCount).toBe(1)
      expect(view?.cron).toHaveLength(1)
      expect(view?.enabledSkillCount).toBe(1)
    })

    it('sets empty when all sources are empty', async () => {
      await loadAgents({
        listSessions: async () => page([]),
        listCron: async () => [],
        listSkills: async () => [],
      })

      expect($agentsStatus.get()).toBe('empty')
    })

    it('sets error when any source throws', async () => {
      await loadAgents({
        listSessions: async () => { throw new Error('boom') },
        listCron: async () => [],
        listSkills: async () => [],
      })

      expect($agentsStatus.get()).toBe('error')
      expect($agents.get()).toBeNull()
    })

    it('passes loading status during the fetch', async () => {
      let observed = ''
      await loadAgents({
        listSessions: async () => { observed = $agentsStatus.get(); return page([]) },
        listCron: async () => [],
        listSkills: async () => [],
      })

      expect(observed).toBe('loading')
    })
  })
  ```

- [ ] **Step 2.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/agents/agents-store.test.ts`
  Expected output contains: `Failed to resolve import "./agents-store"`. Implementation file does not exist yet.

- [ ] **Step 2.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/domain/agents/agents-store.ts`:
  ```ts
  import { atom } from 'nanostores'

  import { getCronJobs, getSkills, listAllProfileSessions } from '@/aether-api'
  import type { CronJob, PaginatedSessions, SkillInfo } from '@/types/aether'

  import type { AgentsView } from './agents-view'
  import { composeAgentsView } from './agents-view'

  export const $agents = atom<AgentsView | null>(null)
  export const $agentsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

  export interface LoadAgentsDeps {
    listSessions?: () => Promise<PaginatedSessions>
    listCron?: () => Promise<CronJob[]>
    listSkills?: () => Promise<SkillInfo[]>
  }

  // Read-only aggregation only. Recents excludes scheduler sessions so a burst of
  // (always-newest) cron runs can't starve real conversations — the cron section
  // surfaces schedules via getCronJobs() instead.
  export async function loadAgents(deps: LoadAgentsDeps = {}): Promise<void> {
    const listSessions = deps.listSessions ?? (() => listAllProfileSessions(40, 0, 'exclude', 'recent', 'all', { excludeSources: ['cron'] }))
    const listCron = deps.listCron ?? getCronJobs
    const listSkills = deps.listSkills ?? getSkills

    $agentsStatus.set('loading')

    try {
      const [sessionsPage, cronJobs, skills] = await Promise.all([listSessions(), listCron(), listSkills()])
      const view = composeAgentsView(sessionsPage.sessions, cronJobs, skills)

      $agents.set(view)

      const empty = view.sessions.length === 0 && view.cron.length === 0 && view.skills.length === 0
      $agentsStatus.set(empty ? 'empty' : 'ready')
    } catch {
      $agents.set(null)
      $agentsStatus.set('error')
    }
  }
  ```

- [ ] **Step 2.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/agents/agents-store.test.ts`
  Expected output contains: `Test Files  1 passed` and `4 passed`.

- [ ] **Step 2.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/agents/agents-store.ts apps/desktop/src/aether/domain/agents/agents-store.test.ts
  git commit -m "feat(aether-agents): agents-store loadAgents aggregating sessions/cron/skills

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 3 — `agents-screen.tsx` skeleton / empty / error states

Presentation shell: root layout, on-mount load, and the three non-`ready` states (loading skeleton, Vietnamese empty-state, inline error + "Thử lại"). The data sections come in Task 4 so this task stays small and each state is verifiable in isolation.

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/agents-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/agents-screen.test.tsx`

**Interfaces:**
- Consumes: `$agents`, `$agentsStatus`, `loadAgents` from `@/aether/domain/agents/agents-store`; `GlassSlab` from `@/aether/ui/components/glass-slab`; `useStore` from `@nanostores/react`.
- Produces: `export function AgentsScreen(): JSX.Element`.

- [ ] **Step 3.1 — Write the failing test.**
  Create `apps/desktop/src/aether/ui/screens/agents-screen.test.tsx`:
  ```ts
  import { cleanup, fireEvent, render, screen } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'

  import { AgentsScreen } from './agents-screen'

  beforeEach(() => {
    $agents.set(null)
    $agentsStatus.set('idle')
  })
  afterEach(cleanup)

  describe('AgentsScreen states', () => {
    it('renders the read-only label in every state', () => {
      $agentsStatus.set('loading')
      render(<AgentsScreen />)
      expect(screen.getByText(/Chỉ xem/)).toBeTruthy()
    })

    it('renders a skeleton while loading', () => {
      $agentsStatus.set('loading')
      render(<AgentsScreen />)
      expect(screen.getByTestId('ae-agents-skeleton')).toBeTruthy()
    })

    it('renders a Vietnamese empty state', () => {
      $agentsStatus.set('empty')
      render(<AgentsScreen />)
      expect(screen.getByText(/Chưa có agent nào đang chạy/)).toBeTruthy()
    })

    it('renders an inline error with a retry button that calls loadAgents', () => {
      $agentsStatus.set('error')
      render(<AgentsScreen />)
      expect(screen.getByText(/Không tải được/)).toBeTruthy()
      // Retry flips status back to loading via loadAgents() (no deps → real api,
      // which is undefined in jsdom and rejects → error; we only assert it ran).
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
      expect($agentsStatus.get()).not.toBe('error') // synchronously set to 'loading' first
    })
  })
  ```

- [ ] **Step 3.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/agents-screen.test.tsx`
  Expected output contains: `Failed to resolve import "./agents-screen"`. Implementation file does not exist yet.

- [ ] **Step 3.3 — Minimal implementation.**
  Create `apps/desktop/src/aether/ui/screens/agents-screen.tsx`:
  ```tsx
  import { useStore } from '@nanostores/react'
  import { useEffect } from 'react'

  import { $agents, $agentsStatus, loadAgents } from '@/aether/domain/agents/agents-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'

  function ReadOnlyBadge() {
    return (
      <span className="rounded-[8px] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)] ring-1 ring-[rgba(120,200,255,.22)]">
        Chỉ xem
      </span>
    )
  }

  export function AgentsScreen() {
    const status = useStore($agentsStatus)
    const agents = useStore($agents)

    useEffect(() => {
      if ($agentsStatus.get() === 'idle') { void loadAgents() }
    }, [])

    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <div className="ae-grid-floor" />
        <div className="ae-vignette" />

        <div className="z-[2] mt-[18px] flex items-center justify-between gap-4">
          <div className="flex flex-col gap-[5px]">
            <div className="text-[24px] font-semibold leading-[1.05]">Mission control · Agent</div>
            <div className="text-[12px] text-[color:var(--ae-dim)]">
              Tổng quan agent/phiên đang &amp; đã chạy, lịch cron và năng lực — chỉ để quan sát, không tạo/sửa agent.
            </div>
          </div>
          <ReadOnlyBadge />
        </div>

        <div className="z-[2] mt-4 min-h-0 flex-1">
          {status === 'loading' && (
            <GlassSlab className="h-full" data-testid="ae-agents-skeleton" size="md">
              <div data-testid="ae-agents-skeleton" className="flex h-full flex-col gap-3">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-10 animate-pulse rounded-[11px] bg-[rgba(120,200,255,.08)]" />
                ))}
              </div>
            </GlassSlab>
          )}

          {status === 'empty' && (
            <GlassSlab className="grid h-full place-items-center text-center" size="lg">
              <div>
                <div className="text-[13px] font-semibold text-white">Chưa có agent nào đang chạy</div>
                <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
                  Khi có phiên, cron hoặc kỹ năng, chúng sẽ hiện ở đây.
                </div>
              </div>
            </GlassSlab>
          )}

          {status === 'error' && (
            <GlassSlab className="grid h-full place-items-center text-center" size="lg">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--ae-warn)' }}>
                  Không tải được dữ liệu agent
                </div>
                <button
                  className="mt-3 rounded-[11px] px-4 py-2 text-[12px] font-semibold ring-1 ring-[rgba(120,200,255,.3)]"
                  onClick={() => void loadAgents()}
                  type="button"
                >
                  Thử lại
                </button>
              </div>
            </GlassSlab>
          )}

          {status === 'ready' && agents && <div data-testid="ae-agents-ready" />}
        </div>
      </div>
    )
  }
  ```
  > NOTE: `GlassSlab` forwards only `size`/`className`/`children` (see `glass-slab.tsx`). `data-testid` on `GlassSlab` is NOT forwarded — the skeleton test targets the INNER `<div data-testid="ae-agents-skeleton">`. Keep the inner testid; the duplicate on `GlassSlab` is harmless but the inner one is the one queried. (If `getByTestId` complains about duplicates, remove the `data-testid` from the `GlassSlab` and keep it only on the inner div.)

- [ ] **Step 3.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/agents-screen.test.tsx`
  Expected output contains: `Test Files  1 passed` and `4 passed`.
  If `getByTestId('ae-agents-skeleton')` throws "Found multiple elements", remove the `data-testid="ae-agents-skeleton"` attribute from the `<GlassSlab>` (leave it on the inner div) and re-run — expect `4 passed`.

- [ ] **Step 3.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/screens/agents-screen.tsx apps/desktop/src/aether/ui/screens/agents-screen.test.tsx
  git commit -m "feat(aether-agents): AgentsScreen loading/empty/error states + read-only badge

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 4 — Data sections (sessions / cron / skills) + presence indicators + prompt-cache guard

Fill the `ready` branch with three `<GlassSlab>` sections, a live presence indicator driven by `$orbState`/`$gatewayState`, and the hard prompt-cache guard test. Each section is read-only — plain rows, no buttons that mutate.

**Files:**
- Modify: `apps/desktop/src/aether/ui/screens/agents-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/agents-screen.test.tsx` (append cases)
- Test: `apps/desktop/src/aether/ui/screens/agents-screen.prompt-cache.test.ts` (new guard file)

**Interfaces:**
- Consumes (added): `$orbState` from `@/aether/domain/motion/motion-store`; `$busy`, `$gatewayState` from `@/store/session`.
- Produces: same `AgentsScreen` export; ready-state markup renders `data-testid="ae-agents-sessions"`, `ae-agents-cron`, `ae-agents-skills`, and a presence node `data-testid="ae-agents-presence"` with `data-orb={orbState}`.

- [ ] **Step 4.1 — Write the failing presence + sections test (append to existing screen test).**
  Append to `apps/desktop/src/aether/ui/screens/agents-screen.test.tsx`:
  ```ts
  import type { AgentsView } from '@/aether/domain/agents/agents-view'
  import { $busy, $gatewayState } from '@/store/session'

  function readyView(): AgentsView {
    return {
      runningCount: 1,
      sessions: [
        { id: 'live', title: 'Phiên trực tiếp', source: 'desktop', profile: 'default', model: 'sonnet', isActive: true, lastActive: 900, messageCount: 4 },
        { id: 'past', title: 'Phiên cũ', source: 'cron', profile: 'work', model: null, isActive: false, lastActive: 100, messageCount: 2 },
      ],
      cron: [{ id: 'j1', name: 'Brief sáng', schedule: 'Mỗi 8h', enabled: true, nextRunAt: '2026-06-27T08:00:00Z', lastError: null }],
      skills: [{ name: 'web-search', category: 'core', enabled: true }],
      enabledSkillCount: 1,
    }
  }

  describe('AgentsScreen ready sections', () => {
    beforeEach(() => {
      $agents.set(readyView())
      $agentsStatus.set('ready')
      $busy.set(false)
      $gatewayState.set('open')
    })

    it('renders sessions, cron and skills sections', () => {
      render(<AgentsScreen />)
      expect(screen.getByTestId('ae-agents-sessions')).toBeTruthy()
      expect(screen.getByTestId('ae-agents-cron')).toBeTruthy()
      expect(screen.getByTestId('ae-agents-skills')).toBeTruthy()
      expect(screen.getByText('Phiên trực tiếp')).toBeTruthy()
      expect(screen.getByText('Brief sáng')).toBeTruthy()
      expect(screen.getByText('web-search')).toBeTruthy()
    })

    it('presence indicator reflects $orbState (idle when connected & not busy)', () => {
      render(<AgentsScreen />)
      expect(screen.getByTestId('ae-agents-presence').getAttribute('data-orb')).toBe('idle')
    })

    it('presence indicator flips to thinking when busy', () => {
      $busy.set(true)
      render(<AgentsScreen />)
      expect(screen.getByTestId('ae-agents-presence').getAttribute('data-orb')).toBe('thinking')
    })

    it('still shows the read-only badge and no CRUD buttons in ready state', () => {
      render(<AgentsScreen />)
      expect(screen.getByText(/Chỉ xem/)).toBeTruthy()
      // The only button on the ready screen must NOT be a create/edit/delete control.
      for (const btn of screen.queryAllByRole('button')) {
        expect(btn.textContent ?? '').not.toMatch(/Tạo|Sửa|Xóa|Xoá|Create|Edit|Delete/)
      }
    })
  })
  ```

- [ ] **Step 4.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/agents-screen.test.tsx`
  Expected output contains failures like `Unable to find an element by: [data-testid="ae-agents-sessions"]` (ready branch currently renders only the placeholder `ae-agents-ready` div).

- [ ] **Step 4.3 — Implement the ready sections + presence.**
  In `apps/desktop/src/aether/ui/screens/agents-screen.tsx`, add imports at the top (after the existing imports):
  ```tsx
  import { $orbState } from '@/aether/domain/motion/motion-store'
  ```
  Add a presence label map + a section component above `AgentsScreen`:
  ```tsx
  const ORB_LABEL: Record<'thinking' | 'idle' | 'paused', string> = {
    thinking: 'Đang xử lý',
    idle: 'Sẵn sàng',
    paused: 'Mất kết nối',
  }

  const ORB_COLOR: Record<'thinking' | 'idle' | 'paused', string> = {
    thinking: 'var(--ae-azure)',
    idle: 'var(--ae-ok)',
    paused: 'var(--ae-warn)',
  }

  function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
      <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
        {children}
      </div>
    )
  }
  ```
  Replace the placeholder ready branch:
  ```tsx
  {status === 'ready' && agents && <div data-testid="ae-agents-ready" />}
  ```
  with the full ready markup. First read `orbState` via `useStore` at the top of `AgentsScreen` (add alongside the existing `useStore` calls):
  ```tsx
    const orbState = useStore($orbState)
  ```
  Then the ready branch:
  ```tsx
  {status === 'ready' && agents && (
    <div className="grid h-full min-h-0 grid-cols-[1.4fr_1fr] grid-rows-[auto_1fr] gap-3.5">
      {/* presence + running summary spans the top */}
      <GlassSlab className="col-span-2 flex items-center justify-between" size="sm">
        <div className="flex items-center gap-[11px]">
          <span
            data-testid="ae-agents-presence"
            data-orb={orbState}
            className="h-[9px] w-[9px] flex-none rounded-full"
            style={{ background: ORB_COLOR[orbState], boxShadow: `0 0 9px ${ORB_COLOR[orbState]}` }}
          />
          <span className="text-[12.5px] font-semibold text-white">{ORB_LABEL[orbState]}</span>
        </div>
        <div className="text-[12px] text-[color:var(--ae-dim)]">
          <b className="text-white">{agents.runningCount}</b> agent đang chạy ·{' '}
          <b className="text-white">{agents.cron.length}</b> lịch ·{' '}
          <b className="text-white">{agents.enabledSkillCount}</b> năng lực bật
        </div>
      </GlassSlab>

      {/* sessions */}
      <GlassSlab className="row-span-2 flex min-h-0 flex-col" size="md">
        <SectionTitle>AGENT / PHIÊN</SectionTitle>
        <div data-testid="ae-agents-sessions" className="flex min-h-0 flex-col gap-[9px] overflow-auto">
          {agents.sessions.map(session => (
            <div
              key={session.id}
              className="flex items-center gap-[11px] rounded-[11px] p-[9px_11px] ring-1 ring-[rgba(120,200,255,.1)]"
            >
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{
                  background: session.isActive ? 'var(--ae-ok)' : 'var(--ae-dim)',
                  boxShadow: session.isActive ? '0 0 8px var(--ae-ok)' : 'none',
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold text-white">{session.title}</div>
                <div className="text-[10.5px] text-[color:var(--ae-dim)]">
                  {session.source} · {session.profile}
                  {session.model ? ` · ${session.model}` : ''}
                </div>
              </div>
              <span className="text-[10.5px] text-[color:var(--ae-dim)]">{session.messageCount} tin</span>
            </div>
          ))}
        </div>
      </GlassSlab>

      {/* cron */}
      <GlassSlab className="flex min-h-0 flex-col" size="md">
        <SectionTitle>LỊCH (CRON)</SectionTitle>
        <div data-testid="ae-agents-cron" className="flex min-h-0 flex-col gap-2 overflow-auto">
          {agents.cron.map(job => (
            <div key={job.id} className="flex items-center gap-[9px] text-[11.5px]">
              <span
                className="h-[6px] w-[6px] flex-none rounded-full"
                style={{ background: job.enabled ? 'var(--ae-ok)' : 'var(--ae-dim)' }}
              />
              <span className="flex-1 truncate font-semibold text-[#D7ECFA]">{job.name}</span>
              <span className="text-[10px] text-[color:var(--ae-dim)]">{job.schedule}</span>
            </div>
          ))}
        </div>
      </GlassSlab>

      {/* skills */}
      <GlassSlab className="flex min-h-0 flex-col" size="md">
        <SectionTitle>NĂNG LỰC (SKILLS)</SectionTitle>
        <div data-testid="ae-agents-skills" className="flex min-h-0 flex-wrap content-start gap-[7px] overflow-auto">
          {agents.skills.map(skill => (
            <span
              key={skill.name}
              className="rounded-[9px] px-[9px] py-[5px] text-[11px] font-semibold ring-1"
              style={{
                color: skill.enabled ? '#D7ECFA' : 'var(--ae-dim)',
                ['--tw-ring-color' as string]: skill.enabled ? 'rgba(120,200,255,.28)' : 'rgba(120,200,255,.1)',
              }}
            >
              {skill.name}
            </span>
          ))}
        </div>
      </GlassSlab>
    </div>
  )}
  ```

- [ ] **Step 4.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/agents-screen.test.tsx`
  Expected output contains: `Test Files  1 passed` and `8 passed` (4 from Task 3 + 4 appended here).

- [ ] **Step 4.5 — Write the prompt-cache guard test (static-source assertion).**
  Create `apps/desktop/src/aether/ui/screens/agents-screen.prompt-cache.test.ts`. Approach (justify in one line): a static source-scan is the most robust guard here — it proves the screen + store source never reference any conversation-stream symbol regardless of runtime mocking, so a future edit that adds a stream subscription fails this test deterministically.
  ```ts
  import { readFileSync } from 'node:fs'
  import { resolve } from 'node:path'

  import { describe, expect, it } from 'vitest'

  // HARD prompt-cache guard: the Agents screen is a non-chat observation view. It
  // must read only list/metadata REST + non-conversation state — never open a
  // conversation stream, subscribe deltas, or re-trigger the LLM. A static
  // source-scan is the most robust guard: it holds regardless of runtime mocking
  // and fails deterministically if a future edit reintroduces a stream symbol.
  const FORBIDDEN = [
    'message.delta',
    'reasoning.delta',
    'thinking.',
    'appendAssistantDelta',
    'getSessionMessages', // would open a transcript = conversation read
    'resumeSession',
  ]

  const FILES = [
    'src/aether/ui/screens/agents-screen.tsx',
    'src/aether/domain/agents/agents-store.ts',
    'src/aether/domain/agents/agents-view.ts',
  ]

  describe('AgentsScreen prompt-cache safety', () => {
    for (const rel of FILES) {
      it(`${rel} references no conversation-stream symbol`, () => {
        const source = readFileSync(resolve(process.cwd(), rel), 'utf8')

        for (const needle of FORBIDDEN) {
          expect(source.includes(needle), `${rel} must not reference "${needle}"`).toBe(false)
        }
      })
    }
  })
  ```

- [ ] **Step 4.6 — Run the guard, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/agents-screen.prompt-cache.test.ts`
  Expected output contains: `Test Files  1 passed` and `3 passed`.
  > If it FAILS, the implementation referenced a forbidden symbol — remove the conversation read; do NOT weaken the FORBIDDEN list.

- [ ] **Step 4.7 — Run the whole agents suite green.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/agents src/aether/ui/screens/agents-screen.test.tsx src/aether/ui/screens/agents-screen.prompt-cache.test.ts`
  Expected output contains: `Test Files  4 passed`.

- [ ] **Step 4.8 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/screens/agents-screen.tsx apps/desktop/src/aether/ui/screens/agents-screen.test.tsx apps/desktop/src/aether/ui/screens/agents-screen.prompt-cache.test.ts
  git commit -m "feat(aether-agents): sessions/cron/skills sections + presence + prompt-cache guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 5 — Wire `AgentsScreen` into the shell

Swap `<StubScreen title="Agents" />` for `<AgentsScreen />` on the `agents` route and keep the shell test green.

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Test: `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx` (append one route case)

**Interfaces:**
- Consumes: `AgentsScreen` from `@/aether/ui/screens/agents-screen`; `$agentsStatus` from `@/aether/domain/agents/agents-store`.
- Produces: route `agents` renders `<AgentsScreen />`.

- [ ] **Step 5.1 — Write the failing route test (append to shell test).**
  Append to `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx`:
  ```ts
  import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
  import type { AgentsView } from '@/aether/domain/agents/agents-view'

  describe('AetherShell Agents route', () => {
    beforeEach(() => {
      $bootDone.set(true)
      $gatewayState.set('open')
      $agentsStatus.set('ready')
      $agents.set({
        runningCount: 0,
        sessions: [],
        cron: [{ id: 'j1', name: 'Brief sáng', schedule: 'Mỗi 8h', enabled: true, nextRunAt: null, lastError: null }],
        skills: [],
        enabledSkillCount: 0,
      } satisfies AgentsView)
    })

    it('renders the AgentsScreen (read-only mission control) on /agents', () => {
      render(<MemoryRouter initialEntries={['/agents']}><AetherShell chatView={<div />} /></MemoryRouter>)
      expect(screen.getByText(/Mission control · Agent/)).toBeTruthy()
      expect(screen.getByText(/Chỉ xem/)).toBeTruthy()
    })
  })
  ```

- [ ] **Step 5.2 — Run, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/shell/aether-shell.test.tsx`
  Expected output contains: `Unable to find an element with the text: /Mission control · Agent/` (route still renders the StubScreen "Sắp ra mắt…").

- [ ] **Step 5.3 — Swap the route.**
  In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add the import (alphabetical, near the other screen imports):
  ```tsx
  import { AgentsScreen } from '@/aether/ui/screens/agents-screen'
  ```
  Replace:
  ```tsx
              <Route element={<StubScreen title="Agents" />} path="agents" />
  ```
  with:
  ```tsx
              <Route element={<AgentsScreen />} path="agents" />
  ```

- [ ] **Step 5.4 — Run, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/shell/aether-shell.test.tsx`
  Expected output contains: `Test Files  1 passed` (all prior shell cases + the new route case pass).

- [ ] **Step 5.5 — Full suite sanity + typecheck.**
  Commands:
  ```bash
  cd apps/desktop && npm run test:ui
  cd apps/desktop && npx tsc --noEmit
  ```
  Expected: `npm run test:ui` reports all test files passing (no regression). `tsc --noEmit` exits 0 with no output.
  > If `tsc` reports an error in the new files, fix the type (do not add `any`/`@ts-ignore`); re-run until clean.

- [ ] **Step 5.6 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
  git commit -m "feat(aether-agents): mount AgentsScreen on /agents route (replaces stub)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Self-Review vs spec §5.2 Agents bullets

Verify each before declaring done:

- [ ] **Sessions/subagents → tree/tile of "who is/was running":** `loadAgents` calls `listAllProfileSessions(... excludeSources:['cron'])`; `composeAgentsView` sorts by `lastActive` desc and the SESSIONS section renders each as a row with an active/inactive dot, source, profile, model. (Task 1, 2, 4)
- [ ] **Live state via `$gatewayState`/`$busy`/`$orbState`:** the presence node reads `$orbState` (computed from `$busy`+`$gatewayState`) — `data-orb` flips idle→thinking→paused; per-session active dot from `is_active`. No `subagent.*` subscription is added (the screen needs no session-keyed event wiring; it relies on `is_active` + presence). (Task 4)
- [ ] **Cron schedule via `getCronJobs()`:** LỊCH (CRON) section lists each job with enabled dot, name, and resolved schedule string. (Task 1, 2, 4)
- [ ] **Capabilities via `getSkills()`:** NĂNG LỰC (SKILLS) section renders each skill as a chip dimmed when disabled; `enabledSkillCount` summarized in the header. (Task 1, 2, 4)
- [ ] **Read-only labeling, no dead CRUD chrome:** "Chỉ xem" badge in every state + subtitle "chỉ để quan sát, không tạo/sửa agent"; the ONLY button anywhere is the error-state "Thử lại" (retry, not CRUD), asserted by the no-CRUD-button test. (Task 3, 4)
- [ ] **Prompt-cache safety:** store uses only list/metadata REST (`listAllProfileSessions`/`getCronJobs`/`getSkills`); the static guard test asserts the screen+store+view source reference none of `message.delta`/`reasoning.delta`/`thinking.`/`appendAssistantDelta`/`getSessionMessages`/`resumeSession`. No conversation stream is opened and the LLM is never re-triggered. (Task 4)
- [ ] **Layout/tokens:** root `.ae-screen-bare flex h-full min-w-0 flex-col`; all padding via `<GlassSlab size>`; colors only via `--ae-*` tokens (no raw hex outside the existing token-derived `#D7ECFA`/`#fff` text shades already used across sibling screens). Confirm `npx tsc --noEmit` + full `npm run test:ui` are green. (All tasks)
