# AETHER SP-2 · Plan 4 — Inbox + CRM Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the read-only Inbox + CRM cockpit at `/inbox` — email triage (wired, read-only, never sends) plus a deal-pipeline frame that renders an honest "Chưa có nguồn CRM" empty-state — reading its slice from the unified Company-OS artifact.

**Architecture:** A nanostore selects the `inbox` slice of the cached `CompanyOs` artifact (Plan 1) and exposes data + status atoms + a `loadInbox()` action. A presentation-only screen renders unread email threads (wired) and a pipeline frame (empty-state), with skeleton/empty/error states and a "Làm mới" force re-read. Route, nav item, ⌘K catalog entry, and shell wiring make it reachable. Same end-to-end pattern as Plan 3.

**Tech Stack:** TypeScript, nanostores + `@nanostores/react`, React, vitest + jsdom + `@testing-library/react`.

**Depends on:** SP-2 Plan 1 (`CompanyOs`, `readLatestCompanyOs`, `InboxSection`/`InboxThread`/`Deal` types). Pattern-mirrors SP-2 Plan 3.

## Global Constraints

(Inherited from SP-2 Plan 1.)

- **0 Python core changes.** Read REST + finished cron-run artifact only.
- **Prompt-cache safety (hard):** screen + store must not reference `appendAssistantDelta`, `message.delta`, `reasoning.delta`, `thinking.`, `subscribeToSession`, or `onSessionEvent`. Live refresh is the "Làm mới" button only.
- **Read-only, never sends.** The email list is display-only — no compose, no reply, no send action.
- **No fabricated data.** Wired sections render real rows; source-less sections render a Vietnamese `"Chưa có nguồn …"` empty-state.
- **Brand `#07397d`** via tokens; never hardcode colors outside `--ae-*` / `--dt-*`. Screen root `.ae-screen-bare flex h-full min-w-0 flex-col`; cards `<GlassSlab size>`; no root padding/background.
- **Localization (hard):** Vietnamese UI; never translate "Agent" → "Đại lý".
- **Status union:** `'idle' | 'loading' | 'ready' | 'empty' | 'error'`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/aether/domain/inbox/inbox-store.ts` | `$inbox`, `$inboxStatus`, `loadInbox()` — select the `inbox` slice; missing/empty → `'empty'`, thrown → `'error'`. |
| `apps/desktop/src/aether/domain/inbox/inbox-store.test.ts` | Store action tests. |
| `apps/desktop/src/aether/ui/screens/inbox-screen.tsx` | Presentation: email threads (wired) + deal pipeline (empty-state) + states + "Làm mới". |
| `apps/desktop/src/aether/ui/screens/inbox-screen.test.tsx` | Render + interaction tests. |
| `apps/desktop/src/aether/ui/screens/inbox-screen.guard.test.tsx` | Prompt-cache guard. |
| `apps/desktop/src/app/routes.ts` | Add `INBOX_ROUTE`, registry entry, union members. |
| `apps/desktop/src/aether/ui/shell/nav-items.tsx` | Add the Inbox nav-rail item. |
| `apps/desktop/src/app/command-palette/index.tsx` | Add a `nav-inbox` Go-to entry. |
| `apps/desktop/src/app/command-palette/catalog.test.tsx` | Extend for `INBOX_ROUTE`. |
| `apps/desktop/src/aether/ui/shell/aether-shell.tsx` | Import + route `<InboxScreen />`. |
| `apps/desktop/src/aether/ui/shell/aether-shell-inbox-route.test.tsx` | Source-assertion shell route test. |

---

### Task 1: Inbox store

**Files:**
- Create: `apps/desktop/src/aether/domain/inbox/inbox-store.ts`
- Test: `apps/desktop/src/aether/domain/inbox/inbox-store.test.ts`

**Interfaces:**
- Consumes: `readLatestCompanyOs`, `ReadCompanyOsDeps` from `@/aether/domain/company-os/read-company-os`; `CompanyOs`, `InboxSection` from `@/aether/domain/company-os/company-os-schema`.
- Produces: `$inbox: atom<InboxSection | null>`, `$inboxStatus: atom<PillarStatus>`, `loadInbox(opts?: { force?: boolean; read?: CompanyOsReader }): Promise<void>`, `PillarStatus`, `CompanyOsReader`.

> **Note:** the `inbox.deals` array is empty in the fixture (no CRM source). The store's emptiness check is keyed on **threads only** — an inbox with unread email but no deals is still `ready` (the pipeline frame shows its own per-section empty-state).

- [ ] **Step 1: Write the failing store test**

Create `apps/desktop/src/aether/domain/inbox/inbox-store.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $inbox, $inboxStatus, loadInbox } from './inbox-store'

beforeEach(() => {
  $inbox.set(null)
  $inboxStatus.set('idle')
})

describe('loadInbox', () => {
  it('selects the inbox slice and goes ready when there are threads', async () => {
    await loadInbox({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($inboxStatus.get()).toBe('ready')
    expect($inbox.get()?.threads).toHaveLength(1)
    expect($inbox.get()?.deals).toHaveLength(0)
  })

  it('maps a missing/empty (no threads) inbox section to empty', async () => {
    const empty = { ...(companyOs as unknown as CompanyOs), inbox: { threads: [], deals: [] } }
    await loadInbox({ read: vi.fn().mockResolvedValue(empty) })
    expect($inboxStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadInbox({ read: vi.fn().mockResolvedValue(null) })
    expect($inboxStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadInbox({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($inboxStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadInbox({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/aether/domain/inbox/inbox-store.test.ts`
Expected: FAIL — `inbox-store` does not exist.

- [ ] **Step 3: Implement the store**

Create `apps/desktop/src/aether/domain/inbox/inbox-store.ts`:

```typescript
import { atom } from 'nanostores'

import type { CompanyOs, InboxSection } from '@/aether/domain/company-os/company-os-schema'
import { readLatestCompanyOs, type ReadCompanyOsDeps } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $inbox = atom<InboxSection | null>(null)
export const $inboxStatus = atom<PillarStatus>('idle')

// Emptiness is keyed on the wired source (email threads). A deals-less inbox is
// still "ready" — the pipeline frame renders its own "Chưa có nguồn CRM" state.
function isEmptyInbox(inbox: InboxSection | undefined): boolean {
  return !inbox || inbox.threads.length === 0
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadInbox(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $inboxStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyInbox(os.inbox)) {
      $inbox.set(null)
      $inboxStatus.set('empty')

      return
    }

    $inbox.set(os.inbox!)
    $inboxStatus.set('ready')
  } catch {
    $inboxStatus.set('error')
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/inbox/inbox-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/inbox/inbox-store.ts apps/desktop/src/aether/domain/inbox/inbox-store.test.ts
git commit -m "feat(aether): inbox+crm store selects the inbox slice of the company-os artifact"
```

---

### Task 2: Inbox screen + tests

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/inbox-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/inbox-screen.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/inbox-screen.guard.test.tsx`

**Interfaces:**
- Consumes: `$inbox`, `$inboxStatus`, `loadInbox` (via `import * as inboxStore`); `GlassSlab`.
- Produces: `InboxScreen`. Testids: `ae-inbox-skeleton`, `ae-inbox-refresh`, `ae-inbox-empty`, `ae-inbox-thread-row`, `ae-inbox-deals-empty`.

- [ ] **Step 1: Write the failing screen tests**

Create `apps/desktop/src/aether/ui/screens/inbox-screen.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { InboxSection } from '@/aether/domain/company-os/company-os-schema'
import { $inbox, $inboxStatus } from '@/aether/domain/inbox/inbox-store'
import * as inboxStore from '@/aether/domain/inbox/inbox-store'

import { InboxScreen } from './inbox-screen'

const INBOX = (companyOs as unknown as { inbox: InboxSection }).inbox

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $inbox.set(null)
  $inboxStatus.set('idle')
})

describe('InboxScreen — ready', () => {
  beforeEach(() => {
    $inbox.set(INBOX)
    $inboxStatus.set('ready')
  })

  it('renders one row per email thread with sender + subject', () => {
    render(<InboxScreen />)
    expect(screen.getAllByTestId('ae-inbox-thread-row')).toHaveLength(1)
    expect(screen.getByText('ACME')).toBeTruthy()
    expect(screen.getByText(/Báo giá website/)).toBeTruthy()
  })

  it('renders the deal-pipeline empty-state when there is no CRM source', () => {
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-deals-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có nguồn CRM/i)).toHaveLength(4)
  })
})

describe('InboxScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $inboxStatus.set('loading')
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $inboxStatus.set('empty')
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $inboxStatus.set('error')
    render(<InboxScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('InboxScreen — interactions', () => {
  it('mounts idle → triggers loadInbox once', () => {
    const spy = vi.spyOn(inboxStore, 'loadInbox').mockResolvedValue()
    $inboxStatus.set('idle')
    render(<InboxScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(inboxStore, 'loadInbox').mockResolvedValue()
    $inbox.set(INBOX)
    $inboxStatus.set('ready')
    render(<InboxScreen />)
    fireEvent.click(screen.getByTestId('ae-inbox-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})
```

- [ ] **Step 2: Write the failing prompt-cache guard test**

Create `apps/desktop/src/aether/ui/screens/inbox-screen.guard.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('InboxScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(join(__dirname, 'inbox-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(join(__dirname, '..', '..', 'domain', 'inbox', 'inbox-store.ts'), 'utf8')
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in inbox screen/store: ${forbidden}`).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/inbox-screen.test.tsx src/aether/ui/screens/inbox-screen.guard.test.tsx`
Expected: FAIL — `inbox-screen` does not exist.

- [ ] **Step 4: Implement the screen**

Create `apps/desktop/src/aether/ui/screens/inbox-screen.tsx`:

```typescript
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $inbox, $inboxStatus } from '@/aether/domain/inbox/inbox-store'
import * as inboxStore from '@/aether/domain/inbox/inbox-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

// Read-only CRM stages frame. No native CRM source yet → every column renders
// the honest empty-state; no fabricated deals.
const PIPELINE_STAGES = ['Tiềm năng', 'Đang trao đổi', 'Báo giá', 'Chốt'] as const

export function InboxScreen() {
  const inbox = useStore($inbox)
  const status = useStore($inboxStatus)

  useEffect(() => {
    if ($inboxStatus.get() === 'idle') { void inboxStore.loadInbox() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-inbox-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Inbox.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void inboxStore.loadInbox({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !inbox) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg" data-testid="ae-inbox-empty">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> (kèm skill <b>google-workspace</b>) để có email.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Inbox + CRM</div>
        <button
          className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
          data-testid="ae-inbox-refresh"
          onClick={() => void inboxStore.loadInbox({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>EMAIL CẦN XỬ LÝ · {inbox.threads.length}</div>
        {inbox.threads.map(t => (
          <div className="flex items-start gap-3 rounded-[11px] p-[9px_11px]" data-testid="ae-inbox-thread-row" key={t.id}
            style={{ background: 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))', border: '1px solid rgba(120,200,255,.1)' }}
          >
            {t.unread && (
              <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: 'var(--ae-azure)', boxShadow: '0 0 8px var(--ae-azure)' }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12.5px]">
                <span className="font-semibold text-white">{t.sender}</span>
                <span className="truncate text-[#CFE2F7]">{t.subject}</span>
              </div>
              {t.snippet && <div className="mt-0.5 truncate text-[11px] text-[color:var(--ae-dim)]">{t.snippet}</div>}
            </div>
          </div>
        ))}
      </GlassSlab>

      <GlassSlab className="flex min-h-0 flex-col" size="md">
        <div className={SECTION_TITLE}>DEAL PIPELINE</div>
        <div className="grid grid-cols-4 gap-2.5" data-testid="ae-inbox-deals-empty">
          {PIPELINE_STAGES.map(stage => (
            <div className="flex flex-col gap-1.5" key={stage}>
              <div className="text-[11px] font-semibold text-[#D7ECFA]">{stage}</div>
              <div className="rounded-[11px] border border-dashed border-[rgba(120,200,255,.18)] p-3 text-center text-[11px] text-[color:var(--ae-dim)]">
                Chưa có nguồn CRM
              </div>
            </div>
          ))}
        </div>
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 5: Run the screen + guard tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/inbox-screen.test.tsx src/aether/ui/screens/inbox-screen.guard.test.tsx`
Expected: PASS. (The single `data-testid="ae-inbox-deals-empty"` lives on the pipeline grid wrapper — unique — and `getAllByText(/Chưa có nguồn CRM/i)` matches the four column labels.)

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/inbox-screen.tsx apps/desktop/src/aether/ui/screens/inbox-screen.test.tsx apps/desktop/src/aether/ui/screens/inbox-screen.guard.test.tsx
git commit -m "feat(aether): Inbox + CRM cockpit screen (email triage + pipeline empty-state)"
```

---

### Task 3: Route, nav, ⌘K catalog, and shell wiring

**Files:**
- Modify: `apps/desktop/src/app/routes.ts`
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx`
- Modify: `apps/desktop/src/app/command-palette/index.tsx`
- Modify: `apps/desktop/src/app/command-palette/catalog.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Create: `apps/desktop/src/aether/ui/shell/aether-shell-inbox-route.test.tsx`

**Interfaces:**
- Consumes: `InboxScreen` from `@/aether/ui/screens/inbox-screen`.
- Produces: `INBOX_ROUTE = '/inbox'`.

- [ ] **Step 1: Add the route constant + registry entry**

In `apps/desktop/src/app/routes.ts`:

1. After the `DEV_ROUTE` line (Plan 3) — or after `MEMORY_ROUTE` if Plan 3 has not landed — add:

```typescript
export const INBOX_ROUTE = '/inbox'
```

2. Add `'inbox'` to the `AppView` union (alphabetical, after `'dev'`/before `'messaging'`).
3. Add `'inbox'` to the `AppRouteId` union (after `'dev'`).
4. Add a trailing `APP_ROUTES` entry (fix the comma on the previous last entry):

```typescript
  { id: 'inbox', path: INBOX_ROUTE, view: 'inbox' }
```

- [ ] **Step 2: Add the Inbox nav-rail item**

In `apps/desktop/src/aether/ui/shell/nav-items.tsx`:

1. Add `INBOX_ROUTE` to the `@/app/routes` import.
2. Add to `AETHER_NAV_ITEMS`:

```typescript
  { id: 'inbox', route: INBOX_ROUTE, label: 'Inbox', icon: I('M4 6h16v12H4zM4 7l8 6 8-6') },
```

- [ ] **Step 3: Add the ⌘K Go-to catalog entry**

In `apps/desktop/src/app/command-palette/index.tsx`:

1. Add `INBOX_ROUTE` to the `from '../routes'` import (keep order).
2. In `aetherGoToItems`, add (after the `nav-dev` entry, or after `nav-home` if Plan 3 has not landed):

```typescript
    { icon: MessageCircle, id: 'nav-inbox', keywords: ['inbox', 'email', 'crm', 'deal', 'pipeline'], label: 'Inbox', run: go(INBOX_ROUTE) },
```

(`MessageCircle` is already imported in this file.)

- [ ] **Step 4: Extend the catalog test (failing)**

In `apps/desktop/src/app/command-palette/catalog.test.tsx`:

1. Add `INBOX_ROUTE` to the `@/app/routes` import.
2. Add `INBOX_ROUTE` to the `for (const route of [...])` list.
3. Add:

```typescript
  it('selecting the Inbox item navigates to /inbox', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const inbox = aetherGoToItems(go, tStub).find(item => item.id === 'nav-inbox')
    expect(inbox).toBeTruthy()
    inbox?.run?.()
    expect(navigate).toHaveBeenCalledWith(INBOX_ROUTE)
  })
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the route in the shell**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`:

1. Add `import { InboxScreen } from '@/aether/ui/screens/inbox-screen'`.
2. Add `INBOX_ROUTE` to the `@/app/routes` import on line 25.
3. Inside `<Routes>` add:

```tsx
              <Route element={<InboxScreen />} path={INBOX_ROUTE.slice(1)} />
```

- [ ] **Step 7: Write the shell route test**

Create `apps/desktop/src/aether/ui/shell/aether-shell-inbox-route.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell inbox route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports InboxScreen', () => {
    expect(src.includes('import { InboxScreen }')).toBe(true)
  })

  it('renders <InboxScreen /> on the inbox path', () => {
    expect(/<Route element=\{<InboxScreen \/>\} path=\{INBOX_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})
```

- [ ] **Step 8: Run the route + catalog tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/shell/aether-shell-inbox-route.test.tsx src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 9: Run the inbox + shell + palette surface to confirm no regression**

Run: `cd apps/desktop && npx vitest run src/aether/domain/inbox src/aether/ui/screens/inbox-screen.test.tsx src/aether/ui/screens/inbox-screen.guard.test.tsx src/aether/ui/shell src/app/command-palette`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell-inbox-route.test.tsx
git commit -m "feat(aether): mount Inbox + CRM cockpit on /inbox (route + nav + ⌘K + shell)"
```

---

## Self-Review

- **Spec §5.2 Inbox+CRM — email triage (wired, read-only, never sends) + pipeline (empty-state):** Task 2 renders `inbox.threads` display-only and a CRM frame with "Chưa có nguồn CRM". ✓
- **Spec §4 store contract, §6 read-only + force refresh:** Task 1 + Task 2. ✓
- **Spec §8 render + interaction + prompt-cache guard tests:** Task 2. ✓
- **Spec §8 ⌘K catalog + shell smoke:** Task 3. ✓
- **Global constraint: never sends, no fabricated deals, no delta coupling, tokenized colors:** display-only list + dashed empty-state columns + guard test. ✓
- **Placeholder scan / type consistency:** `InboxSection`/`InboxThread`/`Deal` (Plan 1), `loadInbox({ force })`, `INBOX_ROUTE`, testids — consistent. ✓
```
