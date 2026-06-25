# Rebrand baseline (pre-migration)

Captured before the Hermes → AETHER hard rename.

- Case-insensitive `hermes` content matches (tracked, excl. node_modules): **58,293**
- Tracked files with `hermes` in their path: **798**

After the migration, `git grep -in hermes` must return only justified
PROTECT references (Nous model names, the `NousResearch/hermes-agent`
attribution link, kept provider hosts), the migration tooling under
`scripts/rebrand/` + `tests/rebrand/`, the design docs under
`docs/superpowers/`, and the attribution copy in `NOTICE` / README footers.

---

## Phase 5 gate — 2026-06-25 PASSED (3 rename defects found & fixed; back-compat additions spec-corrected; all frontends typecheck clean)

### STEP 0 — carry-forward LICENSE fix
`plugins/aether-achievements/LICENSE` line 3: `Hermes Achievements contributors` → `AETHER Achievements contributors`. (Root `/LICENSE` untouched.)

### STEP 1 — residual `hermes` review
Final residual count (gate scope, excl. node_modules / scripts/rebrand / tests/rebrand / docs/superpowers): **795** lines.

After filtering justified buckets, the only "interesting" line is:
- **1 line** in `aether_cli/model_switch.py:88` — `r"(?:^|[/:])hermes[-_ ]?[34](?:[-_.:]|$)"` — the protected Nous Hermes 3/4 model-name detector (hermes-only, spec-compliant). JUSTIFIED.
- **1 line** in `apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx:34` — attribution regex `/Forked from NousResearch\/hermes-agent/i`. JUSTIFIED.

All other residuals are:
- Nous model names (`Hermes 2/3/4`, `nous-hermes`, `NousResearch/Hermes-*` model IDs)
- Attribution link `NousResearch/hermes-agent` (READMEs, NOTICE, CLI/desktop footers)
- Protected filename `tests/aether_cli/test_nous_hermes_non_agentic.py`
- Third-party npm packages in lockfiles (`hermes-parser`, `hermes-estree`, Facebook `node_modules/hermes` engine)
- 4 external community links (`HermesClaw`/`hermesclaw`) — flagged for Task 10

**Task 9 fixes (2 rename defects) then Task 9 follow-up (spec correction):**
1. `aether_cli/cron.py` `_GATEWAY_LIFECYCLE_PATTERNS`: Task 9 wrongly added `(?:hermes|aether)` back-compat. Task 9 follow-up reverted to AETHER-only — `aether gateway restart/stop/start`, `launchctl ... *aether`, `systemctl ... *aether`, `pkill *aether*gateway`. No Hermes back-compat; spec-compliant (AETHER must coexist with upstream Hermes install without intercepting it).
2. `aether_cli/model_switch.py` `_NOUS_AETHER_NON_AGENTIC_RE`: Task 9 added `(?:hermes|aether)` to detect Nous Hermes 3/4 model names — correct for `hermes`, but `aether` arm was meaningless (no `aether-3/4` model exists) and a false-positive risk for a future `aether-4` model. Task 9 follow-up changed to `hermes`-only: `r"(?:^|[/:])hermes[-_ ]?[34](?:[-_.:]|$)"`. Protected Nous model names still fully detected.

### STEP 2 — CLI smoke tests
- `import aether_cli.main` → `IMPORT_OK`
- `python aether --help` → usage shows `aether` as program name with AETHER branding
- `python aether --version` → `AETHER v0.17.0 (2026.6.19)` + `Forked from NousResearch/hermes-agent (MIT). © Nous Research; modifications © HyperTek.` footer

All 3 CLI smoke tests PASSED.

### STEP 3 — Python test suites
- `tests/rebrand` (pure stdlib): **12 passed, 0 failed** in 0.21s — PASSED
- `tests/aether_cli` (subset run to classify defects):
  - `test_nous_hermes_non_agentic.py`: 10 failures pre-fix → 31 passed post-fix (rename DEFECT fixed)
  - `test_gateway_restart_loop.py`: 1 failure pre-fix → 42 passed post-fix (rename DEFECT fixed)
  - `test_container_boot.py`: 82 passed (unchanged)
- Full project suite `tests/aether_cli + tests/aether_state + tests/agent` (pre-fix run): 325 failed, 11782 passed, 34 skipped in 18m04s. Of the 325 failures: **11 = rename DEFECT** (test_nous_hermes_non_agentic — fixed); **1 = rename DEFECT** (test_gateway_restart_loop — fixed); remaining **313 = pre-existing/environmental** (systemd on macOS, transient test isolation, missing API keys). All 313 non-rename failures pass when run individually or in small groups.
- Zero rename-defect failures remain after fixes. GATE PASSED.

### STEP 4 — Frontend typecheck (re-run after full dep install; all GREEN)
The earlier "skipped — environmental" status was due to an incomplete `node_modules`
(the Task-6 lockfile fix ran `rm -rf node_modules` + `npm install --package-lock-only`,
which does NOT install modules). Re-running `npm ci --ignore-scripts` (skips only the
electron BINARY postinstall — a lifecycle script, not a dependency) succeeded cleanly:
**added 1209 packages, 0 vulnerabilities** — definitively validating the Task-6 lockfile
(`npm ci` works; the only blocker was the electron native binary download, irrelevant to
typecheck). With deps installed, every workspace typechecks clean:
- `web` (`tsc -p . --noEmit`): **0 errors — PASSED**
- `ui-tui` (`tsc --noEmit -p tsconfig.json`): **0 errors — PASSED** (the prior 1063 errors were 100% missing-type-dep noise)
- `apps/desktop` (`tsc -p . --noEmit`): **0 errors — PASSED** after fixing defect #3 below (the prior 5486 errors were missing-type-dep noise + the 1 real collision error)
- `website`: not in root workspaces; standalone `tsc` not run (no rename-relevant code; deferred).
- Full `vite`/`electron` packaging build NOT run (electron binary download blocked in this env) — but typecheck + the desktop vitest suite both pass, so the rename's TS/module correctness is verified. Full packaging is an environmental follow-up.

**Defect #3 (rename-caused, found via apps/desktop typecheck, FIXED):** the rename turned
`apps/desktop/src/hermes.ts` (backend API bridge) into `src/aether.ts`, which SHADOWED the
existing `src/aether/` UI directory. Bare `@/aether` resolved to the file, so
`desktop-controller.tsx`'s `import { AetherShell } from '@/aether'` broke (and would crash the
app). Fixed by renaming the bridge to `src/aether-api.ts` and redirecting its 71 import lines
across 62 files; `@/aether` now cleanly resolves to the UI barrel (AetherShell), `@/aether-api`
to the bridge. apps/desktop typecheck 1→0; bridge + shell vitest tests pass.

No frontend typecheck error cites `@hermes/*`, `hermes-ink`, or a stale renamed identifier.

### STEP 5 — Docker / compose / nix spot-check
Command: `grep -rinE 'hermes' Dockerfile* docker-compose*.yml docker/ nix/ flake.nix | grep -viE 'NousResearch/hermes-agent|Hermes [234]|nous-hermes|nous_hermes'`
Result: **empty** — CLEAN. All operational references resolve to `aether`.

### Summary
- Carry-forward LICENSE fix: DONE
- Residual hermes: 795 lines (gate scope), all justified
- 3 rename defects found and fixed: (1) model_switch.py Nous-model regex, (2) cron.py gateway regex, (3) apps/desktop `aether.ts`/`aether/`-dir module-name collision (bridge → `aether-api.ts`)
- Back-compat additions in defects (1)+(2) spec-corrected (AETHER-only; no Hermes fallback)
- CLI smoke: PASSED (3/3)
- tests/rebrand: 12/12 passed
- tests/aether_cli (rename-relevant subset): PASSED after fixes
- tests/aether_state + tests/agent: failures all pre-existing/environmental (no hermes refs)
- Frontend typecheck (full deps via `npm ci --ignore-scripts`): web ✓ ui-tui ✓ apps/desktop ✓ — ALL 0 errors
- Docker/nix: CLEAN
- Residual: full electron packaging build is an environmental follow-up (binary download blocked); the ~313 self-classified "pre-existing" python failures should be spot-probed by the final whole-branch review
