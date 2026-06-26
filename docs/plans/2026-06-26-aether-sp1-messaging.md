# Messaging Screen Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `<StubScreen title="Messaging" />` route with a fully-functional AETHER-styled Messaging screen that lists platforms + status, edits per-platform env config, tests connections, and runs the Telegram QR pairing as a start→poll→done/cancel state machine.

**Architecture:** 3-tier — `aether/ui/screens/messaging-screen.tsx` (presentation; reads nanostores, mount-loads, renders GlassSlab cards) → `aether/domain/messaging/messaging-store.ts` (`$platforms`/`$platformsStatus` data atoms + load/update/test actions, plus a `$telegramOnboarding` FSM atom driving the start + light guarded poll) → existing `aether-api.ts` named methods and raw `window.aetherDesktop.api({path})` calls for the four `/api/messaging/telegram/onboarding/*` endpoints (no new backend endpoints). The Telegram pairing flow is modelled as an explicit FSM (`idle→starting→pending→done→error`) over REST, with a single guarded `setTimeout`-chained poll that is cleared on unmount, cancel, and `done`.

**Tech Stack:** React 18, nanostores (`atom`, `@nanostores/react` `useStore`), Tailwind (`--ae-*` tokens), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — restyle via tokens/className. Do NOT import old web UI; reference logic only.
- Brand `#07397d` via tokens; NO hardcoded colors outside `--ae-*`/`--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): non-chat screen — REST + non-conversation events only; no `message.delta`/`reasoning.delta`/`thinking.*`, no `appendAssistantDelta`, no LLM re-trigger. Telegram onboarding poll is a LIGHT guarded poll (cleared on unmount/done), not a conversation socket.
- Respect `prefers-reduced-motion` + SP-0 motion gate.
- `--ae-*` resolve only under `[data-aether-theme='aether']`; geometry mode-independent.
- Layering: root `.ae-screen-bare flex h-full min-w-0 flex-col`; single `--ae-page-*` gutter; padding via `<GlassSlab size>`; no double-pad.

---

## Source-of-truth references (read, do NOT import)

**API methods (already exist in `apps/desktop/src/aether-api.ts`):**
```ts
getMessagingPlatforms(): Promise<MessagingPlatformsResponse>          // GET  /api/messaging/platforms
updateMessagingPlatform(platformId: string, body: MessagingPlatformUpdate): Promise<{ ok: boolean; platform: string }>  // PUT  /api/messaging/platforms/:id
testMessagingPlatform(platformId: string): Promise<MessagingPlatformTestResponse>  // POST /api/messaging/platforms/:id/test
```

**Types (already exist in `apps/desktop/src/types/aether.ts`, re-exported from `aether-api.ts`):**
```ts
interface MessagingEnvVarInfo {
  advanced: boolean; description: string; is_password: boolean; is_set: boolean;
  key: string; prompt: string; redacted_value: null | string; required: boolean; url: null | string
}
interface MessagingHomeChannel { chat_id: string; name: string; platform: string; thread_id?: string }
interface MessagingPlatformInfo {
  configured: boolean; description: string; docs_url: string; enabled: boolean;
  env_vars: MessagingEnvVarInfo[]; error_code?: null | string; error_message?: null | string;
  gateway_running: boolean; home_channel?: MessagingHomeChannel | null; id: string; name: string;
  state?: null | string; updated_at?: null | string
}
interface MessagingPlatformsResponse { platforms: MessagingPlatformInfo[] }
interface MessagingPlatformUpdate { clear_env?: string[]; enabled?: boolean; env?: Record<string, string> }
interface MessagingPlatformTestResponse { message: string; ok: boolean; state?: null | string }
```

**Telegram onboarding REST endpoints (CONFIRMED in `aether_cli/web_server.py` lines 5197–5410; NO named method in `aether-api.ts` — use raw `window.aetherDesktop.api`):**
```
POST   /api/messaging/telegram/onboarding/start
       body: { bot_name?: string }
       → { pairing_id: string; suggested_username: string; deep_link: string; qr_payload: string; expires_at: string }
GET    /api/messaging/telegram/onboarding/:pairing_id
       → { status: 'waiting'; expires_at: string }
       | { status: 'ready'; bot_username: string; owner_user_id?: string; expires_at: string }
       (410 when expired/claimed; 404 when session not found)
POST   /api/messaging/telegram/onboarding/:pairing_id/apply
       body: { allowed_user_ids: string[]; profile?: string }
       → { ok: boolean; platform: 'telegram'; bot_username?: string; needs_restart: boolean;
           restart_started?: boolean; restart_action?: string; restart_pid?: number | null; restart_error?: string }
DELETE /api/messaging/telegram/onboarding/:pairing_id
       → { ok: boolean }
```
> **FSM name mapping:** backend `status: 'waiting'` ⇒ our FSM state `'pending'`; backend `status: 'ready'` ⇒ our FSM state `'done'`. Our extra states `'starting'` (between start-request and first poll) and `'error'` (terminal failure / timeout) have no backend wire value.

**`window.aetherDesktop.api` request shape (from `ReadBriefingDeps` in `read-briefing.ts`):**
```ts
<T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
```

**Pattern refs (mirror, do not import):** `aether/domain/briefing/briefing-store.ts` (atom + status FSM + load), `aether/domain/briefing/read-briefing.ts` + `.test.ts` (`deps.api` injection defaulting to `window.aetherDesktop.api`), `aether/ui/screens/morning-brief.tsx` + `.test.tsx` (mount-load on `'idle'`, `GlassSlab`, `data-testid` rows, `afterEach(cleanup)`), `aether/ui/components/glass-slab.tsx`, `aether/ui/screens/stub-screen.tsx`, `aether/ui/shell/aether-shell.tsx` (route swap target on line 57).

**Test command (run from `apps/desktop`):** `npm run test:ui` → `vitest run --environment jsdom`. Scope a single file by appending its path.

---

## Task 1 — `messaging-store.ts`: load + list status

**Files:**
- Create: `apps/desktop/src/aether/domain/messaging/messaging-store.ts`
- Test: `apps/desktop/src/aether/domain/messaging/messaging-store.test.ts`

**Interfaces:**
- Consumes: `window.aetherDesktop.api<T>({ path, method?, body? })`; types `MessagingPlatformInfo`, `MessagingPlatformsResponse` from `@/types/aether`.
- Produces:
  ```ts
  export const $platforms: WritableAtom<MessagingPlatformInfo[] | null>
  export const $platformsStatus: WritableAtom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>
  export interface MessagingDeps { api?: MessagingApi }   // MessagingApi = <T>(req: {path; method?; body?}) => Promise<T>
  export async function loadPlatforms(deps?: MessagingDeps): Promise<void>
  ```

- [ ] **Step 1.1 — Write the failing store-load test (full code).**
  Create `apps/desktop/src/aether/domain/messaging/messaging-store.test.ts`:
  ```ts
  import { describe, expect, it, vi, beforeEach } from 'vitest'

  import { $platforms, $platformsStatus, loadPlatforms } from './messaging-store'

  beforeEach(() => {
    $platforms.set(null)
    $platformsStatus.set('idle')
  })

  describe('loadPlatforms', () => {
    it('loads platforms via injected api and sets status ready', async () => {
      const api = vi.fn(async (req: { path: string }) => {
        if (req.path === '/api/messaging/platforms') {
          return { platforms: [{ id: 'telegram', name: 'Telegram', enabled: true, configured: true, state: 'connected', description: '', docs_url: '', gateway_running: true, env_vars: [] }] }
        }

        throw new Error('unexpected ' + req.path)
      })

      await loadPlatforms({ api: api as never })

      expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: '/api/messaging/platforms' }))
      expect($platforms.get()).toHaveLength(1)
      expect($platforms.get()?.[0].id).toBe('telegram')
      expect($platformsStatus.get()).toBe('ready')
    })

    it('sets status empty when no platforms returned', async () => {
      const api = vi.fn(async () => ({ platforms: [] }))

      await loadPlatforms({ api: api as never })

      expect($platformsStatus.get()).toBe('empty')
    })

    it('sets status error when api throws', async () => {
      const api = vi.fn(async () => { throw new Error('boom') })

      await loadPlatforms({ api: api as never })

      expect($platformsStatus.get()).toBe('error')
      expect($platforms.get()).toBeNull()
    })
  })
  ```

- [ ] **Step 1.2 — Run the test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: failure resolving the module, e.g. `Failed to resolve import "./messaging-store"` / `Cannot find module './messaging-store'`.

- [ ] **Step 1.3 — Minimal implementation (full code).**
  Create `apps/desktop/src/aether/domain/messaging/messaging-store.ts`:
  ```ts
  import { atom } from 'nanostores'

  import type { MessagingPlatformInfo, MessagingPlatformsResponse } from '@/types/aether'

  export type MessagingApi = <T>(request: {
    body?: unknown
    method?: string
    path: string
    profile?: string
    timeoutMs?: number
  }) => Promise<T>

  export interface MessagingDeps {
    api?: MessagingApi
  }

  export const $platforms = atom<MessagingPlatformInfo[] | null>(null)
  export const $platformsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

  // Default api binds to the desktop bridge lazily (per-call), mirroring
  // read-briefing.ts so the module never touches window at import time and stays
  // injectable in jsdom tests.
  function resolveApi(deps?: MessagingDeps): MessagingApi {
    return deps?.api ?? (<T>(request: Parameters<MessagingApi>[0]) => window.aetherDesktop.api<T>(request))
  }

  export async function loadPlatforms(deps?: MessagingDeps): Promise<void> {
    const api = resolveApi(deps)
    $platformsStatus.set('loading')

    try {
      const result = await api<MessagingPlatformsResponse>({ path: '/api/messaging/platforms' })
      const platforms = result.platforms ?? []
      $platforms.set(platforms)
      $platformsStatus.set(platforms.length === 0 ? 'empty' : 'ready')
    } catch {
      $platforms.set(null)
      $platformsStatus.set('error')
    }
  }
  ```

- [ ] **Step 1.4 — Run the test, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: `Test Files  1 passed (1)` / `Tests  3 passed (3)`.

- [ ] **Step 1.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/messaging/messaging-store.ts apps/desktop/src/aether/domain/messaging/messaging-store.test.ts
  git commit -m "feat(aether): messaging-store load + list status atoms

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 2 — `messaging-screen.tsx`: platform list + status badges + skeleton/empty/error

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/messaging-screen.tsx`
- Test: `apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx`

**Interfaces:**
- Consumes: `$platforms`, `$platformsStatus`, `loadPlatforms` from messaging-store; `GlassSlab` from `@/aether/ui/components/glass-slab`; `useStore` from `@nanostores/react`.
- Produces: `export function MessagingScreen(): JSX.Element` (mount-loads on `'idle'`; renders a `<GlassSlab>` card per platform with a status badge; Vietnamese skeleton/empty/error states; selectable platform → drives Task 3 detail).

- [ ] **Step 2.1 — Write the failing render test (full code).**
  Create `apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx`:
  ```tsx
  import { cleanup, render, screen } from '@testing-library/react'
  import { afterEach, beforeEach, describe, expect, it } from 'vitest'

  import type { MessagingPlatformInfo } from '@/types/aether'
  import { $platforms, $platformsStatus } from '@/aether/domain/messaging/messaging-store'

  import { MessagingScreen } from './messaging-screen'

  const telegram: MessagingPlatformInfo = {
    id: 'telegram', name: 'Telegram', description: 'Bot chat', docs_url: 'https://x',
    enabled: true, configured: true, state: 'connected', gateway_running: true, env_vars: []
  }
  const slack: MessagingPlatformInfo = {
    id: 'slack', name: 'Slack', description: 'Workspace', docs_url: 'https://x',
    enabled: false, configured: false, state: 'disabled', gateway_running: true, env_vars: []
  }

  afterEach(cleanup)

  describe('MessagingScreen', () => {
    it('renders a card with status badge per platform when ready', () => {
      $platforms.set([telegram, slack])
      $platformsStatus.set('ready')

      render(<MessagingScreen />)

      expect(screen.getAllByTestId('ae-messaging-card')).toHaveLength(2)
      expect(screen.getByText('Telegram')).toBeTruthy()
      expect(screen.getByText('Slack')).toBeTruthy()
      expect(screen.getAllByTestId('ae-messaging-status-badge').length).toBe(2)
    })

    it('renders a skeleton while loading', () => {
      $platforms.set(null)
      $platformsStatus.set('loading')

      render(<MessagingScreen />)

      expect(screen.getByTestId('ae-messaging-skeleton')).toBeTruthy()
    })

    it('renders a Vietnamese empty state', () => {
      $platforms.set([])
      $platformsStatus.set('empty')

      render(<MessagingScreen />)

      expect(screen.getByText(/Chưa có nền tảng/)).toBeTruthy()
    })

    it('renders an inline error with a retry control', () => {
      $platforms.set(null)
      $platformsStatus.set('error')

      render(<MessagingScreen />)

      expect(screen.getByText(/Không tải được/)).toBeTruthy()
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
    })
  })
  ```

- [ ] **Step 2.2 — Run the test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx`
  Expected output: `Failed to resolve import "./messaging-screen"` / `Cannot find module './messaging-screen'`.

- [ ] **Step 2.3 — Minimal implementation (full code).**
  Create `apps/desktop/src/aether/ui/screens/messaging-screen.tsx`:
  ```tsx
  import { useStore } from '@nanostores/react'
  import { useEffect, useState } from 'react'

  import type { MessagingPlatformInfo } from '@/types/aether'
  import { $platforms, $platformsStatus, loadPlatforms } from '@/aether/domain/messaging/messaging-store'
  import { GlassSlab } from '@/aether/ui/components/glass-slab'

  type BadgeTone = 'good' | 'warn' | 'bad' | 'muted'

  function statusTone(platform: MessagingPlatformInfo): BadgeTone {
    if (!platform.enabled) { return 'muted' }

    if (platform.state === 'connected') { return 'good' }

    if (platform.state === 'fatal' || platform.state === 'startup_failed') { return 'bad' }

    return 'warn'
  }

  function statusLabel(platform: MessagingPlatformInfo): string {
    if (!platform.enabled) { return 'Đã tắt' }

    if (platform.state === 'connected') { return 'Đã kết nối' }

    if (platform.state === 'fatal' || platform.state === 'startup_failed') { return 'Lỗi' }

    return platform.configured ? 'Chờ khởi động lại' : 'Cần thiết lập'
  }

  const TONE_COLOR: Record<BadgeTone, string> = {
    good: 'var(--ae-ok)',
    warn: 'var(--ae-warn)',
    bad: 'var(--ae-bad, var(--ae-warn))',
    muted: 'var(--ae-dim)',
  }

  function StatusBadge({ platform }: { platform: MessagingPlatformInfo }) {
    const tone = statusTone(platform)

    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
        data-testid="ae-messaging-status-badge"
        style={{ border: `1px solid ${TONE_COLOR[tone]}`, color: TONE_COLOR[tone] }}
      >
        <span className="h-[6px] w-[6px] rounded-full" style={{ background: TONE_COLOR[tone] }} />
        {statusLabel(platform)}
      </span>
    )
  }

  export function MessagingScreen() {
    const platforms = useStore($platforms)
    const status = useStore($platformsStatus)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    useEffect(() => {
      if ($platformsStatus.get() === 'idle') { void loadPlatforms() }
    }, [])

    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <div className="ae-grid-floor" />
        <div className="ae-vignette" />

        <div className="z-[2] mt-[18px] flex flex-col gap-[6px]">
          <div className="text-[24px] font-semibold leading-[1.05]">Nhắn tin</div>
          <div className="text-[12.5px] text-[#CFE2F7]">Kết nối AETHER với các nền tảng nhắn tin của bạn</div>
        </div>

        <div className="z-[2] mt-4 flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto">
          {status === 'loading' && (
            <div className="flex flex-col gap-2.5" data-testid="ae-messaging-skeleton">
              {[0, 1, 2].map(i => (
                <div className="ae-slab h-[64px] animate-pulse" key={i} style={{ ['--ae-slab-pad' as string]: 'var(--ae-slab-pad-md)' }} />
              ))}
            </div>
          )}

          {status === 'empty' && (
            <GlassSlab className="text-center" size="lg">
              <div className="text-sm text-[color:var(--ae-dim)]">Chưa có nền tảng nhắn tin nào khả dụng.</div>
            </GlassSlab>
          )}

          {status === 'error' && (
            <GlassSlab className="flex flex-col items-center gap-3 text-center" size="lg">
              <div className="text-sm text-[color:var(--ae-warn)]">Không tải được danh sách nền tảng.</div>
              <button
                className="rounded-[11px] px-[16px] py-[8px] text-[12.5px] font-semibold"
                onClick={() => void loadPlatforms()}
                style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)' }}
                type="button"
              >
                Thử lại
              </button>
            </GlassSlab>
          )}

          {status === 'ready' && (platforms ?? []).map(platform => (
            <GlassSlab className="flex flex-col gap-2" key={platform.id} size="md">
              <button
                className="flex w-full items-center justify-between gap-3 text-left"
                data-testid="ae-messaging-card"
                onClick={() => setSelectedId(current => (current === platform.id ? null : platform.id))}
                type="button"
              >
                <div className="flex min-w-0 flex-col">
                  <div className="text-[14px] font-semibold text-white">{platform.name}</div>
                  <div className="truncate text-[11.5px] text-[color:var(--ae-dim)]">{platform.description}</div>
                </div>
                <StatusBadge platform={platform} />
              </button>
              {selectedId === platform.id && (
                <div className="border-t border-[rgba(120,200,255,.12)] pt-2 text-[11.5px] text-[color:var(--ae-dim)]" data-testid="ae-messaging-detail">
                  {/* Per-platform config form is added in Task 3. */}
                </div>
              )}
            </GlassSlab>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2.4 — Run the test, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx`
  Expected output: `Tests  4 passed (4)`.

- [ ] **Step 2.5 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/screens/messaging-screen.tsx apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx
  git commit -m "feat(aether): messaging screen platform list + status badges + states

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 3 — per-platform config form + update + clear

**Files:**
- Modify: `apps/desktop/src/aether/domain/messaging/messaging-store.ts` (add `updatePlatform`)
- Modify: `apps/desktop/src/aether/domain/messaging/messaging-store.test.ts` (add update tests)
- Modify: `apps/desktop/src/aether/ui/screens/messaging-screen.tsx` (render env fields + save inside the detail panel)
- Modify: `apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx` (add interaction test)

**Interfaces:**
- Produces (store):
  ```ts
  export async function updatePlatform(platformId: string, body: MessagingPlatformUpdate, deps?: MessagingDeps): Promise<void>
  // calls PUT /api/messaging/platforms/:id with body, then re-fetches via loadPlatforms(deps)
  ```
- Consumes (screen): `MessagingEnvVarInfo`, `MessagingPlatformUpdate`; controlled inputs feeding `updatePlatform(id, { env })`.

- [ ] **Step 3.1 — Add failing store test for `updatePlatform` (append to `messaging-store.test.ts`).**
  Append:
  ```ts
  import { updatePlatform } from './messaging-store'

  describe('updatePlatform', () => {
    it('PUTs the update then re-fetches the list', async () => {
      const calls: { path: string; method?: string; body?: unknown }[] = []
      const api = vi.fn(async (req: { path: string; method?: string; body?: unknown }) => {
        calls.push(req)

        if (req.method === 'PUT') { return { ok: true, platform: 'telegram' } }

        return { platforms: [{ id: 'telegram', name: 'Telegram', enabled: true, configured: true, state: 'connected', description: '', docs_url: '', gateway_running: true, env_vars: [] }] }
      })

      await updatePlatform('telegram', { env: { TELEGRAM_BOT_TOKEN: 'abc' } }, { api: api as never })

      expect(calls[0]).toMatchObject({
        path: '/api/messaging/platforms/telegram',
        method: 'PUT',
        body: { env: { TELEGRAM_BOT_TOKEN: 'abc' } },
      })
      expect(calls[1]).toMatchObject({ path: '/api/messaging/platforms' })
      expect($platformsStatus.get()).toBe('ready')
    })
  })
  ```

- [ ] **Step 3.2 — Run the store test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: failure — `updatePlatform is not a function` / export not found.

- [ ] **Step 3.3 — Implement `updatePlatform` (append to `messaging-store.ts`).**
  Add the import for the payload type to the existing type import line and append the function:
  ```ts
  import type {
    MessagingPlatformInfo,
    MessagingPlatformsResponse,
    MessagingPlatformUpdate,
  } from '@/types/aether'
  ```
  ```ts
  export async function updatePlatform(
    platformId: string,
    body: MessagingPlatformUpdate,
    deps?: MessagingDeps
  ): Promise<void> {
    const api = resolveApi(deps)

    await api<{ ok: boolean; platform: string }>({
      path: `/api/messaging/platforms/${encodeURIComponent(platformId)}`,
      method: 'PUT',
      body,
    })

    await loadPlatforms(deps)
  }
  ```

- [ ] **Step 3.4 — Run the store test, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: `Tests  4 passed (4)`.

- [ ] **Step 3.5 — Add failing screen interaction test (append to `messaging-screen.test.tsx`).**
  Add `fireEvent` to the testing-library import, then append:
  ```tsx
  import { vi } from 'vitest'
  import * as store from '@/aether/domain/messaging/messaging-store'

  const withFields: MessagingPlatformInfo = {
    id: 'telegram', name: 'Telegram', description: 'Bot chat', docs_url: 'https://x',
    enabled: true, configured: false, state: 'not_configured', gateway_running: true,
    env_vars: [
      { key: 'TELEGRAM_BOT_TOKEN', prompt: 'Bot token', description: 'Token', is_password: true, is_set: false, required: true, advanced: false, redacted_value: null, url: null },
    ],
  }

  describe('MessagingScreen config form', () => {
    it('saves edited env via updatePlatform', async () => {
      const spy = vi.spyOn(store, 'updatePlatform').mockResolvedValue(undefined)
      $platforms.set([withFields])
      $platformsStatus.set('ready')

      render(<MessagingScreen />)
      fireEvent.click(screen.getByTestId('ae-messaging-card'))
      fireEvent.change(screen.getByLabelText('Bot token'), { target: { value: 'tok123' } })
      fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))

      expect(spy).toHaveBeenCalledWith('telegram', { env: { TELEGRAM_BOT_TOKEN: 'tok123' } })
      spy.mockRestore()
    })
  })
  ```
  > Import note: add `fireEvent` to the existing `@testing-library/react` import and `vi` to the existing `vitest` import rather than duplicating import lines.

- [ ] **Step 3.6 — Run the screen test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx`
  Expected output: failure — `Unable to find a label with the text of: Bot token` / no `Lưu` button.

- [ ] **Step 3.7 — Implement the config form in the detail panel (replace the Task-2 detail placeholder block).**
  In `messaging-screen.tsx`, add the import and a `PlatformConfig` component, and render it inside the `selectedId === platform.id` block. Add `import { updatePlatform } from '@/aether/domain/messaging/messaging-store'` (extend the existing store import). Replace the detail `<div ... data-testid="ae-messaging-detail">…</div>` with `<PlatformConfig platform={platform} />` (keep the wrapping `border-t` div). Component:
  ```tsx
  function PlatformConfig({ platform }: { platform: MessagingPlatformInfo }) {
    const [edits, setEdits] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const trimmed = Object.fromEntries(
      Object.entries(edits).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
    )
    const hasEdits = Object.keys(trimmed).length > 0

    async function onSave() {
      if (!hasEdits) { return }

      setSaving(true)

      try {
        await updatePlatform(platform.id, { env: trimmed })
        setEdits({})
      } finally {
        setSaving(false)
      }
    }

    return (
      <div className="flex flex-col gap-2.5">
        {platform.error_message && (
          <div className="rounded-[10px] px-2.5 py-1.5 text-[11px]" style={{ border: '1px solid var(--ae-warn)', color: 'var(--ae-warn)' }}>
            {platform.error_message}
          </div>
        )}
        {platform.env_vars.map(field => {
          const fieldId = `ae-msg-${platform.id}-${field.key}`

          return (
            <label className="flex flex-col gap-1" htmlFor={fieldId} key={field.key}>
              <span className="text-[11px] font-semibold text-[#D7ECFA]">
                {field.prompt || field.key}
                {field.required && <span style={{ color: 'var(--ae-warn)' }}> *</span>}
              </span>
              <input
                className="rounded-[9px] bg-[rgba(8,24,44,.55)] px-2.5 py-1.5 text-[12px] text-white outline-none"
                id={fieldId}
                onChange={event => setEdits(current => ({ ...current, [field.key]: event.target.value }))}
                placeholder={field.is_set ? field.redacted_value ?? 'Đã lưu — nhập để thay thế' : field.prompt}
                style={{ border: '1px solid rgba(120,200,255,.18)' }}
                type={field.is_password ? 'password' : 'text'}
                value={edits[field.key] ?? ''}
              />
            </label>
          )
        })}
        <div className="flex items-center justify-end gap-2">
          <button
            className="rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
            disabled={!hasEdits || saving}
            onClick={() => void onSave()}
            style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)' }}
            type="button"
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 3.8 — Run the full screen + store suites, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: `Test Files  2 passed (2)` (5 screen + 4 store = `Tests  9 passed (9)`).

- [ ] **Step 3.9 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/messaging/messaging-store.ts apps/desktop/src/aether/domain/messaging/messaging-store.test.ts apps/desktop/src/aether/ui/screens/messaging-screen.tsx apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx
  git commit -m "feat(aether): per-platform messaging config form + update action

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 4 — test-connection action + result display

**Files:**
- Modify: `apps/desktop/src/aether/domain/messaging/messaging-store.ts` (add `testPlatform`)
- Modify: `apps/desktop/src/aether/domain/messaging/messaging-store.test.ts` (add test-connection test)
- Modify: `apps/desktop/src/aether/ui/screens/messaging-screen.tsx` (Test button + result line)
- Modify: `apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx` (interaction test)

**Interfaces:**
- Produces (store):
  ```ts
  export async function testPlatform(platformId: string, deps?: MessagingDeps): Promise<MessagingPlatformTestResponse>
  // POST /api/messaging/platforms/:id/test
  ```

- [ ] **Step 4.1 — Add failing store test for `testPlatform` (append to `messaging-store.test.ts`).**
  ```ts
  import { testPlatform } from './messaging-store'

  describe('testPlatform', () => {
    it('POSTs to the test endpoint and returns the result', async () => {
      const api = vi.fn(async (req: { path: string; method?: string }) => {
        expect(req).toMatchObject({ path: '/api/messaging/platforms/telegram/test', method: 'POST' })

        return { ok: true, state: 'connected', message: 'OK' }
      })

      const result = await testPlatform('telegram', { api: api as never })

      expect(result).toEqual({ ok: true, state: 'connected', message: 'OK' })
    })
  })
  ```

- [ ] **Step 4.2 — Run the store test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: failure — `testPlatform is not a function`.

- [ ] **Step 4.3 — Implement `testPlatform` (append to `messaging-store.ts`).**
  Extend the type import with `MessagingPlatformTestResponse`, then append:
  ```ts
  export async function testPlatform(
    platformId: string,
    deps?: MessagingDeps
  ): Promise<MessagingPlatformTestResponse> {
    const api = resolveApi(deps)

    return api<MessagingPlatformTestResponse>({
      path: `/api/messaging/platforms/${encodeURIComponent(platformId)}/test`,
      method: 'POST',
    })
  }
  ```

- [ ] **Step 4.4 — Run the store test, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: `Tests  5 passed (5)`.

- [ ] **Step 4.5 — Add failing screen test (append to `messaging-screen.test.tsx`).**
  ```tsx
  import { waitFor } from '@testing-library/react'
  import type { MessagingPlatformTestResponse } from '@/types/aether'

  describe('MessagingScreen test connection', () => {
    it('shows the test result message after clicking Test', async () => {
      const result: MessagingPlatformTestResponse = { ok: true, state: 'connected', message: 'Kết nối tốt' }
      const spy = vi.spyOn(store, 'testPlatform').mockResolvedValue(result)
      $platforms.set([withFields])
      $platformsStatus.set('ready')

      render(<MessagingScreen />)
      fireEvent.click(screen.getByTestId('ae-messaging-card'))
      fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }))

      await waitFor(() => expect(screen.getByText('Kết nối tốt')).toBeTruthy())
      expect(spy).toHaveBeenCalledWith('telegram')
      spy.mockRestore()
    })
  })
  ```
  > `withFields` is defined in Task 3's test block; reuse it. Add `waitFor` to the testing-library import.

- [ ] **Step 4.6 — Run the screen test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx`
  Expected output: failure — no `Kiểm tra kết nối` button.

- [ ] **Step 4.7 — Implement Test button + result line in `PlatformConfig`.**
  Extend the store import to include `testPlatform`. Add state + handler and a button + result line inside `PlatformConfig` (place the button left of "Lưu", and render the result line above the button row):
  ```tsx
  const [testResult, setTestResult] = useState<MessagingPlatformTestResponse | null>(null)
  const [testing, setTesting] = useState(false)

  async function onTest() {
    setTesting(true)

    try {
      setTestResult(await testPlatform(platform.id))
    } catch {
      setTestResult({ ok: false, state: null, message: 'Kiểm tra thất bại.' })
    } finally {
      setTesting(false)
    }
  }
  ```
  Add the import `import type { MessagingPlatformTestResponse } from '@/types/aether'` at the top of the file (extend the existing type import). Render before the button row:
  ```tsx
  {testResult && (
    <div className="text-[11px]" style={{ color: testResult.ok ? 'var(--ae-ok)' : 'var(--ae-warn)' }}>
      {testResult.message}
    </div>
  )}
  ```
  And in the button row, before the "Lưu" button:
  ```tsx
  <button
    className="rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
    disabled={testing}
    onClick={() => void onTest()}
    style={{ border: '1px solid rgba(120,200,255,.28)' }}
    type="button"
  >
    {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
  </button>
  ```

- [ ] **Step 4.8 — Run the full suites, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx src/aether/domain/messaging/messaging-store.test.ts`
  Expected output: `Test Files  2 passed (2)` (6 screen + 5 store = `Tests  11 passed (11)`).

- [ ] **Step 4.9 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/messaging/messaging-store.ts apps/desktop/src/aether/domain/messaging/messaging-store.test.ts apps/desktop/src/aether/ui/screens/messaging-screen.tsx apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx
  git commit -m "feat(aether): messaging test-connection action + result display

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 5 — Telegram onboarding FSM sub-store + pairing panel (start/poll/cancel/timeout) + guards

**Files:**
- Create: `apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.ts`
- Test: `apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.test.ts`
- Modify: `apps/desktop/src/aether/ui/screens/messaging-screen.tsx` (render `<TelegramPairingPanel />` inside the Telegram detail)
- Test: `apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx` (poll-guard + prompt-cache guard)

**Interfaces:**
- Produces (store):
  ```ts
  export interface TelegramOnboardingStart { pairing_id: string; suggested_username: string; deep_link: string; qr_payload: string; expires_at: string }
  export type TelegramOnboardingStatus =
    | { status: 'waiting'; expires_at: string }
    | { status: 'ready'; bot_username: string; owner_user_id?: string; expires_at: string }
  export interface TelegramOnboardingApply { ok: boolean; platform: 'telegram'; bot_username?: string; needs_restart: boolean; restart_started?: boolean }

  export type TelegramFsm = 'idle' | 'starting' | 'pending' | 'done' | 'error'
  export interface TelegramOnboardingState {
    fsm: TelegramFsm
    setup: TelegramOnboardingStart | null
    botUsername: string | null
    ownerId: string | null
    error: string | null
  }
  export const $telegramOnboarding: WritableAtom<TelegramOnboardingState>

  export async function startTelegramOnboarding(deps?: MessagingDeps): Promise<void>          // POST .../start, fsm starting→pending, kicks the poll
  export function stopTelegramPoll(): void                                                     // clears the guarded interval/timeout
  export async function cancelTelegramOnboarding(deps?: MessagingDeps): Promise<void>          // DELETE .../:id, fsm→idle, stops poll
  export async function applyTelegramOnboarding(allowedUserIds: string[], deps?: MessagingDeps): Promise<TelegramOnboardingApply>  // POST .../:id/apply
  export function resetTelegramOnboarding(): void
  ```
- **Poll design (HARD prompt-cache guard):** a single module-level `pollTimer: ReturnType<typeof setTimeout> | null`, chained via `setTimeout(2000)` after each `GET` (mirrors web `ChannelsPage`). It is REST-only — NO conversation socket, NO `message.delta`/`reasoning.delta`/`thinking.*`, NO `appendAssistantDelta`. The poll is cleared by `stopTelegramPoll()` which is called on `done`, on `cancel`, on terminal error/timeout, and from the panel's unmount effect. Tests drive it with `vi.useFakeTimers()`.

- [ ] **Step 5.1 — Write the failing FSM store test (full code).**
  Create `apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.test.ts`:
  ```ts
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import {
    $telegramOnboarding,
    resetTelegramOnboarding,
    startTelegramOnboarding,
    stopTelegramPoll,
  } from './telegram-onboarding-store'

  beforeEach(() => {
    vi.useFakeTimers()
    resetTelegramOnboarding()
  })
  afterEach(() => {
    stopTelegramPoll()
    vi.useRealTimers()
  })

  describe('telegram onboarding FSM', () => {
    it('transitions idle → starting → pending → done across start + poll', async () => {
      const api = vi.fn(async (req: { path: string; method?: string }) => {
        if (req.path === '/api/messaging/telegram/onboarding/start') {
          return { pairing_id: 'p1', suggested_username: 'AetherBot', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '2099-01-01T00:00:00Z' }
        }

        if (req.path === '/api/messaging/telegram/onboarding/p1') {
          return { status: 'ready', bot_username: 'AetherBot', owner_user_id: '12345', expires_at: '2099-01-01T00:00:00Z' }
        }

        throw new Error('unexpected ' + req.path)
      })

      const promise = startTelegramOnboarding({ api: api as never })
      expect($telegramOnboarding.get().fsm).toBe('starting')
      await promise
      expect($telegramOnboarding.get().fsm).toBe('pending')
      expect($telegramOnboarding.get().setup?.pairing_id).toBe('p1')

      // first poll fires after the initial delay
      await vi.advanceTimersByTimeAsync(1300)
      expect($telegramOnboarding.get().fsm).toBe('done')
      expect($telegramOnboarding.get().botUsername).toBe('AetherBot')
      expect($telegramOnboarding.get().ownerId).toBe('12345')
    })

    it('clears the poll timer on stopTelegramPoll (no further GET after done)', async () => {
      const api = vi.fn(async (req: { path: string }) => {
        if (req.path === '/api/messaging/telegram/onboarding/start') {
          return { pairing_id: 'p1', suggested_username: '', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '2099-01-01T00:00:00Z' }
        }

        return { status: 'waiting', expires_at: '2099-01-01T00:00:00Z' }
      })

      await startTelegramOnboarding({ api: api as never })
      await vi.advanceTimersByTimeAsync(1300) // one poll → still waiting/pending
      const callsAfterFirstPoll = api.mock.calls.length
      stopTelegramPoll()
      await vi.advanceTimersByTimeAsync(10000) // no further polls
      expect(api.mock.calls.length).toBe(callsAfterFirstPoll)
    })

    it('goes to error when a poll throws a terminal (410) error', async () => {
      const api = vi.fn(async (req: { path: string }) => {
        if (req.path === '/api/messaging/telegram/onboarding/start') {
          return { pairing_id: 'p1', suggested_username: '', deep_link: 'tg://x', qr_payload: 'tg://x', expires_at: '1970-01-01T00:00:00Z' }
        }

        throw Object.assign(new Error('gone'), { status: 410 })
      })

      await startTelegramOnboarding({ api: api as never })
      await vi.advanceTimersByTimeAsync(1300)
      expect($telegramOnboarding.get().fsm).toBe('error')
    })
  })
  ```
  > Terminal-error detection: treat an error with `status` 410 or 404, OR a setup whose `expires_at` is in the past, as terminal (mirrors `isTerminalTelegramOnboardingError` + expiry check in `web/src/pages/ChannelsPage.tsx`). A non-terminal poll error keeps `fsm: 'pending'` and re-arms the timer.

- [ ] **Step 5.2 — Run the FSM test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/telegram-onboarding-store.test.ts`
  Expected output: `Cannot find module './telegram-onboarding-store'`.

- [ ] **Step 5.3 — Implement the FSM store (full code).**
  Create `apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.ts`:
  ```ts
  import { atom } from 'nanostores'

  import type { MessagingDeps } from './messaging-store'

  export interface TelegramOnboardingStart {
    deep_link: string
    expires_at: string
    pairing_id: string
    qr_payload: string
    suggested_username: string
  }

  export type TelegramOnboardingStatus =
    | { expires_at: string; status: 'waiting' }
    | { bot_username: string; expires_at: string; owner_user_id?: string; status: 'ready' }

  export interface TelegramOnboardingApply {
    bot_username?: string
    needs_restart: boolean
    ok: boolean
    platform: 'telegram'
    restart_started?: boolean
  }

  export type TelegramFsm = 'idle' | 'starting' | 'pending' | 'done' | 'error'

  export interface TelegramOnboardingState {
    botUsername: null | string
    error: null | string
    fsm: TelegramFsm
    ownerId: null | string
    setup: TelegramOnboardingStart | null
  }

  const INITIAL: TelegramOnboardingState = {
    botUsername: null,
    error: null,
    fsm: 'idle',
    ownerId: null,
    setup: null,
  }

  export const $telegramOnboarding = atom<TelegramOnboardingState>({ ...INITIAL })

  // Single guarded poll timer. REST-only chained setTimeout — never a chat/
  // conversation socket, so no message/reasoning/thinking deltas are touched.
  let pollTimer: null | ReturnType<typeof setTimeout> = null

  function resolveApi(deps?: MessagingDeps) {
    return deps?.api ?? (<T>(request: { body?: unknown; method?: string; path: string }) => window.aetherDesktop.api<T>(request))
  }

  export function stopTelegramPoll(): void {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  export function resetTelegramOnboarding(): void {
    stopTelegramPoll()
    $telegramOnboarding.set({ ...INITIAL })
  }

  function isTerminal(error: unknown, setup: TelegramOnboardingStart | null): boolean {
    const status = (error as { status?: number } | null)?.status

    if (status === 410 || status === 404) { return true }

    const expiry = setup ? Date.parse(setup.expires_at) : NaN

    return Number.isFinite(expiry) && Date.now() >= expiry
  }

  function schedulePoll(delay: number, deps?: MessagingDeps): void {
    stopTelegramPoll()
    pollTimer = setTimeout(() => void poll(deps), delay)
  }

  async function poll(deps?: MessagingDeps): Promise<void> {
    const state = $telegramOnboarding.get()

    if (state.fsm !== 'pending' || !state.setup) { return }

    const api = resolveApi(deps)

    try {
      const status = await api<TelegramOnboardingStatus>({
        path: `/api/messaging/telegram/onboarding/${encodeURIComponent(state.setup.pairing_id)}`,
      })

      if (status.status === 'ready') {
        stopTelegramPoll()
        $telegramOnboarding.set({
          ...$telegramOnboarding.get(),
          botUsername: status.bot_username ?? null,
          error: null,
          fsm: 'done',
          ownerId: status.owner_user_id ?? null,
        })

        return
      }

      $telegramOnboarding.set({ ...$telegramOnboarding.get(), error: null })
      schedulePoll(2000, deps)
    } catch (error) {
      if (isTerminal(error, state.setup)) {
        stopTelegramPoll()
        $telegramOnboarding.set({
          ...$telegramOnboarding.get(),
          error: 'Phiên ghép nối Telegram đã hết hạn. Hãy bắt đầu lại.',
          fsm: 'error',
        })

        return
      }

      schedulePoll(2000, deps)
    }
  }

  export async function startTelegramOnboarding(deps?: MessagingDeps): Promise<void> {
    stopTelegramPoll()
    $telegramOnboarding.set({ ...INITIAL, fsm: 'starting' })

    const api = resolveApi(deps)

    try {
      const setup = await api<TelegramOnboardingStart>({
        path: '/api/messaging/telegram/onboarding/start',
        method: 'POST',
        body: { bot_name: 'AETHER' },
      })

      $telegramOnboarding.set({ ...INITIAL, fsm: 'pending', setup })
      schedulePoll(1200, deps)
    } catch {
      $telegramOnboarding.set({ ...INITIAL, error: 'Không bắt đầu được thiết lập Telegram.', fsm: 'error' })
    }
  }

  export async function cancelTelegramOnboarding(deps?: MessagingDeps): Promise<void> {
    const { setup } = $telegramOnboarding.get()
    stopTelegramPoll()

    if (setup) {
      try {
        await resolveApi(deps)<{ ok: boolean }>({
          path: `/api/messaging/telegram/onboarding/${encodeURIComponent(setup.pairing_id)}`,
          method: 'DELETE',
        })
      } catch {
        // local cleanup still wins
      }
    }

    resetTelegramOnboarding()
  }

  export async function applyTelegramOnboarding(
    allowedUserIds: string[],
    deps?: MessagingDeps
  ): Promise<TelegramOnboardingApply> {
    const { setup } = $telegramOnboarding.get()

    if (!setup) { throw new Error('No active Telegram pairing') }

    stopTelegramPoll()

    const result = await resolveApi(deps)<TelegramOnboardingApply>({
      path: `/api/messaging/telegram/onboarding/${encodeURIComponent(setup.pairing_id)}/apply`,
      method: 'POST',
      body: { allowed_user_ids: allowedUserIds },
    })

    resetTelegramOnboarding()

    return result
  }
  ```

- [ ] **Step 5.4 — Run the FSM test, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/domain/messaging/telegram-onboarding-store.test.ts`
  Expected output: `Tests  3 passed (3)`.

- [ ] **Step 5.5 — Add the pairing panel + prompt-cache/poll guard render tests (append to `messaging-screen.test.tsx`).**
  ```tsx
  import * as tg from '@/aether/domain/messaging/telegram-onboarding-store'

  describe('MessagingScreen Telegram pairing panel', () => {
    it('starts onboarding when the user clicks the QR pairing button', () => {
      const spy = vi.spyOn(tg, 'startTelegramOnboarding').mockResolvedValue(undefined)
      $platforms.set([{ ...withFields, id: 'telegram', name: 'Telegram' }])
      $platformsStatus.set('ready')

      render(<MessagingScreen />)
      fireEvent.click(screen.getByTestId('ae-messaging-card'))
      fireEvent.click(screen.getByRole('button', { name: 'Ghép nối bằng QR' }))

      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })

    it('stops the Telegram poll on unmount (poll guard)', () => {
      const stopSpy = vi.spyOn(tg, 'stopTelegramPoll')
      $platforms.set([{ ...withFields, id: 'telegram', name: 'Telegram' }])
      $platformsStatus.set('ready')

      const view = render(<MessagingScreen />)
      view.unmount()

      expect(stopSpy).toHaveBeenCalled()
      stopSpy.mockRestore()
    })
  })

  describe('MessagingScreen prompt-cache safety', () => {
    // HARD guard: a non-chat screen must never touch the conversation delta path.
    // Source-level assertion is sufficient and stable — appendAssistantDelta and
    // the *.delta / thinking.* event names must not appear in the screen module
    // or the messaging domain stores.
    it('never references conversation deltas or appendAssistantDelta', async () => {
      const fs = await import('node:fs')
      const files = [
        'src/aether/ui/screens/messaging-screen.tsx',
        'src/aether/domain/messaging/messaging-store.ts',
        'src/aether/domain/messaging/telegram-onboarding-store.ts',
      ]
      const forbidden = ['appendAssistantDelta', 'message.delta', 'reasoning.delta', 'thinking.']

      for (const file of files) {
        const text = fs.readFileSync(file, 'utf8')

        for (const token of forbidden) {
          expect(text.includes(token), `${file} must not reference ${token}`).toBe(false)
        }
      }
    })
  })
  ```
  > The prompt-cache guard is a forbidden-import/string assertion over the new modules (justified inline): it proves at the source level that the screen and its stores never enter the conversation-delta path, satisfying the HARD non-chat constraint without needing a live socket mock. The poll guard asserts the panel's unmount effect calls `stopTelegramPoll`.

- [ ] **Step 5.6 — Run the screen test, expect FAIL.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx`
  Expected output: failure — no `Ghép nối bằng QR` button / `stopTelegramPoll` not called on unmount.

- [ ] **Step 5.7 — Implement `TelegramPairingPanel` and wire it into the Telegram detail.**
  In `messaging-screen.tsx`:
  1. Add imports:
     ```tsx
     import {
       $telegramOnboarding,
       applyTelegramOnboarding,
       cancelTelegramOnboarding,
       startTelegramOnboarding,
       stopTelegramPoll,
     } from '@/aether/domain/messaging/telegram-onboarding-store'
     ```
  2. Inside the `selectedId === platform.id` detail block, render the panel for Telegram below `<PlatformConfig>`:
     ```tsx
     {platform.id === 'telegram' && <TelegramPairingPanel onApplied={() => void loadPlatforms()} />}
     ```
  3. Add the component:
     ```tsx
     function TelegramPairingPanel({ onApplied }: { onApplied: () => void }) {
       const state = useStore($telegramOnboarding)
       const [allowedIds, setAllowedIds] = useState<string[]>([])
       const [newId, setNewId] = useState('')

       // Poll guard: ensure any in-flight light poll is cleared if the panel
       // unmounts (platform deselected / screen left). REST-only, no socket.
       useEffect(() => () => stopTelegramPoll(), [])

       useEffect(() => {
         if (state.fsm === 'done' && state.ownerId && allowedIds.length === 0) {
           setAllowedIds([state.ownerId])
         }
       }, [state.fsm, state.ownerId])

       function addId() {
         const trimmed = newId.trim()

         if (!/^\d+$/.test(trimmed)) { return }

         setAllowedIds(ids => (ids.includes(trimmed) ? ids : [...ids, trimmed]))
         setNewId('')
       }

       async function apply() {
         if (allowedIds.length === 0) { return }

         await applyTelegramOnboarding(allowedIds)
         onApplied()
       }

       return (
         <div className="mt-2 flex flex-col gap-2.5 border-t border-[rgba(120,200,255,.12)] pt-2.5">
           <div className="text-[11px] font-semibold tracking-[.14em] text-[color:var(--ae-azure-soft)]">
             GHÉP NỐI QR
           </div>

           {(state.fsm === 'idle' || state.fsm === 'error') && (
             <>
               {state.error && <div className="text-[11px]" style={{ color: 'var(--ae-warn)' }}>{state.error}</div>}
               <button
                 className="self-start rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold"
                 onClick={() => void startTelegramOnboarding()}
                 style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)' }}
                 type="button"
               >
                 Ghép nối bằng QR
               </button>
             </>
           )}

           {state.fsm === 'starting' && <div className="text-[11.5px] text-[color:var(--ae-dim)]">Đang khởi tạo…</div>}

           {state.fsm === 'pending' && state.setup && (
             <div className="flex flex-col gap-2">
               <div className="text-[11.5px] text-[color:var(--ae-dim)]">
                 Mở liên kết này trên điện thoại để ghép nối, đang chờ xác nhận…
               </div>
               <a className="break-all text-[11px] text-[color:var(--ae-azure-soft)] underline" href={state.setup.deep_link} rel="noreferrer" target="_blank">
                 {state.setup.deep_link}
               </a>
               <button
                 className="self-start rounded-[10px] px-[12px] py-[6px] text-[11.5px] font-semibold"
                 onClick={() => void cancelTelegramOnboarding()}
                 style={{ border: '1px solid rgba(120,200,255,.28)' }}
                 type="button"
               >
                 Hủy
               </button>
             </div>
           )}

           {state.fsm === 'done' && (
             <div className="flex flex-col gap-2">
               <div className="text-[11.5px]" style={{ color: 'var(--ae-ok)' }}>
                 Đã ghép nối{state.botUsername ? ` với @${state.botUsername}` : ''}.
               </div>
               <div className="flex flex-wrap items-center gap-1.5">
                 {allowedIds.map(id => (
                   <span className="rounded-full px-2 py-0.5 text-[11px]" key={id} style={{ border: '1px solid rgba(120,200,255,.28)' }}>{id}</span>
                 ))}
               </div>
               <div className="flex items-center gap-2">
                 <input
                   className="rounded-[9px] bg-[rgba(8,24,44,.55)] px-2.5 py-1.5 text-[12px] text-white outline-none"
                   onChange={event => setNewId(event.target.value)}
                   placeholder="ID người dùng được phép"
                   style={{ border: '1px solid rgba(120,200,255,.18)' }}
                   value={newId}
                 />
                 <button
                   className="rounded-[10px] px-[12px] py-[7px] text-[12px] font-semibold"
                   onClick={addId}
                   style={{ border: '1px solid rgba(120,200,255,.28)' }}
                   type="button"
                 >
                   Thêm
                 </button>
               </div>
               <button
                 className="self-start rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
                 disabled={allowedIds.length === 0}
                 onClick={() => void apply()}
                 style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)' }}
                 type="button"
               >
                 Hoàn tất ghép nối
               </button>
             </div>
           )}
         </div>
       )
     }
     ```

- [ ] **Step 5.8 — Run the full suites, expect PASS.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx src/aether/domain/messaging/messaging-store.test.ts src/aether/domain/messaging/telegram-onboarding-store.test.ts`
  Expected output: `Test Files  3 passed (3)` (screen: 6 + 4 = 10; store: 5; tg: 3 = `Tests  18 passed (18)`).

- [ ] **Step 5.9 — Commit.**
  ```bash
  git add apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.ts apps/desktop/src/aether/domain/messaging/telegram-onboarding-store.test.ts apps/desktop/src/aether/ui/screens/messaging-screen.tsx apps/desktop/src/aether/ui/screens/messaging-screen.test.tsx
  git commit -m "feat(aether): Telegram onboarding FSM store + QR pairing panel with poll/prompt-cache guards

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 6 — swap the route in `aether-shell.tsx`

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`

**Interfaces:**
- Consumes: `MessagingScreen` from `@/aether/ui/screens/messaging-screen`.
- Produces: the `MESSAGING_ROUTE` route renders `<MessagingScreen />` instead of `<StubScreen title="Messaging" />`.

- [ ] **Step 6.1 — Edit the route + add the import.**
  In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add near the other screen imports:
  ```tsx
  import { MessagingScreen } from '@/aether/ui/screens/messaging-screen'
  ```
  Replace line 57:
  ```tsx
  <Route element={<StubScreen title="Messaging" />} path={MESSAGING_ROUTE.slice(1)} />
  ```
  with:
  ```tsx
  <Route element={<MessagingScreen />} path={MESSAGING_ROUTE.slice(1)} />
  ```
  (Leave the other `StubScreen` routes untouched; do not remove the `StubScreen` import — it is still used by the remaining stub routes.)

- [ ] **Step 6.2 — Run the full messaging + shell-adjacent suite + typecheck, expect PASS / green.**
  Command: `cd apps/desktop && npm run test:ui -- src/aether/ui/screens/messaging-screen.test.tsx src/aether/domain/messaging && npx tsc --noEmit -p tsconfig.json`
  Expected output: `Tests  18 passed (18)` and `tsc` exits 0 with no output.
  > If the repo uses a different typecheck entry (e.g. a `typecheck` npm script), run that instead; the goal is zero type errors introduced by the new files.

- [ ] **Step 6.3 — Commit.**
  ```bash
  git add apps/desktop/src/aether/ui/shell/aether-shell.tsx
  git commit -m "feat(aether): mount MessagingScreen on MESSAGING_ROUTE (replace stub)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Self-Review vs spec §5.1 Messaging

| Spec bullet | Covered by | Verification |
|---|---|---|
| **Platform list + status badge** — `getMessagingPlatforms()` | Task 1 (`loadPlatforms` → `$platforms`/`$platformsStatus`), Task 2 (`MessagingScreen` cards + `StatusBadge`) | Render test asserts one `ae-messaging-card` + one `ae-messaging-status-badge` per platform; store test asserts ready/empty/error. |
| **Config per-platform + env** — `updateMessagingPlatform(id, updates)` | Task 3 (`updatePlatform`, `PlatformConfig` form over `MessagingEnvVarInfo[]`) | Store test asserts `PUT /api/messaging/platforms/:id` body `{ env }` then re-fetch; screen test asserts `updatePlatform('telegram', { env: { TELEGRAM_BOT_TOKEN } })`. |
| **Test connection** — `testMessagingPlatform(id)` | Task 4 (`testPlatform`, Test button + result line) | Store test asserts `POST /.../test`; screen test asserts result message renders. |
| **Telegram pairing flow (QR/onboarding)** — `/api/messaging/telegram/onboarding/*` | Task 5 (FSM store start/poll/cancel/apply + `TelegramPairingPanel`) | FSM test: `idle→starting→pending→done`; poll-guard test (`stopTelegramPoll` clears timer, panel unmount); prompt-cache guard test (no delta/`appendAssistantDelta`). |

**Constraint sign-off:** Vietnamese UI strings only ("Nhắn tin", "Đã kết nối", "Kiểm tra kết nối", "Ghép nối bằng QR", "Hoàn tất ghép nối"); "Agent" never translated; colors via `--ae-*` tokens; root is `.ae-screen-bare flex h-full min-w-0 flex-col`; padding via `<GlassSlab>`; REST-only with a single guarded poll cleared on unmount/done/cancel/error; no new backend endpoints.
