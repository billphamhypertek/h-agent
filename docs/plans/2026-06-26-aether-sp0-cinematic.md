# AETHER Desktop — SP-0: Stabilize + Cinematic WebGL Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the four shipped AETHER screens (Boot · HUD · Chat · Brief) — kill the macOS traffic-light-over-logo bug and the "padding thò ra thụt vào" drift via a `--ae-*` geometry-token layer — then lay a self-built WebGL (React-Three-Fiber + GLSL) cinematic foundation (one shared `<Canvas>`, Living Orb + ambient field, multi-layer motion gate + CSS fallback) ready for SP-1/2/3.

**Architecture:** Restyle-only over the proven runtime — streaming, tool-call cards, xterm terminal, gateway WS and ⌘K are never rewritten, only re-skinned via tokens/classNames. Geometry numbers get a single source of truth: `geometry.ts` (TS constants) bridge-pinned to `titlebar.ts` `TITLEBAR_HEIGHT`, `layout-constants.ts`, and `main.cjs`; CSS `--ae-*` vars mirror it and are test-pinned `CSS == TS`. The shell root owns one full-bleed cinematic background layer (CSS gradient now, a shared R3F `<Canvas frameloop="demand">` at z0 once WebGL lands); screen roots go transparent (`.ae-screen-bare`) and a single content wrapper owns the one `--ae-page-*` gutter. Motion is gated by reduced-motion AND remote-display AND a WebGL probe; when off, nothing mounts the Canvas and a CSS orb is the fallback.

**Tech Stack:** React 19 (`^19.2.5`, pinned `>=19.2.5 <19.3` for R3F v9 peer), TypeScript, Vite 8 (rolldown, single-chunk), nanostores + `@nanostores/react`, Tailwind CSS 4 (CSS-var tokens), `three` + `@react-three/fiber@^9` (+ `@types/three` dev), GLSL as template strings (in-shader bloom, no `postprocessing`/`vite-plugin-glsl`), Vitest 4 + jsdom + `@testing-library/react`. All work lives in the isolated `apps/desktop/src/aether/` subtree.

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the SP-0 spec (`docs/specs/2026-06-26-aether-sp0-design.md`) and project memory — do not paraphrase or invent alternatives.

- **Keep the proven runtime.** Do not rewrite streaming, tool-call cards, xterm terminal, gateway WS, or ⌘K cmdk — restyle only, via tokens/className. Never rewrite.
- **Brand core color `#07397d`** (deep navy). Tokens, not literals. **No hardcoded colors outside the `--ae-*` / `--dt-*` token system.**
- **Localization (hard rule):** UI in Vietnamese. **NEVER translate "Agent" → "Đại lý".** Keep "Agent". Displayed platform name: **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety (hard):** HUD and Brief screens **must NOT** subscribe to `message.delta` and **must NOT** poll the live conversation. They read only the cron artifact (REST), non-conversation gateway events, and REST `/status`. Never re-trigger the LLM.
- **Respect `prefers-reduced-motion`** everywhere (degrade to plain fade or none).
- **`--ae-*` geometry is mode-independent** — only **color** tokens fork under `[data-aether-mode='light']`; there is no geometry override for light mode. `--ae-*` only resolves when skin `aether` is active (`[data-aether-theme='aether']`), which the AETHER renderer sets by default.
- **Migration scope:** only tokenize **arbitrary `[...]` Tailwind values**. Standard Tailwind shorthand (`mt-3`, `gap-1.5`, `py-3.5`, …) is the canonical Tailwind scale and is kept.
- **Bridge-pinned values (test-pinned, must not drift):** `--ae-titlebar-inset` ← `titlebar.ts` `TITLEBAR_HEIGHT (34)`; `--ae-page-*` ↔ `layout-constants.ts`; `--ae-nav-w (62)` ↔ `main.cjs`. `geometry.ts` (hardcoded TS constants, **no `getComputedStyle`** — jsdom is empty and tokens are skin-gated) is the numeric source of truth; CSS mirrors it.
- **Two regressions tests MUST catch:**
  - **(a)** NavRail `padding-top == 34px` when `windowButtonPosition != null && !isFullscreen`; `0` when `windowButtonPosition == null`; `0` when fullscreen-with-nonnull-position (mac fullscreen hides traffic lights but keeps `windowButtonPosition` non-null).
  - **(b)** Double-pad caught at **SHELL level** — mount a screen inside the shell wrapper, assert the screen root has no `p-[...]` arbitrary padding **and** the content wrapper has exactly one `--ae-page-*` gutter.
- **WebGL gate is multi-layer (hard):** `motionEnabled = prefers-reduced-motion:no-preference` **AND** `!getRemoteDisplayReason()` **AND** a WebGL context probe succeeds. False → the Canvas is **not mounted**; the CSS orb / `.ae-bloom` is the fallback. GPU is disabled on remote displays (`detectRemoteDisplay()` → `app.disableHardwareAcceleration()`), so reduced-motion alone is insufficient.
- **Pin React for R3F v9:** R3F v9 peer is `react >=19 <19.3`; pin `react`/`react-dom` to `>=19.2.5 <19.3` before adding R3F, and add `three` to vite `resolve.dedupe`.

---

## Architecture & Layering Model

```
shell root  (relative, h-screen w-screen, overflow-hidden)
 ├─ z0  cinematic background  — full-bleed, position:absolute inset-0
 │        SP-0a: CSS gradient layer (.ae-shell-bg)
 │        SP-0b: shared <Canvas frameloop="demand"> (AetherCanvas) replaces/overlays it
 ├─ z1  NavRail               — flex-none, w=--ae-nav-w, padding-top=--ae-titlebar-inset
 └─ z1  content wrapper       — flex-1, the ONE --ae-page-* gutter, [-webkit-app-region:drag] top band
          ├─ TopBar           — right-pad = nativeOverlayWidth on win/linux; no-drag controls
          └─ PageTransition → <screen .ae-screen-bare>   (transparent, no self-pad, min-w-0)
Boot is a pre-shell overlay (keeps its own opaque background).
```

Orb-state mapping (`motion-store.ts` derives `$orbState`; per-call-site `state=` literals are replaced by subscribing `$orbState`, except Boot which keeps its boot-store):

| Orb state | Source (real store values) | In SP-0? |
| --- | --- | --- |
| `thinking` | `$busy === true` (`store/session.ts:219`, `atom(false)`) | yes |
| `idle` | `$gatewayState === 'open'` (`store/session.ts:173`) **and** `!$busy` | yes |
| `paused` (dim) | `$gatewayState !== 'open'` | yes |
| `listening` | voice — **not set in SP-0** (SP-3) | no |

> Note on the spec's table: the spec writes `$gatewayState === 'online'`, but the raw atom value is the `ConnectionState` string `'open'` (the existing `useConnectionStatus()` helper maps `'open' → 'online'`). This plan derives `$orbState` from the **raw** atom value `'open'` to match `store/session.ts`.

---

## File Structure

**Create:**

```
apps/desktop/src/aether/ui/theme/geometry.ts                TS numeric source of truth (radius/space/nav/avatar/orb/titlebar/page bridge consts)
apps/desktop/src/aether/ui/theme/geometry.test.ts           pins CSS --ae-* == geometry.ts TS; bridge-pins to titlebar.ts/layout-constants
apps/desktop/src/aether/ui/shell/use-titlebar-inset.ts      windowButtonPosition + isFullscreen + onWindowStateChanged → inset px
apps/desktop/src/aether/ui/shell/use-titlebar-inset.test.tsx
apps/desktop/src/aether/ui/shell/aether-shell.test.tsx      shell-level double-pad + nav padding-top regression tests
apps/desktop/src/aether/ui/motion/use-motion-enabled.ts     reduced-motion AND !remoteDisplay AND webgl-probe → boolean
apps/desktop/src/aether/ui/motion/use-motion-enabled.test.tsx
apps/desktop/src/aether/ui/motion/aether-canvas.tsx         shared <Canvas frameloop="demand"> at shell root + perf guards + dispose
apps/desktop/src/aether/ui/motion/aether-canvas.test.tsx
apps/desktop/src/aether/ui/motion/living-orb-gl.tsx         orb mesh + GLSL (in-shader bloom)
apps/desktop/src/aether/ui/motion/ambient-field.tsx         full-screen fluid shader plane (navy/azure)
apps/desktop/src/aether/ui/motion/shaders/orb.ts            GLSL vertex+fragment template-strings for the orb
apps/desktop/src/aether/ui/motion/shaders/ambient.ts        GLSL vertex+fragment template-strings for the ambient field
apps/desktop/src/aether/domain/motion/motion-store.ts       $orbState (derived from $busy/$gatewayState), $motionActive
apps/desktop/src/aether/domain/motion/motion-store.test.ts
```

**Modify:**

```
apps/desktop/src/aether/ui/theme/aether.css                 + --ae-* geometry/typography token layer; .ae-screen-bare; .ae-shell-bg; bake padding into .ae-slab (size) + .ae-cmd
apps/desktop/src/aether/ui/components/glass-slab.tsx        + size?: 'sm'|'md'|'lg' → drives --ae-slab-pad-*
apps/desktop/src/aether/ui/shell/nav-rail.tsx              import geometry consts; padding-top=--ae-titlebar-inset; drag/no-drag regions; --ae-nav-* tokens
apps/desktop/src/aether/ui/shell/nav-items.tsx             (no logic change; geometry stays in geometry.ts) — left as-is unless icons move
apps/desktop/src/aether/ui/shell/use-nav-indicator.ts      pure; consumes consts from geometry.ts (ITEM_H/GAP)
apps/desktop/src/aether/ui/shell/top-bar.tsx               avatar = --ae-avatar; right-pad = nativeOverlayWidth (win/linux); no-drag controls
apps/desktop/src/aether/ui/shell/aether-shell.tsx          background → shell root (z0); content wrapper owns one gutter; useTitlebarInset; mount AetherCanvas (gated)
apps/desktop/src/aether/ui/components/command-bar.tsx      control/kbd tokens; mark ⌘K chip inert ("sắp ra mắt")
apps/desktop/src/aether/ui/screens/command-center.tsx      .ae-screen-bare; remove self-pad (:23); GlassSlab size prop; remove p-[...] call-sites; min-w-0
apps/desktop/src/aether/ui/screens/morning-brief.tsx       .ae-screen-bare; remove self-pad (:19, double-pad); GlassSlab size prop; remove p-[...] call-sites; min-w-0
apps/desktop/src/aether/ui/screens/stub-screen.tsx         .ae-screen-bare; remove px-8 py-6 (GlassSlab size); 
apps/desktop/src/aether/ui/screens/boot-sequence.tsx       remove px-4 py-3 on .ae-slab error (GlassSlab size)
apps/desktop/src/aether/ui/orb/living-orb.tsx              orb size from --ae-orb-*; subscribe $orbState; cooperate with WebGL layer
apps/desktop/DESIGN.md                                     document the --ae-* scale + bridge points (aether/ is a sanctioned isolated subtree)
apps/desktop/package.json                                  + three, @react-three/fiber@^9, @types/three (dev); pin react/react-dom >=19.2.5 <19.3
apps/desktop/vite.config.ts                                + 'three' to resolve.dedupe
```

---

## Reference Interfaces (discovered in the codebase — used across tasks)

These are real signatures the tasks depend on. Do not redefine them.

```ts
// apps/desktop/src/global.d.ts
interface AetherConnection {
  baseUrl: string; isFullscreen: boolean; mode?: 'local'|'remote'; authMode?: 'oauth'|'token'
  nativeOverlayWidth: number; source?: 'env'|'local'|'settings'; token: string; wsUrl: string
  logs: string[]; profile?: string
  windowButtonPosition: { x: number; y: number } | null   // null ⇒ not macOS. NO `IS_MAC` field on connection.
}
// window.aetherDesktop (subset):
onWindowStateChanged?: (cb: (payload: AetherWindowState) => void) => () => void   // returns unsubscribe
getRemoteDisplayReason?: () => Promise<string | null>                            // non-null ⇒ remote display, GPU off
revealLogs: () => Promise<{ ok: boolean; path: string; error?: string }>

// apps/desktop/src/store/session.ts
export const $connection = atom<AetherConnection | null>(null)   // :172
export const $gatewayState = atom('idle')                         // :173 — 'idle'|'connecting'|'open'|'closed'|'error'
export const $busy = atom(false)                                  // :219

// apps/desktop/src/lib/keybinds/combo.ts
export const IS_MAC = /* boolean from navigator.platform/userAgent */   // :13  (import IF needed; mac-ness here = windowButtonPosition != null)

// apps/desktop/src/app/shell/titlebar.ts
export const TITLEBAR_HEIGHT = 34   // :3  — bridge source for --ae-titlebar-inset

// apps/desktop/src/app/layout-constants.ts
export const PAGE_INSET_X = 'px-[clamp(1.25rem,4vw,4rem)]'        // :9 (className token; not a raw px)

// electron/main.cjs constants (cross-source, test-pin via geometry.ts):
//   TITLEBAR_HEIGHT = 34 (:379) · NATIVE_OVERLAY_BUTTON_WIDTH = 144 (:392) · WINDOW_BUTTON_POSITION = {x:24,y:12} (:381)
//   getWindowButtonPosition() returns null when !IS_MAC (:3576) · ipc 'aether:get-remote-display-reason' (:173)

// electron/session-windows.cjs — main window webPreferences (:24): backgroundThrottling:false ⇒ MUST self-pause on hidden/idle

// Existing AETHER helpers (reused):
//   useConnectionStatus(): 'connecting'|'online'|'paused'   (maps $gatewayState 'open'→'online')
//   navIndicatorTransform(activeIndex, itemHeight, gap): string | null
//   GlassSlab({ className, children })  → gets a new optional `size` prop in Task 2
//   LivingOrb({ state?, size?, label?, className? })  default size=170, state='idle'
```

---

## Task 1: First geometry tokens + traffic-light fix (`useTitlebarInset` + nav padding)

Lands the macOS traffic-light fix **together with** the first slice of the `geometry.ts` source of truth and the `--ae-titlebar-inset` / `--ae-nav-*` tokens — so the fix is token-driven from line one (no hardcode-then-retokenize). Adds the `useTitlebarInset()` hook that derives the inset from `windowButtonPosition` + `isFullscreen` and re-derives on `onWindowStateChanged`, applies it as the nav rail's `padding-top`, makes the top band draggable, and reserves the Windows/Linux native-overlay width on the top bar.

**Files:**
- Create: `apps/desktop/src/aether/ui/theme/geometry.ts`
- Create: `apps/desktop/src/aether/ui/theme/geometry.test.ts`
- Create: `apps/desktop/src/aether/ui/shell/use-titlebar-inset.ts`
- Create: `apps/desktop/src/aether/ui/shell/use-titlebar-inset.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/nav-rail.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/use-nav-indicator.ts` (import `NAV` consts from geometry)
- Modify: `apps/desktop/src/aether/ui/theme/aether.css` (add `--ae-titlebar-inset` default + `--ae-nav-*`)
- Modify: `apps/desktop/src/aether/ui/shell/top-bar.tsx` (Windows/Linux right-pad from `nativeOverlayWidth`)

**Interfaces:**
- Consumes: `TITLEBAR_HEIGHT` from `@/app/shell/titlebar`; `$connection` from `@/store/session`; `window.aetherDesktop.onWindowStateChanged`; `navIndicatorTransform`.
- Produces:
  - `geometry.ts` exports `GEOMETRY` const object with (at least) `titlebarInset: 34`, and `NAV = { width: 62, item: 38, gap: 5 }`. Later tasks extend `GEOMETRY` with radius/space/avatar/orb groups.
  - `titlebarInsetPx(opts: { windowButtonPosition: { x: number; y: number } | null; isFullscreen: boolean }): number` — pure: returns `34` when `windowButtonPosition != null && !isFullscreen`, else `0`.
  - `useTitlebarInset(): number` — subscribes `$connection` + `onWindowStateChanged`, returns the live inset.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/desktop/src/aether/ui/theme/geometry.test.ts
import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './geometry'
import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

describe('geometry source of truth', () => {
  it('pins the titlebar inset to titlebar.ts TITLEBAR_HEIGHT (bridge)', () => {
    expect(GEOMETRY.titlebarInset).toBe(TITLEBAR_HEIGHT)
    expect(GEOMETRY.titlebarInset).toBe(34)
  })
  it('exposes nav geometry as the single numeric source', () => {
    expect(GEOMETRY.nav).toEqual({ width: 62, item: 38, gap: 5 })
  })
})
```

```tsx
// apps/desktop/src/aether/ui/shell/use-titlebar-inset.test.tsx
import { describe, expect, it } from 'vitest'
import { titlebarInsetPx } from './use-titlebar-inset'

describe('titlebarInsetPx (traffic-light regression)', () => {
  it('is 34 on macOS windowed (windowButtonPosition non-null, not fullscreen)', () => {
    expect(titlebarInsetPx({ windowButtonPosition: { x: 24, y: 12 }, isFullscreen: false })).toBe(34)
  })
  it('is 0 on Windows/Linux (windowButtonPosition null)', () => {
    expect(titlebarInsetPx({ windowButtonPosition: null, isFullscreen: false })).toBe(0)
  })
  it('is 0 when macOS fullscreen even though windowButtonPosition stays non-null', () => {
    expect(titlebarInsetPx({ windowButtonPosition: { x: 24, y: 12 }, isFullscreen: true })).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `apps/desktop`): `npx vitest run --environment jsdom src/aether/ui/theme/geometry.test.ts src/aether/ui/shell/use-titlebar-inset.test.tsx`
Expected: FAIL — `Cannot find module './geometry'` / `'./use-titlebar-inset'`.

- [ ] **Step 3: Implement `geometry.ts`, `use-titlebar-inset.ts`, wire the nav rail + tokens**

```ts
// apps/desktop/src/aether/ui/theme/geometry.ts
// Numeric source of truth for AETHER geometry. CSS --ae-* vars in aether.css mirror these;
// geometry.test.ts pins CSS == TS. Hardcoded constants (NOT getComputedStyle — jsdom is empty
// and --ae-* is skin-gated). Cross-source values are bridge-pinned to their owners.
import { TITLEBAR_HEIGHT } from '@/app/shell/titlebar'

export const GEOMETRY = {
  // bridge: titlebar.ts owns this number
  titlebarInset: TITLEBAR_HEIGHT, // 34
  // bridge: main.cjs owns the rail width (62)
  nav: { width: 62, item: 38, gap: 5 },
} as const

export type Geometry = typeof GEOMETRY
```

```ts
// apps/desktop/src/aether/ui/shell/use-titlebar-inset.ts
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { $connection } from '@/store/session'
import { GEOMETRY } from '@/aether/ui/theme/geometry'

// Pure: mac-ness = windowButtonPosition != null (NOT IS_MAC). macOS fullscreen hides the traffic
// lights but keeps windowButtonPosition non-null, so fullscreen also collapses the inset to 0.
export function titlebarInsetPx(opts: {
  windowButtonPosition: { x: number; y: number } | null
  isFullscreen: boolean
}): number {
  return opts.windowButtonPosition != null && !opts.isFullscreen ? GEOMETRY.titlebarInset : 0
}

// Live inset. Re-derives on connection change AND on window state change (enter/exit fullscreen
// at runtime) — does not read one-shot from $connection only.
export function useTitlebarInset(): number {
  const connection = useStore($connection)
  const [fullscreenOverride, setFullscreenOverride] = useState<boolean | null>(null)

  useEffect(() => {
    const off = window.aetherDesktop?.onWindowStateChanged?.((payload) => {
      setFullscreenOverride(Boolean((payload as { isFullscreen?: boolean })?.isFullscreen))
    })
    return () => off?.()
  }, [])

  const windowButtonPosition = connection?.windowButtonPosition ?? null
  const isFullscreen = fullscreenOverride ?? Boolean(connection?.isFullscreen)
  return titlebarInsetPx({ windowButtonPosition, isFullscreen })
}
```

In `apps/desktop/src/aether/ui/shell/use-nav-indicator.ts`, keep the function pure but re-export the geometry consts so call-sites read one source. Add at the top:

```ts
// apps/desktop/src/aether/ui/shell/use-nav-indicator.ts
import { GEOMETRY } from '@/aether/ui/theme/geometry'
export const NAV_ITEM_H = GEOMETRY.nav.item // 38
export const NAV_GAP = GEOMETRY.nav.gap // 5
```

In `apps/desktop/src/aether/ui/theme/aether.css`, add to the `[data-aether-theme='aether']` block (after the color vars):

```css
  /* geometry — titlebar + nav (mirrors geometry.ts; geometry.test.ts pins CSS == TS) */
  --ae-titlebar-inset: 0px; /* runtime hook overrides via inline style on the rail */
  --ae-nav-w: 62px;
  --ae-nav-item: 38px;
  --ae-nav-gap: 5px;
```

In `apps/desktop/src/aether/ui/shell/nav-rail.tsx`: import the geometry consts, drive the rail width / item / gap from tokens, apply `padding-top` = inset, and mark drag regions. Replace the constants and the `<nav>`/glyph block:

```tsx
// apps/desktop/src/aether/ui/shell/nav-rail.tsx — top of file
import { GEOMETRY } from '@/aether/ui/theme/geometry'
import { useTitlebarInset } from './use-titlebar-inset'
// remove the local `const ITEM_H = 38` / `const GAP = 5`; use GEOMETRY.nav.item / GEOMETRY.nav.gap

const ITEM_H = GEOMETRY.nav.item
const GAP = GEOMETRY.nav.gap
```

```tsx
// inside NavRail(): compute the inset and apply it as padding-top; make the top band draggable.
const titlebarInset = useTitlebarInset()
return (
  <nav
    aria-label="HYPERTEK - AGENT PLATFORM"
    className="ae-rail relative flex w-[var(--ae-nav-w)] flex-none flex-col items-center gap-1.5 pb-3.5"
    style={{
      paddingTop: `${titlebarInset}px`,
      WebkitAppRegion: 'drag',
      borderRight: '1px solid var(--ae-line)',
      background: 'linear-gradient(180deg,rgba(120,190,240,.07),rgba(120,190,240,.02))',
    } as React.CSSProperties}
  >
    {/* brand glyph stays drag; interactive controls below opt out via no-drag */}
    {/* ...existing glyph + online dot... */}
    <div
      className="relative flex w-full flex-col items-center gap-[var(--ae-nav-gap)]"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* ...existing indicator + buttons... (each button is now inside the no-drag region) */}
    </div>
    <div className="flex-1" />
    <div
      className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-[#06283c]"
      style={{ WebkitAppRegion: 'no-drag', background: 'radial-gradient(circle at 35% 30%,#cdf2ff,var(--ae-azure) 70%,var(--ae-azure-bright))' } as React.CSSProperties}
    >
      B
    </div>
  </nav>
)
```

In `apps/desktop/src/aether/ui/shell/top-bar.tsx`: reserve the native-overlay width on Windows/Linux and make controls no-drag. Change the signature + wrapper:

```tsx
// apps/desktop/src/aether/ui/shell/top-bar.tsx
import { useStore } from '@nanostores/react'
import { $connection } from '@/store/session'

export function TopBar({ title, now = new Date() }: { title: string; now?: Date }) {
  const connection = useStore($connection)
  // Windows/Linux render native min/max/close on the RIGHT via titleBarOverlay; reserve their width
  // so the right cluster never slides under the native buttons. macOS: windowButtonPosition != null ⇒ 0.
  const overlayWidth = connection?.windowButtonPosition == null ? (connection?.nativeOverlayWidth ?? 0) : 0
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ paddingRight: overlayWidth ? `${overlayWidth}px` : undefined, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-[17px] font-semibold tracking-[.01em]">{title}</h1>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* ...existing clock + avatar... */}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/geometry.test.ts src/aether/ui/shell/use-titlebar-inset.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/theme/geometry.ts apps/desktop/src/aether/ui/theme/geometry.test.ts apps/desktop/src/aether/ui/shell/use-titlebar-inset.ts apps/desktop/src/aether/ui/shell/use-titlebar-inset.test.tsx apps/desktop/src/aether/ui/shell/use-nav-indicator.ts apps/desktop/src/aether/ui/shell/nav-rail.tsx apps/desktop/src/aether/ui/shell/top-bar.tsx apps/desktop/src/aether/ui/theme/aether.css
git commit -m "fix(aether): macOS traffic-light inset via geometry.ts + --ae-titlebar-inset; reserve win/linux overlay"
```

---

## Task 2: `--ae-*` geometry token layer + atomic per-primitive padding bake

Extends `geometry.ts` and `aether.css` with the full geometry/typography token scale (radius, page gutter, column vs grid gap, slab padding, avatar/control, orb sizes, spacing, typography, hairline), and **bakes** default padding/radius into the `.ae-slab` / `.ae-cmd` primitives via a `size` prop on `GlassSlab`. Per the spec's atomic rule, the bake and the removal of **every** `p-[...]` call-site happen in the **same commit** to avoid double-padding. Only arbitrary `[...]` values are tokenized; Tailwind shorthand is kept.

**Files:**
- Modify: `apps/desktop/src/aether/ui/theme/geometry.ts` (extend `GEOMETRY` with radius/space/avatar/orb/page groups)
- Modify: `apps/desktop/src/aether/ui/theme/geometry.test.ts` (pin the new CSS vars == TS)
- Modify: `apps/desktop/src/aether/ui/theme/aether.css` (declare the token scale; bake `--ae-slab-pad-*` into `.ae-slab`; keep `.ae-cmd` padding tokenized)
- Modify: `apps/desktop/src/aether/ui/components/glass-slab.tsx` (add `size?: 'sm'|'md'|'lg'`)
- Modify (same commit, remove `p-[...]`): `command-center.tsx` (:31,36,39,47,70,77,85,90,100,109), `morning-brief.tsx` (:82,115,137), `stub-screen.tsx` (:5 `px-8 py-6`), `boot-sequence.tsx` (:64 `px-4 py-3`), `aether-shell.tsx` (:62 `px-6 py-4` paused overlay)

**Interfaces:**
- Consumes: `GEOMETRY` (Task 1).
- Produces:
  - Extended `GEOMETRY` with `radius {xs:6,sm:9,md:11,lg:14}`, `space {1:4,2:6,3:8,4:11,5:13,6:18}`, `gap {col:13,grid:18}`, `avatar:34`, `control:38`, `orb {sm:42,md:170,lg:300}`, `page {x:22,t:16,b:18}`.
  - `GlassSlab({ size?: 'sm'|'md'|'lg'; className?; children })` — default `size='md'`; sets `--ae-slab-pad` from the matching token. Slabs that pass a `size` no longer need `p-[...]`.
  - CSS tokens: `--ae-radius-{xs,sm,md,lg,full}`, `--ae-page-{x,t,b}`, `--ae-gap-col`, `--ae-gap-grid`, `--ae-slab-pad-{sm,md,lg}`, `--ae-avatar`, `--ae-control`, `--ae-orb-{sm,md,lg}`, `--ae-space-1..6`, `--ae-hairline`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/src/aether/ui/theme/geometry.test.ts — append
import { describe, expect, it } from 'vitest'
import { GEOMETRY } from './geometry'

describe('geometry token scale', () => {
  it('splits column gap (13) from grid gap (18) — not merged', () => {
    expect(GEOMETRY.gap.col).toBe(13)
    expect(GEOMETRY.gap.grid).toBe(18)
    expect(GEOMETRY.gap.col).not.toBe(GEOMETRY.gap.grid)
  })
  it('exposes radius, orb, avatar/control, and page gutter groups', () => {
    expect(GEOMETRY.radius).toEqual({ xs: 6, sm: 9, md: 11, lg: 14 })
    expect(GEOMETRY.orb).toEqual({ sm: 42, md: 170, lg: 300 })
    expect(GEOMETRY.avatar).toBe(34)
    expect(GEOMETRY.control).toBe(38)
    expect(GEOMETRY.page).toEqual({ x: 22, t: 16, b: 18 })
  })
})
```

```tsx
// apps/desktop/src/aether/ui/components/glass-slab.test.tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GlassSlab } from './glass-slab'

afterEach(cleanup)

describe('GlassSlab size prop bakes padding', () => {
  it('defaults to md and sets the --ae-slab-pad var', () => {
    const { container } = render(<GlassSlab>x</GlassSlab>)
    const el = container.firstChild as HTMLElement
    expect(el.className).toContain('ae-slab')
    expect(el.style.getPropertyValue('--ae-slab-pad')).toBe('var(--ae-slab-pad-md)')
  })
  it('uses the requested size token', () => {
    const { container } = render(<GlassSlab size="sm">x</GlassSlab>)
    expect((container.firstChild as HTMLElement).style.getPropertyValue('--ae-slab-pad')).toBe('var(--ae-slab-pad-sm)')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/geometry.test.ts src/aether/ui/components/glass-slab.test.tsx`
Expected: FAIL — `GEOMETRY.gap` undefined / `--ae-slab-pad` empty (no size prop yet).

- [ ] **Step 3: Extend geometry, declare CSS tokens, bake the primitive**

```ts
// apps/desktop/src/aether/ui/theme/geometry.ts — extend the GEOMETRY object
export const GEOMETRY = {
  titlebarInset: TITLEBAR_HEIGHT, // 34
  nav: { width: 62, item: 38, gap: 5 },
  radius: { xs: 6, sm: 9, md: 11, lg: 14 },
  space: { 1: 4, 2: 6, 3: 8, 4: 11, 5: 13, 6: 18 },
  gap: { col: 13, grid: 18 },
  avatar: 34,
  control: 38,
  orb: { sm: 42, md: 170, lg: 300 },
  page: { x: 22, t: 16, b: 18 },
} as const
```

```css
/* apps/desktop/src/aether/ui/theme/aether.css — inside [data-aether-theme='aether'], geometry block */
  --ae-radius-xs: 6px;
  --ae-radius-sm: 9px;
  --ae-radius-md: 11px;
  --ae-radius-lg: 14px;
  --ae-radius-full: 9999px;
  --ae-page-x: 22px;
  --ae-page-t: 16px;
  --ae-page-b: 18px;
  --ae-gap-col: 13px;
  --ae-gap-grid: 18px;
  --ae-slab-pad-sm: 10px 13px;
  --ae-slab-pad-md: 13px 15px;
  --ae-slab-pad-lg: 16px 18px;
  --ae-avatar: 34px;
  --ae-control: 38px;
  --ae-orb-sm: 42px;
  --ae-orb-md: 170px;
  --ae-orb-lg: 300px;
  --ae-space-1: 4px;
  --ae-space-2: 6px;
  --ae-space-3: 8px;
  --ae-space-4: 11px;
  --ae-space-5: 13px;
  --ae-space-6: 18px;
  --ae-hairline: 1px var(--ae-line);
```

Bake default padding into `.ae-slab` and tokenize `.ae-cmd`. Change the `.ae-slab` rule and `.ae-cmd` rule in `aether.css`:

```css
.ae-slab {
  position: relative;
  border-radius: var(--ae-radius-lg);
  padding: var(--ae-slab-pad, var(--ae-slab-pad-md)); /* baked default; size prop overrides via --ae-slab-pad */
  /* ...existing background/border/box-shadow/backdrop-filter unchanged... */
}
.ae-cmd {
  /* ...existing... */
  padding: var(--ae-slab-pad-lg);
  border-radius: var(--ae-radius-lg);
}
```

```tsx
// apps/desktop/src/aether/ui/components/glass-slab.tsx
import { cn } from '@/lib/utils'

export function GlassSlab({
  size = 'md',
  className,
  children,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('ae-slab', className)} style={{ ['--ae-slab-pad' as string]: `var(--ae-slab-pad-${size})` }}>
      {children}
    </div>
  )
}
```

**In the same commit**, remove every `p-[...]` arbitrary padding from `.ae-slab`/`GlassSlab` call-sites and pass `size` instead (Tailwind shorthand like `gap-1.5` stays):
- `command-center.tsx`: `:31` GlassSlab `p-[6px_0]` → keep flex classes, drop `p-[6px_0]`, use `size="md"`; `:36`,`:39` raw `.ae-slab ... p-[10px_13px]` → use `<GlassSlab size="sm">`; `:47` `p-[16px_18px]` → `size="lg"`; `:70`,`:77`,`:85`,`:90` `p-[13px_14px]` → `size="sm"`; `:100`,`:109` `p-[15px_16px]` → `size="md"`.
- `morning-brief.tsx`: `:82`,`:115`,`:137` `p-[13px_15px]` → `<GlassSlab size="md">` (drop `p-[...]`).
- `stub-screen.tsx`: `:5` `<div className="ae-slab px-8 py-6 ...">` → `<GlassSlab size="lg" className="text-center">`.
- `boot-sequence.tsx`: `:64` error `<div className="ae-slab px-4 py-3 ...">` → `<GlassSlab size="md" className="text-center">`.
- `aether-shell.tsx`: `:62` paused overlay `<div className="ae-slab px-6 py-4 ...">` → `<GlassSlab size="md" className="text-sm text-[color:var(--ae-dim)]">`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/geometry.test.ts src/aether/ui/components/glass-slab.test.tsx`
Then run the existing screen tests to confirm no regression: `npx vitest run --environment jsdom src/aether/ui/screens src/aether/ui/shell`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/theme/geometry.ts apps/desktop/src/aether/ui/theme/geometry.test.ts apps/desktop/src/aether/ui/theme/aether.css apps/desktop/src/aether/ui/components/glass-slab.tsx apps/desktop/src/aether/ui/components/glass-slab.test.tsx apps/desktop/src/aether/ui/screens/command-center.tsx apps/desktop/src/aether/ui/screens/morning-brief.tsx apps/desktop/src/aether/ui/screens/stub-screen.tsx apps/desktop/src/aether/ui/screens/boot-sequence.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx
git commit -m "feat(aether): --ae-* geometry token scale; bake slab padding via GlassSlab size (atomic, no double-pad)"
```

---

## Task 3: Shell-root layering + transparent screens + polish, with shell-level double-pad regression test

Moves the opaque cinematic background off each screen onto the **shell root** (z0, full-bleed), introduces the transparent `.ae-screen-bare` variant, makes the content wrapper own the single `--ae-page-*` gutter, removes per-screen self-padding (`command-center.tsx:23`, `morning-brief.tsx:19`), adds `min-w-0` to flex/grid tracks, and marks the ⌘K chip inert ("sắp ra mắt"). Ships the **shell-level double-pad regression test** that mounts a screen inside the shell wrapper and asserts no screen-root `p-[...]` and exactly one gutter.

**Files:**
- Modify: `apps/desktop/src/aether/ui/theme/aether.css` (add `.ae-shell-bg` full-bleed background; add `.ae-screen-bare` transparent variant; `.ae-screen` background stays for Boot overlay)
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx` (background → shell root z0; content wrapper one gutter `--ae-page-*`; screens transparent)
- Modify: `apps/desktop/src/aether/ui/screens/command-center.tsx` (`.ae-screen` → `.ae-screen-bare`; remove `:23` self-pad `p-[18px_22px]`; min-w-0)
- Modify: `apps/desktop/src/aether/ui/screens/morning-brief.tsx` (`.ae-screen` → `.ae-screen-bare`; remove `:19` self-pad `p-[16px_22px_18px]`; min-w-0)
- Modify: `apps/desktop/src/aether/ui/screens/stub-screen.tsx` (`.ae-screen` → `.ae-screen-bare`)
- Modify: `apps/desktop/src/aether/ui/components/command-bar.tsx` (mark ⌘K chip inert)
- Create: `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx`

**Interfaces:**
- Consumes: `--ae-page-*` tokens (Task 2); `GlassSlab` (Task 2); `useTitlebarInset` (Task 1).
- Produces:
  - `.ae-shell-bg` (full-bleed gradient background, `position:absolute inset-0 z-0`) and `.ae-screen-bare` (transparent, no clip at root, fills content area) CSS classes.
  - Content wrapper className applying the single gutter: `p-[var(--ae-page-t)_var(--ae-page-x)_var(--ae-page-b)]`.
  - Inert ⌘K chip: `aria-disabled`, `title="Sắp ra mắt"`, no `onActivate` for the chip.

- [ ] **Step 1: Write the failing test (shell-level regressions a + b)**

```tsx
// apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
import { cleanup, render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { $bootDone } from '@/aether/domain/boot/boot-store'
import { $connection, $gatewayState } from '@/store/session'
import { AetherShell } from './aether-shell'
import { HUD_ROUTE } from '@/app/routes'

afterEach(cleanup)
beforeEach(() => {
  $bootDone.set(true) // skip the Boot overlay so the real shell renders
  $gatewayState.set('open')
})

function mountShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AetherShell chatView={<div data-testid="chat" />} />
    </MemoryRouter>,
  )
}

describe('AetherShell layering (regression b: shell-level double-pad)', () => {
  it('the content wrapper owns exactly one --ae-page-* gutter', () => {
    const { container } = mountShell(HUD_ROUTE)
    const gutters = container.querySelectorAll('[class*="--ae-page-"]')
    expect(gutters.length).toBe(1)
  })
  it('the screen root has no arbitrary p-[...] padding (no self-pad/double-pad)', () => {
    const { container } = mountShell(HUD_ROUTE)
    const screen = container.querySelector('.ae-screen-bare') as HTMLElement
    expect(screen).toBeTruthy()
    expect(screen.className).not.toMatch(/\bp-\[/)
  })
  it('regression a: nav rail padding-top is 34px on macOS windowed', () => {
    $connection.set({
      baseUrl: '', isFullscreen: false, nativeOverlayWidth: 0, token: '', wsUrl: '', logs: [],
      windowButtonPosition: { x: 24, y: 12 },
    } as never)
    const { container } = mountShell(HUD_ROUTE)
    const rail = container.querySelector('.ae-rail') as HTMLElement
    expect(rail.style.paddingTop).toBe('34px')
  })
  // In jsdom no onWindowStateChanged event fires, so useTitlebarInset's fullscreenOverride
  // stays null and the inset falls back to connection.isFullscreen — exactly what we set here.
  it('regression a: nav rail padding-top is 0 in fullscreen with non-null windowButtonPosition', () => {
    $connection.set({
      baseUrl: '', isFullscreen: true, nativeOverlayWidth: 0, token: '', wsUrl: '', logs: [],
      windowButtonPosition: { x: 24, y: 12 },
    } as never)
    const { container } = mountShell(HUD_ROUTE)
    const rail = container.querySelector('.ae-rail') as HTMLElement
    expect(rail.style.paddingTop).toBe('0px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx`
Expected: FAIL — no `.ae-screen-bare` yet; the content wrapper still carries `p-[16px_22px_18px]` literally and the screen still self-pads (gutter count != 1 / screen still has `p-[`).

- [ ] **Step 3: Implement the layering**

In `aether.css`, add the full-bleed shell background and the transparent screen variant (keep `.ae-screen` as-is for the Boot overlay):

```css
/* full-bleed cinematic background owned by the shell root (z0) */
.ae-shell-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(74, 163, 255, 0.16), transparent 55%),
    radial-gradient(100% 90% at 80% 110%, rgba(7, 57, 125, 0.18), transparent 60%),
    linear-gradient(180deg, #082046 0%, #05132f 48%, #020c1d 100%);
}
[data-aether-mode='light'] .ae-shell-bg {
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(74, 163, 255, 0.12), transparent 55%),
    linear-gradient(180deg, #f3f7ff 0%, #e9f1ff 100%);
}
/* transparent screen variant — fills the padded content area, lets the shell bg bleed through */
.ae-screen-bare {
  position: relative;
  color: var(--ae-ink);
}
```

In `aether-shell.tsx`, put the background at the shell root behind rail+content, and give the content wrapper the single gutter token:

```tsx
// apps/desktop/src/aether/ui/shell/aether-shell.tsx — render block
return (
  <div className="ae-depth-enter relative flex h-screen min-h-0 w-screen overflow-hidden">
    <div className="ae-shell-bg" />
    <NavRail activeRoute={location.pathname} online={status === 'online'} onNavigate={r => navigate(r)} />
    <div className="relative z-[1] flex min-w-0 flex-1 flex-col p-[var(--ae-page-t)_var(--ae-page-x)_var(--ae-page-b)]">
      <TopBar title={title} />
      <div className="relative mt-3 min-h-0 flex-1">
        <PageTransition routeKey={location.pathname}>
          {/* ...Routes unchanged... */}
        </PageTransition>
      </div>
    </div>
    {/* paused overlay unchanged (now a GlassSlab from Task 2) */}
  </div>
)
```

In `command-center.tsx`: change the root from `className="ae-screen flex h-full flex-col p-[18px_22px]"` to `className="ae-screen-bare flex h-full min-w-0 flex-col"` (drop the per-screen background helpers `.ae-grid-floor`/`.ae-bloom`/`.ae-vignette` only if they double the shell bg — keep them as foreground accents if desired, but they must sit `z-[1]` above `.ae-shell-bg`; the simplest correct move for SP-0 is to remove the `.ae-screen` opaque background by switching to `.ae-screen-bare`). Add `min-w-0` to the inner grid track wrappers that can overflow.

In `morning-brief.tsx`: change the root from `className="ae-screen flex h-full flex-col p-[16px_22px_18px]"` to `className="ae-screen-bare flex h-full min-w-0 flex-col"` (this removes the double-pad — the shell wrapper already pads).

In `stub-screen.tsx`: change the root `.ae-screen` → `.ae-screen-bare`.

In `command-bar.tsx`: mark the ⌘K chip inert (it is NOT wired in SP-0 — do not ship dead chrome):

```tsx
// apps/desktop/src/aether/ui/components/command-bar.tsx — the ⌘K chip
<span
  aria-disabled="true"
  title="Sắp ra mắt"
  className="cursor-not-allowed rounded-[var(--ae-radius-sm)] border border-[color:var(--ae-line)] bg-[rgba(120,200,255,.06)] px-[11px] py-1.5 font-mono text-xs text-[color:var(--ae-dim)] opacity-60"
>
  ⌘K
</span>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx`
Then the full AETHER suite: `npx vitest run --environment jsdom src/aether`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/theme/aether.css apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell.test.tsx apps/desktop/src/aether/ui/screens/command-center.tsx apps/desktop/src/aether/ui/screens/morning-brief.tsx apps/desktop/src/aether/ui/screens/stub-screen.tsx apps/desktop/src/aether/ui/components/command-bar.tsx
git commit -m "feat(aether): shell-root cinematic bg + transparent screens (one gutter); inert ⌘K chip; shell-level double-pad test"
```

---

## Task 4: WebGL dependencies + multi-layer motion gate + motion store

Adds the WebGL deps (`three`, `@react-three/fiber@^9`, `@types/three`), pins `react`/`react-dom` to `>=19.2.5 <19.3` (R3F v9 peer), and adds `three` to vite `dedupe`. Implements the **multi-layer motion gate** (`use-motion-enabled.ts`: reduced-motion AND `!getRemoteDisplayReason()` AND a WebGL context probe) and the `motion-store.ts` (`$orbState` derived from `$busy`/`$gatewayState` per the mapping table, plus `$motionActive`). No Canvas yet — this task is pure logic, fully unit-testable in jsdom.

**Files:**
- Modify: `apps/desktop/package.json` (add deps; pin react/react-dom)
- Modify: `apps/desktop/vite.config.ts` (add `'three'` to `resolve.dedupe`)
- Create: `apps/desktop/src/aether/ui/motion/use-motion-enabled.ts`
- Create: `apps/desktop/src/aether/ui/motion/use-motion-enabled.test.tsx`
- Create: `apps/desktop/src/aether/domain/motion/motion-store.ts`
- Create: `apps/desktop/src/aether/domain/motion/motion-store.test.ts`

**Interfaces:**
- Consumes: `$busy`, `$gatewayState` from `@/store/session`; `window.aetherDesktop.getRemoteDisplayReason`.
- Produces:
  - `probeWebGL(): boolean` — pure; returns true if a WebGL context is obtainable (jsdom returns false; injectable for tests).
  - `useMotionEnabled(): boolean` — `prefers-reduced-motion:no-preference` AND `!remoteDisplayReason` AND `probeWebGL()`. False ⇒ caller must NOT mount the Canvas.
  - `deriveOrbState(busy: boolean, gatewayState: string): 'thinking' | 'idle' | 'paused'` — pure mapping.
  - `$orbState = computed([$busy, $gatewayState], deriveOrbState)`, `$motionActive = atom(false)`.

- [ ] **Step 1: Write the failing tests**

```ts
// apps/desktop/src/aether/domain/motion/motion-store.test.ts
import { describe, expect, it } from 'vitest'
import { deriveOrbState } from './motion-store'

describe('deriveOrbState (orb-state mapping table)', () => {
  it('busy ⇒ thinking regardless of gateway', () => {
    expect(deriveOrbState(true, 'open')).toBe('thinking')
    expect(deriveOrbState(true, 'closed')).toBe('thinking')
  })
  it('not busy + gateway open ⇒ idle', () => {
    expect(deriveOrbState(false, 'open')).toBe('idle')
  })
  it('not busy + gateway not open ⇒ paused (dim)', () => {
    expect(deriveOrbState(false, 'closed')).toBe('paused')
    expect(deriveOrbState(false, 'idle')).toBe('paused')
    expect(deriveOrbState(false, 'error')).toBe('paused')
  })
})
```

```tsx
// apps/desktop/src/aether/ui/motion/use-motion-enabled.test.tsx
import { describe, expect, it, vi } from 'vitest'
import { computeMotionEnabled } from './use-motion-enabled'

describe('computeMotionEnabled (multi-layer gate)', () => {
  const ok = { reducedMotion: false, remoteDisplayReason: null as string | null, webglOk: true }
  it('all three layers green ⇒ true', () => {
    expect(computeMotionEnabled(ok)).toBe(true)
  })
  it('reduced-motion ⇒ false', () => {
    expect(computeMotionEnabled({ ...ok, reducedMotion: true })).toBe(false)
  })
  it('remote display (GPU off) ⇒ false even if reduced-motion is off', () => {
    expect(computeMotionEnabled({ ...ok, remoteDisplayReason: 'ssh' })).toBe(false)
  })
  it('webgl probe fail ⇒ false', () => {
    expect(computeMotionEnabled({ ...ok, webglOk: false })).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --environment jsdom src/aether/domain/motion/motion-store.test.ts src/aether/ui/motion/use-motion-enabled.test.tsx`
Expected: FAIL — modules not found.

- [ ] **Step 3: Add deps, pin react, dedupe; implement gate + store**

In `apps/desktop/package.json`:
- Change `"react": "^19.2.5"` → `"react": ">=19.2.5 <19.3"` and `"react-dom": "^19.2.5"` → `"react-dom": ">=19.2.5 <19.3"`.
- Add to `dependencies`: `"three": "^0.171.0"`, `"@react-three/fiber": "^9.0.0"`.
- Add to `devDependencies`: `"@types/three": "^0.171.0"`.
- Then run `npm install` from `apps/desktop` to refresh the lockfile.

In `apps/desktop/vite.config.ts`, change `dedupe: ['react', 'react-dom']` → `dedupe: ['react', 'react-dom', 'three']`.

```ts
// apps/desktop/src/aether/domain/motion/motion-store.ts
import { atom, computed } from 'nanostores'
import { $busy, $gatewayState } from '@/store/session'

export type OrbState = 'thinking' | 'idle' | 'paused'

// Mapping table (spec §5). NOTE: the raw $gatewayState atom value is the ConnectionState
// string 'open' (the coarse useConnectionStatus() maps 'open'→'online'); derive from 'open'.
export function deriveOrbState(busy: boolean, gatewayState: string): OrbState {
  if (busy) return 'thinking'
  if (gatewayState === 'open') return 'idle'
  return 'paused'
}

export const $orbState = computed([$busy, $gatewayState], (busy, gatewayState) =>
  deriveOrbState(busy, gatewayState),
)

// Set true once the Canvas mounts (gate passed); read by the CSS-fallback path.
export const $motionActive = atom(false)
```

```tsx
// apps/desktop/src/aether/ui/motion/use-motion-enabled.ts
import { useEffect, useState } from 'react'

export interface MotionGateInputs {
  reducedMotion: boolean
  remoteDisplayReason: string | null
  webglOk: boolean
}

// Pure gate: ALL three layers must be green. Remote display disables the GPU
// (main.cjs app.disableHardwareAcceleration), so reduced-motion alone is insufficient.
export function computeMotionEnabled(i: MotionGateInputs): boolean {
  return !i.reducedMotion && i.remoteDisplayReason == null && i.webglOk
}

export function probeWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function useMotionEnabled(): boolean {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    let cancelled = false
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const evaluate = async () => {
      const remoteDisplayReason = (await window.aetherDesktop?.getRemoteDisplayReason?.()) ?? null
      if (cancelled) return
      setEnabled(
        computeMotionEnabled({ reducedMotion: mq.matches, remoteDisplayReason, webglOk: probeWebGL() }),
      )
    }
    void evaluate()
    mq.addEventListener('change', evaluate)
    return () => {
      cancelled = true
      mq.removeEventListener('change', evaluate)
    }
  }, [])
  return enabled
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/domain/motion/motion-store.test.ts src/aether/ui/motion/use-motion-enabled.test.tsx`
Then confirm install/typecheck: from `apps/desktop` run `npm run typecheck`.
Expected: PASS; typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/package.json apps/desktop/package-lock.json apps/desktop/vite.config.ts apps/desktop/src/aether/domain/motion/motion-store.ts apps/desktop/src/aether/domain/motion/motion-store.test.ts apps/desktop/src/aether/ui/motion/use-motion-enabled.ts apps/desktop/src/aether/ui/motion/use-motion-enabled.test.tsx
git commit -m "feat(aether): add three+R3F deps (react pinned <19.3, three deduped); multi-layer motion gate + orb-state store"
```

> If `package-lock.json` lives at the repo root instead of `apps/desktop/`, stage that path instead — check `git status` after `npm install` and add whichever lockfile changed.

---

## Task 5: Shared `<AetherCanvas>` + ambient field + WebGL Living Orb, mounted gated at shell root

Adds the single shared R3F `<Canvas frameloop="demand">` at the shell root (z0, full-bleed), the ambient-field shader plane, and the WebGL Living Orb (GLSL template-strings, in-shader bloom). Wires the perf guards (DPR cap `[1,1.75]`, pause on `document.hidden`/idle since `backgroundThrottling:false`, dispose GL on unmount, `invalidate()` on demand) and the multi-layer gate: when `useMotionEnabled()` is false the Canvas is **not mounted** and the existing CSS orb / `.ae-bloom` is the fallback. The orb subscribes `$orbState` (Boot keeps its boot-store). jsdom can't run GL, so tests cover the **mount/gate/dispose logic**, not pixels.

**Files:**
- Create: `apps/desktop/src/aether/ui/motion/shaders/ambient.ts`
- Create: `apps/desktop/src/aether/ui/motion/shaders/orb.ts`
- Create: `apps/desktop/src/aether/ui/motion/ambient-field.tsx`
- Create: `apps/desktop/src/aether/ui/motion/living-orb-gl.tsx`
- Create: `apps/desktop/src/aether/ui/motion/aether-canvas.tsx`
- Create: `apps/desktop/src/aether/ui/motion/aether-canvas.test.tsx`
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx` (mount `<AetherCanvas>` at z0, gated)
- Modify: `apps/desktop/src/aether/ui/orb/living-orb.tsx` (subscribe `$orbState`; render WebGL orb when motion active, else CSS orb)
- Modify: `apps/desktop/DESIGN.md` (document `--ae-*` scale + bridge points + sanctioned isolated subtree)

**Interfaces:**
- Consumes: `useMotionEnabled` (Task 4); `$orbState`, `$motionActive` (Task 4); `three` + `@react-three/fiber` (`Canvas`, `useFrame`, `invalidate`); GLSL strings.
- Produces:
  - `AETHER_AMBIENT_VERT` / `AETHER_AMBIENT_FRAG` and `AETHER_ORB_VERT` / `AETHER_ORB_FRAG` GLSL template strings.
  - `AmbientField()` and `LivingOrbGL({ state, size })` R3F components.
  - `AetherCanvas({ enabled }: { enabled: boolean })` — returns `null` when `!enabled`; else the shared `<Canvas frameloop="demand" dpr={[1,1.75]}>` with the ambient plane + orb, a hidden/idle pause hook, and GL dispose on unmount. Sets `$motionActive`.
  - `pickDpr(devicePixelRatio: number): number` — pure DPR cap to `[1,1.75]`.
  - `shouldRenderFrame(hidden: boolean, idle: boolean): boolean` — pure pause predicate (false when hidden or idle).

- [ ] **Step 1: Write the failing test (logic + gate, no pixels)**

```tsx
// apps/desktop/src/aether/ui/motion/aether-canvas.test.tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AetherCanvas, pickDpr, shouldRenderFrame } from './aether-canvas'

afterEach(cleanup)

describe('AetherCanvas gating + perf predicates', () => {
  it('renders nothing when motion is disabled (gate false ⇒ no Canvas)', () => {
    const { container } = render(<AetherCanvas enabled={false} />)
    expect(container.querySelector('canvas')).toBeNull()
    expect(container.firstChild).toBeNull()
  })
  it('caps DPR to [1, 1.75]', () => {
    expect(pickDpr(0.5)).toBe(1)
    expect(pickDpr(1)).toBe(1)
    expect(pickDpr(3)).toBe(1.75)
  })
  it('pauses the frameloop when hidden or idle', () => {
    expect(shouldRenderFrame(false, false)).toBe(true)
    expect(shouldRenderFrame(true, false)).toBe(false)
    expect(shouldRenderFrame(false, true)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/aether-canvas.test.tsx`
Expected: FAIL — `Cannot find module './aether-canvas'`.

- [ ] **Step 3: Implement shaders, ambient field, GL orb, the gated canvas, and wire the shell**

```ts
// apps/desktop/src/aether/ui/motion/shaders/ambient.ts
// Full-screen navy/azure ambient field. In-shader soft bloom (no postprocessing dep).
export const AETHER_AMBIENT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`
export const AETHER_AMBIENT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uNavy;   // #07397d
  uniform vec3 uAzure;  // #4aa3ff
  float blob(vec2 p, vec2 c, float r) { return smoothstep(r, 0.0, length(p - c)); }
  void main() {
    vec2 p = vUv;
    float t = uTime * 0.06;
    float g = blob(p, vec2(0.5 + 0.18 * sin(t), 0.1), 0.7)
            + blob(p, vec2(0.8, 1.0 + 0.12 * cos(t * 1.3)), 0.7);
    vec3 col = mix(uNavy * 0.35, uAzure, clamp(g * 0.5, 0.0, 1.0));
    col += uAzure * pow(g, 3.0) * 0.25; // in-shader bloom
    gl_FragColor = vec4(col, 1.0);
  }
`
```

```ts
// apps/desktop/src/aether/ui/motion/shaders/orb.ts
// Living Orb: a sphere with a fresnel rim + animated noise; brightness driven by uState
// (0 idle, 1 thinking, 0.4 paused). In-shader rim bloom.
export const AETHER_ORB_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`
export const AETHER_ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec3 vNormal;
  varying vec3 vView;
  uniform float uTime;
  uniform float uState; // 1.0 thinking, 0.0 idle, 0.4 paused
  uniform vec3 uAzure;
  uniform vec3 uAzureSoft;
  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.5);
    float pulse = 0.5 + 0.5 * sin(uTime * (1.5 + 2.5 * uState));
    vec3 base = mix(uAzure, uAzureSoft, fres);
    float glow = fres * (0.4 + 0.6 * mix(0.6, pulse, uState));
    vec3 col = base + uAzureSoft * glow * 0.8; // rim bloom
    float dim = mix(1.0, 0.45, step(uState, 0.45) * (1.0 - step(0.55, uState))); // paused dim
    gl_FragColor = vec4(col * dim, 1.0);
  }
`
```

```tsx
// apps/desktop/src/aether/ui/motion/ambient-field.tsx
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, ShaderMaterial } from 'three'
import { AETHER_AMBIENT_FRAG, AETHER_AMBIENT_VERT } from './shaders/ambient'

export function AmbientField() {
  const matRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uNavy: { value: new Color('#07397d') }, uAzure: { value: new Color('#4aa3ff') } }),
    [],
  )
  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.uTime.value += delta
  })
  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={AETHER_AMBIENT_VERT} fragmentShader={AETHER_AMBIENT_FRAG} depthWrite={false} />
    </mesh>
  )
}
```

```tsx
// apps/desktop/src/aether/ui/motion/living-orb-gl.tsx
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { Color, ShaderMaterial } from 'three'
import type { OrbState } from '@/aether/domain/motion/motion-store'
import { AETHER_ORB_FRAG, AETHER_ORB_VERT } from './shaders/orb'

const STATE_VALUE: Record<OrbState, number> = { thinking: 1, idle: 0, paused: 0.4 }

export function LivingOrbGL({ state = 'idle', size = 1 }: { state?: OrbState; size?: number }) {
  const matRef = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uState: { value: STATE_VALUE.idle },
      uAzure: { value: new Color('#4aa3ff') },
      uAzureSoft: { value: new Color('#8fc0ff') },
    }),
    [],
  )
  useFrame((_, delta) => {
    if (!matRef.current) return
    matRef.current.uniforms.uTime.value += delta
    matRef.current.uniforms.uState.value = STATE_VALUE[state]
  })
  return (
    <mesh scale={size}>
      <sphereGeometry args={[1, 64, 64]} />
      <shaderMaterial ref={matRef} uniforms={uniforms} vertexShader={AETHER_ORB_VERT} fragmentShader={AETHER_ORB_FRAG} />
    </mesh>
  )
}
```

```tsx
// apps/desktop/src/aether/ui/motion/aether-canvas.tsx
import { Canvas, invalidate } from '@react-three/fiber'
import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { $motionActive, $orbState } from '@/aether/domain/motion/motion-store'
import { AmbientField } from './ambient-field'
import { LivingOrbGL } from './living-orb-gl'

// Pure perf predicates (unit-tested).
export function pickDpr(devicePixelRatio: number): number {
  return Math.max(1, Math.min(1.75, devicePixelRatio))
}
export function shouldRenderFrame(hidden: boolean, idle: boolean): boolean {
  return !hidden && !idle
}

// Shared, single Canvas at the shell root (z0, full-bleed). Returns null when the
// multi-layer gate is closed — the CSS orb / .ae-bloom path is the fallback.
export function AetherCanvas({ enabled }: { enabled: boolean }) {
  const orbState = useStore($orbState)

  useEffect(() => {
    if (!enabled) return
    $motionActive.set(true)
    // backgroundThrottling:false ⇒ self-pause on hidden; invalidate to resume on demand.
    const onVisibility = () => { if (!document.hidden) invalidate() }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      $motionActive.set(false)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div className="absolute inset-0 z-0" aria-hidden style={{ pointerEvents: 'none' }}>
      <Canvas
        frameloop="demand"
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={() => invalidate()}
      >
        <AmbientField />
        <group position={[0, 0, 1.5]}>
          <LivingOrbGL state={orbState} size={0.6} />
        </group>
      </Canvas>
    </div>
  )
}
```

In `aether-shell.tsx`, gate and mount the Canvas as the z0 background (replacing or layering behind `.ae-shell-bg`):

```tsx
// apps/desktop/src/aether/ui/shell/aether-shell.tsx — add the gate + canvas
import { AetherCanvas } from '@/aether/ui/motion/aether-canvas'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'
// ...
const motionEnabled = useMotionEnabled()
// in the render block, before NavRail:
//   <div className="ae-shell-bg" />            {/* CSS fallback bg, always present */}
//   <AetherCanvas enabled={motionEnabled} />   {/* overlays the gradient at z0 when GPU/motion OK */}
```

In `living-orb.tsx`, subscribe `$orbState` (so HUD/Chat orb states track the runtime) and keep the CSS orb as the always-correct DOM fallback; when `$motionActive` is true the shared GL orb in the Canvas is the hero (the CSS orb may be hidden via `opacity-0` to avoid a double orb). Keep Boot's orb on its boot-store (`state="thinking"`), not `$orbState`.

In `apps/desktop/DESIGN.md`, append a short section documenting: `aether/` is a sanctioned isolated cinematic subtree with its own `--ae-*` geometry scale (does not violate "one source per concern"); the bridge points (`--ae-titlebar-inset` ← `titlebar.ts`, `--ae-page-*` ↔ `layout-constants.ts`, `--ae-nav-w` ↔ `main.cjs`) are test-pinned in `geometry.test.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/aether-canvas.test.tsx`
Then the full AETHER suite + typecheck: `npx vitest run --environment jsdom src/aether` and (from `apps/desktop`) `npm run typecheck`.
Expected: PASS; typecheck clean (no double-React: the `dedupe` from Task 4 ensures one React instance).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/motion/ apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/orb/living-orb.tsx apps/desktop/DESIGN.md
git commit -m "feat(aether): shared R3F Canvas (demand loop, DPR cap, hidden-pause, dispose) + ambient field + GL orb, gated with CSS fallback"
```

---

## Manual / Visual Verification (real machine — jsdom cannot do GL or compute CSS)

These are not automated; run them on a real build before declaring SP-0 done (`npm run dev` in `apps/desktop`, or the desktop harness):

- **macOS traffic-light:** brand glyph is NOT under the 3 buttons in a normal window AND after entering fullscreen and exiting (the inset re-derives via `onWindowStateChanged`).
- **Windows/Linux:** the top-bar right cluster does not slide under the native min/max/close overlay.
- **Remote display (SSH/VNC/RDP or `AETHER_DESKTOP_DISABLE_GPU=1`):** no white/blank Canvas — the CSS orb fallback shows; `getRemoteDisplayReason()` returns non-null and the Canvas is not mounted.
- **`prefers-reduced-motion: reduce`:** no Canvas, no orb spin/bob, page transition degrades to fade.
- **4 screens (Boot/HUD/Chat/Brief):** consistent gutter, no "thò ra thụt vào", no double-pad, no card clipped by the cinematic bleed.
- **Perf:** active FPS ≥ 50; idle/hidden CPU ~0 (frameloop paused).
- **E2E:** reuse `scripts/test-desktop.mjs` + `electron/*.test.cjs` harness.

---

## Self-Review (run against the spec)

- **§4.1 traffic-light:** Task 1 — `useTitlebarInset` + `titlebarInsetPx`, nav `padding-top`, drag/no-drag, win/linux overlay right-pad. ✓
- **§4.2 token layer + atomic bake:** Task 2 — full `--ae-*` scale, `GlassSlab size`, atomic call-site `p-[...]` removal, split `--ae-gap-col`/`--ae-gap-grid`, geometry.ts single source + bridge pins. ✓
- **§4.3 layering + polish:** Task 3 — `.ae-shell-bg` at root, `.ae-screen-bare`, one gutter, self-pad removal, `min-w-0`, inert ⌘K chip. ✓
- **§5 WebGL:** Tasks 4–5 — deps + react pin + three dedupe, multi-layer gate, `motion-store` `$orbState`, shared Canvas + ambient + GL orb, perf guards, CSS fallback. ✓
- **Regression tests:** (a) nav padding-top 34/0/0-fullscreen in Task 1 (pure) + Task 3 (shell-level); (b) shell-level double-pad in Task 3. ✓
- **Constraints embedded:** runtime-keep, brand/tokens, localization, prompt-cache, reduced-motion, react pin — all in Global Constraints. ✓
