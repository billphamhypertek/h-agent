---
name: morning-briefing-aggregator
description: "Aggregate email, calendar, server health, tasks and agent status into one structured Morning Briefing JSON artifact (run on a cron)."
version: 1.0.0
author: HyperTek
license: MIT
platforms: [linux, macos, windows]
metadata:
  aether:
    tags: [Productivity, Briefing, Aggregation, JSON, Cron]
    related_skills: [google-workspace, hypertekvn-main-server-manage, h-workspace-server-manage]
---

# Morning Briefing Aggregator

Run by a cron job (e.g. 07:00 daily). Gather today's signal from available sources and
emit **exactly one** fenced ```json block as the final message, conforming to
`references/briefing-schema.json`. Emit nothing after the JSON block.

## Sources (degrade gracefully — omit a section's data if its source is unavailable)
- **Email + calendar:** use the `google-workspace` skill (unread count, threads needing a
  reply, today's events).
- **Server health:** if the `hypertekvn-main-server-manage` and/or `h-workspace-server-manage`
  skills are installed, call them and record name/status/cpu per server. If not installed,
  return an empty `servers` array — do not fail.
- **Tasks / context:** summarize active agent work and deadlines from recent sessions /
  memory. CRM/deals are not native yet — populate `bento.deals` only if a deals source exists,
  otherwise omit it.

## Hard rules
- Output Vietnamese strings for human-facing titles. **Never** translate "Agent" → "Đại lý".
- The final message MUST be the JSON artifact (fenced as ```json). No prose after it.
- This skill runs in its own cron session — it must not touch the user's live conversation.
