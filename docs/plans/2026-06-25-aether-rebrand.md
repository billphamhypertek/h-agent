# AETHER Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Perform a total, protect-aware hard rename of the Hermes fork into **AETHER — HyperTek Agent Platform** across every layer (display, CLI, env vars, Python modules, npm/pip packages, data dir, deep-link scheme, product domain), with no back-compat aliases.

**Architecture:** A single, unit-tested, protect-masking substitution engine (`scripts/rebrand/engine.py`) provides one pure `transform_text(str) -> str` function. The same function drives both file/directory renaming and file-content rewriting. It is applied in reviewable phases — file renames, content rewrite, lockfile regen, attribution, manual touch-ups — each ending in its own commit, with a hard verification gate before the final push.

**Tech Stack:** Python 3 (`re`, `subprocess`, `pathlib`), `pytest` for engine tests, `git mv` for renames, `npm install` + `uv lock` for lockfile regeneration, Node/Vite/TS build tooling for the frontends.

## Global Constraints

Copy these verbatim; every task inherits them.

- **Full product name:** `AETHER — HyperTek Agent Platform`. **Wordmark:** `AETHER` (all-caps in display/UI/product strings).
- **Identifiers (lowercase):** CLI command `aether`; console scripts `aether-agent`, `aether-acp`; modules `aether_cli`, `aether_state`, `aether_constants`, `aether_logging`, `aether_time`, `aether_bootstrap`; env prefix `AETHER_`; data dir `~/.aether`; npm scope `@aether` / `@aether-agent`; deep-link scheme `aether://`.
- **CamelCase code identifiers** become title-case `Aether*` (e.g. `HermesCLI` → `AetherCLI`), **never** `AETHERCLI`.
- **Product domain:** `hermes-agent.nousresearch.com` → `aether.hypertek.vn`.
- **Brand color:** HyperTek navy `#07397d` wherever a brand-color constant/token exists.
- **NO back-compat aliases.** AETHER must coexist with an upstream Hermes install; no fallback reads of `HERMES_*` / `~/.hermes`. Existing `~/.hermes` data is left untouched (not migrated).
- **PROTECT (must survive verbatim):** Nous model names (`Hermes 4/3/2`, `Hermes-4/3/2`, `hermes-4/3/2`, `nous-hermes`, `Nous Hermes`, `NousResearch/Hermes-*`); the attribution path `NousResearch/hermes-agent` (case-insensitive); functional provider hosts `portal.nousresearch.com`, `api.nousresearch.com`, bare `nousresearch.com` provider links, `openrouter.ai`; provider modules `nous_account`, `auth_nous_provider`; the root `LICENSE` (MIT text verbatim).
- **NEVER hand-edit lockfiles** (`package-lock.json`, `uv.lock`, `flake.lock`) — regenerate them.
- **The migration tooling rewrites everything except itself:** content substitution must exclude `node_modules/`, `scripts/rebrand/`, `tests/rebrand/`, `docs/superpowers/`, lockfiles, `LICENSE`, and binary assets.

---

## File Structure

**New (migration tooling — excluded from its own substitution):**
- `scripts/rebrand/__init__.py` — package marker.
- `scripts/rebrand/engine.py` — protect masking, ordered rules, `transform_text`, file walker, rename driver. The single source of truth for the rename.
- `scripts/rebrand/BASELINE.md` — recorded pre-migration `git grep` counts (provenance).
- `tests/rebrand/__init__.py` — package marker.
- `tests/rebrand/test_engine.py` — unit tests for `transform_text`, masking, path renames, idempotency, exclusions.

**New (attribution):**
- `NOTICE` — repo-root fork attribution.

**Renamed (Phase 1, via `git mv` — full list computed by the rename driver):** directories `hermes_cli/`, `tests/hermes_cli/`, `tests/hermes_state/`, `ui-tui/packages/hermes-ink/`, `apps/desktop/public/hermes-frames/`, `docker/s6-rc.d/main-hermes/`, `.github/actions/hermes-smoke-test/`, `plugins/hermes-achievements/`, `skills/autonomous-ai-agents/hermes-agent/`, `skills/software-development/hermes-agent-skill-authoring/`, `optional-skills/devops/hermes-s6-container-supervision/`; loose files `hermes` (launcher), `setup-hermes.sh`, `hermes_bootstrap.py`, `hermes_constants.py`, `hermes_logging.py`, `hermes_state.py`, `hermes_time.py`, plus every other `*hermes*` path surfaced by `git ls-files` (≈798 paths total) — except the `nous_hermes` filename fragment, which is protected.

**Modified (Phase 2, by the engine):** all tracked text files outside the excluded set (≈3,300 files).

**Modified (manual touch-ups):** `apps/desktop/package.json` (appId), README footers, `apps/desktop/src/aether/ui/screens/boot-sequence.tsx` (+ test), `aether_cli/main.py` (`cmd_version` footer, post-rename).

---

## Task 1: Safety net, scaffold, and baseline capture

**Files:**
- Create: `scripts/rebrand/__init__.py`
- Create: `scripts/rebrand/BASELINE.md`
- Create: `tests/rebrand/__init__.py`

**Interfaces:**
- Produces: the `scripts/rebrand/` and `tests/rebrand/` packages that all later engine tasks build on; a recorded baseline count to compare against in the Phase 5 gate.

- [ ] **Step 1: Confirm a clean working tree**

Run: `git status --porcelain`
Expected: empty output (no uncommitted changes). If non-empty, stop and resolve before continuing — the rename must start from a clean baseline.

- [ ] **Step 2: Capture baseline counts**

Run:
```bash
git grep -ci hermes -- . ':(exclude)node_modules' | awk -F: '{s+=$2} END {print "matches="s}'
git ls-files | grep -ic hermes
```
Expected (approximate, for the record): `matches=58185`, file count `798`.

- [ ] **Step 3: Write the baseline record**

Create `scripts/rebrand/BASELINE.md`:
```markdown
# Rebrand baseline (pre-migration)

Captured before the Hermes → AETHER hard rename.

- Case-insensitive `hermes` content matches (tracked, excl. node_modules): **58,185**
- Tracked files with `hermes` in their path: **798**

After the migration, `git grep -in hermes` must return only justified
PROTECT references (Nous model names, the `NousResearch/hermes-agent`
attribution link, kept provider hosts), the migration tooling under
`scripts/rebrand/` + `tests/rebrand/`, the design docs under
`docs/superpowers/`, and the attribution copy in `NOTICE` / README footers.
```
(Substitute the actual numbers from Step 2 if they differ.)

- [ ] **Step 4: Create the package markers**

Create `scripts/rebrand/__init__.py` with content:
```python
"""AETHER rebrand migration tooling (one-time use)."""
```
Create `tests/rebrand/__init__.py` as an empty file.

- [ ] **Step 5: Commit**

```bash
git add scripts/rebrand/__init__.py scripts/rebrand/BASELINE.md tests/rebrand/__init__.py
git commit -m "chore(rebrand): scaffold migration tooling + capture baseline"
```

---

## Task 2: Substitution engine — protect masking + ordered rules (TDD)

**Files:**
- Create: `scripts/rebrand/engine.py`
- Test: `tests/rebrand/test_engine.py`

**Interfaces:**
- Produces:
  - `mask(text: str) -> tuple[str, dict[str, str]]` — replaces each PROTECT match with a unique sentinel; returns masked text + sentinel→original map.
  - `unmask(text: str, mapping: dict[str, str]) -> str` — restores originals.
  - `transform_text(text: str) -> str` — mask → apply ordered `RULES` → unmask. Pure and idempotent.
  - Module constants `PROTECT_PATTERNS: list[re.Pattern]` and `RULES: list[tuple[re.Pattern, str]]`.
- Consumes: nothing (pure stdlib `re`).

- [ ] **Step 1: Write the failing tests**

Create `tests/rebrand/test_engine.py`:
```python
from scripts.rebrand.engine import transform_text


def test_env_var_prefix():
    assert transform_text("HERMES_HOME") == "AETHER_HOME"
    assert transform_text("os.environ['HERMES_YOLO_MODE']") == "os.environ['AETHER_YOLO_MODE']"


def test_python_module_and_identifier():
    assert transform_text("from hermes_cli.main import main") == "from aether_cli.main import main"
    assert transform_text("get_hermes_home()") == "get_aether_home()"


def test_npm_scopes_and_packages():
    assert transform_text("@hermes-agent/photon-sidecar") == "@aether-agent/photon-sidecar"
    assert transform_text("@hermes/ink") == "@aether/ink"
    assert transform_text("hermes-tui") == "aether-tui"
    assert transform_text('"@hermes/ink": "file:./packages/hermes-ink"') == \
        '"@aether/ink": "file:./packages/aether-ink"'
    assert transform_text("pip install hermes-agent[cli]") == "pip install aether-agent[cli]"


def test_camelcase_identifiers_are_title_cased():
    # Code identifiers must become Aether*, NOT AETHER*.
    assert transform_text("class HermesCLI:") == "class AetherCLI:"
    assert transform_text("HermesTokenStorage") == "AetherTokenStorage"
    assert transform_text("HermesHome") == "AetherHome"


def test_display_wordmark_is_all_caps():
    assert transform_text("Welcome to Hermes Agent") == "Welcome to AETHER"
    assert transform_text("Hermes loads the config") == "AETHER loads the config"
    assert transform_text("Hermes Desktop") == "AETHER Desktop"
    assert transform_text("Hermes Protocol") == "AETHER"


def test_product_domain_replaced_provider_hosts_kept():
    assert transform_text("https://hermes-agent.nousresearch.com/install.sh") == \
        "https://aether.hypertek.vn/install.sh"
    assert transform_text("https://portal.nousresearch.com/v1") == \
        "https://portal.nousresearch.com/v1"
    assert transform_text("api.nousresearch.com") == "api.nousresearch.com"
    assert transform_text("https://openrouter.ai/api") == "https://openrouter.ai/api"


def test_scheme_and_data_dir():
    assert transform_text("hermes://callback") == "aether://callback"
    assert transform_text("~/.hermes/config.yaml") == "~/.aether/config.yaml"


def test_protected_model_names_survive():
    assert transform_text("Hermes 4") == "Hermes 4"
    assert transform_text("Hermes-3-Llama-3.1-405B") == "Hermes-3-Llama-3.1-405B"
    assert transform_text("nous-hermes") == "nous-hermes"
    assert transform_text("Nous Hermes") == "Nous Hermes"
    assert transform_text("NousResearch/Hermes-4-405B") == "NousResearch/Hermes-4-405B"


def test_protected_attribution_link_survives():
    assert transform_text("github.com/NousResearch/hermes-agent/issues") == \
        "github.com/NousResearch/hermes-agent/issues"
    # Case-insensitive on the repo segment (package.json uses Hermes-Agent).
    assert transform_text("github.com/NousResearch/Hermes-Agent.git") == \
        "github.com/NousResearch/Hermes-Agent.git"


def test_catch_all_lowercase_substring():
    assert transform_text("hermes-frames/hermes-frame-0.png") == \
        "aether-frames/aether-frame-0.png"
    assert transform_text("LOCALAPPDATA\\hermes") == "LOCALAPPDATA\\aether"


def test_idempotent():
    sample = (
        "from hermes_cli.main import main  # Hermes Agent, HermesCLI, "
        "HERMES_HOME, ~/.hermes, hermes-agent.nousresearch.com, "
        "NousResearch/hermes-agent, Hermes 4"
    )
    once = transform_text(sample)
    assert transform_text(once) == once
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/rebrand/test_engine.py -q`
Expected: FAIL with `ModuleNotFoundError: No module named 'scripts.rebrand.engine'` (or import error).

- [ ] **Step 3: Write the engine**

Create `scripts/rebrand/engine.py`:
```python
"""AETHER rebrand substitution engine.

One pure, idempotent ``transform_text`` plus a git-driven file walker and a
file-rename driver. Protected tokens (Nous model names, the
``NousResearch/hermes-agent`` attribution link) are masked with sentinels
before substitution and restored afterward, so a global find/replace can run
without corrupting them. One-time migration tool.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

# --- PROTECT: tokens that contain "hermes" but MUST survive verbatim. -------
PROTECT_PATTERNS: list[re.Pattern[str]] = [
    # GitHub attribution / fork source (case-insensitive org + repo).
    re.compile(r"NousResearch/[Hh]ermes-[Aa]gent"),
    # HuggingFace model ids: NousResearch/Hermes-4-405B, Hermes-3-Llama-..., etc.
    re.compile(r"NousResearch/Hermes-[\w.+\-]+"),
    # Nous model family names in prose / config / filenames.
    re.compile(r"[Nn]ous[ _-][Hh]ermes"),
    re.compile(r"\b[Hh]ermes[ -]?[234]\b"),
]

# --- RULES: ordered substitutions applied to MASKED text, top to bottom. ----
RULES: list[tuple[re.Pattern[str], str]] = [
    # 1. Product domain (most specific) -> HyperTek domain.
    (re.compile(re.escape("hermes-agent.nousresearch.com")), "aether.hypertek.vn"),
    # 2-3. Env-var + module/identifier prefixes (before any wordmark rule).
    (re.compile("HERMES_"), "AETHER_"),
    (re.compile("hermes_"), "aether_"),
    # 4-8. npm scopes / package ids / directory-name fragments.
    (re.compile(re.escape("@hermes-agent")), "@aether-agent"),
    (re.compile(re.escape("@hermes")), "@aether"),
    (re.compile("hermes-agent"), "aether-agent"),
    (re.compile("hermes-tui"), "aether-tui"),
    (re.compile("hermes-ink"), "aether-ink"),
    # 9-11. Display phrases (before the bare wordmark).
    (re.compile("Hermes Agent"), "AETHER"),
    (re.compile("Hermes Desktop"), "AETHER Desktop"),
    (re.compile("Hermes Protocol"), "AETHER"),
    # 12. CamelCase code identifiers: HermesCLI -> AetherCLI (NOT AETHERCLI).
    (re.compile(r"Hermes(?=[A-Z])"), "Aether"),
    # 13-14. Bare wordmark.
    (re.compile("Hermes"), "AETHER"),
    (re.compile("HERMES"), "AETHER"),
    # 15-16. Scheme + data dir (before the lowercase catch-all).
    (re.compile(re.escape("hermes://")), "aether://"),
    (re.compile(re.escape("~/.hermes")), "~/.aether"),
    # 17. Catch-all lowercase substring (hermes-home, hermes-frames, \hermes...).
    (re.compile("hermes"), "aether"),
]

_SENTINEL = "\x00\x00PROTECT{}\x00\x00"


def mask(text: str) -> tuple[str, dict[str, str]]:
    """Replace each protected token with a unique sentinel."""
    mapping: dict[str, str] = {}
    counter = 0

    def _mask_one(match: re.Match[str]) -> str:
        nonlocal counter
        sentinel = _SENTINEL.format(counter)
        mapping[sentinel] = match.group(0)
        counter += 1
        return sentinel

    for pattern in PROTECT_PATTERNS:
        text = pattern.sub(_mask_one, text)
    return text, mapping


def unmask(text: str, mapping: dict[str, str]) -> str:
    """Restore protected tokens from their sentinels."""
    for sentinel, original in mapping.items():
        text = text.replace(sentinel, original)
    return text


def transform_text(text: str) -> str:
    """Mask protected tokens, apply ordered rules, then unmask. Idempotent."""
    masked, mapping = mask(text)
    for pattern, replacement in RULES:
        masked = pattern.sub(replacement, masked)
    return unmask(masked, mapping)
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/rebrand/test_engine.py -q`
Expected: PASS (all tests green).

- [ ] **Step 5: Commit**

```bash
git add scripts/rebrand/engine.py tests/rebrand/test_engine.py
git commit -m "feat(rebrand): protect-aware transform_text engine with tests"
```

---

## Task 3: File walker + path-rename driver (TDD)

**Files:**
- Modify: `scripts/rebrand/engine.py`
- Test: `tests/rebrand/test_engine.py`

**Interfaces:**
- Consumes: `transform_text` from Task 2.
- Produces:
  - `is_text_target(path: Path) -> bool` — true iff a tracked path should be content-rewritten (applies exclusions).
  - `tracked_files() -> list[Path]` — `git ls-files` as paths.
  - `rename_pairs() -> list[tuple[Path, Path]]` — `(old, new)` for every path whose name changes under `transform_text`, deepest-first.
  - `rewrite_contents(root: Path) -> int` — rewrites every text target in place; returns count changed.
  - `rename_files(root: Path) -> int` — `git mv`s every rename pair; returns count moved.

- [ ] **Step 1: Write the failing tests**

Append to `tests/rebrand/test_engine.py`:
```python
from pathlib import Path

from scripts.rebrand.engine import is_text_target


def test_is_text_target_excludes_tooling_and_binaries():
    assert is_text_target(Path("hermes_cli/main.py")) is True
    assert is_text_target(Path("README.md")) is True
    # Excluded directories.
    assert is_text_target(Path("scripts/rebrand/engine.py")) is False
    assert is_text_target(Path("tests/rebrand/test_engine.py")) is False
    assert is_text_target(Path("docs/superpowers/specs/x.md")) is False
    assert is_text_target(Path("node_modules/foo/index.js")) is False
    # Excluded basenames.
    assert is_text_target(Path("LICENSE")) is False
    assert is_text_target(Path("package-lock.json")) is False
    assert is_text_target(Path("uv.lock")) is False
    # Binary assets.
    assert is_text_target(Path("apps/desktop/public/hermes.png")) is False
    assert is_text_target(Path("docs/hermes-kanban-v1-spec.pdf")) is False
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/rebrand/test_engine.py::test_is_text_target_excludes_tooling_and_binaries -q`
Expected: FAIL with `ImportError: cannot import name 'is_text_target'`.

- [ ] **Step 3: Add the walker + rename driver**

Append to `scripts/rebrand/engine.py`:
```python
EXCLUDE_PREFIXES = (
    "node_modules/",
    "scripts/rebrand/",
    "tests/rebrand/",
    "docs/superpowers/",
)
EXCLUDE_BASENAMES = {"package-lock.json", "uv.lock", "flake.lock", "LICENSE"}
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".icns", ".webp",
    ".pdf", ".woff", ".woff2", ".ttf", ".otf",
    ".zip", ".gz", ".whl", ".mp3", ".mp4", ".wav",
}


def is_text_target(path: Path) -> bool:
    posix = path.as_posix()
    if posix.startswith(EXCLUDE_PREFIXES):
        return False
    if path.name in EXCLUDE_BASENAMES:
        return False
    if path.suffix.lower() in BINARY_SUFFIXES:
        return False
    return True


def tracked_files() -> list[Path]:
    out = subprocess.run(
        ["git", "ls-files"], capture_output=True, text=True, check=True
    ).stdout
    return [Path(line) for line in out.splitlines() if line]


def rename_pairs() -> list[tuple[Path, Path]]:
    pairs: list[tuple[Path, Path]] = []
    for rel in tracked_files():
        posix = rel.as_posix()
        if posix.startswith(EXCLUDE_PREFIXES):
            continue
        new_posix = transform_text(posix)
        if new_posix != posix:
            pairs.append((rel, Path(new_posix)))
    # Deepest paths first so files move before their parent dirs disappear.
    pairs.sort(key=lambda pair: len(pair[0].as_posix()), reverse=True)
    return pairs


def rewrite_contents(root: Path) -> int:
    changed = 0
    for rel in tracked_files():
        if not is_text_target(rel):
            continue
        path = root / rel
        try:
            original = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, FileNotFoundError, IsADirectoryError):
            continue
        updated = transform_text(original)
        if updated != original:
            path.write_text(updated, encoding="utf-8")
            changed += 1
    return changed


def rename_files(root: Path) -> int:
    moved = 0
    for old, new in rename_pairs():
        dest = root / new
        dest.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["git", "mv", old.as_posix(), new.as_posix()], cwd=root, check=True
        )
        moved += 1
    return moved


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="AETHER rebrand engine")
    parser.add_argument("mode", choices=["rename", "rewrite"])
    ns = parser.parse_args()
    cwd = Path.cwd()
    if ns.mode == "rename":
        print(f"rebrand: git mv'd {rename_files(cwd)} paths")
    else:
        print(f"rebrand: rewrote {rewrite_contents(cwd)} files")
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/rebrand/test_engine.py -q`
Expected: PASS (all tests, including the new exclusion test).

- [ ] **Step 5: Sanity-check the rename plan without mutating anything**

Run:
```bash
python -c "from scripts.rebrand.engine import rename_pairs; ps=rename_pairs(); print(len(ps)); [print(o,'->',n) for o,n in ps[:8]]"
```
Expected: a count near `798` and sample lines like `hermes_cli/main.py -> aether_cli/main.py`. Confirm `tests/hermes_cli/test_nous_hermes_non_agentic.py -> tests/aether_cli/test_nous_hermes_non_agentic.py` (the `nous_hermes` fragment is preserved):
```bash
python -c "from scripts.rebrand.engine import transform_text as t; print(t('tests/hermes_cli/test_nous_hermes_non_agentic.py'))"
```
Expected: `tests/aether_cli/test_nous_hermes_non_agentic.py`.

- [ ] **Step 6: Commit**

```bash
git add scripts/rebrand/engine.py tests/rebrand/test_engine.py
git commit -m "feat(rebrand): git-driven file walker and rename driver"
```

---

## Task 4: Phase 1 — execute file & directory renames

**Files:**
- Modify (renamed): ≈798 `*hermes*` paths via `git mv`.

**Interfaces:**
- Consumes: `rename_files` from Task 3.
- Produces: a tree where no tracked **path** contains `hermes` except the protected `nous_hermes` filename fragment.

- [ ] **Step 1: Run the rename driver**

Run: `python -m scripts.rebrand.engine rename`
Expected: `rebrand: git mv'd <N> paths` where N ≈ 798.

- [ ] **Step 2: Verify no stray hermes paths remain (except the protected fragment)**

Run: `git ls-files | grep -i hermes`
Expected: only `tests/aether_cli/test_nous_hermes_non_agentic.py` (the protected `nous_hermes` model-reference filename). Any other line is a miss — investigate before committing.

- [ ] **Step 3: Verify the key targets moved**

Run:
```bash
test -f aether_cli/main.py && test -f aether_state.py && test -f aether && test -f setup-aether.sh && echo OK
git ls-files apps/desktop/public/aether-frames | head -3
git ls-files ui-tui/packages/aether-ink | head -3
```
Expected: `OK`, plus listings under `aether-frames/` and `aether-ink/`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(rebrand): Phase 1 — git mv hermes_* paths to aether_*"
```

> Note: content (imports, references) is still `hermes_*` at this point and the suite will not import — that is expected; Phase 2 fixes it. Do not run pytest here.

---

## Task 5: Phase 2 — execute content substitution

**Files:**
- Modify: every tracked text file outside the excluded set (≈3,300 files).

**Interfaces:**
- Consumes: `rewrite_contents` from Task 3.
- Produces: source where imports, identifiers, env vars, package names, URLs, schemes, and display strings are AETHER; PROTECT tokens unchanged.

- [ ] **Step 1: Run the content rewrite**

Run: `python -m scripts.rebrand.engine rewrite`
Expected: `rebrand: rewrote <N> files` where N is in the low thousands.

- [ ] **Step 2: Spot-check high-signal substitutions**

Run:
```bash
grep -n "from aether_cli.main import main" aether
grep -nE '^\s*(aether|aether-agent|aether-acp) =' pyproject.toml
grep -n '"name": "@aether/ink"' ui-tui/packages/aether-ink/package.json
grep -n '"@aether/ink": "file:./packages/aether-ink"' ui-tui/package.json
```
Expected: each grep returns a match.

- [ ] **Step 3: Verify PROTECT tokens survived the rewrite**

Run:
```bash
git grep -n 'NousResearch/hermes-agent' -- README.md | head -1
git grep -nE 'Hermes [234]|nous-hermes|NousResearch/Hermes-' -- . ':(exclude)node_modules' ':(exclude)docs/superpowers' | head
git grep -n 'portal.nousresearch.com' -- aether_cli/auth.py | head -1
```
Expected: matches present (model names + attribution link + provider host all intact).

- [ ] **Step 4: Python import smoke test**

Run: `python -c "import aether_cli.main"`
Expected: no output, exit 0. (If a stray `hermes_*` import remains, fix it — it indicates a module the rename missed; re-run Step 1 after correcting.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(rebrand): Phase 2 — content substitution hermes -> aether"
```

---

## Task 6: Phase 3 — metadata fixups + lockfile regeneration

**Files:**
- Modify: `pyproject.toml` (verify only), `package.json` workspaces (verify), `apps/desktop/package.json` (appId).
- Regenerate: `package-lock.json`, `uv.lock`.

**Interfaces:**
- Consumes: the renamed/rewritten tree from Tasks 4–5.
- Produces: lockfiles referencing `@aether/*` and `aether-agent`; verified console-script entry points.

- [ ] **Step 1: Verify console scripts and py-modules**

Run: `grep -nE 'aether = |aether-agent = |aether-acp = ' pyproject.toml && grep -n 'aether_bootstrap' pyproject.toml`
Expected: `aether = "aether_cli.main:main"`, `aether-agent = "run_agent:main"`, `aether-acp = "acp_adapter.entry:main"`, and the `py-modules` list containing `aether_bootstrap`, `aether_constants`, `aether_state`, `aether_time`, `aether_logging`.

- [ ] **Step 2: Fix the desktop appId (engine leaves a reverse-domain artifact)**

The engine rewrites `com.nousresearch.hermes` → `vn.hypertek.aether` for the HyperTek rebrand. Read `apps/desktop/package.json`, find the two `appId` occurrences (top-level build config), and set them to `vn.hypertek.aether`.

Run to confirm: `grep -n '"appId": "vn.hypertek.aether"' apps/desktop/package.json`
Expected: a match. Also confirm `grep -n '"productName": "AETHER"' apps/desktop/package.json` and `grep -n '"schemes"' -A2 apps/desktop/package.json` shows `"aether"`.

- [ ] **Step 3: Regenerate the npm lockfile**

Run: `npm install`
Expected: completes; `package-lock.json` updated. Confirm: `grep -c '@aether/' package-lock.json` returns a non-zero count and `grep -c '@hermes/' package-lock.json` returns `0`.

- [ ] **Step 4: Regenerate the uv lockfile**

Run: `uv lock`
Expected: completes; `uv.lock` updated. Confirm: `grep -c 'name = "aether-agent"' uv.lock` returns ≥1.
(If `uv` is unavailable, report it explicitly and stop — do not hand-edit `uv.lock`.)

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml apps/desktop/package.json package-lock.json uv.lock
git commit -m "build(rebrand): Phase 3 — appId + regenerate lockfiles for @aether/aether-agent"
```

---

## Task 7: Caduceus glyph removal + brand color

**Files:**
- Modify: the ≤27 text files containing `☤` (see Step 1), plus any brand-color constant.

**Interfaces:**
- Consumes: the rewritten tree.
- Produces: no `☤` glyph in source/tests; brand color `#07397d` applied where a brand-color constant exists.

- [ ] **Step 1: List the glyph occurrences**

Run: `git grep -n '☤' -- . ':(exclude)node_modules' ':(exclude)docs/superpowers'`
Expected: a finite list (READMEs, `aether_cli/banner.py` skin art, `web/src/i18n/*.ts`, and two tests: `tests/agent/test_system_prompt_restore.py`, `tests/agent/test_tool_guardrails.py`).

- [ ] **Step 2: Remove/neutralize the glyph in source and assets**

For each non-test file in the list, delete the `☤` character (and any now-empty surrounding decoration). In `aether_cli/banner.py`, remove the caduceus art block referenced near the welcome banner so the banner renders the AETHER wordmark text alone.

- [ ] **Step 3: Update the two tests together with their fixtures**

The two `tests/agent/test_*` files assert the glyph appears in prompt output. Read each, and update the assertion to match the neutralized output (glyph removed). This keeps test and behavior in lockstep — do not leave a test asserting the old glyph.

- [ ] **Step 4: Apply the brand color where a constant exists**

Run: `git grep -in 'brandcolor\|brand-color\|--brand\|theme.*color' -- . ':(exclude)node_modules' ':(exclude)apps/desktop/src/aether' | head`
The desktop AETHER theme already encodes `#07397d` (`apps/desktop/src/aether/ui/theme/tokens.ts`). If any **other** brand-color constant surfaces, set it to `#07397d`. If none exists outside the aether theme, record "no additional brand-color constant found" and proceed (no change required).

- [ ] **Step 5: Verify the glyph is gone**

Run: `git grep -l '☤' -- . ':(exclude)node_modules' ':(exclude)docs/superpowers' ':(exclude)*.png'`
Expected: empty output.

- [ ] **Step 6: Run the affected tests**

Run: `python -m pytest tests/agent/test_system_prompt_restore.py tests/agent/test_tool_guardrails.py -q`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "style(rebrand): remove caduceus glyph; apply HyperTek brand color"
```

---

## Task 8: Phase 4 — attribution (NOTICE, README footers, CLI, desktop)

**Files:**
- Create: `NOTICE`
- Modify: `README.md`, `README.es.md`, `README.ur-pk.md`, `README.zh-CN.md`
- Modify: `aether_cli/main.py` (`cmd_version`)
- Modify: `apps/desktop/src/aether/ui/screens/boot-sequence.tsx`
- Test: `apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx`

**Interfaces:**
- Consumes: the renamed `aether_cli/main.py` (`cmd_version` defined there).
- Produces: fork attribution surfaced in NOTICE + READMEs + `aether --version` + desktop boot screen; LICENSE untouched.

- [ ] **Step 1: Create the NOTICE file**

Create `NOTICE`:
```
AETHER — HyperTek Agent Platform.

Forked from NousResearch/hermes-agent (https://github.com/NousResearch/hermes-agent), MIT License.
Original work © Nous Research. Modifications © HyperTek.
```

- [ ] **Step 2: Add the README footer line and fix broken upstream community links**

In each of `README.md`, `README.es.md`, `README.ur-pk.md`, `README.zh-CN.md`, append above the License section:
```markdown
---

> Forked from [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT). Original work © Nous Research; modifications © HyperTek.
```
Then scan each README for **external** links the catch-all may have corrupted (e.g. a community repo URL `github.com/AaronWong1999/hermesaether...`):

Run: `git grep -nE 'github\.com/[^)]*aether' -- README*.md | grep -viE 'nousresearch|hypertek'`
For any hit that is an external third-party repo, restore the original URL (these are real external links, not our brand). Record any you remove.

- [ ] **Step 3: Add the `aether --version` attribution footer**

Read `aether_cli/main.py` around `def cmd_version` (≈ line 4362). After the line(s) that print the version string, add a print of the small-print footer:
```python
    print("Forked from NousResearch/hermes-agent (MIT). © Nous Research; modifications © HyperTek.")
```
Match the surrounding indentation/print style exactly.

- [ ] **Step 4: Write the failing desktop boot-screen test**

In `apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx`, add a test asserting the attribution renders. Follow the file's existing render/query style; the assertion is:
```tsx
it('shows fork attribution', () => {
  render(<BootSequence />)
  expect(screen.getByText(/Forked from NousResearch\/hermes-agent/i)).toBeTruthy()
})
```
(Adapt the render call + import to match the existing tests in that file.)

- [ ] **Step 5: Run the test to verify it fails**

Run: `npm test --workspace apps/desktop -- boot-sequence`
Expected: the new test FAILS (text not found).

- [ ] **Step 6: Add the attribution line to the boot screen**

In `apps/desktop/src/aether/ui/screens/boot-sequence.tsx`, render a small-print footer element with the text `Forked from NousResearch/hermes-agent · MIT` styled as muted small print, placed at the bottom of the boot layout.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test --workspace apps/desktop -- boot-sequence`
Expected: PASS.

- [ ] **Step 8: Confirm LICENSE is untouched**

Run: `git status --porcelain LICENSE`
Expected: empty (no modification).

- [ ] **Step 9: Commit**

```bash
git add NOTICE README.md README.es.md README.ur-pk.md README.zh-CN.md aether_cli/main.py apps/desktop/src/aether/ui/screens/boot-sequence.tsx apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx
git commit -m "docs(rebrand): Phase 4 — fork attribution in NOTICE, READMEs, CLI, desktop boot"
```

---

## Task 9: Phase 5 — verification gates

**Files:** none (verification only).

**Interfaces:**
- Consumes: the fully migrated tree.
- Produces: a documented green gate authorizing the push. Any skipped scope is reported explicitly.

- [ ] **Step 1: Residual `hermes` review (the core gate)**

Run: `git grep -in hermes -- . ':(exclude)node_modules' | grep -vE '^scripts/rebrand/|^tests/rebrand/|^docs/superpowers/' | less`
Review **every remaining line**. Each must fall into a justified bucket:
  - Nous **model names** (`Hermes 4/3/2`, `nous-hermes`, `NousResearch/Hermes-*`).
  - The **attribution link** `NousResearch/hermes-agent` (READMEs, NOTICE, CLI/desktop footers, `cmd_version`).
  - **Protected filename** `tests/aether_cli/test_nous_hermes_non_agentic.py`.
  - `BASELINE.md` references (provenance).

Anything else (a missed identifier, a corrupted external URL, a stray `~/.hermes`) is a defect — fix it, re-run the relevant phase command, and re-commit before proceeding. Record the final residual count.

- [ ] **Step 2: CLI smoke tests**

Run:
```bash
python -c "import aether_cli.main" && echo IMPORT_OK
./aether --help
./aether --version
```
Expected: `IMPORT_OK`; `--help` prints usage with `aether` as the program name; `--version` prints the version **and** the fork-attribution footer.

- [ ] **Step 3: Python test suite**

Run: `python -m pytest tests/aether_cli tests/aether_state tests/rebrand tests/agent -q`
Expected: PASS. If the full `pytest` run is impractical in this environment, run at minimum the above subset and **report explicitly** which scope was skipped (per the spec's Phase 5 requirement). Investigate any failure that references a stale `hermes_*` name.

- [ ] **Step 4: Frontend builds**

Run:
```bash
npm run build --workspace web
npm run build --workspace website
npm run build --workspace ui-tui
npm run build --workspace apps/desktop
```
Expected: each build/typecheck succeeds. A failure citing `@hermes/*` or `hermes-ink` indicates a missed reference — fix and re-commit. Report any workspace whose build is skipped (e.g. needs a display/native toolchain) explicitly.

- [ ] **Step 5: Docker / compose / nix spot-check**

Run: `grep -rinE 'hermes' Dockerfile docker-compose.yml docker/ nix/ flake.nix | grep -viE 'NousResearch/hermes-agent|Hermes [234]|nous-hermes'`
Expected: empty (all operational references resolve to `aether`/`main-aether`). Investigate any hit.

- [ ] **Step 6: Record the gate result**

Append a short "Phase 5 gate" section to `scripts/rebrand/BASELINE.md` noting: final residual `hermes` count, which test/build scopes ran vs. were skipped, and that all run scopes are green. Commit:
```bash
git add scripts/rebrand/BASELINE.md
git commit -m "test(rebrand): Phase 5 — record verification gate results"
```

---

## Task 10: Phase 6 — final review and push

**Files:** none (integration only).

**Interfaces:**
- Consumes: the green gate from Task 9.
- Produces: the rebrand merged to `main` on `origin`.

- [ ] **Step 1: Review the full phase history**

Run: `git log --oneline -10`
Expected: the ordered rebrand commits (scaffold → engine → walker → Phase 1 → Phase 2 → Phase 3 → glyph → Phase 4 → Phase 5). Confirm each phase is a discrete, reviewable commit.

- [ ] **Step 2: Confirm tree is clean and tests/builds were green**

Run: `git status --porcelain`
Expected: empty. Do not push if Task 9 left any gate red.

- [ ] **Step 3: Push to main**

Run: `git push origin main`
Expected: push succeeds (per the user's standing "commit & push to main without confirmation" instruction).

- [ ] **Step 4: Report out-of-scope follow-ups (do not silently drop)**

Surface to the user the spec's Section 9 follow-ups that text substitution cannot fix:
  - **Binary assets to regenerate/redesign:** `apps/desktop/public/aether.png`, `aether-sprite.png`, `aether-frames/*.png`, `website/static/img/aether-agent-banner.png`, app/installer icons — all still render the old "Hermes" artwork.
  - **External infra:** standing up `aether.hypertek.vn` (DNS, install-script hosting, docs site, dashboard OAuth client).
  - **Logomark:** the `☤` glyph is removed; designing a replacement AETHER mark is a follow-up.
  - **Flagged decision:** package metadata `repository`/`bugs`/`homepage` URLs and the README community links still point at upstream (preserved as attribution by design) — confirm whether any should be repointed to `billphamhypertek/h-agent`.

---

## Self-Review

**Spec coverage** (spec §4 canonical map → task):
- Wordmark / full product name → Task 2 rules R9–R14; Global Constraints. ✓
- CLI command / console scripts / launcher → Task 4 (rename) + Task 5 (content) + Task 6 Step 1 (verify). ✓
- Python modules / imports / identifiers → Task 4 + Task 2 rules R3/R12. ✓
- Env vars `HERMES_*` → Task 2 rule R2. ✓
- Data dir `~/.hermes` → Task 2 rule R16. ✓
- pip / npm packages → Task 2 rules R4–R8 + Task 6 lockfiles. ✓
- Desktop product / appId / scheme → Task 5 + Task 6 Step 2 + Task 2 R15. ✓
- Product URL → Task 2 rule R1. ✓
- Brand color → Task 7 Step 4. ✓
- Caduceus glyph → Task 7. ✓
- PROTECT list (§5) → Task 2 `PROTECT_PATTERNS` + Task 9 Step 1 review. ✓
- Attribution (§6) → Task 8; LICENSE preserved (Task 3 exclusion + Task 8 Step 8). ✓
- Execution phases (§7) → Tasks 1→10 map to Phase 0→6. ✓
- Verification gates (§7 Phase 5) → Task 9. ✓
- Out-of-scope follow-ups (§9) → Task 10 Step 4. ✓

**Placeholder scan:** Engine code is complete; rule order and protect patterns are concrete. The only "locate-then-edit" steps (appId in Task 6, `cmd_version` in Task 8, glyph sites in Task 7, boot-screen test style in Task 8) specify the exact target string/snippet and a grep to find the insertion point — the *content* is fully given, only the line number is discovered at edit time, which is appropriate for very large generated/renamed files.

**Type/name consistency:** `transform_text`, `mask`, `unmask`, `is_text_target`, `tracked_files`, `rename_pairs`, `rewrite_contents`, `rename_files` are used identically across Tasks 2–5. Module path `scripts.rebrand.engine` is consistent in every import and `python -m` invocation. Post-rename paths (`aether_cli/main.py`, `setup-aether.sh`, `ui-tui/packages/aether-ink/`, `apps/desktop/public/aether-frames/`) are used consistently after Task 4.
