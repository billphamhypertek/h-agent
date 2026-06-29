# Desktop Design System

Conventions for the Electron desktop app (`apps/desktop`). Read this before
adding a component, overlay, or style. The rule of thumb: **one source per
concern, tokens over literals, flat over boxed.** If you reach for a raw color,
a one-off shadow, a bespoke button, or a hardcoded `px-*` on a control — stop,
there's already a primitive for it.

## Principles

1. **Flat, not boxed.** No card-in-card, no divider borders inside a panel.
   Group with whitespace and a single hairline, never nested rounded boxes.
2. **Borderless + shadow for elevation.** Overlays float on `shadow-nous` + a
   `--stroke-nous` hairline, not hard borders.
3. **One primitive per concern.** One `Button`, one set of control variants,
   one `SearchField`, one `Loader`, one `ErrorState`. Migrate onto them; don't
   fork.
4. **Tokens, not literals.** Reference CSS vars (`--ui-*`, `--shadow-nous`,
   `--theme-*`), never raw hex / ad-hoc rgba in components.
5. **Style lives in the primitive.** Variants and sizes own padding, radius,
   color, chrome. Call sites pass a `variant`/`size`, not `className` overrides
   that re-specify those.

## Surfaces & elevation

Every overlay / dialog / toast (boot-failure, install, notifications,
model-picker, onboarding, prompt-overlays, updates, base `Dialog`) uses:

```
shadow-nous           /* downward-weighted, layered contact→ambient falloff */
border-(--stroke-nous) /* currentColor hairline, theme-adaptive */
```

Both are CSS vars in `src/styles.css` — tune in one place, everything inherits.
Don't add per-overlay `shadow-[…]` or `border-(--ui-stroke-secondary)`
one-offs; if elevation needs to change, change the token.

## Stroke & color tokens

| Token | Use |
| --- | --- |
| `--ui-stroke-primary…quaternary` | hairlines, in descending strength |
| `--ui-stroke-tertiary` | the default in-panel divider / list hairline |
| `--stroke-nous` | the overlay hairline (pairs with `shadow-nous`) |
| `--ui-text-primary / -secondary / -tertiary` | text hierarchy |
| `--ui-bg-quaternary` | soft control fill (secondary button) |
| `--chrome-action-hover` | hover fill for quiet controls |
| `--theme-primary`, `--ui-accent` | brand/accent |

Never hardcode `border-gray-*`, `bg-white`, `text-black`, etc. The white tile in
`BrandMark` is the one sanctioned literal (the mark needs a fixed backdrop).

## Buttons — one component

`src/components/ui/button.tsx` is the single source. Pick a `variant` + `size`;
do **not** pass `h-*`, `px-*`, `py-*`, or icon-size overrides.

**Variants:** `default` (primary), `destructive`, `secondary` (soft fill —
the default non-primary look), `outline` (transparent + 1px inset ring, no
fill/shadow), `ghost`, `link`, `text` (boxless quiet inline — "Cancel",
"Clear"), `textStrong` (bold underlined inline affordance — "Change",
"Open logs").

**Sizes:** `default`, `xs`, `sm`, `lg`, `inline` (flush, zero box — for buttons
that sit inside a heading/sentence; replaces `h-auto px-0 py-0`), and the icon
family `icon` / `icon-xs` / `icon-sm` / `icon-lg` / `icon-titlebar`.

Notes:
- Text buttons are square (no radius) and sized by padding + line-height (no
  fixed heights). Only icon buttons carry the shared 4px radius.
- SVGs inherit `size-3.5` (`size-3` at `xs`). Don't re-set icon size.
- Polymorph with `asChild` when the button must render as a link/Slot.

## Form controls

- **`controlVariants`** (`src/components/ui/control.ts`) is the shared shape for
  `Input` / `Textarea` / `SelectTrigger`. New text-entry controls compose it.
- **`SearchField`** — borderless, underline-on-focus, auto-width. The only
  search input. Don't build boxed search bars; don't wrap it in a bordered tile.
  Empty lists hide their search field.
- **`SegmentedControl`** — the choice control for small mutually-exclusive sets
  (color mode, tool-call display, usage period). Replaces radio piles and
  pill rows.
- **`Switch`** (`size="xs"`) — bare, with `aria-label`. No bordered text wrapper.

## Layout

- **Gutters:** `PAGE_INSET_X` (`src/app/layout-constants.ts`) for page side
  padding; `PAGE_INSET_NEG_X` to bleed a child to the edge. Don't hardcode
  `px-6`/`px-8` on pages.
- **Master/detail overlays:** `OverlaySplitLayout` + `OverlaySidebar` /
  `OverlayMain`. Cron, profiles, etc. ride this — don't rebuild a titlebar
  shell.
- **Rows:** `ListRow` (settings `primitives.tsx`) for label/description/action
  rows. Flat, flush-left; no per-row indentation that fights flush headers.
- **No dividers between rows** unless the list genuinely needs them; prefer
  spacing. When you do need one, it's a single `--ui-stroke-tertiary` hairline.

## Feedback & empty/error/loading states

- **Loading:** `Loader` (`src/components/ui/loader.tsx`) — animated math/ascii
  curves (`lemniscate-bloom` for long ops). Never ship the literal text
  "Loading…".
- **Errors:** `ErrorState` + the canonical `ErrorIcon` (no bg chip). One look
  for the React boundary, in-dialog errors, and the boot-failure banner. Pass
  nodes for title/description so Radix `DialogTitle`/`Description` can flow
  through for a11y.
- **Logs:** `LogView` — no bg, hairline border, tight padding, small mono.
  Every place we surface raw logs uses it.
- **Empty:** `EmptyState` / `EmptyPanel` — don't hand-roll centered empties.

## Iconography & brand

- **`Codicon`** is the icon set. No mixing icon libraries inline.
- **`BrandMark`** (`src/components/brand-mark.tsx`) is the brand glyph — the
  `nous-girl` mark on a white tile, softly rounded, identical in light/dark.
  It replaced scattered Sparkles glyphs in updates / onboarding / about. Use it
  for hero/brand moments; don't reintroduce decorative star/sparkle icons.

## Motion

- Quick, functional transitions (~100ms on controls). Respect
  `prefers-reduced-motion` for anything beyond a fade.
- Choreographed exits (e.g. onboarding's "matrix" fade-down) stagger per-element
  then settle the surface — the outer container's fade is *delayed* so it
  doesn't swallow the inner animation. Don't let a global fade race the detail.

## i18n

- Every user-facing string goes through `useI18n()` (`src/i18n/context.tsx`).
  No literals in JSX.
- **Update all locales together** — `en`, `ja`, `zh`, `zh-hant`. A string change
  in `en.ts` that skips the others is a regression (drifted punctuation,
  stale labels). Keep trailing-punctuation and tone consistent across all four.

## State (TypeScript)

Mirrors the repo TS style (see root `AGENTS.md`):

- Shared/cross-component state → small **nanostores**, not prop-drilling.
  Each feature owns its atoms; shared atoms live in `src/store`.
- Rendering components subscribe with `useStore`; non-render actions read with
  `$atom.get()`.
- Colocated action modules over god hooks. A hook owns one narrow job.
- Keep persistence beside the atom that owns it. Route roots stay thin.
- Prefer `interface` for public props; extend React primitives
  (`React.ComponentProps<'button'>`, `Omit<…>`).

## Affordances

- `cursor-pointer` at the primitive level (Button, dropdown/select) — don't
  hardcode it per call site.
- Global focus-ring reset; titlebar actions have no active-background state.
- `Esc` closes every dismissable overlay/dialog (install/onboarding excluded);
  close is an x-icon, not the word "Close".

## Before you add something — checklist

- [ ] Reuse a primitive (`Button`, `SearchField`, `SegmentedControl`,
      `ListRow`, `Loader`, `ErrorState`, `LogView`) instead of forking one?
- [ ] Tokens (`--ui-*`, `shadow-nous`, `--stroke-nous`) — zero raw colors /
      one-off shadows?
- [ ] No `className` overriding a primitive's padding / size / radius / chrome?
- [ ] Overlay uses `shadow-nous` + `border-(--stroke-nous)`, no hard border?
- [ ] Flat — no card-in-card, no gratuitous row dividers?
- [ ] All four locales updated for any new/changed string?
- [ ] `cursor-pointer`, focus ring, and `Esc`-to-close behave?

## AETHER — sanctioned isolated cinematic subtree (`src/aether/`)

`src/aether/` is a **sanctioned isolated subtree** for the AETHER cinematic desktop
shell. It carries its own `--ae-*` geometry/colour token scale (see
`src/aether/ui/theme/`) that is intentionally separate from the product-wide
`--ui-*` tokens. This does **not** violate "one source per concern": the `--ae-*`
scale is the single source for the cinematic shell, and `geometry.ts` is the single
numeric source feeding the CSS tokens. Outside `aether/`, keep using `--ui-*`.

**Bridge points (test-pinned in `src/aether/ui/theme/geometry.test.ts`)** — where the
isolated `--ae-*` scale must agree with the rest of the app:

- `--ae-titlebar-inset` ← `TITLEBAR_HEIGHT` from `src/app/shell/titlebar.ts`
  (`GEOMETRY.titlebarInset === TITLEBAR_HEIGHT === 34`).
- `--ae-page-*` ↔ `layout-constants.ts` page gutters (`GEOMETRY.page`).
- `--ae-nav-w` ↔ the native nav width mirrored in `electron/main.cjs`
  (`GEOMETRY.nav.width`).

**WebGL cinematic layer (SP-0).** A single shared R3F `<Canvas frameloop="demand">`
(`ui/motion/aether-canvas.tsx`) is mounted at the shell root (z0, full-bleed) behind
`.ae-shell-bg`. It hosts the ambient-field shader plane and the WebGL Living Orb
(GLSL template strings in `ui/motion/shaders/`, with in-shader bloom). The brand hex
values inside the GLSL uniforms (navy `#07397d`, azure `#4aa3ff`) are the **sanctioned
in-shader exception** to "tokens not literals". Perf guards: DPR capped to `[1, 1.75]`
(pure `pickDpr`), self-pause on `document.hidden`/idle (pure `shouldRenderFrame`, since
`backgroundThrottling` is false in main), GL disposed on unmount, `invalidate()` on
demand. The Canvas is **multi-layer gated**: `AetherCanvas` returns `null` when
`useMotionEnabled()` is false (reduced-motion + remote-display + WebGL probe), and the
CSS orb / `.ae-shell-bg` is the always-present accessible fallback. The CSS orb stays
the `role="status"` a11y node in every mode and tracks `$orbState`
(`thinking|idle|paused`); Boot keeps its own boot-store state.

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

## HUD (`/hud`) — sessions constellation

- HUD is the first real screen to render the #0 living engine with real state. It
  **composes** a `GraphSpec` from session snapshots and pushes it into the shared
  `$graphSpec`; the shell-root `AetherCanvas` renders it. The HUD never mounts its
  own `<Canvas>`.
- **Logic core (jsdom-tested, prompt-cache safe):**
  - `domain/engine/sessions-graph.ts` — `AgentSessionRow[]` → `GraphSpec` (cap 12,
    active-first ordering, deterministic constellation layout, `busy/online/dormant`).
  - `domain/engine/lifecycle-differ.ts` — diff prev/next snapshot → `mitosis/flow/
    inhale/crystallize/prune` events (coarse metadata only — no token/tool stream).
  - `domain/agents/use-agents-poll.ts` — read-only `$agents` poll ~5s, paused when hidden.
  - `ui/screens/hud/use-hud-graph.ts` — `reconcileGraph` (enter/exit hints) + wiring +
    `$hudLifecycle`; clears `$graphSpec` on unmount.
- **Bridge points:** `NodeSpec.enter/exit` (mitosis-in / fade-to-core); link `flow`
  for busy tendrils; `coreOrbState()` drives the constellation core vital. Node
  interaction is a DOM hit-layer (`constellation-overlay.tsx`), not GL raycast,
  because the shared canvas is `pointer-events:none`.
- **Fallback:** reduced-motion / GPU-off / probe-fail → no Canvas → `GraphFallback`
  renders the same `GraphSpec` statically; the 4 ambient widgets + DOM overlay stay.

## Chat — Living Cockpit (SP-4 #3)

- Chat is the only screen wired to the live stream, so it has **two consumers**
  with a hard wall between them:
  - **Per-token thread path** (untouched, only restyled): `message.delta` /
    `reasoning.delta` / `thinking.delta` → `$messages` → `<Thread>`. Fast, ~30×/s,
    React-local.
  - **Coarse engine path** (new): tool / sub-agent / turn boundaries only → the GL
    dock. It must never see a token.
- **`$turnActivity` (`domain/session/turn-activity.ts`) is the cache-safe surface.**
  Hard-rule: **the engine never subscribes `$messages`** — it subscribes
  `$turnActivity` instead. The reducer is coarse-only (`message.start` /
  `message.complete` / `tool.start` / `tool.complete` / `subagent.start`); an
  `ignored` / unknown event returns state **by reference** so a per-token event
  can't even allocate. Fed by `recordTurnEvent(...)` planted at the **coarse
  branches** of `app/session/hooks/use-message-stream.ts` (NOT in the
  `message.delta` / `reasoning.delta` / `thinking.delta` branches), so the
  prompt-cache stays intact (no engine recompute per token).
- **Dock (logic core, jsdom-tested, deterministic):**
  - `domain/engine/chat-graph.ts` — `chatGraph(turnActivity, subagents)` → `GraphSpec`.
    Nodes = sub-agents (`sub:<id>`, nearest the core) + tool buds (`tool:<id>`) +
    one `+k` overflow (`more`); **bud cap 6**; `dockLayout` is a deterministic fan
    to the right (no RNG / `Date`) so throttled recomputes never jitter coords.
    `reconcileChatGraph` mirrors the HUD differ: new id → `enter` (lean-in),
    dropped id → one-cycle `exit` ghost → fade-to-core.
  - `ui/screens/chat/use-chat-graph.ts` — reads `$turnActivity` + the active
    session's subagents, throttles (150ms leading + trailing) and pushes the
    reconciled spec to the shared `$graphSpec` the shell-root `AetherCanvas`
    renders; resets the reconcile baseline on session switch and **clears
    `$graphSpec` on unmount** so leaving Chat doesn't strand a dock on the HUD.
- **Dock interaction** is a DOM hit-layer (`living-dock.tsx`), not GL raycast,
  because the shared canvas is `pointer-events:none`: a `read_file` bud opens the
  reader; any other bud scrolls to + flashes its inline thread row (`#ae-tool-<id>`).
- **Reader:** `$readerPanel` (`domain/chat/reader-store.ts`) — a **manual "Mở"**
  trigger (card button / dock bud), `.md` MVP rendered via `MarkdownTextContent`.
  It is a **static snapshot**: opening does one `$messages.get()` (never a
  subscription) so there is no per-token re-render. Opening narrows the thread and
  slims the dock; ✕ restores the layout.
- **Event → lifecycle-phase map:** `message.start`→`reach`, `tool.start`→`flow`,
  `tool.complete`→`crystallize`, `subagent.start`→`mitosis`,
  `message.complete`→`breathe`.
- **Fallback:** reduced-motion / GPU-off / probe-fail → no Canvas → `GraphFallback`
  renders the same dock `GraphSpec` statically (SVG); thread + reader + composer all
  stay live.
