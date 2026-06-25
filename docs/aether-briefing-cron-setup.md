# AETHER Morning Briefing — cron setup

The HUD + Brief read the latest run of a cron job whose **name is exactly**
`morning-briefing-aggregator` (see `BRIEFING_JOB_NAME`). Create it once:

- **Name:** `morning-briefing-aggregator`
- **Schedule:** `0 7 * * *` (07:00 daily) — adjust as desired
- **Skills:** enable `morning-briefing-aggregator` (+ `google-workspace`, and the user's
  `hypertekvn-main-server-manage` / `h-workspace-server-manage` if installed)
- **Prompt:** "Run the morning-briefing-aggregator skill and emit today's briefing JSON artifact."
- **Deliver:** `local`

Create via the existing cron REST surface (POST `/api/cron/jobs`) or the Hermes cron UI.
The job runs in its own session, so it never disturbs the prompt cache of the user's
live conversation. The renderer reads the latest run via
`GET /api/cron/jobs/<id>/runs?limit=1` → the run session's messages → the JSON artifact.

Until the job has run at least once, the HUD/Brief show the empty state.
