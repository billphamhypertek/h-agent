# AETHER SP-3 Slice 1 — Orb Foundation (`listening` / `speaking`) Implementation Plan

> **Trạng thái: ✅ HOÀN TẤT** (2026-06-28) — merged vào `main`. 4 task xong: commits `1c9b704` ($voiceListening atom), `62d281e` (motion-store priority + wiring), `09bf35c` (GL orb STATE_VALUE + shader), `f9ad9d7` (CSS-fallback orb). Suite `src/aether` xanh, `tsc` sạch. Khép kín nhánh "open design fork" về `usePromptActions` ở footer — đã giải quyết trong [SP-3.2](./2026-06-27-aether-sp3-2-voice-screen.md) (adapter `useVoiceSession`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Living Orb state machine with two new states — `listening` (mic open) and `speaking` (TTS playing) — wired to the existing voice signals, so the orb reacts correctly during a voice turn. No screen yet; this is the foundation Slice 2 (Voice screen) builds on.

**Architecture:** `OrbState` gains `'listening' | 'speaking'`. `deriveOrbState` becomes a pure 5-way priority function (`speaking > listening > thinking > idle > paused`). The `$orbState` computed feeds it two new inputs: `$voicePlayback.status === 'speaking'` (already exists in `src/store/voice-playback.ts`) and a new thin `$voiceListening` atom (`aether/domain/voice/voice-presence.ts`, set by the voice loop in Slice 2). Both GL (`living-orb-gl` STATE_VALUE + `shaders/orb.ts` uniform) and the CSS fallback (`living-orb.tsx` + `aether.css`) render the two new states. `aether-canvas.tsx` already passes `$orbState` straight through — no change there.

**Tech Stack:** React 18, nanostores (`atom`/`computed`), `@react-three/fiber` + three.js (GL orb), GLSL, vitest + jsdom + `@testing-library/react`.

## Global Constraints

- **0 changes to Python core** (`aether_cli/*`, gateway handlers). This slice is renderer-only. (SP-3 spec §3)
- **Brand `#07397d`** via tokens; **no hardcoded colors** outside the `--ae-*` / `--dt-*` systems. Orb GLSL colors stay within the existing `uAzure`/`uAzureSoft` uniform scheme. (SP-3 spec §3)
- **Localization:** UI text Vietnamese; **never** translate "Agent" → "Đại lý"; platform name **"HYPERTEK - AGENT PLATFORM"**. (No user-facing copy in this slice, but honor it in any added label.)
- **Respect `prefers-reduced-motion`** + the SP-0 motion gate at every orb transition. New orb animations live on `.ae-orb*` selectors already covered by the existing `@media (prefers-reduced-motion: reduce)` block — verify, don't bypass. (SP-3 spec §3, §5.3)
- **`--ae-*` geometry is mode-independent**; only color tokens fork under `[data-aether-mode='light']`; `--ae-*` resolve only under `[data-aether-theme='aether']`. (SP-3 spec §3)
- **Orb-state priority (hard):** `speaking > listening > thinking > idle > paused`. (SP-3 spec §5.3)
- **No LLM re-trigger.** `listening`/`speaking` derive from local voice signals only; never subscribe to `message.delta`/`reasoning.delta`/`thinking.*` and never call `appendAssistantDelta`. (SP-3 spec §6)
- Keep the `src/aether` test suite green between every task: `npx vitest run --environment jsdom src/aether`.

---

## File Structure

- `src/aether/domain/voice/voice-presence.ts` — **NEW.** Thin presence atom `$voiceListening` + `setVoiceListening()`. (Slice 2 adds a transcript selector to the same file.)
- `src/aether/domain/voice/voice-presence.test.ts` — **NEW.** Unit test for the atom + setter.
- `src/aether/domain/motion/motion-store.ts` — **MODIFY.** `OrbState` union; `deriveOrbState` 5-way priority; `$orbState` computed reads `$voicePlayback` + `$voiceListening`.
- `src/aether/domain/motion/motion-store.test.ts` — **MODIFY.** Update 2-arg calls to 4-arg; add priority + computed-wiring tests.
- `src/aether/ui/motion/living-orb-gl.tsx` — **MODIFY.** Export `STATE_VALUE`; add `listening`/`speaking` numeric values.
- `src/aether/ui/motion/living-orb-gl.test.tsx` — **NEW.** Assert `STATE_VALUE` covers all 5 states with distinct values.
- `src/aether/ui/motion/shaders/orb.ts` — **MODIFY.** Uniform comment + GLSL branches for the two new state bands (not unit-testable; GLSL).
- `src/aether/ui/orb/living-orb.tsx` — **MODIFY.** `LivingOrbProps.state` → `OrbState` (gains `speaking`).
- `src/aether/ui/orb/living-orb.test.tsx` — **NEW.** Assert the rendered container gets `ae-orb--<state>` for each state incl. the two new ones.
- `src/aether/ui/theme/aether.css` — **MODIFY.** Add `.ae-orb--listening` + `.ae-orb--speaking` rules.

Dependency order: **Task 1 (presence atom)** → **Task 2 (motion-store, depends on the atom)** → **Task 3 (GL + shader)** → **Task 4 (CSS fallback + props)**. Tasks 3 and 4 are independent of each other but both depend on Task 2's `OrbState` union.

---

### Task 1: Voice presence atom (`$voiceListening`)

**Files:**
- Create: `src/aether/domain/voice/voice-presence.ts`
- Test: `src/aether/domain/voice/voice-presence.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module; `atom` from `nanostores`).
- Produces: `export const $voiceListening: WritableAtom<boolean>` (default `false`); `export function setVoiceListening(listening: boolean): void`. Consumed by `motion-store.ts` (Task 2) and, in Slice 2, set by the voice loop.

- [ ] **Step 1: Write the failing test**

```typescript
// src/aether/domain/voice/voice-presence.test.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { $voiceListening, setVoiceListening } from './voice-presence'

beforeEach(() => {
  $voiceListening.set(false)
})

describe('$voiceListening presence atom', () => {
  it('defaults to false (mic closed)', () => {
    expect($voiceListening.get()).toBe(false)
  })

  it('setVoiceListening flips the atom', () => {
    setVoiceListening(true)
    expect($voiceListening.get()).toBe(true)
    setVoiceListening(false)
    expect($voiceListening.get()).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/voice-presence.test.ts`
Expected: FAIL — cannot resolve `./voice-presence`.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/aether/domain/voice/voice-presence.ts
import { atom } from 'nanostores'

// Local voice presence: true while the hands-free mic is open (set by the
// voice loop in Slice 2). Read by the orb state machine — never re-triggers an
// LLM; this is a UI-only signal.
export const $voiceListening = atom(false)

export function setVoiceListening(listening: boolean) {
  $voiceListening.set(listening)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/domain/voice/voice-presence.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/aether/domain/voice/voice-presence.ts src/aether/domain/voice/voice-presence.test.ts
git commit -m "feat(aether): \$voiceListening presence atom for orb listening state"
```

---

### Task 2: Extend `OrbState` + `deriveOrbState` priority + wire `$orbState`

**Files:**
- Modify: `src/aether/domain/motion/motion-store.ts` (whole file)
- Modify: `src/aether/domain/motion/motion-store.test.ts` (whole file)

**Interfaces:**
- Consumes: `$busy`, `$gatewayState` from `@/store/session`; `$voicePlayback` from `@/store/voice-playback` (value `{ status: 'idle' | 'preparing' | 'speaking', … }`); `$voiceListening` from `@/aether/domain/voice/voice-presence` (Task 1).
- Produces: `export type OrbState = 'speaking' | 'listening' | 'thinking' | 'idle' | 'paused'`; `export function deriveOrbState(busy: boolean, gatewayState: string, speaking: boolean, listening: boolean): OrbState`; unchanged exports `$orbState` (now 4-input computed) and `$motionActive`. Downstream `living-orb-gl` STATE_VALUE (Task 3) and `living-orb` props (Task 4) widen to match the new union.

**Current file (for reference — replace it):**
```typescript
import { atom, computed } from 'nanostores'
import { $busy, $gatewayState } from '@/store/session'

export type OrbState = 'thinking' | 'idle' | 'paused'

export function deriveOrbState(busy: boolean, gatewayState: string): OrbState {
  if (busy) return 'thinking'
  if (gatewayState === 'open') return 'idle'
  return 'paused'
}

export const $orbState = computed([$busy, $gatewayState], (busy, gatewayState) =>
  deriveOrbState(busy, gatewayState),
)

export const $motionActive = atom(false)
```

- [ ] **Step 1: Write the failing tests** (replace the whole test file)

```typescript
// src/aether/domain/motion/motion-store.test.ts
import { beforeEach, describe, expect, it } from 'vitest'

import { $voiceListening } from '@/aether/domain/voice/voice-presence'
import { $busy, $gatewayState } from '@/store/session'
import { $voicePlayback } from '@/store/voice-playback'

import { $orbState, deriveOrbState } from './motion-store'

describe('deriveOrbState (orb-state priority: speaking > listening > thinking > idle > paused)', () => {
  it('speaking wins over everything', () => {
    expect(deriveOrbState(true, 'open', true, true)).toBe('speaking')
    expect(deriveOrbState(false, 'closed', true, false)).toBe('speaking')
  })
  it('listening wins over thinking/idle/paused when not speaking', () => {
    expect(deriveOrbState(true, 'open', false, true)).toBe('listening')
    expect(deriveOrbState(false, 'closed', false, true)).toBe('listening')
  })
  it('busy ⇒ thinking when no voice activity', () => {
    expect(deriveOrbState(true, 'open', false, false)).toBe('thinking')
    expect(deriveOrbState(true, 'closed', false, false)).toBe('thinking')
  })
  it('not busy + gateway open ⇒ idle', () => {
    expect(deriveOrbState(false, 'open', false, false)).toBe('idle')
  })
  it('not busy + gateway not open ⇒ paused (dim)', () => {
    expect(deriveOrbState(false, 'closed', false, false)).toBe('paused')
    expect(deriveOrbState(false, 'error', false, false)).toBe('paused')
  })
})

describe('$orbState computed wiring', () => {
  beforeEach(() => {
    $busy.set(false)
    $gatewayState.set('open')
    $voiceListening.set(false)
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: null, status: 'idle' })
  })

  it('reflects $voicePlayback speaking as orb speaking', () => {
    $voicePlayback.set({ audioElement: null, messageId: null, sequence: 0, source: 'voice-conversation', status: 'speaking' })
    expect($orbState.get()).toBe('speaking')
  })
  it('reflects $voiceListening as orb listening', () => {
    $voiceListening.set(true)
    expect($orbState.get()).toBe('listening')
  })
  it('falls back to idle with no voice activity and gateway open', () => {
    expect($orbState.get()).toBe('idle')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/motion/motion-store.test.ts`
Expected: FAIL — `deriveOrbState` arity / `'speaking'` not assignable, and computed does not yet read voice atoms.

- [ ] **Step 3: Write the implementation** (replace the whole file)

```typescript
// src/aether/domain/motion/motion-store.ts
import { atom, computed } from 'nanostores'

import { $voiceListening } from '@/aether/domain/voice/voice-presence'
import { $busy, $gatewayState } from '@/store/session'
import { $voicePlayback } from '@/store/voice-playback'

export type OrbState = 'speaking' | 'listening' | 'thinking' | 'idle' | 'paused'

// Priority (SP-3 spec §5.3): speaking > listening > thinking > idle > paused.
// `gatewayState` is the raw ConnectionState string ('open' ⇒ online).
export function deriveOrbState(
  busy: boolean,
  gatewayState: string,
  speaking: boolean,
  listening: boolean,
): OrbState {
  if (speaking) return 'speaking'
  if (listening) return 'listening'
  if (busy) return 'thinking'
  if (gatewayState === 'open') return 'idle'
  return 'paused'
}

export const $orbState = computed(
  [$busy, $gatewayState, $voicePlayback, $voiceListening],
  (busy, gatewayState, playback, listening) =>
    deriveOrbState(busy, gatewayState, playback.status === 'speaking', listening),
)

// Set true once the Canvas mounts (gate passed); read by the CSS-fallback path.
export const $motionActive = atom(false)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/domain/motion/motion-store.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Run the aether suite + typecheck to confirm nothing else broke**

Run: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: vitest all green. `tsc` will FAIL with a `STATE_VALUE`/`Record<OrbState, number>` missing-keys error in `living-orb-gl.tsx` (`listening`/`speaking` not provided) and possibly a `LivingOrbProps` mismatch — that is expected and is fixed in Tasks 3–4. (If you want a clean typecheck before committing, do Tasks 3–4 first and commit all three together; otherwise commit now and let Task 3 restore tsc.)

- [ ] **Step 6: Commit**

```bash
git add src/aether/domain/motion/motion-store.ts src/aether/domain/motion/motion-store.test.ts
git commit -m "feat(aether): orb state machine gains listening/speaking (priority + voice wiring)"
```

---

### Task 3: GL orb — `STATE_VALUE` for new states + shader uniform bands

**Files:**
- Modify: `src/aether/ui/motion/living-orb-gl.tsx`
- Modify: `src/aether/ui/motion/shaders/orb.ts`
- Test: `src/aether/ui/motion/living-orb-gl.test.tsx` (new)

**Interfaces:**
- Consumes: `OrbState` from `@/aether/domain/motion/motion-store` (Task 2).
- Produces: `export const STATE_VALUE: Record<OrbState, number>` (must export so it is testable). Values feed the `uState` GLSL uniform.

**State→uniform value map (chosen so the shader can band them):**
`idle: 0`, `paused: 0.4`, `listening: 0.7`, `speaking: 0.9`, `thinking: 1`. The shader dims only `paused` (band `0.35–0.45`), animates everything ≥ `0.55` (listening/speaking/thinking), and tints `listening` (band `0.6–0.8`) and `speaking` (band `0.8–0.95`) distinctly.

- [ ] **Step 1: Write the failing test**

```typescript
// src/aether/ui/motion/living-orb-gl.test.tsx
import { describe, expect, it } from 'vitest'

import type { OrbState } from '@/aether/domain/motion/motion-store'

import { STATE_VALUE } from './living-orb-gl'

const ALL_STATES: OrbState[] = ['speaking', 'listening', 'thinking', 'idle', 'paused']

describe('LivingOrbGL STATE_VALUE', () => {
  it('maps every OrbState to a uniform value', () => {
    for (const state of ALL_STATES) {
      expect(typeof STATE_VALUE[state]).toBe('number')
    }
  })

  it('gives listening and speaking distinct values from idle/paused/thinking', () => {
    const values = new Set(ALL_STATES.map(s => STATE_VALUE[s]))
    expect(values.size).toBe(ALL_STATES.length)
    // listening/speaking sit in the "animated, not dimmed" range (> 0.55, <= 1)
    expect(STATE_VALUE.listening).toBeGreaterThan(0.55)
    expect(STATE_VALUE.speaking).toBeGreaterThan(0.55)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/living-orb-gl.test.tsx`
Expected: FAIL — `STATE_VALUE` is not exported (and currently lacks `listening`/`speaking`).

- [ ] **Step 3: Update `living-orb-gl.tsx`** — export `STATE_VALUE`, add the two states

Replace line 8 (`const STATE_VALUE: Record<OrbState, number> = { thinking: 1, idle: 0, paused: 0.4 }`) with:

```typescript
export const STATE_VALUE: Record<OrbState, number> = {
  idle: 0,
  paused: 0.4,
  listening: 0.7,
  speaking: 0.9,
  thinking: 1,
}
```

(No other change needed in this file — `useFrame` already does `STATE_VALUE[state]`.)

- [ ] **Step 4: Update `shaders/orb.ts`** — band the two new states in GLSL

Replace the fragment-shader body (the `AETHER_ORB_FRAG` template) with this version; the vertex shader and exports are unchanged:

```typescript
export const AETHER_ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform float uTime;
  uniform float uState; // 0 idle · 0.4 paused · 0.7 listening · 0.9 speaking · 1.0 thinking
  uniform vec3 uAzure;
  uniform vec3 uAzureSoft;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * uState));
    // Breathe for listening/speaking/thinking (uState >= 0.55); idle+paused static.
    float pulseW = step(0.55, uState);
    // Narrow bands so each new state reads distinctly.
    float listening = step(0.6, uState) * (1.0 - step(0.8, uState));  // ~0.7
    float speaking  = step(0.8, uState) * (1.0 - step(0.95, uState)); // ~0.9
    vec3 base = mix(uAzure, uAzureSoft, fres);
    // listening leans cyan; speaking leans bright azure-white.
    vec3 tint = vec3(0.0, 0.30, 0.42) * listening + vec3(0.34, 0.46, 0.62) * speaking;
    float amp = 0.6 + 0.5 * speaking; // speaking glows harder
    float glow = fres * (0.4 + 0.6 * mix(0.6, pulse, pulseW)) * amp;
    vec3 col = base + (uAzureSoft + tint) * glow * 0.8; // rim bloom + state tint
    // Dim ONLY paused (uState ~= 0.4); all other states stay full brightness.
    float dim = mix(1.0, 0.45, step(0.35, uState) * (1.0 - step(0.45, uState)));
    gl_FragColor = vec4(col * dim, 1.0);
  }
`
```

- [ ] **Step 5: Run the test + typecheck**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/living-orb-gl.test.tsx && npx tsc -p . --noEmit`
Expected: test PASS (2 tests). `tsc` now passes the `STATE_VALUE` exhaustiveness check; the only remaining error (if Task 2 was committed alone) is the `LivingOrbProps` union in `living-orb.tsx`, fixed in Task 4.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/motion/living-orb-gl.tsx src/aether/ui/motion/shaders/orb.ts src/aether/ui/motion/living-orb-gl.test.tsx
git commit -m "feat(aether): GL orb renders listening/speaking (STATE_VALUE + shader bands)"
```

---

### Task 4: CSS-fallback orb — props widen to `OrbState` + `listening`/`speaking` classes

**Files:**
- Modify: `src/aether/ui/orb/living-orb.tsx`
- Modify: `src/aether/ui/theme/aether.css`
- Test: `src/aether/ui/orb/living-orb.test.tsx` (new)

**Interfaces:**
- Consumes: `OrbState` + `$orbState` from `@/aether/domain/motion/motion-store` (Task 2).
- Produces: `LivingOrb` renders a container with class `ae-orb--<state>` for all 5 states; CSS defines visuals for the two new ones.

- [ ] **Step 1: Write the failing test**

```typescript
// src/aether/ui/orb/living-orb.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import type { OrbState } from '@/aether/domain/motion/motion-store'

import { LivingOrb } from './living-orb'

afterEach(cleanup)

const ALL_STATES: OrbState[] = ['speaking', 'listening', 'thinking', 'idle', 'paused']

describe('LivingOrb forced state → class', () => {
  it.each(ALL_STATES)('renders ae-orb--%s for a forced state', state => {
    render(<LivingOrb state={state} />)
    expect(screen.getByRole('status').className).toContain(`ae-orb--${state}`)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/orb/living-orb.test.tsx`
Expected: FAIL — the `state` prop type does not accept `'speaking'` (and tsc/test rejects it).

- [ ] **Step 3: Widen the prop type in `living-orb.tsx`**

Add the import and change the `state` prop to the shared `OrbState` union. Replace the import block + `LivingOrbProps`:

```typescript
import { useStore } from '@nanostores/react'

import { $orbState, type OrbState } from '@/aether/domain/motion/motion-store'
import { cn } from '@/lib/utils'

export interface LivingOrbProps {
  /** Force a specific state (Boot uses this). When omitted, the orb tracks the runtime `$orbState`. */
  state?: OrbState
  size?: number
  label?: string
  className?: string
}
```

(The component body is unchanged — it already does `state ?? live` and `` `ae-orb--${effective}` ``.)

- [ ] **Step 4: Add the CSS for the two new states in `aether.css`**

Immediately after the existing `.ae-orb--thinking .ae-orb { animation: ae-breath 2.6s ease-in-out infinite; }` rule, add:

```css
/* listening (mic open) — slower, calmer breath + cyan-leaning ring */
.ae-orb--listening .ae-orb {
  animation: ae-breath 3.4s ease-in-out infinite;
}
.ae-orb--listening .ae-orb-ring {
  border-top-color: rgba(120, 245, 255, 0.95);
}
/* speaking (agent replying) — quicker breath, brighter */
.ae-orb--speaking .ae-orb {
  animation: ae-breath 1.6s ease-in-out infinite;
  filter: brightness(1.12) saturate(1.08);
}
.ae-orb--speaking .ae-orb-ring {
  animation-duration: 8s;
}
```

- [ ] **Step 5: Verify reduced-motion still gates the new animations**

Confirm the existing `@media (prefers-reduced-motion: reduce)` block in `aether.css` lists `[data-aether-theme='aether'] .ae-orb`, `.ae-orb-stage`, and `.ae-orb-ring` with `animation: none !important`. Those selectors already cover `.ae-orb--listening .ae-orb` and `.ae-orb--speaking .ae-orb` (same `.ae-orb` target), so the new breaths are auto-disabled under reduced motion. The `speaking` static `filter: brightness()` is intentional (not motion) and may remain. No change needed — just verify the selectors are present.

- [ ] **Step 6: Run the test + full aether suite + typecheck**

Run: `npx vitest run --environment jsdom src/aether/ui/orb/living-orb.test.tsx && npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: living-orb test PASS (5 cases); full aether suite green; `tsc` clean.

- [ ] **Step 7: Commit**

```bash
git add src/aether/ui/orb/living-orb.tsx src/aether/ui/theme/aether.css src/aether/ui/orb/living-orb.test.tsx
git commit -m "feat(aether): CSS-fallback orb renders listening/speaking states"
```

---

## Self-Review (plan vs SP-3 spec §5.3, §9 item 1)

- **`OrbState += listening | speaking`** — Task 2. ✓
- **`deriveOrbState` priority `speaking > listening > thinking > idle > paused`** — Task 2 (pure tests cover every rung). ✓
- **`$voiceListening` atom in `aether/domain/voice/voice-presence.ts`** — Task 1. ✓
- **`speaking` from `$voicePlayback.status === 'speaking'`** — Task 2 `$orbState` computed + test. ✓
- **`living-orb-gl` `STATE_VALUE` += listening/speaking; `shaders/orb.ts` new uniform handling** — Task 3. ✓
- **`living-orb.tsx` CSS fallback class for the 2 new states** — Task 4 (`+ aether.css` rules). ✓
- **Respect motion gate / `prefers-reduced-motion`** — Task 4 Step 5 verifies existing reduce block covers the new animations. ✓
- **No LLM re-trigger; local signals only** — `$voiceListening` + `$voicePlayback` are local UI atoms; no delta subscription anywhere in this slice. ✓
- **Green between slices** — every task ends with a passing `src/aether` run; Task 2's interim tsc gap is documented and closed by Task 3. ✓
- **Scope note:** spec §5.3 flags `speaking` as an addition beyond the program-spec's `listening` — included here, bounded, same mechanism. ✓

**Next slices (not in this plan):** Slice 2 — Voice/Ambient screen (consumes `$voiceListening` + `$orbState`; **open design fork:** the voice send-path (`submitText`/`transcribeVoiceAudio`) lives in the deeply context-bound `usePromptActions`, so a standalone `/voice` screen cannot cheaply instantiate its own `useVoiceConversation` — resolve before planning Slice 2). Slice 3 — Onboarding screen (independent; restyle `store/onboarding.ts` over the legacy `desktop-onboarding-overlay.tsx`).
