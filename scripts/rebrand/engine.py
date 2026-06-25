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
