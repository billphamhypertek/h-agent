# AETHER SP-2 · Plan 5 — Vận hành & Tài chính Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the read-only Vận hành & Tài chính cockpit at `/ops` — calendar + tasks (wired), second-brain notes (wired-lite), and a finance-ledger frame that renders an honest "Chưa có nguồn tài chính" empty-state — reading its slice from the unified Company-OS artifact.

**Architecture:** A nanostore selects the `ops` slice of the cached `CompanyOs` artifact (Plan 1) and exposes data + status atoms + a `loadOps()` action. A presentation-only screen renders calendar entries, tasks, notes (wired/wired-lite) and finance KPI tiles + a ledger frame (empty-state), with skeleton/empty/error states and a "Làm mới" force re-read. Route, nav item, ⌘K catalog entry, and shell wiring make it reachable. Same end-to-end pattern as Plans 3–4.

**Tech Stack:** TypeScript, nanostores + `@nanostores/react`, React, vitest + jsdom + `@testing-library/react`.

**Depends on:** SP-2 Plan 1 (`CompanyOs`, `readLatestCompanyOs`, `OpsSection`/`OpsCalendarEntry`/`OpsTask`/`OpsFinance`/`OpsNote` types). Pattern-mirrors SP-2 Plan 3.

## Global Constraints

(Inherited from SP-2 Plan 1.)

- **0 Python core changes.** Read REST + finished cron-run artifact only.
- **Prompt-cache safety (hard):** screen + store must not reference `appendAssistantDelta`, `message.delta`, `reasoning.delta`, `thinking.`, `subscribeToSession`, or `onSessionEvent`. Live refresh is the "Làm mới" button only.
- **No fabricated data.** Finance has no source yet → KPI tiles + ledger render the honest empty-state; no invented numbers.
- **Brand `#07397d`** via tokens; never hardcode colors outside `--ae-*` / `--dt-*`. Screen root `.ae-screen-bare flex h-full min-w-0 flex-col`; cards `<GlassSlab size>`; no root padding/background.
- **Localization (hard):** Vietnamese UI; never translate "Agent" → "Đại lý".
- **Status union:** `'idle' | 'loading' | 'ready' | 'empty' | 'error'`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/aether/domain/ops/ops-store.ts` | `$ops`, `$opsStatus`, `loadOps()` — select the `ops` slice; missing/empty → `'empty'`, thrown → `'error'`. |
| `apps/desktop/src/aether/domain/ops/ops-store.test.ts` | Store action tests. |
| `apps/desktop/src/aether/ui/screens/ops-screen.tsx` | Presentation: calendar + tasks + notes (wired/wired-lite) + finance (empty-state) + states + "Làm mới". |
| `apps/desktop/src/aether/ui/screens/ops-screen.test.tsx` | Render + interaction tests. |
| `apps/desktop/src/aether/ui/screens/ops-screen.guard.test.tsx` | Prompt-cache guard. |
| `apps/desktop/src/app/routes.ts` | Add `OPS_ROUTE`, registry entry, union members. |
| `apps/desktop/src/aether/ui/shell/nav-items.tsx` | Add the Ops nav-rail item. |
| `apps/desktop/src/app/command-palette/index.tsx` | Add a `nav-ops` Go-to entry. |
| `apps/desktop/src/app/command-palette/catalog.test.tsx` | Extend for `OPS_ROUTE`. |
| `apps/desktop/src/aether/ui/shell/aether-shell.tsx` | Import + route `<OpsScreen />`. |
| `apps/desktop/src/aether/ui/shell/aether-shell-ops-route.test.tsx` | Source-assertion shell route test. |

---

### Task 1: Ops store

**Files:**
- Create: `apps/desktop/src/aether/domain/ops/ops-store.ts`
- Test: `apps/desktop/src/aether/domain/ops/ops-store.test.ts`

**Interfaces:**
- Consumes: `readLatestCompanyOs`, `ReadCompanyOsDeps` from `@/aether/domain/company-os/read-company-os`; `CompanyOs`, `OpsSection` from `@/aether/domain/company-os/company-os-schema`.
- Produces: `$ops: atom<OpsSection | null>`, `$opsStatus: atom<PillarStatus>`, `loadOps(opts?: { force?: boolean; read?: CompanyOsReader }): Promise<void>`, `PillarStatus`, `CompanyOsReader`.

> **Note:** emptiness is keyed on the wired sources (calendar + tasks + notes). A finance-less ops slice is still `ready` — the finance section renders its own empty-state.

- [ ] **Step 1: Write the failing store test**

Create `apps/desktop/src/aether/domain/ops/ops-store.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $ops, $opsStatus, loadOps } from './ops-store'

beforeEach(() => {
  $ops.set(null)
  $opsStatus.set('idle')
})

describe('loadOps', () => {
  it('selects the ops slice and goes ready', async () => {
    await loadOps({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($opsStatus.get()).toBe('ready')
    expect($ops.get()?.calendar).toHaveLength(1)
    expect($ops.get()?.tasks).toHaveLength(1)
  })

  it('maps an ops section with no calendar/tasks/notes to empty', async () => {
    const empty = {
      ...(companyOs as unknown as CompanyOs),
      ops: { calendar: [], tasks: [], finance: {}, notes: [] }
    }
    await loadOps({ read: vi.fn().mockResolvedValue(empty) })
    expect($opsStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadOps({ read: vi.fn().mockResolvedValue(null) })
    expect($opsStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadOps({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($opsStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadOps({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/aether/domain/ops/ops-store.test.ts`
Expected: FAIL — `ops-store` does not exist.

- [ ] **Step 3: Implement the store**

Create `apps/desktop/src/aether/domain/ops/ops-store.ts`:

```typescript
import { atom } from 'nanostores'

import type { CompanyOs, OpsSection } from '@/aether/domain/company-os/company-os-schema'
import { readLatestCompanyOs, type ReadCompanyOsDeps } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $ops = atom<OpsSection | null>(null)
export const $opsStatus = atom<PillarStatus>('idle')

// Emptiness keyed on the wired sources (calendar/tasks/notes). A finance-less
// slice is still "ready" — the finance section renders its own empty-state.
function isEmptyOps(ops: OpsSection | undefined): boolean {
  return !ops || (ops.calendar.length === 0 && ops.tasks.length === 0 && ops.notes.length === 0)
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadOps(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $opsStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyOps(os.ops)) {
      $ops.set(null)
      $opsStatus.set('empty')

      return
    }

    $ops.set(os.ops!)
    $opsStatus.set('ready')
  } catch {
    $opsStatus.set('error')
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/ops/ops-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/ops/ops-store.ts apps/desktop/src/aether/domain/ops/ops-store.test.ts
git commit -m "feat(aether): ops+finance store selects the ops slice of the company-os artifact"
```

---

### Task 2: Ops screen + tests

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/ops-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/ops-screen.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/ops-screen.guard.test.tsx`

**Interfaces:**
- Consumes: `$ops`, `$opsStatus`, `loadOps` (via `import * as opsStore`); `GlassSlab`.
- Produces: `OpsScreen`. Testids: `ae-ops-skeleton`, `ae-ops-refresh`, `ae-ops-empty`, `ae-ops-calendar-row`, `ae-ops-task-row`, `ae-ops-finance-empty`, `ae-ops-notes-empty`.

- [ ] **Step 1: Write the failing screen tests**

Create `apps/desktop/src/aether/ui/screens/ops-screen.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { OpsSection } from '@/aether/domain/company-os/company-os-schema'
import { $ops, $opsStatus } from '@/aether/domain/ops/ops-store'
import * as opsStore from '@/aether/domain/ops/ops-store'

import { OpsScreen } from './ops-screen'

const OPS = (companyOs as unknown as { ops: OpsSection }).ops

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $ops.set(null)
  $opsStatus.set('idle')
})

describe('OpsScreen — ready', () => {
  beforeEach(() => {
    $ops.set(OPS)
    $opsStatus.set('ready')
  })

  it('renders calendar entries and tasks', () => {
    render(<OpsScreen />)
    expect(screen.getAllByTestId('ae-ops-calendar-row')).toHaveLength(1)
    expect(screen.getAllByTestId('ae-ops-task-row')).toHaveLength(1)
    expect(screen.getByText(/Gửi báo giá VinFast/)).toBeTruthy()
  })

  it('renders the finance empty-state (no finance source)', () => {
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-finance-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có nguồn tài chính/i)).toHaveLength(3)
  })
})

describe('OpsScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $opsStatus.set('loading')
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $opsStatus.set('empty')
    render(<OpsScreen />)
    expect(screen.getByTestId('ae-ops-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $opsStatus.set('error')
    render(<OpsScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('OpsScreen — interactions', () => {
  it('mounts idle → triggers loadOps once', () => {
    const spy = vi.spyOn(opsStore, 'loadOps').mockResolvedValue()
    $opsStatus.set('idle')
    render(<OpsScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(opsStore, 'loadOps').mockResolvedValue()
    $ops.set(OPS)
    $opsStatus.set('ready')
    render(<OpsScreen />)
    fireEvent.click(screen.getByTestId('ae-ops-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})
```

- [ ] **Step 2: Write the failing prompt-cache guard test**

Create `apps/desktop/src/aether/ui/screens/ops-screen.guard.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('OpsScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(join(__dirname, 'ops-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(join(__dirname, '..', '..', 'domain', 'ops', 'ops-store.ts'), 'utf8')
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in ops screen/store: ${forbidden}`).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/ops-screen.test.tsx src/aether/ui/screens/ops-screen.guard.test.tsx`
Expected: FAIL — `ops-screen` does not exist.

- [ ] **Step 4: Implement the screen**

Create `apps/desktop/src/aether/ui/screens/ops-screen.tsx`:

```typescript
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $ops, $opsStatus } from '@/aether/domain/ops/ops-store'
import * as opsStore from '@/aether/domain/ops/ops-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

// Finance has no live source yet → tiles render the honest empty-state label,
// no fabricated numbers.
const FINANCE_TILES = ['Doanh thu', 'Chi phí', 'Số dư'] as const

export function OpsScreen() {
  const ops = useStore($ops)
  const status = useStore($opsStatus)

  useEffect(() => {
    if ($opsStatus.get() === 'idle') { void opsStore.loadOps() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-ops-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Vận hành.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void opsStore.loadOps({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !ops) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg" data-testid="ae-ops-empty">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> để cockpit có dữ liệu.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Vận hành &amp; Tài chính</div>
        <button
          className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
          data-testid="ae-ops-refresh"
          onClick={() => void opsStore.loadOps({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3" data-testid="ae-ops-finance-empty">
        {FINANCE_TILES.map(tile => (
          <GlassSlab className="flex flex-col gap-1" key={tile} size="sm">
            <div className="text-[10.5px] font-semibold tracking-[.14em] text-[color:var(--ae-azure-soft)]">{tile.toUpperCase()}</div>
            <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có nguồn tài chính</div>
          </GlassSlab>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <GlassSlab className="flex flex-col gap-2.5" size="md">
          <div className={SECTION_TITLE}>LỊCH HÔM NAY · {ops.calendar.length}</div>
          {ops.calendar.map(c => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-ops-calendar-row" key={c.id}>
              <span className="w-12 flex-none font-semibold text-[#D7ECFA]">{c.at}</span>
              <span className="min-w-0 flex-1 text-white">{c.title}</span>
              {c.sub && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{c.sub}</span>}
            </div>
          ))}
        </GlassSlab>

        <GlassSlab className="flex flex-col gap-2.5" size="md">
          <div className={SECTION_TITLE}>TASK &amp; DEADLINE · {ops.tasks.length}</div>
          {ops.tasks.map(k => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-ops-task-row" key={k.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: k.severity === 'warn' || k.severity === 'error' ? 'var(--ae-warn)' : 'var(--ae-azure)' }}
              />
              <span className="min-w-0 flex-1 text-white">{k.title}</span>
              {k.due && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{k.due}</span>}
            </div>
          ))}
        </GlassSlab>
      </div>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>SECOND BRAIN</div>
        {ops.notes.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-ops-notes-empty">Chưa có ghi chú</div>
        ) : (
          ops.notes.map(n => (
            <div className="flex items-center gap-2 text-[12px]" key={n.id}>
              <span className="min-w-0 flex-1 text-white">{n.title}</span>
              {n.sub && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{n.sub}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 5: Run the screen + guard tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/ops-screen.test.tsx src/aether/ui/screens/ops-screen.guard.test.tsx`
Expected: PASS. (The single `data-testid="ae-ops-finance-empty"` lives on the finance-tiles grid wrapper — unique — and `getAllByText(/Chưa có nguồn tài chính/i)` matches the three tile labels.)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/ops-screen.tsx apps/desktop/src/aether/ui/screens/ops-screen.test.tsx apps/desktop/src/aether/ui/screens/ops-screen.guard.test.tsx
git commit -m "feat(aether): Vận hành & Tài chính cockpit screen (calendar/tasks/notes + finance empty-state)"
```

---

### Task 3: Route, nav, ⌘K catalog, and shell wiring

**Files:**
- Modify: `apps/desktop/src/app/routes.ts`
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx`
- Modify: `apps/desktop/src/app/command-palette/index.tsx`
- Modify: `apps/desktop/src/app/command-palette/catalog.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Create: `apps/desktop/src/aether/ui/shell/aether-shell-ops-route.test.tsx`

**Interfaces:**
- Consumes: `OpsScreen` from `@/aether/ui/screens/ops-screen`.
- Produces: `OPS_ROUTE = '/ops'`.

- [ ] **Step 1: Add the route constant + registry entry**

In `apps/desktop/src/app/routes.ts`:

1. Add after the previous SP-2 route constant:

```typescript
export const OPS_ROUTE = '/ops'
```

2. Add `'ops'` to the `AppView` union (alphabetical, after `'messaging'`/before `'profiles'`).
3. Add `'ops'` to the `AppRouteId` union.
4. Add a trailing `APP_ROUTES` entry (fix the comma on the previous last entry):

```typescript
  { id: 'ops', path: OPS_ROUTE, view: 'ops' }
```

- [ ] **Step 2: Add the Ops nav-rail item**

In `apps/desktop/src/aether/ui/shell/nav-items.tsx`:

1. Add `OPS_ROUTE` to the `@/app/routes` import.
2. Add to `AETHER_NAV_ITEMS`:

```typescript
  { id: 'ops', route: OPS_ROUTE, label: 'Vận hành', icon: I('M4 19h16M6 19V9m4 10V5m4 14v-7m4 7V8') },
```

- [ ] **Step 3: Add the ⌘K Go-to catalog entry**

In `apps/desktop/src/app/command-palette/index.tsx`:

1. Add `OPS_ROUTE` to the `from '../routes'` import.
2. In `aetherGoToItems`, add:

```typescript
    { icon: BarChart3, id: 'nav-ops', keywords: ['ops', 'vận hành', 'finance', 'tài chính', 'lịch', 'task'], label: 'Vận hành', run: go(OPS_ROUTE) },
```

(`BarChart3` is already imported in this file.)

- [ ] **Step 4: Extend the catalog test (failing)**

In `apps/desktop/src/app/command-palette/catalog.test.tsx`:

1. Add `OPS_ROUTE` to the `@/app/routes` import.
2. Add `OPS_ROUTE` to the `for (const route of [...])` list.
3. Add:

```typescript
  it('selecting the Ops item navigates to /ops', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const ops = aetherGoToItems(go, tStub).find(item => item.id === 'nav-ops')
    expect(ops).toBeTruthy()
    ops?.run?.()
    expect(navigate).toHaveBeenCalledWith(OPS_ROUTE)
  })
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the route in the shell**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`:

1. Add `import { OpsScreen } from '@/aether/ui/screens/ops-screen'`.
2. Add `OPS_ROUTE` to the `@/app/routes` import on line 25.
3. Inside `<Routes>` add:

```tsx
              <Route element={<OpsScreen />} path={OPS_ROUTE.slice(1)} />
```

- [ ] **Step 7: Write the shell route test**

Create `apps/desktop/src/aether/ui/shell/aether-shell-ops-route.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell ops route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports OpsScreen', () => {
    expect(src.includes('import { OpsScreen }')).toBe(true)
  })

  it('renders <OpsScreen /> on the ops path', () => {
    expect(/<Route element=\{<OpsScreen \/>\} path=\{OPS_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})
```

- [ ] **Step 8: Run the route + catalog tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/shell/aether-shell-ops-route.test.tsx src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 9: Run the ops + shell + palette surface to confirm no regression**

Run: `cd apps/desktop && npx vitest run src/aether/domain/ops src/aether/ui/screens/ops-screen.test.tsx src/aether/ui/screens/ops-screen.guard.test.tsx src/aether/ui/shell src/app/command-palette`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell-ops-route.test.tsx
git commit -m "feat(aether): mount Vận hành & Tài chính cockpit on /ops (route + nav + ⌘K + shell)"
```

---

## Self-Review

- **Spec §5.4 Ops & Finance — calendar/tasks (wired) + notes (wired-lite) + finance (empty-state):** Task 2 renders `ops.calendar`, `ops.tasks`, `ops.notes` and finance tiles with "Chưa có nguồn tài chính". ✓
- **Spec §4 store contract, §6 read-only + force refresh:** Task 1 + Task 2. ✓
- **Spec §8 render + interaction + prompt-cache guard tests:** Task 2. ✓
- **Spec §8 ⌘K catalog + shell smoke:** Task 3. ✓
- **Global constraint: no fabricated finance numbers, no delta coupling, tokenized colors:** finance empty-state tiles + guard test. ✓
- **Placeholder scan / type consistency:** `OpsSection`/`OpsCalendarEntry`/`OpsTask`/`OpsFinance`/`OpsNote` (Plan 1), `loadOps({ force })`, `OPS_ROUTE`, testids — consistent. ✓
```
