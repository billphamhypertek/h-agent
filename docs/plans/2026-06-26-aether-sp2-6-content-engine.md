# AETHER SP-2 · Plan 6 — Content Engine Cockpit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the read-only Content engine cockpit at `/content` — a multi-channel calendar + idea→draft→schedule board that renders honest "Chưa có nguồn nội dung" empty-states, optionally seeded by today's calendar events when present — reading its slice from the unified Company-OS artifact. This is the lowest-risk pillar (mostly empty-state), built last.

**Architecture:** A nanostore selects the `content` slice of the cached `CompanyOs` artifact (Plan 1) and exposes data + status atoms + a `loadContent()` action. A presentation-only screen renders the multi-channel time-grid and the idea board, each falling back to an honest empty-state when its source is absent, with skeleton/empty/error states and a "Làm mới" force re-read. Route, nav item, ⌘K catalog entry, and shell wiring make it reachable. Same end-to-end pattern as Plans 3–5.

**Tech Stack:** TypeScript, nanostores + `@nanostores/react`, React, vitest + jsdom + `@testing-library/react`.

**Depends on:** SP-2 Plan 1 (`CompanyOs`, `readLatestCompanyOs`, `ContentSection`/`ContentCalendarEntry`/`ContentIdea` types). Pattern-mirrors SP-2 Plan 3.

## Global Constraints

(Inherited from SP-2 Plan 1.)

- **0 Python core changes.** Read REST + finished cron-run artifact only.
- **Prompt-cache safety (hard):** screen + store must not reference `appendAssistantDelta`, `message.delta`, `reasoning.delta`, `thinking.`, `subscribeToSession`, or `onSessionEvent`. Live refresh is the "Làm mới" button only.
- **No fabricated data.** Content has little/no source yet → calendar and idea board render the honest empty-state; no invented posts.
- **Brand `#07397d`** via tokens; never hardcode colors outside `--ae-*` / `--dt-*`. Screen root `.ae-screen-bare flex h-full min-w-0 flex-col`; cards `<GlassSlab size>`; no root padding/background.
- **Localization (hard):** Vietnamese UI; never translate "Agent" → "Đại lý".
- **Status union:** `'idle' | 'loading' | 'ready' | 'empty' | 'error'`.

> **Key difference from Plans 3–5:** Content is **mostly empty-state**. When the artifact has a `content` section with any calendar entries OR ideas, the screen is `ready`; otherwise the screen shows the whole-screen empty-state. Each *section* still renders its own empty-state independently so a calendar-only or ideas-only artifact reads honestly.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/aether/domain/content/content-store.ts` | `$content`, `$contentStatus`, `loadContent()` — select the `content` slice; missing/empty → `'empty'`, thrown → `'error'`. |
| `apps/desktop/src/aether/domain/content/content-store.test.ts` | Store action tests. |
| `apps/desktop/src/aether/ui/screens/content-screen.tsx` | Presentation: multi-channel calendar + idea board, each with empty-state fallback + states + "Làm mới". |
| `apps/desktop/src/aether/ui/screens/content-screen.test.tsx` | Render + interaction tests. |
| `apps/desktop/src/aether/ui/screens/content-screen.guard.test.tsx` | Prompt-cache guard. |
| `apps/desktop/src/app/routes.ts` | Add `CONTENT_ROUTE`, registry entry, union members. |
| `apps/desktop/src/aether/ui/shell/nav-items.tsx` | Add the Content nav-rail item. |
| `apps/desktop/src/app/command-palette/index.tsx` | Add a `nav-content` Go-to entry. |
| `apps/desktop/src/app/command-palette/catalog.test.tsx` | Extend for `CONTENT_ROUTE`. |
| `apps/desktop/src/aether/ui/shell/aether-shell.tsx` | Import + route `<ContentScreen />`. |
| `apps/desktop/src/aether/ui/shell/aether-shell-content-route.test.tsx` | Source-assertion shell route test. |

---

### Task 1: Content store

**Files:**
- Create: `apps/desktop/src/aether/domain/content/content-store.ts`
- Test: `apps/desktop/src/aether/domain/content/content-store.test.ts`

**Interfaces:**
- Consumes: `readLatestCompanyOs`, `ReadCompanyOsDeps` from `@/aether/domain/company-os/read-company-os`; `CompanyOs`, `ContentSection` from `@/aether/domain/company-os/company-os-schema`.
- Produces: `$content: atom<ContentSection | null>`, `$contentStatus: atom<PillarStatus>`, `loadContent(opts?: { force?: boolean; read?: CompanyOsReader }): Promise<void>`, `PillarStatus`, `CompanyOsReader`.

> **Note:** the fixture's `content` section is empty (`calendar: []`, `ideas: []`), so the default fixture drives the store to `'empty'`. The "ready" test injects a seeded content section.

- [ ] **Step 1: Write the failing store test**

Create `apps/desktop/src/aether/domain/content/content-store.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $content, $contentStatus, loadContent } from './content-store'

beforeEach(() => {
  $content.set(null)
  $contentStatus.set('idle')
})

describe('loadContent', () => {
  it('goes ready when the content section has calendar entries or ideas', async () => {
    const seeded = {
      ...(companyOs as unknown as CompanyOs),
      content: {
        calendar: [{ id: 'c1', channel: 'facebook', title: 'Bài Q3', at: '09:00', status: 'scheduled' as const }],
        ideas: [{ id: 'i1', title: 'Reels giới thiệu sản phẩm', stage: 'idea' as const }]
      }
    }
    await loadContent({ read: vi.fn().mockResolvedValue(seeded) })
    expect($contentStatus.get()).toBe('ready')
    expect($content.get()?.calendar).toHaveLength(1)
    expect($content.get()?.ideas).toHaveLength(1)
  })

  it('maps the default empty content section (fixture) to empty', async () => {
    await loadContent({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($contentStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadContent({ read: vi.fn().mockResolvedValue(null) })
    expect($contentStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadContent({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($contentStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadContent({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/aether/domain/content/content-store.test.ts`
Expected: FAIL — `content-store` does not exist.

- [ ] **Step 3: Implement the store**

Create `apps/desktop/src/aether/domain/content/content-store.ts`:

```typescript
import { atom } from 'nanostores'

import type { CompanyOs, ContentSection } from '@/aether/domain/company-os/company-os-schema'
import { readLatestCompanyOs, type ReadCompanyOsDeps } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $content = atom<ContentSection | null>(null)
export const $contentStatus = atom<PillarStatus>('idle')

// Content is mostly empty-state today: ready only when there's at least one
// calendar entry or idea. Each section still renders its own empty-state.
function isEmptyContent(content: ContentSection | undefined): boolean {
  return !content || (content.calendar.length === 0 && content.ideas.length === 0)
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadContent(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $contentStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyContent(os.content)) {
      $content.set(null)
      $contentStatus.set('empty')

      return
    }

    $content.set(os.content!)
    $contentStatus.set('ready')
  } catch {
    $contentStatus.set('error')
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/content/content-store.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/content/content-store.ts apps/desktop/src/aether/domain/content/content-store.test.ts
git commit -m "feat(aether): content engine store selects the content slice of the company-os artifact"
```

---

### Task 2: Content screen + tests

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/content-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/content-screen.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/content-screen.guard.test.tsx`

**Interfaces:**
- Consumes: `$content`, `$contentStatus`, `loadContent` (via `import * as contentStore`); `GlassSlab`.
- Produces: `ContentScreen`. Testids: `ae-content-skeleton`, `ae-content-refresh`, `ae-content-empty`, `ae-content-calendar-row`, `ae-content-calendar-empty`, `ae-content-idea-row`, `ae-content-ideas-empty`.

- [ ] **Step 1: Write the failing screen tests**

Create `apps/desktop/src/aether/ui/screens/content-screen.test.tsx`:

```typescript
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ContentSection } from '@/aether/domain/company-os/company-os-schema'
import { $content, $contentStatus } from '@/aether/domain/content/content-store'
import * as contentStore from '@/aether/domain/content/content-store'

import { ContentScreen } from './content-screen'

const CONTENT: ContentSection = {
  calendar: [{ id: 'c1', channel: 'facebook', title: 'Bài Q3', at: '09:00', status: 'scheduled' }],
  ideas: [{ id: 'i1', title: 'Reels giới thiệu sản phẩm', stage: 'idea' }]
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $content.set(null)
  $contentStatus.set('idle')
})

describe('ContentScreen — ready', () => {
  beforeEach(() => {
    $content.set(CONTENT)
    $contentStatus.set('ready')
  })

  it('renders calendar entries and ideas', () => {
    render(<ContentScreen />)
    expect(screen.getAllByTestId('ae-content-calendar-row')).toHaveLength(1)
    expect(screen.getAllByTestId('ae-content-idea-row')).toHaveLength(1)
    expect(screen.getByText(/Reels giới thiệu sản phẩm/)).toBeTruthy()
  })

  it('renders the per-section empty-state when only one section has data', () => {
    $content.set({ calendar: CONTENT.calendar, ideas: [] })
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-ideas-empty')).toBeTruthy()
    expect(screen.getByText(/Chưa có nguồn nội dung/i)).toBeTruthy()
  })
})

describe('ContentScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $contentStatus.set('loading')
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no content source', () => {
    $contentStatus.set('empty')
    render(<ContentScreen />)
    expect(screen.getByTestId('ae-content-empty')).toBeTruthy()
    expect(screen.getByText(/Chưa có nguồn nội dung/i)).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $contentStatus.set('error')
    render(<ContentScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('ContentScreen — interactions', () => {
  it('mounts idle → triggers loadContent once', () => {
    const spy = vi.spyOn(contentStore, 'loadContent').mockResolvedValue()
    $contentStatus.set('idle')
    render(<ContentScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(contentStore, 'loadContent').mockResolvedValue()
    $content.set(CONTENT)
    $contentStatus.set('ready')
    render(<ContentScreen />)
    fireEvent.click(screen.getByTestId('ae-content-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})
```

- [ ] **Step 2: Write the failing prompt-cache guard test**

Create `apps/desktop/src/aether/ui/screens/content-screen.guard.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('ContentScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(join(__dirname, 'content-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(join(__dirname, '..', '..', 'domain', 'content', 'content-store.ts'), 'utf8')
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in content screen/store: ${forbidden}`).toBe(false)
    }
  })
})
```

- [ ] **Step 3: Run both tests to verify they fail**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/content-screen.test.tsx src/aether/ui/screens/content-screen.guard.test.tsx`
Expected: FAIL — `content-screen` does not exist.

- [ ] **Step 4: Implement the screen**

Create `apps/desktop/src/aether/ui/screens/content-screen.tsx`:

```typescript
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $content, $contentStatus } from '@/aether/domain/content/content-store'
import * as contentStore from '@/aether/domain/content/content-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

const IDEA_STAGE_LABEL: Record<'idea' | 'draft' | 'scheduled', string> = {
  idea: 'Ý tưởng',
  draft: 'Nháp',
  scheduled: 'Đã lên lịch'
}

export function ContentScreen() {
  const content = useStore($content)
  const status = useStore($contentStatus)

  useEffect(() => {
    if ($contentStatus.get() === 'idle') { void contentStore.loadContent() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-content-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Content.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void contentStore.loadContent({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !content) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg" data-testid="ae-content-empty">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có nguồn nội dung.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Lịch đa kênh và bảng ý tưởng sẽ hiện ở đây khi có nguồn nội dung.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Content engine</div>
        <button
          className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
          data-testid="ae-content-refresh"
          onClick={() => void contentStore.loadContent({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>LỊCH ĐA KÊNH</div>
        {content.calendar.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-content-calendar-empty">Chưa có nguồn nội dung</div>
        ) : (
          content.calendar.map(c => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-content-calendar-row" key={c.id}>
              <span className="w-14 flex-none font-semibold text-[#D7ECFA]">{c.at}</span>
              <span className="rounded-[8px] border border-[rgba(120,200,255,.2)] px-2 py-0.5 text-[10.5px] text-[color:var(--ae-azure-soft)]">{c.channel}</span>
              <span className="min-w-0 flex-1 text-white">{c.title}</span>
              {c.status && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{c.status}</span>}
            </div>
          ))
        )}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>Ý TƯỞNG → NHÁP → LỊCH</div>
        {content.ideas.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-content-ideas-empty">Chưa có nguồn nội dung</div>
        ) : (
          content.ideas.map(i => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-content-idea-row" key={i.id}>
              <span className="rounded-[8px] border border-[rgba(120,200,255,.2)] px-2 py-0.5 text-[10.5px] text-[color:var(--ae-azure-soft)]">{IDEA_STAGE_LABEL[i.stage]}</span>
              <span className="min-w-0 flex-1 text-white">{i.title}</span>
              {i.channel && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{i.channel}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 5: Run the screen + guard tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/screens/content-screen.test.tsx src/aether/ui/screens/content-screen.guard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/content-screen.tsx apps/desktop/src/aether/ui/screens/content-screen.test.tsx apps/desktop/src/aether/ui/screens/content-screen.guard.test.tsx
git commit -m "feat(aether): Content engine cockpit screen (multi-channel calendar + idea board)"
```

---

### Task 3: Route, nav, ⌘K catalog, and shell wiring

**Files:**
- Modify: `apps/desktop/src/app/routes.ts`
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx`
- Modify: `apps/desktop/src/app/command-palette/index.tsx`
- Modify: `apps/desktop/src/app/command-palette/catalog.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Create: `apps/desktop/src/aether/ui/shell/aether-shell-content-route.test.tsx`

**Interfaces:**
- Consumes: `ContentScreen` from `@/aether/ui/screens/content-screen`.
- Produces: `CONTENT_ROUTE = '/content'`.

- [ ] **Step 1: Add the route constant + registry entry**

In `apps/desktop/src/app/routes.ts`:

1. Add after the previous SP-2 route constant:

```typescript
export const CONTENT_ROUTE = '/content'
```

2. Add `'content'` to the `AppView` union (alphabetical, after `'command-center'`/before `'cron'`).
3. Add `'content'` to the `AppRouteId` union.
4. Add a trailing `APP_ROUTES` entry (fix the comma on the previous last entry):

```typescript
  { id: 'content', path: CONTENT_ROUTE, view: 'content' }
```

- [ ] **Step 2: Add the Content nav-rail item**

In `apps/desktop/src/aether/ui/shell/nav-items.tsx`:

1. Add `CONTENT_ROUTE` to the `@/app/routes` import.
2. Add to `AETHER_NAV_ITEMS`:

```typescript
  { id: 'content', route: CONTENT_ROUTE, label: 'Content', icon: I('M4 5h16v14H4zM4 9h16M9 9v10') },
```

- [ ] **Step 3: Add the ⌘K Go-to catalog entry**

In `apps/desktop/src/app/command-palette/index.tsx`:

1. Add `CONTENT_ROUTE` to the `from '../routes'` import.
2. In `aetherGoToItems`, add:

```typescript
    { icon: FileText, id: 'nav-content', keywords: ['content', 'nội dung', 'calendar', 'lịch', 'idea', 'post'], label: 'Content', run: go(CONTENT_ROUTE) },
```

(`FileText` is already imported in this file.)

- [ ] **Step 4: Extend the catalog test (failing)**

In `apps/desktop/src/app/command-palette/catalog.test.tsx`:

1. Add `CONTENT_ROUTE` to the `@/app/routes` import.
2. Add `CONTENT_ROUTE` to the `for (const route of [...])` list.
3. Add:

```typescript
  it('selecting the Content item navigates to /content', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const content = aetherGoToItems(go, tStub).find(item => item.id === 'nav-content')
    expect(content).toBeTruthy()
    content?.run?.()
    expect(navigate).toHaveBeenCalledWith(CONTENT_ROUTE)
  })
```

- [ ] **Step 5: Run the catalog test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 6: Wire the route in the shell**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`:

1. Add `import { ContentScreen } from '@/aether/ui/screens/content-screen'`.
2. Add `CONTENT_ROUTE` to the `@/app/routes` import on line 25.
3. Inside `<Routes>` add:

```tsx
              <Route element={<ContentScreen />} path={CONTENT_ROUTE.slice(1)} />
```

- [ ] **Step 7: Write the shell route test**

Create `apps/desktop/src/aether/ui/shell/aether-shell-content-route.test.tsx`:

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell content route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports ContentScreen', () => {
    expect(src.includes('import { ContentScreen }')).toBe(true)
  })

  it('renders <ContentScreen /> on the content path', () => {
    expect(/<Route element=\{<ContentScreen \/>\} path=\{CONTENT_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })
})
```

- [ ] **Step 8: Run the route + catalog tests to verify they pass**

Run: `cd apps/desktop && npx vitest run src/aether/ui/shell/aether-shell-content-route.test.tsx src/app/command-palette/catalog.test.tsx`
Expected: PASS.

- [ ] **Step 9: Run the full SP-2 surface to confirm no regression**

Run: `cd apps/desktop && npx vitest run src/aether/domain/company-os src/aether/domain/dev src/aether/domain/inbox src/aether/domain/ops src/aether/domain/content src/aether/ui/screens src/aether/ui/shell src/app/command-palette src/app/apply-aether-default.test.ts`
Expected: PASS — all four cockpits, the foundation, the light-theme helper, the shell routes, and the ⌘K catalog green together.

- [ ] **Step 10: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell-content-route.test.tsx
git commit -m "feat(aether): mount Content engine cockpit on /content (route + nav + ⌘K + shell)"
```

---

## Self-Review

- **Spec §5.3 Content engine — multi-channel calendar + idea board (mostly empty-state):** Task 2 renders `content.calendar` + `content.ideas`, each with a "Chưa có nguồn nội dung" fallback, plus a whole-screen empty-state. ✓
- **Spec §4 store contract, §6 read-only + force refresh:** Task 1 + Task 2. ✓
- **Spec §8 render + interaction + prompt-cache guard tests:** Task 2. ✓
- **Spec §8 ⌘K catalog + shell smoke + full-surface green:** Task 3 (Step 9 runs the entire SP-2 suite). ✓
- **Global constraint: no fabricated content, no delta coupling, tokenized colors:** empty-states + guard test. ✓
- **Placeholder scan / type consistency:** `ContentSection`/`ContentCalendarEntry`/`ContentIdea` (Plan 1), `loadContent({ force })`, `CONTENT_ROUTE`, testids — consistent. ✓
```
