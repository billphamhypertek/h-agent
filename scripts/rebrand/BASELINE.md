# Rebrand baseline (pre-migration)

Captured before the Hermes → AETHER hard rename.

- Case-insensitive `hermes` content matches (tracked, excl. node_modules): **58,293**
- Tracked files with `hermes` in their path: **798**

After the migration, `git grep -in hermes` must return only justified
PROTECT references (Nous model names, the `NousResearch/hermes-agent`
attribution link, kept provider hosts), the migration tooling under
`scripts/rebrand/` + `tests/rebrand/`, the design docs under
`docs/superpowers/`, and the attribution copy in `NOTICE` / README footers.
