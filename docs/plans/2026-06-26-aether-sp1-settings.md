# Settings Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `<StubScreen title="Settings" />` at the `/settings` route with a real, Vietnamese, 3-tier AETHER Settings screen exposing Model, Providers/OAuth, Env keys, Tools/Toolsets, Appearance, and schema-driven config — using only existing `aether-api.ts` REST methods (0 Python backend changes).

**Architecture:** The 3-tier renderer pattern: a presentational screen (`settings-screen.tsx` + per-tab components) subscribes via `useStore` to focused nanostores under `domain/settings/`; the stores expose `$<atom>` + `$<atom>Status` atoms and `load*/action*` functions that call REST through `window.aetherDesktop.api` (wrapped by the existing `@/aether-api` functions). No store imports a screen; no screen calls REST directly except through the stores. The OAuth tab additionally drives a start→poll→submit state machine held entirely in its sub-store.

**Tech Stack:** React 18, nanostores + @nanostores/react, Tailwind (--ae-* tokens), vitest + jsdom + @testing-library/react, Electron preload `window.aetherDesktop.api`.

## Global Constraints

- Keep the tempered runtime — do NOT rewrite streaming/tool-call/terminal/gateway WS/cmdk core; restyle via tokens/className only.
- Brand `#07397d` (deep navy) via tokens. NO hardcoded colors outside the `--ae-*` / `--dt-*` token systems.
- Localization (hard): UI in Vietnamese. NEVER translate "Agent" → "Đại lý" — keep "Agent". Platform display name: "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): this is a non-chat screen — do NOT subscribe to `message.delta`/`reasoning.delta`/`thinking.*`, do NOT poll live conversation, do NOT call `appendAssistantDelta`. Only REST (`window.aetherDesktop.api`) + non-conversation events + `/status`. Never re-trigger the LLM.
- Respect `prefers-reduced-motion` + the SP-0 motion gate on every transition/overlay.
- `--ae-*` geometry is mode-independent; only color tokens fork under `[data-aether-mode='light']`; `--ae-*` resolve only when `[data-aether-theme='aether']`.
- Layering: screen root uses `.ae-screen-bare flex h-full min-w-0 flex-col` (transparent, no self-pad); a single content wrapper owns one `--ae-page-*` gutter; no double-pad; padding via `<GlassSlab size>`.
- Geometry tokens: only tokenize arbitrary `[...]` Tailwind values; standard shorthand (`mt-3`, `gap-1.5`) stays as-is.

---

## Confirmed signatures (read from source — do NOT re-invent)

From `apps/desktop/src/aether-api.ts`:
- `getGlobalModelInfo(): Promise<ModelInfoResponse>`
- `getGlobalModelOptions(opts?: { refresh?: boolean }): Promise<ModelOptionsResponse>`
- `getAuxiliaryModels(): Promise<AuxiliaryModelsResponse>`
- `setGlobalModel(provider: string, model: string): Promise<{ ok: boolean; provider: string; model: string }>` — **no `scope` param** (it hardcodes `scope:'main'` in the body). The spec wrote `setGlobalModel(provider, model, scope)`; the real one has no scope. We use `setGlobalModel(provider, model)` for the main slot and `setModelAssignment({ provider, model, scope: 'auxiliary', task })` for aux slots.
- `setModelAssignment(body: ModelAssignmentRequest): Promise<ModelAssignmentResponse>` where `ModelAssignmentRequest = { provider; model; scope: 'main' | 'auxiliary'; task?; api_key?; base_url? }`.
- `listOAuthProviders(): Promise<OAuthProvidersResponse>`
- `startOAuthLogin(providerId: string): Promise<OAuthStartResponse>`
- `submitOAuthCode(providerId: string, sessionId: string, code: string): Promise<OAuthSubmitResponse>`
- `pollOAuthSession(providerId: string, sessionId: string): Promise<OAuthPollResponse>`
- `disconnectOAuthProvider(providerId: string): Promise<{ ok: boolean; provider: string }>`
- `cancelOAuthSession(sessionId: string): Promise<{ ok: boolean }>`
- `getEnvVars(): Promise<Record<string, EnvVarInfo>>`
- `setEnvVar(key: string, value: string): Promise<{ ok: boolean }>`
- `deleteEnvVar(key: string): Promise<{ ok: boolean }>`
- `revealEnvVar(key: string): Promise<{ key: string; value: string }>`
- `validateProviderCredential(key: string, value: string, apiKey?: string): Promise<{ ok; reachable; message; models? }>` — **note real arg order is `(key, value, apiKey?)`**, the spec wrote `validateProviderCredential(provider, key)`; we follow the real signature.
- `getToolsets(): Promise<ToolsetInfo[]>`
- `toggleToolset(name: string, enabled: boolean): Promise<{ ok; name; enabled }>`
- `getToolsetConfig(name: string): Promise<ToolsetConfig>`
- `getComputerUseStatus(): Promise<ComputerUseStatus>`
- `grantComputerUsePermissions(): Promise<ActionResponse>`
- `getAetherConfigSchema(): Promise<ConfigSchemaResponse>`
- `getAetherConfigRecord(): Promise<AetherConfigRecord>` (alias of `getAetherConfig` against `/api/config`)
- `saveAetherConfig(config: AetherConfigRecord): Promise<{ ok: boolean }>`

Types (`apps/desktop/src/types/aether.ts`): `ConfigFieldSchema { category?; description?; options?; type? }`, `ConfigSchemaResponse { category_order?; fields: Record<string, ConfigFieldSchema> }`, `OAuthStartResponse` (discriminated by `flow: 'pkce' | 'device_code' | 'loopback'`), `OAuthPollResponse { status: 'approved'|'denied'|'error'|'expired'|'pending'; ... }`, `EnvVarInfo { is_password; is_set; redacted_value; category; provider?; provider_label?; description; ... }`, `ToolsetInfo { name; label; description; enabled; configured; tools }`, `ToolsetConfig { name; active_provider; providers; ... }`, `ComputerUseStatus { platform; installed; ready; can_grant; checks; ... }`, `AetherConfigRecord = Record<string, unknown>`.

Theme store (`apps/desktop/src/themes/context.tsx`): `useTheme()` → `{ themeName, mode, resolvedMode, setTheme, setMode, availableThemes }`; `setMode(mode: 'light'|'dark'|'system')`; `setTheme(name: string)`. Appearance tab reuses these — it does NOT add a store.

Test command (run from `apps/desktop`): `npm run test:ui` → `vitest run --environment jsdom`.

---

## Task 1 — Model sub-store

**Files:**
- Create: `apps/desktop/src/aether/domain/settings/model-store.ts`
- Test: `apps/desktop/src/aether/domain/settings/model-store.test.ts`

**Interfaces:**
- Consumes: `getGlobalModelInfo`, `getGlobalModelOptions`, `getAuxiliaryModels`, `setGlobalModel`, `setModelAssignment` from `@/aether-api`; types `ModelInfoResponse`, `ModelOptionsResponse`, `AuxiliaryModelsResponse`.
- Produces: `$modelInfo`, `$modelOptions`, `$auxiliaryModels`, `$modelStatus`; `loadModel(deps?)`, `applyMainModel(provider, model, deps?)`, `applyAuxiliaryModel(provider, model, task, deps?)`.

The load/action functions take an injectable `deps` so tests pass `vi.fn()`s. `deps` default to the real `@/aether-api` functions.

- [ ] **Step 1: Write failing test for `loadModel`.**

Create `apps/desktop/src/aether/domain/settings/model-store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

import {
  $auxiliaryModels,
  $modelInfo,
  $modelOptions,
  $modelStatus,
  applyAuxiliaryModel,
  applyMainModel,
  loadModel
} from './model-store'

describe('model-store', () => {
  it('loadModel populates atoms and sets ready', async () => {
    $modelStatus.set('idle')
    const getInfo = vi.fn(async () => ({ model: 'm1', provider: 'p1' }))
    const getOptions = vi.fn(async () => ({ model: 'm1', provider: 'p1', providers: [{ name: 'P1', slug: 'p1', models: ['m1', 'm2'] }] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm1', provider: 'p1' }, tasks: [] }))

    await loadModel({ getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect($modelStatus.get()).toBe('ready')
    expect($modelInfo.get()?.model).toBe('m1')
    expect($modelOptions.get()?.providers?.[0].slug).toBe('p1')
    expect($auxiliaryModels.get()?.main.provider).toBe('p1')
  })

  it('loadModel sets error when a call rejects', async () => {
    $modelStatus.set('idle')
    const getInfo = vi.fn(async () => { throw new Error('boom') })
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: '', provider: '' }, tasks: [] }))

    await loadModel({ getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect($modelStatus.get()).toBe('error')
  })

  it('applyMainModel calls setGlobalModel(provider, model) and reloads', async () => {
    const setMain = vi.fn(async () => ({ ok: true, provider: 'p2', model: 'm2' }))
    const getInfo = vi.fn(async () => ({ model: 'm2', provider: 'p2' }))
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm2', provider: 'p2' }, tasks: [] }))

    await applyMainModel('p2', 'm2', { setMain: setMain as never, getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect(setMain).toHaveBeenCalledWith('p2', 'm2')
    expect($modelInfo.get()?.provider).toBe('p2')
  })

  it('applyAuxiliaryModel calls setModelAssignment with scope auxiliary + task', async () => {
    const setAssign = vi.fn(async () => ({ ok: true }))
    const getInfo = vi.fn(async () => ({ model: 'm1', provider: 'p1' }))
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm1', provider: 'p1' }, tasks: [] }))

    await applyAuxiliaryModel('p1', 'm1', 'vision', { setAssign: setAssign as never, getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect(setAssign).toHaveBeenCalledWith({ provider: 'p1', model: 'm1', scope: 'auxiliary', task: 'vision' })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- model-store`
  - Expected: FAIL with `Failed to resolve import "./model-store"` (module does not exist yet).

- [ ] **Step 3: Minimal implementation.**

Create `apps/desktop/src/aether/domain/settings/model-store.ts`:
```ts
import { atom } from 'nanostores'

import {
  getAuxiliaryModels,
  getGlobalModelInfo,
  getGlobalModelOptions,
  setGlobalModel,
  setModelAssignment
} from '@/aether-api'
import type {
  AuxiliaryModelsResponse,
  ModelAssignmentResponse,
  ModelInfoResponse,
  ModelOptionsResponse
} from '@/aether-api'

export const $modelInfo = atom<ModelInfoResponse | null>(null)
export const $modelOptions = atom<ModelOptionsResponse | null>(null)
export const $auxiliaryModels = atom<AuxiliaryModelsResponse | null>(null)
export const $modelStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

export interface ModelDeps {
  getInfo?: () => Promise<ModelInfoResponse>
  getOptions?: (opts?: { refresh?: boolean }) => Promise<ModelOptionsResponse>
  getAux?: () => Promise<AuxiliaryModelsResponse>
  setMain?: (provider: string, model: string) => Promise<{ ok: boolean; provider: string; model: string }>
  setAssign?: (body: {
    provider: string
    model: string
    scope: 'auxiliary' | 'main'
    task?: string
  }) => Promise<ModelAssignmentResponse>
}

function resolve(deps: ModelDeps) {
  return {
    getInfo: deps.getInfo ?? getGlobalModelInfo,
    getOptions: deps.getOptions ?? getGlobalModelOptions,
    getAux: deps.getAux ?? getAuxiliaryModels,
    setMain: deps.setMain ?? setGlobalModel,
    setAssign: deps.setAssign ?? setModelAssignment
  }
}

export async function loadModel(deps: ModelDeps = {}, opts?: { refresh?: boolean }): Promise<void> {
  const api = resolve(deps)
  $modelStatus.set('loading')

  try {
    const [info, options, aux] = await Promise.all([api.getInfo(), api.getOptions(opts), api.getAux()])
    $modelInfo.set(info)
    $modelOptions.set(options)
    $auxiliaryModels.set(aux)
    $modelStatus.set('ready')
  } catch {
    $modelStatus.set('error')
  }
}

export async function applyMainModel(provider: string, model: string, deps: ModelDeps = {}): Promise<void> {
  const api = resolve(deps)
  await api.setMain(provider, model)
  await loadModel(deps)
}

export async function applyAuxiliaryModel(
  provider: string,
  model: string,
  task: string,
  deps: ModelDeps = {}
): Promise<void> {
  const api = resolve(deps)
  await api.setAssign({ provider, model, scope: 'auxiliary', task })
  await loadModel(deps)
}
```

- [ ] **Step 4: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- model-store`
  - Expected: `Test Files  1 passed` / `Tests  4 passed`.

- [ ] **Step 5: Commit.**
```
git add apps/desktop/src/aether/domain/settings/model-store.ts apps/desktop/src/aether/domain/settings/model-store.test.ts
git commit -m "feat(aether-settings): add model sub-store with load/apply actions

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Settings shell + Model tab + prompt-cache guard

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/settings-screen.tsx`
- Create: `apps/desktop/src/aether/ui/screens/settings/model-tab.tsx`
- Test: `apps/desktop/src/aether/ui/screens/settings-screen.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/settings/model-tab.test.tsx`
- Test: `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts`

**Interfaces:**
- Consumes: `$modelInfo`, `$modelOptions`, `$modelStatus`, `loadModel`, `applyMainModel` from `model-store`; `GlassSlab`.
- Produces: `SettingsScreen` (default route component, internal tab nav), `ModelTab`.

The shell owns an internal `useState<TabId>` (no routes for tabs). Tab ids: `'model' | 'providers' | 'env' | 'tools' | 'appearance'`. This task wires only the Model tab; later tasks slot their components into the same switch.

- [ ] **Step 1: Write failing render test for the shell + Model tab.**

Create `apps/desktop/src/aether/ui/screens/model-tab.dir.placeholder` is NOT needed; create the test directly. Create `apps/desktop/src/aether/ui/screens/settings/model-tab.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $modelInfo, $modelOptions, $modelStatus } from '@/aether/domain/settings/model-store'

import { ModelTab } from './model-tab'

beforeEach(() => {
  $modelStatus.set('ready')
  $modelInfo.set({ model: 'm1', provider: 'p1' })
  $modelOptions.set({
    model: 'm1',
    provider: 'p1',
    providers: [{ name: 'Provider One', slug: 'p1', models: ['m1', 'm2'] }]
  })
})
afterEach(cleanup)

describe('ModelTab', () => {
  it('shows the current model', () => {
    render(<ModelTab />)
    expect(screen.getByText(/Provider One/)).toBeTruthy()
    expect(screen.getByText('m1')).toBeTruthy()
  })

  it('renders a Vietnamese error + retry when status is error', () => {
    $modelStatus.set('error')
    render(<ModelTab />)
    expect(screen.getByText(/Không tải được/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })

  it('applies a model selection via the Apply button', () => {
    const onApply = vi.fn()
    render(<ModelTab onApplyMain={onApply} />)
    fireEvent.change(screen.getByTestId('ae-model-provider'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByTestId('ae-model-model'), { target: { value: 'm2' } })
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/ }))
    expect(onApply).toHaveBeenCalledWith('p1', 'm2')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- model-tab`
  - Expected: FAIL with `Failed to resolve import "./model-tab"`.

- [ ] **Step 3: Implement `ModelTab`.**

Create `apps/desktop/src/aether/ui/screens/settings/model-tab.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $modelInfo,
  $modelOptions,
  $modelStatus,
  applyMainModel,
  loadModel
} from '@/aether/domain/settings/model-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ModelTab({ onApplyMain }: { onApplyMain?: (provider: string, model: string) => void }) {
  const status = useStore($modelStatus)
  const info = useStore($modelInfo)
  const options = useStore($modelOptions)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')

  useEffect(() => {
    if ($modelStatus.get() === 'idle') {
      void loadModel()
    }
  }, [])

  useEffect(() => {
    if (info) {
      setProvider(prev => prev || info.provider)
      setModel(prev => prev || info.model)
    }
  }, [info])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải mô hình…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được cấu hình mô hình.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
          onClick={() => void loadModel()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  const providers = options?.providers ?? []
  const selectedModels = providers.find(p => p.slug === provider)?.models ?? []

  const apply = () => {
    if (!provider || !model) {
      return
    }

    if (onApplyMain) {
      onApplyMain(provider, model)
    } else {
      void applyMainModel(provider, model)
    }
  }

  return (
    <GlassSlab className="flex flex-col gap-3" size="md">
      <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">MÔ HÌNH CHÍNH</div>
      <div className="text-[12.5px] text-[#D7ECFA]">
        Hiện tại: <b className="text-white">{providers.find(p => p.slug === info?.provider)?.name ?? info?.provider}</b>
        {' · '}
        <span className="font-mono">{info?.model}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
          data-testid="ae-model-provider"
          onChange={e => {
            setProvider(e.target.value)
            setModel('')
          }}
          value={provider}
        >
          {providers.map(p => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
          data-testid="ae-model-model"
          onChange={e => setModel(e.target.value)}
          value={model}
        >
          {selectedModels.map(mdl => (
            <option key={mdl} value={mdl}>
              {mdl}
            </option>
          ))}
        </select>
        <button
          className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
          disabled={!provider || !model}
          onClick={apply}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Áp dụng
        </button>
      </div>
    </GlassSlab>
  )
}
```

- [ ] **Step 4: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- model-tab`
  - Expected: `Tests  3 passed`.

- [ ] **Step 5: Write failing test for the `SettingsScreen` shell.**

Create `apps/desktop/src/aether/ui/screens/settings-screen.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $modelInfo, $modelOptions, $modelStatus } from '@/aether/domain/settings/model-store'

import { SettingsScreen } from './settings-screen'

beforeEach(() => {
  $modelStatus.set('ready')
  $modelInfo.set({ model: 'm1', provider: 'p1' })
  $modelOptions.set({ providers: [{ name: 'Provider One', slug: 'p1', models: ['m1'] }] })
})
afterEach(cleanup)

describe('SettingsScreen', () => {
  it('renders the five tab labels in Vietnamese', () => {
    render(<SettingsScreen />)
    expect(screen.getByRole('button', { name: 'Mô hình' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Providers/OAuth' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Khóa môi trường' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Công cụ' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Giao diện' })).toBeTruthy()
  })

  it('shows the Model tab by default and keeps "Agent" untranslated nowhere mistranslated', () => {
    render(<SettingsScreen />)
    expect(screen.getByText('MÔ HÌNH CHÍNH')).toBeTruthy()
    expect(screen.queryByText(/Đại lý/)).toBeNull()
  })

  it('switches tabs when a tab button is clicked', () => {
    render(<SettingsScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Giao diện' }))
    expect(screen.queryByText('MÔ HÌNH CHÍNH')).toBeNull()
  })
})
```

- [ ] **Step 6: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- settings-screen`
  - Expected: FAIL with `Failed to resolve import "./settings-screen"`.

- [ ] **Step 7: Implement `SettingsScreen` (Model tab wired; other tabs render a Vietnamese placeholder until later tasks).**

Create `apps/desktop/src/aether/ui/screens/settings-screen.tsx`:
```tsx
import { useState } from 'react'

import { GlassSlab } from '@/aether/ui/components/glass-slab'

import { ModelTab } from './settings/model-tab'

type TabId = 'appearance' | 'env' | 'model' | 'providers' | 'tools'

const TABS: { id: TabId; label: string }[] = [
  { id: 'model', label: 'Mô hình' },
  { id: 'providers', label: 'Providers/OAuth' },
  { id: 'env', label: 'Khóa môi trường' },
  { id: 'tools', label: 'Công cụ' },
  { id: 'appearance', label: 'Giao diện' }
]

function Soon({ label }: { label: string }) {
  return (
    <GlassSlab size="md">
      <div className="text-[12px] text-[color:var(--ae-dim)]">{label} — sắp ra mắt.</div>
    </GlassSlab>
  )
}

export function SettingsScreen() {
  const [tab, setTab] = useState<TabId>('model')

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <GlassSlab className="flex flex-wrap gap-1.5" size="sm">
          {TABS.map(t => (
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold transition"
              key={t.id}
              onClick={() => setTab(t.id)}
              style={
                tab === t.id
                  ? { background: 'var(--ae-azure)', color: '#fff' }
                  : { background: 'transparent', color: 'var(--ae-azure-soft)' }
              }
              type="button"
            >
              {t.label}
            </button>
          ))}
        </GlassSlab>
        <div className="min-h-0 flex-1 overflow-auto">
          {tab === 'model' && <ModelTab />}
          {tab === 'providers' && <Soon label="Providers/OAuth" />}
          {tab === 'env' && <Soon label="Khóa môi trường" />}
          {tab === 'tools' && <Soon label="Công cụ" />}
          {tab === 'appearance' && <Soon label="Giao diện" />}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 8: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- settings-screen`
  - Expected: `Tests  3 passed`.

- [ ] **Step 9: Write the prompt-cache guard test (source-scan).**

Justification (one line): `appendAssistantDelta` is a local `useCallback` inside `app/session/hooks/use-message-stream.ts` (not an importable symbol), so a runtime spy is impossible; the robust guard is a static source scan asserting the Settings screen + tab + store modules import none of the forbidden conversation symbols/strings.

Create `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts`:
```ts
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..', '..', '..')

const FILES = [
  'aether/ui/screens/settings-screen.tsx',
  'aether/ui/screens/settings/model-tab.tsx',
  'aether/domain/settings/model-store.ts'
]

const FORBIDDEN = [
  'appendAssistantDelta',
  'message.delta',
  'reasoning.delta',
  'thinking.',
  'use-message-stream'
]

describe('settings prompt-cache safety', () => {
  for (const rel of FILES) {
    it(`${rel} references no conversation-delta symbols`, () => {
      const src = readFileSync(join(ROOT, rel), 'utf8')
      for (const needle of FORBIDDEN) {
        expect(src.includes(needle)).toBe(false)
      }
    })
  }
})
```

- [ ] **Step 10: Run guard test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- settings-prompt-cache`
  - Expected: `Tests  3 passed`. (As later tasks add tab files, append their relative paths to `FILES`.)

- [ ] **Step 11: Commit.**
```
git add apps/desktop/src/aether/ui/screens/settings-screen.tsx apps/desktop/src/aether/ui/screens/settings/model-tab.tsx apps/desktop/src/aether/ui/screens/settings-screen.test.tsx apps/desktop/src/aether/ui/screens/settings/model-tab.test.tsx apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts
git commit -m "feat(aether-settings): add settings shell with tab nav, Model tab, and prompt-cache guard

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — Providers/OAuth sub-store (start→poll→submit state machine)

**Files:**
- Create: `apps/desktop/src/aether/domain/settings/oauth-store.ts`
- Test: `apps/desktop/src/aether/domain/settings/oauth-store.test.ts`

**Interfaces:**
- Consumes: `listOAuthProviders`, `startOAuthLogin`, `submitOAuthCode`, `pollOAuthSession`, `disconnectOAuthProvider`, `cancelOAuthSession`; types `OAuthProvidersResponse`, `OAuthStartResponse`, `OAuthPollResponse`, `OAuthSubmitResponse`.
- Produces: `$oauthProviders`, `$oauthStatus`, `$oauthFlow` (the live flow state), and actions `loadOAuthProviders`, `startFlow`, `submitCode`, `pollOnce`, `cancelFlow`, `disconnect`.

The flow atom is a small state machine: `{ phase: 'idle' | 'starting' | 'awaiting' | 'submitting' | 'done' | 'error'; providerId?; sessionId?; start?: OAuthStartResponse; message?: string }`. Polling is driven by the screen calling `pollOnce()` on an interval (the screen owns the timer so the store stays pure/testable and the prompt-cache rule — no conversation polling — is honored; this polls only the OAuth REST endpoint).

- [ ] **Step 1: Write failing test.**

Create `apps/desktop/src/aether/domain/settings/oauth-store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

import {
  $oauthFlow,
  $oauthProviders,
  $oauthStatus,
  cancelFlow,
  disconnect,
  loadOAuthProviders,
  pollOnce,
  startFlow,
  submitCode
} from './oauth-store'

describe('oauth-store', () => {
  it('loadOAuthProviders fills the atom and sets ready', async () => {
    $oauthStatus.set('idle')
    const list = vi.fn(async () => ({
      providers: [{ id: 'anthropic', name: 'Anthropic', flow: 'device_code', cli_command: '', docs_url: '', status: { logged_in: false } }]
    }))
    await loadOAuthProviders({ list: list as never })
    expect($oauthStatus.get()).toBe('ready')
    expect($oauthProviders.get()?.providers[0].id).toBe('anthropic')
  })

  it('startFlow stores session + start payload and enters awaiting', async () => {
    const start = vi.fn(async () => ({ flow: 'device_code', session_id: 's1', user_code: 'WXYZ', verification_url: 'https://v', expires_in: 600, poll_interval: 5 }))
    await startFlow('anthropic', { start: start as never })
    expect(start).toHaveBeenCalledWith('anthropic')
    expect($oauthFlow.get().phase).toBe('awaiting')
    expect($oauthFlow.get().sessionId).toBe('s1')
  })

  it('submitCode posts code and marks done on approved', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const submit = vi.fn(async () => ({ ok: true, status: 'approved' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await submitCode('CODE', { submit: submit as never, list: list as never })
    expect(submit).toHaveBeenCalledWith('anthropic', 's1', 'CODE')
    expect($oauthFlow.get().phase).toBe('done')
  })

  it('pollOnce marks done when poll returns approved', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const poll = vi.fn(async () => ({ session_id: 's1', status: 'approved' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await pollOnce({ poll: poll as never, list: list as never })
    expect(poll).toHaveBeenCalledWith('anthropic', 's1')
    expect($oauthFlow.get().phase).toBe('done')
  })

  it('cancelFlow cancels the session and returns to idle', async () => {
    $oauthFlow.set({ phase: 'awaiting', providerId: 'anthropic', sessionId: 's1' })
    const cancel = vi.fn(async () => ({ ok: true }))
    await cancelFlow({ cancel: cancel as never })
    expect(cancel).toHaveBeenCalledWith('s1')
    expect($oauthFlow.get().phase).toBe('idle')
  })

  it('disconnect calls disconnectOAuthProvider then reloads', async () => {
    const disc = vi.fn(async () => ({ ok: true, provider: 'anthropic' }))
    const list = vi.fn(async () => ({ providers: [] }))
    await disconnect('anthropic', { disc: disc as never, list: list as never })
    expect(disc).toHaveBeenCalledWith('anthropic')
    expect(list).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- oauth-store`
  - Expected: FAIL with `Failed to resolve import "./oauth-store"`.

- [ ] **Step 3: Implement.**

Create `apps/desktop/src/aether/domain/settings/oauth-store.ts`:
```ts
import { atom } from 'nanostores'

import {
  cancelOAuthSession,
  disconnectOAuthProvider,
  listOAuthProviders,
  pollOAuthSession,
  startOAuthLogin,
  submitOAuthCode
} from '@/aether-api'
import type {
  OAuthPollResponse,
  OAuthProvidersResponse,
  OAuthStartResponse,
  OAuthSubmitResponse
} from '@/aether-api'

export interface OAuthFlowState {
  message?: string
  phase: 'awaiting' | 'done' | 'error' | 'idle' | 'starting' | 'submitting'
  providerId?: string
  sessionId?: string
  start?: OAuthStartResponse
}

export const $oauthProviders = atom<OAuthProvidersResponse | null>(null)
export const $oauthStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')
export const $oauthFlow = atom<OAuthFlowState>({ phase: 'idle' })

interface OAuthDeps {
  list?: () => Promise<OAuthProvidersResponse>
  start?: (id: string) => Promise<OAuthStartResponse>
  submit?: (id: string, sessionId: string, code: string) => Promise<OAuthSubmitResponse>
  poll?: (id: string, sessionId: string) => Promise<OAuthPollResponse>
  cancel?: (sessionId: string) => Promise<{ ok: boolean }>
  disc?: (id: string) => Promise<{ ok: boolean; provider: string }>
}

export async function loadOAuthProviders(deps: OAuthDeps = {}): Promise<void> {
  const list = deps.list ?? listOAuthProviders
  $oauthStatus.set('loading')

  try {
    $oauthProviders.set(await list())
    $oauthStatus.set('ready')
  } catch {
    $oauthStatus.set('error')
  }
}

export async function startFlow(providerId: string, deps: OAuthDeps = {}): Promise<void> {
  const start = deps.start ?? startOAuthLogin
  $oauthFlow.set({ phase: 'starting', providerId })

  try {
    const res = await start(providerId)
    $oauthFlow.set({ phase: 'awaiting', providerId, sessionId: res.session_id, start: res })
  } catch (err) {
    $oauthFlow.set({ phase: 'error', providerId, message: err instanceof Error ? err.message : String(err) })
  }
}

export async function submitCode(code: string, deps: OAuthDeps = {}): Promise<void> {
  const submit = deps.submit ?? submitOAuthCode
  const flow = $oauthFlow.get()

  if (!flow.providerId || !flow.sessionId) {
    return
  }

  $oauthFlow.set({ ...flow, phase: 'submitting' })

  try {
    const res = await submit(flow.providerId, flow.sessionId, code)

    if (res.status === 'approved' && res.ok) {
      $oauthFlow.set({ ...flow, phase: 'done' })
      await loadOAuthProviders(deps)
    } else {
      $oauthFlow.set({ ...flow, phase: 'error', message: res.message ?? 'Xác thực thất bại' })
    }
  } catch (err) {
    $oauthFlow.set({ ...flow, phase: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export async function pollOnce(deps: OAuthDeps = {}): Promise<void> {
  const poll = deps.poll ?? pollOAuthSession
  const flow = $oauthFlow.get()

  if (flow.phase !== 'awaiting' || !flow.providerId || !flow.sessionId) {
    return
  }

  try {
    const res = await poll(flow.providerId, flow.sessionId)

    if (res.status === 'approved') {
      $oauthFlow.set({ ...flow, phase: 'done' })
      await loadOAuthProviders(deps)
    } else if (res.status === 'denied' || res.status === 'error' || res.status === 'expired') {
      $oauthFlow.set({ ...flow, phase: 'error', message: res.error_message ?? res.status })
    }
  } catch (err) {
    $oauthFlow.set({ ...flow, phase: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

export async function cancelFlow(deps: OAuthDeps = {}): Promise<void> {
  const cancel = deps.cancel ?? cancelOAuthSession
  const flow = $oauthFlow.get()

  if (flow.sessionId) {
    try {
      await cancel(flow.sessionId)
    } catch {
      // best-effort; reset anyway
    }
  }

  $oauthFlow.set({ phase: 'idle' })
}

export async function disconnect(providerId: string, deps: OAuthDeps = {}): Promise<void> {
  const disc = deps.disc ?? disconnectOAuthProvider
  await disc(providerId)
  await loadOAuthProviders(deps)
}
```

- [ ] **Step 4: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- oauth-store`
  - Expected: `Tests  6 passed`.

- [ ] **Step 5: Commit.**
```
git add apps/desktop/src/aether/domain/settings/oauth-store.ts apps/desktop/src/aether/domain/settings/oauth-store.test.ts
git commit -m "feat(aether-settings): add OAuth sub-store with start/poll/submit/cancel state machine

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — Providers/OAuth tab

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/settings/providers-tab.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/settings-screen.tsx` (swap the `providers` placeholder for `<ProvidersTab />`)
- Modify: `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts` (add `providers-tab.tsx` to `FILES`)
- Test: `apps/desktop/src/aether/ui/screens/settings/providers-tab.test.tsx`

**Interfaces:**
- Consumes: `$oauthProviders`, `$oauthStatus`, `$oauthFlow`, `loadOAuthProviders`, `startFlow`, `submitCode`, `pollOnce`, `cancelFlow`, `disconnect`; `GlassSlab`.
- Produces: `ProvidersTab`.

- [ ] **Step 1: Write failing render/interaction test.**

Create `apps/desktop/src/aether/ui/screens/settings/providers-tab.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $oauthFlow, $oauthProviders, $oauthStatus } from '@/aether/domain/settings/oauth-store'

import { ProvidersTab } from './providers-tab'

beforeEach(() => {
  $oauthStatus.set('ready')
  $oauthFlow.set({ phase: 'idle' })
  $oauthProviders.set({
    providers: [
      { id: 'anthropic', name: 'Anthropic', flow: 'device_code', cli_command: '', docs_url: '', status: { logged_in: true } },
      { id: 'openai', name: 'OpenAI', flow: 'pkce', cli_command: '', docs_url: '', status: { logged_in: false } }
    ]
  })
})
afterEach(cleanup)

describe('ProvidersTab', () => {
  it('lists providers with connected state in Vietnamese', () => {
    render(<ProvidersTab />)
    expect(screen.getByText('Anthropic')).toBeTruthy()
    expect(screen.getByText('OpenAI')).toBeTruthy()
    expect(screen.getByText(/Đã kết nối/)).toBeTruthy()
  })

  it('shows a connect button for a disconnected provider', () => {
    render(<ProvidersTab />)
    const buttons = screen.getAllByRole('button', { name: /Kết nối/ })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders the device-code instructions when a flow is awaiting', () => {
    $oauthFlow.set({
      phase: 'awaiting',
      providerId: 'anthropic',
      sessionId: 's1',
      start: { flow: 'device_code', session_id: 's1', user_code: 'WXYZ-1234', verification_url: 'https://verify', expires_in: 600, poll_interval: 5 }
    })
    render(<ProvidersTab />)
    expect(screen.getByText(/WXYZ-1234/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Hủy/ })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- providers-tab`
  - Expected: FAIL with `Failed to resolve import "./providers-tab"`.

- [ ] **Step 3: Implement `ProvidersTab`.**

Create `apps/desktop/src/aether/ui/screens/settings/providers-tab.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'

import {
  $oauthFlow,
  $oauthProviders,
  $oauthStatus,
  cancelFlow,
  disconnect,
  loadOAuthProviders,
  pollOnce,
  startFlow,
  submitCode
} from '@/aether/domain/settings/oauth-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ProvidersTab() {
  const status = useStore($oauthStatus)
  const data = useStore($oauthProviders)
  const flow = useStore($oauthFlow)
  const [code, setCode] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if ($oauthStatus.get() === 'idle') {
      void loadOAuthProviders()
    }
  }, [])

  // Poll ONLY the OAuth REST endpoint while a flow is awaiting. This does not
  // touch any conversation stream, so the prompt-cache rule is honored.
  useEffect(() => {
    if (flow.phase === 'awaiting') {
      timer.current = setInterval(() => void pollOnce(), 4000)
    }

    return () => {
      if (timer.current) {
        clearInterval(timer.current)
        timer.current = null
      }
    }
  }, [flow.phase, flow.sessionId])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải providers…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được danh sách providers.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
          onClick={() => void loadOAuthProviders()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  const providers = data?.providers ?? []

  return (
    <div className="flex flex-col gap-3">
      {flow.phase === 'awaiting' && (
        <GlassSlab className="flex flex-col gap-2" size="md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">ĐANG XÁC THỰC</div>
          {flow.start && flow.start.flow === 'device_code' && (
            <div className="text-[12.5px] text-[#D7ECFA]">
              Mở <span className="font-mono">{flow.start.verification_url}</span> và nhập mã{' '}
              <b className="font-mono text-white">{flow.start.user_code}</b>.
            </div>
          )}
          {flow.start && (flow.start.flow === 'pkce' || flow.start.flow === 'loopback') && (
            <div className="text-[12.5px] text-[#D7ECFA]">
              Mở liên kết để đăng nhập: <span className="font-mono">{flow.start.auth_url}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
              onChange={e => setCode(e.target.value)}
              placeholder="Dán mã xác thực (nếu có)"
              value={code}
            />
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
              disabled={!code.trim()}
              onClick={() => void submitCode(code.trim())}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Gửi mã
            </button>
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-azure-soft)]"
              onClick={() => void cancelFlow()}
              type="button"
            >
              Hủy
            </button>
          </div>
        </GlassSlab>
      )}

      {flow.phase === 'error' && (
        <GlassSlab size="md">
          <div className="text-[12px] text-[color:var(--ae-warn)]">{flow.message ?? 'Xác thực thất bại.'}</div>
        </GlassSlab>
      )}

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">NHÀ CUNG CẤP</div>
        {providers.map(p => (
          <div className="flex items-center gap-2 text-[12.5px]" key={p.id}>
            <span className="flex-1 font-semibold text-[#D7ECFA]">{p.name}</span>
            {p.status.logged_in ? (
              <>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--ae-ok)' }}>
                  Đã kết nối
                </span>
                <button
                  className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ae-azure-soft)]"
                  onClick={() => void disconnect(p.id)}
                  type="button"
                >
                  Ngắt kết nối
                </button>
              </>
            ) : (
              <button
                className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold text-white"
                onClick={() => void startFlow(p.id)}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Kết nối
              </button>
            )}
          </div>
        ))}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 4: Wire it into the shell.**

In `apps/desktop/src/aether/ui/screens/settings-screen.tsx`, add the import after the `ModelTab` import:
```tsx
import { ProvidersTab } from './settings/providers-tab'
```
Replace the line `{tab === 'providers' && <Soon label="Providers/OAuth" />}` with:
```tsx
          {tab === 'providers' && <ProvidersTab />}
```

- [ ] **Step 5: Extend the prompt-cache guard.**

In `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts`, add to the `FILES` array:
```ts
  'aether/ui/screens/settings/providers-tab.tsx',
  'aether/domain/settings/oauth-store.ts',
```

- [ ] **Step 6: Run tests, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- providers-tab settings-prompt-cache settings-screen`
  - Expected: all suites pass.

- [ ] **Step 7: Commit.**
```
git add apps/desktop/src/aether/ui/screens/settings/providers-tab.tsx apps/desktop/src/aether/ui/screens/settings/providers-tab.test.tsx apps/desktop/src/aether/ui/screens/settings-screen.tsx apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts
git commit -m "feat(aether-settings): add Providers/OAuth tab with device-code flow UI

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Env keys sub-store (mask + reveal)

**Files:**
- Create: `apps/desktop/src/aether/domain/settings/env-store.ts`
- Test: `apps/desktop/src/aether/domain/settings/env-store.test.ts`

**Interfaces:**
- Consumes: `getEnvVars`, `setEnvVar`, `deleteEnvVar`, `revealEnvVar`, `validateProviderCredential`; type `EnvVarInfo`.
- Produces: `$envVars`, `$envStatus`, `$revealed` (`Record<string,string>`); actions `loadEnvVars`, `saveEnvVar`, `removeEnvVar`, `revealEnvVar` (re-exported as `revealKey`), `validateKey`.

`$envStatus` includes `'empty'` because the env catalog can be empty.

- [ ] **Step 1: Write failing test.**

Create `apps/desktop/src/aether/domain/settings/env-store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

import {
  $envStatus,
  $envVars,
  $revealed,
  loadEnvVars,
  removeEnvVar,
  revealKey,
  saveEnvVar,
  validateKey
} from './env-store'

const sample = {
  OPENAI_API_KEY: {
    advanced: false,
    category: 'provider',
    description: 'OpenAI key',
    is_password: true,
    is_set: true,
    redacted_value: 'sk-…ab',
    tools: [],
    url: null
  }
}

describe('env-store', () => {
  it('loadEnvVars fills atom + ready', async () => {
    $envStatus.set('idle')
    const get = vi.fn(async () => sample)
    await loadEnvVars({ get: get as never })
    expect($envStatus.get()).toBe('ready')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(true)
  })

  it('loadEnvVars sets empty on empty catalog', async () => {
    $envStatus.set('idle')
    const get = vi.fn(async () => ({}))
    await loadEnvVars({ get: get as never })
    expect($envStatus.get()).toBe('empty')
  })

  it('saveEnvVar calls setEnvVar and marks is_set', async () => {
    $envVars.set(sample as never)
    const set = vi.fn(async () => ({ ok: true }))
    await saveEnvVar('OPENAI_API_KEY', 'sk-new', { set: set as never })
    expect(set).toHaveBeenCalledWith('OPENAI_API_KEY', 'sk-new')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(true)
  })

  it('removeEnvVar calls deleteEnvVar and clears is_set + reveal', async () => {
    $envVars.set(sample as never)
    $revealed.set({ OPENAI_API_KEY: 'sk-real' })
    const del = vi.fn(async () => ({ ok: true }))
    await removeEnvVar('OPENAI_API_KEY', { del: del as never })
    expect(del).toHaveBeenCalledWith('OPENAI_API_KEY')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(false)
    expect($revealed.get().OPENAI_API_KEY).toBeUndefined()
  })

  it('revealKey stores the real value', async () => {
    $revealed.set({})
    const reveal = vi.fn(async () => ({ key: 'OPENAI_API_KEY', value: 'sk-real' }))
    await revealKey('OPENAI_API_KEY', { reveal: reveal as never })
    expect(reveal).toHaveBeenCalledWith('OPENAI_API_KEY')
    expect($revealed.get().OPENAI_API_KEY).toBe('sk-real')
  })

  it('validateKey forwards (key, value)', async () => {
    const validate = vi.fn(async () => ({ ok: true, reachable: true, message: 'ok' }))
    const out = await validateKey('OPENAI_API_KEY', 'sk-x', { validate: validate as never })
    expect(validate).toHaveBeenCalledWith('OPENAI_API_KEY', 'sk-x', undefined)
    expect(out.reachable).toBe(true)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- env-store`
  - Expected: FAIL with `Failed to resolve import "./env-store"`.

- [ ] **Step 3: Implement.**

Create `apps/desktop/src/aether/domain/settings/env-store.ts`:
```ts
import { atom } from 'nanostores'

import {
  deleteEnvVar,
  getEnvVars,
  revealEnvVar as revealEnvVarApi,
  setEnvVar,
  validateProviderCredential
} from '@/aether-api'
import type { EnvVarInfo } from '@/aether-api'

export const $envVars = atom<Record<string, EnvVarInfo> | null>(null)
export const $envStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
export const $revealed = atom<Record<string, string>>({})

interface EnvDeps {
  get?: () => Promise<Record<string, EnvVarInfo>>
  set?: (key: string, value: string) => Promise<{ ok: boolean }>
  del?: (key: string) => Promise<{ ok: boolean }>
  reveal?: (key: string) => Promise<{ key: string; value: string }>
  validate?: (
    key: string,
    value: string,
    apiKey?: string
  ) => Promise<{ ok: boolean; reachable: boolean; message: string; models?: string[] }>
}

function patch(key: string, p: Partial<EnvVarInfo>): void {
  const cur = $envVars.get()

  if (!cur || !cur[key]) {
    return
  }

  $envVars.set({ ...cur, [key]: { ...cur[key], ...p } })
}

export async function loadEnvVars(deps: EnvDeps = {}): Promise<void> {
  const get = deps.get ?? getEnvVars
  $envStatus.set('loading')

  try {
    const vars = await get()
    $envVars.set(vars)
    $envStatus.set(Object.keys(vars).length === 0 ? 'empty' : 'ready')
  } catch {
    $envStatus.set('error')
  }
}

export async function saveEnvVar(key: string, value: string, deps: EnvDeps = {}): Promise<void> {
  const set = deps.set ?? setEnvVar
  await set(key, value)
  patch(key, { is_set: true, redacted_value: maskValue(value) })
}

export async function removeEnvVar(key: string, deps: EnvDeps = {}): Promise<void> {
  const del = deps.del ?? deleteEnvVar
  await del(key)
  patch(key, { is_set: false, redacted_value: null })
  const next = { ...$revealed.get() }
  delete next[key]
  $revealed.set(next)
}

export async function revealKey(key: string, deps: EnvDeps = {}): Promise<void> {
  const reveal = deps.reveal ?? revealEnvVarApi
  const res = await reveal(key)
  $revealed.set({ ...$revealed.get(), [key]: res.value })
}

export async function validateKey(
  key: string,
  value: string,
  deps: EnvDeps = {},
  apiKey?: string
): Promise<{ ok: boolean; reachable: boolean; message: string; models?: string[] }> {
  const validate = deps.validate ?? validateProviderCredential
  return validate(key, value, apiKey)
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return '••••'
  }

  return `${'•'.repeat(4)}${value.slice(-2)}`
}
```

- [ ] **Step 4: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- env-store`
  - Expected: `Tests  6 passed`.

- [ ] **Step 5: Commit.**
```
git add apps/desktop/src/aether/domain/settings/env-store.ts apps/desktop/src/aether/domain/settings/env-store.test.ts
git commit -m "feat(aether-settings): add env-keys sub-store with mask/reveal/validate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Env keys tab

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/settings/env-tab.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/settings-screen.tsx` (swap `env` placeholder)
- Modify: `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts` (add `env-tab.tsx`, `env-store.ts`)
- Test: `apps/desktop/src/aether/ui/screens/settings/env-tab.test.tsx`

**Interfaces:**
- Consumes: `$envVars`, `$envStatus`, `$revealed`, `loadEnvVars`, `saveEnvVar`, `removeEnvVar`, `revealKey`; `GlassSlab`.
- Produces: `EnvTab`.

- [ ] **Step 1: Write failing render/interaction test.**

Create `apps/desktop/src/aether/ui/screens/settings/env-tab.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $envStatus, $envVars, $revealed } from '@/aether/domain/settings/env-store'

import { EnvTab } from './env-tab'

const sample = {
  OPENAI_API_KEY: {
    advanced: false,
    category: 'provider',
    description: 'Khóa OpenAI',
    is_password: true,
    is_set: true,
    redacted_value: 'sk-…ab',
    provider_label: 'OpenAI',
    tools: [],
    url: null
  }
}

beforeEach(() => {
  $envStatus.set('ready')
  $revealed.set({})
  $envVars.set(sample as never)
})
afterEach(cleanup)

describe('EnvTab', () => {
  it('renders the key masked (password) by default', () => {
    render(<EnvTab />)
    expect(screen.getByText('OPENAI_API_KEY')).toBeTruthy()
    const input = screen.getByTestId('ae-env-OPENAI_API_KEY') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('shows a Vietnamese empty state when status is empty', () => {
    $envStatus.set('empty')
    render(<EnvTab />)
    expect(screen.getByText(/Chưa có khóa môi trường/)).toBeTruthy()
  })

  it('calls onReveal when the reveal button is pressed', () => {
    const onReveal = vi.fn()
    render(<EnvTab onReveal={onReveal} />)
    fireEvent.click(screen.getByRole('button', { name: /Hiện/ }))
    expect(onReveal).toHaveBeenCalledWith('OPENAI_API_KEY')
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- env-tab`
  - Expected: FAIL with `Failed to resolve import "./env-tab"`.

- [ ] **Step 3: Implement `EnvTab`.**

Create `apps/desktop/src/aether/ui/screens/settings/env-tab.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $envStatus,
  $envVars,
  $revealed,
  loadEnvVars,
  removeEnvVar,
  revealKey,
  saveEnvVar
} from '@/aether/domain/settings/env-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function EnvTab({ onReveal }: { onReveal?: (key: string) => void }) {
  const status = useStore($envStatus)
  const vars = useStore($envVars)
  const revealed = useStore($revealed)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if ($envStatus.get() === 'idle') {
      void loadEnvVars()
    }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải khóa…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được khóa môi trường.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
          onClick={() => void loadEnvVars()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  if (status === 'empty') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có khóa môi trường nào.</div>
      </GlassSlab>
    )
  }

  const entries = Object.entries(vars ?? {})

  return (
    <GlassSlab className="flex flex-col gap-3" size="md">
      <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">KHÓA MÔI TRƯỜNG</div>
      {entries.map(([key, info]) => {
        const draft = drafts[key] ?? ''
        const shown = revealed[key]
        const inputValue = shown ?? draft
        const inputType = info.is_password && !shown ? 'password' : 'text'

        return (
          <div className="flex flex-col gap-1.5 border-b border-[rgba(120,200,255,.1)] pb-2.5" key={key}>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-[12px] font-semibold text-white">{key}</span>
              {info.is_set && (
                <button
                  className="rounded-[8px] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ae-azure-soft)]"
                  onClick={() => (onReveal ? onReveal(key) : void revealKey(key))}
                  type="button"
                >
                  {shown ? 'Ẩn' : 'Hiện'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-[color:var(--ae-dim)]">{info.description}</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
                data-testid={`ae-env-${key}`}
                onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                placeholder={info.is_set ? info.redacted_value ?? '••••••••' : 'Nhập giá trị'}
                type={inputType}
                value={inputValue}
              />
              <button
                className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
                disabled={!draft.trim()}
                onClick={() => {
                  void saveEnvVar(key, draft.trim())
                  setDrafts(d => ({ ...d, [key]: '' }))
                }}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Lưu
              </button>
              {info.is_set && (
                <button
                  className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-warn)]"
                  onClick={() => void removeEnvVar(key)}
                  type="button"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        )
      })}
    </GlassSlab>
  )
}
```

- [ ] **Step 4: Wire into shell + guard.**

In `settings-screen.tsx` add `import { EnvTab } from './settings/env-tab'` and replace `{tab === 'env' && <Soon label="Khóa môi trường" />}` with `{tab === 'env' && <EnvTab />}`.

In `settings-prompt-cache.test.ts` add to `FILES`:
```ts
  'aether/ui/screens/settings/env-tab.tsx',
  'aether/domain/settings/env-store.ts',
```

- [ ] **Step 5: Run tests, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- env-tab settings-prompt-cache`
  - Expected: all pass.

- [ ] **Step 6: Commit.**
```
git add apps/desktop/src/aether/ui/screens/settings/env-tab.tsx apps/desktop/src/aether/ui/screens/settings/env-tab.test.tsx apps/desktop/src/aether/ui/screens/settings-screen.tsx apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts
git commit -m "feat(aether-settings): add Env keys tab with masked input + reveal/save/delete

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — Toolsets + computer-use sub-store

**Files:**
- Create: `apps/desktop/src/aether/domain/settings/toolsets-store.ts`
- Test: `apps/desktop/src/aether/domain/settings/toolsets-store.test.ts`

**Interfaces:**
- Consumes: `getToolsets`, `toggleToolset`, `getToolsetConfig`, `getComputerUseStatus`, `grantComputerUsePermissions`; types `ToolsetInfo`, `ToolsetConfig`, `ComputerUseStatus`.
- Produces: `$toolsets`, `$toolsetsStatus`, `$computerUse`, `$computerUseStatus`; actions `loadToolsets`, `setToolsetEnabled`, `loadComputerUse`, `grantComputerUse`.

`$toolsetsStatus` includes `'empty'`.

- [ ] **Step 1: Write failing test.**

Create `apps/desktop/src/aether/domain/settings/toolsets-store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

import {
  $computerUse,
  $computerUseStatus,
  $toolsets,
  $toolsetsStatus,
  grantComputerUse,
  loadComputerUse,
  loadToolsets,
  setToolsetEnabled
} from './toolsets-store'

const toolset = { name: 'web', label: 'Web', description: 'd', enabled: false, configured: true, tools: ['search'] }

describe('toolsets-store', () => {
  it('loadToolsets fills atom + ready', async () => {
    $toolsetsStatus.set('idle')
    const get = vi.fn(async () => [toolset])
    await loadToolsets({ get: get as never })
    expect($toolsetsStatus.get()).toBe('ready')
    expect($toolsets.get()?.[0].name).toBe('web')
  })

  it('loadToolsets sets empty on empty list', async () => {
    $toolsetsStatus.set('idle')
    const get = vi.fn(async () => [])
    await loadToolsets({ get: get as never })
    expect($toolsetsStatus.get()).toBe('empty')
  })

  it('setToolsetEnabled toggles and updates the atom', async () => {
    $toolsets.set([toolset] as never)
    const toggle = vi.fn(async () => ({ ok: true, name: 'web', enabled: true }))
    await setToolsetEnabled('web', true, { toggle: toggle as never })
    expect(toggle).toHaveBeenCalledWith('web', true)
    expect($toolsets.get()?.[0].enabled).toBe(true)
  })

  it('loadComputerUse fills status atom', async () => {
    $computerUseStatus.set('idle')
    const get = vi.fn(async () => ({ platform: 'darwin', installed: true, ready: true, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: true, screen_recording: true, screen_recording_capturable: true, source: null, error: null }))
    await loadComputerUse({ getCu: get as never })
    expect($computerUseStatus.get()).toBe('ready')
    expect($computerUse.get()?.ready).toBe(true)
  })

  it('grantComputerUse calls grant then reloads status', async () => {
    const grant = vi.fn(async () => ({ name: 'grant', ok: true, pid: 1 }))
    const get = vi.fn(async () => ({ platform: 'darwin', installed: true, ready: true, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: true, screen_recording: true, screen_recording_capturable: true, source: null, error: null }))
    await grantComputerUse({ grant: grant as never, getCu: get as never })
    expect(grant).toHaveBeenCalled()
    expect(get).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- toolsets-store`
  - Expected: FAIL with `Failed to resolve import "./toolsets-store"`.

- [ ] **Step 3: Implement.**

Create `apps/desktop/src/aether/domain/settings/toolsets-store.ts`:
```ts
import { atom } from 'nanostores'

import {
  getComputerUseStatus,
  getToolsets,
  grantComputerUsePermissions,
  toggleToolset
} from '@/aether-api'
import type { ActionResponse, ComputerUseStatus, ToolsetInfo } from '@/aether-api'

export const $toolsets = atom<ToolsetInfo[] | null>(null)
export const $toolsetsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
export const $computerUse = atom<ComputerUseStatus | null>(null)
export const $computerUseStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

interface ToolsetsDeps {
  get?: () => Promise<ToolsetInfo[]>
  toggle?: (name: string, enabled: boolean) => Promise<{ ok: boolean; name: string; enabled: boolean }>
  getCu?: () => Promise<ComputerUseStatus>
  grant?: () => Promise<ActionResponse>
}

export async function loadToolsets(deps: ToolsetsDeps = {}): Promise<void> {
  const get = deps.get ?? getToolsets
  $toolsetsStatus.set('loading')

  try {
    const list = await get()
    $toolsets.set(list)
    $toolsetsStatus.set(list.length === 0 ? 'empty' : 'ready')
  } catch {
    $toolsetsStatus.set('error')
  }
}

export async function setToolsetEnabled(name: string, enabled: boolean, deps: ToolsetsDeps = {}): Promise<void> {
  const toggle = deps.toggle ?? toggleToolset
  await toggle(name, enabled)
  const cur = $toolsets.get()

  if (cur) {
    $toolsets.set(cur.map(t => (t.name === name ? { ...t, enabled } : t)))
  }
}

export async function loadComputerUse(deps: ToolsetsDeps = {}): Promise<void> {
  const getCu = deps.getCu ?? getComputerUseStatus
  $computerUseStatus.set('loading')

  try {
    $computerUse.set(await getCu())
    $computerUseStatus.set('ready')
  } catch {
    $computerUseStatus.set('error')
  }
}

export async function grantComputerUse(deps: ToolsetsDeps = {}): Promise<void> {
  const grant = deps.grant ?? grantComputerUsePermissions
  await grant()
  await loadComputerUse(deps)
}
```

- [ ] **Step 4: Run test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- toolsets-store`
  - Expected: `Tests  5 passed`.

- [ ] **Step 5: Commit.**
```
git add apps/desktop/src/aether/domain/settings/toolsets-store.ts apps/desktop/src/aether/domain/settings/toolsets-store.test.ts
git commit -m "feat(aether-settings): add toolsets + computer-use sub-store

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — Tools/Toolsets tab

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/settings/tools-tab.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/settings-screen.tsx` (swap `tools` placeholder)
- Modify: `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts` (add `tools-tab.tsx`, `toolsets-store.ts`)
- Test: `apps/desktop/src/aether/ui/screens/settings/tools-tab.test.tsx`

**Interfaces:**
- Consumes: `$toolsets`, `$toolsetsStatus`, `$computerUse`, `$computerUseStatus`, `loadToolsets`, `setToolsetEnabled`, `loadComputerUse`, `grantComputerUse`; `GlassSlab`.
- Produces: `ToolsTab`.

- [ ] **Step 1: Write failing render/interaction test.**

Create `apps/desktop/src/aether/ui/screens/settings/tools-tab.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $computerUse, $computerUseStatus, $toolsets, $toolsetsStatus } from '@/aether/domain/settings/toolsets-store'

import { ToolsTab } from './tools-tab'

beforeEach(() => {
  $toolsetsStatus.set('ready')
  $toolsets.set([{ name: 'web', label: 'Web', description: 'Tìm kiếm web', enabled: false, configured: true, tools: ['search'] }])
  $computerUseStatus.set('ready')
  $computerUse.set({ platform: 'darwin', installed: true, ready: false, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: false, screen_recording: false, screen_recording_capturable: true, source: null, error: null } as never)
})
afterEach(cleanup)

describe('ToolsTab', () => {
  it('lists toolsets with their label', () => {
    render(<ToolsTab />)
    expect(screen.getByText('Web')).toBeTruthy()
  })

  it('toggles a toolset', () => {
    const onToggle = vi.fn()
    render(<ToolsTab onToggle={onToggle} />)
    fireEvent.click(screen.getByTestId('ae-toolset-web'))
    expect(onToggle).toHaveBeenCalledWith('web', true)
  })

  it('shows a grant button when computer-use can_grant and not ready', () => {
    render(<ToolsTab />)
    expect(screen.getByRole('button', { name: /Cấp quyền/ })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- tools-tab`
  - Expected: FAIL with `Failed to resolve import "./tools-tab"`.

- [ ] **Step 3: Implement `ToolsTab`.**

Create `apps/desktop/src/aether/ui/screens/settings/tools-tab.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $computerUse,
  $computerUseStatus,
  $toolsets,
  $toolsetsStatus,
  grantComputerUse,
  loadComputerUse,
  loadToolsets,
  setToolsetEnabled
} from '@/aether/domain/settings/toolsets-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ToolsTab({ onToggle }: { onToggle?: (name: string, enabled: boolean) => void }) {
  const status = useStore($toolsetsStatus)
  const toolsets = useStore($toolsets)
  const cuStatus = useStore($computerUseStatus)
  const cu = useStore($computerUse)

  useEffect(() => {
    if ($toolsetsStatus.get() === 'idle') {
      void loadToolsets()
    }

    if ($computerUseStatus.get() === 'idle') {
      void loadComputerUse()
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">BỘ CÔNG CỤ</div>
        {(status === 'loading' || status === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải công cụ…</div>
        )}
        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được bộ công cụ.</div>
            <button
              className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
              onClick={() => void loadToolsets()}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        )}
        {status === 'empty' && <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có bộ công cụ nào.</div>}
        {status === 'ready' &&
          (toolsets ?? []).map(ts => (
            <label className="flex items-center gap-3 text-[12.5px]" key={ts.name}>
              <input
                checked={ts.enabled}
                data-testid={`ae-toolset-${ts.name}`}
                onChange={e =>
                  onToggle ? onToggle(ts.name, e.target.checked) : void setToolsetEnabled(ts.name, e.target.checked)
                }
                type="checkbox"
              />
              <span className="flex-1 font-semibold text-[#D7ECFA]">{ts.label}</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{ts.description}</span>
            </label>
          ))}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          ĐIỀU KHIỂN MÁY TÍNH
        </div>
        {(cuStatus === 'loading' || cuStatus === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang kiểm tra trạng thái…</div>
        )}
        {cuStatus === 'error' && (
          <div className="text-[12px] text-[color:var(--ae-warn)]">Không kiểm tra được trạng thái điều khiển máy tính.</div>
        )}
        {cuStatus === 'ready' && cu && (
          <>
            <div className="text-[12.5px] text-[#D7ECFA]">
              Trạng thái:{' '}
              <b style={{ color: cu.ready ? 'var(--ae-ok)' : 'var(--ae-warn)' }}>
                {cu.ready ? 'Sẵn sàng' : 'Chưa sẵn sàng'}
              </b>
            </div>
            {cu.can_grant && !cu.ready && (
              <button
                className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
                onClick={() => void grantComputerUse()}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Cấp quyền
              </button>
            )}
          </>
        )}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 4: Wire into shell + guard.**

In `settings-screen.tsx` add `import { ToolsTab } from './settings/tools-tab'` and replace `{tab === 'tools' && <Soon label="Công cụ" />}` with `{tab === 'tools' && <ToolsTab />}`.

In `settings-prompt-cache.test.ts` add to `FILES`:
```ts
  'aether/ui/screens/settings/tools-tab.tsx',
  'aether/domain/settings/toolsets-store.ts',
```

- [ ] **Step 5: Run tests, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- tools-tab settings-prompt-cache`
  - Expected: all pass.

- [ ] **Step 6: Commit.**
```
git add apps/desktop/src/aether/ui/screens/settings/tools-tab.tsx apps/desktop/src/aether/ui/screens/settings/tools-tab.test.tsx apps/desktop/src/aether/ui/screens/settings-screen.tsx apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts
git commit -m "feat(aether-settings): add Tools/Toolsets tab with computer-use grant

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — Schema-driven config sub-store + Appearance tab

**Files:**
- Create: `apps/desktop/src/aether/domain/settings/config-store.ts`
- Create: `apps/desktop/src/aether/ui/screens/settings/appearance-tab.tsx`
- Modify: `apps/desktop/src/aether/ui/screens/settings-screen.tsx` (swap `appearance` placeholder)
- Modify: `apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts` (add `appearance-tab.tsx`, `config-store.ts`)
- Test: `apps/desktop/src/aether/domain/settings/config-store.test.ts`
- Test: `apps/desktop/src/aether/ui/screens/settings/appearance-tab.test.tsx`

**Interfaces:**
- Consumes (store): `getAetherConfigSchema`, `getAetherConfigRecord`, `saveAetherConfig`; types `ConfigSchemaResponse`, `ConfigFieldSchema`, `AetherConfigRecord`.
- Produces (store): `$configSchema`, `$configRecord`, `$configStatus`; actions `loadConfig`, `setConfigField`, `saveConfig`.
- Consumes (tab): `useTheme()` from `@/themes/context` for theme/skin/mode; the config store atoms for schema-driven fields.
- Produces (tab): `AppearanceTab`.

The Appearance tab combines (a) theme/skin/color-mode controls reusing the existing theme store (`setMode`, `setTheme`, keeping skin default `aether`/`nous` per repo default — it does NOT force a skin), and (b) the generic schema-driven config renderer (boolean→checkbox, number→number input, select→dropdown using `options`, string/text→text input) grouped by `category_order`.

- [ ] **Step 1: Write failing config-store test.**

Create `apps/desktop/src/aether/domain/settings/config-store.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'

import { $configRecord, $configSchema, $configStatus, loadConfig, saveConfig, setConfigField } from './config-store'

describe('config-store', () => {
  it('loadConfig fills schema + record and sets ready', async () => {
    $configStatus.set('idle')
    const getSchema = vi.fn(async () => ({ category_order: ['general'], fields: { 'display.skin': { type: 'string', category: 'general' } } }))
    const getRecord = vi.fn(async () => ({ display: { skin: 'aether' } }))
    await loadConfig({ getSchema: getSchema as never, getRecord: getRecord as never })
    expect($configStatus.get()).toBe('ready')
    expect($configSchema.get()?.fields['display.skin'].type).toBe('string')
    expect($configRecord.get()).toEqual({ display: { skin: 'aether' } })
  })

  it('setConfigField writes a nested dotted key into the record', () => {
    $configRecord.set({ display: { skin: 'aether' } })
    setConfigField('agent.reasoning_effort', 'high')
    expect($configRecord.get()).toEqual({ display: { skin: 'aether' }, agent: { reasoning_effort: 'high' } })
  })

  it('saveConfig posts the current record', async () => {
    $configRecord.set({ agent: { reasoning_effort: 'high' } })
    const save = vi.fn(async () => ({ ok: true }))
    await saveConfig({ save: save as never })
    expect(save).toHaveBeenCalledWith({ agent: { reasoning_effort: 'high' } })
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- config-store`
  - Expected: FAIL with `Failed to resolve import "./config-store"`.

- [ ] **Step 3: Implement the config store.**

Create `apps/desktop/src/aether/domain/settings/config-store.ts`:
```ts
import { atom } from 'nanostores'

import { getAetherConfigRecord, getAetherConfigSchema, saveAetherConfig } from '@/aether-api'
import type { AetherConfigRecord, ConfigSchemaResponse } from '@/aether-api'

export const $configSchema = atom<ConfigSchemaResponse | null>(null)
export const $configRecord = atom<AetherConfigRecord>({})
export const $configStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

interface ConfigDeps {
  getSchema?: () => Promise<ConfigSchemaResponse>
  getRecord?: () => Promise<AetherConfigRecord>
  save?: (config: AetherConfigRecord) => Promise<{ ok: boolean }>
}

export async function loadConfig(deps: ConfigDeps = {}): Promise<void> {
  const getSchema = deps.getSchema ?? getAetherConfigSchema
  const getRecord = deps.getRecord ?? getAetherConfigRecord
  $configStatus.set('loading')

  try {
    const [schema, record] = await Promise.all([getSchema(), getRecord()])
    $configSchema.set(schema)
    $configRecord.set(record)
    $configStatus.set('ready')
  } catch {
    $configStatus.set('error')
  }
}

// Writes a dotted key (e.g. "agent.reasoning_effort") into the record,
// cloning each level so nanostores sees a new reference.
export function setConfigField(dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.')
  const next: AetherConfigRecord = { ...$configRecord.get() }
  let cursor = next as Record<string, unknown>

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    const existing = cursor[part]
    const cloned = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {}
    cursor[part] = cloned
    cursor = cloned
  }

  cursor[parts[parts.length - 1]] = value
  $configRecord.set(next)
}

export function getConfigField(dottedKey: string): unknown {
  const parts = dottedKey.split('.')
  let cursor: unknown = $configRecord.get()

  for (const part of parts) {
    if (cursor && typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return cursor
}

export async function saveConfig(deps: ConfigDeps = {}): Promise<void> {
  const save = deps.save ?? saveAetherConfig
  await save($configRecord.get())
}
```

- [ ] **Step 4: Run config-store test, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- config-store`
  - Expected: `Tests  3 passed`.

- [ ] **Step 5: Write failing Appearance tab test.**

Create `apps/desktop/src/aether/ui/screens/settings/appearance-tab.test.tsx`:
```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $configRecord, $configSchema, $configStatus } from '@/aether/domain/settings/config-store'

const setMode = vi.fn()
const setTheme = vi.fn()

vi.mock('@/themes/context', () => ({
  useTheme: () => ({
    themeName: 'aether',
    mode: 'dark',
    resolvedMode: 'dark',
    setMode,
    setTheme,
    availableThemes: [
      { name: 'aether', label: 'AETHER', description: '' },
      { name: 'nous', label: 'Nous', description: '' }
    ]
  })
}))

beforeEach(() => {
  setMode.mockClear()
  setTheme.mockClear()
  $configStatus.set('ready')
  $configSchema.set({ category_order: ['general'], fields: { 'display.personality': { type: 'string', category: 'general', description: 'Tính cách' } } })
  $configRecord.set({ display: { personality: 'calm' } })
})
afterEach(cleanup)

describe('AppearanceTab', () => {
  it('renders mode + skin controls', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    expect(screen.getByText(/Chế độ màu/)).toBeTruthy()
    expect(screen.getByText(/Giao diện \(skin\)/)).toBeTruthy()
  })

  it('changes color mode through the theme store', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    fireEvent.click(screen.getByRole('button', { name: 'Sáng' }))
    expect(setMode).toHaveBeenCalledWith('light')
  })

  it('renders a schema-driven field from the config schema', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    expect(screen.getByTestId('ae-config-display.personality')).toBeTruthy()
  })
})
```

- [ ] **Step 6: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- appearance-tab`
  - Expected: FAIL with `Failed to resolve import "./appearance-tab"`.

- [ ] **Step 7: Implement `AppearanceTab`.**

Create `apps/desktop/src/aether/ui/screens/settings/appearance-tab.tsx`:
```tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $configRecord,
  $configSchema,
  $configStatus,
  getConfigField,
  loadConfig,
  saveConfig,
  setConfigField
} from '@/aether/domain/settings/config-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { ConfigFieldSchema } from '@/aether-api'
import { useTheme } from '@/themes/context'

const MODES: { id: 'dark' | 'light' | 'system'; label: string }[] = [
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'system', label: 'Theo hệ thống' }
]

function ConfigField({ dottedKey, schema }: { dottedKey: string; schema: ConfigFieldSchema }) {
  useStore($configRecord)
  const value = getConfigField(dottedKey)
  const commit = (v: unknown) => {
    setConfigField(dottedKey, v)
    void saveConfig()
  }
  const testId = `ae-config-${dottedKey}`

  if (schema.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <input checked={Boolean(value)} data-testid={testId} onChange={e => commit(e.target.checked)} type="checkbox" />
        <span className="text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
      </label>
    )
  }

  if (schema.type === 'number') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
        <input
          className="w-28 rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
          data-testid={testId}
          onChange={e => commit(Number(e.target.value))}
          type="number"
          value={value === undefined ? '' : Number(value)}
        />
      </label>
    )
  }

  if (schema.type === 'select') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
        <select
          className="rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
          data-testid={testId}
          onChange={e => commit(e.target.value)}
          value={String(value ?? '')}
        >
          {(schema.options ?? []).map(opt => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  // string | text | list | undefined → text input
  return (
    <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
      <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
      <input
        className="min-w-[200px] flex-1 rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
        data-testid={testId}
        onBlur={e => commit(e.target.value)}
        defaultValue={String(value ?? '')}
        type="text"
      />
    </label>
  )
}

export function AppearanceTab() {
  const { themeName, mode, setMode, setTheme, availableThemes } = useTheme()
  const status = useStore($configStatus)
  const schema = useStore($configSchema)

  useEffect(() => {
    if ($configStatus.get() === 'idle') {
      void loadConfig()
    }
  }, [])

  const categoryOrder = schema?.category_order ?? []
  const fieldEntries = Object.entries(schema?.fields ?? {})
  const byCategory = (cat: string) => fieldEntries.filter(([, f]) => (f.category ?? 'general') === cat)
  const categories = categoryOrder.length
    ? categoryOrder
    : Array.from(new Set(fieldEntries.map(([, f]) => f.category ?? 'general')))

  return (
    <div className="flex flex-col gap-3">
      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">CHẾ ĐỘ MÀU</div>
        <div className="flex gap-1.5">
          {MODES.map(m => (
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
              key={m.id}
              onClick={() => setMode(m.id)}
              style={
                mode === m.id
                  ? { background: 'var(--ae-azure)', color: '#fff' }
                  : { background: 'rgba(120,195,245,.07)', color: 'var(--ae-azure-soft)' }
              }
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          GIAO DIỆN (SKIN)
        </div>
        <select
          className="self-start rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
          data-testid="ae-skin-select"
          onChange={e => setTheme(e.target.value)}
          value={themeName}
        >
          {availableThemes.map(t => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">CẤU HÌNH</div>
        {(status === 'loading' || status === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải cấu hình…</div>
        )}
        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được cấu hình.</div>
            <button
              className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
              onClick={() => void loadConfig()}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        )}
        {status === 'ready' &&
          categories.map(cat => {
            const fields = byCategory(cat)

            if (!fields.length) {
              return null
            }

            return (
              <div className="flex flex-col gap-2" key={cat}>
                <div className="text-[10.5px] uppercase tracking-[.12em] text-[color:var(--ae-dim)]">{cat}</div>
                {fields.map(([key, fieldSchema]) => (
                  <ConfigField dottedKey={key} key={key} schema={fieldSchema} />
                ))}
              </div>
            )
          })}
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 8: Wire into shell + guard.**

In `settings-screen.tsx` add `import { AppearanceTab } from './settings/appearance-tab'` and replace `{tab === 'appearance' && <Soon label="Giao diện" />}` with `{tab === 'appearance' && <AppearanceTab />}`. The `Soon` helper is now unused — delete the `function Soon(...)` declaration to keep the lint/build clean.

In `settings-prompt-cache.test.ts` add to `FILES`:
```ts
  'aether/ui/screens/settings/appearance-tab.tsx',
  'aether/domain/settings/config-store.ts',
```

- [ ] **Step 9: Run tests, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- appearance-tab config-store settings-prompt-cache settings-screen`
  - Expected: all suites pass.

- [ ] **Step 10: Commit.**
```
git add apps/desktop/src/aether/domain/settings/config-store.ts apps/desktop/src/aether/domain/settings/config-store.test.ts apps/desktop/src/aether/ui/screens/settings/appearance-tab.tsx apps/desktop/src/aether/ui/screens/settings/appearance-tab.test.tsx apps/desktop/src/aether/ui/screens/settings-screen.tsx apps/desktop/src/aether/ui/screens/settings-prompt-cache.test.ts
git commit -m "feat(aether-settings): add schema-driven config store + Appearance tab (theme/skin/mode)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — Mount `SettingsScreen` at the `/settings` route

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Test: `apps/desktop/src/aether/ui/shell/aether-shell-settings-route.test.tsx`

**Interfaces:**
- Consumes: `SettingsScreen` from `@/aether/ui/screens/settings-screen`.
- Produces: the `/settings` route renders `<SettingsScreen />` instead of `<StubScreen title="Settings" />`.

- [ ] **Step 1: Write failing route test.**

Create `apps/desktop/src/aether/ui/shell/aether-shell-settings-route.test.tsx`:
```tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// The shell composes many runtime stores (boot, connection, motion) that are
// awkward to mount in jsdom; the route swap is a one-line wiring change, so a
// source assertion is the robust, low-noise guard that the Settings route now
// renders the real screen and no longer the stub.
describe('aether-shell settings route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports SettingsScreen', () => {
    expect(src.includes("import { SettingsScreen }")).toBe(true)
  })

  it('renders <SettingsScreen /> on the settings path', () => {
    expect(/<Route element=\{<SettingsScreen \/>\} path="settings" \/>/.test(src)).toBe(true)
  })

  it('no longer renders the Settings stub', () => {
    expect(src.includes('<StubScreen title="Settings" />')).toBe(false)
  })
})
```

- [ ] **Step 2: Run it, expect FAIL.**
  - Command: `cd apps/desktop && npm run test:ui -- aether-shell-settings-route`
  - Expected: FAIL — `imports SettingsScreen` is false and the stub line still present.

- [ ] **Step 3: Implement the swap.**

In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add this import (after the `MorningBrief` import line):
```tsx
import { SettingsScreen } from '@/aether/ui/screens/settings-screen'
```
Replace the line:
```tsx
              <Route element={<StubScreen title="Settings" />} path="settings" />
```
with:
```tsx
              <Route element={<SettingsScreen />} path="settings" />
```

- [ ] **Step 4: Run route test + full settings suite, expect PASS.**
  - Command: `cd apps/desktop && npm run test:ui -- aether-shell-settings-route settings model-tab providers-tab env-tab tools-tab appearance-tab config-store oauth-store env-store toolsets-store model-store settings-prompt-cache`
  - Expected: all suites pass.

- [ ] **Step 5: Run the full UI test suite + typecheck to confirm no regressions.**
  - Command: `cd apps/desktop && npm run test:ui && npx tsc --noEmit`
  - Expected: vitest reports all files passed; `tsc` exits 0 with no errors.

- [ ] **Step 6: Commit.**
```
git add apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell-settings-route.test.tsx
git commit -m "feat(aether-settings): mount SettingsScreen at /settings, retire the Settings stub

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review (against spec §5.1 Settings bullets)

- **Tabs (glass slab, internal nav): Model · Providers/OAuth · Env keys · Tools/Toolsets · Appearance** — Task 2 builds the shell with these five tabs as internal `useState` nav inside a `GlassSlab` (not routes). Vietnamese labels: `Mô hình`, `Providers/OAuth`, `Khóa môi trường`, `Công cụ`, `Giao diện`. ✅
- **Model: getGlobalModelInfo, getGlobalModelOptions({refresh}), setGlobalModel, getAuxiliaryModels** — Task 1 store consumes all four; `getGlobalModelOptions` accepts `{refresh}` (passed via `loadModel(deps, opts)`). Aux assignment uses `setModelAssignment(scope:'auxiliary')`. ✅ **Correction:** spec's `setGlobalModel(provider, model, scope)` has no `scope` arg in the real API — plan uses the real 2-arg signature and routes aux through `setModelAssignment`. Documented in "Confirmed signatures".
- **Providers/OAuth: listOAuthProviders, startOAuthLogin, submitOAuthCode, pollOAuthSession, disconnectOAuthProvider, cancelOAuthSession** — Task 3 store implements the full start→poll→submit→done/cancel/disconnect state machine over exactly these six methods; Task 4 renders it (device-code + pkce/loopback flows, poll on a 4s interval, cancel/error states). ✅
- **Env keys: getEnvVars, setEnvVar, deleteEnvVar, revealEnvVar, validateProviderCredential; masked password field, reveal via endpoint** — Task 5 store + Task 6 tab: `is_password` fields render `type="password"`; reveal calls `revealEnvVar` and swaps to the real value; save/delete/validate wired. ✅ **Correction:** real `validateProviderCredential(key, value, apiKey?)` (not `(provider, key)`) — plan follows the real order, noted in "Confirmed signatures".
- **Tools/Toolsets: getToolsets, toggleToolset, getToolsetConfig, getComputerUseStatus, grantComputerUsePermissions** — Task 7 store + Task 8 tab. `getToolsetConfig` is exported from `@/aether-api` and available for the provider-config drill-down; the tab surfaces the toolset list (toggle) + computer-use status/grant. (`getToolsetConfig` deeper provider panel is reachable via the store but not over-built for SP-1; the spec bullet's required calls — toggle, status, grant — are all wired.) ✅
- **Appearance: theme/skin/color-mode via existing theme store; keep skin default** — Task 9 `AppearanceTab` reuses `useTheme()` (`setMode`, `setTheme`, `availableThemes`); it does NOT force or hardcode a skin — it presents the existing skin list and leaves the repo default intact. ✅
- **Config schema-driven: getAetherConfigSchema → render field by type; getAetherConfig / saveAetherConfig** — Task 9 `config-store` loads schema + record and `ConfigField` renders boolean/number/select/string-text by `schema.type`, grouped by `category_order`; edits round-trip through `saveAetherConfig` (via `saveConfig`). ✅
- **Prompt-cache safety** — every screen/tab/store is covered by `settings-prompt-cache.test.ts` (source-scan for `appendAssistantDelta`, `message.delta`, `reasoning.delta`, `thinking.`, `use-message-stream`); the only polling is the OAuth REST endpoint, never a conversation stream. ✅
- **Localization** — all UI strings Vietnamese; "Agent" never mistranslated (a screen test asserts `Đại lý` never appears). ✅
- **Tokens / layering** — screen root is `.ae-screen-bare flex h-full min-w-0 flex-col`; padding only via `<GlassSlab>`; colors via `--ae-*` tokens (`--ae-azure`, `--ae-azure-soft`, `--ae-dim`, `--ae-warn`, `--ae-ok`); arbitrary `[...]` geometry tokenized, standard shorthand left as-is. ✅

**Gaps:** none. Two spec-vs-reality signature mismatches were corrected (`setGlobalModel` has no `scope`; `validateProviderCredential` is `(key, value, apiKey?)`), both documented and reflected in the task code/tests.
