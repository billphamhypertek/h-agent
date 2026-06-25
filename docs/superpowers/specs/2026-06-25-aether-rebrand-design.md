# AETHER Rebrand — Design Spec

**Date:** 2026-06-25
**Status:** Approved (design); implementation plan pending
**Owner:** HyperTek (billphamhypertek/h-agent)

## 1. Context

This repository is a fork of [`NousResearch/hermes-agent`](https://github.com/NousResearch/hermes-agent)
(MIT). The product is currently branded **Hermes / Hermes Agent**. HyperTek is rebranding the entire
project to **AETHER — HyperTek Agent Platform**.

A deep scan found **~58,128 case-insensitive matches of `hermes` across ~3,340 tracked files**
(excluding `node_modules`). The token appears across seven distinct layers:

| Layer | Examples | Approx. scale |
|---|---|---|
| Display / branding | "Hermes Agent", "Hermes Desktop", window title "Hermes Protocol", banner | thousands |
| CLI command | `hermes`, `hermes-agent`, `hermes-acp` (`[project.scripts]` + `./hermes` launcher) | a few entry points |
| Env vars | `HERMES_*` (`HERMES_HOME`=3,513, plus ~80 others) | ~9,171 tokens |
| Python modules | `hermes_cli`, `hermes_state`, `hermes_constants`, `hermes_logging`, `hermes_time`, `hermes_bootstrap` | ~1,000+ imports/refs |
| Package names | `hermes-agent` (pip), `hermes-tui`, `@hermes/*`, `@hermes-agent/*` (npm) | dozens |
| Functional product URL | `hermes-agent.nousresearch.com` | 311 |
| 🔒 NousResearch tech (protect) | model names "Hermes 4/3/2", "Nous Hermes", repo path `NousResearch/hermes-agent` | ~800 |

**AETHER already exists** as the desktop renderer (458 `aether` refs under `apps/desktop/src/aether/`,
already merged to `main`). This effort extends that brand to the entire project.

The repo's only git remote is `origin → github.com/billphamhypertek/h-agent.git`. There is **no upstream
remote configured**, so external install/back-compat with upstream is not a concern.

## 2. Goal

Perform a **total, thorough ("đổi triệt để") hard rename** of the Hermes fork into **AETHER**, treating
AETHER as a **fully separate, parallel-installable system**:

- Every layer an operator or developer touches becomes `aether` / `AETHER`.
- **No back-compat aliases** to the old names. Aliasing (e.g. reading `HERMES_HOME` as a fallback) would
  couple the two systems; the explicit requirement is that an AETHER install and an upstream Hermes
  install can **coexist on the same machine** without colliding.
- Preserve required legal attribution, the MIT LICENSE, all **functional** Nous/OpenRouter provider
  integrations, and genuine Nous **model names**.

## 3. Decisions (resolved with the user)

1. **Rename depth:** Total hard rename — display, CLI command, env vars, Python modules, package names,
   data dir, deep-link scheme, product domain.
2. **Data home:** Hard rename `~/.hermes` → `~/.aether`, `HERMES_HOME` → `AETHER_HOME`, **no fallback
   alias**. AETHER and Hermes run side-by-side as separate systems; AETHER starts fresh at `~/.aether`,
   existing `~/.hermes` data is left untouched (not migrated).
3. **Attribution placement:** `NOTICE`/attribution file **and** README footer badge **and** desktop
   About / CLI `--version` footer; **keep the MIT LICENSE verbatim**.
4. **Upstream product URL:** Replace `hermes-agent.nousresearch.com` → **`aether.hypertek.vn`**.
5. **Naming/casing:** Wordmark **AETHER** (all-caps, used aggressively in UI headers and product
   strings); identifiers lowercase (`aether`, `aether_cli`, `AETHER_*` env prefix, `~/.aether`,
   `@aether/*` npm scope, `aether://` scheme). Full platform name: **AETHER — HyperTek Agent Platform**.

## 4. Canonical naming map

| Layer | Old | New |
|---|---|---|
| Wordmark | `Hermes`, `Hermes Agent` | `AETHER` |
| Full product name | — | `AETHER — HyperTek Agent Platform` |
| CLI command | `hermes` | `aether` |
| Console scripts | `hermes-agent`, `hermes-acp` | `aether-agent`, `aether-acp` |
| Launcher script | `./hermes` | `./aether` |
| Python modules | `hermes_cli`, `hermes_state.py`, `hermes_constants.py`, `hermes_logging.py`, `hermes_time.py`, `hermes_bootstrap.py` | `aether_cli`, `aether_state.py`, `aether_constants.py`, `aether_logging.py`, `aether_time.py`, `aether_bootstrap.py` |
| Imports | `from hermes_* import …`, `import hermes_*` | `from aether_* import …`, `import aether_*` |
| Identifiers | `get_hermes_home`, `display_hermes_home`, `load_hermes_dotenv`, … | `get_aether_home`, `display_aether_home`, `load_aether_dotenv`, … |
| Env vars | `HERMES_*` (all ~80 distinct, incl. `HERMES_HOME`, `HERMES_YOLO_MODE`, `HERMES_SESSION_*`, …) | `AETHER_*` |
| Data dir | `~/.hermes` | `~/.aether` |
| pip package | `hermes-agent`, extras `hermes-agent[...]` | `aether-agent`, `aether-agent[...]` |
| npm packages | `hermes-tui`, `@hermes/shared`, `@hermes/ink`, `@hermes-agent/photon-sidecar`, `@hermes/bootstrap-installer` | `aether-tui`, `@aether/shared`, `@aether/ink`, `@aether-agent/photon-sidecar`, `@aether/bootstrap-installer` |
| Desktop product | `productName: "Hermes"`, `"Hermes Protocol"` | `"AETHER"` |
| Deep-link scheme | `hermes://` | `aether://` |
| Product URL/domain | `hermes-agent.nousresearch.com` | `aether.hypertek.vn` |
| Brand color | (upstream) | HyperTek `#07397d` wherever a brand-color constant/token exists |
| Caduceus glyph | `☤` (Hermes symbol) | removed / neutralized |

## 5. 🔒 Protect-list (MUST NOT be renamed)

These are masked before substitution and restored after:

- **Nous model names:** `Hermes 4`, `Hermes 3`, `Hermes 2`, `Hermes-4`, `Hermes-3`, `hermes-4`,
  `hermes-3`, `nous-hermes`, `Nous Hermes`, and HuggingFace IDs matching `NousResearch/Hermes-*`.
- **Attribution path:** `NousResearch/hermes-agent` (the GitHub repo link / fork source).
- **Functional provider hosts & integrations (real APIs, like OpenRouter):**
  `portal.nousresearch.com`, `api.nousresearch.com`, generic `nousresearch.com` provider links,
  `openrouter.ai`, and the Nous account/auth modules `nous_account`, `auth_nous_provider`
  (these are provider integrations, not branding).
- **LICENSE** — MIT text and copyright notice unchanged.
- `node_modules/`, lockfiles (`package-lock.json`, `uv.lock`, `flake.lock`) — **regenerated**, not
  hand-edited.

> Note: `hermes-agent.nousresearch.com` (the **product** domain) is *replaced* with `aether.hypertek.vn`;
> the provider hosts above (`portal.`/`api.nousresearch.com`) are *kept*. They are different strings and
> the substitution rules must distinguish them.

## 6. Attribution (added)

- **`NOTICE`** at repo root, e.g.:
  > AETHER — HyperTek Agent Platform.
  > Forked from NousResearch/hermes-agent (https://github.com/NousResearch/hermes-agent), MIT License.
  > Original work © Nous Research. Modifications © HyperTek.
- **README footer** (all locale READMEs): a small badge/line *"Forked from NousResearch/hermes-agent"*.
- **Desktop About screen** and **CLI `aether --version`** footer: small-print fork attribution.
- **LICENSE** preserved verbatim (legally required and explicitly chosen).

## 7. Execution strategy — phased, scripted, verified

A single **protect-aware substitution engine**, applied in reviewable phases, with verification between
phases, and **one push to `main`** once fully green. (Chosen over a single big-bang commit for
reviewability, and over parallel subagents because a global find/replace with cross-cutting protect
rules needs one consistent ordering.)

**Phase 0 — Safety net.** Confirm clean working tree; capture baseline `git grep -ic hermes` count.

**Phase 1 — File & directory renames** via `git mv`:
- `hermes_cli/` → `aether_cli/`, and the top-level modules `hermes_state.py`, `hermes_constants.py`,
  `hermes_logging.py`, `hermes_time.py`, `hermes_bootstrap.py` → `aether_*`.
- `./hermes` launcher → `./aether`; `setup-hermes.sh` → `setup-aether.sh`.
- Any other `*hermes*` filenames surfaced by `git ls-files | grep -i hermes`
  (tests, skills, docs, assets) — renamed except 🔒 protected ones.

**Phase 2 — Content substitution** (ordered, case-aware, protect-masked), over all tracked text files
except `node_modules/`, lockfiles, `LICENSE`, and protect-listed strings:
1. Mask protected tokens (Section 5) with unique sentinels.
2. Apply rules in this order (longest/most-specific first):
   `hermes-agent.nousresearch.com` → `aether.hypertek.vn`;
   `HERMES_` → `AETHER_`;
   `hermes_` → `aether_` (modules/identifiers);
   `@hermes-agent` → `@aether-agent`; `@hermes` → `@aether`;
   `hermes-agent` → `aether-agent`; `hermes-tui` → `aether-tui`;
   `Hermes Agent` → `AETHER`; `Hermes Desktop` → `AETHER Desktop`; `Hermes Protocol` → `AETHER`;
   `Hermes` → `AETHER`; `HERMES` → `AETHER`; `hermes://` → `aether://`; `~/.hermes` → `~/.aether`;
   remaining standalone `hermes` → `aether`.
3. Unmask protected tokens.
4. Remove/neutralize the `☤` caduceus glyph; apply `#07397d` where a brand-color constant exists.

**Phase 3 — Lockfile & metadata regeneration:** `npm install` across workspaces to refresh
`package-lock.json` with `@aether/*`; `uv lock` (or `pip`-equivalent) for `uv.lock`. Verify the
`[project.scripts]` entries are `aether`, `aether-agent`, `aether-acp`.

**Phase 4 — Attribution:** add `NOTICE`, README footers, desktop About + `--version` snippets.

**Phase 5 — Verification gates** (all must pass before push):
- Residual `git grep -i hermes` reviewed line-by-line; only 🔒 protected references remain, each justified.
- Python import smoke test: `python -c "import aether_cli.main"` and `./aether --help` / `--version`.
- `pytest` (full suite, or the `tests/aether_cli` + core subset if the full run is impractical — any
  skipped scope is reported explicitly).
- Frontend builds: `apps/web`, `website`, `ui-tui`, `apps/desktop` (`npm run build`/typecheck).
- Spot-check Docker/compose/nix references resolve to the new names.

**Phase 6 — Commit & push.** Phased local commits (one per phase for reviewability), then `git push`
to `main` (per the user's standing "commit & push to main without confirmation" instruction).

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Substring over-rename (e.g. `hermes` inside a protected model id or an English word) | Protect-masking + ordered, specific-first rules + mandatory residual-grep review gate |
| Lockfile drift / corruption from hand-editing | Regenerate via `npm install` / `uv lock`; never hand-edit lock contents |
| Tests referencing old env/module names | Renamed in the same Phase 2 pass (tests/ included), then the suite is run in Phase 5 |
| Existing `~/.hermes` data | Left untouched by design — AETHER is a parallel system starting fresh at `~/.aether` |
| Breaking `main` mid-rename | Phased local commits; push only after the full Phase 5 gate is green |

## 9. Out of scope / explicit follow-ups

Text substitution cannot fix these; they are flagged, **not silently left**:

- **Binary assets:** `assets/banner.png` (renders "Hermes Agent"), app icons, desktop installer art,
  any logo images — require regeneration/redesign. Tracked as a follow-up.
- **External infrastructure:** standing up `aether.hypertek.vn` (DNS, install-script hosting, docs site,
  dashboard OAuth client) is operational work outside this repo change.
- **Caduceus → AETHER mark:** removing the ☤ glyph is in scope; designing a replacement logomark is a
  follow-up.

## 10. Success criteria

- `git grep -i hermes` returns only justified 🔒 protected references (model names, the
  `NousResearch/hermes-agent` attribution link, kept provider hosts) and the attribution text.
- `./aether --help`, `./aether --version` run; `import aether_cli.main` succeeds.
- Test suite and frontend builds pass.
- Attribution present in NOTICE + README + About/`--version`; LICENSE unchanged.
- Changes committed and pushed to `main`.
