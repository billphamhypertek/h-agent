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
