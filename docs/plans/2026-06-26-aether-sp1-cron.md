# Cron Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the AETHER Desktop **Cron** screen into the tempered runtime — a Vietnamese, token-driven job list with next-run/status, full CRUD + pause/resume/trigger control, a schedule builder, a delivery-target selector, and a metadata-only run-history panel with a guarded light poll for live run status.
**Architecture:** Three tiers — `aether/ui/screens/cron-screen.tsx` (presentation, mount-load + skeleton/empty/error) → `aether/domain/cron/cron-store.ts` (nanostores atoms + actions, `deps.api` injected) → existing `apps/desktop/src/aether-api.ts` cron methods. This is a **non-chat** screen: live run status comes from a LIGHT re-fetch/poll WITH a cleanup guard (interval cleared on unmount), never a conversation socket. `getCronJobRuns` returns `SessionInfo[]` — list/metadata only; the run's conversation stream is never opened.
**Tech Stack:** React 18, nanostores (`atom`, `@nanostores/react`), Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className. Do NOT import old web UI; reference logic only.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — REST + non-conversation events only. `getCronJobRuns` returns `SessionInfo[]` (list/metadata only — do NOT open the run's conversation stream). No `message.delta`/`reasoning.delta`/`thinking.*`, no `appendAssistantDelta`, no LLM re-trigger. Live run status via LIGHT poll/re-fetch WITH a guard (clear interval on unmount), never a conversation socket.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.

---

## Confirmed signatures (from source — do NOT invent)

From `apps/desktop/src/aether-api.ts`:
```ts
export function getCronJobs(): Promise<CronJob[]>                                   // GET  /api/cron/jobs
export function getCronJob(jobId: string): Promise<CronJob>                         // GET  /api/cron/jobs/{id}
export async function getCronJobRuns(jobId: string, limit = 20): Promise<SessionInfo[]> // GET /api/cron/jobs/{id}/runs?limit=N → unwraps {runs}
export function createCronJob(body: CronJobCreatePayload): Promise<CronJob>         // POST /api/cron/jobs           body = payload
export function updateCronJob(jobId: string, updates: CronJobUpdates): Promise<CronJob> // PUT /api/cron/jobs/{id}   body = { updates }
export function pauseCronJob(jobId: string): Promise<CronJob>                       // POST /api/cron/jobs/{id}/pause
export function resumeCronJob(jobId: string): Promise<CronJob>                      // POST /api/cron/jobs/{id}/resume
export function triggerCronJob(jobId: string): Promise<CronJob>                     // POST /api/cron/jobs/{id}/trigger
export function deleteCronJob(jobId: string): Promise<{ ok: boolean }>             // DELETE /api/cron/jobs/{id}
```
**Delivery targets — NO named desktop method exists.** Desktop's `aether-api.ts` has none; only the web client (`web/src/lib/api.ts:522`) has `getCronDeliveryTargets`. The REST path `GET /api/cron/delivery-targets` exists on the backend (`aether_cli/web_server.py:7790`) and returns `{ targets: CronDeliveryTarget[] }`. **This plan does NOT add a backend endpoint** (per constraint) — the store calls the existing path directly via the injected `deps.api`. We mirror the web `CronDeliveryTarget` shape locally.

Types from `apps/desktop/src/types/aether.ts` (verbatim, do NOT redefine):
```ts
export interface CronJob {
  deliver?: null | string
  enabled: boolean
  id: string
  last_error?: null | string
  last_run_at?: null | string
  name?: null | string
  next_run_at?: null | string
  prompt?: null | string
  schedule?: CronJobSchedule
  schedule_display?: null | string
  script?: null | string
  state?: null | string
}
export interface CronJobCreatePayload { deliver?: string; name?: string; prompt: string; schedule: string }
export interface CronJobSchedule { display?: string; expr?: string; kind?: string }
export interface CronJobUpdates { deliver?: string; enabled?: boolean; name?: string; prompt?: string; schedule?: string }
// SessionInfo (run-history rows): see types/aether.ts:323 — id, title, started_at, ended_at, last_active, is_active, message_count, model, source, …
```
`window.aetherDesktop.api` signature (`apps/desktop/src/global.d.ts:65,464`):
```ts
api: <T>(request: AetherApiRequest) => Promise<T>
interface AetherApiRequest { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string | null }
```

Reference (logic only, do NOT import): web Cron page `web/src/pages/CronPage.tsx`, schedule helpers `web/src/lib/schedule.ts` (`buildScheduleString`, `describeSchedule`, `ScheduleBuilderState`, `DEFAULT_SCHEDULE_STATE`). Status tone mapping from `CronPage.tsx:169` (`enabled/scheduled→success`, `paused→warning`, `error/completed→destructive`). Job state derivation: `getJobState` → `job.state || (job.enabled===false ? 'disabled' : 'scheduled')`.

Test command (run inside `apps/desktop`): `npm run test:ui` → `vitest run --environment jsdom`. Scope to one file with `npm run test:ui -- <path>`.

---

## Task 1 — Cron store: load + list status

**Files:**
- Create: `apps/desktop/src/aether/domain/cron/cron-store.ts`
- Test: `apps/desktop/src/aether/domain/cron/cron-store.test.ts`

**Interfaces:**
- Consumes: `window.aetherDesktop.api<T>(req: AetherApiRequest)` (injected as `deps.api`); `CronJob` from `@/types/aether`.
- Produces:
  ```ts
  export const $cronJobs: WritableAtom<CronJob[] | null>
  export const $cronJobsStatus: WritableAtom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>
  export interface CronStoreDeps { api: <T>(req: AetherApiRequest) => Promise<T> }
  export function loadCronJobs(deps?: CronStoreDeps): Promise<void>
  ```

- [ ] **Step 1 — Failing test for `loadCronJobs`.**
  Write `apps/desktop/src/aether/domain/cron/cron-store.test.ts`:
  ```ts
  import { afterEach, describe, expect, it, vi } from 'vitest'

  import type { CronJob } from '@/types/aether'

  import { $cronJobs, $cronJobsStatus, loadCronJobs } from './cron-store'

  function resetStore(): void {
    $cronJobs.set(null)
    $cronJobsStatus.set('idle')
  }

  afterEach(() => {
    resetStore()
    vi.restoreAllMocks()
  })

  const job: CronJob = { id: 'job-1', enabled: true, name: 'Brief sáng', state: 'scheduled', next_run_at: '2026-06-27T07:00:00Z' }

  describe('loadCronJobs', () => {
    it('GETs /api/cron/jobs and fills $cronJobs + ready', async () => {
      const api = vi.fn().mockResolvedValue([job])
      await loadCronJobs({ api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
      expect($cronJobs.get()).toEqual([job])
      expect($cronJobsStatus.get()).toBe('ready')
    })

    it('sets empty when the list is empty', async () => {
      const api = vi.fn().mockResolvedValue([])
      await loadCronJobs({ api })
      expect($cronJobsStatus.get()).toBe('empty')
      expect($cronJobs.get()).toEqual([])
    })

    it('sets error when the request rejects', async () => {
      const api = vi.fn().mockRejectedValue(new Error('boom'))
      await loadCronJobs({ api })
      expect($cronJobsStatus.get()).toBe('error')
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: `Failed to resolve import "./cron-store"` (or `loadCronJobs is not a function`). The file does not exist yet.
- [ ] **Implement `cron-store.ts` (minimal — load only).**
  ```ts
  import { atom } from 'nanostores'

  import type { AetherApiRequest } from '@/global'
  import type { CronJob } from '@/types/aether'

  export interface CronStoreDeps {
    api: <T>(req: AetherApiRequest) => Promise<T>
  }

  function defaultDeps(): CronStoreDeps {
    return { api: req => window.aetherDesktop.api(req) }
  }

  export const $cronJobs = atom<CronJob[] | null>(null)
  export const $cronJobsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

  export async function loadCronJobs(deps: CronStoreDeps = defaultDeps()): Promise<void> {
    $cronJobsStatus.set('loading')

    try {
      const jobs = await deps.api<CronJob[]>({ path: '/api/cron/jobs' })
      $cronJobs.set(jobs)
      $cronJobsStatus.set(jobs.length === 0 ? 'empty' : 'ready')
    } catch {
      $cronJobsStatus.set('error')
    }
  }
  ```
  > If `@/global` does not export `AetherApiRequest` for import, import it from the declaration: `import type { AetherApiRequest } from '@/global.d'` is invalid — instead inline the type:
  > ```ts
  > export interface CronApiRequest { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string | null }
  > export interface CronStoreDeps { api: <T>(req: CronApiRequest) => Promise<T> }
  > ```
  > Verify first with `grep -n "export interface AetherApiRequest" apps/desktop/src/global.d.ts`; it is declared there but `global.d.ts` uses `export {}` + `declare global`, so prefer the inlined `CronApiRequest` form to avoid an ambient-import pitfall. Use whichever compiles under `tsc`.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: `Test Files  1 passed`, `Tests  3 passed`.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/domain/cron/cron-store.ts apps/desktop/src/aether/domain/cron/cron-store.test.ts
  git commit -m "feat(aether-desktop): cron-store loadCronJobs + list status atoms

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 2 — Cron screen: list + skeleton / empty / error

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/cron-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/cron-screen.test.tsx`

**Interfaces:**
- Consumes: `$cronJobs`, `$cronJobsStatus`, `loadCronJobs` from cron-store; `GlassSlab` from `@/aether/ui/components/glass-slab`; `useStore` from `@nanostores/react`.
- Produces: `export function CronScreen(): JSX.Element`.

Helpers (port logic, not UI, from `CronPage.tsx`):
```ts
function jobTitle(job: CronJob): string  // job.name?.trim() || prompt(60) || script(60) || job.id
function jobState(job: CronJob): string  // (job.state || (job.enabled === false ? 'disabled' : 'scheduled'))
function stateTone(state: string): 'ok' | 'warn' | 'error'  // scheduled/enabled→ok, paused/disabled→warn, error/completed→error
function formatTime(iso?: null | string): string  // !iso ? '—' : new Date(iso).toLocaleString('vi-VN')
function scheduleText(job: CronJob): string  // job.schedule_display || job.schedule?.display || job.schedule?.expr || '—'
```
State-badge colors via tokens only: `ok → var(--ae-ok)`, `warn → var(--ae-warn)`, `error → var(--ae-warn)` with stronger weight (no `--ae-error`/`--dt-*` unless confirmed present — verify with `grep -n "--ae-ok\|--ae-warn\|--ae-error" apps/desktop/src/**/*.css`; if `--ae-error` is absent, reuse `--ae-warn`).

- [ ] **Step 2 — Failing render test.**
  Write `apps/desktop/src/aether/ui/screens/cron-screen.test.tsx`:
  ```ts
  import { cleanup, render, screen } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it } from 'vitest'

  import { $cronJobs, $cronJobsStatus } from '@/aether/domain/cron/cron-store'
  import type { CronJob } from '@/types/aether'

  import { CronScreen } from './cron-screen'

  const jobs: CronJob[] = [
    { id: 'a', enabled: true, name: 'Brief sáng', state: 'scheduled', next_run_at: '2026-06-27T07:00:00Z', schedule_display: 'Hằng ngày 07:00' },
    { id: 'b', enabled: false, name: 'Báo cáo tuần', state: 'paused', next_run_at: null, schedule_display: 'Thứ 2 09:00' },
  ]

  afterEach(() => {
    cleanup()
    $cronJobs.set(null)
    $cronJobsStatus.set('idle')
  })

  describe('CronScreen', () => {
    it('renders a row + schedule + state badge per job when ready', () => {
      $cronJobs.set(jobs)
      $cronJobsStatus.set('ready')
      render(<CronScreen />)
      expect(screen.getByText('Brief sáng')).toBeTruthy()
      expect(screen.getByText('Báo cáo tuần')).toBeTruthy()
      expect(screen.getAllByTestId('ae-cron-row')).toHaveLength(2)
      expect(screen.getByText('Hằng ngày 07:00')).toBeTruthy()
    })

    it('shows a skeleton while loading', () => {
      $cronJobsStatus.set('loading')
      render(<CronScreen />)
      expect(screen.getByTestId('ae-cron-skeleton')).toBeTruthy()
    })

    it('shows a Vietnamese empty state', () => {
      $cronJobsStatus.set('empty')
      render(<CronScreen />)
      expect(screen.getByText(/Chưa có tác vụ định kỳ/)).toBeTruthy()
    })

    it('shows an inline error with a retry button', () => {
      $cronJobsStatus.set('error')
      render(<CronScreen />)
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: `Failed to resolve import "./cron-screen"`.
- [ ] **Implement `cron-screen.tsx`** (list + skeleton/empty/error; controls added in Task 3). Root uses `.ae-screen-bare flex h-full min-w-0 flex-col`; rows are `<GlassSlab size="sm">`. Mount-load guard exactly as `morning-brief.tsx`:
  ```tsx
  import { useStore } from '@nanostores/react'
  import { useEffect } from 'react'

  import { $cronJobs, $cronJobsStatus, loadCronJobs } from '@/aether/domain/cron/cron-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'
  import type { CronJob } from '@/types/aether'

  function asText(v?: null | string): string {
    return typeof v === 'string' ? v.trim() : ''
  }
  function truncate(v: string, n: number): string {
    return v.length > n ? `${v.slice(0, n)}…` : v
  }
  function jobTitle(job: CronJob): string {
    return asText(job.name) || truncate(asText(job.prompt), 60) || truncate(asText(job.script), 60) || job.id
  }
  function jobState(job: CronJob): string {
    return asText(job.state) || (job.enabled === false ? 'disabled' : 'scheduled')
  }
  function stateLabel(state: string): string {
    const map: Record<string, string> = {
      scheduled: 'Đã lên lịch',
      enabled: 'Đang chạy',
      paused: 'Tạm dừng',
      disabled: 'Tắt',
      error: 'Lỗi',
      completed: 'Hoàn tất',
    }
    return map[state] ?? state
  }
  function stateColor(state: string): string {
    if (state === 'error' || state === 'completed') { return 'var(--ae-warn)' }
    if (state === 'paused' || state === 'disabled') { return 'var(--ae-dim)' }
    return 'var(--ae-ok)'
  }
  function formatTime(iso?: null | string): string {
    if (!iso) { return '—' }
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN')
  }
  function scheduleText(job: CronJob): string {
    return asText(job.schedule_display) || asText(job.schedule?.display) || asText(job.schedule?.expr) || '—'
  }

  export function CronScreen() {
    const jobs = useStore($cronJobs)
    const status = useStore($cronJobsStatus)

    useEffect(() => {
      if ($cronJobsStatus.get() === 'idle') { void loadCronJobs() }
    }, [])

    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <div className="ae-grid-floor" />
        <div className="ae-vignette" />

        <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
          <div className="text-[22px] font-semibold leading-tight text-white">Tác vụ định kỳ</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">{jobs?.length ?? 0} tác vụ</div>
        </div>

        <div className="z-[2] mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          {status === 'loading' && (
            <div className="flex flex-col gap-3" data-testid="ae-cron-skeleton">
              {[0, 1, 2].map(i => (
                <GlassSlab className="h-[78px] animate-pulse opacity-60" key={i} size="sm">
                  <span className="sr-only">Đang tải…</span>
                </GlassSlab>
              ))}
            </div>
          )}

          {status === 'empty' && (
            <GlassSlab className="text-center" size="lg">
              <div className="text-sm text-[color:var(--ae-dim)]">Chưa có tác vụ định kỳ nào.</div>
            </GlassSlab>
          )}

          {status === 'error' && (
            <GlassSlab className="flex items-center justify-between gap-4" size="md">
              <div className="text-sm text-[color:var(--ae-warn)]">Không tải được danh sách tác vụ.</div>
              <button
                className="rounded-[10px] border border-[color:var(--ae-azure-soft)] px-3 py-1.5 text-[12px] text-[color:var(--ae-azure-soft)]"
                onClick={() => void loadCronJobs()}
                type="button"
              >
                Thử lại
              </button>
            </GlassSlab>
          )}

          {status === 'ready' &&
            (jobs ?? []).map(job => {
              const state = jobState(job)
              return (
                <GlassSlab className="flex items-start justify-between gap-4" data-testid="ae-cron-row" key={job.id} size="sm">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-white">{jobTitle(job)}</span>
                      <span
                        className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                        style={{ background: 'rgba(120,200,255,.08)', color: stateColor(state) }}
                      >
                        {stateLabel(state)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-[color:var(--ae-dim)]">
                      <span className="font-mono">{scheduleText(job)}</span>
                      <span>Lần tới: {formatTime(job.next_run_at)}</span>
                      <span>Gần nhất: {formatTime(job.last_run_at)}</span>
                    </div>
                    {job.last_error && <div className="mt-1 text-[11px] text-[color:var(--ae-warn)]">{job.last_error}</div>}
                  </div>
                </GlassSlab>
              )
            })}
        </div>
      </div>
    )
  }
  ```
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: `Tests  4 passed`.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/ui/screens/cron-screen.tsx apps/desktop/src/aether/ui/screens/cron-screen.test.tsx
  git commit -m "feat(aether-desktop): cron-screen job list + skeleton/empty/error states

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 3 — Control actions (pause / resume / trigger / delete) with re-fetch

**Files:**
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.ts`
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.test.tsx`

**Interfaces (add to store):**
```ts
export function pauseCronJobAction(id: string, deps?: CronStoreDeps): Promise<void>
export function resumeCronJobAction(id: string, deps?: CronStoreDeps): Promise<void>
export function triggerCronJobAction(id: string, deps?: CronStoreDeps): Promise<void>
export function deleteCronJobAction(id: string, deps?: CronStoreDeps): Promise<void>
```
Each calls the REST path then re-runs `loadCronJobs(deps)`. Re-use the SAME `deps` so tests inject one mock.

- [ ] **Step 3a — Failing store tests for control actions.** Append to `cron-store.test.ts`:
  ```ts
  import {
    deleteCronJobAction,
    pauseCronJobAction,
    resumeCronJobAction,
    triggerCronJobAction,
  } from './cron-store'

  describe('control actions', () => {
    it('pause POSTs the pause path then re-fetches the list', async () => {
      const api = vi.fn().mockImplementation((req: { path: string }) =>
        req.path === '/api/cron/jobs' ? Promise.resolve([job]) : Promise.resolve(job),
      )
      await pauseCronJobAction('job-1', { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/pause', method: 'POST' })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
      expect($cronJobsStatus.get()).toBe('ready')
    })

    it('resume POSTs the resume path then re-fetches', async () => {
      const api = vi.fn().mockResolvedValue([job])
      await resumeCronJobAction('job-1', { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/resume', method: 'POST' })
    })

    it('trigger POSTs the trigger path then re-fetches', async () => {
      const api = vi.fn().mockResolvedValue([job])
      await triggerCronJobAction('job-1', { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/trigger', method: 'POST' })
    })

    it('delete DELETEs the job path then re-fetches', async () => {
      const api = vi.fn().mockImplementation((req: { path: string }) =>
        req.path === '/api/cron/jobs' ? Promise.resolve([]) : Promise.resolve({ ok: true }),
      )
      await deleteCronJobAction('job-1', { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1', method: 'DELETE' })
      expect($cronJobsStatus.get()).toBe('empty')
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: imports for the four actions fail to resolve (`pauseCronJobAction` etc. are not exported).
- [ ] **Implement the actions in `cron-store.ts`** (append):
  ```ts
  export async function pauseCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/pause`, method: 'POST' })
    await loadCronJobs(deps)
  }

  export async function resumeCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/resume`, method: 'POST' })
    await loadCronJobs(deps)
  }

  export async function triggerCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}/trigger`, method: 'POST' })
    await loadCronJobs(deps)
  }

  export async function deleteCronJobAction(id: string, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}`, method: 'DELETE' })
    await loadCronJobs(deps)
  }
  ```
  > NB: the test asserts plain `{ path }` for the list re-fetch and `{ path, method }` for the mutation. `encodeURIComponent('job-1')` === `'job-1'`, so the literal strings in the test match.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: all store tests pass (7 total).
- [ ] **Step 3b — Failing interaction test.** Append to `cron-screen.test.tsx`:
  ```ts
  import { fireEvent } from '@testing-library/react'
  import { vi } from 'vitest'

  import * as store from '@/aether/domain/cron/cron-store'

  describe('CronScreen controls', () => {
    it('clicking pause calls pauseCronJobAction with the job id', () => {
      const spy = vi.spyOn(store, 'pauseCronJobAction').mockResolvedValue()
      $cronJobs.set(jobs)
      $cronJobsStatus.set('ready')
      render(<CronScreen />)
      fireEvent.click(screen.getAllByRole('button', { name: 'Tạm dừng' })[0])
      expect(spy).toHaveBeenCalledWith('a')
      spy.mockRestore()
    })

    it('clicking trigger calls triggerCronJobAction', () => {
      const spy = vi.spyOn(store, 'triggerCronJobAction').mockResolvedValue()
      $cronJobs.set(jobs)
      $cronJobsStatus.set('ready')
      render(<CronScreen />)
      fireEvent.click(screen.getAllByRole('button', { name: 'Chạy ngay' })[0])
      expect(spy).toHaveBeenCalledWith('a')
      spy.mockRestore()
    })
  })
  ```
  > The paused job (`b`) shows a "Tiếp tục" (resume) button; the scheduled job (`a`) shows "Tạm dừng" (pause). The test targets index 0 (`a`).
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: `Unable to find ... button name "Tạm dừng"` — controls not rendered yet.
- [ ] **Implement controls in `cron-screen.tsx`.** Import the actions; render a control cluster on each row. Pause/Resume is conditional on `state`:
  ```tsx
  import {
    $cronJobs,
    $cronJobsStatus,
    deleteCronJobAction,
    loadCronJobs,
    pauseCronJobAction,
    resumeCronJobAction,
    triggerCronJobAction,
  } from '@/aether/domain/cron/cron-store'
  ```
  Inside the row, after the text block:
  ```tsx
  <div className="flex flex-none items-center gap-1.5">
    {state === 'paused' ? (
      <button
        aria-label="Tiếp tục"
        className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-ok)]"
        onClick={() => void resumeCronJobAction(job.id)}
        type="button"
      >
        Tiếp tục
      </button>
    ) : (
      <button
        aria-label="Tạm dừng"
        className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-warn)]"
        onClick={() => void pauseCronJobAction(job.id)}
        type="button"
      >
        Tạm dừng
      </button>
    )}
    <button
      aria-label="Chạy ngay"
      className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-azure-soft)]"
      onClick={() => void triggerCronJobAction(job.id)}
      type="button"
    >
      Chạy ngay
    </button>
    <button
      aria-label="Xóa"
      className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-dim)] hover:text-[color:var(--ae-warn)]"
      onClick={() => void deleteCronJobAction(job.id)}
      type="button"
    >
      Xóa
    </button>
  </div>
  ```
  > Wrap the existing text block + this control cluster in a flex row so the row reads `<text> ... <controls>`. Keep `aria-label` exact for the tests. (Optional polish: a confirm step for Xóa — out of scope for this slice; the action fires directly.)
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: `Tests  6 passed`.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/domain/cron/cron-store.ts apps/desktop/src/aether/domain/cron/cron-store.test.ts apps/desktop/src/aether/ui/screens/cron-screen.tsx apps/desktop/src/aether/ui/screens/cron-screen.test.tsx
  git commit -m "feat(aether-desktop): cron pause/resume/trigger/delete controls with re-fetch

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 4 — Create / update flow: schedule builder + delivery-target selector

**Files:**
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.ts`
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.test.ts`
- Create: `apps/desktop/src/aether/ui/screens/cron-form.tsx`
- Create: `apps/desktop/src/aether/ui/screens/cron-form.test.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.tsx` (mount the form via a "Tạo tác vụ" toggle)

**Interfaces (add to store):**
```ts
export interface CronDeliveryTarget { id: string; name: string; home_target_set: boolean; home_env_var: string | null }
export const $cronDeliveryTargets: WritableAtom<CronDeliveryTarget[]>  // seed [{ id:'local', name:'Local', home_target_set:true, home_env_var:null }]
export function loadCronDeliveryTargets(deps?: CronStoreDeps): Promise<void>  // GET /api/cron/delivery-targets → { targets }
export function createCronJobAction(body: CronJobCreatePayload, deps?: CronStoreDeps): Promise<void>  // POST /api/cron/jobs body=payload, then re-fetch
export function updateCronJobAction(id: string, updates: CronJobUpdates, deps?: CronStoreDeps): Promise<void>  // PUT /api/cron/jobs/{id} body={updates}, then re-fetch
```
Schedule builder: implement a **minimal** Vietnamese builder (do NOT import `web/src/components/ScheduleBuilder` or `web/src/lib/schedule`). Port the smallest useful logic: a kind selector (Hằng ngày / Hằng tuần / Tùy chỉnh) producing a 5-field cron `expr`, plus a raw-expression fallback. The form's `onSubmit` derives the `schedule` string and emits `CronJobCreatePayload`.

`buildSchedule(state)` (local, minimal — mirror `web/src/lib/schedule.ts:104` shape but only daily/weekly/custom):
```ts
export type CronScheduleKind = 'daily' | 'weekly' | 'custom'
export interface CronScheduleState { kind: CronScheduleKind; hour: number; minute: number; weekday: number; expr: string }
export const DEFAULT_CRON_SCHEDULE: CronScheduleState = { kind: 'daily', hour: 7, minute: 0, weekday: 1, expr: '' }
export function buildCronSchedule(s: CronScheduleState): string {
  if (s.kind === 'custom') { return s.expr.trim() }
  const m = Math.max(0, Math.min(59, s.minute))
  const h = Math.max(0, Math.min(23, s.hour))
  if (s.kind === 'weekly') { return `${m} ${h} * * ${Math.max(0, Math.min(6, s.weekday))}` }
  return `${m} ${h} * * *`
}
```

- [ ] **Step 4a — Failing store tests (delivery targets + create/update).** Append to `cron-store.test.ts`:
  ```ts
  import {
    $cronDeliveryTargets,
    createCronJobAction,
    loadCronDeliveryTargets,
    updateCronJobAction,
  } from './cron-store'

  describe('delivery targets', () => {
    it('GETs /api/cron/delivery-targets and unwraps { targets }', async () => {
      const targets = [{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }, { id: 'telegram', name: 'Telegram', home_target_set: true, home_env_var: 'TG' }]
      const api = vi.fn().mockResolvedValue({ targets })
      await loadCronDeliveryTargets({ api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/delivery-targets' })
      expect($cronDeliveryTargets.get()).toEqual(targets)
    })

    it('falls back to local-only when the endpoint rejects', async () => {
      const api = vi.fn().mockRejectedValue(new Error('nope'))
      await loadCronDeliveryTargets({ api })
      expect($cronDeliveryTargets.get()).toEqual([{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }])
    })
  })

  describe('create/update', () => {
    it('create POSTs the payload as the body then re-fetches', async () => {
      const api = vi.fn().mockResolvedValue([job])
      const payload = { prompt: 'Tóm tắt tin', schedule: '0 7 * * *', name: 'Brief', deliver: 'local' }
      await createCronJobAction(payload, { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs', method: 'POST', body: payload })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs' })
    })

    it('update PUTs { updates } then re-fetches', async () => {
      const api = vi.fn().mockResolvedValue([job])
      await updateCronJobAction('job-1', { name: 'Mới' }, { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1', method: 'PUT', body: { updates: { name: 'Mới' } } })
    })
  })
  ```
  > Reset `$cronDeliveryTargets` in `afterEach` too.
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: unresolved exports `$cronDeliveryTargets`, `loadCronDeliveryTargets`, `createCronJobAction`, `updateCronJobAction`.
- [ ] **Implement in `cron-store.ts`** (append; import `CronJobCreatePayload`, `CronJobUpdates`):
  ```ts
  import type { CronJob, CronJobCreatePayload, CronJobUpdates } from '@/types/aether'

  export interface CronDeliveryTarget {
    id: string
    name: string
    home_target_set: boolean
    home_env_var: string | null
  }

  const LOCAL_TARGET: CronDeliveryTarget = { id: 'local', name: 'Local', home_target_set: true, home_env_var: null }

  export const $cronDeliveryTargets = atom<CronDeliveryTarget[]>([LOCAL_TARGET])

  export async function loadCronDeliveryTargets(deps: CronStoreDeps = defaultDeps()): Promise<void> {
    try {
      const { targets } = await deps.api<{ targets: CronDeliveryTarget[] }>({ path: '/api/cron/delivery-targets' })
      $cronDeliveryTargets.set(targets?.length ? targets : [LOCAL_TARGET])
    } catch {
      $cronDeliveryTargets.set([LOCAL_TARGET])
    }
  }

  export async function createCronJobAction(body: CronJobCreatePayload, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: '/api/cron/jobs', method: 'POST', body })
    await loadCronJobs(deps)
  }

  export async function updateCronJobAction(id: string, updates: CronJobUpdates, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    await deps.api({ path: `/api/cron/jobs/${encodeURIComponent(id)}`, method: 'PUT', body: { updates } })
    await loadCronJobs(deps)
  }
  ```
  > Merge the `import type` with the existing `CronJob` import at the top — do not duplicate.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: all store tests pass (13 total).
- [ ] **Step 4b — Failing form test.** Write `cron-form.test.tsx`:
  ```ts
  import { cleanup, fireEvent, render, screen } from '@testing-library/react'
  import { afterEach, describe, expect, it, vi } from 'vitest'

  import { $cronDeliveryTargets } from '@/aether/domain/cron/cron-store'

  import { CronForm } from './cron-form'

  afterEach(() => {
    cleanup()
    $cronDeliveryTargets.set([{ id: 'local', name: 'Local', home_target_set: true, home_env_var: null }])
  })

  describe('CronForm', () => {
    it('submits a CronJobCreatePayload with a built daily schedule', () => {
      const onSubmit = vi.fn()
      render(<CronForm onCancel={() => {}} onSubmit={onSubmit} />)
      fireEvent.change(screen.getByLabelText('Lời nhắc'), { target: { value: 'Tóm tắt tin' } })
      fireEvent.change(screen.getByLabelText('Giờ'), { target: { value: '7' } })
      fireEvent.change(screen.getByLabelText('Phút'), { target: { value: '0' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ prompt: 'Tóm tắt tin', schedule: '0 7 * * *', deliver: 'local' }))
    })

    it('lists every delivery target in the selector', () => {
      $cronDeliveryTargets.set([
        { id: 'local', name: 'Local', home_target_set: true, home_env_var: null },
        { id: 'telegram', name: 'Telegram', home_target_set: true, home_env_var: 'TG' },
      ])
      render(<CronForm onCancel={() => {}} onSubmit={() => {}} />)
      expect(screen.getByRole('option', { name: 'Telegram' })).toBeTruthy()
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-form.test.tsx`
  Expected: `Failed to resolve import "./cron-form"`.
- [ ] **Implement `cron-form.tsx`** (controlled inputs; daily/weekly/custom kind; native `<select>` for delivery so `getByRole('option')` works). Props:
  ```tsx
  import { useStore } from '@nanostores/react'
  import { useState } from 'react'

  import { $cronDeliveryTargets } from '@/aether/domain/cron/cron-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'
  import type { CronJobCreatePayload } from '@/types/aether'

  type CronScheduleKind = 'daily' | 'weekly' | 'custom'

  function buildSchedule(kind: CronScheduleKind, hour: number, minute: number, weekday: number, expr: string): string {
    if (kind === 'custom') { return expr.trim() }
    const m = Math.max(0, Math.min(59, minute))
    const h = Math.max(0, Math.min(23, hour))
    if (kind === 'weekly') { return `${m} ${h} * * ${Math.max(0, Math.min(6, weekday))}` }
    return `${m} ${h} * * *`
  }

  export function CronForm({
    onCancel,
    onSubmit,
  }: {
    onCancel: () => void
    onSubmit: (payload: CronJobCreatePayload) => void
  }) {
    const targets = useStore($cronDeliveryTargets)
    const [name, setName] = useState('')
    const [prompt, setPrompt] = useState('')
    const [kind, setKind] = useState<CronScheduleKind>('daily')
    const [hour, setHour] = useState(7)
    const [minute, setMinute] = useState(0)
    const [weekday, setWeekday] = useState(1)
    const [expr, setExpr] = useState('')
    const [deliver, setDeliver] = useState('local')

    const submit = () => {
      const schedule = buildSchedule(kind, hour, minute, weekday, expr)
      if (!prompt.trim() || !schedule) { return }
      onSubmit({ prompt: prompt.trim(), schedule, name: name.trim() || undefined, deliver })
    }

    return (
      <GlassSlab className="flex flex-col gap-3" size="md">
        <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
          Tên (tùy chọn)
          <input className="ae-field" onChange={e => setName(e.target.value)} value={name} />
        </label>
        <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
          Lời nhắc
          <textarea className="ae-field min-h-[64px]" onChange={e => setPrompt(e.target.value)} value={prompt} />
        </label>

        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
            Lịch
            <select className="ae-field" onChange={e => setKind(e.target.value as CronScheduleKind)} value={kind}>
              <option value="daily">Hằng ngày</option>
              <option value="weekly">Hằng tuần</option>
              <option value="custom">Tùy chỉnh</option>
            </select>
          </label>
          {kind !== 'custom' && (
            <>
              <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
                Giờ
                <input className="ae-field w-[64px]" max={23} min={0} onChange={e => setHour(Number(e.target.value))} type="number" value={hour} />
              </label>
              <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
                Phút
                <input className="ae-field w-[64px]" max={59} min={0} onChange={e => setMinute(Number(e.target.value))} type="number" value={minute} />
              </label>
            </>
          )}
          {kind === 'weekly' && (
            <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
              Thứ
              <select className="ae-field" onChange={e => setWeekday(Number(e.target.value))} value={weekday}>
                <option value={1}>Thứ 2</option>
                <option value={2}>Thứ 3</option>
                <option value={3}>Thứ 4</option>
                <option value={4}>Thứ 5</option>
                <option value={5}>Thứ 6</option>
                <option value={6}>Thứ 7</option>
                <option value={0}>Chủ nhật</option>
              </select>
            </label>
          )}
          {kind === 'custom' && (
            <label className="flex flex-1 flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
              Biểu thức cron
              <input className="ae-field font-mono" onChange={e => setExpr(e.target.value)} placeholder="0 7 * * *" value={expr} />
            </label>
          )}
        </div>

        <label className="flex flex-col gap-1 text-[11px] text-[color:var(--ae-dim)]">
          Gửi tới
          <select className="ae-field" onChange={e => setDeliver(e.target.value)} value={deliver}>
            {targets.map(t => (
              <option key={t.id} value={t.id}>
                {t.id === 'local' ? 'Local' : t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2">
          <button className="rounded-[9px] px-3 py-1.5 text-[12px] text-[color:var(--ae-dim)]" onClick={onCancel} type="button">
            Hủy
          </button>
          <button
            className="rounded-[10px] border border-[color:var(--ae-azure-soft)] px-3 py-1.5 text-[12px] text-[color:var(--ae-azure-soft)]"
            onClick={submit}
            type="button"
          >
            Lưu
          </button>
        </div>
      </GlassSlab>
    )
  }
  ```
  > `ae-field` is a styling-only class. Verify it exists with `grep -rn "ae-field" apps/desktop/src`; if absent, either add a small token-only rule to the AETHER stylesheet (the file that already defines `.ae-slab`/`.ae-screen-bare` — find with `grep -rln "ae-slab" apps/desktop/src`) using only `--ae-*` tokens, OR drop the class and inline minimal token-based className. Do NOT introduce hardcoded hex.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-form.test.tsx`
  Expected: `Tests  2 passed`.
- [ ] **Wire the form into `cron-screen.tsx`.** Add a "Tạo tác vụ" toggle button in the header that flips a local `showForm` state; render `<CronForm>` above the list when open; load delivery targets on mount (guarded). On submit call `createCronJobAction(payload)` then close + the action's re-fetch refreshes the list. Add to the mount effect:
  ```tsx
  useEffect(() => {
    if ($cronJobsStatus.get() === 'idle') { void loadCronJobs() }
    void loadCronDeliveryTargets()
  }, [])
  ```
  This is render-only glue (no new assertion needed); re-run the screen test to confirm green.
- [ ] **Run — expect PASS (regression).** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: `Tests  6 passed`.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/domain/cron/cron-store.ts apps/desktop/src/aether/domain/cron/cron-store.test.ts apps/desktop/src/aether/ui/screens/cron-form.tsx apps/desktop/src/aether/ui/screens/cron-form.test.tsx apps/desktop/src/aether/ui/screens/cron-screen.tsx
  git commit -m "feat(aether-desktop): cron create/update + schedule builder + delivery selector

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 5 — Run history (getCronJobRuns) panel + prompt-cache guard

**Files:**
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.ts`
- Modify: `apps/desktop/src/aether/domain/cron/cron-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.test.tsx`

**Interfaces (add to store):**
```ts
export const $cronRuns: WritableAtom<SessionInfo[] | null>            // runs for the selected job
export const $cronRunsJobId: WritableAtom<string | null>             // which job the runs belong to
export const $cronRunsStatus: WritableAtom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>
export function loadCronRuns(jobId: string, limit?: number, deps?: CronStoreDeps): Promise<void>  // GET /api/cron/jobs/{id}/runs?limit=N → unwrap { runs }
```
**Prompt-cache safety:** `loadCronRuns` uses ONLY `GET /api/cron/jobs/{id}/runs?limit=N`, which returns `SessionInfo[]` (metadata). It NEVER fetches `/api/sessions/{id}/messages`, never subscribes to conversation deltas, never calls `appendAssistantDelta`. The panel renders `title`/`started_at`/`is_active`/`message_count` only.

- [ ] **Step 5a — Failing store test for `loadCronRuns`.** Append to `cron-store.test.ts`:
  ```ts
  import { $cronRuns, $cronRunsStatus, loadCronRuns } from './cron-store'
  import type { SessionInfo } from '@/types/aether'

  const run: SessionInfo = {
    id: 'run-1', title: 'Lần chạy 1', started_at: 1, ended_at: 2, last_active: 2,
    is_active: false, message_count: 4, model: 'x', input_tokens: 0, output_tokens: 0,
    preview: null, source: 'cron', tool_call_count: 0,
  }

  describe('loadCronRuns', () => {
    it('GETs the runs path with the limit and unwraps { runs } (metadata only)', async () => {
      const api = vi.fn().mockResolvedValue({ runs: [run] })
      await loadCronRuns('job-1', 10, { api })
      expect(api).toHaveBeenCalledWith({ path: '/api/cron/jobs/job-1/runs?limit=10' })
      // HARD: only the runs path is hit — never a messages stream
      const paths = api.mock.calls.map(c => c[0].path as string)
      expect(paths.every(p => !p.includes('/messages'))).toBe(true)
      expect($cronRuns.get()).toEqual([run])
      expect($cronRunsStatus.get()).toBe('ready')
    })

    it('sets empty for no runs', async () => {
      const api = vi.fn().mockResolvedValue({ runs: [] })
      await loadCronRuns('job-1', 10, { api })
      expect($cronRunsStatus.get()).toBe('empty')
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: unresolved `$cronRuns`, `loadCronRuns`.
- [ ] **Implement in `cron-store.ts`** (append; merge `SessionInfo` into the existing `@/types/aether` import):
  ```ts
  export const $cronRuns = atom<SessionInfo[] | null>(null)
  export const $cronRunsJobId = atom<string | null>(null)
  export const $cronRunsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

  export async function loadCronRuns(jobId: string, limit = 20, deps: CronStoreDeps = defaultDeps()): Promise<void> {
    $cronRunsJobId.set(jobId)
    $cronRunsStatus.set('loading')

    try {
      const { runs } = await deps.api<{ runs: SessionInfo[] }>({
        path: `/api/cron/jobs/${encodeURIComponent(jobId)}/runs?limit=${limit}`,
      })
      const list = runs ?? []
      $cronRuns.set(list)
      $cronRunsStatus.set(list.length === 0 ? 'empty' : 'ready')
    } catch {
      $cronRunsStatus.set('error')
    }
  }
  ```
  > Mirrors `getCronJobRuns` in aether-api.ts (same path + `{ runs }` unwrap) — metadata only, no message stream.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/cron-store.test.ts`
  Expected: all store tests pass (17 total).
- [ ] **Step 5b — Failing prompt-cache guard + render test.** Append to `cron-screen.test.tsx`:
  ```ts
  import { $cronRuns, $cronRunsStatus } from '@/aether/domain/cron/cron-store'

  describe('CronScreen run history (prompt-cache safe)', () => {
    it('clicking a job loads its runs via getCronJobRuns metadata only', () => {
      const spy = vi.spyOn(store, 'loadCronRuns').mockResolvedValue()
      $cronJobs.set(jobs)
      $cronJobsStatus.set('ready')
      render(<CronScreen />)
      fireEvent.click(screen.getByText('Brief sáng'))
      expect(spy).toHaveBeenCalledWith('a')
      spy.mockRestore()
    })

    it('renders run rows from SessionInfo metadata (title + message_count) without opening a conversation', () => {
      $cronJobs.set(jobs)
      $cronJobsStatus.set('ready')
      $cronRuns.set([
        { id: 'r1', title: 'Lần chạy', started_at: 1, ended_at: 2, last_active: 2, is_active: false, message_count: 4, model: 'x', input_tokens: 0, output_tokens: 0, preview: null, source: 'cron', tool_call_count: 0 },
      ])
      $cronRunsStatus.set('ready')
      render(<CronScreen />)
      expect(screen.getByText('Lần chạy')).toBeTruthy()
      // HARD guard: the screen module must not reference a message-stream / delta API
      // (forbidden-import assertion lives in the source review below).
    })
  })
  ```
  Also add a **forbidden-symbol assertion** so the guard is mechanical:
  ```ts
  import { readFileSync } from 'node:fs'
  import { fileURLToPath } from 'node:url'

  describe('CronScreen prompt-cache forbidden symbols', () => {
    it('never imports a conversation/delta API', () => {
      const src = readFileSync(fileURLToPath(new URL('./cron-screen.tsx', import.meta.url)), 'utf8')
      // Justification: the cron screen is non-chat; touching any of these would
      // open a conversation stream and poison the prompt cache.
      expect(src).not.toMatch(/appendAssistantDelta|getSessionMessages|message\.delta|reasoning\.delta|thinking\./)
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: the click test fails (no run-history wiring yet) — `loadCronRuns` not called / no clickable title handler. (The forbidden-symbol test should already pass — that is fine, it locks the invariant.)
- [ ] **Implement run-history panel in `cron-screen.tsx`.** Make a job row's title clickable (a `<button>` wrapping the title or an `onClick` on the row) that calls `loadCronRuns(job.id)` and records the selected id; render a side/below panel reading `$cronRuns` + `$cronRunsStatus`:
  ```tsx
  import { $cronRuns, $cronRunsJobId, $cronRunsStatus, loadCronRuns } from '@/aether/domain/cron/cron-store'
  // ...
  const runs = useStore($cronRuns)
  const runsStatus = useStore($cronRunsStatus)
  const selectedJobId = useStore($cronRunsJobId)
  ```
  Title becomes:
  ```tsx
  <button className="truncate text-left text-[13.5px] font-semibold text-white" onClick={() => void loadCronRuns(job.id)} type="button">
    {jobTitle(job)}
  </button>
  ```
  Run-history panel (shown when `selectedJobId`):
  ```tsx
  {selectedJobId && (
    <GlassSlab className="flex flex-col gap-2" size="sm">
      <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">LỊCH SỬ CHẠY</div>
      {runsStatus === 'loading' && <div className="text-[11px] text-[color:var(--ae-dim)]">Đang tải…</div>}
      {runsStatus === 'empty' && <div className="text-[11px] text-[color:var(--ae-dim)]">Chưa có lần chạy nào.</div>}
      {runsStatus === 'error' && <div className="text-[11px] text-[color:var(--ae-warn)]">Không tải được lịch sử.</div>}
      {runsStatus === 'ready' &&
        (runs ?? []).map(run => (
          <div className="flex items-center justify-between text-[11px]" key={run.id}>
            <span className="truncate text-[#D7ECFA]">{run.title ?? run.id}</span>
            <span className="flex-none text-[color:var(--ae-dim)]">
              {run.is_active ? 'đang chạy' : `${run.message_count} tin`} · {formatTime(new Date(run.started_at * 1000).toISOString())}
            </span>
          </div>
        ))}
    </GlassSlab>
  )}
  ```
  > `started_at` is a UNIX seconds number on `SessionInfo`; convert before `formatTime`. Confirm units with the type (`types/aether.ts:333` `started_at: number`). Render metadata ONLY — never open the run's conversation.
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: all screen tests pass (9 total incl. the forbidden-symbol guard).
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/domain/cron/cron-store.ts apps/desktop/src/aether/domain/cron/cron-store.test.ts apps/desktop/src/aether/ui/screens/cron-screen.tsx apps/desktop/src/aether/ui/screens/cron-screen.test.tsx
  git commit -m "feat(aether-desktop): cron run-history panel (metadata only) + prompt-cache guard test

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 6 — Guarded light poll for live run status

**Files:**
- Create: `apps/desktop/src/aether/domain/cron/use-cron-poll.ts`
- Test: `apps/desktop/src/aether/domain/cron/use-cron-poll.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/cron-screen.tsx`

**Interfaces:**
```ts
export function useCronPoll(intervalMs?: number): void  // setInterval(loadCronJobs, intervalMs); cleared on unmount; pauses under prefers-reduced-motion? NO — polling is data, not motion; keep polling but respect the SP-0 gate only for animation.
```
**Guard (documented):** the interval id is captured in the effect and returned in the cleanup so React clears it on unmount — no leaked timer, no background fetch after the screen closes. The poll is a LIGHT re-fetch of the job LIST (`loadCronJobs`) only — never a conversation socket. Default interval 15000ms.

- [ ] **Step 6 — Failing poll-guard test.** Write `use-cron-poll.test.ts`:
  ```ts
  import { renderHook } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import * as store from './cron-store'
  import { useCronPoll } from './use-cron-poll'

  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('useCronPoll', () => {
    it('re-fetches the job list on each interval tick', () => {
      const spy = vi.spyOn(store, 'loadCronJobs').mockResolvedValue()
      renderHook(() => useCronPoll(1000))
      expect(spy).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)
      expect(spy).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1000)
      expect(spy).toHaveBeenCalledTimes(2)
    })

    it('clears the interval on unmount — no leaked timer', () => {
      const spy = vi.spyOn(store, 'loadCronJobs').mockResolvedValue()
      const { unmount } = renderHook(() => useCronPoll(1000))
      vi.advanceTimersByTime(1000)
      expect(spy).toHaveBeenCalledTimes(1)
      unmount()
      vi.advanceTimersByTime(5000)
      expect(spy).toHaveBeenCalledTimes(1) // no further calls after unmount
    })
  })
  ```
- [ ] **Run — expect FAIL.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/use-cron-poll.test.ts`
  Expected: `Failed to resolve import "./use-cron-poll"`.
- [ ] **Implement `use-cron-poll.ts`.**
  ```ts
  import { useEffect } from 'react'

  import { loadCronJobs } from './cron-store'

  /**
   * Guarded light poll for live cron run status. Re-fetches the job LIST only
   * (REST, metadata) on a fixed interval, never a conversation socket — keeps the
   * "next run / state" badges fresh while a job fires. The interval is captured
   * in the effect and cleared in the cleanup so it never leaks past unmount.
   */
  export function useCronPoll(intervalMs = 15_000): void {
    useEffect(() => {
      const id = setInterval(() => {
        void loadCronJobs()
      }, intervalMs)

      return () => {
        clearInterval(id)
      }
    }, [intervalMs])
  }
  ```
- [ ] **Run — expect PASS.** `cd apps/desktop && npm run test:ui -- src/aether/domain/cron/use-cron-poll.test.ts`
  Expected: `Tests  2 passed`.
- [ ] **Wire into `cron-screen.tsx`.** Call `useCronPoll()` near the top of `CronScreen` (after the mount-load effect). Render-only glue; re-run the screen test for regression.
- [ ] **Run — expect PASS (regression).** `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/cron-screen.test.tsx`
  Expected: all screen tests still pass.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/domain/cron/use-cron-poll.ts apps/desktop/src/aether/domain/cron/use-cron-poll.test.ts apps/desktop/src/aether/ui/screens/cron-screen.tsx
  git commit -m "feat(aether-desktop): guarded light poll for live cron status (cleared on unmount)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 7 — Mount CronScreen in the shell

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`

**Interfaces:** Consumes `CronScreen`; replaces `<StubScreen title="Cron" />` at `path="cron"` (`aether-shell.tsx:55`).

- [ ] **Swap the route.**
  Add the import (alongside the other screen imports, ~line 12):
  ```tsx
  import { CronScreen } from '@/aether/ui/screens/cron-screen'
  ```
  Replace line 55:
  ```tsx
  <Route element={<StubScreen title="Cron" />} path="cron" />
  ```
  with:
  ```tsx
  <Route element={<CronScreen />} path="cron" />
  ```
- [ ] **Run the full suite — expect PASS.** `cd apps/desktop && npm run test:ui`
  Expected: all suites green, including the shell test (`aether-shell.test.tsx`) and the new cron suites. If the shell test asserts on the stub Cron text, update that assertion to the new screen's marker (e.g. `Tác vụ định kỳ`) — check first with `grep -n "Cron" src/aether/ui/shell/aether-shell.test.tsx`.
- [ ] **Type-check — expect PASS.** `cd apps/desktop && npx tsc --noEmit` (or the project's typecheck script — confirm with `grep -n "\"typecheck\"\|\"lint\"" apps/desktop/package.json`). Expected: no errors.
- [ ] **Commit.**
  ```
  git add apps/desktop/src/aether/ui/shell/aether-shell.tsx
  git commit -m "feat(aether-desktop): mount CronScreen at /cron (replace stub)

  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Self-Review vs spec §5.1 Cron bullets

Confirm each before declaring done (evidence = passing test + rendered element):

- [ ] **Job list + next-run + trạng thái** — `loadCronJobs` (`getCronJobs`) fills `$cronJobs`; rows render title, `scheduleText`, `next_run_at`, `last_run_at`, and a Vietnamese state badge (`stateLabel`/`stateColor`). Single-job detail (`getCronJob`) is not separately surfaced — the list payload already carries every field the row needs; note this as a deliberate scope call (add `getCronJob` only if a future detail view needs a fresh single-row fetch). (Tasks 1–2)
- [ ] **CRUD + control** — create (`createCronJobAction`/`createCronJob`), update (`updateCronJobAction`/`updateCronJob` with `{ updates }` body), delete (`deleteCronJobAction`/`deleteCronJob`), pause/resume/trigger actions — each calls the correct REST shape then re-fetches the list. (Tasks 3–4)
- [ ] **Schedule builder + delivery target selector** — `CronForm` builds a 5-field cron `expr` (daily/weekly/custom) and offers a native `<select>` over `$cronDeliveryTargets` (loaded from `GET /api/cron/delivery-targets`, local-only fallback on error). (Task 4)
- [ ] **Run history** — `loadCronRuns` (`getCronJobRuns`) returns `SessionInfo[]` metadata; the panel renders title/started_at/message_count/active only. (Task 5)
- [ ] **Prompt-cache safety (HARD)** — run history hits ONLY the `/runs` path; the forbidden-symbol test asserts the screen never references `appendAssistantDelta`/`getSessionMessages`/`message.delta`/`reasoning.delta`/`thinking.*`; the live poll is `useCronPoll` (list re-fetch only) with a unmount-cleared interval proven by the fake-timer test. (Tasks 5–6)
- [ ] **Localization & tokens** — all UI strings Vietnamese; "Agent" never translated; colors via `--ae-*` only (no raw hex outside tokens). (All tasks)

### Signature notes / corrections discovered while reading source
1. **No desktop `getCronDeliveryTargets` method exists** — only `web/src/lib/api.ts` has it. The store calls `GET /api/cron/delivery-targets` directly via `deps.api` and unwraps `{ targets }`. No backend endpoint is added (the path already exists at `aether_cli/web_server.py:7790`).
2. **`updateCronJob` wraps the body** as `{ updates }` (not the raw `CronJobUpdates`) — tests assert `body: { updates: … }`.
3. **`getCronJobRuns` unwraps `{ runs }`** and defaults `limit=20`; `loadCronRuns` mirrors this exactly.
4. **`CronDeliveryTarget`** shape is mirrored locally from `web/src/lib/api.ts:1910` (`{ id, name, home_target_set, home_env_var }`) — no shared export on the desktop side.
5. **`SessionInfo.started_at` is UNIX seconds (number)** — multiply by 1000 before `new Date(...)` in the run-history row.
