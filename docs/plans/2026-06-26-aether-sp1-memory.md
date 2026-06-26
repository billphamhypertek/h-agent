# Memory Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Memory into its own standalone AETHER Desktop screen (the web app folds it inside `PluginsPage`) — provider selector + per-provider config fields + reset + provider OAuth + a read-only display of current memory entries/status.
**Architecture:** 3-tier (screen → store → existing `aether-api.ts` + raw REST paths). We restyle with `--ae-*` tokens / `<GlassSlab>` and reference the web logic only — no web UI import. The store owns provider/config/status/entries atoms + actions (load-config, save-config, switch-provider, reset, oauth-start, oauth-status, load-status) and injects `deps.api` so it is unit-testable; mutations call REST then re-fetch.
**Tech Stack:** React 18, nanostores, Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className. Do NOT import old web UI; reference logic only.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — REST + non-conversation events only. Entries display (`/api/memory` GET) is a read display — do NOT poll conversation, no `message.delta`/`reasoning.delta`/`thinking.*`, no `appendAssistantDelta`, no LLM re-trigger.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.

---

## Confirmed signatures & REST paths (from source — DO NOT re-invent)

From `apps/desktop/src/aether-api.ts`:
- `getMemoryProviderConfig(provider: string): Promise<MemoryProviderConfig>` → GET `/api/memory/providers/{provider}/config`
- `saveMemoryProviderConfig(provider: string, values: Record<string, string>): Promise<{ ok: boolean }>` → PUT `/api/memory/providers/{provider}/config` body `{ values }`
- `startMemoryProviderOAuth(provider: string): Promise<MemoryProviderOAuthStatus>` → POST `/api/memory/providers/{provider}/oauth/start`
- `getMemoryProviderOAuthStatus(provider: string): Promise<MemoryProviderOAuthStatus>` → GET `/api/memory/providers/{provider}/oauth/status`

From `apps/desktop/src/types/aether.ts` (re-exported by `aether-api.ts`):
```ts
type MemoryProviderFieldKind = 'secret' | 'select' | 'text'
interface MemoryProviderFieldOption { description: string; label: string; value: string }
interface MemoryProviderField {
  description: string; is_set: boolean; key: string; kind: MemoryProviderFieldKind
  label: string; options: MemoryProviderFieldOption[]; placeholder: string; value: string
}
interface MemoryProviderConfig { fields: MemoryProviderField[]; label: string; name: string }
interface MemoryProviderOAuthStatus {
  auth: 'apikey' | 'oauth' | null; connected: boolean; detail: string
  state: 'connected' | 'error' | 'idle' | 'pending'
}
```

**No named methods exist** for provider switch / reset / `/api/memory` GET in `aether-api.ts` — these are **raw `window.aetherDesktop.api({path})` calls** (confirmed; the only consumer today is the web `web/src/lib/api.ts`, NOT desktop). Confirmed shapes from `web/src/lib/api.ts`:
- Provider switch: PUT `/api/memory/provider` body `{ provider }` → `{ ok: boolean; active: string }`
- Reset: POST `/api/memory/reset` body `{ target: 'all' | 'memory' | 'user' }` → `{ ok: boolean; deleted: string[] }`
- Status/entries: GET `/api/memory` → `MemoryStatus = { active: string; providers: MemoryProviderInfo[]; builtin_files: { memory: number; user: number } }` where `MemoryProviderInfo = { name: string; description: string; configured: boolean }`.

> `/api/memory` GET is the "memory entries/context" read display required by the spec — it returns the active provider, the available providers with their configured-state, and built-in file counts (the local memory/user store sizes). This is a **read display only** (no conversation poll).

`deps.api` injection pattern (from `apps/desktop/src/aether/domain/briefing/read-briefing.ts`):
```ts
api?: <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
// default: (request) => window.aetherDesktop.api<T>(request)
```

**MEMORY_ROUTE decision:** there is NO `MEMORY_ROUTE` constant today — `nav-items.tsx` uses the literal `'/memory'` and `aether-shell.tsx` mounts `path="memory"`. **This plan ADDS `MEMORY_ROUTE = '/memory'` to `app/routes.ts` (Task 1)** and rewires nav-items + shell to import it. The command-palette plan should import the same constant — no duplicate literal.

**Test command (run from `apps/desktop`):** `npm run test:ui` = `vitest run --environment jsdom`. To scope to one file append the path, e.g. `npm run test:ui -- src/aether/domain/memory/memory-store.test.ts`.

---

## Task 1 — Add `MEMORY_ROUTE` constant + rewire nav-items & shell

**Files:**
- Modify: `apps/desktop/src/app/routes.ts`
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Test: `apps/desktop/src/app/routes.memory.test.ts` (Create)

**Interfaces:**
- Produces: `export const MEMORY_ROUTE = '/memory'` in `app/routes.ts`.
- Consumes: `MEMORY_ROUTE` in `nav-items.tsx` (the `memory` nav item) and `aether-shell.tsx` (the `path="memory"` route → `MEMORY_ROUTE.slice(1)`).

- [ ] **Step 1.1 — failing test (full code)**

Create `apps/desktop/src/app/routes.memory.test.ts`:
```ts
import { describe, expect, it } from 'vitest'

import { MEMORY_ROUTE } from './routes'

describe('MEMORY_ROUTE', () => {
  it('is the canonical /memory path', () => {
    expect(MEMORY_ROUTE).toBe('/memory')
  })
})
```

- [ ] **Step 1.2 — run, expect FAIL**

Command (from `apps/desktop`):
```
npm run test:ui -- src/app/routes.memory.test.ts
```
Expected: failure — `error TS2305: Module '"./routes"' has no exported member 'MEMORY_ROUTE'` (or vitest "No test found / import error" for the missing export).

- [ ] **Step 1.3 — minimal impl (full code)**

In `apps/desktop/src/app/routes.ts`, add the constant directly after the `BRIEF_ROUTE` line (line 12):
```ts
export const BRIEF_ROUTE = '/brief'
export const MEMORY_ROUTE = '/memory'
```

In `apps/desktop/src/aether/ui/shell/nav-items.tsx`, change the import on line 3 and the `memory` nav item on line 26:
```ts
import { BRIEF_ROUTE, HUD_ROUTE, MEMORY_ROUTE } from '@/app/routes'
```
```ts
  { id: 'memory', route: MEMORY_ROUTE, label: 'Memory', icon: I('M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z') },
```

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add `MEMORY_ROUTE` to the routes import (line 16) and switch the memory `<Route>` path (line 56) to use it. Import line becomes:
```ts
import { ARTIFACTS_ROUTE, BRIEF_ROUTE, COMMAND_CENTER_ROUTE, HUD_ROUTE, MEMORY_ROUTE, MESSAGING_ROUTE, NEW_CHAT_ROUTE, PROFILES_ROUTE } from '@/app/routes'
```
Route line becomes (StubScreen stays for now — swapped in Task 7):
```ts
              <Route element={<StubScreen title="Memory" />} path={MEMORY_ROUTE.slice(1)} />
```

- [ ] **Step 1.4 — run, expect PASS**
```
npm run test:ui -- src/app/routes.memory.test.ts
```
Expected: `1 passed`.

- [ ] **Step 1.5 — commit**
```
git add apps/desktop/src/app/routes.ts apps/desktop/src/app/routes.memory.test.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx
git commit -m "feat(desktop): add MEMORY_ROUTE constant and rewire nav/shell to it

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `memory-store.ts`: types + atoms + load-config + load-status

**Files:**
- Create: `apps/desktop/src/aether/domain/memory/memory-store.ts`
- Test: `apps/desktop/src/aether/domain/memory/memory-store.test.ts` (Create)

**Interfaces:**
- Consumes: `getMemoryProviderConfig`, `getMemoryProviderOAuthStatus`, `startMemoryProviderOAuth`, `saveMemoryProviderConfig` from `@/aether-api`; raw `window.aetherDesktop.api` for `/api/memory`, `/api/memory/provider`, `/api/memory/reset`.
- Produces (this task): atoms `$memoryProvider`, `$memoryConfig`, `$memoryStatus`, `$memoryConfigStatus`, `$memoryEntries`, `$memoryEntriesStatus`; types `MemoryStatus`, `MemoryProviderInfo`, `MemoryStoreDeps`; actions `loadMemoryStatus(deps?)`, `loadMemoryConfig(provider, deps?)`.

> `MemoryStatus` / `MemoryProviderInfo` are NOT exported from `aether-api.ts` (they're a web-only type). Define them locally in the store, matching the REST shape verbatim.

- [ ] **Step 2.1 — failing test (full code)**

Create `apps/desktop/src/aether/domain/memory/memory-store.test.ts`:
```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MemoryProviderConfig } from '@/aether-api'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  $memoryStatus,
  loadMemoryConfig,
  loadMemoryStatus,
  type MemoryStatus
} from './memory-store'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [
    { name: 'mem0', description: 'Mem0 hosted memory', configured: true },
    { name: 'zep', description: 'Zep memory', configured: false }
  ],
  builtin_files: { memory: 3, user: 1 }
}

const CONFIG: MemoryProviderConfig = {
  name: 'mem0',
  label: 'Mem0',
  fields: [
    {
      key: 'MEM0_API_KEY',
      label: 'API Key',
      description: 'Mem0 key',
      kind: 'secret',
      is_set: false,
      placeholder: 'mem0-...',
      options: [],
      value: ''
    }
  ]
}

beforeEach(() => {
  $memoryProvider.set(null)
  $memoryConfig.set(null)
  $memoryStatus.set('idle')
  $memoryConfigStatus.set('idle')
  $memoryEntries.set(null)
  $memoryEntriesStatus.set('idle')
})

describe('loadMemoryStatus', () => {
  it('fetches /api/memory and fills entries + active provider', async () => {
    const api = vi.fn().mockResolvedValue(STATUS)
    await loadMemoryStatus({ api })
    expect(api).toHaveBeenCalledWith({ path: '/api/memory' })
    expect($memoryEntries.get()).toEqual(STATUS)
    expect($memoryProvider.get()).toBe('mem0')
    expect($memoryEntriesStatus.get()).toBe('ready')
  })

  it('sets empty when no providers and no builtin files', async () => {
    const api = vi.fn().mockResolvedValue({ active: '', providers: [], builtin_files: { memory: 0, user: 0 } })
    await loadMemoryStatus({ api })
    expect($memoryEntriesStatus.get()).toBe('empty')
  })

  it('sets error on failure', async () => {
    const api = vi.fn().mockRejectedValue(new Error('boom'))
    await loadMemoryStatus({ api })
    expect($memoryEntriesStatus.get()).toBe('error')
  })
})

describe('loadMemoryConfig', () => {
  it('fetches provider config and stores it', async () => {
    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    await loadMemoryConfig('mem0', { getConfig })
    expect(getConfig).toHaveBeenCalledWith('mem0')
    expect($memoryConfig.get()).toEqual(CONFIG)
    expect($memoryConfigStatus.get()).toBe('ready')
  })

  it('sets error on failure', async () => {
    const getConfig = vi.fn().mockRejectedValue(new Error('nope'))
    await loadMemoryConfig('mem0', { getConfig })
    expect($memoryConfigStatus.get()).toBe('error')
  })
})
```

- [ ] **Step 2.2 — run, expect FAIL**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts
```
Expected: failure — `Failed to resolve import "./memory-store"` (file does not exist).

- [ ] **Step 2.3 — minimal impl (full code)**

Create `apps/desktop/src/aether/domain/memory/memory-store.ts`:
```ts
import { atom } from 'nanostores'

import {
  getMemoryProviderConfig,
  getMemoryProviderOAuthStatus,
  saveMemoryProviderConfig,
  startMemoryProviderOAuth
} from '@/aether-api'
import type { MemoryProviderConfig, MemoryProviderOAuthStatus } from '@/aether-api'

// `/api/memory` GET — read-only status/entries display. Not exported from
// aether-api.ts (web-only type), so mirror the REST shape here verbatim.
export interface MemoryProviderInfo {
  name: string
  description: string
  configured: boolean
}

export interface MemoryStatus {
  active: string
  providers: MemoryProviderInfo[]
  builtin_files: { memory: number; user: number }
}

type StoreStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

// Raw api fn signature (mirrors window.aetherDesktop.api + briefing read-briefing).
type ApiFn = <T>(request: {
  path: string
  method?: string
  body?: unknown
  timeoutMs?: number
  profile?: string
}) => Promise<T>

export interface MemoryStoreDeps {
  api?: ApiFn
  getConfig?: (provider: string) => Promise<MemoryProviderConfig>
  saveConfig?: (provider: string, values: Record<string, string>) => Promise<{ ok: boolean }>
  oauthStart?: (provider: string) => Promise<MemoryProviderOAuthStatus>
  oauthStatus?: (provider: string) => Promise<MemoryProviderOAuthStatus>
}

function resolveApi(deps: MemoryStoreDeps): ApiFn {
  return deps.api ?? (<T>(request: Parameters<ApiFn>[0]) => window.aetherDesktop.api<T>(request))
}

// data atoms
export const $memoryProvider = atom<string | null>(null)
export const $memoryConfig = atom<MemoryProviderConfig | null>(null)
export const $memoryEntries = atom<MemoryStatus | null>(null)
export const $memoryOAuth = atom<MemoryProviderOAuthStatus | null>(null)

// status atoms
export const $memoryStatus = atom<StoreStatus>('idle')
export const $memoryConfigStatus = atom<StoreStatus>('idle')
export const $memoryEntriesStatus = atom<StoreStatus>('idle')

// Read-only status/entries. REST GET only — no conversation poll, no deltas.
export async function loadMemoryStatus(deps: MemoryStoreDeps = {}): Promise<void> {
  const api = resolveApi(deps)
  $memoryEntriesStatus.set('loading')

  try {
    const status = await api<MemoryStatus>({ path: '/api/memory' })
    $memoryEntries.set(status)
    $memoryProvider.set(status.active || null)

    const isEmpty =
      status.providers.length === 0 &&
      status.builtin_files.memory === 0 &&
      status.builtin_files.user === 0

    $memoryEntriesStatus.set(isEmpty ? 'empty' : 'ready')
  } catch {
    $memoryEntriesStatus.set('error')
  }
}

export async function loadMemoryConfig(provider: string, deps: MemoryStoreDeps = {}): Promise<void> {
  const getConfig = deps.getConfig ?? getMemoryProviderConfig
  $memoryConfigStatus.set('loading')

  try {
    const config = await getConfig(provider)
    $memoryConfig.set(config)
    $memoryConfigStatus.set('ready')
  } catch {
    $memoryConfigStatus.set('error')
  }
}

// Re-exported so later tasks (save/switch/reset/oauth) wire to the same module.
export { getMemoryProviderOAuthStatus, saveMemoryProviderConfig, startMemoryProviderOAuth }
```

> Note: `$memoryStatus` is reserved here for the screen-level composite status (used by the render task); `$memoryEntriesStatus` / `$memoryConfigStatus` drive the two independent fetches. The unused re-exports of the oauth/save helpers will be consumed by Tasks 4–5 — keep them so imports stay one-stop.

- [ ] **Step 2.4 — run, expect PASS**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts
```
Expected: `5 passed`.

- [ ] **Step 2.5 — commit**
```
git add apps/desktop/src/aether/domain/memory/memory-store.ts apps/desktop/src/aether/domain/memory/memory-store.test.ts
git commit -m "feat(desktop): memory-store atoms + load status/config actions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `memory-screen.tsx`: provider selector + config fields + skeleton/empty/error

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/memory-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/memory-screen.test.tsx` (Create)

**Interfaces:**
- Consumes: all atoms + `loadMemoryStatus`, `loadMemoryConfig` from `@/aether/domain/memory/memory-store`; `GlassSlab` from `@/aether/ui/components/glass-slab`.
- Produces: `export function MemoryScreen()`.

**Render conventions:** root `.ae-screen-bare flex h-full min-w-0 flex-col`; mount-load `$memoryEntriesStatus==='idle'` → `loadMemoryStatus()`; loading→skeleton; empty→Vietnamese empty-state; error→inline + "Thử lại"; provider selector (`<select>`, options from `$memoryEntries.providers` + a `(mặc định)` built-in option using sentinel `''`); config fields rendered by `kind` (`secret`→password input, `text`→text input, `select`→`<select>`); reset button + provider OAuth panel are wired in later tasks (placeholders rendered with `data-testid` so Task 4/5 attach behavior). Cards use `<GlassSlab size>`.

- [ ] **Step 3.1 — failing test (full code)**

Create `apps/desktop/src/aether/ui/screens/memory-screen.test.tsx`:
```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { MemoryProviderConfig } from '@/aether-api'
import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  type MemoryStatus
} from '@/aether/domain/memory/memory-store'

import { MemoryScreen } from './memory-screen'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [
    { name: 'mem0', description: 'Mem0 hosted memory', configured: true },
    { name: 'zep', description: 'Zep memory', configured: false }
  ],
  builtin_files: { memory: 3, user: 1 }
}

const CONFIG: MemoryProviderConfig = {
  name: 'mem0',
  label: 'Mem0',
  fields: [
    {
      key: 'MEM0_API_KEY',
      label: 'API Key',
      description: 'Mem0 key',
      kind: 'secret',
      is_set: false,
      placeholder: 'mem0-...',
      options: [],
      value: ''
    }
  ]
}

afterEach(cleanup)

describe('MemoryScreen — ready', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })

  it('renders the provider selector with every provider option', () => {
    render(<MemoryScreen />)
    const selector = screen.getByTestId('ae-memory-provider-select') as HTMLSelectElement
    expect(selector).toBeTruthy()
    const values = Array.from(selector.options).map(o => o.value)
    expect(values).toContain('mem0')
    expect(values).toContain('zep')
  })

  it('renders config fields by kind', () => {
    render(<MemoryScreen />)
    const field = screen.getByTestId('ae-memory-field-MEM0_API_KEY') as HTMLInputElement
    expect(field.type).toBe('password')
  })

  it('shows the read-only built-in file counts', () => {
    render(<MemoryScreen />)
    expect(screen.getByTestId('ae-memory-builtin')).toBeTruthy()
  })
})

describe('MemoryScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $memoryEntriesStatus.set('loading')
    render(<MemoryScreen />)
    expect(screen.getByTestId('ae-memory-skeleton')).toBeTruthy()
  })

  it('renders a Vietnamese empty state', () => {
    $memoryEntriesStatus.set('empty')
    render(<MemoryScreen />)
    expect(screen.getByText(/Chưa có/i)).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $memoryEntriesStatus.set('error')
    render(<MemoryScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})
```

- [ ] **Step 3.2 — run, expect FAIL**
```
npm run test:ui -- src/aether/ui/screens/memory-screen.test.tsx
```
Expected: failure — `Failed to resolve import "./memory-screen"`.

- [ ] **Step 3.3 — minimal impl (full code)**

Create `apps/desktop/src/aether/ui/screens/memory-screen.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import type { MemoryProviderField } from '@/aether-api'
import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  loadMemoryConfig,
  loadMemoryStatus
} from '@/aether/domain/memory/memory-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

// Sentinel select value for the built-in/default provider (avoid '' label maps).
const BUILTIN = '__aether_memory_builtin__'

function FieldInput({ field }: { field: MemoryProviderField }) {
  const common = {
    'data-testid': `ae-memory-field-${field.key}`,
    className:
      'w-full rounded-[10px] border border-[rgba(120,200,255,.18)] bg-[rgba(8,28,58,.45)] p-[8px_11px] text-[12.5px] text-white outline-none',
    placeholder: field.placeholder,
    defaultValue: field.value
  }

  if (field.kind === 'select') {
    return (
      <select {...common}>
        {field.options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return <input {...common} type={field.kind === 'secret' ? 'password' : 'text'} />
}

export function MemoryScreen() {
  const entries = useStore($memoryEntries)
  const entriesStatus = useStore($memoryEntriesStatus)
  const provider = useStore($memoryProvider)
  const config = useStore($memoryConfig)
  const configStatus = useStore($memoryConfigStatus)

  useEffect(() => {
    if ($memoryEntriesStatus.get() === 'idle') {
      void loadMemoryStatus()
    }
  }, [])

  // When the active provider resolves and we have no config yet, fetch it.
  useEffect(() => {
    if (provider && $memoryConfigStatus.get() === 'idle') {
      void loadMemoryConfig(provider)
    }
  }, [provider])

  if (entriesStatus === 'loading' || entriesStatus === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-memory-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (entriesStatus === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Memory.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void loadMemoryStatus()}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (entriesStatus === 'empty') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có provider bộ nhớ nào được cấu hình.</div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          PROVIDER BỘ NHỚ
        </div>
        <select
          className="w-full max-w-sm rounded-[10px] border border-[rgba(120,200,255,.18)] bg-[rgba(8,28,58,.45)] p-[8px_11px] text-[12.5px] text-white outline-none"
          data-testid="ae-memory-provider-select"
          value={provider ?? BUILTIN}
          // onChange wired in Task 4 (switch-provider).
          onChange={() => { /* Task 4 */ }}
        >
          <option value={BUILTIN}>(mặc định)</option>
          {(entries?.providers ?? []).map(p => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.configured ? '' : ' — chưa cấu hình'}
            </option>
          ))}
        </select>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          CẤU HÌNH {config?.label ? `· ${config.label}` : ''}
        </div>
        {configStatus === 'loading' && <div className="ae-skeleton h-5 w-32" />}
        {configStatus === 'ready' &&
          (config?.fields ?? []).map(field => (
            <label className="flex flex-col gap-1" key={field.key}>
              <span className="text-[11.5px] text-[#CFE2F7]">{field.label}</span>
              <FieldInput field={field} />
              {field.description && (
                <span className="text-[10.5px] text-[color:var(--ae-dim)]">{field.description}</span>
              )}
            </label>
          ))}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          BỘ NHỚ HIỆN TẠI
        </div>
        <div className="text-[12px] text-[#D7ECFA]" data-testid="ae-memory-builtin">
          Provider đang dùng: <b>{entries?.active || '(mặc định)'}</b> · {entries?.builtin_files.memory ?? 0} tệp
          memory · {entries?.builtin_files.user ?? 0} tệp user
        </div>
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 3.4 — run, expect PASS**
```
npm run test:ui -- src/aether/ui/screens/memory-screen.test.tsx
```
Expected: `6 passed`.

- [ ] **Step 3.5 — commit**
```
git add apps/desktop/src/aether/ui/screens/memory-screen.tsx apps/desktop/src/aether/ui/screens/memory-screen.test.tsx
git commit -m "feat(desktop): MemoryScreen provider selector + config fields + states

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — save-config + switch-provider + reset actions (store) and wire to screen

**Files:**
- Modify: `apps/desktop/src/aether/domain/memory/memory-store.ts`
- Modify: `apps/desktop/src/aether/domain/memory/memory-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/memory-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/memory-screen.test.tsx`

**Interfaces:**
- Produces: `saveMemoryConfig(provider, values, deps?)` (PUT config then re-fetch config); `switchMemoryProvider(provider, deps?)` (PUT `/api/memory/provider` `{ provider }` then re-fetch status + config); `resetMemory(target, deps?)` (POST `/api/memory/reset` `{ target }` then re-fetch status).
- Consumes: `saveMemoryProviderConfig` from aether-api; raw `api` for switch + reset.

- [ ] **Step 4.1 — failing test (full code)** — append to `memory-store.test.ts`:
```ts
describe('mutations', () => {
  it('saveMemoryConfig PUTs values then re-fetches config', async () => {
    const saveConfig = vi.fn().mockResolvedValue({ ok: true })
    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    const { saveMemoryConfig } = await import('./memory-store')
    await saveMemoryConfig('mem0', { MEM0_API_KEY: 'mem0-abc' }, { saveConfig, getConfig })
    expect(saveConfig).toHaveBeenCalledWith('mem0', { MEM0_API_KEY: 'mem0-abc' })
    expect(getConfig).toHaveBeenCalledWith('mem0')
  })

  it('switchMemoryProvider PUTs /api/memory/provider then re-fetches status + config', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ ok: true, active: 'zep' }) // PUT provider
      .mockResolvedValueOnce(STATUS) // GET /api/memory
    const getConfig = vi.fn().mockResolvedValue(CONFIG)
    const { switchMemoryProvider } = await import('./memory-store')
    await switchMemoryProvider('zep', { api, getConfig })
    expect(api).toHaveBeenNthCalledWith(1, {
      path: '/api/memory/provider',
      method: 'PUT',
      body: { provider: 'zep' }
    })
    expect(api).toHaveBeenNthCalledWith(2, { path: '/api/memory' })
    expect(getConfig).toHaveBeenCalledWith('zep')
  })

  it('resetMemory POSTs /api/memory/reset then re-fetches status', async () => {
    const api = vi.fn()
      .mockResolvedValueOnce({ ok: true, deleted: ['memory'] }) // POST reset
      .mockResolvedValueOnce(STATUS) // GET /api/memory
    const { resetMemory } = await import('./memory-store')
    await resetMemory('memory', { api })
    expect(api).toHaveBeenNthCalledWith(1, {
      path: '/api/memory/reset',
      method: 'POST',
      body: { target: 'memory' }
    })
    expect(api).toHaveBeenNthCalledWith(2, { path: '/api/memory' })
  })
})
```

- [ ] **Step 4.2 — run, expect FAIL**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts
```
Expected: failure — `saveMemoryConfig is not a function` / `switchMemoryProvider`/`resetMemory` undefined.

- [ ] **Step 4.3 — minimal impl (full code)** — append to `memory-store.ts` (before the trailing re-export line):
```ts
export type MemoryResetTarget = 'all' | 'memory' | 'user'

export async function saveMemoryConfig(
  provider: string,
  values: Record<string, string>,
  deps: MemoryStoreDeps = {}
): Promise<void> {
  const saveConfig = deps.saveConfig ?? saveMemoryProviderConfig
  $memoryConfigStatus.set('loading')
  await saveConfig(provider, values)
  await loadMemoryConfig(provider, deps)
}

export async function switchMemoryProvider(provider: string, deps: MemoryStoreDeps = {}): Promise<void> {
  const api = resolveApi(deps)
  await api<{ ok: boolean; active: string }>({
    path: '/api/memory/provider',
    method: 'PUT',
    body: { provider }
  })
  await loadMemoryStatus(deps)
  await loadMemoryConfig(provider, deps)
}

export async function resetMemory(target: MemoryResetTarget, deps: MemoryStoreDeps = {}): Promise<void> {
  const api = resolveApi(deps)
  await api<{ ok: boolean; deleted: string[] }>({
    path: '/api/memory/reset',
    method: 'POST',
    body: { target }
  })
  await loadMemoryStatus(deps)
}
```

> `loadMemoryConfig(provider, deps)` re-uses the same `deps.getConfig` the mutation was given, so the test's `getConfig` spy is observed.

- [ ] **Step 4.4 — wire the screen + interaction test.**

In `memory-screen.tsx`: import `saveMemoryConfig`, `switchMemoryProvider`, `resetMemory` and `MemoryResetTarget`. Replace the provider `<select onChange>` stub with a real handler, and add a Save button + a reset control (with a confirm guard) to the config slab.

Replace the selector `onChange`:
```tsx
          onChange={e => {
            const v = e.target.value === BUILTIN ? '' : e.target.value
            $memoryConfigStatus.set('idle')
            void switchMemoryProvider(v)
          }}
```
Add to the CẤU HÌNH slab, after the fields map:
```tsx
        {configStatus === 'ready' && (
          <button
            className="mt-1 w-fit rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            data-testid="ae-memory-save"
            onClick={() => {
              if (!provider) { return }
              const values: Record<string, string> = {}
              for (const field of config?.fields ?? []) {
                const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
                  `[data-testid="ae-memory-field-${field.key}"]`
                )
                if (el) { values[field.key] = el.value }
              }
              void saveMemoryConfig(provider, values)
            }}
            type="button"
          >
            Lưu cấu hình
          </button>
        )}
```
Add a reset control to the BỘ NHỚ HIỆN TẠI slab (after the builtin line):
```tsx
        <button
          className="w-fit rounded-[11px] border border-[rgba(255,176,32,.4)] p-[8px_16px] text-[12.5px] text-[color:var(--ae-warn)]"
          data-testid="ae-memory-reset"
          onClick={() => {
            if (window.confirm('Xoá toàn bộ bộ nhớ? Hành động này không thể hoàn tác.')) {
              void resetMemory('all')
            }
          }}
          type="button"
        >
          Đặt lại bộ nhớ
        </button>
```
Import update at top:
```tsx
import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  loadMemoryConfig,
  loadMemoryStatus,
  resetMemory,
  saveMemoryConfig,
  switchMemoryProvider
} from '@/aether/domain/memory/memory-store'
```

Append interaction tests to `memory-screen.test.tsx`. Spy on the store module functions:
```tsx
import { fireEvent } from '@testing-library/react'
import { vi } from 'vitest'

import * as store from '@/aether/domain/memory/memory-store'

describe('MemoryScreen — interactions', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })

  it('switches provider on select change', () => {
    const spy = vi.spyOn(store, 'switchMemoryProvider').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.change(screen.getByTestId('ae-memory-provider-select'), { target: { value: 'zep' } })
    expect(spy).toHaveBeenCalledWith('zep')
    spy.mockRestore()
  })

  it('saves config field values on Save', () => {
    const spy = vi.spyOn(store, 'saveMemoryConfig').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.change(screen.getByTestId('ae-memory-field-MEM0_API_KEY'), { target: { value: 'mem0-xyz' } })
    fireEvent.click(screen.getByTestId('ae-memory-save'))
    expect(spy).toHaveBeenCalledWith('mem0', { MEM0_API_KEY: 'mem0-xyz' })
    spy.mockRestore()
  })

  it('resets only after confirm', () => {
    const spy = vi.spyOn(store, 'resetMemory').mockResolvedValue()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryScreen />)
    fireEvent.click(screen.getByTestId('ae-memory-reset'))
    expect(spy).toHaveBeenCalledWith('all')
    confirmSpy.mockRestore()
    spy.mockRestore()
  })
})
```

> The save handler reads field values from the DOM (uncontrolled `defaultValue` inputs) so the screen stays simple; the spy assertion confirms the exact `{ key: value }` payload.

- [ ] **Step 4.5 — run, expect PASS**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts src/aether/ui/screens/memory-screen.test.tsx
```
Expected: all store + screen tests pass (8 store + 9 screen).

- [ ] **Step 4.6 — commit**
```
git add apps/desktop/src/aether/domain/memory/memory-store.ts apps/desktop/src/aether/domain/memory/memory-store.test.ts apps/desktop/src/aether/ui/screens/memory-screen.tsx apps/desktop/src/aether/ui/screens/memory-screen.test.tsx
git commit -m "feat(desktop): memory save/switch/reset actions wired to screen

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — provider OAuth state machine (store) + OAuth panel (screen)

**Files:**
- Modify: `apps/desktop/src/aether/domain/memory/memory-store.ts`
- Modify: `apps/desktop/src/aether/domain/memory/memory-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/memory-screen.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/memory-screen.test.tsx`

**Interfaces:**
- Produces: `loadMemoryOAuthStatus(provider, deps?)` (GET status → `$memoryOAuth`); `startMemoryOAuth(provider, deps?)` (POST start → `$memoryOAuth`; if `state==='pending'`, re-fetch status once to advance the state machine).
- Consumes: `getMemoryProviderOAuthStatus`, `startMemoryProviderOAuth` from aether-api (already re-exported by the store).

> OAuth is conditional: the panel only renders when `$memoryOAuth.auth === 'oauth'` (provider declares an OAuth flow). API-key providers return `auth: 'apikey'` and use the config fields instead. State machine: `idle → (start) pending → (status poll) connected | error`.

- [ ] **Step 5.1 — failing test (full code)** — append to `memory-store.test.ts`:
```ts
import type { MemoryProviderOAuthStatus } from '@/aether-api'
import { $memoryOAuth } from './memory-store'

const OAUTH_PENDING: MemoryProviderOAuthStatus = { auth: 'oauth', connected: false, detail: 'Đang chờ', state: 'pending' }
const OAUTH_DONE: MemoryProviderOAuthStatus = { auth: 'oauth', connected: true, detail: 'Đã kết nối', state: 'connected' }

describe('memory oauth', () => {
  beforeEach(() => $memoryOAuth.set(null))

  it('loadMemoryOAuthStatus stores the provider oauth status', async () => {
    const oauthStatus = vi.fn().mockResolvedValue(OAUTH_DONE)
    const { loadMemoryOAuthStatus } = await import('./memory-store')
    await loadMemoryOAuthStatus('mem0', { oauthStatus })
    expect(oauthStatus).toHaveBeenCalledWith('mem0')
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })

  it('startMemoryOAuth advances pending → connected via a status re-fetch', async () => {
    const oauthStart = vi.fn().mockResolvedValue(OAUTH_PENDING)
    const oauthStatus = vi.fn().mockResolvedValue(OAUTH_DONE)
    const { startMemoryOAuth } = await import('./memory-store')
    await startMemoryOAuth('mem0', { oauthStart, oauthStatus })
    expect(oauthStart).toHaveBeenCalledWith('mem0')
    expect(oauthStatus).toHaveBeenCalledWith('mem0')
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })

  it('startMemoryOAuth that returns connected does not re-poll', async () => {
    const oauthStart = vi.fn().mockResolvedValue(OAUTH_DONE)
    const oauthStatus = vi.fn()
    const { startMemoryOAuth } = await import('./memory-store')
    await startMemoryOAuth('mem0', { oauthStart, oauthStatus })
    expect(oauthStatus).not.toHaveBeenCalled()
    expect($memoryOAuth.get()).toEqual(OAUTH_DONE)
  })
})
```

- [ ] **Step 5.2 — run, expect FAIL**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts
```
Expected: failure — `loadMemoryOAuthStatus`/`startMemoryOAuth` is not a function.

- [ ] **Step 5.3 — minimal impl (full code)** — append to `memory-store.ts` (before the trailing re-export line):
```ts
export async function loadMemoryOAuthStatus(provider: string, deps: MemoryStoreDeps = {}): Promise<void> {
  const oauthStatus = deps.oauthStatus ?? getMemoryProviderOAuthStatus
  const status = await oauthStatus(provider)
  $memoryOAuth.set(status)
}

export async function startMemoryOAuth(provider: string, deps: MemoryStoreDeps = {}): Promise<void> {
  const oauthStart = deps.oauthStart ?? startMemoryProviderOAuth
  const started = await oauthStart(provider)
  $memoryOAuth.set(started)

  // Advance the state machine: a pending start needs a status re-fetch to learn
  // whether the external flow completed. A start that already resolved
  // connected/error is terminal — no extra poll.
  if (started.state === 'pending') {
    await loadMemoryOAuthStatus(provider, deps)
  }
}
```

- [ ] **Step 5.4 — OAuth panel + render test.**

In `memory-screen.tsx`: subscribe to `$memoryOAuth`, import `loadMemoryOAuthStatus`, `startMemoryOAuth`. After `provider` resolves, kick `loadMemoryOAuthStatus(provider)`. Render an OAuth panel only when `oauth?.auth === 'oauth'`.

Add to imports:
```tsx
  $memoryOAuth,
  loadMemoryOAuthStatus,
  startMemoryOAuth,
```
Add subscription + effect inside the component:
```tsx
  const oauth = useStore($memoryOAuth)
  useEffect(() => {
    if (provider) { void loadMemoryOAuthStatus(provider) }
  }, [provider])
```
Render the panel between the CẤU HÌNH slab and the BỘ NHỚ HIỆN TẠI slab (only when present and oauth-typed):
```tsx
      {oauth?.auth === 'oauth' && (
        <GlassSlab className="flex flex-col gap-2" size="md" data-testid="ae-memory-oauth">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            KẾT NỐI OAUTH
          </div>
          <div className="text-[12px] text-[#D7ECFA]">{oauth.detail}</div>
          {!oauth.connected && (
            <button
              className="w-fit rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
              data-testid="ae-memory-oauth-start"
              disabled={oauth.state === 'pending'}
              onClick={() => { if (provider) { void startMemoryOAuth(provider) } }}
              type="button"
            >
              {oauth.state === 'pending' ? 'Đang kết nối…' : 'Kết nối'}
            </button>
          )}
        </GlassSlab>
      )}
```
> `GlassSlab` already spreads `className`; it does not forward `data-testid`. To keep the test selector working, wrap the assertion target on an inner element instead, OR query by the heading text. Use the heading-text query in the test to avoid changing `GlassSlab`'s API:

Append OAuth render tests to `memory-screen.test.tsx`:
```tsx
describe('MemoryScreen — oauth panel', () => {
  beforeEach(() => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(CONFIG)
    $memoryConfigStatus.set('ready')
  })
  afterEach(() => $memoryOAuth.set(null))

  it('renders the OAuth panel only for oauth-typed providers', () => {
    $memoryOAuth.set({ auth: 'oauth', connected: false, detail: 'Chưa kết nối', state: 'idle' })
    render(<MemoryScreen />)
    expect(screen.getByText(/KẾT NỐI OAUTH/i)).toBeTruthy()
    expect(screen.getByTestId('ae-memory-oauth-start')).toBeTruthy()
  })

  it('hides the OAuth panel for apikey providers', () => {
    $memoryOAuth.set({ auth: 'apikey', connected: false, detail: '', state: 'idle' })
    render(<MemoryScreen />)
    expect(screen.queryByText(/KẾT NỐI OAUTH/i)).toBeNull()
  })

  it('starts OAuth on click', () => {
    $memoryOAuth.set({ auth: 'oauth', connected: false, detail: 'Chưa kết nối', state: 'idle' })
    const spy = vi.spyOn(store, 'startMemoryOAuth').mockResolvedValue()
    render(<MemoryScreen />)
    fireEvent.click(screen.getByTestId('ae-memory-oauth-start'))
    expect(spy).toHaveBeenCalledWith('mem0')
    spy.mockRestore()
  })
})
```
Add the import for `$memoryOAuth` at the top of the test file (extend the existing store import).
> Remove the `data-testid="ae-memory-oauth"` from the `<GlassSlab>` in the impl (GlassSlab does not forward it) — keep only the inner `ae-memory-oauth-start` testid and the heading-text query.

- [ ] **Step 5.5 — run, expect PASS**
```
npm run test:ui -- src/aether/domain/memory/memory-store.test.ts src/aether/ui/screens/memory-screen.test.tsx
```
Expected: all pass (11 store + 12 screen).

- [ ] **Step 5.6 — commit**
```
git add apps/desktop/src/aether/domain/memory/memory-store.ts apps/desktop/src/aether/domain/memory/memory-store.test.ts apps/desktop/src/aether/ui/screens/memory-screen.tsx apps/desktop/src/aether/ui/screens/memory-screen.test.tsx
git commit -m "feat(desktop): memory provider OAuth state machine + panel

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Prompt-cache guard test (HARD) for the read-only entries display

**Files:**
- Test: `apps/desktop/src/aether/ui/screens/memory-screen.guard.test.tsx` (Create)

**Interfaces:** none new — this is a guardrail test asserting the screen never touches conversation streaming.

**Justification (one line):** The Memory screen is a non-chat REST screen; this test fails loudly if anyone later wires conversation deltas / `appendAssistantDelta` into it, protecting the prompt-cache invariant.

- [ ] **Step 6.1 — failing test (full code)**

Create `apps/desktop/src/aether/ui/screens/memory-screen.guard.test.tsx`:
```tsx
import { cleanup, render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryProvider,
  type MemoryStatus
} from '@/aether/domain/memory/memory-store'

import { MemoryScreen } from './memory-screen'

const STATUS: MemoryStatus = {
  active: 'mem0',
  providers: [{ name: 'mem0', description: 'Mem0', configured: true }],
  builtin_files: { memory: 1, user: 0 }
}

afterEach(cleanup)

describe('MemoryScreen prompt-cache guard', () => {
  it('source forbids conversation-stream coupling', () => {
    const screenSrc = readFileSync(
      fileURLToPath(new URL('./memory-screen.tsx', import.meta.url)),
      'utf8'
    )
    const storeSrc = readFileSync(
      fileURLToPath(new URL('../../domain/memory/memory-store.ts', import.meta.url)),
      'utf8'
    )
    const combined = `${screenSrc}\n${storeSrc}`
    for (const forbidden of [
      'appendAssistantDelta',
      'message.delta',
      'reasoning.delta',
      'thinking.',
      'subscribeToSession',
      'onSessionEvent'
    ]) {
      expect(combined.includes(forbidden), `forbidden token in memory screen/store: ${forbidden}`).toBe(false)
    }
  })

  it('renders the entries display without subscribing to any conversation', () => {
    $memoryEntries.set(STATUS)
    $memoryEntriesStatus.set('ready')
    $memoryProvider.set('mem0')
    $memoryConfig.set(null)
    $memoryConfigStatus.set('idle')
    // No throw, no stream wiring — pure REST-fed render.
    expect(() => render(<MemoryScreen />)).not.toThrow()
  })
})
```

- [ ] **Step 6.2 — run, expect FAIL → PASS**

First run to confirm the file is picked up:
```
npm run test:ui -- src/aether/ui/screens/memory-screen.guard.test.tsx
```
If a forbidden token IS present in current sources, the test fails listing the token — remove that coupling. Given Tasks 2–5 use REST only, expected result on a clean implementation: `2 passed`.

> This guard intentionally has no separate impl step — the "implementation" is the absence of forbidden coupling produced by Tasks 2–5. If it fails, treat the offending token as a bug and remove it before committing.

- [ ] **Step 6.3 — commit**
```
git add apps/desktop/src/aether/ui/screens/memory-screen.guard.test.tsx
git commit -m "test(desktop): prompt-cache guard for Memory read-only entries

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Swap `<StubScreen title="Memory" />` → `<MemoryScreen />` in the shell

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`

**Interfaces:**
- Consumes: `MemoryScreen` from `@/aether/ui/screens/memory-screen`; `MEMORY_ROUTE` (already imported in Task 1).

- [ ] **Step 7.1 — impl (full code)**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx` add the import (alongside the other screen imports near line 15):
```ts
import { MemoryScreen } from '@/aether/ui/screens/memory-screen'
```
Replace the memory route line (added/updated in Task 1):
```ts
              <Route element={<MemoryScreen />} path={MEMORY_ROUTE.slice(1)} />
```

- [ ] **Step 7.2 — run the full UI suite, expect GREEN**
```
npm run test:ui
```
Expected: the whole vitest suite passes (existing tests untouched; the four new memory test files green). No new failures introduced.

- [ ] **Step 7.3 — typecheck (no new errors)**

If the desktop package exposes a typecheck script, run it; otherwise run the build's tsc step. Example:
```
npm run -s typecheck || npx tsc -p apps/desktop/tsconfig.json --noEmit
```
Expected: no TS errors referencing the new files.

- [ ] **Step 7.4 — commit**
```
git add apps/desktop/src/aether/ui/shell/aether-shell.tsx
git commit -m "feat(desktop): mount MemoryScreen at MEMORY_ROUTE (replace stub)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review vs spec §5.1 Memory bullets

- [ ] **Standalone extraction** — Memory is now its own screen (`memory-screen.tsx`) mounted at `MEMORY_ROUTE`, replacing `<StubScreen title="Memory" />`. Logic is referenced from the web `PluginsPage`/`web/src/lib/api.ts` but NO web UI is imported. ✅ (Task 1, 3, 7)
- [ ] **Provider selector + config fields + reset** — selector lists `/api/memory` GET providers + `(mặc định)`; config fields render by `MemoryProviderField.kind` (`secret`/`text`/`select`); Save → `saveMemoryProviderConfig` (PUT `/api/memory/providers/{p}/config`); switch → PUT `/api/memory/provider`; reset → POST `/api/memory/reset` behind a confirm. ✅ (Task 3, 4)
- [ ] **Provider OAuth** — conditional panel (only `auth==='oauth'`); start → `startMemoryProviderOAuth`; status → `getMemoryProviderOAuthStatus`; state machine `idle→pending→connected|error` with a single status re-fetch on pending. ✅ (Task 5)
- [ ] **Entries display read-only** — `/api/memory` GET drives the active provider + provider configured-state + built-in file counts; rendered read-only; prompt-cache guard test forbids any conversation-stream coupling. ✅ (Task 2, 3, 6)
- [ ] **Global constraints** — Vietnamese UI strings; "Agent" never translated; `--ae-*` tokens / `<GlassSlab>` only (no raw hex outside tokens, except the existing token-derived rgba accents matching sibling screens); no double-pad (root `.ae-screen-bare`, padding via `GlassSlab`). ✅
- [ ] **MEMORY_ROUTE** — single source of truth added to `app/routes.ts`; nav-items + shell consume it; command-palette plan should import the same constant. ✅ (Task 1)
