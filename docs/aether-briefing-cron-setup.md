# AETHER Company-OS — cron setup

The HUD, Brief, and all four SP-2 cockpits read the latest run of a cron job whose
**name is exactly** `morning-briefing-aggregator` (see `COMPANY_OS_JOB_NAME` /
`BRIEFING_JOB_NAME`). The job NAME is frozen for back-compat so an already-registered
job keeps resolving. Create it once (or, if you already have it, just enable the new
skill on the existing job — the name stays the same):

- **Name:** `morning-briefing-aggregator` (do not rename — the reader resolves by this name)
- **Schedule:** `0 7 * * *` (07:00 daily) — adjust as desired
- **Skills:** enable `company-os-aggregator` (renamed from `morning-briefing-aggregator`)
  plus `google-workspace`, and the user's `hypertekvn-main-server-manage` /
  `h-workspace-server-manage` if installed
- **Prompt:** "Run the company-os-aggregator skill and emit today's Company-OS JSON artifact."
- **Deliver:** `local`

Create via the existing cron REST surface (POST `/api/cron/jobs`) or the AETHER cron UI.
The job runs in its own session, so it never disturbs the prompt cache of the user's
live conversation. The renderer reads the latest run via
`GET /api/cron/jobs/<id>/runs?limit=1` → the run session's messages → the JSON artifact
(`readLatestCompanyOs`).

Until the job has run at least once, the cockpits show the empty state
("Chưa có bản tổng hợp — cron chưa chạy").
