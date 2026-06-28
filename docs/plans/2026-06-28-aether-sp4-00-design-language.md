# AETHER SP-4 #0 — Design Language + App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock the "AETHER là một sinh thể sống" design-language north-star, ship a synchronized token/typography/icon/motion foundation, overhaul the app shell chrome (expandable nav-rail with a living glyph, ⌘K top-bar, vital-sign, overlay host), and stand up a data-driven all-WebGL living engine (with a static fallback) exercised by a dev playground.

**Architecture:** Three layers built in dependency order. (1) **Foundation** — new `--ae-*` tokens (CSS) mirrored by TS constants + pin tests, plus shared `Icon`/`Avatar`/`VitalSign` primitives. (2) **Shell chrome** — nav-rail/top-bar/overlay-host built on the foundation, plus `/command-center` stub cleanup. (3) **Living engine** — a pure-TS logic core (`GraphSpec` model + 6-verb lifecycle + layout + demo script, all jsdom-tested) feeding a thin R3F view layer mounted in the existing shared `<AetherCanvas>`, with a DOM/SVG fallback when the WebGL gate is closed, exercised by a `/playground` route.

**Tech Stack:** React 19 + TypeScript, Vite, Vitest (jsdom), `@react-three/fiber` + `three` (existing), `troika-three-text` (new dep), nanostores, react-router-dom, Tailwind v4 (arbitrary-value utilities reading `--ae-*` vars).

## Global Constraints

Every task implicitly includes these. Values copied verbatim from the spec §2.

- **Brand `#07397d`** (deep navy) via `--ae-*`/`--dt-*` tokens. **No hardcoded colors outside the token system** (the sole sanctioned exception is brand hex inside GLSL uniforms, already documented in `apps/desktop/DESIGN.md`).
- **Localization:** UI in Vietnamese; **never translate "Agent" → "Đại lý"**; platform string is exactly `HYPERTEK - AGENT PLATFORM`.
- **Prompt-cache safety:** non-chat screens **must not** subscribe to `message.delta`/`reasoning.delta`/`thinking.*`/tool-call streams (exception: Voice + Chat). The living engine on non-chat screens reads only `$orbState`/`$gatewayState` and scripted demo data.
- **Motion gate (SP-0) + `prefers-reduced-motion`** respected at every transition/overlay/orb. The gate is `computeMotionEnabled({reducedMotion, remoteDisplayReason, webglOk})` via `useMotionEnabled()`.
- **Layering (SP-0):** screens use `.ae-screen-bare`; the content wrapper owns exactly **one** `--ae-page-*` gutter; padding is baked via `GlassSlab size`; `--ae-*` geometry tokens are **mode-independent**; only color tokens fork under `[data-aether-mode]`.
- **Canvas = LIGHT mode.** Dark fork stays in code under `[data-aether-mode='dark']` but is **frozen / not polished** this round.
- **Green gate every task:** `cd apps/desktop && npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit` must pass before the task's final commit.
- **Commit hygiene:** stage only the explicit file paths listed in each commit step; never `git add -A`/`.`/`commit -am`.

> All paths below are relative to `apps/desktop/`. Run all commands from `apps/desktop/`.

---

## ⚠️ Spec ↔ code discrepancies resolved in this plan

Two items in the spec do not match ground-truth; this plan implements the safe ground-truth and the divergence is called out in-task. Confirm with the spec author if these resolutions are wrong.

1. **§5.5 "remove `COMMAND_CENTER_ROUTE` const + drop `command-center` from `OVERLAY_VIEWS`" is unsafe as written.** That const and the `command-center` `AppView` are still consumed by the **live web shell** that the AETHER shell reuses: `src/app/command-palette/index.tsx`, `src/app/shell/hooks/use-overlay-routing.ts`, `src/app/shell/hooks/use-statusbar-items.tsx`, `src/app/types.ts`, `src/app/routes.ts` (`isOverlayView`). Deleting them breaks the build. **Resolution (Task 10):** remove only the *dead AETHER stub* — the `<Route StubScreen "Command Center">` and its import in `aether-shell.tsx`, and delete `stub-screen.tsx`. Keep the route const + AppView until the web command-center is decommissioned (a separate work-item).
2. **"19 nav destinations" (§4/§8) vs the 16 enumerated in §5.1.** The concrete group enumeration in §5.1 lists 16 real routable screens; the existing `AppView` union has exactly 16 once `command-center` is excluded. "19" appears to count group headers and/or anticipated screens. **Resolution (Task 6):** implement the 16 enumerated §5.1 destinations grouped into the 5 named groups; the test pins that explicit set.

---

## File Structure

**New files**

| File | Responsibility |
|---|---|
| `src/aether/ui/components/icon/icon.tsx` | One consistent `Icon` component + `AETHER_ICONS` path table + `IconName` union (16 nav icons). |
| `src/aether/ui/components/icon/icon.test.tsx` | Pins: every `IconName` has a path; renders `currentColor` stroke. |
| `src/aether/ui/components/avatar.tsx` | Token-ised single avatar; derives initial from `$activeProfile`. |
| `src/aether/ui/components/avatar.test.tsx` | `profileInitial` cases + store-driven render. |
| `src/aether/ui/components/vital-sign.tsx` | ECG sparkline, 3 states from connection status. |
| `src/aether/ui/components/vital-sign.test.tsx` | `vitalStatus` mapping + per-state render. |
| `src/aether/ui/shell/overlay-host.tsx` | Shell-level overlay/modal host primitive + `$overlay` store. |
| `src/aether/ui/shell/overlay-host.test.tsx` | open/close, Esc, reduced-motion, backdrop. |
| `src/aether/domain/engine/graph-model.ts` | `GraphSpec` + node/orb/link types + `createGraph`. |
| `src/aether/domain/engine/graph-model.test.ts` | defaults + merge. |
| `src/aether/domain/engine/lifecycle.ts` | 6-verb state machine. |
| `src/aether/domain/engine/lifecycle.test.ts` | transition table. |
| `src/aether/domain/engine/layout.ts` | constellation + summon radial layout. |
| `src/aether/domain/engine/layout.test.ts` | stable coords, no overlap. |
| `src/aether/domain/engine/demo-script.ts` | scripted "HSG" scene + `phaseAt`/`hsgFrame`. |
| `src/aether/domain/engine/demo-script.test.ts` | phase progression at timestamps. |
| `src/aether/domain/motion/graph-store.ts` | `$graphSpec` atom + setters. |
| `src/aether/domain/motion/graph-store.test.ts` | set/clear. |
| `src/aether/ui/motion/graph/graph-geometry.ts` | pure render helpers (color/scale/link points). |
| `src/aether/ui/motion/graph/graph-geometry.test.ts` | helper pins. |
| `src/aether/ui/motion/graph/graph-view.tsx` | R3F views: core orb / nodes / links / sub-orb / summon. |
| `src/aether/ui/motion/graph/labels.tsx` | `troika-three-text` SDF labels + `labelText`. |
| `src/aether/ui/motion/graph/labels.test.ts` | `labelText` pin. |
| `src/aether/ui/motion/graph/fallback.tsx` | static DOM/SVG constellation + orb (GPU-off/reduced-motion). |
| `src/aether/ui/motion/graph/fallback.test.tsx` | renders node count + center orb. |
| `src/aether/ui/screens/playground-screen.tsx` | dev route that drives the engine via the demo script. |
| `src/aether/ui/screens/playground-screen.test.tsx` | mounts, sets/clears `$graphSpec`, fallback path. |

**Modified files**

| File | Change |
|---|---|
| `src/aether/ui/theme/aether.css` | + state/sinh-thể/energy/typography/motion tokens + expanded nav width + nav-rail expand transition. |
| `src/aether/ui/theme/tokens.ts` | mirror new colors; add `AETHER_TYPE`, `AETHER_MOTION`. |
| `src/aether/ui/theme/tokens.test.ts` | pin new colors + type/motion scales. |
| `src/aether/ui/theme/geometry.ts` | add `nav.widthExpanded: 172`. |
| `src/aether/ui/theme/geometry.test.ts` | pin expanded width. |
| `src/aether/ui/shell/nav-items.tsx` | 16 destinations + 5 groups + `iconName`/`group`/`badge`/`busy`. |
| `src/aether/ui/shell/nav-rail.tsx` | expand 62↔172, group headers/labels, living glyph-home, badges, single `Avatar`, remove hardcode. |
| `src/aether/ui/shell/nav-rail.test.tsx` | rewrite for groups/expand/glyph. |
| `src/aether/ui/shell/top-bar.tsx` | ⌘K bar, `VitalSign`, single `Avatar`, typography tokens. |
| `src/aether/ui/shell/top-bar.test.tsx` | ⌘K + vital + avatar. |
| `src/aether/ui/shell/page-transition.tsx` | living-language depth tuning (reduced-motion aware). |
| `src/aether/ui/shell/aether-shell.tsx` | mount `OverlayHost`; vital-driven connection overlay; full title map; drop command-center stub. |
| `src/aether/ui/motion/aether-canvas.tsx` | render `<GraphView>` when `$graphSpec` set (no new Canvas). |
| `src/aether/ui/motion/aether-canvas.test.tsx` | + `shouldRenderGraph` pin. |
| `src/aether/ui/screens/stub-screen.tsx` | **delete** (unused after cleanup). |
| `src/app/routes.ts` | (no const removal — see discrepancy #1); only doc note. |
| `apps/desktop/package.json` | + `troika-three-text`. |
| `apps/desktop/DESIGN.md` | north-star sinh-thể + new tokens + engine bridge points. |

---

## Phase 1 — Foundation (tokens · typography · icons · primitives)

### Task 1: State / sinh-thể / energy color tokens

**Files:**
- Modify: `src/aether/ui/theme/aether.css` (after line 45, inside the `[data-aether-theme='aether']` block)
- Modify: `src/aether/ui/theme/tokens.ts:24` (extend `AETHER`)
- Test: `src/aether/ui/theme/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: CSS vars `--ae-energy`, `--ae-state-online`, `--ae-state-busy`, `--ae-state-dormant`, `--ae-particle`, `--ae-halo`, `--ae-suborb`. TS: `AETHER.energy`, `AETHER.stateOnline`, `AETHER.stateBusy`, `AETHER.stateDormant`, `AETHER.particle`, `AETHER.suborb`, `AETHER.halo` (all `string`).

- [ ] **Step 1: Write the failing test**

Append to `src/aether/ui/theme/tokens.test.ts` inside the first `describe('AETHER palette tokens', …)`:

```ts
  it('exposes the energy accent distinct from the warn semantic', () => {
    expect(AETHER.energy).toBe('#ff9e2c')
    expect(AETHER.energy).not.toBe(AETHER.warn)
  })
  it('exposes shared node-state colors (online=azure, busy=energy, dormant)', () => {
    expect(AETHER.stateOnline).toBe(AETHER.azure)
    expect(AETHER.stateBusy).toBe(AETHER.energy)
    expect(AETHER.stateDormant).toBe('#6f86ad')
  })
  it('exposes sinh-thể (living-engine) colors: particle, halo, sub-orb teal', () => {
    expect(AETHER.particle).toBe('#bfe3ff')
    expect(AETHER.suborb).toBe('#2fd6b6')
    expect(AETHER.halo).toBe('rgba(74,163,255,.35)')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts`
Expected: FAIL — `AETHER.energy` is `undefined`.

- [ ] **Step 3: Extend the TS palette**

In `src/aether/ui/theme/tokens.ts`, add these fields to the `AETHER` object immediately before the closing `} as const` (after the `error: '#ff5d6c',` line):

```ts
  // energy accent — "đang làm" state; semantically separate from `warn`
  energy: '#ff9e2c',
  // shared node/agent/vital states
  stateOnline: '#4aa3ff',
  stateBusy: '#ff9e2c',
  stateDormant: '#6f86ad',
  // sinh-thể (living engine) — particle nucleus / halo / sub-orb
  particle: '#bfe3ff',
  suborb: '#2fd6b6',
  halo: 'rgba(74,163,255,.35)',
```

- [ ] **Step 4: Mirror in CSS**

In `src/aether/ui/theme/aether.css`, insert before `--ae-hairline: 1px var(--ae-line);` (line 45):

```css
  /* energy + shared node-state colors (mirrors tokens.ts; tokens.test.ts pins TS) */
  --ae-energy: #ff9e2c;
  --ae-state-online: var(--ae-azure);
  --ae-state-busy: var(--ae-energy);
  --ae-state-dormant: #6f86ad;
  /* sinh-thể: particle nucleus / halo / sub-orb (xanh ngọc) */
  --ae-particle: #bfe3ff;
  --ae-halo: rgba(74, 163, 255, 0.35);
  --ae-suborb: #2fd6b6;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/theme/tokens.ts src/aether/ui/theme/tokens.test.ts src/aether/ui/theme/aether.css
git commit -m "feat(aether): add energy/node-state/sinh-thể color tokens (SP-4 #0)"
```

---

### Task 2: Typography + motion tokens + expanded nav width

**Files:**
- Modify: `src/aether/ui/theme/tokens.ts` (add two new exports after `AETHER`)
- Modify: `src/aether/ui/theme/aether.css` (typography + motion vars + expanded nav width)
- Modify: `src/aether/ui/theme/geometry.ts:10` (`nav` group)
- Test: `src/aether/ui/theme/tokens.test.ts`, `src/aether/ui/theme/geometry.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - TS `AETHER_TYPE = { text: {xs,sm,base,md,lg,xl:number}, tracking: {tight,wide,wider,widest:number}, leading: {tight,snug,normal:number} }`.
  - TS `AETHER_MOTION = { breatheMs, reachMs, mitosisMs, flowMs, inhaleMs, crystallizeMs:number, ease:string }`.
  - TS `GEOMETRY.nav.widthExpanded = 172`.
  - CSS: `--ae-text-*`, `--ae-tracking-*`, `--ae-leading-*`, `--ae-ease`, `--ae-mo-breathe|reach|mitosis|flow|inhale|crystallize`, `--ae-nav-w-expanded`.

- [ ] **Step 1: Write the failing tests**

Append to `src/aether/ui/theme/tokens.test.ts` a new top-level block (after the existing `describe`s):

```ts
import { AETHER_MOTION, AETHER_TYPE } from './tokens'

describe('AETHER typography + motion scales', () => {
  it('exposes a typography scale (sizes px, tracking em, leading unitless)', () => {
    expect(AETHER_TYPE.text).toEqual({ xs: 11, sm: 12, base: 13, md: 15, lg: 17, xl: 22 })
    expect(AETHER_TYPE.tracking).toEqual({ tight: 0.01, wide: 0.04, wider: 0.16, widest: 0.2 })
    expect(AETHER_TYPE.leading).toEqual({ tight: 1.2, snug: 1.35, normal: 1.5 })
  })
  it('exposes 6-verb motion durations (ms) + a shared easing', () => {
    expect(AETHER_MOTION).toEqual({
      breatheMs: 6000, reachMs: 900, mitosisMs: 1200, flowMs: 1400, inhaleMs: 1000, crystallizeMs: 700,
      ease: 'cubic-bezier(0.5,0.05,0.1,1)',
    })
  })
})
```

Append to `src/aether/ui/theme/geometry.test.ts` inside `describe('geometry source of truth', …)`:

```ts
  it('exposes the expanded nav-rail width (62 collapsed ↔ 172 expanded)', () => {
    expect(GEOMETRY.nav.width).toBe(62)
    expect(GEOMETRY.nav.widthExpanded).toBe(172)
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts src/aether/ui/theme/geometry.test.ts`
Expected: FAIL — `AETHER_TYPE` undefined and `GEOMETRY.nav.widthExpanded` undefined.

- [ ] **Step 3: Add the TS scales**

In `src/aether/ui/theme/tokens.ts`, append after `export type AetherPalette = typeof AETHER`:

```ts

// Typography scale — kills literal text-[17px]/tracking-[.01em] across the shell.
// Sizes in px, tracking in em, leading unitless. CSS mirrors in aether.css.
export const AETHER_TYPE = {
  text: { xs: 11, sm: 12, base: 13, md: 15, lg: 17, xl: 22 },
  tracking: { tight: 0.01, wide: 0.04, wider: 0.16, widest: 0.2 },
  leading: { tight: 1.2, snug: 1.35, normal: 1.5 },
} as const

// 6-verb lifecycle motion — durations in ms (used by the engine timeline) + a
// shared easing string. CSS mirrors as seconds in aether.css.
export const AETHER_MOTION = {
  breatheMs: 6000,
  reachMs: 900,
  mitosisMs: 1200,
  flowMs: 1400,
  inhaleMs: 1000,
  crystallizeMs: 700,
  ease: 'cubic-bezier(0.5,0.05,0.1,1)',
} as const

export type AetherType = typeof AETHER_TYPE
export type AetherMotion = typeof AETHER_MOTION
```

- [ ] **Step 4: Add expanded nav width to geometry**

In `src/aether/ui/theme/geometry.ts`, change line 10:

```ts
  nav: { width: 62, item: 38, gap: 5 },
```

to:

```ts
  // bridge: main.cjs owns the collapsed rail width (62); 172 is the hover-expanded width
  nav: { width: 62, widthExpanded: 172, item: 38, gap: 5 },
```

- [ ] **Step 5: Mirror in CSS**

In `src/aether/ui/theme/aether.css`, insert after `--ae-nav-gap: 5px;` (line 21):

```css
  --ae-nav-w-expanded: 172px;
```

and insert before `--ae-hairline: 1px var(--ae-line);` (line 45, just below the Task-1 sinh-thể block):

```css
  /* typography scale (mirrors AETHER_TYPE in tokens.ts) */
  --ae-text-xs: 11px;
  --ae-text-sm: 12px;
  --ae-text-base: 13px;
  --ae-text-md: 15px;
  --ae-text-lg: 17px;
  --ae-text-xl: 22px;
  --ae-tracking-tight: 0.01em;
  --ae-tracking-wide: 0.04em;
  --ae-tracking-wider: 0.16em;
  --ae-tracking-widest: 0.2em;
  --ae-leading-tight: 1.2;
  --ae-leading-snug: 1.35;
  --ae-leading-normal: 1.5;
  /* 6-verb lifecycle motion (mirrors AETHER_MOTION; seconds here, ms in TS) */
  --ae-ease: cubic-bezier(0.5, 0.05, 0.1, 1);
  --ae-mo-breathe: 6s;
  --ae-mo-reach: 0.9s;
  --ae-mo-mitosis: 1.2s;
  --ae-mo-flow: 1.4s;
  --ae-mo-inhale: 1s;
  --ae-mo-crystallize: 0.7s;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts src/aether/ui/theme/geometry.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/aether/ui/theme/tokens.ts src/aether/ui/theme/tokens.test.ts src/aether/ui/theme/geometry.ts src/aether/ui/theme/geometry.test.ts src/aether/ui/theme/aether.css
git commit -m "feat(aether): add typography + 6-verb motion tokens + expanded nav width (SP-4 #0)"
```

---

### Task 3: Consistent icon set

**Files:**
- Create: `src/aether/ui/components/icon/icon.tsx`
- Test: `src/aether/ui/components/icon/icon.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export type IconName = 'home'|'chat'|'brief'|'dev'|'inbox'|'content'|'ops'|'agents'|'skills'|'memory'|'cron'|'messaging'|'artifacts'|'voice'|'profiles'|'settings'`
  - `export const AETHER_ICONS: Record<IconName, string>` (SVG path `d`).
  - `export function Icon(props: { name: IconName; size?: number; className?: string }): JSX.Element` — single `<svg>`, `stroke="currentColor"`, `strokeWidth={1.7}`, rounded caps/joins.

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/components/icon/icon.test.tsx`:

```tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { AETHER_ICONS, Icon, type IconName } from './icon'

afterEach(cleanup)

const ALL: IconName[] = [
  'home', 'chat', 'brief', 'dev', 'inbox', 'content', 'ops', 'agents',
  'skills', 'memory', 'cron', 'messaging', 'artifacts', 'voice', 'profiles', 'settings',
]

describe('Icon set', () => {
  it('covers all 16 nav destinations with a non-empty path', () => {
    for (const name of ALL) {
      expect(typeof AETHER_ICONS[name]).toBe('string')
      expect(AETHER_ICONS[name].length).toBeGreaterThan(0)
    }
    expect(Object.keys(AETHER_ICONS)).toHaveLength(16)
  })
  it('renders an svg whose stroke inherits currentColor (token-driven)', () => {
    const { container } = render(<Icon name="home" />)
    const path = container.querySelector('path')
    expect(container.querySelector('svg')).toBeTruthy()
    expect(path?.getAttribute('stroke')).toBe('currentColor')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/components/icon/icon.test.tsx`
Expected: FAIL — cannot resolve `./icon`.

- [ ] **Step 3: Implement the icon set**

Create `src/aether/ui/components/icon/icon.tsx`:

```tsx
// One consistent stroke-icon set for the AETHER nav. Stroke inherits currentColor
// so callers control hue via tokens; width/caps are fixed for visual consistency.
export type IconName =
  | 'home' | 'chat' | 'brief' | 'dev' | 'inbox' | 'content' | 'ops' | 'agents'
  | 'skills' | 'memory' | 'cron' | 'messaging' | 'artifacts' | 'voice' | 'profiles' | 'settings'

export const AETHER_ICONS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9',
  chat: 'M4 5h16v11H8l-4 3z',
  brief: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  dev: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  inbox: 'M4 6h16v12H4zM4 13h5l1 2h4l1-2h5',
  content: 'M4 5h16v14H4zM4 9h16M9 9v10',
  ops: 'M4 19h16M6 19V9m4 10V5m4 14v-7m4 7V8',
  agents: 'M5 7h14v11H5zM12 4v3M9 12h.01M15 12h.01',
  skills: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
  memory: 'M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z',
  cron: 'M12 7a5 5 0 1 0 5 5M12 8v4l3 2',
  messaging: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  artifacts: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  voice: 'M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v3',
  profiles: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.6H9.5l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h5l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z',
}

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} fill="none" height={size} viewBox="0 0 24 24" width={size} aria-hidden>
      <path d={AETHER_ICONS[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} />
    </svg>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/components/icon/icon.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/ui/components/icon/icon.tsx src/aether/ui/components/icon/icon.test.tsx
git commit -m "feat(aether): add consistent 16-icon nav set (SP-4 #0)"
```

---

### Task 4: Token-ised Avatar (single source, derived initial)

**Files:**
- Create: `src/aether/ui/components/avatar.tsx`
- Test: `src/aether/ui/components/avatar.test.tsx`

**Interfaces:**
- Consumes: `$activeProfile` from `@/aether/domain/profiles/profiles-store`.
- Produces:
  - `export function profileInitial(name: string | null | undefined): string` — first non-space char upper-cased; fallback `'A'`.
  - `export function Avatar(props: { className?: string }): JSX.Element` — circle sized `--ae-avatar`, fill `--ae-avatar` recipe, initial from `$activeProfile`, `data-testid="ae-avatar"`.

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/components/avatar.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $activeProfile } from '@/aether/domain/profiles/profiles-store'

import { Avatar, profileInitial } from './avatar'

afterEach(() => { cleanup(); $activeProfile.set(null) })

describe('profileInitial', () => {
  it('upper-cases the first non-space char', () => {
    expect(profileInitial('binh')).toBe('B')
    expect(profileInitial('  ada')).toBe('A')
  })
  it('falls back to A for empty/null', () => {
    expect(profileInitial(null)).toBe('A')
    expect(profileInitial('')).toBe('A')
    expect(profileInitial('   ')).toBe('A')
  })
})

describe('Avatar', () => {
  it('renders the active profile initial (single source, no hardcoded "B")', () => {
    $activeProfile.set('khanh')
    render(<Avatar />)
    const el = screen.getByTestId('ae-avatar')
    expect(el.textContent).toBe('K')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/components/avatar.test.tsx`
Expected: FAIL — cannot resolve `./avatar`.

- [ ] **Step 3: Implement Avatar**

Create `src/aether/ui/components/avatar.tsx`:

```tsx
import { useStore } from '@nanostores/react'

import { $activeProfile } from '@/aether/domain/profiles/profiles-store'
import { cn } from '@/lib/utils'

export function profileInitial(name: string | null | undefined): string {
  const ch = (name ?? '').trim()[0]
  return ch ? ch.toUpperCase() : 'A'
}

// The single AETHER avatar. Sized by --ae-avatar, derives its initial from the
// active profile — replaces the two divergent hardcoded "B" avatars (nav + top-bar).
export function Avatar({ className }: { className?: string }) {
  const profile = useStore($activeProfile)
  return (
    <div
      className={cn('grid place-items-center rounded-full text-[length:var(--ae-text-base)] font-bold', className)}
      data-testid="ae-avatar"
      style={{
        height: 'var(--ae-avatar)',
        width: 'var(--ae-avatar)',
        color: 'var(--ae-navy)',
        background: 'radial-gradient(circle at 35% 30%,var(--ae-azure-soft),var(--ae-azure) 70%,var(--ae-azure-bright))',
      }}
    >
      {profileInitial(profile)}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/components/avatar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/ui/components/avatar.tsx src/aether/ui/components/avatar.test.tsx
git commit -m "feat(aether): single token-ised Avatar with derived initial (SP-4 #0)"
```

---

### Task 5: VitalSign (ECG sparkline, 3 states)

**Files:**
- Create: `src/aether/ui/components/vital-sign.tsx`
- Test: `src/aether/ui/components/vital-sign.test.tsx`
- Modify: `src/aether/ui/theme/aether.css` (vital-sign animation keyframes + reduced-motion)

**Interfaces:**
- Consumes: `useConnectionStatus()` return type `'connecting' | 'online' | 'paused'` (`@/aether/domain/connection/use-connection-status`); color tokens `--ae-state-online`, `--ae-energy`, `--ae-error`.
- Produces:
  - `export type VitalStatus = 'online' | 'retrying' | 'down'`.
  - `export function vitalStatus(c: 'connecting' | 'online' | 'paused'): VitalStatus` — `online→online`, `connecting→retrying`, `paused→down`.
  - `export function VitalSign(props: { className?: string }): JSX.Element` — `<svg data-testid="ae-vital" data-status={…}>` ECG polyline; consumes `useConnectionStatus()`.

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/components/vital-sign.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $gatewayState } from '@/store/session'

import { VitalSign, vitalStatus } from './vital-sign'

afterEach(() => { cleanup(); $gatewayState.set('idle') })

describe('vitalStatus mapping', () => {
  it('maps coarse connection status → 3 vital states', () => {
    expect(vitalStatus('online')).toBe('online')
    expect(vitalStatus('connecting')).toBe('retrying')
    expect(vitalStatus('paused')).toBe('down')
  })
})

describe('VitalSign', () => {
  it('reflects the live gateway state via data-status', () => {
    $gatewayState.set('open')
    const { rerender } = render(<VitalSign />)
    expect(screen.getByTestId('ae-vital').getAttribute('data-status')).toBe('online')
    $gatewayState.set('error')
    rerender(<VitalSign />)
    expect(screen.getByTestId('ae-vital').getAttribute('data-status')).toBe('down')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/components/vital-sign.test.tsx`
Expected: FAIL — cannot resolve `./vital-sign`.

- [ ] **Step 3: Implement VitalSign**

Create `src/aether/ui/components/vital-sign.tsx`:

```tsx
import { useConnectionStatus } from '@/aether/domain/connection/use-connection-status'
import { cn } from '@/lib/utils'

export type VitalStatus = 'online' | 'retrying' | 'down'

export function vitalStatus(c: 'connecting' | 'online' | 'paused'): VitalStatus {
  if (c === 'online') return 'online'
  if (c === 'connecting') return 'retrying'
  return 'down'
}

// ECG sparkline replacing the binary 7px dot + the ad-hoc "Mất kết nối" overlay.
// online = azure beat · retrying = amber fast beat · down = flat red line.
const TRACE: Record<VitalStatus, string> = {
  online: 'M0 8 H10 l3 -5 l3 10 l3 -5 H40',
  retrying: 'M0 8 H6 l2 -5 l2 9 l2 -4 H16 l2 -5 l2 9 l2 -4 H40',
  down: 'M0 8 H40',
}
const STROKE: Record<VitalStatus, string> = {
  online: 'var(--ae-state-online)',
  retrying: 'var(--ae-energy)',
  down: 'var(--ae-error)',
}

export function VitalSign({ className }: { className?: string }) {
  const status = vitalStatus(useConnectionStatus())
  return (
    <svg
      aria-label={`Trạng thái kết nối: ${status}`}
      className={cn('ae-vital', className)}
      data-status={status}
      data-testid="ae-vital"
      fill="none"
      height={16}
      role="img"
      viewBox="0 0 40 16"
      width={40}
    >
      <path d={TRACE[status]} stroke={STROKE[status]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} />
    </svg>
  )
}
```

- [ ] **Step 4: Add the beat animation (motion-gated)**

In `src/aether/ui/theme/aether.css`, append before the closing `@media (prefers-reduced-motion: reduce)` block (i.e. just before line 376):

```css
/* vital-sign ECG — gentle opacity beat; speed differs per state (online vs retrying) */
.ae-vital { opacity: 0.9; }
[data-aether-theme='aether'] .ae-vital[data-status='online'] { animation: ae-breath 2.6s ease-in-out infinite; }
[data-aether-theme='aether'] .ae-vital[data-status='retrying'] { animation: ae-breath 0.9s ease-in-out infinite; }
[data-aether-theme='aether'] .ae-vital[data-status='down'] { opacity: 0.7; animation: none; }
```

Then, inside the existing `@media (prefers-reduced-motion: reduce)` block, add `.ae-vital` to the list that has `animation: none !important;` — extend the first selector group (currently ending `.ae-orb-ring`) by adding a new line before the closing `{`:

```css
  [data-aether-theme='aether'] .ae-vital { animation: none !important; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/components/vital-sign.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/components/vital-sign.tsx src/aether/ui/components/vital-sign.test.tsx src/aether/ui/theme/aether.css
git commit -m "feat(aether): VitalSign ECG sparkline with 3 connection states (SP-4 #0)"
```

---

## Phase 2 — App shell chrome

### Task 6: Nav-items — 16 destinations in 5 groups

**Files:**
- Modify: `src/aether/ui/shell/nav-items.tsx` (full rewrite)
- Modify: `src/aether/ui/shell/nav-rail.tsx:72` (swap `{item.icon}` → `<Icon name={item.iconName} />` so tsc stays green; full rail overhaul is Task 7)
- Test: `src/aether/ui/shell/nav-items.test.tsx` (new)

**Interfaces:**
- Consumes: `Icon`, `IconName` (Task 3); route consts from `@/app/routes`.
- Produces:
  - `export type NavGroupId = 'core' | 'pillars' | 'agentsys' | 'channels' | 'system'`
  - `export interface NavGroup { id: NavGroupId; label: string }`
  - `export const AETHER_NAV_GROUPS: NavGroup[]`
  - `export interface NavItem { id: string; route: string; label: string; iconName: IconName; group: NavGroupId; badge?: number; busy?: boolean }`
  - `export const AETHER_NAV_ITEMS: NavItem[]` (16 items).

> Resolution of discrepancy #2: 16 destinations. The glyph orb (Task 7) is the always-present **Home** affordance; `home` also stays a labeled entry in the `core` group so the expanded rail lists it.

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/shell/nav-items.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest'

import { AETHER_NAV_GROUPS, AETHER_NAV_ITEMS } from './nav-items'

describe('AETHER nav model', () => {
  it('declares the 5 spec groups in order', () => {
    expect(AETHER_NAV_GROUPS.map(g => g.id)).toEqual(['core', 'pillars', 'agentsys', 'channels', 'system'])
  })
  it('covers all 16 §5.1 destinations, each mapped to a known group', () => {
    expect(AETHER_NAV_ITEMS).toHaveLength(16)
    const groupIds = new Set(AETHER_NAV_GROUPS.map(g => g.id))
    for (const item of AETHER_NAV_ITEMS) expect(groupIds.has(item.group)).toBe(true)
    expect(AETHER_NAV_ITEMS.filter(i => i.group === 'core').map(i => i.id)).toEqual(['home', 'chat', 'brief'])
    expect(AETHER_NAV_ITEMS.filter(i => i.group === 'system').map(i => i.id)).toEqual(['profiles', 'settings'])
  })
  it('routes are unique', () => {
    const routes = AETHER_NAV_ITEMS.map(i => i.route)
    expect(new Set(routes).size).toBe(routes.length)
  })
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-items.test.tsx`
Expected: FAIL — `AETHER_NAV_GROUPS` not exported.

- [ ] **Step 3: Rewrite nav-items.tsx**

Replace the entire contents of `src/aether/ui/shell/nav-items.tsx` with:

```tsx
import type { IconName } from '@/aether/ui/components/icon/icon'
import {
  AGENTS_ROUTE, ARTIFACTS_ROUTE, BRIEF_ROUTE, CONTENT_ROUTE, CRON_ROUTE, DEV_ROUTE, HUD_ROUTE,
  INBOX_ROUTE, MEMORY_ROUTE, MESSAGING_ROUTE, NEW_CHAT_ROUTE, OPS_ROUTE, PROFILES_ROUTE,
  SETTINGS_ROUTE, SKILLS_ROUTE, VOICE_ROUTE,
} from '@/app/routes'

export type NavGroupId = 'core' | 'pillars' | 'agentsys' | 'channels' | 'system'

export interface NavGroup {
  id: NavGroupId
  label: string
}

export interface NavItem {
  id: string
  route: string
  label: string
  iconName: IconName
  group: NavGroupId
  /** Numeric badge (e.g. Inbox count). Wired to real data in later screen work-items. */
  badge?: number
  /** Amber "đang làm" dot. */
  busy?: boolean
}

// Group order is the spec §5.1 order; the expanded rail renders these headers.
export const AETHER_NAV_GROUPS: NavGroup[] = [
  { id: 'core', label: 'Lõi' },
  { id: 'pillars', label: 'Trụ cột' },
  { id: 'agentsys', label: 'Hệ agent' },
  { id: 'channels', label: 'Kênh' },
  { id: 'system', label: 'System' },
]

export const AETHER_NAV_ITEMS: NavItem[] = [
  { id: 'home', route: HUD_ROUTE, label: 'Trang chủ', iconName: 'home', group: 'core' },
  { id: 'chat', route: NEW_CHAT_ROUTE, label: 'Trò chuyện', iconName: 'chat', group: 'core' },
  { id: 'brief', route: BRIEF_ROUTE, label: 'Brief sáng', iconName: 'brief', group: 'core' },
  { id: 'dev', route: DEV_ROUTE, label: 'Dev', iconName: 'dev', group: 'pillars' },
  { id: 'inbox', route: INBOX_ROUTE, label: 'Inbox · CRM', iconName: 'inbox', group: 'pillars' },
  { id: 'content', route: CONTENT_ROUTE, label: 'Content', iconName: 'content', group: 'pillars' },
  { id: 'ops', route: OPS_ROUTE, label: 'Vận hành', iconName: 'ops', group: 'pillars' },
  { id: 'agents', route: AGENTS_ROUTE, label: 'Agents', iconName: 'agents', group: 'agentsys' },
  { id: 'skills', route: SKILLS_ROUTE, label: 'Skills', iconName: 'skills', group: 'agentsys' },
  { id: 'memory', route: MEMORY_ROUTE, label: 'Memory', iconName: 'memory', group: 'agentsys' },
  { id: 'cron', route: CRON_ROUTE, label: 'Cron', iconName: 'cron', group: 'agentsys' },
  { id: 'messaging', route: MESSAGING_ROUTE, label: 'Messaging', iconName: 'messaging', group: 'channels' },
  { id: 'artifacts', route: ARTIFACTS_ROUTE, label: 'Artifacts', iconName: 'artifacts', group: 'channels' },
  { id: 'voice', route: VOICE_ROUTE, label: 'Voice', iconName: 'voice', group: 'channels' },
  { id: 'profiles', route: PROFILES_ROUTE, label: 'Profiles', iconName: 'profiles', group: 'system' },
  { id: 'settings', route: SETTINGS_ROUTE, label: 'Cài đặt', iconName: 'settings', group: 'system' },
]
```

- [ ] **Step 4: Keep nav-rail compiling (minimal swap)**

In `src/aether/ui/shell/nav-rail.tsx`, add the import at the top (after the `cn` import on line 1):

```tsx
import { Icon } from '@/aether/ui/components/icon/icon'
```

and change line 72 `{item.icon}` to:

```tsx
{<Icon name={item.iconName} />}
```

> This is throwaway scaffolding; Task 7 rewrites this file. The old `nav-rail.test.tsx` assertions about the `home` item being index 0 still hold (home is still first).

- [ ] **Step 5: Run the gate**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-items.test.tsx src/aether/ui/shell/nav-rail.test.tsx && npx tsc -p . --noEmit`
Expected: PASS (nav-items new test green; existing nav-rail test still green; tsc clean).

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/nav-items.tsx src/aether/ui/shell/nav-items.test.tsx src/aether/ui/shell/nav-rail.tsx
git commit -m "feat(aether): nav model — 16 destinations in 5 groups + icon names (SP-4 #0)"
```

---

### Task 7: Nav-rail — expand-on-hover, groups, living glyph-home, single avatar

**Files:**
- Modify: `src/aether/ui/shell/nav-rail.tsx` (full rewrite)
- Modify: `src/aether/ui/shell/nav-rail.test.tsx` (full rewrite)
- Modify: `src/aether/ui/theme/aether.css` (rail expand transition + group header style)

**Interfaces:**
- Consumes: `AETHER_NAV_ITEMS`, `AETHER_NAV_GROUPS`, `NavItem`, `NavGroupId` (Task 6); `Icon` (Task 3); `Avatar` (Task 4); `LivingOrb` (`@/aether/ui/orb/living-orb`); `GEOMETRY` (Task 2); `navIndicatorTransform`, `useTitlebarInset` (existing).
- Produces: `export function NavRail(props: NavRailProps)` where `NavRailProps = { items?: NavItem[]; activeRoute: string; onNavigate: (route: string) => void }`. Removes the old `online` prop and the azure online-dot (vital-state now lives in the living glyph + top-bar VitalSign). DoD #4 (living glyph orb in rail) is satisfied here.

> The glyph orb is the **Home** button. It renders the gated `<LivingOrb size={42} />` (CSS orb already tracks `$orbState` and has the reduced-motion fallback — no second Canvas). Group headers + item labels appear only when the rail is expanded (hover or pinned).

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/aether/ui/shell/nav-rail.test.tsx` with:

```tsx
// apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HUD_ROUTE } from '@/app/routes'

import { AETHER_NAV_ITEMS } from './nav-items'
import { NavRail } from './nav-rail'

afterEach(cleanup)

describe('NavRail', () => {
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })

  it('renders the living glyph as the Home button (vital-state orb, role=status)', () => {
    const onNavigate = vi.fn()
    render(<NavRail activeRoute="/" onNavigate={onNavigate} />)
    const home = screen.getByRole('button', { name: 'Trang chủ' })
    expect(home.querySelector('[role="status"]')).toBeTruthy() // the living orb
    fireEvent.click(home)
    expect(onNavigate).toHaveBeenCalledWith(HUD_ROUTE)
  })

  it('no longer renders the binary azure online dot (moved to VitalSign)', () => {
    render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    expect(screen.queryByTestId('ae-online-dot')).toBeNull()
  })

  it('shows group headers only when expanded (hover)', () => {
    const { container } = render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    expect(screen.queryByText('Trụ cột')).toBeNull()
    fireEvent.mouseEnter(container.querySelector('nav') as HTMLElement)
    expect(screen.getByText('Trụ cột')).toBeTruthy()
    expect(screen.getByText('Hệ agent')).toBeTruthy()
  })

  it('marks the active item and fires onNavigate on click', () => {
    const onNavigate = vi.fn()
    render(<NavRail activeRoute="/agents" onNavigate={onNavigate} />)
    const agents = screen.getByRole('button', { name: 'Agents' })
    expect(agents.getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Skills' }))
    expect(onNavigate).toHaveBeenCalledWith('/skills')
  })

  it('renders a numeric badge when an item provides one', () => {
    const items = AETHER_NAV_ITEMS.map(i => (i.id === 'inbox' ? { ...i, badge: 3 } : i))
    render(<NavRail activeRoute="/" items={items} onNavigate={vi.fn()} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-rail.test.tsx`
Expected: FAIL — current rail has no group headers / glyph-home / badge.

- [ ] **Step 3: Rewrite nav-rail.tsx**

Replace the entire contents of `src/aether/ui/shell/nav-rail.tsx` with:

```tsx
import { useState } from 'react'

import { Avatar } from '@/aether/ui/components/avatar'
import { Icon } from '@/aether/ui/components/icon/icon'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { GEOMETRY } from '@/aether/ui/theme/geometry'
import { HUD_ROUTE } from '@/app/routes'
import { cn } from '@/lib/utils'

import { AETHER_NAV_GROUPS, AETHER_NAV_ITEMS, type NavItem } from './nav-items'
import { navIndicatorTransform } from './use-nav-indicator'
import { useTitlebarInset } from './use-titlebar-inset'

const ITEM_H = GEOMETRY.nav.item
const GAP = GEOMETRY.nav.gap

export interface NavRailProps {
  items?: NavItem[]
  activeRoute: string
  onNavigate: (route: string) => void
}

export function NavRail({ items = AETHER_NAV_ITEMS, activeRoute, onNavigate }: NavRailProps) {
  const [expanded, setExpanded] = useState(false)
  const titlebarInset = useTitlebarInset()
  const activeIndex = items.findIndex(i => i.route === activeRoute)
  const transform = navIndicatorTransform(activeIndex, ITEM_H, GAP)

  return (
    <nav
      aria-label="HYPERTEK - AGENT PLATFORM"
      className="ae-rail relative flex flex-none flex-col gap-1.5 pb-3.5"
      data-expanded={expanded || undefined}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      style={{
        width: expanded ? 'var(--ae-nav-w-expanded)' : 'var(--ae-nav-w)',
        paddingTop: `${titlebarInset}px`,
        WebkitAppRegion: 'drag',
        borderRight: '1px solid var(--ae-line)',
        background: 'linear-gradient(180deg,var(--ae-glass),var(--ae-glass-2))',
      } as React.CSSProperties}
    >
      {/* living glyph orb = Home button (collapsed-orb, vital-state) */}
      <button
        aria-label="Trang chủ"
        className="relative mb-1 grid h-[42px] w-[42px] flex-none place-items-center self-center"
        onClick={() => onNavigate(HUD_ROUTE)}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Trang chủ"
        type="button"
      >
        <LivingOrb className="pointer-events-none" label="Trang chủ" size={42} />
      </button>

      {/* grouped item column with sliding indicator */}
      <div
        className="relative flex w-full flex-col gap-[var(--ae-nav-gap)] px-2"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {transform && <div className="ae-nav-indicator" style={{ transform, ['--ae-nav-item-h' as string]: `${ITEM_H}px` }} />}
        {AETHER_NAV_GROUPS.map(group => {
          const groupItems = items.filter(i => i.group === group.id)
          if (groupItems.length === 0) return null
          return (
            <div className="flex flex-col gap-[var(--ae-nav-gap)]" key={group.id}>
              {expanded && (
                <div className="ae-nav-group-header px-1 pt-1.5 text-[length:var(--ae-text-xs)] font-semibold uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-dim)]">
                  {group.label}
                </div>
              )}
              {groupItems.map(item => {
                const active = item.route === activeRoute
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                    className={cn(
                      'relative z-[1] flex h-[38px] items-center gap-2.5 rounded-[11px] px-2 transition-colors',
                      active ? 'text-white' : 'text-[color:var(--ae-dim)] hover:text-[color:var(--ae-azure-soft)]',
                    )}
                    key={item.id}
                    onClick={() => onNavigate(item.route)}
                    title={item.label}
                    type="button"
                  >
                    <span className="relative grid h-5 w-6 flex-none place-items-center">
                      <Icon name={item.iconName} />
                      {item.busy && (
                        <span className="absolute -right-0.5 -top-0.5 h-[6px] w-[6px] rounded-full" style={{ background: 'var(--ae-energy)', boxShadow: '0 0 6px var(--ae-energy)' }} />
                      )}
                    </span>
                    {expanded && <span className="truncate text-[length:var(--ae-text-sm)]">{item.label}</span>}
                    {item.badge != null && (
                      <span
                        className={cn('grid h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[length:var(--ae-text-xs)] font-bold text-[color:var(--ae-navy)]', expanded ? 'ml-auto' : 'absolute -right-0.5 -top-0.5')}
                        style={{ background: 'var(--ae-azure)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="flex-1" />
      <div className="self-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Avatar />
      </div>
    </nav>
  )
}
```

- [ ] **Step 4: Add rail expand transition + group header CSS**

In `src/aether/ui/theme/aether.css`, append after the `.ae-nav-edge { … }` rule (after line 265):

```css
/* nav-rail expand-on-hover (62 ↔ 172). Reduced-motion drops the width transition. */
.ae-rail { transition: width 0.32s var(--ae-ease); will-change: width; }
.ae-nav-group-header { white-space: nowrap; }
@media (prefers-reduced-motion: reduce) {
  [data-aether-theme='aether'] .ae-rail { transition: none !important; }
}
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-rail.test.tsx && npx tsc -p . --noEmit`
Expected: PASS.

> Note: `aether-shell.tsx` still passes the now-removed `online` prop to `<NavRail>`. TS will flag the extra prop. Leave it for Task 11 (shell integration), OR if tsc fails here, remove `online={status === 'online'}` from the `<NavRail …/>` call in `aether-shell.tsx` now (one-line edit) and re-run. Prefer the one-line edit so this task's gate is green.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/nav-rail.tsx src/aether/ui/shell/nav-rail.test.tsx src/aether/ui/theme/aether.css src/aether/ui/shell/aether-shell.tsx
git commit -m "feat(aether): expandable grouped nav-rail with living glyph-home + single avatar (SP-4 #0)"
```

---

### Task 8: Top-bar — ⌘K bar, VitalSign, single Avatar, typography tokens

**Files:**
- Modify: `src/aether/ui/shell/top-bar.tsx`
- Modify: `src/aether/ui/shell/top-bar.test.tsx`

**Interfaces:**
- Consumes: `Avatar` (Task 4); `VitalSign` (Task 5); `openCommandPalette` (`@/store/command-palette`); `$connection` (`@/store/session`).
- Produces: `export function TopBar(props: { title: string; now?: Date })` — unchanged signature; internally adds a ⌘K trigger (`data-testid="ae-cmdk"`), a `VitalSign`, and a single `Avatar`; replaces literal `text-[17px]`/`tracking-[.01em]`/`text-[13px]` with token utilities. `formatAetherClock` stays exported and unchanged.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of `src/aether/ui/shell/top-bar.test.tsx` with:

```tsx
// apps/desktop/src/aether/ui/shell/top-bar.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $commandPaletteOpen, closeCommandPalette } from '@/store/command-palette'
import { $gatewayState } from '@/store/session'

import { formatAetherClock, TopBar } from './top-bar'

beforeEach(() => { closeCommandPalette(); $gatewayState.set('open') })
afterEach(() => { cleanup(); $gatewayState.set('idle') })

describe('TopBar', () => {
  it('formats the clock as Vietnamese weekday · DD.MM · HH:mm', () => {
    expect(formatAetherClock(new Date(2026, 5, 25, 9, 14))).toBe('Th 5 · 25.06 · 09:14')
  })
  it('renders the page title', () => {
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    expect(screen.getByRole('heading', { name: 'Trang chủ' })).toBeTruthy()
  })
  it('opens the command palette from the ⌘K bar', () => {
    expect($commandPaletteOpen.get()).toBe(false)
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    fireEvent.click(screen.getByTestId('ae-cmdk'))
    expect($commandPaletteOpen.get()).toBe(true)
  })
  it('renders the vital-sign and exactly one avatar', () => {
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    expect(screen.getByTestId('ae-vital')).toBeTruthy()
    expect(screen.getAllByTestId('ae-avatar')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/top-bar.test.tsx`
Expected: FAIL — no `ae-cmdk`/`ae-vital`/`ae-avatar`.

- [ ] **Step 3: Rewrite top-bar.tsx**

Replace the entire contents of `src/aether/ui/shell/top-bar.tsx` with:

```tsx
// apps/desktop/src/aether/ui/shell/top-bar.tsx
import { useStore } from '@nanostores/react'

import { Avatar } from '@/aether/ui/components/avatar'
import { VitalSign } from '@/aether/ui/components/vital-sign'
import { $connection } from '@/store/session'
import { openCommandPalette } from '@/store/command-palette'

const WEEKDAYS_VI = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'] // 0=Sunday

export function formatAetherClock(d: Date): string {
  const wd = WEEKDAYS_VI[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')

  return `${wd} · ${dd}.${mm} · ${hh}:${mi}`
}

export function TopBar({ title, now = new Date() }: { title: string; now?: Date }) {
  const connection = useStore($connection)
  // Windows/Linux render native min/max/close on the RIGHT via titleBarOverlay; reserve their width.
  const overlayWidth = connection?.windowButtonPosition == null ? (connection?.nativeOverlayWidth ?? 0) : 0
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ paddingRight: overlayWidth ? `${overlayWidth}px` : undefined, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-[length:var(--ae-text-lg)] font-semibold tracking-[var(--ae-tracking-tight)]">{title}</h1>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="flex items-center gap-2 rounded-[var(--ae-radius-md)] border border-[color:var(--ae-line)] bg-[var(--ae-glass-2)] px-3 py-1.5 text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)] transition-colors hover:text-[color:var(--ae-azure-soft)]"
          data-testid="ae-cmdk"
          onClick={openCommandPalette}
          type="button"
        >
          <span>Tìm kiếm</span>
          <kbd className="font-mono text-[length:var(--ae-text-xs)] tracking-[var(--ae-tracking-wide)]">⌘K</kbd>
        </button>
        <VitalSign />
        <span className="font-mono text-[length:var(--ae-text-xs)] tracking-[var(--ae-tracking-wide)] text-[color:var(--ae-dim)]">{formatAetherClock(now)}</span>
        <Avatar />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/top-bar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/ui/shell/top-bar.tsx src/aether/ui/shell/top-bar.test.tsx
git commit -m "feat(aether): top-bar with ⌘K bar, vital-sign, single avatar, typography tokens (SP-4 #0)"
```

---

### Task 9: Overlay/modal host primitive

**Files:**
- Create: `src/aether/ui/shell/overlay-host.tsx`
- Test: `src/aether/ui/shell/overlay-host.test.tsx`

**Interfaces:**
- Consumes: `GlassSlab` (`@/aether/ui/components/glass-slab`); motion gate via `prefers-reduced-motion` (CSS-driven).
- Produces:
  - `export type OverlayKind = 'summon' | 'result' | 'connection'`
  - `export interface OverlayState { kind: OverlayKind; title?: string; body?: React.ReactNode }`
  - `export const $overlay = atom<OverlayState | null>(null)`
  - `export function openOverlay(o: OverlayState): void`, `export function closeOverlay(): void`
  - `export function OverlayHost(): JSX.Element | null` — renders a blurred backdrop over the current screen (keeps context), Esc closes, `data-testid="ae-overlay"`, `data-kind`. Backdrop click closes for `result`/`summon`; `connection` is non-dismissable (driven by state).

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/shell/overlay-host.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { $overlay, closeOverlay, openOverlay, OverlayHost } from './overlay-host'

afterEach(() => { cleanup(); closeOverlay() })

describe('OverlayHost', () => {
  it('renders nothing when no overlay is open', () => {
    const { container } = render(<OverlayHost />)
    expect(container.firstChild).toBeNull()
  })
  it('renders the open overlay with its kind + title', () => {
    openOverlay({ kind: 'result', title: 'Kết quả' })
    render(<OverlayHost />)
    const host = screen.getByTestId('ae-overlay')
    expect(host.getAttribute('data-kind')).toBe('result')
    expect(screen.getByText('Kết quả')).toBeTruthy()
  })
  it('closes a dismissable overlay on Escape', () => {
    openOverlay({ kind: 'result', title: 'Kết quả' })
    render(<OverlayHost />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect($overlay.get()).toBeNull()
  })
  it('does NOT close the non-dismissable connection overlay on Escape', () => {
    openOverlay({ kind: 'connection', title: 'Mất kết nối' })
    render(<OverlayHost />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect($overlay.get()).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/overlay-host.test.tsx`
Expected: FAIL — cannot resolve `./overlay-host`.

- [ ] **Step 3: Implement OverlayHost**

Create `src/aether/ui/shell/overlay-host.tsx`:

```tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'
import { atom } from 'nanostores'

import { GlassSlab } from '@/aether/ui/components/glass-slab'

export type OverlayKind = 'summon' | 'result' | 'connection'

export interface OverlayState {
  kind: OverlayKind
  title?: string
  body?: React.ReactNode
}

// Shell-level host for the summon overlay, result modal, and connection/vital overlay.
// This is the canonical overlay render path for the AETHER shell (OVERLAY_VIEWS in
// routes.ts is the registry the per-screen migrations will consult later).
export const $overlay = atom<OverlayState | null>(null)

export function openOverlay(o: OverlayState): void { $overlay.set(o) }
export function closeOverlay(): void { $overlay.set(null) }

const DISMISSABLE: Record<OverlayKind, boolean> = { summon: true, result: true, connection: false }

export function OverlayHost() {
  const overlay = useStore($overlay)
  const dismissable = overlay ? DISMISSABLE[overlay.kind] : false

  useEffect(() => {
    if (!overlay || !dismissable) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [overlay, dismissable])

  if (!overlay) return null

  return (
    <div
      aria-modal="true"
      className="ae-overlay-host absolute inset-0 z-[60] grid place-items-center"
      data-kind={overlay.kind}
      data-testid="ae-overlay"
      onClick={dismissable ? closeOverlay : undefined}
      role="dialog"
      style={{ background: 'rgba(2,12,29,.45)', backdropFilter: 'blur(8px)' }}
    >
      <GlassSlab className="min-w-[280px] max-w-[70%]" size="lg">
        <div onClick={e => e.stopPropagation()}>
          {overlay.title && (
            <div className="mb-2 text-[length:var(--ae-text-base)] uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-azure-soft)]">
              {overlay.title}
            </div>
          )}
          {overlay.body}
        </div>
      </GlassSlab>
    </div>
  )
}
```

- [ ] **Step 4: Add reduced-motion-safe enter animation**

In `src/aether/ui/theme/aether.css`, append after the rail expand block from Task 7:

```css
/* overlay host — reuses the depth-enter feel; reduced-motion handled globally below */
.ae-overlay-host { animation: ae-depth 0.32s var(--ae-ease) both; }
@media (prefers-reduced-motion: reduce) {
  [data-aether-theme='aether'] .ae-overlay-host { animation: ae-fade 0.18s ease both; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/overlay-host.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/overlay-host.tsx src/aether/ui/shell/overlay-host.test.tsx src/aether/ui/theme/aether.css
git commit -m "feat(aether): shell-level overlay/modal host primitive (SP-4 #0)"
```

---

### Task 10: Cleanup — remove the dead `/command-center` AETHER stub

**Files:**
- Modify: `src/aether/ui/shell/aether-shell.tsx` (remove StubScreen import + route)
- Delete: `src/aether/ui/screens/stub-screen.tsx`
- Modify: `src/app/routes.ts` (doc-comment only — see discrepancy #1)

**Interfaces:**
- Consumes: nothing new.
- Produces: `/command-center` no longer resolves to a dead stub inside the AETHER shell; the catch-all `*` route already redirects to `NEW_CHAT_ROUTE`.

> Per discrepancy #1, do **not** remove `COMMAND_CENTER_ROUTE` or the `command-center` `AppView` — the web command-palette/overlay-routing still consume them.

- [ ] **Step 1: Verify the negative-assertion tests still describe the goal**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell-settings-route.test.tsx`
Expected: PASS (these assert StubScreen strings are absent for those routes; deleting the file keeps them green).

- [ ] **Step 2: Remove the stub route + import from the shell**

In `src/aether/ui/shell/aether-shell.tsx`:
- Delete line 27: `import { StubScreen } from '@/aether/ui/screens/stub-screen'`
- Delete line 69: `<Route element={<StubScreen title="Command Center" />} path={COMMAND_CENTER_ROUTE.slice(1)} />`
- In the route-consts import on line 30, remove `COMMAND_CENTER_ROUTE,` from the destructured list (it is now unused in this file).

- [ ] **Step 3: Delete the stub component**

```bash
git rm src/aether/ui/screens/stub-screen.tsx
```

- [ ] **Step 4: Add the deferral note in routes.ts**

In `src/app/routes.ts`, add a comment immediately above the `COMMAND_CENTER_ROUTE` export (line 4):

```ts
// NOTE (SP-4 #0): the AETHER shell no longer renders a /command-center screen.
// This const + the 'command-center' AppView stay because the web command-palette
// and overlay-routing (src/app/...) still consume them; decommission separately.
```

- [ ] **Step 5: Run the gate**

Run: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: PASS — no remaining references to `StubScreen` in `src/aether`; tsc clean (web-shell usages of `COMMAND_CENTER_ROUTE` untouched).

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/aether-shell.tsx src/app/routes.ts
git commit -m "refactor(aether): remove dead /command-center stub from the shell (SP-4 #0)"
```

---

### Task 11: Shell integration — overlay host, vital connection overlay, full title map

**Files:**
- Modify: `src/aether/ui/shell/aether-shell.tsx`
- Modify: `src/aether/ui/shell/aether-shell.test.tsx` (add coverage)

**Interfaces:**
- Consumes: `OverlayHost`, `openOverlay`, `closeOverlay` (Task 9); `AETHER_NAV_ITEMS` (Task 6); `useConnectionStatus` (existing).
- Produces: shell mounts `<OverlayHost />`; the ad-hoc `status === 'paused'` overlay is replaced by a `connection` overlay driven through the host; the page title resolves from `AETHER_NAV_ITEMS` for every route (kept fallback only for unknown paths).

- [ ] **Step 1: Write the failing test**

Append to `src/aether/ui/shell/aether-shell.test.tsx` a new block (after the existing `describe`s):

```tsx
import { $overlay } from './overlay-host'

describe('AetherShell connection overlay (vital-driven, host-rendered)', () => {
  beforeEach(() => { $bootDone.set(true); $overlay.set(null) })
  afterEach(() => { $overlay.set(null) })

  it('opens a non-dismissable connection overlay when the gateway is down', () => {
    $gatewayState.set('error')
    renderShell(HUD_ROUTE)
    expect(screen.getByTestId('ae-overlay').getAttribute('data-kind')).toBe('connection')
  })
  it('shows no overlay while online', () => {
    $gatewayState.set('open')
    renderShell(HUD_ROUTE)
    expect(screen.queryByTestId('ae-overlay')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx -t "connection overlay"`
Expected: FAIL — shell still uses the ad-hoc paused overlay, no `ae-overlay`.

- [ ] **Step 3: Wire the host + connection overlay + title map**

In `src/aether/ui/shell/aether-shell.tsx`:

- Add imports near the other shell-local imports (with `./nav-rail`, `./top-bar`):

```tsx
import { closeOverlay, OverlayHost, openOverlay } from './overlay-host'
import { useEffect } from 'react'
```

(If `useEffect` is not already imported, add it; React Router hooks are already imported.)

- Replace the `TITLES` map and `title` derivation (lines 38, 50–51) with a full map from nav items plus the two non-nav titles:

```tsx
const EXTRA_TITLES: Record<string, string> = { [HUD_ROUTE]: 'Trang chủ', '/': 'Trò chuyện' }
function titleFor(pathname: string): string {
  const item = AETHER_NAV_ITEMS.find(i => i.route === pathname)
  return EXTRA_TITLES[pathname] ?? item?.label ?? 'AETHER'
}
```

and inside the component replace the `activeItem`/`title` lines with:

```tsx
  const title = titleFor(location.pathname)
```

- Add a connection-overlay effect inside the component, after `const motionEnabled = useMotionEnabled()`:

```tsx
  useEffect(() => {
    if (status === 'paused') openOverlay({ kind: 'connection', title: 'Mất kết nối', body: 'Đang thử lại…' })
    else closeOverlay()
  }, [status])
```

- Remove the ad-hoc paused overlay block (lines 86–90, the `{status === 'paused' && (…)}`).
- Mount the host just before `<CommandPalette />` (line 91):

```tsx
      <OverlayHost />
```

- The `GlassSlab` import is now unused in this file → remove it (line 8).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx`
Expected: PASS (existing shell tests + new connection-overlay tests).

- [ ] **Step 5: Run the full gate**

Run: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/aether-shell.tsx src/aether/ui/shell/aether-shell.test.tsx
git commit -m "feat(aether): mount overlay host, vital-driven connection overlay, full title map (SP-4 #0)"
```

---

### Task 12: Page-transition — living-language depth tuning

**Files:**
- Modify: `src/aether/ui/shell/page-transition.tsx`
- Test: `src/aether/ui/shell/page-transition.test.tsx` (new)

**Interfaces:**
- Consumes: nothing.
- Produces: `export function PageTransition(props: { routeKey: string; children: React.ReactNode })` — same signature; still re-keys to replay `.ae-depth-enter`, now also tags `data-ae-transition` for the living-language variant and stays reduced-motion safe (CSS already downgrades `.ae-depth-enter` under reduced-motion).

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/shell/page-transition.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { PageTransition } from './page-transition'

afterEach(cleanup)

describe('PageTransition', () => {
  it('replays the depth-enter animation per route key and tags the variant', () => {
    const { rerender, container } = render(
      <PageTransition routeKey="/a"><div data-testid="c">A</div></PageTransition>,
    )
    const first = container.querySelector('[data-ae-transition]') as HTMLElement
    expect(first).toBeTruthy()
    expect(first.className).toContain('ae-depth-enter')
    rerender(<PageTransition routeKey="/b"><div data-testid="c">B</div></PageTransition>)
    expect(screen.getByTestId('c').textContent).toBe('B')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/page-transition.test.tsx`
Expected: FAIL — no `data-ae-transition` attribute yet.

- [ ] **Step 3: Update page-transition.tsx**

Replace the entire contents of `src/aether/ui/shell/page-transition.tsx` with:

```tsx
// apps/desktop/src/aether/ui/shell/page-transition.tsx
// Re-keys children on route change so the .ae-depth-enter animation replays.
// The living-language variant is tagged via data-ae-transition; reduced-motion
// downgrades .ae-depth-enter to a fade (see aether.css).
export function PageTransition({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  return (
    <div className="ae-depth-enter h-full min-h-0" data-ae-transition key={routeKey}>
      {children}
    </div>
  )
}
```

- [ ] **Step 4: Tune the depth keyframe toward the living language**

In `src/aether/ui/theme/aether.css`, replace the `@keyframes ae-depth { … }` block (lines 326–329) with:

```css
@keyframes ae-depth {
  from { opacity: 0; transform: scale(1.03) translateY(6px); filter: blur(5px); }
  60% { filter: blur(0); }
  to { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/page-transition.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/aether/ui/shell/page-transition.tsx src/aether/ui/shell/page-transition.test.tsx src/aether/ui/theme/aether.css
git commit -m "feat(aether): living-language page-transition tuning (SP-4 #0)"
```

---

## Phase 3 — Living engine (all-WebGL primary + static fallback)

> **Architecture reminder (spec §6):** the engine splits into (a) a **pure logic core** — `GraphSpec` model + 6-verb lifecycle + layout + demo script, fully jsdom-tested — and (b) a **thin R3F view** that reads the core and renders. Following the established repo pattern (`aether-canvas.test.tsx`, `living-orb-gl.test.tsx`), jsdom tests target **pure helpers**, not GL mounts; the real GL mount/dispose is verified manually (Task 22 §Manual). The static DOM/SVG fallback **is** jsdom-tested because it is plain DOM.

### Task 13: GraphSpec model (pure logic)

**Files:**
- Create: `src/aether/domain/engine/graph-model.ts`
- Test: `src/aether/domain/engine/graph-model.test.ts`

**Interfaces:**
- Consumes: `LifecyclePhase` (Task 14 — but to avoid a cycle, define `LifecyclePhase` here is NOT done; instead this module imports the type from `./lifecycle`). **Build Task 14 first if you want strict TDD order**, OR temporarily inline the type. This plan builds 14 before 13 conceptually but they are independent files; implement 14's type import here.
- Produces:
  - `export type NodeState = 'online' | 'busy' | 'dormant'`
  - `export interface OrbSpec { id: string; kind: 'core' | 'sub'; state: NodeState; x: number; y: number }`
  - `export interface NodeSpec { id: string; label: string; state: NodeState; x: number; y: number }`
  - `export interface LinkSpec { id: string; from: string; to: string; flow: number }`
  - `export interface GraphSpec { phase: LifecyclePhase; orbs: OrbSpec[]; nodes: NodeSpec[]; links: LinkSpec[] }`
  - `export function createGraph(p?: Partial<GraphSpec>): GraphSpec`

> Ordering note: Task 14 (`lifecycle.ts`) defines `LifecyclePhase`. Implement Task 14 first, then this task. The plan lists 13 before 14 for reading flow only; the executor should do 14 → 13 or create both files in the same slice. To keep each task's gate green, **do Task 14 first.**

- [ ] **Step 1: Write the failing test**

Create `src/aether/domain/engine/graph-model.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { createGraph } from './graph-model'

describe('createGraph', () => {
  it('returns an empty breathing graph by default', () => {
    const g = createGraph()
    expect(g).toEqual({ phase: 'breathe', orbs: [], nodes: [], links: [] })
  })
  it('merges partial input over the defaults', () => {
    const g = createGraph({ phase: 'flow', nodes: [{ id: 'n1', label: 'Inbox', state: 'busy', x: 1, y: 0 }] })
    expect(g.phase).toBe('flow')
    expect(g.nodes).toHaveLength(1)
    expect(g.orbs).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/graph-model.test.ts`
Expected: FAIL — cannot resolve `./graph-model`.

- [ ] **Step 3: Implement graph-model.ts**

Create `src/aether/domain/engine/graph-model.ts`:

```ts
import type { LifecyclePhase } from './lifecycle'

export type NodeState = 'online' | 'busy' | 'dormant'

export interface OrbSpec {
  id: string
  kind: 'core' | 'sub'
  state: NodeState
  x: number
  y: number
}

export interface NodeSpec {
  id: string
  label: string
  state: NodeState
  x: number
  y: number
}

export interface LinkSpec {
  id: string
  from: string
  to: string
  /** 0..1 — data-flow intensity rendered along the tendril. */
  flow: number
}

export interface GraphSpec {
  phase: LifecyclePhase
  orbs: OrbSpec[]
  nodes: NodeSpec[]
  links: LinkSpec[]
}

export function createGraph(p: Partial<GraphSpec> = {}): GraphSpec {
  return {
    phase: p.phase ?? 'breathe',
    orbs: p.orbs ?? [],
    nodes: p.nodes ?? [],
    links: p.links ?? [],
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/graph-model.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/domain/engine/graph-model.ts src/aether/domain/engine/graph-model.test.ts
git commit -m "feat(aether): GraphSpec model for the living engine (SP-4 #0)"
```

---

### Task 14: 6-verb lifecycle state machine (pure logic)

> **Do this before Task 13** (it owns `LifecyclePhase`).

**Files:**
- Create: `src/aether/domain/engine/lifecycle.ts`
- Test: `src/aether/domain/engine/lifecycle.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const LIFECYCLE_PHASES = ['breathe','reach','mitosis','flow','inhale','crystallize'] as const`
  - `export type LifecyclePhase = typeof LIFECYCLE_PHASES[number]`
  - `export type LifecycleEvent = 'think' | 'spawn' | 'work' | 'absorb' | 'crystallize' | 'reset'`
  - `export function lifecycleReducer(phase: LifecyclePhase, event: LifecycleEvent): LifecyclePhase`

- [ ] **Step 1: Write the failing test**

Create `src/aether/domain/engine/lifecycle.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { lifecycleReducer, LIFECYCLE_PHASES } from './lifecycle'

describe('6-verb lifecycle', () => {
  it('exposes the 6 verbs in order', () => {
    expect(LIFECYCLE_PHASES).toEqual(['breathe', 'reach', 'mitosis', 'flow', 'inhale', 'crystallize'])
  })
  it('walks the canonical HSG path on the scripted events', () => {
    let p = lifecycleReducer('breathe', 'think')
    expect(p).toBe('reach')
    p = lifecycleReducer(p, 'spawn')
    expect(p).toBe('mitosis')
    p = lifecycleReducer(p, 'work')
    expect(p).toBe('flow')
    p = lifecycleReducer(p, 'absorb')
    expect(p).toBe('inhale')
    p = lifecycleReducer(p, 'crystallize')
    expect(p).toBe('crystallize')
  })
  it('allows reach → flow directly (no sub-agent spawned)', () => {
    expect(lifecycleReducer('reach', 'work')).toBe('flow')
  })
  it('reset always returns to breathe; invalid events are no-ops', () => {
    expect(lifecycleReducer('flow', 'reset')).toBe('breathe')
    expect(lifecycleReducer('breathe', 'absorb')).toBe('breathe')
    expect(lifecycleReducer('crystallize', 'spawn')).toBe('crystallize')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/lifecycle.test.ts`
Expected: FAIL — cannot resolve `./lifecycle`.

- [ ] **Step 3: Implement lifecycle.ts**

Create `src/aether/domain/engine/lifecycle.ts`:

```ts
// 6-verb lifecycle mapping the real agent-tree: thở(idle) → vươn nhánh(think) →
// phân bào(spawn) → node/flow(work) → hút(absorb) → kết tinh(crystallize→modal).
export const LIFECYCLE_PHASES = ['breathe', 'reach', 'mitosis', 'flow', 'inhale', 'crystallize'] as const

export type LifecyclePhase = (typeof LIFECYCLE_PHASES)[number]

export type LifecycleEvent = 'think' | 'spawn' | 'work' | 'absorb' | 'crystallize' | 'reset'

const NEXT: Record<LifecyclePhase, Partial<Record<LifecycleEvent, LifecyclePhase>>> = {
  breathe: { think: 'reach' },
  reach: { spawn: 'mitosis', work: 'flow' },
  mitosis: { work: 'flow' },
  flow: { absorb: 'inhale' },
  inhale: { crystallize: 'crystallize' },
  crystallize: {},
}

export function lifecycleReducer(phase: LifecyclePhase, event: LifecycleEvent): LifecyclePhase {
  if (event === 'reset') return 'breathe'
  return NEXT[phase][event] ?? phase
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/lifecycle.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/domain/engine/lifecycle.ts src/aether/domain/engine/lifecycle.test.ts
git commit -m "feat(aether): 6-verb lifecycle state machine (SP-4 #0)"
```

---

### Task 15: Constellation + summon layout (pure logic)

**Files:**
- Create: `src/aether/domain/engine/layout.ts`
- Test: `src/aether/domain/engine/layout.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export interface Point { x: number; y: number }`
  - `export function constellationLayout(count: number, radius?: number): Point[]` — evenly-spaced radial points starting at top (−π/2), clockwise.
  - `export function summonLayout(count: number, radius?: number): Point[]` — tighter ring for the summon overlay (default radius 0.6).

- [ ] **Step 1: Write the failing test**

Create `src/aether/domain/engine/layout.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { constellationLayout, summonLayout } from './layout'

describe('constellationLayout', () => {
  it('returns [] for non-positive counts', () => {
    expect(constellationLayout(0)).toEqual([])
    expect(constellationLayout(-3)).toEqual([])
  })
  it('places `count` points on the circle of the given radius', () => {
    const pts = constellationLayout(5, 2)
    expect(pts).toHaveLength(5)
    for (const p of pts) {
      expect(Math.hypot(p.x, p.y)).toBeCloseTo(2, 5)
    }
  })
  it('starts at the top (−π/2) and is deterministic', () => {
    const [first] = constellationLayout(4, 1)
    expect(first.x).toBeCloseTo(0, 5)
    expect(first.y).toBeCloseTo(-1, 5)
    expect(constellationLayout(4, 1)).toEqual(constellationLayout(4, 1))
  })
  it('produces distinct points (no overlap)', () => {
    const keys = constellationLayout(8, 1).map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`)
    expect(new Set(keys).size).toBe(8)
  })
})

describe('summonLayout', () => {
  it('defaults to a tighter ring than the constellation', () => {
    const pts = summonLayout(3)
    expect(Math.hypot(pts[0].x, pts[0].y)).toBeCloseTo(0.6, 5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/layout.test.ts`
Expected: FAIL — cannot resolve `./layout`.

- [ ] **Step 3: Implement layout.ts**

Create `src/aether/domain/engine/layout.ts`:

```ts
export interface Point {
  x: number
  y: number
}

// Radial constellation: evenly-spaced points starting at the top, going clockwise.
// Deterministic (no RNG) so layouts are stable across renders + testable.
export function constellationLayout(count: number, radius = 1): Point[] {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius }
  })
}

// Summon overlay uses the same radial distribution but tighter (grows from glyph).
export function summonLayout(count: number, radius = 0.6): Point[] {
  return constellationLayout(count, radius)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/layout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/domain/engine/layout.ts src/aether/domain/engine/layout.test.ts
git commit -m "feat(aether): constellation + summon radial layout (SP-4 #0)"
```

---

### Task 16: Demo script — the "HSG" scene (pure logic)

**Files:**
- Create: `src/aether/domain/engine/demo-script.ts`
- Test: `src/aether/domain/engine/demo-script.test.ts`

**Interfaces:**
- Consumes: `constellationLayout` (Task 15); `createGraph`, `GraphSpec`, `NodeSpec` (Task 13); `lifecycleReducer`, `LifecyclePhase`, `LifecycleEvent` (Task 14).
- Produces:
  - `export interface ScriptStep { atMs: number; event: LifecycleEvent }`
  - `export const HSG_SCRIPT: ScriptStep[]`
  - `export const HSG_TOTAL_MS = 10000`
  - `export const HSG_TARGETS: string[]` (5 roster labels)
  - `export function phaseAt(elapsedMs: number, script?: ScriptStep[]): LifecyclePhase`
  - `export function hsgStandbyGraph(): GraphSpec` — core orb + 5 constellation nodes + 5 links.
  - `export function hsgFrame(elapsedMs: number): GraphSpec` — standby graph with `phase = phaseAt(elapsedMs)`.

- [ ] **Step 1: Write the failing test**

Create `src/aether/domain/engine/demo-script.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { hsgFrame, hsgStandbyGraph, HSG_TARGETS, phaseAt } from './demo-script'

describe('HSG demo script', () => {
  it('progresses through the 6 verbs at the scripted timestamps', () => {
    expect(phaseAt(0)).toBe('breathe')
    expect(phaseAt(1500)).toBe('reach')
    expect(phaseAt(3000)).toBe('mitosis')
    expect(phaseAt(4500)).toBe('flow')
    expect(phaseAt(7000)).toBe('inhale')
    expect(phaseAt(8500)).toBe('crystallize')
  })
  it('builds a standby constellation: 1 core orb + N nodes + N links', () => {
    const g = hsgStandbyGraph()
    expect(g.orbs).toHaveLength(1)
    expect(g.orbs[0].kind).toBe('core')
    expect(g.nodes).toHaveLength(HSG_TARGETS.length)
    expect(g.links).toHaveLength(HSG_TARGETS.length)
    expect(g.nodes.map(n => n.label)).toEqual(HSG_TARGETS)
  })
  it('hsgFrame stamps the standby graph with the time-derived phase', () => {
    expect(hsgFrame(0).phase).toBe('breathe')
    expect(hsgFrame(4500).phase).toBe('flow')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/demo-script.test.ts`
Expected: FAIL — cannot resolve `./demo-script`.

- [ ] **Step 3: Implement demo-script.ts**

Create `src/aether/domain/engine/demo-script.ts`:

```ts
import { createGraph, type GraphSpec, type NodeSpec } from './graph-model'
import { constellationLayout } from './layout'
import { type LifecycleEvent, type LifecyclePhase, lifecycleReducer } from './lifecycle'

export interface ScriptStep {
  atMs: number
  event: LifecycleEvent
}

// Scripted "HSG" scene: standby → reach → mitosis → flow → inhale → crystallize.
export const HSG_SCRIPT: ScriptStep[] = [
  { atMs: 0, event: 'reset' },
  { atMs: 1500, event: 'think' },
  { atMs: 3000, event: 'spawn' },
  { atMs: 4500, event: 'work' },
  { atMs: 7000, event: 'absorb' },
  { atMs: 8500, event: 'crystallize' },
]

export const HSG_TOTAL_MS = 10000

export const HSG_TARGETS = ['Inbox', 'CRM', 'Dev', 'Vận hành', 'Content']

export function phaseAt(elapsedMs: number, script: ScriptStep[] = HSG_SCRIPT): LifecyclePhase {
  let phase: LifecyclePhase = 'breathe'
  for (const step of script) {
    if (elapsedMs >= step.atMs) phase = lifecycleReducer(phase, step.event)
  }
  return phase
}

export function hsgStandbyGraph(): GraphSpec {
  const pts = constellationLayout(HSG_TARGETS.length, 1)
  const nodes: NodeSpec[] = HSG_TARGETS.map((label, i) => ({
    id: `t${i}`,
    label,
    state: 'online',
    x: pts[i].x,
    y: pts[i].y,
  }))
  return createGraph({
    orbs: [{ id: 'core', kind: 'core', state: 'online', x: 0, y: 0 }],
    nodes,
    links: nodes.map(n => ({ id: `l-${n.id}`, from: 'core', to: n.id, flow: 0 })),
  })
}

export function hsgFrame(elapsedMs: number): GraphSpec {
  return { ...hsgStandbyGraph(), phase: phaseAt(elapsedMs) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/domain/engine/demo-script.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/domain/engine/demo-script.ts src/aether/domain/engine/demo-script.test.ts
git commit -m "feat(aether): scripted HSG demo scene for the living engine (SP-4 #0)"
```

---

### Task 17: Graph render helpers + R3F views

**Files:**
- Create: `src/aether/ui/motion/graph/graph-geometry.ts` (pure, tested)
- Test: `src/aether/ui/motion/graph/graph-geometry.test.ts`
- Create: `src/aether/ui/motion/graph/graph-view.tsx` (thin R3F view; verified manually)

**Interfaces:**
- Consumes: `GraphSpec`, `LinkSpec`, `NodeSpec`, `NodeState` (Task 13); `AETHER` colors (Task 1); `LivingOrbGL` (existing); `@react-three/fiber` / `three`.
- Produces:
  - `export function stateColor(state: NodeState): string`
  - `export function nodeScale(state: NodeState): number`
  - `export function linkPoints(link: LinkSpec, nodes: NodeSpec[], core?: {x:number;y:number}): { from: {x:number;y:number}; to: {x:number;y:number} } | null`
  - `export function GraphView(props: { spec: GraphSpec }): JSX.Element` — renders core orb (`LivingOrbGL`), node buds (instanced spheres), and link tendrils (line segments). Consumed by `AetherCanvas` (Task 20).

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/motion/graph/graph-geometry.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { AETHER } from '@/aether/ui/theme/tokens'
import type { NodeSpec } from '@/aether/domain/engine/graph-model'

import { linkPoints, nodeScale, stateColor } from './graph-geometry'

describe('graph render helpers', () => {
  it('maps node state to the shared state color', () => {
    expect(stateColor('online')).toBe(AETHER.stateOnline)
    expect(stateColor('busy')).toBe(AETHER.stateBusy)
    expect(stateColor('dormant')).toBe(AETHER.stateDormant)
  })
  it('scales busy > online > dormant buds', () => {
    expect(nodeScale('busy')).toBeGreaterThan(nodeScale('online'))
    expect(nodeScale('online')).toBeGreaterThan(nodeScale('dormant'))
  })
  it('resolves link endpoints, treating "core" as the origin', () => {
    const nodes: NodeSpec[] = [{ id: 'n1', label: 'X', state: 'online', x: 1, y: 2 }]
    const pts = linkPoints({ id: 'l', from: 'core', to: 'n1', flow: 0 }, nodes)
    expect(pts).toEqual({ from: { x: 0, y: 0 }, to: { x: 1, y: 2 } })
  })
  it('returns null when an endpoint is missing', () => {
    expect(linkPoints({ id: 'l', from: 'core', to: 'ghost', flow: 0 }, [])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/graph-geometry.test.ts`
Expected: FAIL — cannot resolve `./graph-geometry`.

- [ ] **Step 3: Implement graph-geometry.ts**

Create `src/aether/ui/motion/graph/graph-geometry.ts`:

```ts
import type { LinkSpec, NodeSpec, NodeState } from '@/aether/domain/engine/graph-model'
import { AETHER } from '@/aether/ui/theme/tokens'

export function stateColor(state: NodeState): string {
  if (state === 'busy') return AETHER.stateBusy
  if (state === 'dormant') return AETHER.stateDormant
  return AETHER.stateOnline
}

export function nodeScale(state: NodeState): number {
  if (state === 'busy') return 0.09
  if (state === 'dormant') return 0.05
  return 0.07
}

export function linkPoints(
  link: LinkSpec,
  nodes: NodeSpec[],
  core: { x: number; y: number } = { x: 0, y: 0 },
): { from: { x: number; y: number }; to: { x: number; y: number } } | null {
  const find = (id: string) => (id === 'core' ? core : nodes.find(n => n.id === id) ?? null)
  const a = find(link.from)
  const b = find(link.to)
  return a && b ? { from: { x: a.x, y: a.y }, to: { x: b.x, y: b.y } } : null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/graph-geometry.test.ts`
Expected: PASS.

- [ ] **Step 5: Implement the R3F view (no jsdom test — manual GL verify)**

Create `src/aether/ui/motion/graph/graph-view.tsx`:

```tsx
import { useMemo } from 'react'
import { BufferGeometry, Vector3 } from 'three'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { LivingOrbGL } from '@/aether/ui/motion/living-orb-gl'

import { linkPoints, nodeScale, stateColor } from './graph-geometry'

// Thin R3F view over a GraphSpec. The core orb reuses the SP-0 GLSL orb; nodes are
// emissive "bud" spheres; links are tendril line segments. Scale is small because
// AetherCanvas mounts this inside the shared shell Canvas group.
export function GraphView({ spec }: { spec: GraphSpec }) {
  const core = spec.orbs.find(o => o.kind === 'core')

  const linkGeoms = useMemo(() => {
    return spec.links
      .map(l => linkPoints(l, spec.nodes))
      .filter((p): p is NonNullable<typeof p> => p != null)
      .map(p => new BufferGeometry().setFromPoints([new Vector3(p.from.x, p.from.y, 0), new Vector3(p.to.x, p.to.y, 0)]))
  }, [spec.links, spec.nodes])

  return (
    <group>
      {core && (
        <group position={[core.x, core.y, 0]}>
          <LivingOrbGL size={0.28} state="thinking" />
        </group>
      )}
      {linkGeoms.map((geom, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <lineSegments key={i} geometry={geom}>
          <lineBasicMaterial color={stateColor('online')} transparent opacity={0.5} />
        </lineSegments>
      ))}
      {spec.nodes.map(n => (
        <mesh key={n.id} position={[n.x, n.y, 0]} scale={nodeScale(n.state)}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={stateColor(n.state)} />
        </mesh>
      ))}
    </group>
  )
}
```

> Visual polish (particle nucleus, halo, mitosis sub-orbs, flow-along-tendril, crystallize) is tuned manually against the `.superpowers/brainstorm/` mockups during Task 22's manual pass. This implementation is complete and renders a correct constellation; it is not a placeholder.

- [ ] **Step 6: Run the gate**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/graph-geometry.test.ts && npx tsc -p . --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/aether/ui/motion/graph/graph-geometry.ts src/aether/ui/motion/graph/graph-geometry.test.ts src/aether/ui/motion/graph/graph-view.tsx
git commit -m "feat(aether): graph render helpers + R3F constellation view (SP-4 #0)"
```

---

### Task 18: SDF labels via troika-three-text

**Files:**
- Modify: `apps/desktop/package.json` (add `troika-three-text`)
- Create: `src/aether/ui/motion/graph/labels.tsx`
- Test: `src/aether/ui/motion/graph/labels.test.ts`

**Interfaces:**
- Consumes: `NodeSpec` (Task 13); `troika-three-text` `Text` class.
- Produces:
  - `export function labelText(n: NodeSpec): string` (pure; tested)
  - `export function GraphLabels(props: { nodes: NodeSpec[] }): JSX.Element` — one troika `Text` per node via `<primitive>` (manual GL verify).

- [ ] **Step 1: Add the dependency**

In `apps/desktop/package.json`, add to `dependencies` (keep alphabetical-ish; place after `"three": "^0.180.0",`):

```json
    "troika-three-text": "^0.52.4",
```

Then install from the **repo root** (this is a workspace; see existing `scripts/assert-root-install.cjs`):

Run: `npm install`
Expected: lockfile updated; `troika-three-text` resolved. Verify it dedupes `three` against the existing `^0.180.0` (no second copy):
Run: `npm ls three`
Expected: a single `three@0.180.x` resolved.

- [ ] **Step 2: Write the failing test**

Create `src/aether/ui/motion/graph/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'

import { labelText } from './labels'

describe('labelText', () => {
  it('returns the node label verbatim', () => {
    const n: NodeSpec = { id: 'n1', label: 'Vận hành', state: 'online', x: 0, y: 0 }
    expect(labelText(n)).toBe('Vận hành')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/labels.test.ts`
Expected: FAIL — cannot resolve `./labels`.

- [ ] **Step 4: Implement labels.tsx**

Create `src/aether/ui/motion/graph/labels.tsx`:

```tsx
import { useEffect, useMemo } from 'react'
import { Text } from 'troika-three-text'

import type { NodeSpec } from '@/aether/domain/engine/graph-model'
import { AETHER } from '@/aether/ui/theme/tokens'

export function labelText(n: NodeSpec): string {
  return n.label
}

function NodeLabel({ node }: { node: NodeSpec }) {
  const text = useMemo(() => new Text(), [])
  useEffect(() => {
    text.text = labelText(node)
    text.fontSize = 0.08
    text.color = AETHER.ink
    text.anchorX = 'center'
    text.anchorY = 'middle'
    text.position.set(node.x, node.y - 0.16, 0)
    text.sync()
    return () => text.dispose()
  }, [text, node])
  return <primitive object={text} />
}

// SDF text in GL so labels stay crisp. One troika Text per node.
export function GraphLabels({ nodes }: { nodes: NodeSpec[] }) {
  return (
    <group>
      {nodes.map(n => (
        <NodeLabel key={n.id} node={n} />
      ))}
    </group>
  )
}
```

- [ ] **Step 5: Run test + typecheck**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/labels.test.ts && npx tsc -p . --noEmit`
Expected: PASS. If tsc cannot find types for `troika-three-text`, it ships its own types; if not, add `// @ts-expect-error troika ships runtime-only types` above the import and re-run (only if needed).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/package.json package-lock.json src/aether/ui/motion/graph/labels.tsx src/aether/ui/motion/graph/labels.test.ts
git commit -m "feat(aether): SDF graph labels via troika-three-text (SP-4 #0)"
```

> If the workspace lockfile lives at repo root, adjust the `git add` path to the actual lockfile (`../../package-lock.json` from `apps/desktop`, or run `git add` from the repo root for that one file).

---

### Task 19: Static fallback (DOM/SVG) for GPU-off / reduced-motion

**Files:**
- Create: `src/aether/ui/motion/graph/fallback.tsx`
- Test: `src/aether/ui/motion/graph/fallback.test.tsx`

**Interfaces:**
- Consumes: `GraphSpec` (Task 13); `LivingOrb` CSS orb (existing); `stateColor` (Task 17).
- Produces: `export function GraphFallback(props: { spec: GraphSpec }): JSX.Element` — an SVG constellation (lines + node dots) with a centered CSS `LivingOrb`; `data-testid="ae-graph-fallback"`. This is the always-present accessible path when the WebGL gate is closed (hard-rule SP-0).

- [ ] **Step 1: Write the failing test**

Create `src/aether/ui/motion/graph/fallback.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { hsgStandbyGraph } from '@/aether/domain/engine/demo-script'

import { GraphFallback } from './fallback'

afterEach(cleanup)

describe('GraphFallback', () => {
  it('renders one SVG node dot per graph node + the centered living orb', () => {
    render(<GraphFallback spec={hsgStandbyGraph()} />)
    const root = screen.getByTestId('ae-graph-fallback')
    expect(root.querySelectorAll('[data-ae-node]')).toHaveLength(5)
    expect(root.querySelector('[role="status"]')).toBeTruthy() // CSS LivingOrb
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/fallback.test.tsx`
Expected: FAIL — cannot resolve `./fallback`.

- [ ] **Step 3: Implement fallback.tsx**

Create `src/aether/ui/motion/graph/fallback.tsx`:

```tsx
import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { LivingOrb } from '@/aether/ui/orb/living-orb'

import { linkPoints, stateColor } from './graph-geometry'

// Static constellation for the GPU-off / reduced-motion / probe-fail path.
// Maps the [-1,1] model space into a 0..100 SVG viewBox (center 50,50).
const toView = (v: number) => 50 + v * 38

export function GraphFallback({ spec }: { spec: GraphSpec }) {
  return (
    <div className="relative grid h-full w-full place-items-center" data-testid="ae-graph-fallback">
      <svg className="absolute inset-0 h-full w-full" fill="none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {spec.links.map(l => {
          const p = linkPoints(l, spec.nodes)
          if (!p) return null
          return (
            <line
              key={l.id}
              stroke="var(--ae-line)"
              strokeWidth={0.6}
              x1={toView(p.from.x)}
              x2={toView(p.to.x)}
              y1={toView(p.from.y)}
              y2={toView(p.to.y)}
            />
          )
        })}
        {spec.nodes.map(n => (
          <circle
            cx={toView(n.x)}
            cy={toView(n.y)}
            data-ae-node
            fill={stateColor(n.state)}
            key={n.id}
            r={n.state === 'dormant' ? 1.4 : 2}
          />
        ))}
      </svg>
      <LivingOrb size={120} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/graph/fallback.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/aether/ui/motion/graph/fallback.tsx src/aether/ui/motion/graph/fallback.test.tsx
git commit -m "feat(aether): static DOM/SVG constellation fallback (SP-4 #0)"
```

---

### Task 20: Graph store + AetherCanvas extension (no new Canvas)

**Files:**
- Create: `src/aether/domain/motion/graph-store.ts`
- Test: `src/aether/domain/motion/graph-store.test.ts`
- Modify: `src/aether/ui/motion/aether-canvas.tsx`
- Modify: `src/aether/ui/motion/aether-canvas.test.tsx`

**Interfaces:**
- Consumes: `GraphSpec` (Task 13); `GraphView` (Task 17); `GraphLabels` (Task 18).
- Produces:
  - `export const $graphSpec = atom<GraphSpec | null>(null)`, `export function setGraphSpec(s: GraphSpec | null): void`, `export function clearGraphSpec(): void`.
  - `export function shouldRenderGraph(spec: GraphSpec | null): boolean` (in `aether-canvas.tsx`).
  - `AetherCanvas` renders `<GraphView>` + `<GraphLabels>` inside the existing Canvas group when `$graphSpec` is set (gate already governs whether the Canvas mounts at all).

- [ ] **Step 1: Write the failing graph-store test**

Create `src/aether/domain/motion/graph-store.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import { hsgStandbyGraph } from '@/aether/domain/engine/demo-script'

import { $graphSpec, clearGraphSpec, setGraphSpec } from './graph-store'

describe('graph-store', () => {
  it('sets and clears the active graph spec', () => {
    expect($graphSpec.get()).toBeNull()
    setGraphSpec(hsgStandbyGraph())
    expect($graphSpec.get()?.nodes).toHaveLength(5)
    clearGraphSpec()
    expect($graphSpec.get()).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/motion/graph-store.test.ts`
Expected: FAIL — cannot resolve `./graph-store`.

- [ ] **Step 3: Implement graph-store.ts**

Create `src/aether/domain/motion/graph-store.ts`:

```ts
import { atom } from 'nanostores'

import type { GraphSpec } from '@/aether/domain/engine/graph-model'

// The graph the shared AetherCanvas should render (constellation/summon). null =
// ambient orb only. Data-driven so non-chat screens stay prompt-cache safe.
export const $graphSpec = atom<GraphSpec | null>(null)

export function setGraphSpec(s: GraphSpec | null): void { $graphSpec.set(s) }
export function clearGraphSpec(): void { $graphSpec.set(null) }
```

- [ ] **Step 4: Add `shouldRenderGraph` test**

Append to `src/aether/ui/motion/aether-canvas.test.tsx` inside the existing `describe`:

```tsx
  it('renders the graph only when a spec is present', async () => {
    const { shouldRenderGraph } = await import('./aether-canvas')
    const { hsgStandbyGraph } = await import('@/aether/domain/engine/demo-script')
    expect(shouldRenderGraph(null)).toBe(false)
    expect(shouldRenderGraph(hsgStandbyGraph())).toBe(true)
  })
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/aether-canvas.test.tsx -t "renders the graph only"`
Expected: FAIL — `shouldRenderGraph` not exported.

- [ ] **Step 6: Extend aether-canvas.tsx**

In `src/aether/ui/motion/aether-canvas.tsx`:

- Add imports:

```tsx
import { $graphSpec } from '@/aether/domain/motion/graph-store'
import type { GraphSpec } from '@/aether/domain/engine/graph-model'
import { GraphView } from './graph/graph-view'
import { GraphLabels } from './graph/labels'
```

- Add the pure predicate near `shouldRenderFrame`:

```tsx
export function shouldRenderGraph(spec: GraphSpec | null): boolean {
  return spec != null && (spec.orbs.length > 0 || spec.nodes.length > 0)
}
```

- Inside `AetherCanvas`, read the spec (with the other `useStore` call):

```tsx
  const graph = useStore($graphSpec)
```

- Render the graph inside the existing `<Canvas>`, after the ambient orb `<group>`:

```tsx
        {shouldRenderGraph(graph) && graph && (
          <group position={[0, 0, 1.5]}>
            <GraphView spec={graph} />
            <GraphLabels nodes={graph.nodes} />
          </group>
        )}
```

- [ ] **Step 7: Run the gate**

Run: `npx vitest run --environment jsdom src/aether/ui/motion/aether-canvas.test.tsx src/aether/domain/motion/graph-store.test.ts && npx tsc -p . --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/aether/domain/motion/graph-store.ts src/aether/domain/motion/graph-store.test.ts src/aether/ui/motion/aether-canvas.tsx src/aether/ui/motion/aether-canvas.test.tsx
git commit -m "feat(aether): graph store + AetherCanvas graph rendering (SP-4 #0)"
```

---

## Phase 4 — Integration, playground & docs

### Task 21: Playground route — exercise the engine end-to-end

**Files:**
- Modify: `src/app/routes.ts` (add `PLAYGROUND_ROUTE` + register so it is a RESERVED_PATH)
- Create: `src/aether/ui/screens/playground-screen.tsx`
- Test: `src/aether/ui/screens/playground-screen.test.tsx`
- Modify: `src/aether/ui/shell/aether-shell.tsx` (route the screen)

**Interfaces:**
- Consumes: `hsgFrame`, `hsgStandbyGraph`, `HSG_TOTAL_MS` (Task 16); `$graphSpec`/`setGraphSpec`/`clearGraphSpec` (Task 20); `GraphFallback` (Task 19); `useMotionEnabled` (existing).
- Produces: `export function PlaygroundScreen(): JSX.Element`; `PLAYGROUND_ROUTE = '/playground'`. DoD #3 (engine + fallback + playground running the scripted scene) is satisfied here.

- [ ] **Step 1: Register the route**

In `src/app/routes.ts`:
- Add after `export const VOICE_ROUTE = '/voice'` (line 18): `export const PLAYGROUND_ROUTE = '/playground'`
- Add `| 'playground'` to the `AppView` union and to the `AppRouteId` union.
- Add to `APP_ROUTES` (after the `voice` entry): `{ id: 'playground', path: PLAYGROUND_ROUTE, view: 'playground' },`

> This puts `/playground` in `RESERVED_PATHS` so `routeSessionId()` won't treat it as a chat session id (avoids the 404 loop the existing comment warns about).

- [ ] **Step 2: Write the failing test**

Create `src/aether/ui/screens/playground-screen.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $graphSpec } from '@/aether/domain/motion/graph-store'

import { PlaygroundScreen } from './playground-screen'

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('aetherDesktop', { getRemoteDisplayReason: vi.fn().mockResolvedValue(null) })
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); $graphSpec.set(null) })

describe('PlaygroundScreen', () => {
  it('seeds the graph store on mount and clears it on unmount', () => {
    const { unmount } = render(<PlaygroundScreen />)
    expect($graphSpec.get()?.nodes).toHaveLength(5)
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
  it('shows the static fallback when the WebGL gate is closed (jsdom has no GL)', () => {
    render(<PlaygroundScreen />)
    expect(screen.getByTestId('ae-graph-fallback')).toBeTruthy()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/playground-screen.test.tsx`
Expected: FAIL — cannot resolve `./playground-screen`.

- [ ] **Step 4: Implement playground-screen.tsx**

Create `src/aether/ui/screens/playground-screen.tsx`:

```tsx
import { useStore } from '@nanostores/react'
import { useEffect, useRef } from 'react'

import { hsgFrame, hsgStandbyGraph, HSG_TOTAL_MS } from '@/aether/domain/engine/demo-script'
import { $graphSpec, clearGraphSpec, setGraphSpec } from '@/aether/domain/motion/graph-store'
import { GraphFallback } from '@/aether/ui/motion/graph/fallback'
import { useMotionEnabled } from '@/aether/ui/motion/use-motion-enabled'

// Dev route that exercises the living engine: feeds the scripted HSG scene into the
// shared graph store. When the WebGL gate is open the shared AetherCanvas renders it;
// when closed we render the static fallback inline.
export function PlaygroundScreen() {
  const motionEnabled = useMotionEnabled()
  const spec = useStore($graphSpec)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    setGraphSpec(hsgStandbyGraph())
    return () => clearGraphSpec()
  }, [])

  useEffect(() => {
    if (!motionEnabled) return
    let raf = 0
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t
      setGraphSpec(hsgFrame((t - startRef.current) % HSG_TOTAL_MS))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [motionEnabled])

  return (
    <div className="ae-screen-bare flex h-full flex-col gap-3">
      <h2 className="text-[length:var(--ae-text-md)] font-semibold">Playground — Sinh thể sống</h2>
      <div className="text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)]">
        {motionEnabled
          ? 'WebGL: chòm sao standby + vòng đời 6-verb (cảnh HSG).'
          : 'GPU-off / reduced-motion → bản tĩnh CSS/SVG.'}
      </div>
      <div className="relative min-h-0 flex-1">{!motionEnabled && spec && <GraphFallback spec={spec} />}</div>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/playground-screen.test.tsx`
Expected: PASS.

- [ ] **Step 6: Route the screen in the shell**

In `src/aether/ui/shell/aether-shell.tsx`:
- Add import: `import { PlaygroundScreen } from '@/aether/ui/screens/playground-screen'`
- Add `PLAYGROUND_ROUTE` to the route-consts import from `@/app/routes`.
- Add a route inside `<Routes>` (before the catch-all `*`): `<Route element={<PlaygroundScreen />} path={PLAYGROUND_ROUTE.slice(1)} />`

- [ ] **Step 7: Run the full gate**

Run: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/app/routes.ts src/aether/ui/screens/playground-screen.tsx src/aether/ui/screens/playground-screen.test.tsx src/aether/ui/shell/aether-shell.tsx
git commit -m "feat(aether): /playground route exercising the living engine + fallback (SP-4 #0)"
```

---

### Task 22: DESIGN.md north-star + final verification gate

**Files:**
- Modify: `apps/desktop/DESIGN.md`

**Interfaces:**
- Consumes: everything built above.
- Produces: documented north-star + token/engine bridge points; a clean full-suite gate; manual-test sign-off.

- [ ] **Step 1: Document the north-star + new tokens + engine bridge**

In `apps/desktop/DESIGN.md`, append a new section at the end:

```markdown
## AETHER living-organism north-star (SP-4 #0)

The whole app is **one living organism** — the Living Orb visualizes the agentic
machine at three zoom levels of the *same* entity:

- **Glyph** (nav-rail, every screen) — always breathing, carries vital-state, is
  the Home button. Rendered by the gated CSS `LivingOrb` (no second Canvas).
- **Constellation** (Home / `/hud`) — core orb radiating tendrils to targets.
- **Summon overlay** (live task) — an ephemeral graph that grows from the glyph
  over a blurred copy of the current screen, then collapses back.

**Presence model = "C · Triệu hồi":** idle glyph → graph blooms into the overlay
host → collapses to glyph. Morphology: organic orb + particle nucleus + halo;
sub-orbs via mitosis (teal `--ae-suborb`); nodes as glowing buds; links as
flowing tendrils. **6-verb motion grammar:** breathe → reach → mitosis → flow →
inhale → crystallize (durations in `--ae-mo-*` / `AETHER_MOTION`).

**Shared state colors:** online = azure (`--ae-state-online`), busy = amber
energy (`--ae-state-busy`/`--ae-energy`, distinct from `--ae-warn`), dormant =
slate dashed (`--ae-state-dormant`).

**New token groups** (CSS in `aether.css`, TS mirror in `tokens.ts`,
pinned by `tokens.test.ts`): energy/node-state/sinh-thể colors, `AETHER_TYPE`
(typography), `AETHER_MOTION` (6-verb durations + easing). Expanded nav width is
`GEOMETRY.nav.widthExpanded` (172), pinned in `geometry.test.ts`.

**Living-engine bridge points:**
- Logic core (`src/aether/domain/engine/`: `graph-model`, `lifecycle`, `layout`,
  `demo-script`) is pure + jsdom-tested.
- View layer (`src/aether/ui/motion/graph/`) is thin R3F mounted inside the **single
  shared** `<AetherCanvas>` — no new Canvas — gated by `useMotionEnabled()`.
- `$graphSpec` (`domain/motion/graph-store.ts`) is the data contract; non-chat
  screens feed it scripted/derived data only (prompt-cache safe). Chat (#3) wires
  real agent/tool events into the same `GraphSpec`.
- **Fallback (hard-rule):** reduced-motion OR GPU-off OR webgl-probe-fail ⇒ no
  Canvas ⇒ `GraphFallback` (DOM/SVG) + CSS orb. `troika-three-text` provides SDF
  labels in GL (deduped against `three@0.180`).
```

- [ ] **Step 2: Run the FULL aether suite + typecheck (the spec §2 gate)**

Run: `npx vitest run --environment jsdom src/aether && npx tsc -p . --noEmit`
Expected: PASS — entire `src/aether` test suite green, tsc clean.

- [ ] **Step 3: Lint the touched tree**

Run: `npx eslint src/aether`
Expected: no errors (fix any import-order/perfectionist issues the repo's eslint config flags).

- [ ] **Step 4: Manual verification (real machine — cannot run in jsdom)**

Run: `npm run dev` (from `apps/desktop`), then exercise:
- [ ] Light mode reads as designed; nav-rail expands 62↔172 on hover with group headers; the glyph orb breathes and navigates Home; exactly one avatar shows the active-profile initial (no "B"); ⌘K bar opens the palette; vital-sign shows azure online / amber retrying / red-flat down.
- [ ] Navigate to `/playground`: WebGL constellation renders the standby roster and steps through the 6-verb HSG scene; labels are crisp.
- [ ] Force the fallback (set OS reduced-motion, or run over remote display): no white Canvas — the static SVG constellation + CSS orb render instead.
- [ ] macOS traffic-light buttons do **not** overlap the glyph (SP-0 regression).
- [ ] Disconnect the gateway: the non-dismissable connection overlay appears via the host (no old ad-hoc overlay), vital-sign goes red-flat.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/DESIGN.md
git commit -m "docs(aether): living-organism north-star + token/engine bridge points (SP-4 #0)"
```

---

## Self-Review (performed against the spec)

**1. Spec coverage**

| Spec section | Covered by |
|---|---|
| §3 north-star (text) | Task 22 (DESIGN.md) |
| §4 tokens: typography/energy/node-state/sinh-thể/motion | Tasks 1, 2 |
| §4 iconography (consistent set) | Task 3 |
| §4 kill hardcode (`#06283c`, gradients, dup avatar "B") | Tasks 4 (Avatar), 7 (nav-rail), 8 (top-bar) |
| §4 geometry pins (CSS==TS) | Task 2 (geometry/test) |
| §5.1 nav-rail expand + groups + glyph-home + badge/dot | Tasks 6, 7 |
| §5.2 top-bar: title map, ⌘K, vital-sign, 1 avatar | Tasks 8, 11 |
| §5.3 overlay/modal host + OVERLAY_VIEWS sync | Tasks 9, 11 (+ discrepancy #1 note) |
| §5.4 page-transition | Task 12 |
| §5.5 `/command-center` cleanup | Task 10 (safe subset; discrepancy #1) |
| §6 engine logic core (model/lifecycle/layout/demo) | Tasks 13–16 |
| §6 R3F views + labels (troika) + fallback | Tasks 17, 18, 19 |
| §6 extend shared Canvas (no new Canvas) + data contract | Task 20 |
| §6 glyph orb in rail (DoD #4) | Task 7 |
| §7 DoD #3 playground scripted scene | Task 21 |
| §9 testing gate every slice | every task's final gate step |

**2. Placeholder scan:** No "TBD"/"add error handling"/"similar to Task N". The R3F view (Task 17) and labels (Task 18) ship complete, runnable code; visual polish is an explicit manual tuning pass (Task 22 §4), not a code placeholder.

**3. Type consistency:** `GraphSpec`/`NodeSpec`/`LinkSpec`/`OrbSpec`/`NodeState` (Task 13) used identically in Tasks 16, 17, 19, 20. `LifecyclePhase`/`LifecycleEvent` (Task 14) used in 13, 16. `IconName` (Task 3) used in 6. `NavItem`/`NavGroupId` (Task 6) used in 7. `$graphSpec` (Task 20) used in 21. `vitalStatus` (Task 5) used in 8/11 indirectly via `useConnectionStatus`. Build-order caveat called out explicitly: **Task 14 before Task 13.**

**Known non-blocking notes:**
- The "19 destinations" figure resolves to 16 (discrepancy #2).
- `COMMAND_CENTER_ROUTE` const is intentionally retained (discrepancy #1).
- jsdom cannot mount R3F/GL; per repo convention, GL mount/dispose is verified manually (Task 22 §4) while pure helpers carry the automated coverage.
