# ⌘K Command Palette Implementation Plan (AETHER SP-1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the already-built cmdk command palette into the AETHER desktop shell — de-inert the ⌘K chip, connect the shell no-op + keybind, extend the "Go to" catalog with all AETHER routes (incl. Memory), add per-screen primary actions, and restyle the overlay with `--ae-*` Depth tokens that honour `prefers-reduced-motion`.

**Architecture:** Reuse the existing palette at `apps/desktop/src/app/command-palette/index.tsx` (its `PaletteItem`/`PaletteGroup`/`PalettePage` shapes, `paletteFilter`, nested-page mechanism) plus the existing `$commandPalette*` nanostores and the existing keybind action `nav.commandPalette` (already mapped to `toggleCommandPalette` in `use-keybinds.ts`). The new work is: (1) de-inert the `CommandBar` ⌘K chip; (2) replace the shell's `onCommandPalette` no-op with `openCommandPalette()` and **mount `<CommandPalette/>` inside the AETHER shell** (it is currently never rendered in the AETHER tree); (3) add the AETHER routes + a `MEMORY_ROUTE` constant + per-screen action items to the catalog; (4) restyle the overlay surface/transition via `--ae-*` tokens behind the SP-0 motion gate. No cmdk core rewrite, no new registry.

**Tech Stack:** React 18, nanostores, cmdk (`@/components/ui/command`), radix Dialog, react-router-dom `useNavigate`, Tailwind (`--ae-*` tokens in `src/aether/ui/theme/aether.css`), vitest + jsdom + @testing-library/react.

## Global Constraints
- Keep the tempered runtime — do NOT rewrite the cmdk core; reuse the existing registry/filter/keybind, only add items + theme. Restyle via tokens/className.
- Brand `#07397d` via tokens. NO hardcoded colors outside `--ae-*` / `--dt-*`.
- Localization (hard): Vietnamese UI. NEVER translate "Agent" → "Đại lý". Platform name "HYPERTEK - AGENT PLATFORM".
- Prompt-cache safety (hard): palette navigation only triggers `navigate(route)` / store actions — never subscribe to `message.delta`/`reasoning.delta`/`thinking.*`, never call `appendAssistantDelta`, never re-trigger the LLM.
- Respect `prefers-reduced-motion` + the SP-0 motion gate on the overlay open/close transition (Depth: scale/blur/fade).
- `--ae-*` resolve only when `[data-aether-theme='aether']`; geometry mode-independent.

---

## Key Decision — REUSE (locked)

The spec says reuse the existing cmdk palette + stores + keybind, only adding catalog items + AETHER theme and wiring the chip. After reading the target files this is fully viable:

- `apps/desktop/src/app/command-palette/index.tsx` exports `CommandPalette()` which reads `$commandPaletteOpen`/`$commandPalettePage` and drives a radix `Dialog`. It is self-contained — it needs only a router context (`useNavigate`), a theme context (`useTheme`), an i18n context (`useI18n`), and a react-query client. The AETHER shell already lives under those providers (it is rendered by `desktop-controller.tsx` at line 905, inside the app's router/theme/query tree).
- The keybind action id is **`nav.commandPalette`** (confirmed `actions.ts:87`, defaults `['mod+k','mod+p']`), already wired to `toggleCommandPalette` in `use-keybinds.ts:119`. The spec's literal `command-palette:toggle` is **wrong** — use `nav.commandPalette`. No keybind change is needed; ⌘K already flips the store globally.
- The only structural gap: **`<CommandPalette/>` is never mounted in the AETHER shell** (grep for `<CommandPalette` returns only the no-op comment). So the store flips but nothing renders. Task 2 mounts it.

**Contingency (do NOT execute unless blocked):** if mounting the web `CommandPalette` inside the AETHER shell turns out to be coupled to the old web layout (e.g. it throws because a required provider is absent in the AETHER tree), fall back to extracting the cmdk core (`Command`/`CommandGroup`/`CommandItem` + `paletteFilter` + the `PaletteGroup`/`PaletteItem` shapes) into an AETHER-local registry of the *same shape*. This is a last resort; default is direct reuse.

### Symbol mismatches corrected (confirmed against source)
- Keybind action: `nav.commandPalette` (NOT `command-palette:toggle`).
- Store actions confirmed present in `src/store/command-palette.ts`: `openCommandPalette`, `closeCommandPalette`, `toggleCommandPalette`, `setCommandPaletteOpen`, `openCommandPalettePage`, plus atoms `$commandPaletteOpen` / `$commandPalettePage`.
- `MEMORY_ROUTE` does **not** exist in `routes.ts`; `/memory` is a literal in `nav-items.tsx:26` and `aether-shell.tsx:56`. Task 3 adds the constant and re-points both literals.
- AETHER nav labels are literal Vietnamese strings inside AETHER components (`nav-items.tsx`, `command-bar.tsx`), not i18n keys. New AETHER-specific catalog rows (Home/Brief/Memory) use the same literal-VN convention; pre-existing rows keep their `t.commandCenter.*` labels.

---

## Task 1 — De-inert the ⌘K chip in `CommandBar`

**Files:**
- Modify: `apps/desktop/src/aether/ui/components/command-bar.tsx`
- Test (Create): `apps/desktop/src/aether/ui/components/command-bar.test.tsx`

**Interfaces:**
- Consumes: existing `CommandBar({ placeholder?, onActivate? })` prop contract (unchanged).
- Produces: the ⌘K chip is no longer `aria-disabled` / "Sắp ra mắt"; the whole bar's existing `onClick`/`Enter` handler already calls `onActivate?.()`.

- [ ] **Step 1 — Failing test: chip is enabled and click calls `onActivate`.**
  Create `apps/desktop/src/aether/ui/components/command-bar.test.tsx`:
  ```tsx
  // apps/desktop/src/aether/ui/components/command-bar.test.tsx
  import { cleanup, fireEvent, render, screen } from '@testing-library/react'
  import { afterEach, describe, expect, it, vi } from 'vitest'

  import { CommandBar } from './command-bar'

  afterEach(cleanup)

  describe('CommandBar', () => {
    it('renders an enabled ⌘K chip (no "coming soon" inert state)', () => {
      render(<CommandBar />)
      const chip = screen.getByText('⌘K')
      expect(chip.getAttribute('aria-disabled')).toBeNull()
      expect(chip.getAttribute('title')).toBeNull()
      expect(chip.className).not.toMatch(/cursor-not-allowed/)
    })

    it('calls onActivate when the bar is clicked', () => {
      const onActivate = vi.fn()
      render(<CommandBar onActivate={onActivate} />)
      fireEvent.click(screen.getByRole('button'))
      expect(onActivate).toHaveBeenCalledTimes(1)
    })

    it('calls onActivate on Enter', () => {
      const onActivate = vi.fn()
      render(<CommandBar onActivate={onActivate} />)
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
      expect(onActivate).toHaveBeenCalledTimes(1)
    })
  })
  ```

- [ ] **Step 2 — Run, expect FAIL.**
  ```
  cd apps/desktop && npm run test:ui -- command-bar
  ```
  Expected: the first test FAILS — `expect(chip.getAttribute('aria-disabled')).toBeNull()` receives `"true"` (the chip still ships `aria-disabled="true"` / `title="Sắp ra mắt"` / `cursor-not-allowed`).

- [ ] **Step 3 — Minimal impl: de-inert the chip.**
  Replace the whole file `apps/desktop/src/aether/ui/components/command-bar.tsx` with:
  ```tsx
  export function CommandBar({ placeholder = 'Nói hoặc gõ lệnh cho Aether…', onActivate }: { placeholder?: string; onActivate?: () => void }) {
    return (
      <div
        className="ae-cmd cursor-text"
        onClick={() => onActivate?.()}
        onKeyDown={e => { if (e.key === 'Enter') {onActivate?.()} }}
        role="button"
        tabIndex={0}
      >
        <div className="grid h-[38px] w-[38px] flex-none place-items-center rounded-[11px]"
          style={{ background: 'radial-gradient(circle at 35% 30%,#d7f4ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
          <svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
            <rect fill="#06283c" height={11} rx={3} width={6} x={9} y={3} />
            <path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke="#06283c" strokeLinecap="round" strokeWidth={1.8} />
          </svg>
        </div>
        <span className="flex-1 text-sm text-[#A9CFE8]">{placeholder}</span>
        <span className="rounded-[var(--ae-radius-sm)] border border-[color:var(--ae-line)] bg-[rgba(120,200,255,.06)] px-[11px] py-1.5 font-mono text-xs text-[color:var(--ae-dim)]">
          ⌘K
        </span>
      </div>
    )
  }
  ```
  (Removed `aria-disabled="true"`, `title="Sắp ra mắt"`, `cursor-not-allowed`, and `opacity-60`. The `onClick`/`Enter` → `onActivate` wiring on the outer `div` is unchanged — that is the existing activation path. The two SVG `#06283c` literals are pre-existing icon-glyph fills inside an inline brand gradient, not theme surface colours; leave them as-is, the restyle in Task 5 governs the overlay, not this chip glyph.)

- [ ] **Step 4 — Run, expect PASS.**
  ```
  cd apps/desktop && npm run test:ui -- command-bar
  ```
  Expected: all three `CommandBar` tests pass.

- [ ] **Step 5 — Commit.**
  ```
  git add apps/desktop/src/aether/ui/components/command-bar.tsx apps/desktop/src/aether/ui/components/command-bar.test.tsx
  git commit -m "feat(aether-desktop): de-inert the ⌘K command-bar chip

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 2 — Wire the shell: mount the palette + connect the chip to the store

**Files:**
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx`
- Test (Modify): `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx`

**Interfaces:**
- Consumes: `openCommandPalette` / `$commandPaletteOpen` from `@/store/command-palette`; `CommandPalette` from `@/app/command-palette` (default export path is the index — confirm the import below); existing `CommandCenter` `onCommandPalette?: () => void` prop.
- Produces: `<CommandPalette/>` rendered inside the AETHER shell; the HUD's CommandBar `onActivate` (via `CommandCenter onCommandPalette`) now calls `openCommandPalette()`, which flips `$commandPaletteOpen` to `true`.

- [ ] **Step 1 — Failing test: activating the HUD command bar opens the palette store.**
  Append to `apps/desktop/src/aether/ui/shell/aether-shell.test.tsx` (after the existing `describe` blocks; also add `fireEvent` to the `@testing-library/react` import and import the store atom + reset it). First update the imports at the top of the file:
  ```tsx
  import { cleanup, fireEvent, render, screen } from '@testing-library/react'
  ```
  ```tsx
  import { $commandPaletteOpen, closeCommandPalette } from '@/store/command-palette'
  ```
  Add to the existing top-level `beforeEach` (the one that stubs globals) a reset so tests start closed:
  ```tsx
    closeCommandPalette()
  ```
  Then append this block:
  ```tsx
  describe('AetherShell ⌘K wiring', () => {
    beforeEach(() => { $bootDone.set(true); closeCommandPalette() })

    it('the HUD command bar opens the command palette store on click', () => {
      expect($commandPaletteOpen.get()).toBe(false)
      render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
      // The CommandBar wraps the ⌘K chip; clicking the bar triggers onActivate → openCommandPalette().
      fireEvent.click(screen.getByText('⌘K').closest('[role="button"]') as HTMLElement)
      expect($commandPaletteOpen.get()).toBe(true)
    })

    it('mounts the command palette dialog when the store is open', () => {
      $commandPaletteOpen.set(true)
      render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
      // radix Dialog renders the palette search input once open.
      expect(screen.getByPlaceholderText(/Search sessions, views, and actions/i)).toBeTruthy()
    })
  })
  ```

- [ ] **Step 2 — Run, expect FAIL.**
  ```
  cd apps/desktop && npm run test:ui -- aether-shell
  ```
  Expected: the new "opens the command palette store on click" test FAILS — `$commandPaletteOpen.get()` stays `false` because `CommandCenter`'s `onCommandPalette` is the `/* wire ⌘K in a later slice */` no-op; the "mounts the command palette dialog" test FAILS because `<CommandPalette/>` is never rendered in the shell (no search input found).

- [ ] **Step 3 — Minimal impl: import + render the palette, replace the no-op.**
  In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`:

  Add imports (group with the existing `@/app/*` import block):
  ```tsx
  import { CommandPalette } from '@/app/command-palette'
  import { openCommandPalette } from '@/store/command-palette'
  ```
  (If `@/app/command-palette` does not resolve to the `index.tsx` barrel, import from `@/app/command-palette/index` — verify by checking that `apps/desktop/src/app/command-palette/index.tsx` is the module that `export function CommandPalette()`; it is.)

  Replace the `CommandCenter` route's no-op:
  ```tsx
                <Route element={<CommandCenter onCommandPalette={() => { /* wire ⌘K in a later slice */ }} />} path={HUD_ROUTE.slice(1)} />
  ```
  with:
  ```tsx
                <Route element={<CommandCenter onCommandPalette={openCommandPalette} />} path={HUD_ROUTE.slice(1)} />
  ```

  Mount the palette once at shell scope so ⌘K works from every AETHER route (not just the HUD). Add `<CommandPalette />` as the last child of the outer shell `div`, just before its closing `</div>` — i.e. after the `status === 'paused'` overlay block:
  ```tsx
        {status === 'paused' && (
          <div className="absolute inset-0 z-[50] grid place-items-center bg-[rgba(2,12,29,.55)] backdrop-blur-sm">
            <GlassSlab className="text-sm text-[color:var(--ae-dim)]" size="md">Mất kết nối — đang thử lại…</GlassSlab>
          </div>
        )}
        <CommandPalette />
      </div>
    )
  }
  ```

- [ ] **Step 4 — Run, expect PASS.**
  ```
  cd apps/desktop && npm run test:ui -- aether-shell
  ```
  Expected: all `aether-shell` tests pass (existing boot/layering tests + the two new ⌘K wiring tests).

- [ ] **Step 5 — Commit.**
  ```
  git add apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
  git commit -m "feat(aether-desktop): mount + wire the ⌘K command palette in the AETHER shell

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 3 — Extend the catalog: add the MEMORY_ROUTE constant + all 9 AETHER routes

**Files:**
- Modify: `apps/desktop/src/app/routes.ts` (add `MEMORY_ROUTE`)
- Modify: `apps/desktop/src/aether/ui/shell/nav-items.tsx` (re-point `/memory` literal)
- Modify: `apps/desktop/src/aether/ui/shell/aether-shell.tsx` (re-point `/memory` literal)
- Modify: `apps/desktop/src/app/command-palette/index.tsx` (add Memory/Home/Brief rows to the "Go to" group)
- Test (Create): `apps/desktop/src/app/command-palette/catalog.test.tsx`

**Interfaces:**
- Consumes: route constants `SETTINGS_ROUTE`, `SKILLS_ROUTE`, `CRON_ROUTE`, `PROFILES_ROUTE`, `MESSAGING_ROUTE`, `ARTIFACTS_ROUTE`, `AGENTS_ROUTE`, `HUD_ROUTE`, `BRIEF_ROUTE`, `NEW_CHAT_ROUTE`, and the new `MEMORY_ROUTE`; the existing `PaletteItem`/`PaletteGroup` shapes and the `go(path)` navigate helper.
- Produces: a new exported pure builder `aetherGoToItems(go, t)` (so it is unit-testable without rendering the whole palette) consumed by the existing "Go to" group; new `MEMORY_ROUTE = '/memory'`.

**Note on labels:** existing "Go to" rows already cover Settings/Skills/Messaging/Artifacts/Cron/Profiles/Agents (via `t.commandCenter.nav.*` / `t.*.title`). This task ADDS the three AETHER-only destinations missing from the catalog — **Home (HUD)**, **Brief sáng**, **Memory** — and the **Chat** entry already exists as `nav-new` (`run: go(NEW_CHAT_ROUTE)`). New rows use literal Vietnamese labels matching `nav-items.tsx` (`'Trang chủ'`, `'Brief sáng'`, `'Memory'`) — do NOT translate "Agent".

- [ ] **Step 1 — Failing test: `MEMORY_ROUTE` constant exists.**
  Create `apps/desktop/src/app/command-palette/catalog.test.tsx`:
  ```tsx
  // apps/desktop/src/app/command-palette/catalog.test.tsx
  import { describe, expect, it, vi } from 'vitest'

  import {
    AGENTS_ROUTE,
    ARTIFACTS_ROUTE,
    BRIEF_ROUTE,
    CRON_ROUTE,
    HUD_ROUTE,
    MEMORY_ROUTE,
    MESSAGING_ROUTE,
    NEW_CHAT_ROUTE,
    PROFILES_ROUTE,
    SETTINGS_ROUTE,
    SKILLS_ROUTE
  } from '@/app/routes'

  import { aetherGoToItems } from './index'

  describe('command palette AETHER catalog', () => {
    it('exposes a MEMORY_ROUTE constant', () => {
      expect(MEMORY_ROUTE).toBe('/memory')
    })

    it('contains a Go-to entry for every AETHER route', () => {
      const navigate = vi.fn()
      const go = (path: string) => () => navigate(path)
      // Minimal t stub: only the keys aetherGoToItems reads.
      const t = {
        commandCenter: { nav: { newChat: { title: 'Trò chuyện' }, settings: { title: 'Cài đặt' }, skills: { title: 'Skills' }, messaging: { title: 'Tin nhắn' }, artifacts: { title: 'Artifacts' } } },
        shell: { statusbar: { cron: 'Cron' } },
        profiles: { title: 'Hồ sơ' },
        agents: { title: 'Agents' }
      } as never

      const routes = aetherGoToItems(go, t).map(item => {
        navigate.mockClear()
        item.run?.()
        return navigate.mock.calls[0]?.[0]
      })

      for (const route of [NEW_CHAT_ROUTE, HUD_ROUTE, BRIEF_ROUTE, SETTINGS_ROUTE, SKILLS_ROUTE, MEMORY_ROUTE, MESSAGING_ROUTE, ARTIFACTS_ROUTE, CRON_ROUTE, PROFILES_ROUTE, AGENTS_ROUTE]) {
        expect(routes).toContain(route)
      }
    })

    it('selecting the Memory item navigates to /memory', () => {
      const navigate = vi.fn()
      const go = (path: string) => () => navigate(path)
      const t = {
        commandCenter: { nav: { newChat: { title: 'Trò chuyện' }, settings: { title: 'Cài đặt' }, skills: { title: 'Skills' }, messaging: { title: 'Tin nhắn' }, artifacts: { title: 'Artifacts' } } },
        shell: { statusbar: { cron: 'Cron' } },
        profiles: { title: 'Hồ sơ' },
        agents: { title: 'Agents' }
      } as never
      const memory = aetherGoToItems(go, t).find(item => item.id === 'nav-memory')
      expect(memory).toBeTruthy()
      memory?.run?.()
      expect(navigate).toHaveBeenCalledWith(MEMORY_ROUTE)
    })
  })
  ```

- [ ] **Step 2 — Run, expect FAIL.**
  ```
  cd apps/desktop && npm run test:ui -- command-palette/catalog
  ```
  Expected: FAILS at module load / typecheck — `MEMORY_ROUTE` is not exported from `@/app/routes` and `aetherGoToItems` is not exported from `./index`. vitest reports `No "MEMORY_ROUTE" export is defined` (or `aetherGoToItems is not a function`).

- [ ] **Step 3a — Add `MEMORY_ROUTE` to `routes.ts`.**
  In `apps/desktop/src/app/routes.ts`, after the `BRIEF_ROUTE` line:
  ```ts
  export const BRIEF_ROUTE = '/brief'
  ```
  add:
  ```ts
  export const MEMORY_ROUTE = '/memory'
  ```
  (Leave `APP_ROUTES`/`AppView`/`OVERLAY_VIEWS` untouched — Memory is an AETHER-shell-only route, not a web `AppView`; adding it to those unions is out of scope and would force unrelated edits.)

- [ ] **Step 3b — Re-point the `/memory` literals to the constant.**
  In `apps/desktop/src/aether/ui/shell/nav-items.tsx`, update the import:
  ```tsx
  import { BRIEF_ROUTE, HUD_ROUTE, MEMORY_ROUTE } from '@/app/routes'
  ```
  and the memory nav row:
  ```tsx
    { id: 'memory', route: MEMORY_ROUTE, label: 'Memory', icon: I('M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z') },
  ```
  In `apps/desktop/src/aether/ui/shell/aether-shell.tsx`, add `MEMORY_ROUTE` to the routes import line and update the route element:
  ```tsx
                <Route element={<StubScreen title="Memory" />} path={MEMORY_ROUTE.slice(1)} />
  ```

- [ ] **Step 3c — Add the `aetherGoToItems` builder + extra rows in the palette.**
  In `apps/desktop/src/app/command-palette/index.tsx`:

  Add `BRIEF_ROUTE`, `HUD_ROUTE`, `MEMORY_ROUTE` to the route-constants import block (the `from '../routes'` import):
  ```tsx
  import {
    AGENTS_ROUTE,
    ARTIFACTS_ROUTE,
    BRIEF_ROUTE,
    COMMAND_CENTER_ROUTE,
    CRON_ROUTE,
    HUD_ROUTE,
    MEMORY_ROUTE,
    MESSAGING_ROUTE,
    NEW_CHAT_ROUTE,
    PROFILES_ROUTE,
    sessionRoute,
    SETTINGS_ROUTE,
    SKILLS_ROUTE
  } from '../routes'
  ```
  Add the icons used by the new rows to the `@/lib/icons` import block: `Home`, `FileText` (confirm both export from `@/lib/icons`; if a name is absent, substitute an existing one — `Home`→`Activity`, `FileText`→`Archive` — but check first with `grep -n "Home\|FileText" src/lib/icons.ts`).

  Define an exported pure builder **above** `export function CommandPalette()` (so the test can import it without rendering). It returns the "Go to" group's items — the existing inline list, extended with Home/Brief/Memory:
  ```tsx
  /** The AETHER "Go to" catalog: every navigable AETHER route, as palette rows.
   *  Pure + exported so it can be unit-tested without rendering the palette. */
  export function aetherGoToItems(go: (path: string) => () => void, t: ReturnType<typeof useI18n>['t']): PaletteItem[] {
    const cc = t.commandCenter

    return [
      { action: 'session.new', icon: Plus, id: 'nav-new', keywords: ['chat', 'create', 'trò chuyện'], label: cc.nav.newChat.title, run: go(NEW_CHAT_ROUTE) },
      { icon: Home, id: 'nav-home', keywords: ['home', 'hud', 'trang chủ', 'command center'], label: 'Trang chủ', run: go(HUD_ROUTE) },
      { icon: FileText, id: 'nav-brief', keywords: ['brief', 'morning', 'brief sáng', 'tóm tắt'], label: 'Brief sáng', run: go(BRIEF_ROUTE) },
      { action: 'view.showTerminal', icon: Terminal, id: 'nav-terminal', keywords: ['terminal', 'shell', 'console'], label: t.keybinds.actions['view.showTerminal'], run: () => setTerminalTakeover(true) },
      { action: 'nav.settings', icon: Settings, id: 'nav-settings', label: cc.nav.settings.title, run: go(SETTINGS_ROUTE) },
      { action: 'nav.skills', icon: Wrench, id: 'nav-skills', keywords: ['tools', 'toolsets'], label: cc.nav.skills.title, run: go(SKILLS_ROUTE) },
      { icon: Cpu, id: 'nav-memory', keywords: ['memory', 'context', 'ký ức', 'bộ nhớ'], label: 'Memory', run: go(MEMORY_ROUTE) },
      { action: 'nav.messaging', icon: MessageCircle, id: 'nav-messaging', label: cc.nav.messaging.title, run: go(MESSAGING_ROUTE) },
      { action: 'nav.artifacts', icon: Package, id: 'nav-artifacts', label: cc.nav.artifacts.title, run: go(ARTIFACTS_ROUTE) },
      { action: 'nav.cron', icon: Clock, id: 'nav-cron', keywords: ['schedule', 'jobs'], label: t.shell.statusbar.cron, run: go(CRON_ROUTE) },
      { action: 'nav.profiles', icon: Users, id: 'nav-profiles', label: t.profiles.title, run: go(PROFILES_ROUTE) },
      { action: 'nav.agents', icon: Cpu, id: 'nav-agents', label: t.agents.title, run: go(AGENTS_ROUTE) }
    ]
  }
  ```
  (The `view.showTerminal` row stays in the "Go to" group exactly as before, preserving order. `nav-memory` reuses `Cpu` only if `Home`/`FileText` import cleanly; if you imported them, leave Memory on `Cpu` — it has no dedicated icon and that's acceptable.)

  Now replace the inline `items: [ … ]` array of the first (`heading: cc.goTo`) group inside `baseGroups` with a call to the builder:
  ```tsx
        {
          heading: cc.goTo,
          items: aetherGoToItems(go, t)
        },
  ```
  Leave the other three groups (`commandCenter`, `appearance`, `settings`) unchanged.

- [ ] **Step 4 — Run, expect PASS.**
  ```
  cd apps/desktop && npm run test:ui -- command-palette/catalog
  ```
  Expected: all three catalog tests pass. Then run the broader suite to catch the literal re-points:
  ```
  cd apps/desktop && npm run test:ui -- aether-shell command-bar command-palette
  ```
  Expected: green.

- [ ] **Step 5 — Commit.**
  ```
  git add apps/desktop/src/app/routes.ts apps/desktop/src/aether/ui/shell/nav-items.tsx apps/desktop/src/aether/ui/shell/aether-shell.tsx apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx
  git commit -m "feat(aether-desktop): add MEMORY_ROUTE + full AETHER route catalog to ⌘K palette

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 4 — Per-screen primary action items (deep-link with route + nested page)

**Files:**
- Modify: `apps/desktop/src/app/command-palette/index.tsx` (add an "Actions" group with per-screen primary actions)
- Test (Modify): `apps/desktop/src/app/command-palette/catalog.test.tsx`

**Interfaces:**
- Consumes: `go`, the `PaletteItem` shape, route constants, and the existing nested-page `to` mechanism (`SETTINGS_ROUTE?tab=…` deep-links already used elsewhere in the file).
- Produces: an exported pure builder `aetherActionItems(go, t)` returning the per-screen primary actions; consumed by a new `cc.* ` (literal "Hành động nhanh") group in `baseGroups`.

**Scope (3 confirmed deep-links that need no new backend):**
- **Settings: đổi model** → `go(`${SETTINGS_ROUTE}?tab=config:model`)` (the Settings screen already accepts `?tab=config:<section>`; `model` is the canonical model section id used by the existing `SECTIONS.map` rows — verify a `model` section exists with `grep -n "id: 'model'" src/app/settings/constants.ts`; if the id differs, use the real id).
- **Skills: mở Skills** → `go(SKILLS_ROUTE)` (the deep "bật/tắt một skill" toggle needs a skill id we don't have at catalog-build time; ship the route-nav action now — this satisfies "at least the route-nav items exist").
- **Cron: tạo job** → `go(`${CRON_ROUTE}?new=1`)` (route-nav + a `new` query the Cron screen can honour; if the Cron screen ignores unknown queries it still lands on the right screen — acceptable per spec "deep-link can open the route + a nested page").

- [ ] **Step 1 — Failing test: the three primary actions exist and route correctly.**
  Append to `apps/desktop/src/app/command-palette/catalog.test.tsx`:
  ```tsx
  import { aetherActionItems } from './index'

  describe('command palette per-screen actions', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const t = { } as never

    it('offers a "đổi model" action that deep-links into Settings', () => {
      navigate.mockClear()
      const item = aetherActionItems(go, t).find(i => i.id === 'act-settings-model')
      expect(item).toBeTruthy()
      item?.run?.()
      expect(navigate).toHaveBeenCalledWith('/settings?tab=config:model')
    })

    it('offers a Skills action that opens the Skills screen', () => {
      navigate.mockClear()
      const item = aetherActionItems(go, t).find(i => i.id === 'act-skills-open')
      expect(item).toBeTruthy()
      item?.run?.()
      expect(navigate).toHaveBeenCalledWith('/skills')
    })

    it('offers a Cron "tạo job" action', () => {
      navigate.mockClear()
      const item = aetherActionItems(go, t).find(i => i.id === 'act-cron-create')
      expect(item).toBeTruthy()
      item?.run?.()
      expect(navigate).toHaveBeenCalledWith('/cron?new=1')
    })
  })
  ```

- [ ] **Step 2 — Run, expect FAIL.**
  ```
  cd apps/desktop && npm run test:ui -- command-palette/catalog
  ```
  Expected: FAILS — `aetherActionItems is not a function` (no such export yet).

- [ ] **Step 3 — Minimal impl: add the `aetherActionItems` builder + group.**
  In `apps/desktop/src/app/command-palette/index.tsx`, add another exported pure builder near `aetherGoToItems`:
  ```tsx
  /** Per-screen primary actions (deep-links). Pure + exported for unit tests. */
  export function aetherActionItems(go: (path: string) => () => void, _t: ReturnType<typeof useI18n>['t']): PaletteItem[] {
    return [
      { icon: Settings, id: 'act-settings-model', keywords: ['model', 'đổi model', 'change model', 'llm', 'settings'], label: 'Cài đặt: đổi model', run: go(`${SETTINGS_ROUTE}?tab=config:model`) },
      { icon: Wrench, id: 'act-skills-open', keywords: ['skills', 'bật', 'tắt', 'toggle', 'tools'], label: 'Skills: bật/tắt', run: go(SKILLS_ROUTE) },
      { icon: Clock, id: 'act-cron-create', keywords: ['cron', 'tạo job', 'create', 'schedule', 'new'], label: 'Cron: tạo job', run: go(`${CRON_ROUTE}?new=1`) }
    ]
  }
  ```
  Add a new group to `baseGroups` — insert it directly after the `cc.goTo` group and before `cc.commandCenter`:
  ```tsx
        {
          heading: 'Hành động nhanh',
          items: aetherActionItems(go, t)
        },
  ```
  (Literal Vietnamese heading "Hành động nhanh" = "Quick actions"; consistent with the AETHER literal-VN convention. If `grep -n "id: 'model'" src/app/settings/constants.ts` shows the model section id is not `model`, change `config:model` to `config:<realId>` in both the builder and the Step 1 test.)

- [ ] **Step 4 — Run, expect PASS.**
  ```
  cd apps/desktop && npm run test:ui -- command-palette/catalog
  ```
  Expected: all catalog + per-screen-action tests pass.

- [ ] **Step 5 — Commit.**
  ```
  git add apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/catalog.test.tsx
  git commit -m "feat(aether-desktop): add per-screen primary actions to the ⌘K palette

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Task 5 — Restyle the overlay with `--ae-*` tokens + Depth transition honouring reduced-motion

**Files:**
- Modify: `apps/desktop/src/aether/ui/theme/aether.css` (add the `.ae-palette` surface + Depth open/close + reduced-motion guard)
- Modify: `apps/desktop/src/app/command-palette/index.tsx` (apply `ae-palette` to the dialog content when the AETHER theme is active)
- Test (Create): `apps/desktop/src/app/command-palette/palette-motion.test.tsx`

**Interfaces:**
- Consumes: the existing radix `DialogPrimitive.Content` `data-[state=open|closed]` selectors; the SP-0 reduced-motion convention (`@media (prefers-reduced-motion: reduce)` blocks already present in `aether.css`).
- Produces: an `.ae-palette` class providing the AETHER surface (token-driven) + a Depth (scale/blur/fade) open animation that collapses to a plain fade under reduced-motion; applied to the palette content only under `[data-aether-theme='aether']`.

**Design note:** the existing palette content uses `HUD_SURFACE` + radix zoom/slide utility classes. We must NOT remove the web styling (the same component still renders in the web shell). Instead we ADD `ae-palette` as an extra class; `--ae-*` selectors only resolve under `[data-aether-theme='aether']`, so the AETHER surface overrides apply only in the AETHER tree and the web shell is unaffected.

- [ ] **Step 1 — Failing test: the palette content carries the `ae-palette` class and the CSS guards motion.**
  Create `apps/desktop/src/app/command-palette/palette-motion.test.tsx`:
  ```tsx
  // apps/desktop/src/app/command-palette/palette-motion.test.tsx
  import { readFileSync } from 'node:fs'
  import { fileURLToPath } from 'node:url'

  import { describe, expect, it } from 'vitest'

  const css = readFileSync(
    fileURLToPath(new URL('../../aether/ui/theme/aether.css', import.meta.url)),
    'utf8'
  )
  const palette = readFileSync(
    fileURLToPath(new URL('./index.tsx', import.meta.url)),
    'utf8'
  )

  describe('AETHER palette restyle', () => {
    it('applies the ae-palette class to the dialog content', () => {
      expect(palette).toContain("'ae-palette'")
    })

    it('defines a token-driven ae-palette surface (no raw hex)', () => {
      const block = css.slice(css.indexOf('.ae-palette {'), css.indexOf('}', css.indexOf('.ae-palette {')))
      expect(block).toContain('var(--ae-')
      expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    })

    it('ships a Depth open animation (scale + blur + fade)', () => {
      expect(css).toContain('@keyframes ae-palette-in')
      expect(css).toMatch(/ae-palette-in[\s\S]*scale/)
      expect(css).toMatch(/ae-palette-in[\s\S]*blur/)
    })

    it('collapses the Depth animation to a plain fade under reduced motion', () => {
      const rm = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
      expect(rm).toContain('.ae-palette')
    })
  })
  ```

- [ ] **Step 2 — Run, expect FAIL.**
  ```
  cd apps/desktop && npm run test:ui -- palette-motion
  ```
  Expected: FAILS — `'ae-palette'` is not in `index.tsx`, and `.ae-palette {` / `@keyframes ae-palette-in` do not exist in `aether.css`.

- [ ] **Step 3a — Add the token-driven surface + Depth transition to `aether.css`.**
  Append to `apps/desktop/src/aether/ui/theme/aether.css` (after the existing `.ae-depth-enter` / `@keyframes ae-depth` block, before the `@media (prefers-reduced-motion: reduce)` block — so the keyframes are defined outside the media query):
  ```css
  /* ⌘K command palette — AETHER surface + Depth open transition.
     --ae-* resolve only under [data-aether-theme='aether'], so adding this class
     to the shared palette leaves the web shell untouched. */
  [data-aether-theme='aether'] .ae-palette {
    background: linear-gradient(180deg, var(--ae-glass-hi), var(--ae-glass-lo));
    border: 1px solid var(--ae-line);
    border-radius: var(--ae-radius-lg);
    box-shadow: var(--ae-shadow-slab);
    backdrop-filter: blur(18px) saturate(1.2);
  }
  [data-aether-theme='aether'] .ae-palette[data-state='open'] {
    animation: ae-palette-in 0.22s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  [data-aether-theme='aether'] .ae-palette[data-state='closed'] {
    animation: ae-palette-out 0.16s ease both;
  }
  @keyframes ae-palette-in {
    from { opacity: 0; transform: translateX(-50%) scale(0.97); filter: blur(6px); }
    to { opacity: 1; transform: translateX(-50%) scale(1); filter: blur(0); }
  }
  @keyframes ae-palette-out {
    from { opacity: 1; transform: translateX(-50%) scale(1); }
    to { opacity: 0; transform: translateX(-50%) scale(0.98); }
  }
  ```
  (The `HUD_POSITION` class is `fixed left-1/2 top-3 -translate-x-1/2`, so the content is already X-centred via a `-translate-x-1/2`; the keyframes re-assert `translateX(-50%)` so the scale animation composes correctly instead of dropping the centring transform. Verify the token names `--ae-glass-hi`, `--ae-glass-lo`, `--ae-line`, `--ae-shadow-slab`, `--ae-radius-lg` exist with `grep -n "ae-glass-hi\|ae-glass-lo\|ae-line\|ae-shadow-slab\|ae-radius-lg" src/aether/ui/theme/aether.css`; substitute the nearest existing token if a name differs — e.g. if there is no `--ae-glass-hi`, reuse the `.ae-cmd` recipe's surface tokens. NO raw hex in the `.ae-palette` block.)

  Inside the existing `@media (prefers-reduced-motion: reduce)` block, add a rule that strips the transform/blur and collapses to a fade:
  ```css
    [data-aether-theme='aether'] .ae-palette[data-state='open'] { animation: ae-fade 0.18s ease both; }
    [data-aether-theme='aether'] .ae-palette[data-state='closed'] { animation: none !important; }
  ```
  (`ae-fade` is already defined inside that media block by the existing `.ae-depth-enter` reduced-motion rule — reuse it; do not redefine.)

- [ ] **Step 3b — Apply `ae-palette` to the dialog content in `index.tsx`.**
  In `apps/desktop/src/app/command-palette/index.tsx`, add `'ae-palette'` to the `DialogPrimitive.Content` `className` `cn(...)` list (keep all existing classes — the web radix zoom/slide utilities still drive the web shell; `ae-palette`'s animations only bind under the AETHER theme):
  ```tsx
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className={cn(
              HUD_POSITION,
              HUD_SURFACE,
              'ae-palette',
              'z-[210] w-[min(34rem,calc(100vw-2rem))] overflow-hidden duration-150 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 data-[state=open]:zoom-in-95'
            )}
          >
  ```

- [ ] **Step 4 — Run, expect PASS.**
  ```
  cd apps/desktop && npm run test:ui -- palette-motion
  ```
  Expected: all four restyle/motion tests pass. Then the full palette + shell sweep:
  ```
  cd apps/desktop && npm run test:ui -- command-palette command-bar aether-shell palette-motion
  ```
  Expected: green.

- [ ] **Step 5 — Commit.**
  ```
  git add apps/desktop/src/aether/ui/theme/aether.css apps/desktop/src/app/command-palette/index.tsx apps/desktop/src/app/command-palette/palette-motion.test.tsx
  git commit -m "feat(aether-desktop): restyle the ⌘K palette overlay with --ae-* Depth transition

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
  ```

---

## Final verification

- [ ] **Full desktop test suite + typecheck.**
  ```
  cd apps/desktop && npm run test:ui && npm run typecheck
  ```
  Expected: all tests pass; no TypeScript errors. (If `typecheck` is not a script, use `npx tsc --noEmit -p tsconfig.json`; confirm the script name first with `grep -n '"typecheck"\|"lint"' package.json`.)

- [ ] **Lint the touched files.**
  ```
  cd apps/desktop && npm run lint
  ```
  Expected: clean (or only pre-existing warnings unrelated to the touched files).

---

## Self-Review vs spec §5.3 (COMMAND_PALETTE overlay)

Confirm each spec bullet is satisfied before declaring done:

- [ ] **"Wire + restyle palette cmdk đã tồn tại … Tái dùng store `$commandPaletteOpen` / `$commandPalettePage` + keybind action."** — Task 2 mounts the existing `CommandPalette` (no rewrite) in the AETHER shell; it already reads `$commandPaletteOpen`/`$commandPalettePage`; the keybind action `nav.commandPalette` (real id; spec's `command-palette:toggle` corrected) is unchanged and already flips the store via `toggleCommandPalette`.
- [ ] **"Gỡ inert: chip ⌘K trong command-bar.tsx bỏ aria-disabled/title; nối onActivate/onCommandPalette (no-op ở aether-shell.tsx)."** — Task 1 removes `aria-disabled`/`title="Sắp ra mắt"`/`cursor-not-allowed`/`opacity-60`; Task 2 replaces the `onCommandPalette` no-op with `openCommandPalette`.
- [ ] **"Restyle: áp --ae-* token + Depth transition (scale/blur/fade) cho overlay; tôn trọng prefers-reduced-motion."** — Task 5 adds `.ae-palette` (token-only surface, no raw hex) + `@keyframes ae-palette-in` (scale+blur+fade) and a reduced-motion fade-only fallback, both scoped to `[data-aether-theme='aether']`.
- [ ] **"Mở rộng catalog: thêm 9 route AETHER (Settings/Skills/Cron/Profiles/Messaging/Memory/Agents/Artifacts/HUD-Brief-Chat) + action chính mỗi màn."** — Task 3 adds the missing Home(HUD)/Brief/Memory rows (Chat already present as `nav-new`) so all destinations are reachable; Task 4 adds the per-screen primary actions (Settings: đổi model, Skills: bật/tắt, Cron: tạo job). `MEMORY_ROUTE` added to `routes.ts` and literals re-pointed.
- [ ] **"Không trùng lặp: dùng lại registry/filter/keybind đã có, chỉ bổ sung item + theme."** — No new cmdk core, no new registry, no new keybind; only catalog item builders (`aetherGoToItems`/`aetherActionItems`) + a CSS class. REUSE decision locked; extract-to-AETHER-registry remains an unexecuted contingency.
- [ ] **Localization** — all new labels/headings are Vietnamese literals matching the AETHER convention; "Agent"/"Agents" never translated to "Đại lý".
- [ ] **Prompt-cache safety** — every new item's `run` is `navigate(route)` or a store/`setTerminalTakeover` call; none touch `message.delta`/`reasoning.delta`/`thinking.*` or `appendAssistantDelta`.
