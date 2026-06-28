# AETHER SP-3 Slice 2 — Voice / Ambient Screen Implementation Plan

> **Trạng thái: ✅ HOÀN TẤT** (2026-06-28) — merged vào `main`. 5 task xong: commits `0af5e3d` ($voiceActive/$voiceSession), `9b52f1e` (adapter `useVoiceSession`), `7e1e604` (mount ở desktop-controller), `401b05b` (voice-screen presentation), `e75d110` (route + nav + shell + ⌘K), `9f8d973` (fix Settings link in-app + review nits). Triển khai đúng *Architecture deviation* đã ghi: vòng voice chạy app-global qua adapter `useVoiceSession` (controller), màn `/voice` thuần presentation. Suite `src/aether` xanh, `tsc` sạch.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add screen 15 — a hands-free Voice/Ambient cockpit at `/voice`: a large state-reactive Living Orb (using the Slice-1 `listening`/`speaking` states), the active session's transcript, and a Nghe/Dừng control — all reusing the battle-tested voice runtime, with **0 Python changes**.

**Architecture (resolved deviation from spec §4 — read this):** Spec §4 lists `voice-screen.tsx` calling `useVoiceConversation()` directly. Research shows that is impractical: the voice loop needs `submitText` + `transcribeVoiceAudio`, which only exist app-globally inside `desktop-controller.tsx` (returned by `usePromptActions`, line 711) and depend on a large context (`activeSessionId`, `busyRef`, `requestGateway`, session-creation refs). A standalone screen cannot cheaply reconstruct that. **Resolution:** a thin app-level adapter hook `useVoiceSession({ submitText, transcribeVoiceAudio })` runs the existing `useVoiceConversation` loop once, mounted in `desktop-controller` (where those fns already live). It publishes UI state to stores (`$voiceListening`, `$voiceSession`) and reads the `$voiceActive` enable flag. The `/voice` screen is **pure presentation**: it subscribes to those stores + `$orbState` + `$messages` and toggles `$voiceActive`. This honors spec §4's "presentation tách khỏi logic" and §5.1's "reuse runtime"; it is an adapter, not a re-implementation of the loop (Phương án B stays rejected — we do not rewrite STT/TTS/VAD).

**Tech Stack:** React 18, nanostores, `@testing-library/react`, vitest + jsdom. Reused runtime: `useVoiceConversation` (`src/app/chat/composer/hooks/`), `$voicePlayback` (`src/store/voice-playback.ts`), `usePromptActions` (`src/app/session/hooks/`).

> **Codebase-verified (2026-06-27).** Every anchor below was checked against the live tree: `useVoiceConversation` params/return + self-start effect (`use-voice-conversation.ts:377–387`); `usePromptActions` exposes `submitText`/`transcribeVoiceAudio` (`desktop-controller.tsx:702–725`); `pendingResponse`/`consumePendingResponse`/`submitVoiceTurn` (`composer/index.tsx:1797–1846`); Slice-1 `voice-presence.ts` (`$voiceListening`/`setVoiceListening`), `OrbState` already includes `listening`/`speaking`, `$orbState` is a read-only `computed`; `LivingOrb` props `{ state, size, label }` + `role="status"`; `GlassSlab` `size: 'sm' | 'md' | 'lg'`; tokens `--ae-azure` / `--ae-azure-soft` / `--ae-dim` (`aether.css`); routes/nav/shell shapes. Corrections folded into this draft: command-palette icons come from `@/lib/icons` (which re-exports `Mic`), **not** `lucide-react`; the Settings deep-link is `?tab=config:voice` (not `?tab=voice`); the catalog test (`catalog.test.tsx`) must gain a `nav-voice` entry (Task 5 Step 7); the orb-state test now drives `$voiceListening` instead of poking the read-only `computed`.

## Global Constraints

- **0 changes to Python core** (`aether_cli/*`, gateway handlers). Renderer-only; the `voice.*` gateway handlers already exist. (SP-3 spec §2/§3)
- **Brand `#07397d`** via `--ae-*`/`--dt-*` tokens; no hardcoded colors. (SP-3 spec §3)
- **Localization:** UI Vietnamese; **never** "Agent" → "Đại lý"; platform name **"HYPERTEK - AGENT PLATFORM"**. (SP-3 spec §3)
- **Prompt-cache exception (the only one):** Voice **is** a conversation surface, so it may use the SP-0 stream of the active session (§6). It must **not** spawn any LLM call outside that session's own voice loop. Every other non-chat screen still obeys the no-stream rule. (SP-3 spec §3/§6)
- **Respect `prefers-reduced-motion`** + the SP-0 motion gate at the orb/overlay. (SP-3 spec §3)
- **Layering:** screen root is `.ae-screen-bare flex h-full min-w-0 flex-col`; no `p-[...]`/own background; cards via `<GlassSlab size>`. (SP-3 spec §3/§4)
- **Voice drives the active Chat session**; if none, auto-open one. (SP-3 spec §5.1, decision 4)
- Keep `src/aether` green between tasks: `npx vitest run --environment jsdom src/aether`.

---

## File Structure

- `src/aether/domain/voice/voice-presence.ts` — **MODIFY** (Slice 1 created it). Add `$voiceActive` (enable flag), `setVoiceActive`/`toggleVoiceActive`, and `$voiceSession` (published `{ status, level, muted }`) + its `VoiceSessionStatus` type.
- `src/aether/domain/voice/voice-presence.test.ts` — **MODIFY.** Add `$voiceActive` toggle + `$voiceSession` default tests.
- `src/aether/domain/voice/use-voice-session.ts` — **NEW.** Adapter hook wiring `useVoiceConversation` to the active session; publishes stores. Mounted in `desktop-controller`.
- `src/aether/domain/voice/use-voice-session.test.tsx` — **NEW.** Mocks `useVoiceConversation`; asserts wiring + no LLM call while inactive.
- `src/app/desktop-controller.tsx` — **MODIFY.** Call `useVoiceSession({ submitText, transcribeVoiceAudio })` once (primary window).
- `src/aether/ui/screens/voice-screen.tsx` — **NEW.** Presentation: orb + transcript + control bar.
- `src/aether/ui/screens/voice-screen.test.tsx` — **NEW.** Render + interaction + orb-state + "no loop import" tests.
- `src/app/routes.ts` — **MODIFY.** `VOICE_ROUTE='/voice'`; `AppView`/`AppRouteId` += `'voice'`; `APP_ROUTES` entry.
- `src/aether/ui/shell/nav-items.tsx` — **MODIFY.** Voice nav item.
- `src/aether/ui/shell/aether-shell.tsx` — **MODIFY.** `<Route>` for `/voice`.
- `src/app/command-palette/index.tsx` — **MODIFY.** "Voice" go-to entry (icon `Mic` from `@/lib/icons`).
- `src/app/command-palette/catalog.test.tsx` — **MODIFY (test).** Add `VOICE_ROUTE` to the "every route" loop + a `nav-voice` navigate test.

Dependency order: **T1 voice-presence stores** → **T2 useVoiceSession** → **T3 mount in controller** → **T4 voice-screen** → **T5 route/nav/shell/⌘K wiring**.

---

### Task 1: Extend `voice-presence` with `$voiceActive` + `$voiceSession`

**Files:**
- Modify: `src/aether/domain/voice/voice-presence.ts`
- Modify: `src/aether/domain/voice/voice-presence.test.ts`

**Interfaces:**
- Produces: `export const $voiceActive: WritableAtom<boolean>` (default `false`); `export function setVoiceActive(active: boolean): void`; `export function toggleVoiceActive(): void`; `export type VoiceSessionStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'`; `export interface VoiceSessionView { status: VoiceSessionStatus; level: number; muted: boolean }`; `export const $voiceSession: WritableAtom<VoiceSessionView>` (default `{ status: 'idle', level: 0, muted: false }`); `export function setVoiceSession(view: VoiceSessionView): void`. (`$voiceListening`/`setVoiceListening` from Slice 1 stay.)

- [ ] **Step 1: Add failing tests** (append to existing `voice-presence.test.ts`)

```typescript
import { $voiceActive, $voiceSession, setVoiceActive, setVoiceSession, toggleVoiceActive } from './voice-presence'

describe('$voiceActive enable flag', () => {
  beforeEach(() => $voiceActive.set(false))

  it('defaults to false and toggles', () => {
    expect($voiceActive.get()).toBe(false)
    toggleVoiceActive()
    expect($voiceActive.get()).toBe(true)
    setVoiceActive(false)
    expect($voiceActive.get()).toBe(false)
  })
})

describe('$voiceSession published view', () => {
  it('defaults to idle/0/unmuted', () => {
    expect($voiceSession.get()).toEqual({ status: 'idle', level: 0, muted: false })
  })
  it('setVoiceSession replaces the view', () => {
    setVoiceSession({ status: 'listening', level: 0.4, muted: false })
    expect($voiceSession.get().status).toBe('listening')
  })
})
```

- [ ] **Step 2: Run → fail**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/voice-presence.test.ts`
Expected: FAIL — new exports missing.

- [ ] **Step 3: Implement** (append to `voice-presence.ts`)

```typescript
// Enable flag for the hands-free loop, toggled by the Voice screen's Nghe/Dừng.
export const $voiceActive = atom(false)

export function setVoiceActive(active: boolean) {
  $voiceActive.set(active)
}

export function toggleVoiceActive() {
  $voiceActive.set(!$voiceActive.get())
}

export type VoiceSessionStatus = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking'

export interface VoiceSessionView {
  status: VoiceSessionStatus
  level: number
  muted: boolean
}

// Published by useVoiceSession so the presentation screen can read mic level /
// status / mute without owning the loop.
export const $voiceSession = atom<VoiceSessionView>({ status: 'idle', level: 0, muted: false })

export function setVoiceSession(view: VoiceSessionView) {
  $voiceSession.set(view)
}
```

- [ ] **Step 4: Run → pass**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/voice-presence.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/voice/voice-presence.ts apps/desktop/src/aether/domain/voice/voice-presence.test.ts
git commit -m "feat(aether): voice-presence gains \$voiceActive + \$voiceSession for the Voice screen"
```

---

### Task 2: `useVoiceSession` adapter hook

**Files:**
- Create: `src/aether/domain/voice/use-voice-session.ts`
- Test: `src/aether/domain/voice/use-voice-session.test.tsx`

**Interfaces:**
- Consumes: `useVoiceConversation` from `@/app/chat/composer/hooks/use-voice-conversation` (params `{ busy, enabled, onFatalError, onSubmit, onTranscribeAudio, pendingResponse, consumePendingResponse }`; returns `{ end, level, muted, start, status, stopTurn, toggleMute }`); `$busy`/`$messages` from `@/store/session`; `chatMessageText` from `@/lib/chat-messages`; `$voiceActive`/`setVoiceActive`/`setVoiceListening`/`setVoiceSession` from `./voice-presence`.
- Produces: `export function useVoiceSession(deps: { submitText: (text: string) => Promise<boolean> | void; transcribeVoiceAudio: (audio: Blob) => Promise<string> }): void`. Side-effects only — runs the loop, publishes `$voiceListening` + `$voiceSession`, and ends the loop when `$voiceActive` flips false.

**Behavior mirrors `composer/index.tsx` lines 1797–1846** (`pendingResponse` 1797–1816 · `consumePendingResponse` 1818–1825 · `submitVoiceTurn` 1827–1836 · `useVoiceConversation` call 1838–1846), at the session-store level.

- [ ] **Step 1: Write the failing test**

```typescript
// src/aether/domain/voice/use-voice-session.test.tsx
import { render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockHook = vi.fn(() => ({ end: vi.fn(), level: 0, muted: false, start: vi.fn(), status: 'idle', stopTurn: vi.fn(), toggleMute: vi.fn() }))
vi.mock('@/app/chat/composer/hooks/use-voice-conversation', () => ({ useVoiceConversation: (opts: unknown) => mockHook(opts) }))

import { $voiceActive, $voiceListening, $voiceSession } from './voice-presence'
import { useVoiceSession } from './use-voice-session'

function Harness({ submitText }: { submitText: (t: string) => Promise<boolean> }) {
  useVoiceSession({ submitText, transcribeVoiceAudio: vi.fn() })
  return null
}

afterEach(() => {
  vi.clearAllMocks()
  $voiceActive.set(false)
  $voiceListening.set(false)
})

describe('useVoiceSession', () => {
  beforeEach(() => $voiceActive.set(false))

  it('passes enabled=false when the loop is inactive and never submits on mount', () => {
    const submitText = vi.fn(async () => true)
    render(<Harness submitText={submitText} />)
    expect(mockHook).toHaveBeenCalled()
    const opts = mockHook.mock.calls.at(-1)?.[0] as { enabled: boolean }
    expect(opts.enabled).toBe(false)
    expect(submitText).not.toHaveBeenCalled()
  })

  it('forwards the active flag as enabled', () => {
    $voiceActive.set(true)
    render(<Harness submitText={vi.fn(async () => true)} />)
    const opts = mockHook.mock.calls.at(-1)?.[0] as { enabled: boolean }
    expect(opts.enabled).toBe(true)
  })

  it('onSubmit routes the transcript to submitText', async () => {
    const submitText = vi.fn(async () => true)
    render(<Harness submitText={submitText} />)
    const opts = mockHook.mock.calls.at(-1)?.[0] as { onSubmit: (t: string) => Promise<void> }
    await opts.onSubmit('xin chào')
    expect(submitText).toHaveBeenCalledWith('xin chào')
  })

  it('publishes the conversation status into $voiceListening / $voiceSession', () => {
    mockHook.mockReturnValueOnce({ end: vi.fn(), level: 0.5, muted: false, start: vi.fn(), status: 'listening', stopTurn: vi.fn(), toggleMute: vi.fn() })
    render(<Harness submitText={vi.fn(async () => true)} />)
    expect($voiceListening.get()).toBe(true)
    expect($voiceSession.get().status).toBe('listening')
    expect($voiceSession.get().level).toBe(0.5)
  })
})
```

- [ ] **Step 2: Run → fail**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/use-voice-session.test.tsx`
Expected: FAIL — `./use-voice-session` missing.

- [ ] **Step 3: Implement**

```typescript
// src/aether/domain/voice/use-voice-session.ts
import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { useVoiceConversation } from '@/app/chat/composer/hooks/use-voice-conversation'
import { chatMessageText } from '@/lib/chat-messages'
import { $busy, $messages } from '@/store/session'

import { $voiceActive, setVoiceActive, setVoiceListening, setVoiceSession } from './voice-presence'

// App-level voice controller: runs the existing hands-free loop against the
// active Chat session (reuse, not re-implementation). Side-effects only — the
// Voice screen reads $voiceSession/$voiceListening/$orbState and toggles
// $voiceActive. Mounted once in desktop-controller (primary window).
export function useVoiceSession(deps: {
  submitText: (text: string) => Promise<boolean> | void
  transcribeVoiceAudio: (audio: Blob) => Promise<string>
}) {
  const busy = useStore($busy)
  const active = useStore($voiceActive)
  const lastSpokenIdRef = useRef<string | null>(null)

  // Mirror composer/index.tsx: speak the latest unseen assistant message of the
  // active session; track what we've already spoken so we don't repeat.
  const pendingResponse = () => {
    const last = $messages.get().findLast(m => m.role === 'assistant' && !m.hidden)
    if (!last || last.id === lastSpokenIdRef.current) return null
    const text = chatMessageText(last).trim()
    if (!text) return null
    return { id: last.id, pending: Boolean(last.pending), text }
  }

  const consumePendingResponse = () => {
    const last = $messages.get().findLast(m => m.role === 'assistant' && !m.hidden)
    if (last) lastSpokenIdRef.current = last.id
  }

  const conversation = useVoiceConversation({
    busy,
    consumePendingResponse,
    enabled: active,
    onFatalError: () => setVoiceActive(false),
    onSubmit: text => deps.submitText(text),
    onTranscribeAudio: deps.transcribeVoiceAudio,
    pendingResponse,
  })

  // Publish loop state so the presentation screen can render mic level / status.
  useEffect(() => {
    setVoiceListening(conversation.status === 'listening')
    setVoiceSession({ status: conversation.status, level: conversation.level, muted: conversation.muted })
  }, [conversation.status, conversation.level, conversation.muted])

  // Toggling off ends the in-flight turn (mirror composer toggle).
  useEffect(() => {
    if (!active) void conversation.end()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
```

> **Verified against the real hook (2026-06-27 audit):** `use-voice-conversation.ts:377–387` already self-start/-stop off the `enabled` prop:
> `useEffect(() => { if (enabled && !wasEnabledRef.current) void start(); if (!enabled && wasEnabledRef.current) void end(); wasEnabledRef.current = enabled }, [enabled, end, start])`.
> So the adapter does **not** call `start()` itself — flipping `$voiceActive` true (→ `enabled` true) is enough. The `active` effect below (calling `conversation.end()` on disable) is therefore **redundant** with the hook's own `end()` and may be dropped; it is idempotent and harmless if kept. No behavioral change needed.

- [ ] **Step 4: Run → pass**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/use-voice-session.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/voice/use-voice-session.ts apps/desktop/src/aether/domain/voice/use-voice-session.test.tsx
git commit -m "feat(aether): useVoiceSession adapter runs the voice loop against the active session"
```

---

### Task 3: Mount the controller in `desktop-controller.tsx`

**Files:**
- Modify: `src/app/desktop-controller.tsx`

**Interfaces:**
- Consumes: `submitText`, `transcribeVoiceAudio` already destructured from `usePromptActions(...)` at line 702–725.
- Produces: nothing — wiring only.

- [ ] **Step 1: Add the hook call** — immediately after the `usePromptActions({...})` block (after line 725), add:

```typescript
  // SP-3: run the hands-free voice loop app-globally so the /voice screen can be
  // pure presentation. submitText/transcribeVoiceAudio come from usePromptActions
  // above; the loop only runs while $voiceActive is set by the Voice screen.
  useVoiceSession({ submitText, transcribeVoiceAudio })
```

And add the import near the other `@/aether` imports:

```typescript
import { useVoiceSession } from '@/aether/domain/voice/use-voice-session'
```

- [ ] **Step 2: Typecheck + full aether suite**

Run: `npx tsc -p . --noEmit && npx vitest run --environment jsdom src/aether`
Expected: tsc clean; aether suite green. (If `desktop-controller.tsx` has its own test, run it too: `npx vitest run --environment jsdom src/app/desktop-controller` — it should stay green since the hook is side-effect-only and `$voiceActive` defaults false.)

- [ ] **Step 3: Commit**

```bash
git add apps/desktop/src/app/desktop-controller.tsx
git commit -m "feat(aether): mount useVoiceSession in desktop-controller (primary window)"
```

---

### Task 4: `voice-screen.tsx` presentation

**Files:**
- Create: `src/aether/ui/screens/voice-screen.tsx`
- Test: `src/aether/ui/screens/voice-screen.test.tsx`

**Interfaces:**
- Consumes: `$orbState` from `@/aether/domain/motion/motion-store`; `$messages` from `@/store/session`; `$voiceSession`/`$voiceActive`/`toggleVoiceActive` from `@/aether/domain/voice/voice-presence`; `chatMessageText` from `@/lib/chat-messages`; `LivingOrb` from `@/aether/ui/orb/living-orb`; `GlassSlab` from `@/aether/ui/components/glass-slab`.
- Produces: `export function VoiceScreen(): JSX.Element`.

**Presentation only:** the screen renders state and calls `toggleVoiceActive()`. It must **not** import `useVoiceConversation`, `submitText`, or any send-path — those live in the controller (Task 3). This keeps the prompt-cache exception scoped to the controller's session loop.

- [ ] **Step 1: Write the failing test**

```typescript
// src/aether/ui/screens/voice-screen.test.tsx
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ChatMessage } from '@/lib/chat-messages'
import { $messages } from '@/store/session'
import { $voiceActive, $voiceListening, $voiceSession } from '@/aether/domain/voice/voice-presence'

import { VoiceScreen } from './voice-screen'

const msg = (id: string, role: ChatMessage['role'], text: string): ChatMessage => ({ id, role, parts: [{ type: 'text', text }] })

afterEach(() => {
  cleanup()
  $messages.set([])
  $voiceActive.set(false)
  $voiceListening.set(false)
  $voiceSession.set({ status: 'idle', level: 0, muted: false })
})

describe('VoiceScreen', () => {
  beforeEach(() => $voiceActive.set(false))

  it('renders the transcript of the active session', () => {
    $messages.set([msg('u1', 'user', 'thời tiết hôm nay'), msg('a1', 'assistant', 'Trời nắng đẹp')])
    render(<VoiceScreen />)
    expect(screen.getByText('thời tiết hôm nay')).toBeTruthy()
    expect(screen.getByText('Trời nắng đẹp')).toBeTruthy()
  })

  it('toggles $voiceActive when the Nghe/Dừng control is pressed', () => {
    render(<VoiceScreen />)
    fireEvent.click(screen.getByTestId('ae-voice-toggle'))
    expect($voiceActive.get()).toBe(true)
  })

  it('renders the Living Orb (role=status)', () => {
    render(<VoiceScreen />)
    expect(screen.getByRole('status')).toBeTruthy()
  })

  it('orb reflects the live listening state', () => {
    // $orbState is a `computed`; drive it through its real source. motion-store
    // priority (speaking > listening > thinking > idle > paused) gives `listening`
    // precedence over gateway state, so setting $voiceListening alone is
    // deterministic regardless of $gatewayState in jsdom.
    $voiceListening.set(true)
    const { container } = render(<VoiceScreen />)
    expect(container.querySelector('.ae-orb--listening')).toBeTruthy()
  })

  it('renders an honest empty hint when there is no conversation yet', () => {
    render(<VoiceScreen />)
    expect(screen.getByTestId('ae-voice-empty')).toBeTruthy()
  })

  it('is presentation-only: source never imports the voice loop or send-path', () => {
    const src = readFileSync(join(__dirname, 'voice-screen.tsx'), 'utf8')
    for (const forbidden of ['use-voice-conversation', 'usePromptActions', 'submitText', 'appendAssistantDelta']) {
      expect(src.includes(forbidden), `voice-screen must not import ${forbidden}`).toBe(false)
    }
  })
})
```

> Note: the listening assertion drives `$orbState` through its real input (`$voiceListening`) rather than poking the read-only `computed` — this is the screen-level half of spec §8's "orb-state reflect đúng"; the `speaking`/priority derivation itself is unit-tested in `motion-store.test.ts` (Slice 1). `LivingOrb` renders the wrapper `div.ae-orb--<state>` with `role="status"` in both the GL and CSS-fallback paths, so the `querySelector` is stable under jsdom (where the motion gate is off and the CSS fallback renders).

- [ ] **Step 2: Run → fail**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/voice-screen.test.tsx`
Expected: FAIL — `./voice-screen` missing.

- [ ] **Step 3: Implement**

```tsx
// src/aether/ui/screens/voice-screen.tsx
import { useStore } from '@nanostores/react'

import { $orbState } from '@/aether/domain/motion/motion-store'
import { $voiceActive, $voiceSession, toggleVoiceActive } from '@/aether/domain/voice/voice-presence'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { chatMessageText } from '@/lib/chat-messages'
import { $messages } from '@/store/session'

const STATUS_LABEL: Record<string, string> = {
  idle: 'Sẵn sàng',
  listening: 'Đang nghe…',
  transcribing: 'Đang phiên âm…',
  thinking: 'Đang xử lý…',
  speaking: 'Đang trả lời…',
}

export function VoiceScreen() {
  const orbState = useStore($orbState)
  const session = useStore($voiceSession)
  const active = useStore($voiceActive)
  const messages = useStore($messages)

  const spoken = messages.filter(m => (m.role === 'user' || m.role === 'assistant') && !m.hidden)

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col items-center gap-4">
      <div className="mt-2 grid place-items-center">
        <LivingOrb size={220} state={orbState} label="Voice" />
        <div className="mt-3 text-[12px] uppercase tracking-[.18em] text-[color:var(--ae-azure-soft)]">
          {STATUS_LABEL[session.status] ?? STATUS_LABEL.idle}
        </div>
      </div>

      <GlassSlab className="flex min-h-0 w-full max-w-[680px] flex-1 flex-col gap-2 overflow-auto" size="md">
        {spoken.length === 0 ? (
          <div className="grid h-full place-items-center text-center text-[12.5px] text-[color:var(--ae-dim)]" data-testid="ae-voice-empty">
            Chưa có hội thoại — nhấn <b className="mx-1 text-white">Nghe</b> để bắt đầu.
          </div>
        ) : (
          spoken.map(m => (
            <div className="text-[13px]" data-testid="ae-voice-line" key={m.id}>
              <span className="mr-2 text-[10.5px] font-semibold uppercase tracking-[.12em] text-[color:var(--ae-azure-soft)]">
                {m.role === 'user' ? 'Bạn' : 'Agent'}
              </span>
              <span className="text-white">{chatMessageText(m)}</span>
            </div>
          ))
        )}
      </GlassSlab>

      <div className="flex items-center gap-3 pb-2">
        <button
          className="rounded-[12px] border border-[rgba(120,200,255,.35)] p-[9px_22px] text-[13px] font-semibold text-white"
          data-testid="ae-voice-toggle"
          onClick={() => toggleVoiceActive()}
          type="button"
        >
          {active ? 'Dừng' : 'Nghe'}
        </button>
        <div className="h-[6px] w-[120px] overflow-hidden rounded-full bg-[rgba(120,200,255,.16)]" data-testid="ae-voice-level">
          <div className="h-full bg-[color:var(--ae-azure)]" style={{ width: `${Math.round(Math.min(1, session.level) * 100)}%` }} />
        </div>
        <a className="text-[11.5px] text-[color:var(--ae-dim)] underline" href="/settings?tab=config:voice">
          Settings → Voice
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run → pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/voice-screen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/voice-screen.tsx apps/desktop/src/aether/ui/screens/voice-screen.test.tsx
git commit -m "feat(aether): Voice/Ambient screen (orb + transcript + Nghe/Dừng, presentation-only)"
```

---

### Task 5: Wire the route — `routes.ts`, `nav-items`, shell, ⌘K

**Files:**
- Modify: `src/app/routes.ts`
- Modify: `src/aether/ui/shell/nav-items.tsx`
- Modify: `src/aether/ui/shell/aether-shell.tsx`
- Modify: `src/app/command-palette/index.tsx`
- Test: `src/aether/ui/shell/aether-shell-voice-route.test.tsx` (new, mirrors existing `aether-shell-content-route.test.tsx`)
- Test: `src/app/command-palette/catalog.test.tsx` (modify — add `VOICE_ROUTE` to the route loop + a `nav-voice` navigate test)

**Interfaces:**
- Consumes: `VOICE_ROUTE` (new) across nav/shell/palette.
- Produces: `export const VOICE_ROUTE = '/voice'`; `AppView`/`AppRouteId` gain `'voice'`; `APP_ROUTES` gains `{ id: 'voice', path: VOICE_ROUTE, view: 'voice' }` (so `RESERVED_PATHS` covers `/voice`).

- [ ] **Step 1: Write the failing shell route test** (mirror an existing one)

```typescript
// src/aether/ui/shell/aether-shell-voice-route.test.tsx
// Mirrors the existing aether-shell-content-route.test.tsx pattern.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('aether-shell voice route', () => {
  const src = readFileSync(join(__dirname, 'aether-shell.tsx'), 'utf8')

  it('imports VoiceScreen', () => {
    expect(src.includes('import { VoiceScreen }')).toBe(true)
  })

  it('renders <VoiceScreen /> on the voice path', () => {
    expect(/<Route element=\{<VoiceScreen \/>\} path=\{VOICE_ROUTE\.slice\(1\)\} \/>/.test(src)).toBe(true)
  })

  it('no longer leaves Voice as a stub', () => {
    expect(src.includes('<StubScreen title="Voice" />')).toBe(false)
  })
})
```

- [ ] **Step 2: Run → fail**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell-voice-route.test.tsx`
Expected: FAIL — `VoiceScreen` not referenced in shell.

- [ ] **Step 3: Edit `routes.ts`** — add the constant (after `CONTENT_ROUTE`), add `'voice'` to the `AppView` union, the `AppRouteId` union, and the `APP_ROUTES` array:

```typescript
export const VOICE_ROUTE = '/voice'
```
Add `| 'voice'` to both `AppView` and `AppRouteId`. Append to `APP_ROUTES`:
```typescript
  { id: 'voice', path: VOICE_ROUTE, view: 'voice' }
```

- [ ] **Step 4: Edit `nav-items.tsx`** — import `VOICE_ROUTE` and append a Voice item:

```typescript
  { id: 'voice', route: VOICE_ROUTE, label: 'Voice', icon: I('M12 4v10m0 0a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3zM6 11a6 6 0 0 0 12 0M12 17v3') },
```
(Add `VOICE_ROUTE` to the existing `@/app/routes` import.)

- [ ] **Step 5: Edit `aether-shell.tsx`** — import the screen + route and add the `<Route>`:

```typescript
import { VoiceScreen } from '@/aether/ui/screens/voice-screen'
```
Add `VOICE_ROUTE` to the `@/app/routes` import, and inside `<Routes>` (next to the other pillar routes):
```tsx
              <Route element={<VoiceScreen />} path={VOICE_ROUTE.slice(1)} />
```

- [ ] **Step 6: Edit `command-palette/index.tsx`** — add a Voice go-to entry inside `aetherGoToItems` (mirror the existing nav items):

```tsx
    {
      icon: Mic,
      id: 'nav-voice',
      keywords: ['voice', 'giọng nói', 'nghe', 'hands-free'],
      label: 'Voice',
      run: go(VOICE_ROUTE),
    },
```
Imports to add at the top of the file:
- `VOICE_ROUTE` → add to the existing `from '@/app/routes'` import.
- `Mic` → add to the existing `from '@/lib/icons'` import. (Verified: this file's icons come from `@/lib/icons`, **not** `lucide-react` directly, and `@/lib/icons` already re-exports `Mic` — aliased from `IconMicrophone` at `src/lib/icons.ts:58/163`.)

The label is the literal string `'Voice'`, so the `tStub` / `t` translation object needs no new key.

- [ ] **Step 7: Update the command-palette catalog test** — `src/app/command-palette/catalog.test.tsx` already (a) asserts a go-to entry for every AETHER route and (b) has a per-item navigate test for each pillar. Both need `VOICE_ROUTE`.

Add `VOICE_ROUTE` to the `from '@/app/routes'` import, append `VOICE_ROUTE` to the route array inside the `it('contains a Go-to entry for every AETHER route', …)` loop, and add this per-item test alongside the existing `nav-dev` / `nav-inbox` / `nav-content` ones:

```tsx
  it('selecting the Voice item navigates to /voice', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const voice = aetherGoToItems(go, tStub).find(item => item.id === 'nav-voice')
    expect(voice).toBeTruthy()
    voice?.run?.()
    expect(navigate).toHaveBeenCalledWith(VOICE_ROUTE)
  })
```

(The `tStub` already covers the keys `aetherGoToItems` reads, and the Voice label is a literal string, so no `tStub` change is needed.)

- [ ] **Step 8: Run all the touched suites + typecheck**

Run: `npx vitest run --environment jsdom src/aether src/app/command-palette src/app/routes.reserved.test.ts && npx tsc -p . --noEmit`
Expected: `aether-shell-voice-route` + `catalog` tests PASS; full aether suite green; `routes.reserved` + `nav-rail` stay green (Voice is appended at the **end** of `AETHER_NAV_ITEMS` so item indices `[0]`/`[1]` are untouched, and `/voice` is auto-reserved because it is now in `APP_ROUTES`); tsc clean.

- [ ] **Step 9: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx apps/desktop/src/aether/ui/shell/aether-shell-voice-route.test.tsx
git commit -m "feat(aether): mount Voice on /voice (route + nav + shell + ⌘K)"
```

---

## Self-Review (plan vs SP-3 spec §5.1, §6, §8, §9 item 2)

- **`VOICE_ROUTE='/voice'` + nav + shell + ⌘K** — Task 5; `catalog.test.tsx` now guards the `nav-voice` ⌘K entry (Step 7). ✓
- **Hands-free on the active Chat session, reuse `useVoiceConversation`/`$voicePlayback`/mic level** — Tasks 2–3 (controller) + Task 4 (presentation reads published state). ✓
- **Large state-reactive Living Orb (`listening`/`speaking`)** — Task 4 renders `<LivingOrb state={orbState}>`; Slice 1 supplies the states. ✓
- **Transcript of the active session, read-only** — Task 4 from `$messages` + `chatMessageText`. ✓
- **Auto-open a session when none active** — handled by the reused loop's `submitText` path (`createBackendSessionForSend`); the screen does not need extra logic. (Verify at Task 3 manual run.) ✓
- **Stream exception scoped to the controller's session loop; screen is presentation-only** — Task 4 "no loop import" guard test. ✓
- **No prompt-cache-guard for Voice, but assert no extra LLM call** — Task 2 test ("never submits on mount" + enabled wiring) + Task 4 guard. ✓
- **0 Python core changes** — entirely renderer. ✓
- **Honest empty/disabled states** — Task 4 empty hint + Settings→Voice link; gateway-paused handled by the SP-0 shell overlay. ✓
- **Decomposition order matches §9 item 2** — stores → controller → screen → wiring. ✓

**Architectural deviation logged:** controller-hook instead of screen-owned `useVoiceConversation` (rationale in the Architecture header). If you prefer the literal spec layout, the alternative is to lift `usePromptActions` itself — far more invasive; not recommended.
