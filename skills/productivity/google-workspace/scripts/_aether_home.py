"""Resolve AETHER_HOME for standalone skill scripts.

Skill scripts may run outside the AETHER process (e.g. system Python,
nix env, CI) where ``aether_constants`` is not importable.  This module
provides the same ``get_aether_home()`` and ``display_aether_home()``
contracts as ``aether_constants`` without requiring it on ``sys.path``.

When ``aether_constants`` IS available it is used directly so that any
future enhancements (profile resolution, Docker detection, etc.) are
picked up automatically.  The fallback path replicates the core logic
from ``aether_constants.py`` using only the stdlib.

All scripts under ``google-workspace/scripts/`` should import from here
instead of duplicating the ``AETHER_HOME = Path(os.getenv(...))`` pattern.
"""

from __future__ import annotations

import os
from pathlib import Path

try:
    from aether_constants import display_aether_home as display_aether_home
    from aether_constants import get_aether_home as get_aether_home
except (ModuleNotFoundError, ImportError):

    def get_aether_home() -> Path:
        """Return the AETHER home directory (default: ~/.aether).

        Mirrors ``aether_constants.get_aether_home()``."""
        val = os.environ.get("AETHER_HOME", "").strip()
        return Path(val) if val else Path.home() / ".aether"

    def display_aether_home() -> str:
        """Return a user-friendly ``~/``-shortened display string.

        Mirrors ``aether_constants.display_aether_home()``."""
        home = get_aether_home()
        try:
            return "~/" + str(home.relative_to(Path.home()))
        except ValueError:
            return str(home)
