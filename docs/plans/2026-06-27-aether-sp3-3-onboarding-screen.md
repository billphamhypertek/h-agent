# AETHER SP-3 Slice 3 — Onboarding Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add screen 16 — a full-screen AETHER-skinned first-run onboarding wizard that **reuses the existing `store/onboarding.ts` state machine unchanged**, replaces the legacy `DesktopOnboardingOverlay` at the first-run gate, and is reopenable from ⌘K. Closes the 16-screen map. **0 Python changes.**

**Architecture (reuse-restyle — spec §5.2 "Restyle, không viết lại flow"):** The legacy `desktop-onboarding-overlay.tsx` is a thin presentation over `$desktopOnboarding` (store) + its action functions; it renders three macro-states — `Preparing` (runtime not ready) → `Picker` (choose provider/model, `flow.status === 'idle' | 'success'`) → `FlowPanel` (OAuth/API-key/`confirming_model`). The AETHER screen re-renders **the same store-driven states** with `GlassSlab`, `--ae-*` tokens, a Living Orb presence, and an Orbitron heading. **No store/action/flow code changes** — every control binds to an existing exported action (table below). The legacy overlay file stays in the tree as the behavior reference (and is removed from the mount in Task 3).

**Tech Stack:** React 18, nanostores, `@testing-library/react`, vitest + jsdom. Reused: `src/store/onboarding.ts` (state + actions), `src/lib/provider-setup-errors.ts`.

## Global Constraints

- **0 changes to Python core** and **0 changes to `src/store/onboarding.ts` logic** (state machine reused verbatim; only the renderer is new). (SP-3 spec §2/§3/§5.2)
- **Prompt-cache-safe (absolute):** onboarding uses only REST config / `getGlobalModelOptions` + provider OAuth via the store's `requestGateway`. **No** `message.delta`/`reasoning.delta`/`thinking.*` subscription, **no** LLM conversation, **no** `appendAssistantDelta`. (SP-3 spec §3/§6)
- **Brand `#07397d`** via `--ae-*`/`--dt-*` tokens; no hardcoded colors. (SP-3 spec §3)
- **Localization:** UI Vietnamese; **never** "Agent" → "Đại lý"; platform name **"HYPERTEK - AGENT PLATFORM"**. Reuse existing `t.onboarding.*` i18n keys where present. (SP-3 spec §3)
- **Respect `prefers-reduced-motion`** + motion gate at the Living Orb / transitions. (SP-3 spec §3)
- **Layering:** full-screen container owns one gutter; cards via `<GlassSlab size>`; no double-pad. (SP-3 spec §3/§4)
- **"Ready" = ≥1 valid provider+model** (`configured` flag); channel/voice steps optional/skippable; **"Bỏ qua"** always available (`dismissFirstRunOnboarding`). (SP-3 spec §5.2)
- Keep `src/aether` green between tasks: `npx vitest run --environment jsdom src/aether`.

## Store contract (reused — DO NOT modify; bind controls to these)

From `src/store/onboarding.ts`:
- State atom: `$desktopOnboarding` → `DesktopOnboardingState { configured: boolean|null; flow: OnboardingFlow; mode: OnboardingMode; providers: OAuthProvider[]|null; reason: string|null; requested: boolean; firstRunSkipped: boolean; manual: boolean; localEndpoint: boolean }`.
- `OnboardingFlow.status ∈ { 'idle','starting','awaiting_user','polling','awaiting_browser','submitting','external_pending','success','confirming_model','error' }`.
- `OnboardingContext { onCompleted?: () => void; requestGateway: <T>(method, params?) => Promise<T> }`.
- Actions: `refreshOnboarding(ctx)`, `startProviderOAuth(provider, ctx)`, `startManualProviderOAuth(providerId, reason?)`, `startManualOnboarding(reason?)`, `setOnboardingMode(mode)`, `setOnboardingCode(code)`, `submitOnboardingCode(ctx)`, `saveOnboardingApiKey(envKey, value, label, ctx, endpointApiKey?)`, `saveOnboardingLocalEndpoint(baseUrl, apiKey, ctx)`, `setOnboardingModel(model)`, `confirmOnboardingModel(ctx)`, `copyDeviceCode()`, `copyExternalCommand()`, `recheckExternalSignin(ctx)`, `cancelOnboardingFlow()`, `dismissFirstRunOnboarding()`, `closeManualOnboarding()`, `peekPendingProviderOAuth()`, `clearPendingProviderOAuth()`.
- Constants: `DEFAULT_ONBOARDING_REASON`, `DEFAULT_MANUAL_ONBOARDING_REASON`.
- Helper: `isProviderSetupErrorMessage(message)` from `src/lib/provider-setup-errors.ts`.

**Control → action binding (restyle the legacy `Picker`/`ApiKeyForm`/`FlowPanel`/`Preparing` — lines 358–~520 — with these exact bindings):**

| Control | Action |
|---|---|
| Pick an OAuth provider | `startProviderOAuth(provider, ctx)` |
| Switch to API-key entry | `setOnboardingMode('apikey')` / back: `setOnboardingMode('oauth')` |
| Save API key | `saveOnboardingApiKey(envKey, value, label, ctx, apiKey?)` |
| Save local endpoint | `saveOnboardingLocalEndpoint(baseUrl, apiKey, ctx)` |
| Device-code copy / external copy | `copyDeviceCode()` / `copyExternalCommand()` |
| Re-check external sign-in | `recheckExternalSignin(ctx)` |
| Enter/submit pasted code | `setOnboardingCode(code)` / `submitOnboardingCode(ctx)` |
| Cancel an in-flight flow | `cancelOnboardingFlow()` |
| Choose model (confirming_model) | `setOnboardingModel(model)` |
| Finish ("Bắt đầu") | `confirmOnboardingModel(ctx)` → calls `ctx.onCompleted` |
| "Bỏ qua" (skip first run) | `dismissFirstRunOnboarding()` |
| Close (manual mode) | `closeManualOnboarding()` |

---

## File Structure

- `src/aether/ui/screens/onboarding-screen.tsx` — **NEW.** AETHER full-screen wizard over `$desktopOnboarding`. Exposes `AetherOnboarding({ enabled, onCompleted, requestGateway }: { enabled: boolean; onCompleted?: () => void; requestGateway: OnboardingContext['requestGateway'] })` — same prop contract as the legacy overlay for a drop-in swap.
- `src/aether/ui/screens/onboarding-screen.test.tsx` — **NEW.** Gate visibility + skip + finish + reopen interactions.
- `src/aether/ui/screens/onboarding/` — **NEW (optional).** Restyled sub-views split out for focus: `picker-view.tsx`, `flow-view.tsx`, `preparing-view.tsx`. (Split if `onboarding-screen.tsx` grows past ~250 lines; otherwise keep inline.)
- `src/app/desktop-controller.tsx` — **MODIFY.** Swap the legacy `<DesktopOnboardingOverlay>` mount (lines ~903–913) for `<AetherOnboarding>`; keep the same props/effects.
- `src/app/command-palette/index.tsx` — **MODIFY.** Add a "Mở lại Onboarding" action item → `startManualOnboarding()`.

Dependency order: **T1 screen scaffold + gate + Picker** → **T2 FlowPanel sub-states + finish/skip** → **T3 controller swap + ⌘K reopen**.

---

### Task 1: AETHER onboarding scaffold + gate + Picker (provider/model selection)

**Files:**
- Create: `src/aether/ui/screens/onboarding-screen.tsx`
- Test: `src/aether/ui/screens/onboarding-screen.test.tsx`

**Interfaces:**
- Consumes: `$desktopOnboarding`, `refreshOnboarding`, `startProviderOAuth`, `setOnboardingMode`, `saveOnboardingApiKey`, `dismissFirstRunOnboarding`, `closeManualOnboarding`, `isProviderSetupErrorMessage`.
- Produces: `export function AetherOnboarding(props: { enabled: boolean; onCompleted?: () => void; requestGateway: OnboardingContext['requestGateway'] }): JSX.Element | null`.

**Gate logic (mirror legacy overlay lines 273–301, verbatim semantics):**
- `if (onboarding.configured === true && !onboarding.manual) return null`
- `if (onboarding.firstRunSkipped && !onboarding.manual) return null`
- `ready = onboarding.manual || (enabled && onboarding.configured === false)`
- `showPicker = flow.status === 'idle' || flow.status === 'success'`
- On mount / when `enabled || requested`: `void refreshOnboarding(ctx)` (memoized `ctx` wrapping the props, like overlay lines 198–207, 232–236).

- [ ] **Step 1: Write the failing tests**

```tsx
// src/aether/ui/screens/onboarding-screen.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $desktopOnboarding } from '@/store/onboarding'
import * as onboarding from '@/store/onboarding'

import { AetherOnboarding } from './onboarding-screen'

const base = {
  configured: false as boolean | null,
  flow: { status: 'idle' as const },
  mode: 'oauth' as const,
  providers: [] as never[],
  reason: null,
  requested: false,
  firstRunSkipped: false,
  manual: false,
  localEndpoint: false,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AetherOnboarding gate', () => {
  beforeEach(() => $desktopOnboarding.set({ ...base }))

  it('renders nothing once configured (and not manual)', () => {
    $desktopOnboarding.set({ ...base, configured: true })
    const { container } = render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the wizard on first run (configured === false, enabled)', () => {
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    expect(screen.getByTestId('ae-onboarding')).toBeTruthy()
  })

  it('"Bỏ qua" dismisses the first-run gate', () => {
    const spy = vi.spyOn(onboarding, 'dismissFirstRunOnboarding').mockImplementation(() => {})
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ae-onboarding-skip'))
    expect(spy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run → fail**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/onboarding-screen.test.tsx`
Expected: FAIL — `./onboarding-screen` missing.

- [ ] **Step 3: Implement the scaffold + gate + Picker**

Author `onboarding-screen.tsx`: a full-screen `[data-aether-theme='aether']` container (`.ae-screen-bare`-style, owns one gutter), a centered `GlassSlab size="lg"` card, an Orbitron heading + `LivingOrb` presence, a `ReasonNotice` (restyled), and the three macro-state branches. **Restyle the legacy `Picker` (overlay lines 431–~520) and `ApiKeyForm`** with `--ae-*` tokens, binding controls per the table. Always render a **"Bỏ qua"** control (`data-testid="ae-onboarding-skip"` → `dismissFirstRunOnboarding()`) except in manual mode (where it's a close button → `closeManualOnboarding()`). Root element carries `data-testid="ae-onboarding"`.

Key structure (fill the picker/flow bodies by restyling the cited overlay sub-components; bindings are fixed):

```tsx
import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useRef } from 'react'

import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { isProviderSetupErrorMessage } from '@/lib/provider-setup-errors'
import {
  $desktopOnboarding, DEFAULT_MANUAL_ONBOARDING_REASON, DEFAULT_ONBOARDING_REASON,
  dismissFirstRunOnboarding, closeManualOnboarding, refreshOnboarding,
  type OnboardingContext,
} from '@/store/onboarding'

export function AetherOnboarding({ enabled, onCompleted, requestGateway }: {
  enabled: boolean
  onCompleted?: () => void
  requestGateway: OnboardingContext['requestGateway']
}) {
  const onboarding = useStore($desktopOnboarding)
  const ctxRef = useRef<OnboardingContext>({ requestGateway, onCompleted })
  ctxRef.current = { requestGateway, onCompleted }
  const ctx = useMemo<OnboardingContext>(() => ({
    requestGateway: (...a) => ctxRef.current.requestGateway(...a),
    onCompleted: () => ctxRef.current.onCompleted?.(),
  }), [])

  useEffect(() => {
    if (enabled || onboarding.requested) void refreshOnboarding(ctx)
  }, [ctx, enabled, onboarding.requested])

  if (onboarding.configured === true && !onboarding.manual) return null
  if (onboarding.firstRunSkipped && !onboarding.manual) return null

  const { flow } = onboarding
  const ready = onboarding.manual || (enabled && onboarding.configured === false)
  const showPicker = flow.status === 'idle' || flow.status === 'success'
  const rawReason = onboarding.reason?.trim() || null
  const reason = rawReason && !isProviderSetupErrorMessage(rawReason)
    && rawReason !== DEFAULT_ONBOARDING_REASON && rawReason !== DEFAULT_MANUAL_ONBOARDING_REASON ? rawReason : null

  return (
    <div className="fixed inset-0 z-[1300] grid place-items-center p-[var(--ae-page-t)_var(--ae-page-x)]" data-aether-theme="aether" data-testid="ae-onboarding">
      <div className="ae-shell-bg" />
      <GlassSlab className="relative z-[1] w-full max-w-[46rem]" size="lg">
        <div className="mb-4 flex items-center gap-3">
          <LivingOrb size={64} state="idle" label="AETHER" />
          <div>
            <h2 className="font-[Orbitron] text-[18px] tracking-[.12em] text-white">HYPERTEK · AGENT PLATFORM</h2>
            <p className="text-[12.5px] text-[color:var(--ae-dim)]">Thiết lập nhà cung cấp suy luận để bắt đầu.</p>
          </div>
        </div>
        {reason ? <div className="mb-3 rounded-[12px] border border-[rgba(120,200,255,.25)] p-3 text-[12.5px] text-[color:var(--ae-dim)]">{reason}</div> : null}
        {/* ready ? (showPicker ? <PickerView ctx={ctx}/> : <FlowView ctx={ctx} flow={flow}/>) : <PreparingView/> */}
        {/* PickerView: restyle overlay Picker (lines 431+): provider rows → startProviderOAuth(p, ctx);
            "Dùng API key" → setOnboardingMode('apikey'); ApiKeyForm onSave → saveOnboardingApiKey(...). */}
        <div className="mt-4 flex justify-center border-t border-[rgba(120,200,255,.16)] pt-3">
          {onboarding.manual ? (
            <button className="text-[12px] text-[color:var(--ae-dim)] underline" onClick={() => closeManualOnboarding()} type="button">Đóng</button>
          ) : (
            <button className="text-[12px] text-[color:var(--ae-dim)] underline" data-testid="ae-onboarding-skip" onClick={() => dismissFirstRunOnboarding()} type="button">Bỏ qua, để sau</button>
          )}
        </div>
      </GlassSlab>
    </div>
  )
}
```

Fill `PickerView` / `FlowView` / `PreparingView` by restyling the cited overlay sub-components with `--ae-*` tokens and the binding table. (Reuse `t.onboarding.*` i18n keys.)

- [ ] **Step 4: Run → pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/onboarding-screen.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/onboarding-screen.tsx apps/desktop/src/aether/ui/screens/onboarding-screen.test.tsx
git commit -m "feat(aether): AETHER onboarding scaffold + first-run gate + provider/model picker"
```

---

### Task 2: FlowPanel sub-states + finish

**Files:**
- Modify: `src/aether/ui/screens/onboarding-screen.tsx` (add `FlowView` covering OAuth + confirming_model)
- Modify: `src/aether/ui/screens/onboarding-screen.test.tsx`

**Interfaces:**
- Consumes: `setOnboardingCode`, `submitOnboardingCode`, `copyDeviceCode`, `copyExternalCommand`, `recheckExternalSignin`, `cancelOnboardingFlow`, `setOnboardingModel`, `confirmOnboardingModel`.

**Restyle the legacy `FlowPanel`** to render each `flow.status`:
- `starting`/`submitting`/`awaiting_browser` → a `GlassSlab` "đang xử lý" status (reuse a spinner/`LivingOrb state="thinking"`).
- `awaiting_user` → paste-code field → `setOnboardingCode` + submit → `submitOnboardingCode(ctx)`; cancel → `cancelOnboardingFlow()`.
- `polling` → device `user_code` + `copyDeviceCode()`; cancel.
- `external_pending` → `cli_command` + `copyExternalCommand()` + `recheckExternalSignin(ctx)`.
- `error` → message + retry (`cancelOnboardingFlow()` back to picker).
- `confirming_model` → model picker (`setOnboardingModel`) + **"Bắt đầu"** → `confirmOnboardingModel(ctx)`.

- [ ] **Step 1: Add the failing interaction test**

```tsx
import { confirmOnboardingModel } from '@/store/onboarding'

describe('AetherOnboarding finish', () => {
  it('confirming_model → "Bắt đầu" calls confirmOnboardingModel', () => {
    const spy = vi.spyOn(onboarding, 'confirmOnboardingModel').mockImplementation(() => {})
    $desktopOnboarding.set({
      ...base, configured: false,
      flow: { status: 'confirming_model', currentModel: 'nous-1', label: 'Nous', providerSlug: 'nous', saving: false },
    })
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ae-onboarding-begin'))
    expect(spy).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run → fail** — `ae-onboarding-begin` not present yet.

Run: `npx vitest run --environment jsdom src/aether/ui/screens/onboarding-screen.test.tsx`

- [ ] **Step 3: Implement `FlowView`** with the bindings above; the `confirming_model` branch's primary button carries `data-testid="ae-onboarding-begin"` → `confirmOnboardingModel(ctx)`. Restyle the legacy `FlowPanel` (cited) per state.

- [ ] **Step 4: Run → pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/onboarding-screen.test.tsx`
Expected: PASS (all).

- [ ] **Step 5: Typecheck + aether suite**

Run: `npx tsc -p . --noEmit && npx vitest run --environment jsdom src/aether`
Expected: clean + green.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/onboarding-screen.tsx apps/desktop/src/aether/ui/screens/onboarding-screen.test.tsx
git commit -m "feat(aether): onboarding OAuth/API-key/confirm flow states (AETHER restyle)"
```

---

### Task 3: Swap the first-run gate + ⌘K reopen

**Files:**
- Modify: `src/app/desktop-controller.tsx`
- Modify: `src/app/command-palette/index.tsx`
- Test: `src/app/command-palette/*` (if a catalog test exists) + a controller assertion

**Interfaces:**
- Consumes: `AetherOnboarding` (Task 1); `startManualOnboarding` from `@/store/onboarding`.

- [ ] **Step 1: Swap the mount in `desktop-controller.tsx`** — replace the `<DesktopOnboardingOverlay … />` block (≈ lines 903–913) with `<AetherOnboarding … />`, keeping the identical props/effects:

```tsx
{bootDone && !isSecondaryWindow() && (
  <AetherOnboarding
    enabled={gatewayState === 'open'}
    onCompleted={() => {
      void refreshAetherConfig()
      void refreshCurrentModel()
      void queryClient.invalidateQueries({ queryKey: ['model-options'] })
    }}
    requestGateway={requestGateway}
  />
)}
```
Update imports: remove the now-unused `DesktopOnboardingOverlay` import; add `import { AetherOnboarding } from '@/aether/ui/screens/onboarding-screen'`.

- [ ] **Step 2: Add the ⌘K "Mở lại Onboarding" action** in `command-palette/index.tsx` — inside `aetherActionItems` (the "Hành động nhanh" group), add:

```tsx
    {
      icon: Sparkles, // reuse an icon already imported in this file
      id: 'action-onboarding',
      keywords: ['onboarding', 'thiết lập', 'provider', 'setup'],
      label: 'Mở lại Onboarding',
      run: () => startManualOnboarding(),
    },
```
(Add `import { startManualOnboarding } from '@/store/onboarding'`.)

- [ ] **Step 3: Typecheck + full aether suite + any controller/palette test**

Run: `npx tsc -p . --noEmit && npx vitest run --environment jsdom src/aether && npx vitest run --environment jsdom src/app/command-palette src/app/desktop-controller`
Expected: clean + green. Update any palette catalog test to include `action-onboarding`. If a `desktop-controller` test asserted the legacy overlay, update it to `AetherOnboarding`.

- [ ] **Step 4: Manual smoke (recommended)** — launch the app with a fresh config (no provider) and confirm: the AETHER wizard shows on first run; picking a provider runs OAuth; "Bỏ qua" enters the app; ⌘K → "Mở lại Onboarding" reopens it in manual mode. Reduced-motion: orb falls back to CSS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/app/desktop-controller.tsx apps/desktop/src/app/command-palette/index.tsx
git commit -m "feat(aether): swap first-run gate to AETHER onboarding + ⌘K reopen (closes 16-screen map)"
```

---

## Self-Review (plan vs SP-3 spec §5.2, §6, §8, §9 item 3)

- **Full-screen AETHER wizard over `store/onboarding.ts`, restyle-not-rewrite** — Tasks 1–2 reuse every action; no store logic changes. ✓
- **Gate first-run when `configured === false`; replace legacy overlay** — Task 1 gate + Task 3 controller swap. ✓
- **"Bỏ qua" → `dismissFirstRunOnboarding`** — Task 1 (tested). ✓
- **"Ready" = ≥1 provider+model (`configured`)** — gate uses `configured`; finish via `confirmOnboardingModel` (Task 2, tested). ✓
- **Reopen via ⌘K (manual mode)** — Task 3 `startManualOnboarding`. ✓
- **Prompt-cache-safe absolute** — only store actions (REST/OAuth via `requestGateway`); no delta/conversation; no guard needed because no stream code is imported. ✓
- **Living Orb presence, Orbitron heading, brand navy, GlassSlab, motion gate** — Task 1 scaffold. ✓
- **0 Python core changes** — renderer-only. ✓
- **Decomposition order matches §9 item 3** — scaffold/gate → flow states → controller swap/⌘K. ✓
- **Closes 16-screen map** — Task 3 retires the last legacy overlay for the AETHER screen. ✓

**Restyle method note (not a placeholder):** spec §5.2 mandates reuse of the existing flow; the intricate provider-list / OAuth / API-key bodies are restyled from the cited legacy sub-components (`Picker`/`ApiKeyForm`/`FlowPanel`/`Preparing`) binding to the fixed action table above. The store is the contract; only chrome changes.
