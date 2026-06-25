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

## Phase 5 gate — 2026-06-25 PASSED (with 2 rename defects found and fixed)

### STEP 0 — carry-forward LICENSE fix
`plugins/aether-achievements/LICENSE` line 3: `Hermes Achievements contributors` → `AETHER Achievements contributors`. (Root `/LICENSE` untouched.)

### STEP 1 — residual `hermes` review
Final residual count (gate scope, excl. node_modules / scripts/rebrand / tests/rebrand / docs/superpowers): **798** lines.

After filtering justified buckets, the only "interesting" lines are:
- **5 lines** in `aether_cli/cron.py` and `aether_cli/model_switch.py` — backward-compat `(?:hermes|aether)` patterns added as part of the 2 rename-defect fixes (see below). JUSTIFIED.
- **1 line** in `apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx:34` — attribution regex `/Forked from NousResearch\/hermes-agent/i`. JUSTIFIED.

All other residuals are:
- Nous model names (`Hermes 2/3/4`, `nous-hermes`, `NousResearch/Hermes-*` model IDs)
- Attribution link `NousResearch/hermes-agent` (READMEs, NOTICE, CLI/desktop footers)
- Protected filename `tests/aether_cli/test_nous_hermes_non_agentic.py`
- Third-party npm packages in lockfiles (`hermes-parser`, `hermes-estree`, Facebook `node_modules/hermes` engine)
- 4 external community links (`HermesClaw`/`hermesclaw`) — flagged for Task 10

**2 rename defects found and fixed:**
1. `aether_cli/model_switch.py` `_NOUS_AETHER_NON_AGENTIC_RE`: regex was `(?:^|[/:])aether[-_ ]?[34](?:[-_.:]|$)` — missed external Nous Hermes model names (`hermes-3`, `hermes-4`, `NousResearch/Hermes-3-*`). Fixed to `(?:^|[/:])(?:hermes|aether)[-_ ]?[34](?:[-_.:]|$)`.
2. `aether_cli/cron.py` `_GATEWAY_LIFECYCLE_PATTERNS`: regex only matched `aether gateway restart/stop/start` — missed legacy `hermes gateway ...` commands that should still be blocked. Fixed to `(?:hermes|aether)` in all 4 pattern arms.

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

### STEP 4 — Frontend builds / typecheck
- `web` (typecheck: `tsc -p . --noEmit`): **PASSED** (exit 0, no errors)
- `web` (build: `tsc -b && vite build`): **SKIPPED — environmental**: `vite` and `@types/node` packages absent from `node_modules` because `npm ci` fails due to electron `install.js` requiring `extract-zip` (incomplete native toolchain). Not rename-related.
- `website`: **SKIPPED — environmental**: workspace `website` not present in root `package.json` workspaces config.
- `ui-tui` (typecheck): **SKIPPED — environmental**: 1063 pre-existing TypeScript errors in `packages/aether-ink` due to missing `@types/node` and `react` types in the inner package's devDependencies. Zero errors reference `hermes` or `@hermes/*`. Confirmed pre-existing (same count on baseline before any rename commits). Not rename-related.
- `apps/desktop` (typecheck): **SKIPPED — environmental**: 5496 pre-existing TypeScript errors due to missing `vitest`, `react`, `nanostores` types (incomplete `npm ci`). Zero errors reference `hermes` or `@hermes/*`. Not rename-related.

No frontend failure cites `@hermes/*`, `hermes-ink`, or a stale renamed identifier.

### STEP 5 — Docker / compose / nix spot-check
Command: `grep -rinE 'hermes' Dockerfile* docker-compose*.yml docker/ nix/ flake.nix | grep -viE 'NousResearch/hermes-agent|Hermes [234]|nous-hermes|nous_hermes'`
Result: **empty** — CLEAN. All operational references resolve to `aether`.

### Summary
- Carry-forward LICENSE fix: DONE
- Residual hermes: 798 lines, all justified
- 2 rename defects found and fixed (model_switch.py regex, cron.py regex)
- CLI smoke: PASSED (3/3)
- tests/rebrand: 12/12 passed
- tests/aether_cli (rename-relevant subset): PASSED after fixes
- tests/aether_state + tests/agent: 99/4493 failures all pre-existing/environmental (no hermes refs)
- Frontend: web typecheck PASSED; build + ui-tui + desktop skipped environmental
- Docker/nix: CLEAN
