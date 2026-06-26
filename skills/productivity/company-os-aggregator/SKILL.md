---
name: company-os-aggregator
description: "Aggregate email, calendar, server health, deploys, tasks and agent status into one structured Company-OS JSON artifact (run on a cron) for the AETHER cockpits."
version: 2.0.0
author: HyperTek
license: MIT
platforms: [linux, macos, windows]
metadata:
  aether:
    tags: [Productivity, Briefing, Aggregation, JSON, Cron]
    related_skills: [google-workspace, hypertekvn-main-server-manage, h-workspace-server-manage]
---

# Company-OS Aggregator

Run by a cron job (e.g. 07:00 daily). Gather today's signal from available sources and
emit **exactly one** fenced ```json block as the final message, conforming to
`references/company-os-schema.json`. Emit nothing after the JSON block.

The artifact is a **superset** of the old Morning Briefing: the top-level briefing fields
stay (HUD + Brief read them), plus four optional pillar sections — `dev`, `inbox`,
`content`, `ops` — for the AETHER business cockpits.

## Sources (degrade gracefully — OMIT a section entirely if its source is unavailable)
- **Email + calendar:** use the `google-workspace` skill → top-level `feed`/`bento.calendar`,
  `inbox.threads` (sender/subject/snippet/unread), `ops.calendar`, `content.calendar` time-grid.
- **Server health + deploys:** if `hypertekvn-main-server-manage` / `h-workspace-server-manage`
  are installed, record `dev.servers[]` (name/status/cpu/mem/disk), recent `dev.deploys[]`, and
  `dev.incidents[]`. Mirror the worst server into top-level `servers[]` for the HUD.
- **Tasks / second brain:** summarize deadlines from recent sessions/memory into `ops.tasks[]`
  and `ops.notes[]`.
- **No native source yet → OMIT the key:** `inbox.deals`, `content.ideas`/`content.calendar`
  (when no content store), `ops.finance` — leave them out rather than inventing numbers. The
  renderer shows an honest "Chưa có nguồn …" empty-state for any omitted/empty section.

## Hard rules
- Output Vietnamese strings for human-facing titles. **Never** translate "Agent" → "Đại lý".
- The final message MUST be the JSON artifact (fenced as ```json). No prose after it.
- This skill runs in its own cron session — it must not touch the user's live conversation.
- **Never fabricate data.** Omit a section's key when its source is unavailable.
