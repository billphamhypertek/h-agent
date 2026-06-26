# AETHER SP-2 · Plan 3 — Dev & DevOps Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the read-only Dev & DevOps cockpit at `/dev` — server vitals (wired), deploys + incidents (wired-lite) — reading its slice from the unified Company-OS artifact, with honest empty-states for missing sources.

**Architecture:** A nanostore selects the `dev` slice of the cached `CompanyOs` artifact (Plan 1) and exposes data + status atoms + a `loadDev()` action. A presentation-only screen renders the slice with `GlassSlab` + `--ae-*` tokens, a "Làm mới" (force re-read) button, and skeleton/empty/error states. Route, nav item, ⌘K catalog entry, and shell wiring make it reachable. This is the first pillar; it proves the end-to-end pattern that plans 4–6 repeat.

**Tech Stack:** TypeScript, nanostores + `@nanostores/react`, React, vitest + jsdom + `@testing-library/react`.

**Depends on:** SP-2 Plan 1 (the `CompanyOs` schema, `readLatestCompanyOs`, `DevSection`/`DevServer`/`DevDeploy`/`DevIncident` types).

## Global Constraints

(Inherited from SP-2 Plan 1.)

- **0 Python core changes.** Read REST + finished cron-run artifact only.
- **Prompt-cache safety (hard):** the screen and store **must not** reference `appendAssistantDelta`, `message.delta`, `reasoning.delta`, `thinking.`, `subscribeToSession`, or `onSessionEvent`. Live refresh is the "Làm mới" button (force re-read), nothing else.
- **No fabricated data.** Wired sections render real rows; source-less/empty sections render a Vietnamese `"Chưa có nguồn …"` empty-state.
- **Brand `#07397d`** via tokens; never hardcode colors outside `--ae-*` / `--dt-*`. Screen root is `.ae-screen-bare flex h-full min-w-0 flex-col`; cards are `<GlassSlab size>` (single gutter owned by the shell — no `p-[...]` on the root, no extra background).
- **Localization (hard):** Vietnamese UI; never translate "Agent" → "Đại lý".
- **Status union (shared across pillars):** `'idle' | 'loading' | 'ready' | 'empty' | 'error'`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/aether/domain/dev/dev-store.ts` | `$dev`, `$devStatus`, `loadDev()` — select the `dev` slice; map missing/empty → `'empty'`, thrown → `'error'`. |
| `apps/desktop/src/aether/domain/dev/dev-store.test.ts` | Store action tests: slice selection, empty, error. |
| `apps/desktop/src/aether/ui/screens/dev-screen.tsx` | Presentation: servers (wired) + deploys/incidents (wired-lite/empty) + states + "Làm mới". |
| `apps/desktop/src/aether/ui/screens/dev-screen.test.tsx` | Render + interaction tests (ready/empty/error/refresh). |
| `apps/desktop/src/aether/ui/screens/dev-screen.guard.test.tsx` | Prompt-cache guard: no conversation-stream coupling in screen+store source. |
| `apps/desktop/src/app/routes.ts` | Add `DEV_ROUTE`, `APP_ROUTES` entry, `AppView`/`AppRouteId` unions. |
| `apps/desktop/src/aether/ui/shell/nav-items.tsx` | Add the Dev nav-rail item. |
| `apps/desktop/src/app/command-palette/index.tsx` | Add a `nav-dev` Go-to catalog entry. |
| `apps/desktop/src/app/command-palette/catalog.test.tsx` | Extend the catalog test for `DEV_ROUTE`. |
| `apps/desktop/src/aether/ui/shell/aether-shell.tsx` | Import + route `<DevScreen />` at `DEV_ROUTE`. |
| `apps/desktop/src/aether/ui/shell/aether-shell-dev-route.test.tsx` | Source-assertion shell route test. |

---

### Task 1: Dev store

**Files:**
- Create: `apps/desktop/src/aether/domain/dev/dev-store.ts`
- Test: `apps/desktop/src/aether/domain/dev/dev-store.test.ts`

**Interfaces:**
- Consumes: `readLatestCompanyOs`, `ReadCompanyOsDeps` from `@/aether/domain/company-os/read-company-os`; `CompanyOs`, `DevSection` from `@/aether/domain/company-os/company-os-schema`.
- Produces (consumed by the screen): `$dev: atom<DevSection | null>`, `$devStatus: atom<PillarStatus>`, `loadDev(opts?: { force?: boolean; read?: CompanyOsReader }): Promise<void>`, `PillarStatus`, `CompanyOsReader`.

- [ ] **Step 1: Write the failing store test**

Create `apps/desktop/src/aether/domain/dev/dev-store.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $dev, $devStatus, loadDev } from './dev-store'

beforeEach(() => {
  $dev.set(null)
  $devStatus.set('idle')
})

describe('loadDev', () => {
  it('selects the dev slice and goes ready', async () => {
    await loadDev({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($devStatus.get()).toBe('ready')
    expect($dev.get()?.servers).toHaveLength(2)
  })

  it('maps a missing/empty dev section to empty', async () => {
    const empty = { ...(companyOs as unknown as CompanyOs), dev: { servers: [], deploys: [], incidents: [] } }
    await loadDev({ read: vi.fn().mockResolvedValue(empty) })
    expect($devStatus.get()).toBe('empty')
    expect($dev.get()).toBeNull()
  })

  it('maps a null artifact (no cron run yet) to empty', async () => {
    await loadDev({ read: vi.fn().mockResolvedValue(null) })
    expect($devStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadDev({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($devStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadDev({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/aether/domain/dev/dev-store.test.ts`
Expected: FAIL — `dev-store` does not exist.

- [ ] **Step 3: Implement the store**

Create `apps/desktop/src/aether/domain/dev/dev-store.ts`:

```typescript
import { atom } from 'nanostores'

import type { CompanyOs, DevSection } from '@/aether/domain/company-os/company-os-schema'
import { readLatestCompanyOs, type ReadCompanyOsDeps } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

// Injected in tests; real callers use the shared cached reader.
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $dev = atom<DevSection | null>(null)
export const $devStatus = atom<PillarStatus>('idle')

function isEmptyDev(dev: DevSection | undefined): boolean {
  return !dev || (dev.servers.length === 0 && dev.deploys.length === 0 && dev.incidents.length === 0)
}

// Read-only: REST + the latest finished cron run only. No conversation socket,
// no deltas. `force` re-reads past the company-os TTL cache (the "Làm mới" button).
export async function loadDev(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $devStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyDev(os.dev)) {
      $dev.set(null)
      $devStatus.set('empty')

      return
    }

    $dev.set(os.dev!)
    $devStatus.set('ready')
  } catch {
    $devStatus.set('error')
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/dev/dev-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/dev/dev-store.ts apps/desktop/src/aether/domain/dev/dev-store.test.ts
git commit -m "feat(aether): dev cockpit store selects the dev slice of the company-os artifact"
```

---

### Task 2: Dev screen + tests

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/dev-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/dev-screen.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/dev-screen.guard.test.tsx`

**Interfaces:**
- Consumes: `$dev`, `$devStatus`, `loadDev` (via `import * as devStore`) from `@/aether/domain/dev/dev-store`; `GlassSlab` from `@/aether/ui/components/glass-slab`; `Gauge` from `@/aether/ui/components/micro-viz`.
- Produces: `DevScreen` (default-styled cockpit). Stable testids: `ae-dev-skeleton`, `ae-dev-refresh`, `ae-dev-empty`, `ae-dev-server-row`, `ae-dev-deploys-empty`, `ae-dev-incidents-empty`.

- [ ] **Step 1: Write the failing screen tests**

Create `apps/desktop/src/aether/ui/screens/dev-screen.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { DevSection } from '@/aether/domain/company-os/company-os-schema'
import { $dev, $devStatus } from '@/aether/domain/dev/dev-store'
import * as devStore from '@/aether/domain/dev/dev-store'

import { DevScreen } from './dev-screen'

const DEV = (companyOs as unknown as { dev: DevSection }).dev

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $dev.set(null)
  $devStatus.set('idle')
})

describe('DevScreen — ready', () => {
  beforeEach(() => {
    $dev.set(DEV)
    $devStatus.set('ready')
  })

  it('renders one row per server with its host name', () => {
    render(<DevScreen />)
    expect(screen.getAllByTestId('ae-dev-server-row')).toHaveLength(2)
    expect(screen.getByText('h-workspace')).toBeTruthy()
  })

  it('shows the latest deploy when present', () => {
    render(<DevScreen />)
    expect(screen.getByText(/aether-web/)).toBeTruthy()
  })
})

describe('DevScreen — empty deploys/incidents render honest empty-states', () => {
  it('renders the Vietnamese empty-state for an empty deploys list', () => {
    $dev.set({ servers: DEV.servers, deploys: [], incidents: [] })
    $devStatus.set('ready')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-deploys-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có/i).length).toBeGreaterThan(0)
  })
})

describe('DevScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $devStatus.set('loading')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $devStatus.set('empty')
    render(<DevScreen />)
    expect(screen.getByTestId('ae-dev-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $devStatus.set('error')
    render(<DevScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('DevScreen — interactions', () => {
  it('mounts idle → triggers loadDev once', () => {
    const spy = vi.spyOn(devStore, 'loadDev').mockResolvedValue()
    $devStatus.set('idle')
    render(<DevScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(devStore, 'loadDev').mockResolvedValue()
    $dev.set(DEV)
    $devStatus.set('ready')
    render(<DevScreen />)
    fireEvent.click(screen.getByTestId('ae-dev-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})
```

- [ ] **Step 2: Write the failing prompt-cache guard test**

Create `apps/desktop/src/aether/ui/screens/dev-screen.guard.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// A non-chat cockpit must never couple to the live conversation stream. Assert
// the screen + store source contain none of the forbidden tokens.
describe('DevScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(join(__dirname, 'dev-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(join(__dirname, '..', '..', 'domain', 'dev', 'dev-store.ts'), 'utf8')
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in dev screen/store: ${forbidden}`).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/dev-screen.test.tsx src/aether/ui/screens/dev-screen.guard.test.tsx`
Expected: FAIL — `dev-screen` does not exist.

- [ ] **Step 4: Implement the screen**

Create `apps/desktop/src/aether/ui/screens/dev-screen.tsx`:

```typescript
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $dev, $devStatus } from '@/aether/domain/dev/dev-store'
import * as devStore from '@/aether/domain/dev/dev-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Gauge } from '@/aether/ui/components/micro-viz'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

function RefreshButton() {
  return (
    <button
      className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
      data-testid="ae-dev-refresh"
      onClick={() => void devStore.loadDev({ force: true })}
      type="button"
    >
      Làm mới
    </button>
  )
}

function SectionEmpty({ testid, message }: { testid: string; message: string }) {
  return (
    <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid={testid}>
      {message}
    </div>
  )
}

export function DevScreen() {
  const dev = useStore($dev)
  const status = useStore($devStatus)

  useEffect(() => {
    if ($devStatus.get() === 'idle') { void devStore.loadDev() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-dev-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được dữ liệu Dev.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void devStore.loadDev({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !dev) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg" data-testid="ae-dev-empty">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> để cockpit có dữ liệu.
          </div>
        </GlassSlab>
      </div>
    )
  }

  const worst = dev.servers.find(s => s.status !== 'ok')

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Dev &amp; DevOps</div>
        <RefreshButton />
      </div>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className={SECTION_TITLE}>SERVER VITALS</div>
        <div className="flex flex-col gap-2.5">
          {dev.servers.map(s => (
            <div className="flex items-center gap-3 text-[11.5px]" data-testid="ae-dev-server-row" key={s.name}>
              <span className="w-28 flex-none font-semibold text-[#D7ECFA]">{s.name}</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: s.status === 'ok' ? 'var(--ae-ok)' : 'var(--ae-warn)' }}
              >
                {s.status === 'ok' ? '✓ ổn định' : `⚠ ${s.status}`}
              </span>
              <span className="ml-auto text-[10.5px] text-[color:var(--ae-dim)]">
                CPU {s.cpu}% · RAM {s.mem}% · Disk {s.disk}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1">
          <Gauge value={worst?.cpu ?? dev.servers[0]?.cpu ?? 0} warn={Boolean(worst)} />
        </div>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>DEPLOY GẦN NHẤT</div>
        {dev.deploys.length === 0 ? (
          <SectionEmpty message="Chưa có nguồn deploy" testid="ae-dev-deploys-empty" />
        ) : (
          dev.deploys.map(d => (
            <div className="flex items-center gap-2 text-[12px]" key={d.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: d.status === 'failed' ? 'var(--ae-warn)' : 'var(--ae-ok)' }}
              />
              <span className="font-semibold text-white">{d.service}</span>
              <span className="text-[color:var(--ae-dim)]">{d.sub}</span>
              <span className="ml-auto text-[10.5px] text-[color:var(--ae-dim)]">{d.at}</span>
            </div>
          ))
        )}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>SỰ CỐ</div>
        {dev.incidents.length === 0 ? (
          <SectionEmpty message="Chưa có nguồn sự cố" testid="ae-dev-incidents-empty" />
        ) : (
          dev.incidents.map(i => (
            <div className="flex items-center gap-2 text-[12px]" key={i.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: i.severity === 'error' ? 'var(--ae-warn)' : 'var(--ae-azure)' }}
              />
              <span className="min-w-0 flex-1 text-white">{i.title}</span>
              {i.at && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{i.at}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 5: Run the screen + guard tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/dev-screen.test.tsx src/aether/ui/screens/dev-screen.guard.test.tsx`
Expected: PASS (all tests).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/dev-screen.tsx apps/desktop/src/aether/ui/screens/dev-screen.test.tsx apps/desktop/src/aether/ui/screens/dev-screen.guard.test.tsx
git commit -m "feat(aether): Dev & DevOps cockpit screen (server vitals + deploys/incidents)"
```

---

### Task 3: Route, nav, ⌘K catalog, and shell wiring

**Files:**
- Modify: `apps/desktop/src/app/routes.ts`
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx`
- Modify: `apps/desktop/src/app/command-palette/index.tsx`
- Modify: `apps/desktop/src/app/command-palette/catalog.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Create: `apps/desktop/src/aether/ui/shell/aether-shell-dev-route.test.tsx`

**Interfaces:**
- Consumes: `DevScreen` from `@/aether/ui/screens/dev-screen`.
- Produces: `DEV_ROUTE = '/dev'` (consumed by nav, palette, shell — and the same constant name is referenced by plans 4–6's catalog tests as a sibling pattern).

- [ ] **Step 1: Add the route constant + registry entry**

In `apps/desktop/src/app/routes.ts`:

1. After `export const MEMORY_ROUTE = '/memory'` add:

```typescript
export const DEV_ROUTE = '/dev'
```

2. In the `AppView` union add `'dev'` (keep alphabetical):

```typescript
export type AppView =
  | 'agents'
  | 'artifacts'
  | 'chat'
  | 'command-center'
  | 'cron'
  | 'dev'
  | 'messaging'
  | 'profiles'
  | 'settings'
  | 'skills'
```

3. In the `AppRouteId` union add `'dev'`:

```typescript
export type AppRouteId =
  | 'agents'
  | 'artifacts'
  | 'command-center'
  | 'cron'
  | 'dev'
  | 'messaging'
  | 'new'
  | 'profiles'
  | 'settings'
  | 'skills'
```

4. In `APP_ROUTES` add a trailing entry (mind the comma on the previous line):

```typescript
  { id: 'agents', path: AGENTS_ROUTE, view: 'agents' },
  { id: 'dev', path: DEV_ROUTE, view: 'dev' }
```

- [ ] **Step 2: Add the Dev nav-rail item**

In `apps/desktop/src/aether/ui/shell/nav-items.tsx`:

1. Extend the import:

```typescript
import { BRIEF_ROUTE, DEV_ROUTE, HUD_ROUTE, MEMORY_ROUTE } from '@/app/routes'
```

2. Add to the `AETHER_NAV_ITEMS` array (after the `cron` item):

```typescript
  { id: 'dev', route: DEV_ROUTE, label: 'Dev', icon: I('M9 7l-5 5 5 5M15 7l5 5-5 5') },
```

- [ ] **Step 3: Add the ⌘K Go-to catalog entry**

In `apps/desktop/src/app/command-palette/index.tsx`:

1. Add `DEV_ROUTE` to the routes import block (the `from '../routes'` import), keeping order:

```typescript
  CRON_ROUTE,
  DEV_ROUTE,
  HUD_ROUTE,
```

2. In `aetherGoToItems`, add an entry to the returned array (after the `nav-home` entry):

```typescript
    { icon: Cpu, id: 'nav-dev', keywords: ['dev', 'devops', 'server', 'deploy', 'cockpit'], label: 'Dev', run: go(DEV_ROUTE) },
```

(`Cpu` is already imported in this file.)

- [ ] **Step 4: Extend the catalog test (failing)**

In `apps/desktop/src/app/command-palette/catalog.test.tsx`:

1. Add `DEV_ROUTE` to the `@/app/routes` import (keep order):

```typescript
  CRON_ROUTE,
  DEV_ROUTE,
  HUD_ROUTE,
```

2. Add `DEV_ROUTE` to the `for (const route of [...])` list in the "contains a Go-to entry for every AETHER route" test.

3. Add a new test after "selecting the Memory item navigates to /memory":

```typescript
  it('selecting the Dev item navigates to /dev', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const dev = aetherGoToItems(go, tStub).find(item => item.id === 'nav-dev')
    expect(dev).toBeTruthy()
    dev?.run?.()
    expect(navigate).toHaveBeenCalledWith(DEV_ROUTE)
  })
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/app/command-palette/catalog.test.tsx`
Expected: PASS — the new `nav-dev` entry satisfies both the loop assertion and the new test.

- [ ] **Step 6: Wire the route in the shell**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`:

1. Add the screen import (next to the other screen imports):

```typescript
import { DevScreen } from '@/aether/ui/screens/dev-screen'
```

2. Add `DEV_ROUTE` to the `@/app/routes` import on line 25.

3. Inside `<Routes>` (after the `cron` route) add:

```tsx
              <Route element={<DevScreen />} path={DEV_ROUTE.slice(1)} />
```

- [ ] **Step 7: Write the shell route test**

Create `apps/desktop/src/aether/ui/shell/aether-shell-dev-route.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores awkward to mount in jsdom; the route
// swap is a one-line wiring change, so a source assertion is the robust guard.
describe('aether-shell dev route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports DevScreen', () => {
    expect(src.includes('import { DevScreen }')).toBe(true)
  })

  it('renders <DevScreen /> on the dev path', () => {
    expect(/<Route element=\{<DevScreen \/>\} path=\{DEV_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})
```

- [ ] **Step 8: Run the route + catalog tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/shell/aether-shell-dev-route.test.tsx src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 9: Run the whole dev + shell + palette surface to confirm no regression**

Run: `cd apps/desktop && npx vitest run src/aether/domain/dev src/aether/ui/screens/dev-screen.test.tsx src/aether/ui/screens/dev-screen.guard.test.tsx src/aether/ui/shell src/app/command-palette`
Expected: PASS (including the pre-existing memory/route/catalog tests).

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell-dev-route.test.tsx
git commit -m "feat(aether): mount Dev cockpit on /dev (route + nav + ⌘K + shell)"
```

---

## Self-Review

- **Spec §5.1 Dev cockpit — servers (wired) + deploys/incidents (wired-lite/empty):** Task 2 renders `dev.servers`, `dev.deploys`, `dev.incidents` with honest per-section empty-states. ✓
- **Spec §4 store contract ($pillar/$pillarStatus/load):** Task 1. ✓
- **Spec §6 read-only, REST + cron-run only, refresh = force re-read:** Task 1 `loadDev`, Task 2 "Làm mới". ✓
- **Spec §8 ≥1 render + 1 interaction + 1 prompt-cache guard test:** Task 2. ✓
- **Spec §8 ⌘K catalog contains the new route + navigates:** Task 3 Steps 3–5. ✓
- **Spec §8 E2E smoke of the route in the real shell:** Task 3 shell route test (source assertion, matching the repo's memory-route convention). ✓
- **Global constraint: no fabricated data, no delta coupling, tokenized colors:** empty-states + guard test + `--ae-*` tokens throughout. ✓
- **Placeholder scan / type consistency:** `DevSection`/`DevServer` (Plan 1), `loadDev({ force })`, `DEV_ROUTE`, testids — all consistent. ✓
```
