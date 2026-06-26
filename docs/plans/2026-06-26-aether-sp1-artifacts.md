# Artifacts Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a read-only Artifacts library screen that wraps existing session data (list/search/preview) plus optional file outputs via `readDir` — with no artifact backend, no save/edit, and a strictly static preview.

**Architecture:** 3-tier. The screen `aether/ui/screens/artifacts-screen.tsx` reads nanostore atoms; the store `aether/domain/artifacts/artifacts-store.ts` owns `$artifacts`/`$artifactsStatus`/`$artifactQuery`/`$selectedArtifact`/`$selectedPreview`/`$fileOutputs` and the `loadArtifacts`/`searchArtifacts`/`openArtifact`/`loadFileOutputs` actions, all wired through injectable `deps.api`/`deps.readDir` defaulting to the existing `apps/desktop/src/aether-api.ts` helpers + `window.aetherDesktop.readDir`. No new endpoints are added; preview opens static metadata + `getSessionMessages` only — never a live conversation stream.

**Tech Stack:** React 18, nanostores (`atom` + `@nanostores/react` `useStore`), Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react (`fireEvent`, `cleanup`; assertions use `toBeTruthy()` — this repo has no `@testing-library/jest-dom`).

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className; no runtime rewrite.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — list/search/metadata REST only. Preview opens STATIC content/metadata — do NOT open a live conversation stream, no `message.delta`/`reasoning.delta`/`thinking.*` subscription, no `appendAssistantDelta`, no LLM re-trigger.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.
- READ-ONLY: label clearly read-only; NO save/edit-artifact buttons (no backend exists).

---

## Source-of-truth signatures (verified — do NOT re-invent)

From `apps/desktop/src/aether-api.ts`:
- `listSessions(limit = 40, minMessages = 0, archived = 'exclude', order = 'recent'): Promise<PaginatedSessions>`
- `searchSessions(query: string): Promise<SessionSearchResponse>`
- `getSession(id: string, profile?: string | null): Promise<SessionInfo>`
- `getSessionMessages(id: string, profile?: string | null): Promise<SessionMessagesResponse>`

From `apps/desktop/src/types/aether.ts`:
- `PaginatedSessions { limit; offset; sessions: SessionInfo[]; total; profile_totals?; errors? }`
- `SessionInfo { id; title: null | string; preview: null | string; message_count; model: null | string; started_at; last_active; source: null | string; tool_call_count; input_tokens; output_tokens; is_active; ended_at; ... }`
- `SessionSearchResponse { results: SessionSearchResult[] }`
- `SessionSearchResult { session_id; snippet; model: string | null; role: string | null; session_started: number | null; source: string | null; lineage_root?: string | null }`
- `SessionMessage { role: 'assistant' | 'system' | 'tool' | 'user'; content: unknown; text?: unknown; timestamp?; ... }`
- `SessionMessagesResponse { messages: SessionMessage[]; session_id: string }`

From `apps/desktop/src/global.d.ts`:
- `window.aetherDesktop.readDir: (path: string) => Promise<AetherReadDirResult>`
- `AetherReadDirResult { entries: AetherReadDirEntry[]; error?: string }`
- `AetherReadDirEntry { name: string; path: string; isDirectory: boolean }`

Route (from `apps/desktop/src/app/routes.ts`): `ARTIFACTS_ROUTE = '/artifacts'`; shell renders `<StubScreen title="Artifacts" />` at `path={ARTIFACTS_ROUTE.slice(1)}` (`apps/desktop/src/aether/ui/shell/aether-shell.tsx:53`).

Test runner: `npm run test:ui` → `vitest run --environment jsdom`, run from `apps/desktop`. Path alias `@/` → `apps/desktop/src/`.

---

## Task 1 — `artifacts-store.ts`: load (listSessions) + status atoms

**Files:**
- Create: `apps/desktop/src/aether/domain/artifacts/artifacts-store.ts`
- Test: `apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts`

**Interfaces:**
- Consumes: `listSessions(limit, minMessages, archived, order) => Promise<PaginatedSessions>`, `searchSessions(query) => Promise<SessionSearchResponse>`, `getSession(id, profile?) => Promise<SessionInfo>`, `getSessionMessages(id, profile?) => Promise<SessionMessagesResponse>` (injected via `deps`).
- Produces: `$artifacts: atom<SessionInfo[] | null>`, `$artifactsStatus: atom<'idle'|'loading'|'ready'|'empty'|'error'>`, `$artifactQuery: atom<string>`, `$selectedArtifact: atom<SessionInfo | null>`, `$selectedPreview: atom<SessionMessage[] | null>`, `$previewStatus: atom<'idle'|'loading'|'ready'|'error'>`, `$fileOutputs: atom<AetherReadDirEntry[] | null>`, and actions `loadArtifacts(deps?)`, `searchArtifacts(query, deps?)`, `openArtifact(id, deps?)`, `loadFileOutputs(dir, deps?)`. Plus exported `ArtifactsDeps` interface.

- [ ] **Step 1.1 — failing test for `loadArtifacts` (listSessions → ready)**

Create `apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PaginatedSessions, SessionInfo, SessionSearchResponse } from '@/types/aether'

import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $previewStatus,
  loadArtifacts,
  searchArtifacts,
  openArtifact,
  type ArtifactsDeps,
} from './artifacts-store'

function session(id: string, title: string): SessionInfo {
  return {
    id,
    title,
    preview: `preview ${id}`,
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: 1_700_000_000,
    message_count: 4,
    model: 'nous/hermes',
    output_tokens: 0,
    source: 'desktop',
    started_at: 1_700_000_000,
    tool_call_count: 0,
  }
}

beforeEach(() => {
  $artifacts.set(null)
  $artifactsStatus.set('idle')
  $artifactQuery.set('')
  $selectedArtifact.set(null)
  $previewStatus.set('idle')
})

describe('artifacts-store', () => {
  it('loadArtifacts populates $artifacts from listSessions and sets ready', async () => {
    const paginated: PaginatedSessions = {
      limit: 40,
      offset: 0,
      total: 2,
      sessions: [session('a1', 'Alpha'), session('a2', 'Beta')],
    }
    const listSessions = vi.fn(async () => paginated)
    const deps: ArtifactsDeps = { listSessions: listSessions as never }

    await loadArtifacts(deps)

    expect(listSessions).toHaveBeenCalledTimes(1)
    expect($artifacts.get()?.map(s => s.id)).toEqual(['a1', 'a2'])
    expect($artifactsStatus.get()).toBe('ready')
  })

  it('loadArtifacts sets empty when no sessions exist', async () => {
    const listSessions = vi.fn(async (): Promise<PaginatedSessions> => ({
      limit: 40,
      offset: 0,
      total: 0,
      sessions: [],
    }))

    await loadArtifacts({ listSessions: listSessions as never })

    expect($artifactsStatus.get()).toBe('empty')
    expect($artifacts.get()).toEqual([])
  })

  it('loadArtifacts sets error when listSessions throws', async () => {
    const listSessions = vi.fn(async () => {
      throw new Error('boom')
    })

    await loadArtifacts({ listSessions: listSessions as never })

    expect($artifactsStatus.get()).toBe('error')
  })

  it('searchArtifacts maps SessionSearchResponse rows into artifact entries', async () => {
    const response: SessionSearchResponse = {
      results: [
        {
          session_id: 's9',
          snippet: 'hello world',
          model: 'nous/hermes',
          role: 'assistant',
          session_started: 1_700_000_500,
          source: 'desktop',
        },
      ],
    }
    const searchSessions = vi.fn(async () => response)

    await searchArtifacts('hello', { searchSessions: searchSessions as never })

    expect(searchSessions).toHaveBeenCalledWith('hello')
    expect($artifactQuery.get()).toBe('hello')
    expect($artifacts.get()?.[0]?.id).toBe('s9')
    expect($artifacts.get()?.[0]?.preview).toBe('hello world')
    expect($artifactsStatus.get()).toBe('ready')
  })

  it('searchArtifacts with a blank query falls back to loadArtifacts', async () => {
    const listSessions = vi.fn(async (): Promise<PaginatedSessions> => ({
      limit: 40,
      offset: 0,
      total: 1,
      sessions: [session('a1', 'Alpha')],
    }))
    const searchSessions = vi.fn()

    await searchArtifacts('   ', { listSessions: listSessions as never, searchSessions: searchSessions as never })

    expect(searchSessions).not.toHaveBeenCalled()
    expect(listSessions).toHaveBeenCalledTimes(1)
    expect($artifacts.get()?.[0]?.id).toBe('a1')
  })

  it('openArtifact loads static metadata via getSession + getSessionMessages (no stream)', async () => {
    const getSession = vi.fn(async () => session('a1', 'Alpha'))
    const getSessionMessages = vi.fn(async () => ({
      session_id: 'a1',
      messages: [{ role: 'user' as const, content: 'hi' }],
    }))

    await openArtifact('a1', { getSession: getSession as never, getSessionMessages: getSessionMessages as never })

    expect(getSession).toHaveBeenCalledWith('a1')
    expect(getSessionMessages).toHaveBeenCalledWith('a1')
    expect($selectedArtifact.get()?.id).toBe('a1')
    expect($previewStatus.get()).toBe('ready')
  })
})
```

- [ ] **Step 1.2 — run, expect FAIL**

Command (from `apps/desktop`):
```
npm run test:ui -- src/aether/domain/artifacts/artifacts-store.test.ts
```
Expected output contains:
```
Failed to resolve import "./artifacts-store"
```
(The module does not exist yet.)

- [ ] **Step 1.3 — minimal implementation**

Create `apps/desktop/src/aether/domain/artifacts/artifacts-store.ts`:

```ts
import { atom } from 'nanostores'

import { getSession, getSessionMessages, listSessions, searchSessions } from '@/aether-api'
import type { AetherReadDirEntry } from '@/global'
import type {
  PaginatedSessions,
  SessionInfo,
  SessionMessage,
  SessionMessagesResponse,
  SessionSearchResponse,
} from '@/types/aether'

export interface ArtifactsDeps {
  listSessions?: typeof listSessions
  searchSessions?: typeof searchSessions
  getSession?: typeof getSession
  getSessionMessages?: typeof getSessionMessages
  readDir?: (path: string) => Promise<{ entries: AetherReadDirEntry[]; error?: string }>
}

export type LibraryStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type PreviewStatus = 'idle' | 'loading' | 'ready' | 'error'

export const $artifacts = atom<SessionInfo[] | null>(null)
export const $artifactsStatus = atom<LibraryStatus>('idle')
export const $artifactQuery = atom<string>('')
export const $selectedArtifact = atom<SessionInfo | null>(null)
export const $selectedPreview = atom<SessionMessage[] | null>(null)
export const $previewStatus = atom<PreviewStatus>('idle')
export const $fileOutputs = atom<AetherReadDirEntry[] | null>(null)

const ARTIFACTS_LIST_LIMIT = 60
const ARTIFACTS_MIN_MESSAGES = 1

// A search hit is a thin row; project it onto SessionInfo so the library grid
// renders one card shape for both list and search. Unknown numeric/flag fields
// get inert defaults — this is a read-only view, nothing mutates them.
function searchResultToSession(result: SessionSearchResponse['results'][number]): SessionInfo {
  return {
    id: result.session_id,
    title: null,
    preview: result.snippet,
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: result.session_started ?? 0,
    message_count: 0,
    model: result.model,
    output_tokens: 0,
    source: result.source,
    started_at: result.session_started ?? 0,
    tool_call_count: 0,
  }
}

export async function loadArtifacts(deps: ArtifactsDeps = {}): Promise<void> {
  const list = deps.listSessions ?? listSessions
  $artifactsStatus.set('loading')

  try {
    const result: PaginatedSessions = await list(ARTIFACTS_LIST_LIMIT, ARTIFACTS_MIN_MESSAGES, 'exclude', 'recent')
    $artifacts.set(result.sessions)
    $artifactsStatus.set(result.sessions.length === 0 ? 'empty' : 'ready')
  } catch {
    $artifactsStatus.set('error')
  }
}

export async function searchArtifacts(query: string, deps: ArtifactsDeps = {}): Promise<void> {
  const trimmed = query.trim()
  $artifactQuery.set(trimmed)

  if (!trimmed) {
    await loadArtifacts(deps)

    return
  }

  const search = deps.searchSessions ?? searchSessions
  $artifactsStatus.set('loading')

  try {
    const response: SessionSearchResponse = await search(trimmed)
    const rows = response.results.map(searchResultToSession)
    $artifacts.set(rows)
    $artifactsStatus.set(rows.length === 0 ? 'empty' : 'ready')
  } catch {
    $artifactsStatus.set('error')
  }
}

export async function openArtifact(id: string, deps: ArtifactsDeps = {}): Promise<void> {
  const fetchSession = deps.getSession ?? getSession
  const fetchMessages = deps.getSessionMessages ?? getSessionMessages
  $previewStatus.set('loading')

  try {
    const info = await fetchSession(id)
    $selectedArtifact.set(info)
    // Static transcript fetch — a one-shot REST read of stored messages. This is
    // NOT a conversation stream: no ws subscription, no delta handler, no LLM
    // re-trigger. Preview is read-only by construction.
    const transcript: SessionMessagesResponse = await fetchMessages(id)
    $selectedPreview.set(transcript.messages)
    $previewStatus.set('ready')
  } catch {
    $previewStatus.set('error')
  }
}

export async function loadFileOutputs(dir: string, deps: ArtifactsDeps = {}): Promise<void> {
  const readDir = deps.readDir ?? ((path: string) => window.aetherDesktop.readDir(path))

  try {
    const result = await readDir(dir)
    $fileOutputs.set(result.error ? [] : result.entries.filter(e => !e.isDirectory))
  } catch {
    $fileOutputs.set([])
  }
}
```

- [ ] **Step 1.4 — run, expect PASS**

Command:
```
npm run test:ui -- src/aether/domain/artifacts/artifacts-store.test.ts
```
Expected output contains:
```
Test Files  1 passed (1)
```
with 6 passing tests.

- [ ] **Step 1.5 — commit**

```
git add apps/desktop/src/aether/domain/artifacts/artifacts-store.ts apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts
git commit -m "$(cat <<'EOF'
feat(aether): artifacts-store load/search/openArtifact over sessions

Read-only library state: listSessions for the grid, searchSessions for
query, getSession + getSessionMessages for a static preview. No backend,
no live stream — injectable deps for tests.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — `artifacts-screen.tsx`: library grid + skeleton/empty/error + read-only badge

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx`

**Interfaces:**
- Consumes: `$artifacts`, `$artifactsStatus`, `$artifactQuery`, `loadArtifacts`, `searchArtifacts`, `openArtifact` from `artifacts-store.ts`; `GlassSlab` from `@/aether/ui/components/glass-slab`.
- Produces: `export function ArtifactsScreen(): JSX.Element` — root `.ae-screen-bare flex h-full min-w-0 flex-col`, mount-load on idle, states (loading skeleton / empty / error+retry / ready grid), a read-only badge, a search box, and clickable artifact cards (`data-testid="ae-artifact-card"`).

- [ ] **Step 2.1 — failing render test (grid + read-only badge + skeleton/empty/error)**

Create `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx`:

```ts
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SessionInfo } from '@/types/aether'
import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $previewStatus,
} from '@/aether/domain/artifacts/artifacts-store'

import { ArtifactsScreen } from './artifacts-screen'

function session(id: string, title: string): SessionInfo {
  return {
    id,
    title,
    preview: `preview ${id}`,
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: 1_700_000_000,
    message_count: 4,
    model: 'nous/hermes',
    output_tokens: 0,
    source: 'desktop',
    started_at: 1_700_000_000,
    tool_call_count: 0,
  }
}

beforeEach(() => {
  $artifacts.set([session('a1', 'Alpha'), session('a2', 'Beta')])
  $artifactsStatus.set('ready')
  $artifactQuery.set('')
  $selectedArtifact.set(null)
  $previewStatus.set('idle')
})
afterEach(cleanup)

describe('ArtifactsScreen', () => {
  it('renders a card per artifact with a search box and a read-only badge', () => {
    render(<ArtifactsScreen />)
    expect(screen.getAllByTestId('ae-artifact-card')).toHaveLength(2)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Tìm/)).toBeTruthy()
    expect(screen.getByText(/Chỉ đọc/)).toBeTruthy()
  })

  it('never carries a save/edit affordance (read-only library)', () => {
    render(<ArtifactsScreen />)
    expect(screen.queryByText(/Lưu/)).toBeNull()
    expect(screen.queryByText(/Sửa/)).toBeNull()
  })

  it('shows the Vietnamese empty state when there are no artifacts', () => {
    $artifacts.set([])
    $artifactsStatus.set('empty')
    render(<ArtifactsScreen />)
    expect(screen.getByText(/Chưa có/)).toBeTruthy()
    expect(screen.queryByTestId('ae-artifact-card')).toBeNull()
  })

  it('shows an inline error with a retry control', () => {
    $artifactsStatus.set('error')
    render(<ArtifactsScreen />)
    expect(screen.getByText(/Thử lại/)).toBeTruthy()
  })

  it('shows skeletons while loading', () => {
    $artifacts.set(null)
    $artifactsStatus.set('loading')
    render(<ArtifactsScreen />)
    expect(screen.getAllByTestId('ae-artifact-skeleton').length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2.2 — run, expect FAIL**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected output contains:
```
Failed to resolve import "./artifacts-screen"
```

- [ ] **Step 2.3 — minimal implementation (states + grid; preview wiring added in Task 4)**

Create `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx`:

```tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  loadArtifacts,
  searchArtifacts,
  openArtifact,
} from '@/aether/domain/artifacts/artifacts-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_LABEL = 'text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

export function ArtifactsScreen() {
  const artifacts = useStore($artifacts)
  const status = useStore($artifactsStatus)
  const query = useStore($artifactQuery)

  useEffect(() => {
    if ($artifactsStatus.get() === 'idle') {
      void loadArtifacts()
    }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[22px] font-semibold leading-[1.1]">Thư viện Artifacts</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">
            Phiên làm việc và tệp kết quả — xem lại nhanh.
          </div>
        </div>
        <span
          className="flex-none rounded-full px-3 py-1 text-[11px] font-semibold"
          data-testid="ae-readonly-badge"
          style={{
            background: 'linear-gradient(180deg,rgba(120,195,245,.12),rgba(120,195,245,.03))',
            border: '1px solid rgba(120,200,255,.28)',
            color: 'var(--ae-azure-soft)',
          }}
        >
          Chỉ đọc
        </span>
      </div>

      <div className="z-[2] mt-4">
        <input
          className="w-full rounded-[12px] bg-[rgba(8,22,44,.5)] px-4 py-2.5 text-[13px] text-white outline-none"
          onChange={e => void searchArtifacts(e.target.value)}
          placeholder="Tìm trong artifacts…"
          style={{ border: '1px solid rgba(120,200,255,.18)' }}
          type="search"
          value={query}
        />
      </div>

      <div className="z-[2] mt-4 min-h-0 flex-1 overflow-auto">
        {status === 'loading' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                className="h-[96px] animate-pulse rounded-[14px] bg-[rgba(120,195,245,.06)]"
                data-testid="ae-artifact-skeleton"
                key={i}
              />
            ))}
          </div>
        )}

        {status === 'empty' && (
          <GlassSlab className="text-center" size="lg">
            <div className={SECTION_LABEL}>THƯ VIỆN TRỐNG</div>
            <div className="mt-2 text-sm text-[color:var(--ae-dim)]">
              Chưa có artifact nào. Các phiên làm việc sẽ xuất hiện ở đây.
            </div>
          </GlassSlab>
        )}

        {status === 'error' && (
          <GlassSlab className="flex flex-col items-center gap-3 text-center" size="lg">
            <div className="text-sm text-[color:var(--ae-warn)]">Không tải được thư viện artifacts.</div>
            <button
              className="rounded-[11px] px-4 py-2 text-[13px] font-semibold text-white"
              onClick={() => void searchArtifacts($artifactQuery.get())}
              style={{
                background: 'linear-gradient(180deg,rgba(74,163,255,.18),rgba(120,195,245,.05))',
                border: '1px solid rgba(120,210,255,.34)',
              }}
              type="button"
            >
              Thử lại
            </button>
          </GlassSlab>
        )}

        {status === 'ready' && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3">
            {(artifacts ?? []).map(a => (
              <button
                className="flex flex-col gap-2 rounded-[14px] p-[14px] text-left"
                data-testid="ae-artifact-card"
                key={a.id}
                onClick={() => void openArtifact(a.id)}
                style={{
                  background: 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))',
                  border: '1px solid rgba(120,200,255,.12)',
                }}
                type="button"
              >
                <div className="truncate text-[13px] font-semibold text-white">
                  {a.title ?? 'Phiên không tên'}
                </div>
                <div className="line-clamp-2 text-[11.5px] text-[color:var(--ae-dim)]">
                  {a.preview ?? '—'}
                </div>
                <div className="mt-auto flex items-center gap-2 text-[10.5px] text-[color:var(--ae-azure-soft)]">
                  {a.model && <span className="truncate">{a.model}</span>}
                  {a.message_count > 0 && <span>· {a.message_count} tin nhắn</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2.4 — run, expect PASS**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected output contains:
```
Test Files  1 passed (1)
```
with 5 passing tests.

- [ ] **Step 2.5 — commit**

```
git add apps/desktop/src/aether/ui/screens/artifacts-screen.tsx apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx
git commit -m "$(cat <<'EOF'
feat(aether): ArtifactsScreen library grid with read-only badge

Mount-load on idle; skeleton/empty/error/ready states; Vietnamese
copy; search box; clickable session-artifact cards. No save/edit
affordance — read-only by design.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — search interaction (typing → searchSessions)

**Files:**
- Modify: `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx` (add interaction test)
- (No screen change expected — Task 2 already wires `onChange → searchArtifacts`. If the test passes immediately, document that and still commit the new test.)

**Interfaces:**
- Consumes: `searchArtifacts(query, deps?)` indirectly through the screen's `onChange`.
- Produces: a verified contract that typing into the search box drives `$artifactQuery` and calls `searchSessions` with the typed query (via a spied default dep).

- [ ] **Step 3.1 — failing/again-green interaction test**

Append to `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx` a new `describe`. Because the screen calls the real `searchArtifacts` (which calls the real `searchSessions` against `window.aetherDesktop.api`), stub `window.aetherDesktop.api` to assert the query path. Add at top of file (after imports):

```ts
import { fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
```

(Merge `vi`/`fireEvent` into the existing import lines rather than duplicating — keep one import per module.)

Then append:

```ts
describe('ArtifactsScreen search interaction', () => {
  afterEach(() => {
    // restore the global stub between cases
    // @ts-expect-error test shim
    delete globalThis.window.aetherDesktop
  })

  it('typing in the search box queries searchSessions with the text', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path.startsWith('/api/sessions/search')) {
        return { results: [] }
      }

      return { limit: 60, offset: 0, total: 0, sessions: [] }
    })
    // @ts-expect-error test shim — only the api method is exercised here
    globalThis.window.aetherDesktop = { api, readDir: vi.fn() }

    render(<ArtifactsScreen />)
    const box = screen.getByPlaceholderText(/Tìm/)
    fireEvent.change(box, { target: { value: 'design spec' } })

    // searchArtifacts is async; flush microtasks.
    await Promise.resolve()
    await Promise.resolve()

    expect($artifactQuery.get()).toBe('design spec')
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('/api/sessions/search?q=design%20spec') }),
    )
  })
})
```

- [ ] **Step 3.2 — run**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
If the interaction is already wired (Task 2), this passes immediately — that is the expected green outcome confirming the contract. Expected output contains:
```
Test Files  1 passed (1)
```
(now with 6 tests). If it FAILS because `searchArtifacts` is not invoked on change, fix the screen's `onChange={e => void searchArtifacts(e.target.value)}` and re-run to green.

- [ ] **Step 3.3 — commit**

```
git add apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx
git commit -m "$(cat <<'EOF'
test(aether): assert artifacts search box hits searchSessions

Typing routes to searchArtifacts → /api/sessions/search?q=… and sets
$artifactQuery. Read-only query path, no mutation.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4 — static preview panel + prompt-cache guard (HARD)

**Files:**
- Modify: `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx` (add preview panel)
- Modify: `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx` (preview render + prompt-cache guard)

**Interfaces:**
- Consumes: `$selectedArtifact`, `$selectedPreview`, `$previewStatus`, `openArtifact(id, deps?)` from `artifacts-store.ts`.
- Produces: a read-only preview region that renders selected-session metadata + static transcript text. Guard contract: opening a preview calls only `getSession` + `getSessionMessages` (REST) — never a stream subscription, never `appendAssistantDelta`.

- [ ] **Step 4.1 — failing preview + prompt-cache guard test**

Append to `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx`:

```ts
describe('ArtifactsScreen preview (static, prompt-cache safe)', () => {
  afterEach(() => {
    // @ts-expect-error test shim
    delete globalThis.window.aetherDesktop
  })

  it('clicking a card opens a static preview from getSession + getSessionMessages only', async () => {
    const calledPaths: string[] = []
    const api = vi.fn(async (req: { path: string }) => {
      calledPaths.push(req.path)

      if (req.path.endsWith('/messages')) {
        return { session_id: 'a1', messages: [{ role: 'assistant', content: 'static answer' }] }
      }

      // getSession (by id, no /messages suffix)
      return {
        id: 'a1',
        title: 'Alpha',
        preview: 'preview a1',
        message_count: 4,
        model: 'nous/hermes',
        started_at: 1_700_000_000,
        last_active: 1_700_000_000,
        source: 'desktop',
        is_active: false,
        ended_at: null,
        input_tokens: 0,
        output_tokens: 0,
        tool_call_count: 0,
        archived: false,
        cwd: null,
      }
    })
    // @ts-expect-error test shim
    globalThis.window.aetherDesktop = { api, readDir: vi.fn() }

    render(<ArtifactsScreen />)
    fireEvent.click(screen.getAllByTestId('ae-artifact-card')[0])

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // Preview shows the static transcript text and a read-only preview label.
    expect(await screen.findByText(/static answer/)).toBeTruthy()
    expect(screen.getByTestId('ae-artifact-preview')).toBeTruthy()

    // HARD prompt-cache guard: ONLY the by-id session read and its /messages
    // read were issued — no stream/resume/run path. getSessionMessages is a
    // one-shot REST read of stored content, never a live delta subscription;
    // there is no appendAssistantDelta in this module's import graph.
    expect(calledPaths.some(p => /\/api\/sessions\/[^/]+$/.test(p))).toBe(true)
    expect(calledPaths.some(p => p.endsWith('/messages'))).toBe(true)
    expect(calledPaths.some(p => /resume|stream|run|delta|invoke/i.test(p))).toBe(false)
  })

  it('source module never imports a conversation-delta appender (forbidden-import guard)', async () => {
    // Static source-text assertion: the screen + store must not pull in any
    // streaming/delta machinery. Cheap and deterministic — justifies the HARD
    // prompt-cache rule without a brittle ws spy.
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const here = path.dirname(new URL(import.meta.url).pathname)
    const screenSrc = await fs.readFile(path.join(here, 'artifacts-screen.tsx'), 'utf8')
    const storeSrc = await fs.readFile(
      path.join(here, '..', '..', 'domain', 'artifacts', 'artifacts-store.ts'),
      'utf8',
    )
    for (const src of [screenSrc, storeSrc]) {
      expect(src).not.toMatch(/appendAssistantDelta/)
      expect(src).not.toMatch(/message\.delta|reasoning\.delta|thinking\./)
      expect(src).not.toMatch(/subscribe|onMessage|WebSocket|getGatewayWsUrl/)
    }
  })
})
```

- [ ] **Step 4.2 — run, expect FAIL**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected: the preview render case fails because `ae-artifact-preview` / `static answer` are not in the DOM yet:
```
Unable to find an element by: [data-testid="ae-artifact-preview"]
```
(The forbidden-import case should already pass — that is fine; the suite is RED overall.)

- [ ] **Step 4.3 — minimal implementation: add the preview panel**

In `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx`, extend the imports and render the preview. Replace the import block's store line with:

```tsx
import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $selectedPreview,
  $previewStatus,
  loadArtifacts,
  searchArtifacts,
  openArtifact,
} from '@/aether/domain/artifacts/artifacts-store'
```

Add a small helper above `ArtifactsScreen` to coerce a stored message into preview text (message `content`/`text` are `unknown`):

```tsx
function messageText(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value
      .map(part =>
        typeof part === 'string'
          ? part
          : part && typeof part === 'object' && 'text' in part && typeof (part as { text: unknown }).text === 'string'
            ? (part as { text: string }).text
            : '',
      )
      .join('')
  }

  return ''
}
```

Inside the component, read the new atoms after the existing `useStore` calls:

```tsx
  const selected = useStore($selectedArtifact)
  const preview = useStore($selectedPreview)
  const previewStatus = useStore($previewStatus)
```

Wrap the existing list region and add a side preview panel. Replace the single
`<div className="z-[2] mt-4 min-h-0 flex-1 overflow-auto">…</div>` library block
with a two-column layout where the right column is the preview:

```tsx
      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-3.5">
        <div className="min-h-0 overflow-auto">
          {/* …the existing loading/empty/error/ready blocks, unchanged… */}
        </div>

        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="mb-2 flex items-center justify-between">
            <div className={SECTION_LABEL}>XEM TRƯỚC · CHỈ ĐỌC</div>
          </div>

          {previewStatus === 'idle' && (
            <div className="text-[12px] text-[color:var(--ae-dim)]">
              Chọn một artifact để xem nội dung tĩnh.
            </div>
          )}
          {previewStatus === 'loading' && (
            <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải…</div>
          )}
          {previewStatus === 'error' && (
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không mở được artifact.</div>
          )}
          {previewStatus === 'ready' && (
            <div className="flex min-h-0 flex-col gap-2" data-testid="ae-artifact-preview">
              <div className="text-[13px] font-semibold text-white">
                {selected?.title ?? 'Phiên không tên'}
              </div>
              <div className="text-[10.5px] text-[color:var(--ae-azure-soft)]">
                {selected?.model} · {selected?.message_count ?? 0} tin nhắn
              </div>
              <div className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap text-[12px] leading-[1.5] text-[#CFE2F7]">
                {(preview ?? []).map((m, i) => (
                  <p className="mb-2" key={i}>
                    <b className="text-[color:var(--ae-azure-soft)]">{m.role}: </b>
                    {messageText(m.content) || messageText(m.text)}
                  </p>
                ))}
              </div>
            </div>
          )}
        </GlassSlab>
      </div>
```

(Keep the existing loading/empty/error/ready JSX exactly as written in Task 2 inside the left `<div className="min-h-0 overflow-auto">` column.)

- [ ] **Step 4.4 — run, expect PASS**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected output contains:
```
Test Files  1 passed (1)
```
with 8 passing tests (Task 2 ×5 + Task 3 ×1 + Task 4 ×2).

- [ ] **Step 4.5 — commit**

```
git add apps/desktop/src/aether/ui/screens/artifacts-screen.tsx apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx
git commit -m "$(cat <<'EOF'
feat(aether): static read-only artifact preview + prompt-cache guard

Clicking a card opens getSession + getSessionMessages (one-shot REST);
preview is metadata + stored transcript text. Guard test asserts no
resume/stream/delta path and a forbidden-import check on the source.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5 (optional) — file outputs via `readDir`

> Optional. Implement only if a known output directory is configured. The store
> action `loadFileOutputs(dir, deps?)` already exists from Task 1; this task adds
> a UI section + test. If skipped, leave `$fileOutputs` unused and proceed to
> Task 6 (the store action remains covered indirectly only — add Step 5.1's store
> test regardless so the action is not dead/untested).

**Files:**
- Modify: `apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts` (add `loadFileOutputs` test)
- Modify: `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx` (file-outputs section)
- Modify: `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx` (file-outputs render)

**Interfaces:**
- Consumes: `deps.readDir(path) => Promise<{ entries: AetherReadDirEntry[]; error?: string }>` (defaults to `window.aetherDesktop.readDir`).
- Produces: `$fileOutputs` populated with non-directory entries; a UI list of file outputs (read-only, name only).

- [ ] **Step 5.1 — failing store test for `loadFileOutputs`**

Append to `apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts`:

```ts
import { $fileOutputs, loadFileOutputs } from './artifacts-store'

describe('loadFileOutputs', () => {
  it('keeps only files (drops directories) from readDir', async () => {
    $fileOutputs.set(null)
    const readDir = vi.fn(async () => ({
      entries: [
        { name: 'report.md', path: '/out/report.md', isDirectory: false },
        { name: 'subdir', path: '/out/subdir', isDirectory: true },
      ],
    }))

    await loadFileOutputs('/out', { readDir: readDir as never })

    expect(readDir).toHaveBeenCalledWith('/out')
    expect($fileOutputs.get()?.map(e => e.name)).toEqual(['report.md'])
  })

  it('sets an empty list when readDir reports an error', async () => {
    $fileOutputs.set(null)
    const readDir = vi.fn(async () => ({ entries: [], error: 'EACCES' }))

    await loadFileOutputs('/out', { readDir: readDir as never })

    expect($fileOutputs.get()).toEqual([])
  })
})
```

(Merge the new `import` into the existing import from `./artifacts-store` rather than duplicating it.)

- [ ] **Step 5.2 — run, expect PASS (store action already implemented in Task 1)**

Command:
```
npm run test:ui -- src/aether/domain/artifacts/artifacts-store.test.ts
```
Expected output contains:
```
Test Files  1 passed (1)
```
with 8 passing tests. (If `loadFileOutputs` was somehow stubbed, implement per Task 1's body and re-run to green.)

- [ ] **Step 5.3 — failing render test for the file-outputs section**

Append to `apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx`:

```ts
import { $fileOutputs } from '@/aether/domain/artifacts/artifacts-store'

describe('ArtifactsScreen file outputs', () => {
  it('lists file outputs when present', () => {
    $artifacts.set([])
    $artifactsStatus.set('empty')
    $fileOutputs.set([{ name: 'report.md', path: '/out/report.md', isDirectory: false }])
    render(<ArtifactsScreen />)
    expect(screen.getByText('report.md')).toBeTruthy()
  })
})
```

(Merge the `$fileOutputs` import into the existing store import line. Reset
`$fileOutputs.set(null)` in the file's top-level `beforeEach`.)

- [ ] **Step 5.4 — run, expect FAIL**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected:
```
Unable to find an element with the text: report.md
```

- [ ] **Step 5.5 — minimal implementation: render the file-outputs section**

In `apps/desktop/src/aether/ui/screens/artifacts-screen.tsx`, import + read `$fileOutputs`:

```tsx
  const fileOutputs = useStore($fileOutputs)
```

Render a compact list under the search box (above the grid), only when non-empty:

```tsx
      {fileOutputs && fileOutputs.length > 0 && (
        <div className="z-[2] mt-3">
          <div className={SECTION_LABEL}>TỆP KẾT QUẢ · CHỈ ĐỌC</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {fileOutputs.map(f => (
              <span
                className="rounded-[10px] px-3 py-1.5 text-[11.5px] text-[#D7ECFA]"
                key={f.path}
                style={{ background: 'rgba(120,195,245,.06)', border: '1px solid rgba(120,200,255,.12)' }}
              >
                {f.name}
              </span>
            ))}
          </div>
        </div>
      )}
```

(No automatic `loadFileOutputs` call on mount — there is no configured output
dir in SP-1. The section appears only when a caller seeds `$fileOutputs`. If a
known dir is later configured, add `void loadFileOutputs(KNOWN_DIR)` to the
mount effect.)

- [ ] **Step 5.6 — run, expect PASS**

Command:
```
npm run test:ui -- src/aether/ui/screens/artifacts-screen.test.tsx
```
Expected output contains:
```
Test Files  1 passed (1)
```
with 9 passing tests.

- [ ] **Step 5.7 — commit**

```
git add apps/desktop/src/aether/domain/artifacts/artifacts-store.test.ts apps/desktop/src/aether/ui/screens/artifacts-screen.tsx apps/desktop/src/aether/ui/screens/artifacts-screen.test.tsx
git commit -m "$(cat <<'EOF'
feat(aether): optional read-only file-outputs section via readDir

loadFileOutputs filters readDir to files; screen renders a name-only,
read-only chip list when $fileOutputs is seeded. No mount auto-load
(no configured output dir in SP-1).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6 — wire the route: swap `<StubScreen title="Artifacts" />` → `<ArtifactsScreen />`

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`

**Interfaces:**
- Consumes: `ArtifactsScreen` from `@/aether/ui/screens/artifacts-screen`.
- Produces: the `/artifacts` route renders the real screen; the rest of the shell is untouched.

- [ ] **Step 6.1 — edit the shell**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add the import (alphabetical, beside the other screen imports near line 11-15):

```tsx
import { ArtifactsScreen } from '@/aether/ui/screens/artifacts-screen'
```

Replace line 53:

```tsx
              <Route element={<StubScreen title="Artifacts" />} path={ARTIFACTS_ROUTE.slice(1)} />
```

with:

```tsx
              <Route element={<ArtifactsScreen />} path={ARTIFACTS_ROUTE.slice(1)} />
```

(Leave `StubScreen` imported — it is still used by the other stubbed routes.)

- [ ] **Step 6.2 — typecheck + full UI suite stay green**

Commands (from `apps/desktop`):
```
npm run typecheck
npm run test:ui
```
Expected: `typecheck` exits 0 (no output on success); `test:ui` ends with all test files passing, e.g.:
```
Test Files  ... passed (...)
```
with the artifacts store + screen suites included and green.

- [ ] **Step 6.3 — commit**

```
git add apps/desktop/src/aether/ui/shell/aether-shell.tsx
git commit -m "$(cat <<'EOF'
feat(aether): mount ArtifactsScreen on the /artifacts route

Replace the Artifacts stub with the real read-only library screen.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review vs spec §5.2 Artifacts bullets

- **Sessions as artifact (list + search + preview):** `loadArtifacts` → `listSessions(...)` fills the grid; `searchArtifacts` → `searchSessions(query)` (blank query falls back to list); `openArtifact` → `getSession(id)` + `getSessionMessages(id)`. Covered by Task 1 store tests, Task 2 grid render, Task 3 search interaction, Task 4 preview render. ✓
- **File outputs via `readDir` (if needed):** `loadFileOutputs(dir)` wraps `window.aetherDesktop.readDir(path)` (confirmed signature: `(path: string) => Promise<AetherReadDirResult>`, `AetherReadDirResult { entries; error? }`); filters out directories; rendered as a read-only chip list. Optional Task 5; no mount auto-load since SP-1 has no configured output dir. ✓
- **Open/preview read-only; no live conversation stream (static metadata/content, no delta subscription):** preview uses one-shot REST `getSession` + `getSessionMessages` only. Task 4 prompt-cache guard asserts (a) only `/api/sessions/<id>` and `/api/sessions/<id>/messages` paths are hit, none matching `resume|stream|run|delta|invoke`, and (b) a forbidden-import check proves neither source file references `appendAssistantDelta`, `*.delta`, `subscribe`, `onMessage`, `WebSocket`, or `getGatewayWsUrl`. ✓
- **Read-only labeling; no save/edit-artifact buttons:** a "Chỉ đọc" badge on the header, "XEM TRƯỚC · CHỈ ĐỌC" / "TỆP KẾT QUẢ · CHỈ ĐỌC" section labels; Task 2 test asserts no "Lưu"/"Sửa" affordance exists. No mutation API is imported. ✓
- **Tokens / brand / localization / layering:** colors via `--ae-*` tokens; Vietnamese UI strings; "Agent" never translated (no nav label touched); root uses `.ae-screen-bare flex h-full min-w-0 flex-col`; padding via `<GlassSlab size>` (single gutter, no double-pad). ✓
