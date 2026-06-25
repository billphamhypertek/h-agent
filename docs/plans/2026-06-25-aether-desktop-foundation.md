# AETHER Desktop — First Slice (Foundation + Boot · HUD · Chat · Brief) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first slice of the AETHER desktop redesign — a cinematic navy/azure shell with four working screens (Boot Sequence, Command-Center HUD, Chat, Morning Brief) plus a cron-driven Morning Briefing data layer — by reusing the existing Hermes runtime and replacing only the visual shell.

**Architecture:** AETHER is a **hybrid** rewrite. We **reuse, untouched,** the proven runtime inside `apps/desktop/src/app/desktop-controller.tsx` — gateway boot (`useGatewayBoot`), request wrapper (`useGatewayRequest`), message streaming + tool-call handling (`useMessageStream`), the `@assistant-ui` chat (`ChatView`/`Thread`/`ChatBar`), the theme token system (`src/themes`), and the REST helpers (`src/hermes.ts`). We **replace** exactly one thing: the controller's render block (`return (<AppShell>…</AppShell>)`, [desktop-controller.tsx:1188-1262](../../../apps/desktop/src/app/desktop-controller.tsx#L1188-L1262)) is swapped for a new `<AetherShell>` that owns the nav rail, top bar, Boot overlay, "Depth" page transitions, and the AETHER route table. The chat element (`chatView`, [desktop-controller.tsx:1091-1123](../../../apps/desktop/src/app/desktop-controller.tsx#L1091-L1123)) is passed into `AetherShell` and rendered restyled (token-driven) — its streaming logic is never rewritten. New screens (Boot/HUD/Brief), the Living Orb, the AETHER theme preset, and the briefing data layer live in a new isolated subtree `apps/desktop/src/aether/`. The Morning Briefing reads the latest cron run via the **existing** REST surface (no Python web-server changes); a new `morning-briefing-aggregator` skill produces the JSON artifact.

**Tech Stack:** React 19, TypeScript 6, Vite 8, react-router-dom 7 (HashRouter), nanostores + `@nanostores/react`, Tailwind CSS 4 (CSS-var token system, `@theme`/`@layer`), `@assistant-ui/react`, Vitest 4 + jsdom + `@testing-library/react`. Backend skill: Hermes SKILL.md format. No new runtime dependencies are introduced in this slice (Three.js / WebGL ambient motion is explicitly a later sub-project).

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from the spec and project memory — do not paraphrase or invent alternatives.

- **Brand core color:** `#07397d` (deep navy, HSL 215°). Primary button / brand surface / wordmark seed. Dark-derived backgrounds: `#020c1d` (950), `#03152f` (900), panels `#082046` / `#0a2a5c`.
- **Accent glow (holographic, because `#07397d` is too dark to self-glow on dark):** azure `#4aa3ff`; light `#8fc0ff`; bright `#1659b5`.
- **Text:** ink `#e9f1ff`; dim `#9fb6d6`. Hairline border: `rgba(120,180,255,.16)`.
- **Semantic:** ok `#3DE7A0` · warn `#FFB020` · error `#ff5d6c`.
- **No hardcoded colors outside this system.** Build CSS tokens; change once, inherit everywhere. Screen components reference AETHER CSS classes/vars, never raw hex.
- **Typography:** Orbitron (wordmark + large titles, uppercase, letter-spacing ~.14–.22em) · Be Vietnam Pro (body / UI / headings) · JetBrains Mono (data / numbers / timestamps / logs). JetBrains Mono is already bundled; Orbitron + Be Vietnam Pro load via the theme preset's `fontUrl` (Google Fonts), matching the existing font-injection mechanism in [themes/context.tsx](../../../apps/desktop/src/themes/context.tsx).
- **Localization (hard rule):** UI in Vietnamese. **NEVER translate "Agent" → "Đại lý".** Keep "Agent". "Trợ lý" is acceptable only in descriptive prose. Displayed platform name: **"HYPERTEK - AGENT PLATFORM"**.
- **App shell:** left **nav rail** (~62px: brand glyph + nav icons + active glow) + **top bar** (title + mono date/time + avatar). A **small online dot** (green, pulsing) sits on the brand glyph corner — **never** a large status pill.
- **Prompt-cache safety (hard):** HUD and Brief screens **must NOT** subscribe to `message.delta` and **must NOT** poll the live conversation. They read only: the cron artifact (via REST), non-conversation gateway events, and REST `/status`. Never re-trigger the LLM.
- **Motion:** Respect `prefers-reduced-motion` everywhere (degrade to plain fade or none). Nav active-indicator slides with spring `cubic-bezier(.5,.05,.1,1)` ~0.44s. Page transition "Depth" = `scale(1.04→1)` + `blur(6px→0)` + fade ~0.5s `cubic-bezier(.4,0,.2,1)`. Implement via CSS; JS only toggles classes / sets the indicator transform.
- **Reuse mandate:** Do not rewrite streaming, tool-call, terminal, markdown, command-palette, gateway, or theme-plumbing logic. Restyle via tokens/classNames only.
- **Out of slice (do NOT build here):** Dev cockpit, Inbox+CRM, Content, full Operations, Agents, Skills, Memory, Cron UI, full Command Palette, full Settings, Voice, Onboarding, WebGL/Three.js ambient motion, multi-tenant/billing/auth.

---

## File Structure

**New subtree** `apps/desktop/src/aether/` (one responsibility per file; files that change together live together):

```
apps/desktop/src/aether/
  index.ts                         barrel exports
  ui/
    theme/
      tokens.ts                    palette constants (navy/azure/semantic) — JS source of truth
      aether.css                   AETHER CSS vars + component/utility classes
                                   (glass slab, grid-floor, bloom, vignette, orb,
                                    nav indicator, gauges, command bar, Depth transition)
    orb/
      living-orb.tsx               Living Orb (CSS-driven; state + size props)
      living-orb.test.tsx
    shell/
      nav-items.ts                 nav model (id, route, vi-label, icon)
      use-nav-indicator.ts         sliding active-indicator transform math
      nav-rail.tsx                 left rail: glyph + online dot + items + indicator + avatar
      nav-rail.test.tsx
      top-bar.tsx                  title + mono date/time + avatar
      top-bar.test.tsx
      page-transition.tsx          "Depth" transition wrapper (reduced-motion aware)
      aether-shell.tsx             boot gate + rail + top bar + main + AETHER routes
      aether-shell.test.tsx
    components/
      glass-slab.tsx               reusable glass card surface
      command-bar.tsx              mic + placeholder + ⌘K hint
      micro-viz.tsx                gauge / bar / sparkline primitives
      micro-viz.test.tsx
    screens/
      stub-screen.tsx              deferred-route placeholder
      boot-sequence.tsx            Boot screen
      boot-sequence.test.tsx
      command-center.tsx           HUD screen
      command-center.test.tsx
      morning-brief.tsx            Brief screen
      morning-brief.test.tsx
      chat-screen.tsx              thin AETHER frame around injected chatView + thinking orb
  domain/
    boot/
      boot-store.ts                nanostores: $bootProgress, $bootDone
      use-boot-progress.ts         subscribe window.hermesDesktop boot progress → store
      use-boot-progress.test.ts
    connection/
      use-connection-status.ts     derive 'online' | 'paused' from gateway state
    briefing/
      briefing-schema.ts           Briefing TS types + runtime guard isBriefing()
      parse-briefing.ts            extract JSON artifact from a run's final message
      parse-briefing.test.ts
      read-briefing.ts             find job → latest run → messages → parse (DI for tests)
      read-briefing.test.ts
      briefing-store.ts            nanostores: $briefing, $briefingStatus, loadBriefing()
      fixtures/briefing.sample.json
```

**Modified files:**

```
apps/desktop/src/themes/presets.ts         add `aether` preset + register in BUILTIN_THEMES
apps/desktop/src/styles.css                 @import './aether/ui/theme/aether.css'
apps/desktop/src/app/routes.ts              add HUD_ROUTE, BRIEF_ROUTE constants
apps/desktop/src/app/desktop-controller.tsx replace return JSX (1188-1262) → <AetherShell …>
```

**New backend artifact:**

```
skills/productivity/morning-briefing-aggregator/
  SKILL.md                         the cron skill (emits JSON artifact)
  references/briefing-schema.json  the artifact contract (mirrors briefing-schema.ts)
```

---

## Reference Interfaces (discovered in the codebase — used across tasks)

These are real signatures the tasks depend on. Do not redefine them.

```ts
// apps/desktop/src/global.d.ts — window.hermesDesktop (subset used here)
getBootProgress(): Promise<DesktopBootProgress>
onBootProgress(cb: (p: DesktopBootProgress) => void): () => void
api<T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }): Promise<T>
// DesktopBootProgress = { error: string|null; fakeMode: boolean; message: string;
//                         phase: string; progress: number /*0-100*/; running: boolean; timestamp: number }
// Boot phases (string): 'idle' → 'backend.resolve' → 'backend.runtime' → 'backend.spawn'
//                       → 'backend.port' → 'backend.wait' → 'backend.ready' → 'backend.error'

// apps/desktop/src/themes/types.ts
interface DesktopThemeColors { background; foreground; card; cardForeground; muted; mutedForeground;
  popover; popoverForeground; primary; primaryForeground; secondary; secondaryForeground;
  accent; accentForeground; border; input; ring; midground?; midgroundForeground?; composerRing?;
  destructive; destructiveForeground; sidebarBackground?; sidebarBorder?; userBubble?; userBubbleBorder? } // all string
interface DesktopTheme { name; label; description; colors: DesktopThemeColors; darkColors?: DesktopThemeColors;
  typography?: Partial<{ fontSans: string; fontMono: string; fontUrl: string }> }
export const BUILTIN_THEMES: Record<string, DesktopTheme>   // presets.ts

// apps/desktop/src/themes/context.tsx
useTheme(): { theme; themeName: string; mode; resolvedMode; setTheme(name: string): void; setMode(m): void; … }

// apps/desktop/src/hermes.ts
getSessionMessages(sessionId: string, profile?: string | null): Promise<{ messages: ChatMessageRecord[]; session_id: string }>

// Existing chat runtime (REUSED untouched) — controller builds these:
//   chatView: React element (desktop-controller.tsx:1091)
//   gatewayRef.current, requestGateway  (useGatewayRequest)
//   $messages, $busy, $awaitingResponse  (apps/desktop/src/store/session.ts)

// REST surfaces used by the briefing reader (existing):
//   GET /api/cron/jobs?profile=<p>                  → CronJob[]   (CronJob.id, CronJob.name, …)
//   GET /api/cron/jobs/<jobId>/runs?limit=1         → { runs: SessionInfo[]; limit: number }
//   (then) getSessionMessages(run.id, profile)      → run transcript
```

---

### Task 1: AETHER palette tokens + theme preset

Adds the navy/azure brand palette as a JS source of truth and registers the dual `aether` theme (dark "Spatial Depth" default + light "Arctic Glass"). Foundational and isolated; no UI yet.

**Files:**
- Create: `apps/desktop/src/aether/ui/theme/tokens.ts`
- Create: `apps/desktop/src/aether/ui/theme/tokens.test.ts`
- Modify: `apps/desktop/src/themes/presets.ts` (add preset + register)

**Interfaces:**
- Consumes: `DesktopTheme`, `DesktopThemeColors`, `BUILTIN_THEMES` from [themes/types.ts](../../../apps/desktop/src/themes/types.ts) / [themes/presets.ts](../../../apps/desktop/src/themes/presets.ts).
- Produces: `AETHER` palette constants object; `aetherTheme: DesktopTheme` registered as `BUILTIN_THEMES.aether`. Later tasks read hex values from `AETHER` and the theme via `useTheme()`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/src/aether/ui/theme/tokens.test.ts
import { describe, expect, it } from 'vitest'
import { AETHER } from './tokens'
import { BUILTIN_THEMES } from '@/themes/presets'

describe('AETHER palette tokens', () => {
  it('uses HyperTek navy #07397d as the brand core', () => {
    expect(AETHER.navy).toBe('#07397d')
  })
  it('exposes azure glow + semantic colors verbatim from the spec', () => {
    expect(AETHER.azure).toBe('#4aa3ff')
    expect(AETHER.azureSoft).toBe('#8fc0ff')
    expect(AETHER.azureBright).toBe('#1659b5')
    expect(AETHER.ok).toBe('#3DE7A0')
    expect(AETHER.warn).toBe('#FFB020')
    expect(AETHER.error).toBe('#ff5d6c')
  })
})

describe('aether theme preset', () => {
  it('is registered and primary is navy in both light and dark', () => {
    const t = BUILTIN_THEMES.aether
    expect(t).toBeTruthy()
    expect(t.colors.primary).toBe('#07397d')
    expect(t.darkColors?.primary).toBe('#07397d')
  })
  it('ships a dark "Spatial Depth" palette and a Google fonts url', () => {
    expect(BUILTIN_THEMES.aether.darkColors?.background).toBe('#020c1d')
    expect(BUILTIN_THEMES.aether.typography?.fontUrl).toMatch(/Orbitron/)
    expect(BUILTIN_THEMES.aether.typography?.fontUrl).toMatch(/Be\+Vietnam\+Pro/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `apps/desktop`): `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts`
Expected: FAIL — `Cannot find module './tokens'`.

- [ ] **Step 3: Write the tokens module**

```ts
// apps/desktop/src/aether/ui/theme/tokens.ts
// Single JS source of truth for the AETHER palette. CSS mirrors these in aether.css.
export const AETHER = {
  // brand core
  navy: '#07397d',
  // dark "Spatial Depth" surfaces
  bg950: '#020c1d',
  bg900: '#03152f',
  panel: '#082046',
  panelHi: '#0a2a5c',
  // holographic glow accents
  azure: '#4aa3ff',
  azureSoft: '#8fc0ff',
  azureBright: '#1659b5',
  // text
  ink: '#e9f1ff',
  dim: '#9fb6d6',
  hairline: 'rgba(120,180,255,.16)',
  // light "Arctic Glass"
  lightInk: '#0c2444',
  lightAccent: '#1659b5',
  // semantic
  ok: '#3DE7A0',
  warn: '#FFB020',
  error: '#ff5d6c',
} as const

export type AetherPalette = typeof AETHER
```

- [ ] **Step 4: Add the preset to `presets.ts`**

Append the preset object and register it. Mirror the structure of the existing presets in [presets.ts](../../../apps/desktop/src/themes/presets.ts) (the `BUILTIN_THEMES` map is at the bottom of the file).

```ts
// apps/desktop/src/themes/presets.ts — add near the other theme definitions
import { AETHER } from '@/aether/ui/theme/tokens'

export const aetherTheme: DesktopTheme = {
  name: 'aether',
  label: 'AETHER',
  description: 'HyperTek spatial navy with holographic azure',
  // Light = "Arctic Glass"
  colors: {
    background: '#eef4ff',
    foreground: AETHER.lightInk,
    card: '#ffffff',
    cardForeground: AETHER.lightInk,
    muted: '#dbe6fb',
    mutedForeground: '#4d6694',
    popover: '#ffffff',
    popoverForeground: AETHER.lightInk,
    primary: AETHER.navy,
    primaryForeground: '#f4f8ff',
    secondary: '#e2ecfe',
    secondaryForeground: '#16335e',
    accent: '#dbe9ff',
    accentForeground: '#16335e',
    border: 'rgba(7,57,125,.16)',
    input: 'rgba(7,57,125,.22)',
    ring: AETHER.lightAccent,
    midground: AETHER.lightAccent,
    composerRing: AETHER.lightAccent,
    destructive: AETHER.error,
    destructiveForeground: '#ffffff',
    sidebarBackground: '#e6eefc',
    sidebarBorder: 'rgba(7,57,125,.14)',
    userBubble: '#dbe9ff',
    userBubbleBorder: 'rgba(7,57,125,.2)',
  },
  // Dark = "Spatial Depth"
  darkColors: {
    background: AETHER.bg950,
    foreground: AETHER.ink,
    card: AETHER.panel,
    cardForeground: AETHER.ink,
    muted: AETHER.bg900,
    mutedForeground: AETHER.dim,
    popover: AETHER.panelHi,
    popoverForeground: AETHER.ink,
    primary: AETHER.navy,
    primaryForeground: AETHER.ink,
    secondary: AETHER.panel,
    secondaryForeground: AETHER.ink,
    accent: AETHER.azureBright,
    accentForeground: AETHER.ink,
    border: AETHER.hairline,
    input: 'rgba(120,180,255,.22)',
    ring: AETHER.azure,
    midground: AETHER.azure,
    midgroundForeground: AETHER.ink,
    composerRing: AETHER.azure,
    destructive: AETHER.error,
    destructiveForeground: '#ffffff',
    sidebarBackground: AETHER.bg900,
    sidebarBorder: AETHER.hairline,
    userBubble: 'rgba(74,163,255,.16)',
    userBubbleBorder: 'rgba(120,210,255,.34)',
  },
  typography: {
    fontSans: '"Be Vietnam Pro", system-ui, sans-serif',
    fontMono: '"JetBrains Mono", ui-monospace, monospace',
    fontUrl:
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Be+Vietnam+Pro:wght@300;400;500;600;700;800&display=swap',
  },
}

// In the existing BUILTIN_THEMES map, add the entry:
//   aether: aetherTheme,
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/theme/tokens.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/ui/theme/tokens.ts apps/desktop/src/aether/ui/theme/tokens.test.ts apps/desktop/src/themes/presets.ts
git commit -m "feat(aether): add navy/azure palette tokens and dual aether theme preset"
```

---

### Task 2: AETHER cinematic CSS layer

Defines all shared visual primitives as token-driven CSS classes (glass slab, perspective grid floor, bloom, vignette, orb, nav active indicator, gauges, command bar, "Depth" page transition) plus the AETHER display-font var. Screens compose these classes — keeping every color in one place (token rule).

**Files:**
- Create: `apps/desktop/src/aether/ui/theme/aether.css`
- Modify: `apps/desktop/src/styles.css` (append one `@import`)

**Interfaces:**
- Consumes: AETHER palette (mirrored as CSS vars). Active theme sets `--dt-*` tokens via [themes/context.tsx](../../../apps/desktop/src/themes/context.tsx); this file derives `--ae-*` vars and component classes.
- Produces: CSS classes `.ae-screen`, `.ae-grid-floor`, `.ae-bloom`, `.ae-vignette`, `.ae-slab`, `.ae-orb*`, `.ae-rail`, `.ae-nav-indicator`, `.ae-gauge`, `.ae-bar`, `.ae-cmd`, `.ae-depth-enter`, and var `--ae-font-display`. Consumed by Tasks 3–12.

> Note: CSS rendering is verified visually + through the component tests in later tasks (jsdom does not compute CSS). This task's "test" is a successful Vite build/typecheck that proves the import resolves.

- [ ] **Step 1: Create `aether.css`** with the primitives lifted/adapted from the locked mockups ([`_ref_hud_dark.html`](../../../.superpowers/brainstorm/21982-1782359469/_ref_hud_dark.html) and the Boot/Brief/Chat frames in `09-all-screens.html`), converted to AETHER vars. Scope under `[data-hermes-theme='aether']` so it only applies to our theme.

```css
/* apps/desktop/src/aether/ui/theme/aether.css */
[data-hermes-theme='aether'] {
  --ae-navy: #07397d;
  --ae-azure: #4aa3ff;
  --ae-azure-soft: #8fc0ff;
  --ae-azure-bright: #1659b5;
  --ae-ink: #e9f1ff;
  --ae-dim: #9fb6d6;
  --ae-line: rgba(120, 180, 255, 0.16);
  --ae-ok: #3de7a0;
  --ae-warn: #ffb020;
  --ae-error: #ff5d6c;
  --ae-glass: rgba(150, 205, 245, 0.1);
  --ae-glass-2: rgba(120, 190, 240, 0.06);
  --ae-font-display: 'Orbitron', system-ui, sans-serif;
}
[data-hermes-theme='aether'][data-hermes-mode='light'] {
  --ae-ink: #0c2444;
  --ae-dim: #4d6694;
  --ae-line: rgba(7, 57, 125, 0.16);
  --ae-glass: rgba(255, 255, 255, 0.62);
  --ae-glass-2: rgba(255, 255, 255, 0.42);
}

/* full-bleed cinematic background for AETHER screens */
.ae-screen {
  position: relative;
  isolation: isolate;
  overflow: hidden;
  color: var(--ae-ink);
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(74, 163, 255, 0.16), transparent 55%),
    radial-gradient(100% 90% at 80% 110%, rgba(7, 57, 125, 0.18), transparent 60%),
    linear-gradient(180deg, #082046 0%, #05132f 48%, #020c1d 100%);
}
[data-hermes-mode='light'] .ae-screen {
  background:
    radial-gradient(120% 80% at 50% -10%, rgba(74, 163, 255, 0.12), transparent 55%),
    linear-gradient(180deg, #f3f7ff 0%, #e9f1ff 100%);
}

.ae-grid-floor {
  position: absolute;
  left: -20%;
  right: -20%;
  bottom: -6%;
  height: 60%;
  background-image:
    linear-gradient(rgba(74, 163, 255, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(74, 163, 255, 0.11) 1px, transparent 1px);
  background-size: 46px 46px;
  transform: perspective(680px) rotateX(64deg);
  transform-origin: bottom center;
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 38%, #000 78%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0%, #000 38%, #000 78%, transparent 100%);
  opacity: 0.42;
  z-index: 0;
  pointer-events: none;
}
.ae-bloom {
  position: absolute;
  width: 360px;
  height: 360px;
  z-index: 0;
  pointer-events: none;
  background: radial-gradient(circle, rgba(74, 163, 255, 0.2), transparent 65%);
  filter: blur(22px);
  animation: ae-breath 7s ease-in-out infinite;
}
.ae-vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(110% 90% at 50% 30%, transparent 52%, rgba(3, 9, 16, 0.62) 100%);
}

/* glass slab surface */
.ae-slab {
  position: relative;
  border-radius: 16px;
  background: linear-gradient(160deg, var(--ae-glass), var(--ae-glass-2));
  border: 1px solid var(--ae-line);
  box-shadow:
    0 24px 44px -18px rgba(0, 0, 0, 0.7),
    0 8px 18px -8px rgba(0, 0, 0, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.22),
    inset 0 0 30px rgba(74, 163, 255, 0.04);
  backdrop-filter: blur(8px);
}
.ae-slab::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 32%);
}

/* Living Orb (driven by living-orb.tsx; sizes via --ae-orb-size) */
.ae-orb-stage {
  position: relative;
  width: var(--ae-orb-size, 170px);
  height: var(--ae-orb-size, 170px);
  display: grid;
  place-items: center;
  animation: ae-bob 6s ease-in-out infinite;
}
.ae-orb {
  position: relative;
  width: 70%;
  height: 70%;
  border-radius: 50%;
  background: radial-gradient(
    circle at 34% 28%,
    #ffffff 0%,
    var(--ae-azure-soft) 14%,
    var(--ae-azure) 40%,
    var(--ae-azure-bright) 72%,
    #0b4a68 100%
  );
  box-shadow:
    inset -14px -16px 36px rgba(2, 20, 34, 0.85),
    inset 11px 13px 28px rgba(255, 255, 255, 0.38),
    0 0 60px rgba(74, 163, 255, 0.6),
    0 22px 40px -10px rgba(0, 0, 0, 0.6);
}
.ae-orb::after {
  content: '';
  position: absolute;
  left: 24%;
  top: 16%;
  width: 34%;
  height: 26%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.92), transparent 70%);
  filter: blur(2px);
}
.ae-orb-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 50%;
  border: 2px solid rgba(150, 225, 255, 0.5);
  border-top-color: rgba(255, 255, 255, 0.92);
  border-bottom-color: rgba(40, 140, 190, 0.22);
  transform: translate(-50%, -50%) rotateX(72deg);
  box-shadow: 0 0 22px rgba(74, 163, 255, 0.4), inset 0 0 18px rgba(74, 163, 255, 0.3);
  animation: ae-spin 14s linear infinite;
  width: 100%;
  height: 100%;
}
.ae-orb-ring.r2 {
  width: 84%;
  height: 84%;
  border-style: dashed;
  opacity: 0.5;
  animation-duration: 22s;
  animation-direction: reverse;
}
.ae-orb--thinking .ae-orb {
  animation: ae-breath 2.6s ease-in-out infinite;
}

/* nav active indicator (transform set by JS) */
.ae-nav-indicator {
  position: absolute;
  left: 6px;
  right: 6px;
  height: var(--ae-nav-item-h, 38px);
  border-radius: 11px;
  background: linear-gradient(180deg, rgba(74, 163, 255, 0.28), rgba(74, 163, 255, 0.08));
  border: 1px solid rgba(120, 210, 255, 0.5);
  box-shadow: 0 0 18px rgba(74, 163, 255, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.3);
  transition: transform 0.44s cubic-bezier(0.5, 0.05, 0.1, 1);
  pointer-events: none;
  z-index: 0;
}
.ae-nav-edge {
  position: absolute;
  left: -5px;
  width: 3px;
  height: 18px;
  border-radius: 3px;
  background: var(--ae-azure);
  box-shadow: 0 0 8px var(--ae-azure);
  transition: transform 0.44s cubic-bezier(0.5, 0.05, 0.1, 1);
}

/* micro-viz */
.ae-gauge,
.ae-bar {
  height: 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}
.ae-gauge > i,
.ae-bar > i {
  display: block;
  height: 100%;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--ae-azure-bright), var(--ae-azure));
  box-shadow: 0 0 12px rgba(74, 163, 255, 0.6);
}
.ae-bar.warn > i,
.ae-gauge.warn > i {
  background: linear-gradient(90deg, var(--ae-warn), #ffd27a);
  box-shadow: 0 0 12px var(--ae-warn);
}

/* command bar */
.ae-cmd {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 18px;
  border-radius: 15px;
  background: linear-gradient(180deg, rgba(74, 163, 255, 0.12), rgba(120, 195, 245, 0.04));
  border: 1px solid rgba(120, 210, 255, 0.3);
  box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 255, 255, 0.25),
    0 0 30px rgba(74, 163, 255, 0.18);
}

/* "Depth" page transition */
.ae-depth-enter {
  animation: ae-depth 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}
@keyframes ae-depth {
  from { opacity: 0; transform: scale(1.04); filter: blur(6px); }
  to { opacity: 1; transform: scale(1); filter: blur(0); }
}
@keyframes ae-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
@keyframes ae-breath { 0%, 100% { opacity: 0.6; } 50% { opacity: 0.95; } }
@keyframes ae-spin { to { transform: translate(-50%, -50%) rotateX(72deg) rotate(360deg); } }
@keyframes ae-pulse { 0% { transform: scale(0.7); opacity: 0.9; } 100% { transform: scale(2); opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  [data-hermes-theme='aether'] .ae-bloom,
  [data-hermes-theme='aether'] .ae-orb-stage,
  [data-hermes-theme='aether'] .ae-orb,
  [data-hermes-theme='aether'] .ae-orb-ring,
  [data-hermes-theme='aether'] .ae-depth-enter { animation: none !important; }
  [data-hermes-theme='aether'] .ae-nav-indicator,
  [data-hermes-theme='aether'] .ae-nav-edge { transition: none !important; }
  [data-hermes-theme='aether'] .ae-depth-enter { animation: ae-fade 0.2s ease both; }
  @keyframes ae-fade { from { opacity: 0; } to { opacity: 1; } }
}
```

- [ ] **Step 2: Wire the import** in `apps/desktop/src/styles.css`. Add after the existing `@import` block near the top of [styles.css](../../../apps/desktop/src/styles.css):

```css
@import './aether/ui/theme/aether.css';
```

- [ ] **Step 3: Verify the build resolves the import**

Run (from `apps/desktop`): `npm run typecheck`
Expected: PASS (no TS errors; the CSS import is type-agnostic but the file must exist). If `tsc` does not surface CSS, also run `npx vite build` and confirm it completes without "Could not resolve './aether/ui/theme/aether.css'".

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/aether/ui/theme/aether.css apps/desktop/src/styles.css
git commit -m "feat(aether): add cinematic CSS layer (glass, orb, grid, nav indicator, depth)"
```

---

### Task 3: Living Orb component

The agent's "soul" — a CSS-driven orb with rings, in three states (`idle` / `thinking` / `listening`) and a `size` prop. Reused on Boot (large), HUD (medium), Chat (small thinking orb). Lightweight SVG/CSS now; WebGL upgrade is a later sub-project.

**Files:**
- Create: `apps/desktop/src/aether/ui/orb/living-orb.tsx`
- Create: `apps/desktop/src/aether/ui/orb/living-orb.test.tsx`

**Interfaces:**
- Consumes: `.ae-orb*` classes from Task 2; `cn` util from `@/lib/utils` (existing class-merge helper used across the codebase).
- Produces: `LivingOrb({ state?: 'idle' | 'thinking' | 'listening'; size?: number; label?: string; className?: string })`. Default `size=170`, `state='idle'`. Renders an accessible status node. Consumed by Boot/HUD/Chat screens.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/orb/living-orb.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { LivingOrb } from './living-orb'

afterEach(cleanup)

describe('LivingOrb', () => {
  it('renders an accessible status with the state label', () => {
    render(<LivingOrb state="thinking" label="ĐANG XỬ LÝ" />)
    const node = screen.getByRole('status')
    expect(node).toHaveAttribute('aria-label', 'ĐANG XỬ LÝ')
    expect(node.className).toContain('ae-orb--thinking')
  })
  it('applies the size as the --ae-orb-size custom property', () => {
    render(<LivingOrb size={118} label="x" />)
    const stage = screen.getByRole('status').querySelector('.ae-orb-stage') as HTMLElement
    expect(stage.style.getPropertyValue('--ae-orb-size')).toBe('118px')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/orb/living-orb.test.tsx`
Expected: FAIL — cannot find `./living-orb`.

- [ ] **Step 3: Implement `LivingOrb`**

```tsx
// apps/desktop/src/aether/ui/orb/living-orb.tsx
import { cn } from '@/lib/utils'

export interface LivingOrbProps {
  state?: 'idle' | 'thinking' | 'listening'
  size?: number
  label?: string
  className?: string
}

export function LivingOrb({ state = 'idle', size = 170, label = 'Agent', className }: LivingOrbProps) {
  return (
    <div
      aria-label={label}
      className={cn('ae-orb-wrap inline-grid place-items-center', `ae-orb--${state}`, className)}
      role="status"
    >
      <div className="ae-orb-stage" style={{ '--ae-orb-size': `${size}px` } as React.CSSProperties}>
        <div className="ae-orb-ring" />
        <div className="ae-orb-ring r2" />
        <div className="ae-orb" />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --environment jsdom src/aether/ui/orb/living-orb.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/orb/
git commit -m "feat(aether): add Living Orb component (idle/thinking/listening, sized)"
```

---

### Task 4: Nav rail with sliding active indicator

The 62px left rail: brand glyph with a small pulsing online dot, the nav-item column, a spring-sliding active "focus pill", a settings item, and the user avatar. Uses Vietnamese labels (never "Đại lý").

**Files:**
- Modify: `apps/desktop/src/app/routes.ts` (add `HUD_ROUTE`, `BRIEF_ROUTE` — `nav-items.ts` imports them)
- Create: `apps/desktop/src/aether/ui/shell/nav-items.ts`
- Create: `apps/desktop/src/aether/ui/shell/use-nav-indicator.ts`
- Create: `apps/desktop/src/aether/ui/shell/nav-rail.tsx`
- Create: `apps/desktop/src/aether/ui/shell/nav-rail.test.tsx`

**Interfaces:**
- Consumes: `.ae-rail`, `.ae-nav-indicator`, `.ae-nav-edge` classes (Task 2); existing route constants in [routes.ts](../../../apps/desktop/src/app/routes.ts).
- Produces:
  - `HUD_ROUTE = '/hud'`, `BRIEF_ROUTE = '/brief'` (string constants in `routes.ts`).
  - `AETHER_NAV_ITEMS: NavItem[]` where `NavItem = { id: string; route: string; label: string; icon: ReactNode }`.
  - `navIndicatorTransform(activeIndex: number, itemHeight: number, gap: number): string | null`.
  - `NavRail({ items?: NavItem[]; activeRoute: string; onNavigate: (route: string) => void; online?: boolean })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NavRail } from './nav-rail'
import { AETHER_NAV_ITEMS } from './nav-items'

afterEach(cleanup)

describe('NavRail', () => {
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })
  it('renders a small pulsing online dot on the brand glyph (not a big status pill)', () => {
    render(<NavRail activeRoute="/" online onNavigate={vi.fn()} />)
    expect(screen.getByTestId('ae-online-dot')).toBeTruthy()
    expect(screen.queryByText(/online/i)).toBeNull() // no text pill
  })
  it('marks the active item and fires onNavigate on click', () => {
    const onNavigate = vi.fn()
    // item[0] is Home (route HUD_ROUTE); make it active, then click item[1] (Chat).
    render(<NavRail activeRoute={AETHER_NAV_ITEMS[0].route} onNavigate={onNavigate} />)
    const home = screen.getByRole('button', { name: AETHER_NAV_ITEMS[0].label })
    expect(home).toHaveAttribute('aria-current', 'page')
    const chat = screen.getByRole('button', { name: AETHER_NAV_ITEMS[1].label })
    fireEvent.click(chat)
    expect(onNavigate).toHaveBeenCalledWith(AETHER_NAV_ITEMS[1].route)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-rail.test.tsx`
Expected: FAIL — cannot find `./nav-rail`.

- [ ] **Step 3: Add route constants, then the nav model + indicator math**

First add the two new route constants to [routes.ts](../../../apps/desktop/src/app/routes.ts), alongside the existing constants:

```ts
// apps/desktop/src/app/routes.ts
export const HUD_ROUTE = '/hud'
export const BRIEF_ROUTE = '/brief'
```

Then the nav model (which imports them):

```ts
// apps/desktop/src/aether/ui/shell/nav-items.ts
import type { ReactNode } from 'react'
import { BRIEF_ROUTE, HUD_ROUTE } from '@/app/routes'

export interface NavItem {
  id: string
  route: string
  label: string
  icon: ReactNode
}

// Icons kept inline/simple; full set lifted from the mockup nav rail.
const I = (d: string): ReactNode => (
  <svg fill="none" viewBox="0 0 24 24" width={18} height={18}>
    <path d={d} stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

// In-slice routes are real; deferred items point at stub routes (Task 5).
export const AETHER_NAV_ITEMS: NavItem[] = [
  { id: 'home', route: HUD_ROUTE, label: 'Trang chủ', icon: I('M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9') },
  { id: 'chat', route: '/', label: 'Trò chuyện', icon: I('M4 5h16v11H8l-4 3z') },
  { id: 'brief', route: BRIEF_ROUTE, label: 'Brief sáng', icon: I('M5 4h14v16H5zM8 8h8M8 12h8M8 16h5') },
  { id: 'agents', route: '/agents', label: 'Agents', icon: I('M5 7h14v11H5zM12 4v3M9 12h.01M15 12h.01') },
  { id: 'skills', route: '/skills', label: 'Skills', icon: I('M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z') },
  { id: 'memory', route: '/memory', label: 'Memory', icon: I('M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z') },
  { id: 'cron', route: '/cron', label: 'Cron', icon: I('M12 8v4l3 2') },
]
```

```ts
// apps/desktop/src/aether/ui/shell/use-nav-indicator.ts
// Pure transform math for the sliding "focus pill". JS only sets the transform;
// the spring easing lives in CSS (.ae-nav-indicator). Returns translateY for the
// active item slot. Returns null when no item is active (hide the indicator).
export function navIndicatorTransform(
  activeIndex: number,
  itemHeight: number,
  gap: number,
): string | null {
  if (activeIndex < 0) return null
  return `translateY(${activeIndex * (itemHeight + gap)}px)`
}
```

- [ ] **Step 4: Implement `NavRail`**

```tsx
// apps/desktop/src/aether/ui/shell/nav-rail.tsx
import { cn } from '@/lib/utils'
import { AETHER_NAV_ITEMS, type NavItem } from './nav-items'
import { navIndicatorTransform } from './use-nav-indicator'

const ITEM_H = 38
const GAP = 5

export interface NavRailProps {
  items?: NavItem[]
  activeRoute: string
  onNavigate: (route: string) => void
  online?: boolean
}

export function NavRail({ items = AETHER_NAV_ITEMS, activeRoute, onNavigate, online = false }: NavRailProps) {
  const activeIndex = items.findIndex(i => i.route === activeRoute)
  const transform = navIndicatorTransform(activeIndex, ITEM_H, GAP)

  return (
    <nav
      aria-label="HYPERTEK - AGENT PLATFORM"
      className="ae-rail relative flex w-[62px] flex-none flex-col items-center gap-1.5 py-3.5"
      style={{ borderRight: '1px solid var(--ae-line)', background: 'linear-gradient(180deg,rgba(120,190,240,.07),rgba(120,190,240,.02))' }}
    >
      {/* brand glyph + online dot */}
      <div className="relative mb-2 grid h-[34px] w-[34px] place-items-center rounded-[10px]"
        style={{ background: 'linear-gradient(145deg,rgba(120,210,255,.35),rgba(7,57,125,.15))', border: '1px solid rgba(150,220,255,.4)' }}>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 6px var(--ae-azure))' }}>
          <path d="M12 2 L21 20 H15 L12 13 L9 20 H3 Z" stroke="var(--ae-ink)" strokeWidth={1.6} strokeLinejoin="round" fill="rgba(74,163,255,.25)" />
        </svg>
        {online && (
          <span
            data-testid="ae-online-dot"
            className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full"
            style={{ background: 'var(--ae-ok)', boxShadow: '0 0 8px var(--ae-ok)' }}
          />
        )}
      </div>

      {/* item column with sliding indicator */}
      <div className="relative flex w-full flex-col items-center gap-[5px]">
        {transform && <div className="ae-nav-indicator" style={{ transform, ['--ae-nav-item-h' as string]: `${ITEM_H}px` }} />}
        {items.map(item => {
          const active = item.route === activeRoute
          return (
            <button
              key={item.id}
              type="button"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              title={item.label}
              onClick={() => onNavigate(item.route)}
              className={cn(
                'relative z-[1] grid h-[38px] w-10 place-items-center rounded-[11px] transition-colors',
                active ? 'text-white' : 'text-[color:var(--ae-dim)] hover:text-[color:var(--ae-azure-soft)]',
              )}
            >
              {item.icon}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-[#06283c]"
        style={{ background: 'radial-gradient(circle at 35% 30%,#cdf2ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
        B
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/nav-rail.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.ts apps/desktop/src/aether/ui/shell/use-nav-indicator.ts apps/desktop/src/aether/ui/shell/nav-rail.tsx apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
git commit -m "feat(aether): add route constants + nav rail with spring sliding indicator"
```

---

### Task 5: Top bar + Depth transition + stub screen

The top bar (page title + JetBrains-Mono date/time + avatar), a reusable "Depth" page-transition wrapper, and a stub screen for deferred nav targets so navigation never crashes. (Route constants `HUD_ROUTE`/`BRIEF_ROUTE` were added in Task 4.)

**Files:**
- Create: `apps/desktop/src/aether/ui/shell/top-bar.tsx`
- Create: `apps/desktop/src/aether/ui/shell/top-bar.test.tsx`
- Create: `apps/desktop/src/aether/ui/shell/page-transition.tsx`
- Create: `apps/desktop/src/aether/ui/screens/stub-screen.tsx`

**Interfaces:**
- Consumes: AETHER CSS (Task 2). Route constants from [routes.ts](../../../apps/desktop/src/app/routes.ts).
- Produces:
  - `TopBar({ title: string; now?: Date })` — formats `now` as `Th… · DD.MM · HH:mm` (Vietnamese weekday) in mono.
  - `PageTransition({ routeKey: string; children })` — re-mounts children with `.ae-depth-enter` on `routeKey` change.
  - `StubScreen({ title: string })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/shell/top-bar.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { TopBar, formatAetherClock } from './top-bar'

afterEach(cleanup)

describe('TopBar', () => {
  it('formats the clock as Vietnamese weekday · DD.MM · HH:mm', () => {
    // 2026-06-25 is a Thursday
    const out = formatAetherClock(new Date(2026, 5, 25, 9, 14))
    expect(out).toBe('Th 5 · 25.06 · 09:14')
  })
  it('renders the page title', () => {
    render(<TopBar title="Trang chủ" now={new Date(2026, 5, 25, 9, 14)} />)
    expect(screen.getByRole('heading', { name: 'Trang chủ' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/top-bar.test.tsx`
Expected: FAIL — cannot find `./top-bar`.

- [ ] **Step 3: Implement `TopBar`, `PageTransition`, `StubScreen`**

```tsx
// apps/desktop/src/aether/ui/shell/top-bar.tsx
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
  return (
    <div className="flex items-center justify-between gap-4">
      <h1 className="text-[17px] font-semibold tracking-[.01em]">{title}</h1>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs tracking-[.04em] text-[color:var(--ae-dim)]">{formatAetherClock(now)}</span>
        <div className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold text-[#06283c]"
          style={{ background: 'radial-gradient(circle at 35% 30%,#cdf2ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
          B
        </div>
      </div>
    </div>
  )
}
```

```tsx
// apps/desktop/src/aether/ui/shell/page-transition.tsx
// Re-keys children on route change so the .ae-depth-enter animation replays.
export function PageTransition({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  return (
    <div key={routeKey} className="ae-depth-enter h-full min-h-0">
      {children}
    </div>
  )
}
```

```tsx
// apps/desktop/src/aether/ui/screens/stub-screen.tsx
export function StubScreen({ title }: { title: string }) {
  return (
    <div className="ae-screen grid h-full place-items-center">
      <div className="ae-slab px-8 py-6 text-center">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">{title}</div>
        <div className="mt-2 text-sm text-[color:var(--ae-dim)]">Sắp ra mắt trong bản cập nhật AETHER tiếp theo.</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/top-bar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/shell/top-bar.tsx apps/desktop/src/aether/ui/shell/top-bar.test.tsx apps/desktop/src/aether/ui/shell/page-transition.tsx apps/desktop/src/aether/ui/screens/stub-screen.tsx
git commit -m "feat(aether): add top bar, Depth transition, stub screen"
```

---

### Task 6: Boot-progress store + hook

A nanostores-backed boot state fed by the Electron preload boot-progress channel. Independent of the gateway, so the Boot screen renders even before the WS connects. Maps the backend phases to a 0–100 checklist.

**Files:**
- Create: `apps/desktop/src/aether/domain/boot/boot-store.ts`
- Create: `apps/desktop/src/aether/domain/boot/use-boot-progress.ts`
- Create: `apps/desktop/src/aether/domain/boot/use-boot-progress.test.ts`

**Interfaces:**
- Consumes: `window.hermesDesktop.getBootProgress()` + `onBootProgress(cb)`; `DesktopBootProgress` ([global.d.ts](../../../apps/desktop/src/global.d.ts)).
- Produces:
  - `$bootProgress = atom<DesktopBootProgress | null>(null)`, `$bootDone = atom<boolean>(false)`.
  - `BOOT_STEPS: { phase: string; label: string }[]` (Vietnamese checklist).
  - `bootStepStatus(current: DesktopBootProgress | null, stepPhase: string): 'done' | 'active' | 'pending'`.
  - `useBootProgress(): void` — subscribes on mount, updates the stores, sets `$bootDone` when `progress >= 94 && !running` or phase `backend.ready`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/desktop/src/aether/domain/boot/use-boot-progress.test.ts
import { describe, expect, it } from 'vitest'
import { BOOT_STEPS, bootStepStatus } from './boot-store'

const at = (phase: string, progress: number) => ({
  error: null, fakeMode: false, message: '', phase, progress, running: true, timestamp: 0,
})

describe('boot checklist mapping', () => {
  it('marks earlier phases done and the current phase active', () => {
    const p = at('backend.spawn', 84)
    expect(bootStepStatus(p, 'backend.resolve')).toBe('done')
    expect(bootStepStatus(p, 'backend.spawn')).toBe('active')
    expect(bootStepStatus(p, 'backend.ready')).toBe('pending')
  })
  it('covers the documented phase order', () => {
    expect(BOOT_STEPS.map(s => s.phase)).toEqual([
      'backend.resolve', 'backend.runtime', 'backend.spawn', 'backend.port', 'backend.wait', 'backend.ready',
    ])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/boot/use-boot-progress.test.ts`
Expected: FAIL — cannot find `./boot-store`.

- [ ] **Step 3: Implement the store + mapping**

```ts
// apps/desktop/src/aether/domain/boot/boot-store.ts
import { atom } from 'nanostores'

export interface DesktopBootProgress {
  error: string | null
  fakeMode: boolean
  message: string
  phase: string
  progress: number
  running: boolean
  timestamp: number
}

export const $bootProgress = atom<DesktopBootProgress | null>(null)
export const $bootDone = atom<boolean>(false)

// Vietnamese checklist, ordered by the backend's emitted phase sequence.
export const BOOT_STEPS: { phase: string; label: string }[] = [
  { phase: 'backend.resolve', label: 'core agent' },
  { phase: 'backend.runtime', label: 'bộ nhớ' },
  { phase: 'backend.spawn', label: 'kỹ năng' },
  { phase: 'backend.port', label: 'kết nối kênh' },
  { phase: 'backend.wait', label: 'mô hình ngôn ngữ' },
  { phase: 'backend.ready', label: 'sẵn sàng' },
]

const ORDER = BOOT_STEPS.map(s => s.phase)

export function bootStepStatus(
  current: DesktopBootProgress | null,
  stepPhase: string,
): 'done' | 'active' | 'pending' {
  if (!current) return 'pending'
  const cur = ORDER.indexOf(current.phase)
  const step = ORDER.indexOf(stepPhase)
  if (cur < 0 || step < 0) return 'pending'
  if (step < cur) return 'done'
  if (step === cur) return current.running ? 'active' : 'done'
  return 'pending'
}
```

```ts
// apps/desktop/src/aether/domain/boot/use-boot-progress.ts
import { useEffect } from 'react'
import { $bootDone, $bootProgress, type DesktopBootProgress } from './boot-store'

function isComplete(p: DesktopBootProgress): boolean {
  return !p.error && (p.phase === 'backend.ready' || (p.progress >= 94 && !p.running))
}

export function useBootProgress(): void {
  useEffect(() => {
    const desktop = window.hermesDesktop
    if (!desktop) return
    let cancelled = false
    const apply = (p: DesktopBootProgress | null) => {
      if (cancelled || !p) return
      $bootProgress.set(p)
      if (isComplete(p)) $bootDone.set(true)
    }
    void desktop.getBootProgress().then(apply)
    const off = desktop.onBootProgress(apply)
    return () => {
      cancelled = true
      off?.()
    }
  }, [])
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/domain/boot/use-boot-progress.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/boot/
git commit -m "feat(aether): add boot-progress store/hook mapping backend phases to checklist"
```

---

### Task 7: Boot Sequence screen

The cinematic splash: orb + rings, the init checklist (driven by the boot store), the loader bar with live percentage, the AETHER wordmark (Orbitron), and the tagline "HYPERTEK - AGENT PLATFORM". Reveals the shell (via `$bootDone`) with a Depth transition.

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/boot-sequence.tsx`
- Create: `apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx`

**Interfaces:**
- Consumes: `$bootProgress`, `BOOT_STEPS`, `bootStepStatus` (Task 6); `LivingOrb` (Task 3); `useStore` from `@nanostores/react`.
- Produces: `BootSequence()` — a full-bleed `.ae-screen` overlay. Renders checklist statuses, the percentage from `progress`, and (when `progress.error` is set) an inline error panel with a "Mở log" affordance that calls `window.hermesDesktop.revealLogs()` (confirmed at [global.d.ts:92](../../../apps/desktop/src/global.d.ts#L92)).

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { BootSequence } from './boot-sequence'
import { $bootProgress } from '@/aether/domain/boot/boot-store'

beforeEach(() => $bootProgress.set(null))
afterEach(cleanup)

describe('BootSequence', () => {
  it('shows the platform tagline and current percentage', () => {
    $bootProgress.set({ error: null, fakeMode: true, message: 'Đang đồng bộ…', phase: 'backend.spawn', progress: 84, running: true, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
    expect(screen.getByText('84%')).toBeTruthy()
  })
  it('surfaces a boot error with a log affordance', () => {
    $bootProgress.set({ error: 'spawn failed', fakeMode: false, message: 'Lỗi', phase: 'backend.error', progress: 28, running: false, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText(/spawn failed/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/boot-sequence.test.tsx`
Expected: FAIL — cannot find `./boot-sequence`.

- [ ] **Step 3: Implement `BootSequence`**

```tsx
// apps/desktop/src/aether/ui/screens/boot-sequence.tsx
import { useStore } from '@nanostores/react'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { $bootProgress, BOOT_STEPS, bootStepStatus } from '@/aether/domain/boot/boot-store'

export function BootSequence() {
  const progress = useStore($bootProgress)
  const pct = Math.max(0, Math.min(100, Math.round(progress?.progress ?? 0)))
  const hasError = Boolean(progress?.error)

  return (
    <div className="ae-screen grid h-full w-full place-items-center">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }} />
      <div className="ae-vignette" />

      {/* init checklist */}
      <div className="absolute left-12 top-1/2 z-[3] flex w-[230px] -translate-y-1/2 flex-col gap-[11px]">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[.22em] text-[color:var(--ae-azure-soft)] opacity-85">
          KHỞI ĐỘNG HỆ THỐNG
        </div>
        {BOOT_STEPS.map(step => {
          const status = bootStepStatus(progress, step.phase)
          return (
            <div key={step.phase} className="flex items-center gap-[11px] font-mono text-[12.5px] text-[#D7ECFA]">
              <span
                className="grid h-[18px] w-[18px] flex-none place-items-center rounded-[6px] text-[11px]"
                style={{
                  color: status === 'pending' ? 'var(--ae-dim)' : 'var(--ae-ok)',
                  background: status === 'pending' ? 'transparent' : 'linear-gradient(180deg,rgba(61,231,160,.22),rgba(61,231,160,.06))',
                  border: `1px solid ${status === 'pending' ? 'var(--ae-line)' : 'rgba(61,231,160,.4)'}`,
                }}
              >
                {status === 'pending' ? '·' : status === 'active' ? '…' : '✓'}
              </span>
              <span className="flex-1">{step.label}</span>
            </div>
          )
        })}
      </div>

      {/* core orb + wordmark */}
      <div className="z-[2] flex flex-col items-center">
        <LivingOrb size={300} state="thinking" label="AETHER" />
        <div className="mt-7 font-[family-name:var(--ae-font-display)] text-[52px] font-bold tracking-[.22em] pl-[.22em]"
          style={{ background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 30px rgba(74,163,255,.45)' }}>
          AETHER
        </div>
        <div className="mt-2 pl-[.42em] text-[11px] font-semibold uppercase tracking-[.42em] text-[color:var(--ae-azure-soft)] opacity-85">
          HYPERTEK - AGENT PLATFORM
        </div>
      </div>

      {/* loader / error */}
      <div className="absolute bottom-14 left-1/2 z-[3] flex w-[420px] -translate-x-1/2 flex-col gap-[9px]">
        {hasError ? (
          <div className="ae-slab px-4 py-3 text-center">
            <div className="text-sm font-semibold text-[color:var(--ae-error)]">Khởi động lỗi</div>
            <div className="mt-1 font-mono text-[11px] text-[color:var(--ae-dim)]">{progress?.error}</div>
            <button type="button" onClick={() => window.hermesDesktop?.revealLogs?.()}
              className="mt-2 text-[11px] text-[color:var(--ae-azure-soft)] underline">
              Mở log
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between font-mono text-[11px] tracking-[.08em] text-[color:var(--ae-dim)]">
              <span>{progress?.message ?? 'Đang khởi động…'}</span>
              <b className="text-white">{pct}%</b>
            </div>
            <div className="ae-bar"><i style={{ width: `${pct}%` }} /></div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/boot-sequence.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/boot-sequence.tsx apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx
git commit -m "feat(aether): add cinematic Boot Sequence screen driven by boot store"
```

---

### Task 8: Briefing schema + artifact parser

The contract for the Morning Briefing artifact and a parser that extracts the structured JSON from a cron run's final assistant message. Pure functions, fully unit-tested; no network.

**Files:**
- Create: `apps/desktop/src/aether/domain/briefing/briefing-schema.ts`
- Create: `apps/desktop/src/aether/domain/briefing/parse-briefing.ts`
- Create: `apps/desktop/src/aether/domain/briefing/parse-briefing.test.ts`
- Create: `apps/desktop/src/aether/domain/briefing/fixtures/briefing.sample.json`

**Interfaces:**
- Consumes: nothing external (pure).
- Produces:
  - Types `Briefing`, `BriefingItem`, `ServerVital`, `BentoSummary`, `FeedEntry`.
  - `isBriefing(value: unknown): value is Briefing` runtime guard.
  - `extractJsonBlock(text: string): unknown | null` — pulls the first ```json fenced block (or parses the whole string).
  - `parseBriefingFromMessages(messages: { role: string; content?: unknown }[]): Briefing | null` — reads the last assistant message and validates. Consumed by Task 9 reader + HUD/Brief screens.

- [ ] **Step 1: Write the failing test + fixture**

```json
// apps/desktop/src/aether/domain/briefing/fixtures/briefing.sample.json
{
  "generatedAt": "2026-06-25T09:14:00+07:00",
  "greetingName": "Bình",
  "priorities": [
    { "id": "p1", "title": "3 email cần bạn trả lời — 1 từ khách hàng Hypertek", "severity": "info" },
    { "id": "p2", "title": "Deal 'Website ACME' đã chờ phản hồi 2 ngày", "severity": "info" },
    { "id": "p3", "title": "Server h-workspace: CPU 82% — cao bất thường", "severity": "warn" },
    { "id": "p4", "title": "2 deadline hôm nay: PR #214, báo giá VinFast", "severity": "info" }
  ],
  "servers": [
    { "name": "hypertekvn", "status": "ok", "cpu": 21 },
    { "name": "h-workspace", "status": "warn", "cpu": 82 }
  ],
  "bento": {
    "deals": { "active": 5, "valueLabel": "142M ₫", "sub": "1 cần follow-up" },
    "calendar": { "count": 2, "next": "14:00 · call ACME" },
    "agents": { "headline": "BMad story 4.2 — đang code", "sub": "3 subagent" }
  },
  "feed": [
    { "time": "09:12", "text": "Đã quét 47 email mới" },
    { "time": "09:08", "text": "Backup h-workspace hoàn tất" }
  ],
  "vitals": { "cpu": 82, "api": 34, "memory": 61 }
}
```

```ts
// apps/desktop/src/aether/domain/briefing/parse-briefing.test.ts
import { describe, expect, it } from 'vitest'
import sample from './fixtures/briefing.sample.json'
import { extractJsonBlock, isBriefing, parseBriefingFromMessages } from './parse-briefing'

describe('briefing parser', () => {
  it('validates the sample fixture against the guard', () => {
    expect(isBriefing(sample)).toBe(true)
  })
  it('extracts a fenced ```json block from message text', () => {
    const text = 'Đây là brief:\n```json\n{"a":1}\n```\nxong.'
    expect(extractJsonBlock(text)).toEqual({ a: 1 })
  })
  it('reads the last assistant message and returns a Briefing', () => {
    const messages = [
      { role: 'user', content: 'run' },
      { role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' },
    ]
    const b = parseBriefingFromMessages(messages)
    expect(b?.priorities).toHaveLength(4)
    expect(b?.servers[1].status).toBe('warn')
  })
  it('returns null when no valid artifact is present', () => {
    expect(parseBriefingFromMessages([{ role: 'assistant', content: 'no json here' }])).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/briefing/parse-briefing.test.ts`
Expected: FAIL — cannot find `./parse-briefing`.

- [ ] **Step 3: Implement the schema + parser**

```ts
// apps/desktop/src/aether/domain/briefing/briefing-schema.ts
export type Severity = 'info' | 'warn' | 'error'

export interface BriefingItem { id: string; title: string; severity: Severity; sub?: string }
export interface ServerVital { name: string; status: 'ok' | 'warn' | 'error'; cpu: number }
export interface FeedEntry { time: string; text: string }
export interface BentoSummary {
  deals?: { active: number; valueLabel: string; sub?: string }
  calendar?: { count: number; next?: string }
  agents?: { headline: string; sub?: string }
}
export interface Briefing {
  generatedAt: string
  greetingName?: string
  priorities: BriefingItem[]
  servers: ServerVital[]
  bento: BentoSummary
  feed: FeedEntry[]
  vitals: { cpu: number; api: number; memory: number }
}
```

```ts
// apps/desktop/src/aether/domain/briefing/parse-briefing.ts
import type { Briefing } from './briefing-schema'

export function isBriefing(value: unknown): value is Briefing {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.generatedAt === 'string' &&
    Array.isArray(v.priorities) &&
    Array.isArray(v.servers) &&
    Array.isArray(v.feed) &&
    typeof v.bento === 'object' &&
    v.bento !== null &&
    typeof v.vitals === 'object' &&
    v.vitals !== null
  )
}

const FENCE = /```json\s*([\s\S]*?)```/i

export function extractJsonBlock(text: string): unknown | null {
  const fenced = FENCE.exec(text)
  const raw = fenced ? fenced[1] : text
  try {
    return JSON.parse(raw.trim())
  } catch {
    return null
  }
}

function messageText(content: unknown): string {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => (typeof part === 'string' ? part : typeof (part as { text?: string })?.text === 'string' ? (part as { text: string }).text : ''))
      .join('\n')
  }
  return ''
}

export function parseBriefingFromMessages(
  messages: { role: string; content?: unknown }[],
): Briefing | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role !== 'assistant') continue
    const parsed = extractJsonBlock(messageText(messages[i].content))
    if (isBriefing(parsed)) return parsed
    return null // newest assistant message had no valid artifact
  }
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/domain/briefing/parse-briefing.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/briefing/briefing-schema.ts apps/desktop/src/aether/domain/briefing/parse-briefing.ts apps/desktop/src/aether/domain/briefing/parse-briefing.test.ts apps/desktop/src/aether/domain/briefing/fixtures/briefing.sample.json
git commit -m "feat(aether): add briefing artifact schema + message parser"
```

---

### Task 9: Briefing reader + store + aggregator skill

Reads the latest Morning Briefing artifact via the **existing** cron REST surface (find job → latest run → run messages → parse), exposes it through a nanostore, and ships the `morning-briefing-aggregator` skill that produces the artifact. Prompt-cache-safe: only REST reads of a separate cron session — never the live conversation, never `message.delta`.

**Files:**
- Create: `apps/desktop/src/aether/domain/briefing/read-briefing.ts`
- Create: `apps/desktop/src/aether/domain/briefing/read-briefing.test.ts`
- Create: `apps/desktop/src/aether/domain/briefing/briefing-store.ts`
- Create: `skills/productivity/morning-briefing-aggregator/SKILL.md`
- Create: `skills/productivity/morning-briefing-aggregator/references/briefing-schema.json`

**Interfaces:**
- Consumes: `window.hermesDesktop.api<T>(...)`; `getSessionMessages` from [hermes.ts](../../../apps/desktop/src/hermes.ts); `parseBriefingFromMessages`, `isBriefing` (Task 8).
- Produces:
  - `readLatestBriefing(deps?: ReadBriefingDeps): Promise<Briefing | null>` with injectable deps `{ api; getMessages; jobName?; profile? }` (defaults wire the real implementations).
  - `$briefing = atom<Briefing | null>(null)`, `$briefingStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')`, `loadBriefing(): Promise<void>`.

- [ ] **Step 1: Write the failing test (dependency-injected, no real network)**

```ts
// apps/desktop/src/aether/domain/briefing/read-briefing.test.ts
import { describe, expect, it, vi } from 'vitest'
import sample from './fixtures/briefing.sample.json'
import { readLatestBriefing } from './read-briefing'

describe('readLatestBriefing', () => {
  it('finds the job, fetches the latest run, parses the artifact', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path.startsWith('/api/cron/jobs?')) return [{ id: 'job_abc', name: 'morning-briefing-aggregator' }]
      if (req.path.includes('/runs')) return { runs: [{ id: 'cron_job_abc_2026-06-25' }], limit: 1 }
      throw new Error('unexpected ' + req.path)
    })
    const getMessages = vi.fn(async () => ({
      session_id: 'cron_job_abc_2026-06-25',
      messages: [{ role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' }],
    }))

    const out = await readLatestBriefing({ api: api as never, getMessages: getMessages as never })
    expect(out?.servers).toHaveLength(2)
    expect(api).toHaveBeenCalledWith(expect.objectContaining({ path: expect.stringContaining('/api/cron/jobs?') }))
    expect(getMessages).toHaveBeenCalledWith('cron_job_abc_2026-06-25', 'default')
  })

  it('returns null when no briefing job exists', async () => {
    const api = vi.fn(async () => [])
    const getMessages = vi.fn()
    expect(await readLatestBriefing({ api: api as never, getMessages: getMessages as never })).toBeNull()
    expect(getMessages).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/domain/briefing/read-briefing.test.ts`
Expected: FAIL — cannot find `./read-briefing`.

- [ ] **Step 3: Implement the reader + store**

```ts
// apps/desktop/src/aether/domain/briefing/read-briefing.ts
import { getSessionMessages } from '@/hermes'
import type { Briefing } from './briefing-schema'
import { parseBriefingFromMessages } from './parse-briefing'

interface CronJob { id: string; name: string }
interface CronRunsResponse { runs: { id: string }[]; limit: number }

export interface ReadBriefingDeps {
  api?: <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

export const BRIEFING_JOB_NAME = 'morning-briefing-aggregator'

export async function readLatestBriefing(deps: ReadBriefingDeps = {}): Promise<Briefing | null> {
  const api = deps.api ?? (req => window.hermesDesktop.api(req))
  const getMessages = deps.getMessages ?? getSessionMessages
  const jobName = deps.jobName ?? BRIEFING_JOB_NAME
  const profile = deps.profile ?? 'default'

  const jobs = await api<CronJob[]>({ path: `/api/cron/jobs?profile=${encodeURIComponent(profile)}` })
  const job = jobs.find(j => j.name === jobName)
  if (!job) return null

  const runs = await api<CronRunsResponse>({ path: `/api/cron/jobs/${encodeURIComponent(job.id)}/runs?limit=1` })
  const latest = runs.runs?.[0]
  if (!latest) return null

  const { messages } = await getMessages(latest.id, profile)
  return parseBriefingFromMessages(messages)
}
```

```ts
// apps/desktop/src/aether/domain/briefing/briefing-store.ts
import { atom } from 'nanostores'
import type { Briefing } from './briefing-schema'
import { readLatestBriefing } from './read-briefing'

export const $briefing = atom<Briefing | null>(null)
export const $briefingStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')

export async function loadBriefing(): Promise<void> {
  $briefingStatus.set('loading')
  try {
    const briefing = await readLatestBriefing()
    if (briefing) {
      $briefing.set(briefing)
      $briefingStatus.set('ready')
    } else {
      $briefingStatus.set('empty')
    }
  } catch {
    $briefingStatus.set('error')
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/domain/briefing/read-briefing.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Author the aggregator skill** (frontmatter mirrors the existing [google-workspace SKILL.md](../../../skills/productivity/google-workspace/SKILL.md) format). The skill instructs the agent to gather sources and emit exactly one fenced ```json block matching the schema.

```markdown
<!-- skills/productivity/morning-briefing-aggregator/SKILL.md -->
---
name: morning-briefing-aggregator
description: "Aggregate email, calendar, server health, tasks and agent status into one structured Morning Briefing JSON artifact (run on a cron)."
version: 1.0.0
author: HyperTek
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Productivity, Briefing, Aggregation, JSON, Cron]
    related_skills: [google-workspace, hypertekvn-main-server-manage, h-workspace-server-manage]
---

# Morning Briefing Aggregator

Run by a cron job (e.g. 07:00 daily). Gather today's signal from available sources and
emit **exactly one** fenced ```json block as the final message, conforming to
`references/briefing-schema.json`. Emit nothing after the JSON block.

## Sources (degrade gracefully — omit a section's data if its source is unavailable)
- **Email + calendar:** use the `google-workspace` skill (unread count, threads needing a
  reply, today's events).
- **Server health:** if the `hypertekvn-main-server-manage` and/or `h-workspace-server-manage`
  skills are installed, call them and record name/status/cpu per server. If not installed,
  return an empty `servers` array — do not fail.
- **Tasks / context:** summarize active agent work and deadlines from recent sessions /
  memory. CRM/deals are not native yet — populate `bento.deals` only if a deals source exists,
  otherwise omit it.

## Hard rules
- Output Vietnamese strings for human-facing titles. **Never** translate "Agent" → "Đại lý".
- The final message MUST be the JSON artifact (fenced as ```json). No prose after it.
- This skill runs in its own cron session — it must not touch the user's live conversation.
```

```json
// skills/productivity/morning-briefing-aggregator/references/briefing-schema.json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "MorningBriefing",
  "type": "object",
  "required": ["generatedAt", "priorities", "servers", "bento", "feed", "vitals"],
  "properties": {
    "generatedAt": { "type": "string" },
    "greetingName": { "type": "string" },
    "priorities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "title", "severity"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "severity": { "enum": ["info", "warn", "error"] },
          "sub": { "type": "string" }
        }
      }
    },
    "servers": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["name", "status", "cpu"],
        "properties": {
          "name": { "type": "string" },
          "status": { "enum": ["ok", "warn", "error"] },
          "cpu": { "type": "number" }
        }
      }
    },
    "bento": { "type": "object" },
    "feed": { "type": "array", "items": { "type": "object", "required": ["time", "text"] } },
    "vitals": {
      "type": "object",
      "required": ["cpu", "api", "memory"],
      "properties": { "cpu": { "type": "number" }, "api": { "type": "number" }, "memory": { "type": "number" } }
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/domain/briefing/read-briefing.ts apps/desktop/src/aether/domain/briefing/read-briefing.test.ts apps/desktop/src/aether/domain/briefing/briefing-store.ts skills/productivity/morning-briefing-aggregator/
git commit -m "feat(aether): add briefing reader/store + morning-briefing-aggregator skill"
```

---

### Task 10: Micro-viz, glass slab, command bar primitives

Reusable presentational primitives shared by HUD and Brief: a glass card wrapper, gauge/bar viz, and the command bar (mic + placeholder + ⌘K hint).

**Files:**
- Create: `apps/desktop/src/aether/ui/components/glass-slab.tsx`
- Create: `apps/desktop/src/aether/ui/components/micro-viz.tsx`
- Create: `apps/desktop/src/aether/ui/components/micro-viz.test.tsx`
- Create: `apps/desktop/src/aether/ui/components/command-bar.tsx`

**Interfaces:**
- Consumes: `.ae-slab`, `.ae-gauge`, `.ae-bar`, `.ae-cmd` (Task 2); `cn`.
- Produces:
  - `GlassSlab({ className?, children })`.
  - `Bar({ value: number; warn?: boolean })` and `Gauge({ value: number; warn?: boolean })` (value 0–100, clamped).
  - `CommandBar({ placeholder?: string; onActivate?: () => void })` — renders mic, placeholder, and a ⌘K hint; calls `onActivate` on click/Enter.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/components/micro-viz.test.tsx
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Bar } from './micro-viz'

afterEach(cleanup)

describe('Bar', () => {
  it('clamps the fill width to 0-100%', () => {
    const { container, rerender } = render(<Bar value={150} />)
    expect((container.querySelector('.ae-bar > i') as HTMLElement).style.width).toBe('100%')
    rerender(<Bar value={-10} />)
    expect((container.querySelector('.ae-bar > i') as HTMLElement).style.width).toBe('0%')
  })
  it('adds the warn modifier when warn is set', () => {
    const { container } = render(<Bar value={82} warn />)
    expect(container.querySelector('.ae-bar')!.className).toContain('warn')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/components/micro-viz.test.tsx`
Expected: FAIL — cannot find `./micro-viz`.

- [ ] **Step 3: Implement the primitives**

```tsx
// apps/desktop/src/aether/ui/components/glass-slab.tsx
import { cn } from '@/lib/utils'

export function GlassSlab({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('ae-slab', className)}>{children}</div>
}
```

```tsx
// apps/desktop/src/aether/ui/components/micro-viz.tsx
import { cn } from '@/lib/utils'

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export function Bar({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className={cn('ae-bar', warn && 'warn')}>
      <i style={{ width: `${clamp(value)}%` }} />
    </div>
  )
}

export function Gauge({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className={cn('ae-gauge', warn && 'warn')}>
      <i style={{ width: `${clamp(value)}%` }} />
    </div>
  )
}
```

```tsx
// apps/desktop/src/aether/ui/components/command-bar.tsx
export function CommandBar({ placeholder = 'Nói hoặc gõ lệnh cho Aether…', onActivate }: { placeholder?: string; onActivate?: () => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className="ae-cmd cursor-text"
      onClick={() => onActivate?.()}
      onKeyDown={e => { if (e.key === 'Enter') onActivate?.() }}
    >
      <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]"
        style={{ background: 'radial-gradient(circle at 35% 30%,#d7f4ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
          <rect x={9} y={3} width={6} height={11} rx={3} fill="#06283c" />
          <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="#06283c" strokeWidth={1.8} strokeLinecap="round" />
        </svg>
      </div>
      <span className="flex-1 text-sm text-[#A9CFE8]">{placeholder}</span>
      <span className="rounded-[9px] border border-[color:var(--ae-line)] bg-[rgba(120,200,255,.1)] px-[11px] py-1.5 font-mono text-xs text-[color:var(--ae-azure-soft)]">
        ⌘K
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/components/micro-viz.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/components/
git commit -m "feat(aether): add glass slab, micro-viz, and command bar primitives"
```

---

### Task 11: Command-Center HUD screen

The home cockpit: orb presence + focus chips, the brief summary, the bento tiles (servers / deals / calendar / agents), live feed, vitals, and the command bar. Reads `$briefing` (Task 9) and triggers `loadBriefing()` on mount. **Prompt-cache-safe** — no `message.delta`, no live-conversation polling.

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/command-center.tsx`
- Create: `apps/desktop/src/aether/ui/screens/command-center.test.tsx`

**Interfaces:**
- Consumes: `$briefing`, `$briefingStatus`, `loadBriefing` (Task 9); `LivingOrb`; `GlassSlab`, `Bar`, `Gauge`, `CommandBar` (Task 10); `useStore`.
- Produces: `CommandCenter({ onCommandPalette?: () => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/screens/command-center.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CommandCenter } from './command-center'
import { $briefing, $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'
import type { Briefing } from '@/aether/domain/briefing/briefing-schema'

beforeEach(() => {
  $briefing.set(sample as Briefing)
  $briefingStatus.set('ready')
})
afterEach(cleanup)

describe('CommandCenter HUD', () => {
  it('renders bento tiles from the briefing', () => {
    render(<CommandCenter />)
    expect(screen.getByText(/142M ₫/)).toBeTruthy()
    expect(screen.getByText(/BMad story 4.2/)).toBeTruthy()
    expect(screen.getByText(/h-workspace/)).toBeTruthy()
  })
  it('shows the command bar with the ⌘K hint', () => {
    render(<CommandCenter />)
    expect(screen.getByText('⌘K')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/command-center.test.tsx`
Expected: FAIL — cannot find `./command-center`.

- [ ] **Step 3: Implement `CommandCenter`**

```tsx
// apps/desktop/src/aether/ui/screens/command-center.tsx
import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Bar, Gauge } from '@/aether/ui/components/micro-viz'
import { CommandBar } from '@/aether/ui/components/command-bar'
import { $briefing, $briefingStatus, loadBriefing } from '@/aether/domain/briefing/briefing-store'

export function CommandCenter({ onCommandPalette }: { onCommandPalette?: () => void }) {
  const briefing = useStore($briefing)
  const status = useStore($briefingStatus)

  useEffect(() => {
    if ($briefingStatus.get() === 'idle') void loadBriefing()
  }, [])

  const servers = briefing?.servers ?? []
  const worstServer = servers.find(s => s.status !== 'ok')

  return (
    <div className="ae-screen flex h-full flex-col p-[18px_22px]">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '8%', top: '30%' }} />
      <div className="ae-vignette" />

      <div className="z-[2] grid min-h-0 flex-1 grid-cols-[26%_44%_30%] gap-[18px]">
        {/* LEFT — orb + chips */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="flex flex-1 flex-col items-center justify-center gap-3.5 p-[6px_0]">
            <LivingOrb size={170} state="idle" label="Agent sẵn sàng" />
            <div className="text-[12.5px] font-semibold tracking-[.18em] text-[color:var(--ae-azure-soft)]">SẴN SÀNG</div>
          </GlassSlab>
          <div className="flex flex-col gap-2">
            <div className="ae-slab flex items-center justify-between p-[10px_13px] text-xs text-[color:var(--ae-dim)]">
              Tập trung <b className="text-white">{briefing?.priorities.length ?? 0} việc</b>
            </div>
            <div className="ae-slab flex items-center justify-between p-[10px_13px] text-xs text-[color:var(--ae-dim)]">
              Năng lượng hệ thống <b style={{ color: 'var(--ae-ok)' }}>{100 - (briefing?.vitals.cpu ?? 0)}%</b>
            </div>
          </div>
        </div>

        {/* CENTER — brief + bento */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="p-[16px_18px]">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-bold">Brief sáng</h3>
              <span className="font-mono text-[11px] text-[color:var(--ae-dim)]">{status === 'ready' ? '·' : status}</span>
            </div>
            <div className="flex flex-col gap-[9px]">
              {(briefing?.priorities ?? []).map(p => (
                <div key={p.id} className="flex items-start gap-2.5 text-[12.5px] leading-[1.35]"
                  style={{ color: p.severity === 'warn' ? '#FFE6BE' : '#D7ECFA' }}>
                  <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)', boxShadow: `0 0 8px ${p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)'}` }} />
                  {p.title}
                </div>
              ))}
            </div>
          </GlassSlab>

          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[13px]">
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">SERVERS</span>
              <span className="text-[13px] font-semibold leading-[1.3] text-white">
                {servers.map(s => `${s.name} ${s.status === 'ok' ? '✓' : `⚠ ${s.cpu}%`}`).join(' · ')}
              </span>
              <div className="mt-auto"><Gauge value={worstServer?.cpu ?? 0} warn={Boolean(worstServer)} /></div>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">DEALS</span>
              <span className="text-[13px] font-semibold text-white">
                {briefing?.bento.deals ? `${briefing.bento.deals.active} đang chạy · ` : 'Chưa có dữ liệu'}
                {briefing?.bento.deals && <span style={{ background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{briefing.bento.deals.valueLabel}</span>}
              </span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.deals?.sub}</span>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">LỊCH</span>
              <span className="text-[13px] font-semibold text-white">{briefing?.bento.calendar?.count ?? 0} sự kiện</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.calendar?.next}</span>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">AGENTS</span>
              <span className="text-[13px] font-semibold leading-[1.3] text-white">{briefing?.bento.agents?.headline}</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.agents?.sub}</span>
            </GlassSlab>
          </div>
        </div>

        {/* RIGHT — feed + vitals */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="p-[15px_16px]">
            <h4 className="mb-3 text-xs font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">HOẠT ĐỘNG TRỰC TIẾP</h4>
            {(briefing?.feed ?? []).map((f, i) => (
              <div key={i} className="flex items-start gap-[11px] border-b border-[rgba(120,200,255,.08)] py-[7px] last:border-0">
                <span className="w-[42px] flex-none font-mono text-[11px] text-[color:var(--ae-azure)]">{f.time}</span>
                <span className="text-xs leading-[1.3] text-[#D7ECFA]">{f.text}</span>
              </div>
            ))}
          </GlassSlab>
          <GlassSlab className="flex flex-1 flex-col p-[15px_16px]">
            <h4 className="mb-3 text-xs font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">VITALS</h4>
            {([['CPU', briefing?.vitals.cpu ?? 0, (briefing?.vitals.cpu ?? 0) >= 80], ['API', briefing?.vitals.api ?? 0, false], ['Bộ nhớ', briefing?.vitals.memory ?? 0, false]] as const).map(([label, val, warn]) => (
              <div key={label} className="mb-[13px] flex flex-col gap-1.5 last:mb-0">
                <div className="flex justify-between text-[11px] text-[color:var(--ae-dim)]"><span>{label}</span><b className="text-white">{val}%</b></div>
                <Bar value={val} warn={warn} />
              </div>
            ))}
          </GlassSlab>
        </div>
      </div>

      <div className="z-[2] mt-4"><CommandBar onActivate={onCommandPalette} /></div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/command-center.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/command-center.tsx apps/desktop/src/aether/ui/screens/command-center.test.tsx
git commit -m "feat(aether): add Command-Center HUD screen (prompt-cache-safe briefing read)"
```

---

### Task 12: Morning Brief screen

The focus briefing: greeting hero + voice play affordance, the full priority list, and section cards (priorities / servers gauge / calendar). Reads the same `$briefing` store. Also prompt-cache-safe.

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/morning-brief.tsx`
- Create: `apps/desktop/src/aether/ui/screens/morning-brief.test.tsx`

**Interfaces:**
- Consumes: `$briefing`, `$briefingStatus`, `loadBriefing` (Task 9); `GlassSlab`, `Gauge` (Task 10); `useStore`.
- Produces: `MorningBrief({ onPlayVoice?: () => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/screens/morning-brief.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MorningBrief } from './morning-brief'
import { $briefing, $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'
import type { Briefing } from '@/aether/domain/briefing/briefing-schema'

beforeEach(() => {
  $briefing.set(sample as Briefing)
  $briefingStatus.set('ready')
})
afterEach(cleanup)

describe('MorningBrief', () => {
  it('greets by name and lists every priority', () => {
    render(<MorningBrief />)
    expect(screen.getByText(/Bình/)).toBeTruthy()
    expect(screen.getAllByTestId('ae-priority-row')).toHaveLength(4)
  })
  it('renders a warn-styled row for the abnormal server', () => {
    render(<MorningBrief />)
    expect(screen.getByText(/CPU 82%/)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/morning-brief.test.tsx`
Expected: FAIL — cannot find `./morning-brief`.

- [ ] **Step 3: Implement `MorningBrief`**

```tsx
// apps/desktop/src/aether/ui/screens/morning-brief.tsx
import { useEffect } from 'react'
import { useStore } from '@nanostores/react'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Gauge } from '@/aether/ui/components/micro-viz'
import { $briefing, $briefingStatus, loadBriefing } from '@/aether/domain/briefing/briefing-store'

export function MorningBrief({ onPlayVoice }: { onPlayVoice?: () => void }) {
  const briefing = useStore($briefing)

  useEffect(() => {
    if ($briefingStatus.get() === 'idle') void loadBriefing()
  }, [])

  const worstServer = (briefing?.servers ?? []).find(s => s.status !== 'ok')

  return (
    <div className="ae-screen flex h-full flex-col p-[16px_22px_18px]">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '14%', top: '34%' }} />
      <div className="ae-vignette" />

      {/* hero */}
      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[30px] font-semibold leading-[1.05]">
            Chào buổi sáng, <b style={{ background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', textShadow: '0 0 22px rgba(74,163,255,.35)' }}>{briefing?.greetingName ?? 'bạn'}</b>
          </div>
          <div className="text-[13px] text-[#CFE2F7]">
            {briefing?.priorities.length ?? 0} ưu tiên hôm nay
            {worstServer && <span style={{ color: 'var(--ae-warn)', fontWeight: 600 }}> · {worstServer.name} CPU {worstServer.cpu}%</span>}
          </div>
        </div>
        <button type="button" onClick={() => onPlayVoice?.()}
          className="flex flex-none items-center gap-2.5 rounded-[13px] p-[11px_18px]"
          style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)', boxShadow: '0 0 26px rgba(74,163,255,.18)' }}>
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%,#d7f4ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="#06283c"><path d="M8 5v14l11-7z" /></svg>
          </span>
          <span className="flex flex-col">
            <b className="text-[13px]">Nghe brief</b>
            <span className="text-[10.5px] text-[color:var(--ae-dim)]">đọc bằng giọng</span>
          </span>
        </button>
      </div>

      {/* section cards */}
      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1.25fr_1fr_1fr] grid-rows-2 gap-3.5">
        <GlassSlab className="row-span-2 flex flex-col p-[13px_15px]">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">ƯU TIÊN TRONG NGÀY</div>
          <div className="flex min-h-0 flex-col gap-[9px] overflow-auto">
            {(briefing?.priorities ?? []).map(p => (
              <div key={p.id} data-testid="ae-priority-row"
                className="flex items-center gap-[11px] rounded-[11px] p-[9px_11px]"
                style={{ border: `1px solid ${p.severity === 'warn' ? 'rgba(255,176,32,.28)' : 'rgba(120,200,255,.1)'}`, background: p.severity === 'warn' ? 'linear-gradient(160deg,rgba(255,176,32,.08),rgba(255,176,32,.02))' : 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))' }}>
                <span className="h-[7px] w-[7px] flex-none rounded-full" style={{ background: p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)', boxShadow: `0 0 8px ${p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)'}` }} />
                <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.2] text-white">{p.title}</div>
              </div>
            ))}
          </div>
        </GlassSlab>

        <GlassSlab className="flex flex-col p-[13px_15px]">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">SERVERS</div>
          <div className="flex flex-col gap-2">
            {(briefing?.servers ?? []).map(s => (
              <div key={s.name} className="flex items-center gap-[9px] text-[11.5px]">
                <span className="flex-1 font-semibold text-[#D7ECFA]">{s.name}</span>
                <span className="text-[10px] font-semibold" style={{ color: s.status === 'ok' ? 'var(--ae-ok)' : 'var(--ae-warn)' }}>
                  {s.status === 'ok' ? '✓ ổn định' : `⚠ CPU ${s.cpu}%`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto"><Gauge value={worstServer?.cpu ?? 0} warn={Boolean(worstServer)} /></div>
        </GlassSlab>

        <GlassSlab className="flex flex-col p-[13px_15px]">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">LỊCH HÔM NAY</div>
          <div className="text-[13px] font-semibold text-white">{briefing?.bento.calendar?.count ?? 0} sự kiện</div>
          <div className="mt-1 text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.calendar?.next}</div>
        </GlassSlab>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/morning-brief.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/morning-brief.tsx apps/desktop/src/aether/ui/screens/morning-brief.test.tsx
git commit -m "feat(aether): add Morning Brief focus screen"
```

---

### Task 13: Chat screen frame + connection status

A thin AETHER frame that hosts the **reused** chat element (the controller's `chatView`) inside the cinematic shell, with a small thinking orb shown while the agent is busy. Plus a hook deriving online/paused status from the gateway state for the nav-rail online dot and a "paused" overlay.

**Files:**
- Create: `apps/desktop/src/aether/ui/screens/chat-screen.tsx`
- Create: `apps/desktop/src/aether/ui/screens/chat-screen.test.tsx`
- Create: `apps/desktop/src/aether/domain/connection/use-connection-status.ts`

**Interfaces:**
- Consumes: `$busy` and `$gatewayState` from [store/session.ts](../../../apps/desktop/src/store/session.ts); `LivingOrb`; `useStore`. (`$gatewayState` is published by `useGatewayBoot` via `reportPrimaryGatewayState` → `setGatewayState`.)
- Produces:
  - `ChatScreen({ chatView }: { chatView: React.ReactNode })`.
  - `useConnectionStatus(): 'online' | 'paused' | 'connecting'`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/screens/chat-screen.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ChatScreen } from './chat-screen'
import { $busy } from '@/store/session'

beforeEach(() => $busy.set(false))
afterEach(cleanup)

describe('ChatScreen', () => {
  it('renders the injected chat element', () => {
    render(<ChatScreen chatView={<div data-testid="chat-runtime">runtime</div>} />)
    expect(screen.getByTestId('chat-runtime')).toBeTruthy()
  })
  it('shows the thinking orb only while busy', () => {
    const { rerender } = render(<ChatScreen chatView={<div />} />)
    expect(screen.queryByLabelText('Agent đang xử lý')).toBeNull()
    $busy.set(true)
    rerender(<ChatScreen chatView={<div />} />)
    expect(screen.getByLabelText('Agent đang xử lý')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/chat-screen.test.tsx`
Expected: FAIL — cannot find `./chat-screen`.

- [ ] **Step 3: Implement the chat frame + status hook**

```tsx
// apps/desktop/src/aether/ui/screens/chat-screen.tsx
import { useStore } from '@nanostores/react'
import { $busy } from '@/store/session'
import { LivingOrb } from '@/aether/ui/orb/living-orb'

// Hosts the reused @assistant-ui chat runtime untouched; only the frame is AETHER.
export function ChatScreen({ chatView }: { chatView: React.ReactNode }) {
  const busy = useStore($busy)
  return (
    <div className="ae-screen relative flex h-full min-h-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />
      <div className="relative z-[2] flex min-h-0 flex-1 flex-col">{chatView}</div>
      {busy && (
        <div className="pointer-events-none absolute bottom-24 left-6 z-[3] flex items-center gap-3">
          <LivingOrb size={42} state="thinking" label="Agent đang xử lý" />
          <span className="text-[11px] tracking-[.18em] text-[color:var(--ae-azure-soft)]">ĐANG XỬ LÝ…</span>
        </div>
      )}
    </div>
  )
}
```

```ts
// apps/desktop/src/aether/domain/connection/use-connection-status.ts
import { useStore } from '@nanostores/react'
import { $gatewayState } from '@/store/session'

// Maps the live gateway connection state to a coarse UI status for the online dot
// + "paused" overlay. $gatewayState (apps/desktop/src/store/session.ts) holds the
// ConnectionState string published by useGatewayBoot via reportPrimaryGatewayState
// → setGatewayState: 'idle' | 'connecting' | 'open' | 'closed' | 'error'.
export function useConnectionStatus(): 'online' | 'paused' | 'connecting' {
  const state = useStore($gatewayState)
  if (state === 'open') return 'online'
  if (state === 'connecting' || state === 'idle') return 'connecting'
  return 'paused'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/screens/chat-screen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/screens/chat-screen.tsx apps/desktop/src/aether/ui/screens/chat-screen.test.tsx apps/desktop/src/aether/domain/connection/use-connection-status.ts
git commit -m "feat(aether): add Chat screen frame (reused runtime) + connection status hook"
```

---

### Task 14: AetherShell — assemble shell, boot gate, routes

The composition root: the Boot overlay gate, the nav rail + top bar, the AETHER route table (HUD / Brief / Chat reused + deferred stubs), and the "Depth" page transition. Receives the reused `chatView` (and `sidebar`) as props.

**Files:**
- Create: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Create: `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx`
- Create: `apps/desktop/src/aether/index.ts`

**Interfaces:**
- Consumes: `NavRail`, `TopBar`, `PageTransition`, `StubScreen`, `BootSequence`, `CommandCenter`, `MorningBrief`, `ChatScreen`; `useBootProgress`, `$bootDone`; `useConnectionStatus`; `AETHER_NAV_ITEMS`; react-router `Routes`/`Route`/`Navigate`/`useLocation`/`useNavigate`; route constants `HUD_ROUTE`, `BRIEF_ROUTE`, `NEW_CHAT_ROUTE`.
- Produces: `AetherShell({ chatView: React.ReactNode })` and `apps/desktop/src/aether/index.ts` re-exporting `AetherShell`. Boot overlay covers everything until `$bootDone`; then the shell reveals with `.ae-depth-enter`.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AetherShell } from './aether-shell'
import { $bootDone, $bootProgress } from '@/aether/domain/boot/boot-store'
import { HUD_ROUTE } from '@/app/routes'

beforeEach(() => {
  vi.stubGlobal('hermesDesktop', { getBootProgress: vi.fn().mockResolvedValue(null), onBootProgress: () => () => {} })
  $bootDone.set(false)
  $bootProgress.set(null)
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AetherShell', () => {
  it('shows the Boot overlay until boot completes', () => {
    render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
  })
  it('reveals the shell + HUD once boot is done', () => {
    $bootDone.set(true)
    render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
    // nav rail present (brand nav landmark) and HUD command bar visible
    expect(screen.getByRole('navigation', { name: 'HYPERTEK - AGENT PLATFORM' })).toBeTruthy()
    expect(screen.getByText('⌘K')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx`
Expected: FAIL — cannot find `./aether-shell`.

- [ ] **Step 3: Implement `AetherShell`**

```tsx
// apps/desktop/src/aether/ui/shell/aether-shell.tsx
import { useStore } from '@nanostores/react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { BRIEF_ROUTE, HUD_ROUTE, NEW_CHAT_ROUTE } from '@/app/routes'
import { $bootDone } from '@/aether/domain/boot/boot-store'
import { useBootProgress } from '@/aether/domain/boot/use-boot-progress'
import { useConnectionStatus } from '@/aether/domain/connection/use-connection-status'
import { NavRail } from './nav-rail'
import { TopBar } from './top-bar'
import { PageTransition } from './page-transition'
import { AETHER_NAV_ITEMS } from './nav-items'
import { BootSequence } from '@/aether/ui/screens/boot-sequence'
import { CommandCenter } from '@/aether/ui/screens/command-center'
import { MorningBrief } from '@/aether/ui/screens/morning-brief'
import { ChatScreen } from '@/aether/ui/screens/chat-screen'
import { StubScreen } from '@/aether/ui/screens/stub-screen'

const TITLES: Record<string, string> = { [HUD_ROUTE]: 'Trang chủ', [BRIEF_ROUTE]: 'Brief sáng', '/': 'Trò chuyện' }

export function AetherShell({ chatView }: { chatView: React.ReactNode }) {
  useBootProgress()
  const bootDone = useStore($bootDone)
  const status = useConnectionStatus()
  const location = useLocation()
  const navigate = useNavigate()

  if (!bootDone) return <BootSequence />

  const activeItem = AETHER_NAV_ITEMS.find(i => i.route === location.pathname)
  const title = TITLES[location.pathname] ?? activeItem?.label ?? 'AETHER'

  return (
    <div className="ae-depth-enter relative flex h-screen min-h-0 w-screen overflow-hidden">
      <NavRail activeRoute={location.pathname} online={status === 'online'} onNavigate={r => navigate(r)} />
      <div className="flex min-w-0 flex-1 flex-col p-[16px_22px_18px]">
        <TopBar title={title} />
        <div className="relative mt-3 min-h-0 flex-1">
          <PageTransition routeKey={location.pathname}>
            <Routes location={location}>
              <Route index element={<ChatScreen chatView={chatView} />} />
              <Route path=":sessionId" element={<ChatScreen chatView={chatView} />} />
              <Route path={HUD_ROUTE.slice(1)} element={<CommandCenter onCommandPalette={() => { /* wire ⌘K in a later slice */ }} />} />
              <Route path={BRIEF_ROUTE.slice(1)} element={<MorningBrief />} />
              <Route path="agents" element={<StubScreen title="Agents" />} />
              <Route path="skills" element={<StubScreen title="Skills" />} />
              <Route path="memory" element={<StubScreen title="Memory" />} />
              <Route path="cron" element={<StubScreen title="Cron" />} />
              <Route path="settings" element={<StubScreen title="Settings" />} />
              <Route path="*" element={<Navigate replace to={NEW_CHAT_ROUTE} />} />
            </Routes>
          </PageTransition>
        </div>
      </div>
      {status === 'paused' && (
        <div className="absolute inset-0 z-[50] grid place-items-center bg-[rgba(2,12,29,.55)] backdrop-blur-sm">
          <div className="ae-slab px-6 py-4 text-sm text-[color:var(--ae-dim)]">Mất kết nối — đang thử lại…</div>
        </div>
      )}
    </div>
  )
}
```

```ts
// apps/desktop/src/aether/index.ts
export { AetherShell } from './ui/shell/aether-shell'
```

> Note: `chatView` is rendered for both `/` and `/:sessionId` so the reused chat runtime keeps a single mounted instance (its session switching is internal). HUD and Brief mount/unmount freely.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run --environment jsdom src/aether/ui/shell/aether-shell.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell.test.tsx apps/desktop/src/aether/index.ts
git commit -m "feat(aether): assemble AetherShell (boot gate, rail, routes, depth)"
```

---

### Task 15: Replace the controller render with AetherShell + default theme

The integration: swap the controller's `return (<AppShell>…)` block ([desktop-controller.tsx:1188-1262](../../../apps/desktop/src/app/desktop-controller.tsx#L1188-L1262)) for `<AetherShell chatView={chatView} />`, and make `aether`/dark the default theme on first run. Everything above the return (gateway boot, message stream, `chatView`) is reused unchanged. This is the "replace main entry" step — AETHER becomes the only renderer.

**Files:**
- Modify: `apps/desktop/src/app/desktop-controller.tsx` (return block + a default-theme effect)

**Interfaces:**
- Consumes: `AetherShell` from `@/aether`; `chatView` (already built at [desktop-controller.tsx:1091](../../../apps/desktop/src/app/desktop-controller.tsx#L1091)); `useTheme()` from [themes/context.tsx](../../../apps/desktop/src/themes/context.tsx).
- Produces: the running app boots into the AETHER Boot Sequence → HUD; Chat reuses the existing runtime; deferred nav items show stubs.

- [ ] **Step 1: Add a one-time default-theme effect** near the controller's other `useEffect`s (after the gateway hooks). It sets `aether`/dark only when the user has not already chosen an AETHER preference, so it never overrides an explicit choice.

```tsx
// apps/desktop/src/app/desktop-controller.tsx — add import at top
import { AetherShell } from '@/aether'
import { useTheme } from '@/themes/context'

// inside DesktopController(), with the other hooks:
const { themeName, setTheme, setMode } = useTheme()
useEffect(() => {
  const KEY = 'aether-default-applied'
  if (localStorage.getItem(KEY)) return
  if (themeName !== 'aether') {
    setTheme('aether')
    setMode('dark')
  }
  localStorage.setItem(KEY, '1')
}, [themeName, setTheme, setMode])
```

- [ ] **Step 2: Replace the return block.** Swap the entire `return ( <AppShell …> … </AppShell> )` ([1188-1262](../../../apps/desktop/src/app/desktop-controller.tsx#L1188-L1262)) with:

```tsx
  return <AetherShell chatView={chatView} />
```

Leave everything above untouched (`chatView`, `sidebar`, panes, overlays, all callbacks). Unused locals that the old `AppShell` consumed (e.g. `previewPane`, `terminalPane`, `sidebar`) may now be unreferenced — if the build's `unused-imports`/TS `noUnusedLocals` flags them, prefix with `void` (e.g. `void previewPane`) or remove the now-dead pane locals. Do not remove the runtime hooks or `chatView`.

- [ ] **Step 3: Typecheck + lint**

Run (from `apps/desktop`): `npm run typecheck && npm run lint`
Expected: PASS. Fix any unused-variable errors from the removed `AppShell` props per Step 2.

- [ ] **Step 4: Run the full UI test suite**

Run: `npm run test:ui`
Expected: PASS (all AETHER tests + the existing suite). Investigate any regressions before proceeding.

- [ ] **Step 5: Manual smoke test with fake boot** (no real backend needed)

Run: `npm run dev:fake-boot`
Expected: window opens to the AETHER Boot Sequence (orb + checklist filling + loader to ~90% + "HYPERTEK - AGENT PLATFORM"), then Depth-transitions into the HUD. Click the nav rail: HUD ↔ Brief ↔ Chat slide the active indicator; deferred items show the stub. Toggle the OS reduced-motion setting and confirm animations degrade to fades.

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/app/desktop-controller.tsx
git commit -m "feat(aether): make AETHER the renderer — swap controller shell, default aether/dark theme"
```

---

### Task 16: Trigger briefing refresh on connect + full verification

Wire the briefing to refresh when the gateway becomes ready, run the full verification gate (typecheck, lint, unit, desktop platform tests), and document how to register the briefing cron job. (Connection status was already wired concretely in Task 13.)

**Files:**
- Modify: `apps/desktop/src/app/desktop-controller.tsx` (call `loadBriefing()` when the gateway becomes ready)
- Create: `docs/superpowers/notes/aether-briefing-cron-setup.md`

**Interfaces:**
- Consumes: `loadBriefing` (Task 9); the existing gateway-ready callback in the controller (`onGatewayReady`/`onConnectionReady` passed to `useGatewayBoot` at [desktop-controller.tsx:895](../../../apps/desktop/src/app/desktop-controller.tsx#L895)).
- Produces: HUD/Brief auto-refresh once connected; full green verification gate; setup docs.

- [ ] **Step 1: Trigger a briefing load when the gateway is ready.** In the controller's gateway-ready path (the `onConnectionReady`/`onGatewayReady` callback wired into `useGatewayBoot`), add a fire-and-forget `void loadBriefing()` (import from `@/aether/domain/briefing/briefing-store`). This keeps the HUD/Brief fresh without any `message.delta` subscription — prompt-cache-safe.

```tsx
// in the gateway-ready callback inside DesktopController:
import { loadBriefing } from '@/aether/domain/briefing/briefing-store'
// …
void loadBriefing()
```

- [ ] **Step 2: Write the cron setup note**

```markdown
<!-- docs/superpowers/notes/aether-briefing-cron-setup.md -->
# AETHER Morning Briefing — cron setup

The HUD + Brief read the latest run of a cron job whose **name is exactly**
`morning-briefing-aggregator` (see `BRIEFING_JOB_NAME`). Create it once:

- **Name:** `morning-briefing-aggregator`
- **Schedule:** `0 7 * * *` (07:00 daily) — adjust as desired
- **Skills:** enable `morning-briefing-aggregator` (+ `google-workspace`, and the user's
  `hypertekvn-main-server-manage` / `h-workspace-server-manage` if installed)
- **Prompt:** "Run the morning-briefing-aggregator skill and emit today's briefing JSON artifact."
- **Deliver:** `local`

Create via the existing cron REST surface (POST `/api/cron/jobs`) or the Hermes cron UI.
The job runs in its own session, so it never disturbs the prompt cache of the user's
live conversation. The renderer reads the latest run via
`GET /api/cron/jobs/<id>/runs?limit=1` → the run session's messages → the JSON artifact.

Until the job has run at least once, the HUD/Brief show the empty state.
```

- [ ] **Step 3: Full verification gate**

Run (from `apps/desktop`):
```bash
npm run typecheck
npm run lint
npm run test:ui
```
Expected: all PASS. Then run the electron platform tests to confirm no shell regressions:
```bash
npm run test:desktop:platforms
```
Expected: PASS (these cover boot/connection/window infra the AETHER shell sits on).

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/app/desktop-controller.tsx docs/superpowers/notes/aether-briefing-cron-setup.md
git commit -m "feat(aether): refresh briefing on connect; document briefing cron setup"
```

---

## Spec Coverage Map

| Spec section | Requirement | Task(s) |
| --- | --- | --- |
| §3.2 / §6 Foundation | Transport reuse (gateway client + reconnect) | Reused untouched; surfaced via Task 13 status + Task 15 swap |
| §3.3 | Reuse chat/streaming/tool-call (restyle only) | Task 13 (frame) + Task 15 (reuse `chatView`) |
| §4.1–4.2 | Brand palette + dual dark/light theme | Tasks 1–2 |
| §4.3 | Orbitron / Be Vietnam Pro / JetBrains Mono | Task 1 (fontUrl) + Task 2 (`--ae-font-display`) |
| §4.4 | Glass slab, nav rail, online dot (no big pill), Living Orb, command bar, micro-viz | Tasks 2,3,4,10,11 |
| §4.5 | Vietnamese UI; never "Đại lý"; platform name | Tasks 4 (test-enforced), 7, 9 |
| §4.6 | Nav-slide spring + "Depth" page transition + reduced-motion | Tasks 2,4,5,14 |
| §5 #1 Boot Sequence | Orb+rings+checklist+tagline | Tasks 6,7 |
| §5 #2 Command-Center HUD | Cockpit bento + command bar | Task 11 |
| §5 #3 Brief sáng | Focus briefing + voice | Task 12 |
| §5 #4 Chat | Streaming + tool-call (reused) | Task 13 |
| §6 Proof pillar | Morning Briefing aggregator | Tasks 8,9,16 |
| §7 | Cron-artifact mechanism (reuse cron runs API) | Tasks 8,9,16 |
| §8 | Prompt-cache safety (no message.delta on HUD/Brief); boot-failure → log; paused overlay | Tasks 9,11,12 (REST-only); 7 (log); 14 (paused) |
| §9 | Unit tests (transport/stores/components) + per-screen render+interaction tests | every task; Task 16 gate |

**Deferred (correctly out of this slice):** Dev cockpit, Inbox+CRM, Content, full Operations, Agents/Skills/Memory/Cron UIs, full Command Palette, full Settings, Voice, Onboarding, WebGL/Three.js ambient motion (separate "motion/cinematic" sub-project), multi-tenant/billing/auth.
