# AETHER SP-2 · Plan 2 — Default Light "Arctic Glass" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first-run AETHER default paint Light ("Arctic Glass") instead of Dark, while still letting an explicit user choice win and persist.

**Architecture:** The first-run paint currently lives inline in a `useEffect` in `desktop-controller.tsx` (`setMode('dark')`). Extract that decision into a pure, unit-testable helper `applyAetherDefaultOnce(...)`, flip the default to `'light'`, and have the controller effect call the helper. The extraction is a behavior-preserving refactor whose only intended change is Dark → Light — it exists so the first-run paint can be asserted without mounting the entire controller.

**Tech Stack:** TypeScript, React effect, `localStorage`, vitest + jsdom.

## Global Constraints

(Inherited from SP-2 Plan 1 — same rules apply.)

- **0 Python core changes.**
- **Keep the hardened runtime** — restyle/refactor only, no rewrites of streaming/gateway/cmdk cores.
- **Brand `#07397d`** via tokens; never hardcode colors outside `--ae-*` / `--dt-*`.
- **Localization (hard):** Vietnamese UI; never translate "Agent" → "Đại lý".
- **Prompt-cache safety (hard):** no delta subscriptions on non-chat surfaces.
- **A user's explicit theme/mode choice always wins and is persisted** — the first-run default only runs once (gated by the `aether-default-applied` localStorage key).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/app/apply-aether-default.ts` | Pure helper: on first run only, set theme `aether` + the default mode, then record the one-shot key. The single place the first-run default decision lives. |
| `apps/desktop/src/app/apply-aether-default.test.ts` | Unit tests: first run paints **light**; second run is a no-op; an already-`aether` theme still records the key. |
| `apps/desktop/src/app/desktop-controller.tsx:222-237` | Replace the inline first-run effect body with a call to the helper. |

---

### Task 1: Extract + flip the first-run default to Light

**Files:**
- Create: `apps/desktop/src/app/apply-aether-default.ts`
- Test: `apps/desktop/src/app/apply-aether-default.test.ts`

**Interfaces:**
- Consumes: `ThemeMode` from `@/themes/context` (the mode union accepted by `setMode`).
- Produces: `applyAetherDefaultOnce(opts: ApplyAetherDefaultOpts): void`, `ApplyAetherDefaultOpts`.

- [ ] **Step 1: Write the failing test**

Create `apps/desktop/src/app/apply-aether-default.test.ts`:

```typescript
import { describe, expect, it, vi } from 'vitest'

import { applyAetherDefaultOnce } from './apply-aether-default'

function makeStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    has: (k: string) => map.has(k)
  }
}

describe('applyAetherDefaultOnce', () => {
  it('first run paints AETHER + light, then records the one-shot key', () => {
    const storage = makeStorage()
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'github', setTheme, setMode, storage })

    expect(setTheme).toHaveBeenCalledWith('aether')
    expect(setMode).toHaveBeenCalledWith('light')
    expect(storage.has('aether-default-applied')).toBe(true)
  })

  it('does nothing on a later run (key already present) — user choice is preserved', () => {
    const storage = makeStorage({ 'aether-default-applied': '1' })
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'dracula', setTheme, setMode, storage })

    expect(setTheme).not.toHaveBeenCalled()
    expect(setMode).not.toHaveBeenCalled()
  })

  it('records the key even when the theme is already AETHER (no redundant repaint)', () => {
    const storage = makeStorage()
    const setTheme = vi.fn()
    const setMode = vi.fn()

    applyAetherDefaultOnce({ themeName: 'aether', setTheme, setMode, storage })

    expect(setTheme).not.toHaveBeenCalled()
    expect(setMode).not.toHaveBeenCalled()
    expect(storage.has('aether-default-applied')).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/app/apply-aether-default.test.ts`
Expected: FAIL — `apply-aether-default` module does not exist.

- [ ] **Step 3: Implement the helper**

Create `apps/desktop/src/app/apply-aether-default.ts`:

```typescript
import type { ThemeMode } from '@/themes/context'

const KEY = 'aether-default-applied'

export interface ApplyAetherDefaultOpts {
  themeName: string
  setTheme: (name: string) => void
  setMode: (mode: ThemeMode) => void
  // Injected so the first-run paint is unit-testable; defaults to localStorage.
  storage?: Pick<Storage, 'getItem' | 'setItem'>
}

// First run only: paint AETHER + the default LIGHT mode ("Arctic Glass"), then
// record a one-shot key so a later explicit user theme/mode choice is never
// overridden. SP-2 flips this default from Dark to Light.
export function applyAetherDefaultOnce({ themeName, setTheme, setMode, storage }: ApplyAetherDefaultOpts): void {
  const store = storage ?? localStorage

  if (store.getItem(KEY)) { return }

  if (themeName !== 'aether') {
    setTheme('aether')
    setMode('light')
  }

  store.setItem(KEY, '1')
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/app/apply-aether-default.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/app/apply-aether-default.ts apps/desktop/src/app/apply-aether-default.test.ts
git commit -m "feat(aether): first-run default paints Light Arctic Glass (extracted + tested)"
```

---

### Task 2: Wire the controller effect to the helper

**Files:**
- Modify: `apps/desktop/src/app/desktop-controller.tsx:222-237`

**Interfaces:**
- Consumes: `applyAetherDefaultOnce` from `./apply-aether-default`.

- [ ] **Step 1: Add the import**

In `apps/desktop/src/app/desktop-controller.tsx`, add to the local imports block (near the other `./` imports, e.g. just below the `import { ChatView } from './chat'` group — keep import ordering consistent with the file):

```typescript
import { applyAetherDefaultOnce } from './apply-aether-default'
```

- [ ] **Step 2: Replace the inline first-run effect body**

Find this block (currently around lines 222–237):

```typescript
  // First run paints AETHER/dark as the default appearance, then records that
  // it did so — so a later explicit user theme choice is never overridden.
  const { themeName, setTheme, setMode } = useTheme()
  useEffect(() => {
    const KEY = 'aether-default-applied'

    if (localStorage.getItem(KEY)) {
      return
    }

    if (themeName !== 'aether') {
      setTheme('aether')
      setMode('dark')
    }

    localStorage.setItem(KEY, '1')
  }, [themeName, setTheme, setMode])
```

Replace it with:

```typescript
  // First run paints AETHER + Light "Arctic Glass" as the default appearance,
  // then records that it did so — so a later explicit user theme choice is never
  // overridden. The decision lives in a pure, unit-tested helper.
  const { themeName, setTheme, setMode } = useTheme()
  useEffect(() => {
    applyAetherDefaultOnce({ themeName, setTheme, setMode })
  }, [themeName, setTheme, setMode])
```

- [ ] **Step 3: Verify the controller still type-checks and the helper test passes**

Run: `cd apps/desktop && npx tsc --noEmit -p tsconfig.json && npx vitest run src/app/apply-aether-default.test.ts`
Expected: tsc reports no errors for `desktop-controller.tsx`; the helper test passes.

> If the repo has no `tsconfig.json` at `apps/desktop/` or `tsc` is not the configured type-check entry, run the project's type-check script instead (check `apps/desktop/package.json` `scripts` for `typecheck`/`build`), e.g. `cd apps/desktop && npm run typecheck`.

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/src/app/desktop-controller.tsx
git commit -m "feat(aether): controller first-run effect calls the Light default helper"
```

---

## Self-Review

- **Spec §5.6 / §8 first-run paint flips Dark → Light:** Task 1 helper returns `setMode('light')`, Task 2 wires it. ✓
- **Spec §5.6 user choice still wins + persists:** the one-shot `aether-default-applied` key gate is preserved; Task 1 test asserts the no-op-on-later-run path. ✓
- **Spec §8 "update the first-run paint test → assert setMode('light')":** there was no prior test; Task 1 creates the canonical one against the extracted helper. ✓
- **Global constraint: behavior-preserving refactor, no runtime rewrite:** only the default mode value changes; the effect's gating logic is identical. ✓
- **Placeholder scan:** concrete code + exact line range + a fallback type-check note. ✓
- **Type consistency:** `applyAetherDefaultOnce` / `ApplyAetherDefaultOpts` names match across helper, test, and controller. ✓
```
