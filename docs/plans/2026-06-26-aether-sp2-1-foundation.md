# AETHER SP-2 · Plan 1 — Aggregation Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the one shared aggregation layer for SP-2 — evolve the briefing skill into `company-os-aggregator`, define a superset `CompanyOs` artifact type, and ship a cached `readLatestCompanyOs()` reader that all four pillar screens (and the existing HUD/Brief) read from.

**Architecture:** Extend SP-0's proven prompt-cache-safe cron-artifact mechanism. One skill (run by one cron job whose **name string is unchanged** for back-compat) emits **one** fenced ```json artifact that is a superset of the existing briefing schema (briefing core fields stay top-level; new `dev`/`inbox`/`content`/`ops` sections are optional). A single reader resolves the latest cron run, parses the artifact (reusing the briefing parser + guard verbatim), and serves it through a light in-memory TTL cache so four near-simultaneous screen mounts don't quadruple the fetch. `readLatestBriefing` becomes a thin wrapper over this reader.

**Tech Stack:** TypeScript, nanostores, vitest + jsdom, the existing `@/aether-api` REST surface, Markdown skill + JSON reference schema.

## Global Constraints

These apply to **every** task in this plan and in SP-2 plans 2–6.

- **0 Python core changes.** No edits to `aether_cli/web_server.py` or any REST endpoint. New capability lives only at the edge (skill + cron + renderer).
- **Keep the hardened runtime.** Do not rewrite streaming/tool-call/terminal/gateway-WS/cmdk cores. Restyle via tokens/className only.
- **Brand `#07397d`** via tokens. **Never hardcode colors** outside the `--ae-*` / `--dt-*` token systems.
- **Localization (hard):** UI strings in Vietnamese. **Never translate "Agent" → "Đại lý".** Platform display name: **"HYPERTEK - AGENT PLATFORM"**.
- **Prompt-cache safety (hard):** non-chat surfaces **must not** subscribe `message.delta`/`reasoning.delta`/`thinking.*`, must not poll a live conversation, must not call `appendAssistantDelta`. Read only REST + finished cron-run messages + non-conversation events + `/status`. Never re-trigger an LLM.
- **Cron job NAME string is frozen:** the registered job name stays exactly `morning-briefing-aggregator` so an already-running user cron keeps resolving. Only the *skill content* is renamed.
- **No fabricated data.** A section with a live source is wired; a section without one renders an honest Vietnamese empty-state. The aggregator omits source-less sections; readers treat missing/empty as empty-state.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `apps/desktop/src/aether/domain/company-os/company-os-schema.ts` | The `CompanyOs` type (extends `Briefing`) + the four optional section interfaces and their row types. The single source of truth for slice shapes consumed by plans 3–6. |
| `apps/desktop/src/aether/domain/company-os/read-company-os.ts` | `readLatestCompanyOs()` — resolves the latest cron run, parses, serves via a 10s TTL cache; `COMPANY_OS_JOB_NAME`; `__resetCompanyOsCache()`. |
| `apps/desktop/src/aether/domain/company-os/fixtures/company-os.sample.json` | A superset fixture: briefing core fields + populated `dev`/`inbox`/`content`/`ops`. Used by reader/parse/store/screen tests across SP-2. |
| `apps/desktop/src/aether/domain/company-os/read-company-os.test.ts` | Reader unit tests: job resolution, cache hit, force bypass, no-job null. |
| `apps/desktop/src/aether/domain/company-os/parse-company-os.test.ts` | Back-compat guard tests: new fixture validates; **old briefing fixture still validates**; sections pass through the parser intact. |
| `apps/desktop/src/aether/domain/briefing/read-briefing.ts` | Rewritten to a thin wrapper delegating to `readLatestCompanyOs` (force-bypass) — HUD/Brief unchanged. |
| `apps/desktop/src/aether/domain/briefing/parse-briefing.ts` | Add `export` to the `messageText` helper so it is reusable (no behavior change). |
| `skills/productivity/company-os-aggregator/SKILL.md` | The renamed/expanded skill (git-moved from `morning-briefing-aggregator/`). Emits the superset artifact. |
| `skills/productivity/company-os-aggregator/references/company-os-schema.json` | Human/LLM-facing reference schema for the artifact (documentation, not imported by code). |
| `docs/aether-briefing-cron-setup.md` | Updated: job name stays frozen; the skill to enable is now `company-os-aggregator`. |

---

### Task 1: `CompanyOs` schema types

**Files:**
- Create: `apps/desktop/src/aether/domain/company-os/company-os-schema.ts`
- Create: `apps/desktop/src/aether/domain/company-os/fixtures/company-os.sample.json`
- Test: `apps/desktop/src/aether/domain/company-os/parse-company-os.test.ts`

**Interfaces:**
- Consumes: `Briefing` from `@/aether/domain/briefing/briefing-schema`; `isBriefing`, `parseBriefingFromMessages` from `@/aether/domain/briefing/parse-briefing`.
- Produces (consumed by plans 3–6): `CompanyOs`, `DevSection`, `DevServer`, `DevDeploy`, `DevIncident`, `InboxSection`, `InboxThread`, `Deal`, `ContentSection`, `ContentCalendarEntry`, `ContentIdea`, `OpsSection`, `OpsCalendarEntry`, `OpsTask`, `OpsFinance`, `OpsNote`.

- [ ] **Step 1: Create the superset fixture**

Create `apps/desktop/src/aether/domain/company-os/fixtures/company-os.sample.json`:

```json
{
  "generatedAt": "2026-06-26T07:02:00+07:00",
  "greetingName": "Bình",
  "priorities": [
    { "id": "p1", "title": "3 email cần bạn trả lời — 1 từ khách hàng Hypertek", "severity": "info" },
    { "id": "p2", "title": "Server h-workspace: CPU 82% — cao bất thường", "severity": "warn" }
  ],
  "servers": [
    { "name": "hypertekvn", "status": "ok", "cpu": 21 },
    { "name": "h-workspace", "status": "warn", "cpu": 82 }
  ],
  "bento": {
    "calendar": { "count": 2, "next": "14:00 · call ACME" }
  },
  "feed": [
    { "time": "07:01", "text": "Đã quét 47 email mới" }
  ],
  "vitals": { "cpu": 82, "api": 34, "memory": 61 },
  "dev": {
    "servers": [
      { "name": "hypertekvn", "status": "ok", "cpu": 21, "mem": 44, "disk": 38 },
      { "name": "h-workspace", "status": "warn", "cpu": 82, "mem": 71, "disk": 64 }
    ],
    "deploys": [
      { "id": "d1", "service": "aether-web", "status": "success", "at": "06:40", "sub": "main @ 7c342f4" }
    ],
    "incidents": [
      { "id": "i1", "title": "h-workspace CPU 82% kéo dài 20 phút", "severity": "warn", "at": "06:30" }
    ]
  },
  "inbox": {
    "threads": [
      { "id": "t1", "sender": "ACME", "subject": "Báo giá website", "snippet": "Bên mình cần thêm…", "unread": true }
    ],
    "deals": []
  },
  "content": {
    "calendar": [],
    "ideas": []
  },
  "ops": {
    "calendar": [
      { "id": "c1", "title": "Call ACME", "at": "14:00", "sub": "Google Meet" }
    ],
    "tasks": [
      { "id": "k1", "title": "Gửi báo giá VinFast", "due": "hôm nay", "severity": "warn" }
    ],
    "finance": {},
    "notes": [
      { "id": "n1", "title": "Ghi chú: ưu đãi Q3 cho khách cũ" }
    ]
  }
}
```

- [ ] **Step 2: Write the schema types**

Create `apps/desktop/src/aether/domain/company-os/company-os-schema.ts`:

```typescript
import type { Briefing } from '@/aether/domain/briefing/briefing-schema'

// --- Dev & DevOps cockpit ---
export interface DevServer { name: string; status: 'ok' | 'warn' | 'error'; cpu: number; mem: number; disk: number }
export interface DevDeploy { id: string; service: string; status: 'success' | 'failed' | 'running'; at: string; sub?: string }
export interface DevIncident { id: string; title: string; severity: 'info' | 'warn' | 'error'; at?: string }
export interface DevSection { servers: DevServer[]; deploys: DevDeploy[]; incidents: DevIncident[] }

// --- Inbox + CRM ---
export interface InboxThread { id: string; sender: string; subject: string; snippet?: string; unread?: boolean }
export interface Deal { id: string; name: string; stage: string; valueLabel?: string }
export interface InboxSection { threads: InboxThread[]; deals: Deal[] }

// --- Content engine ---
export interface ContentCalendarEntry { id: string; channel: string; title: string; at: string; status?: 'idea' | 'draft' | 'scheduled' | 'published' }
export interface ContentIdea { id: string; title: string; channel?: string; stage: 'idea' | 'draft' | 'scheduled' }
export interface ContentSection { calendar: ContentCalendarEntry[]; ideas: ContentIdea[] }

// --- Vận hành & Tài chính ---
export interface OpsCalendarEntry { id: string; title: string; at: string; sub?: string }
export interface OpsTask { id: string; title: string; due?: string; severity?: 'info' | 'warn' | 'error' }
export interface OpsFinance { revenueLabel?: string; expenseLabel?: string; balanceLabel?: string; sub?: string }
export interface OpsNote { id: string; title: string; sub?: string }
export interface OpsSection { calendar: OpsCalendarEntry[]; tasks: OpsTask[]; finance: OpsFinance; notes: OpsNote[] }

// The unified artifact: a Briefing superset. The briefing core fields stay
// required (HUD/Brief read them); the four pillar sections are optional and
// omitted by the aggregator when their source is unavailable.
export interface CompanyOs extends Briefing {
  dev?: DevSection
  inbox?: InboxSection
  content?: ContentSection
  ops?: OpsSection
}
```

- [ ] **Step 3: Write the back-compat guard test (failing)**

Create `apps/desktop/src/aether/domain/company-os/parse-company-os.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'

import oldBriefing from '@/aether/domain/briefing/fixtures/briefing.sample.json'
import { isBriefing, parseBriefingFromMessages } from '@/aether/domain/briefing/parse-briefing'

import companyOs from './fixtures/company-os.sample.json'
import type { CompanyOs } from './company-os-schema'

describe('company-os artifact (briefing superset)', () => {
  it('the new superset fixture passes the briefing guard', () => {
    expect(isBriefing(companyOs)).toBe(true)
  })

  it('the OLD briefing fixture still passes the guard (back-compat)', () => {
    expect(isBriefing(oldBriefing)).toBe(true)
  })

  it('the shared parser preserves the new pillar sections', () => {
    const messages = [{ role: 'assistant', content: '```json\n' + JSON.stringify(companyOs) + '\n```' }]
    const parsed = parseBriefingFromMessages(messages) as CompanyOs | null
    expect(parsed?.dev?.servers).toHaveLength(2)
    expect(parsed?.inbox?.threads[0].sender).toBe('ACME')
    expect(parsed?.ops?.tasks[0].severity).toBe('warn')
  })
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/company-os/parse-company-os.test.ts`
Expected: PASS (3 tests). The types compile and the briefing guard already accepts the superset because extra keys are ignored and the briefing core is present.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/company-os/company-os-schema.ts apps/desktop/src/aether/domain/company-os/fixtures/company-os.sample.json apps/desktop/src/aether/domain/company-os/parse-company-os.test.ts
git commit -m "feat(aether): CompanyOs superset schema + back-compat guard tests"
```

---

### Task 2: `readLatestCompanyOs` reader with TTL cache

**Files:**
- Modify: `apps/desktop/src/aether/domain/briefing/parse-briefing.ts:33` (export the `messageText` helper)
- Create: `apps/desktop/src/aether/domain/company-os/read-company-os.ts`
- Test: `apps/desktop/src/aether/domain/company-os/read-company-os.test.ts`

**Interfaces:**
- Consumes: `getSessionMessages` from `@/aether-api`; `parseBriefingFromMessages` from `@/aether/domain/briefing/parse-briefing`; `CompanyOs` from `./company-os-schema`.
- Produces (consumed by plans 3–6): `readLatestCompanyOs(deps?: ReadCompanyOsDeps, opts?: { force?: boolean; now?: () => number }): Promise<CompanyOs | null>`, `ReadCompanyOsDeps`, `COMPANY_OS_JOB_NAME` (= `'morning-briefing-aggregator'`), `__resetCompanyOsCache()`.

- [ ] **Step 1: Export `messageText` from the briefing parser**

In `apps/desktop/src/aether/domain/briefing/parse-briefing.ts`, change the helper's declaration from `function messageText(` to `export function messageText(`. No other change. (It is needed nowhere else yet, but exporting keeps the parse path shared and avoids a duplicate.)

- [ ] **Step 2: Write the reader test (failing)**

Create `apps/desktop/src/aether/domain/company-os/read-company-os.test.ts`:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

import sample from './fixtures/company-os.sample.json'
import { __resetCompanyOsCache, readLatestCompanyOs } from './read-company-os'

const FIXED_NOW = () => 1_000_000

function makeApi() {
  return vi.fn(async (req: { path: string }) => {
    if (req.path.startsWith('/api/cron/jobs?')) { return [{ id: 'job_abc', name: 'morning-briefing-aggregator' }] }
    if (req.path.includes('/runs')) { return { runs: [{ id: 'cron_job_abc_2026-06-26' }], limit: 1 } }
    throw new Error('unexpected ' + req.path)
  })
}

const getMessages = () =>
  vi.fn(async () => ({ messages: [{ role: 'assistant', content: '```json\n' + JSON.stringify(sample) + '\n```' }] }))

beforeEach(() => { __resetCompanyOsCache() })

describe('readLatestCompanyOs', () => {
  it('resolves the job, fetches the latest run, parses the superset', async () => {
    const api = makeApi()
    const gm = getMessages()
    const out = await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    expect(out?.dev?.servers).toHaveLength(2)
    expect(out?.servers).toHaveLength(2)
    expect(gm).toHaveBeenCalledWith('cron_job_abc_2026-06-26', 'default')
  })

  it('serves a second non-forced call from the TTL cache (no refetch)', async () => {
    const api = makeApi()
    const gm = getMessages()
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { now: FIXED_NOW })
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { now: FIXED_NOW })
    expect(api).toHaveBeenCalledTimes(2) // one jobs + one runs, from the first call only
  })

  it('force-bypasses the cache and refetches', async () => {
    const api = makeApi()
    const gm = getMessages()
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true, now: FIXED_NOW })
    expect(api).toHaveBeenCalledTimes(4)
  })

  it('returns null when no aggregator job exists', async () => {
    const api = vi.fn(async () => [])
    const gm = vi.fn()
    expect(await readLatestCompanyOs({ api: api as never, getMessages: gm as never }, { force: true })).toBeNull()
    expect(gm).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd apps/desktop && npx vitest run src/aether/domain/company-os/read-company-os.test.ts`
Expected: FAIL — `read-company-os` module does not exist yet.

- [ ] **Step 4: Implement the reader**

Create `apps/desktop/src/aether/domain/company-os/read-company-os.ts`:

```typescript
import { getSessionMessages } from '@/aether-api'
import { parseBriefingFromMessages } from '@/aether/domain/briefing/parse-briefing'

import type { CompanyOs } from './company-os-schema'

interface CronJob { id: string; name: string }
interface CronRunsResponse { runs: { id: string }[]; limit: number }

type ApiFn = <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>

export interface ReadCompanyOsDeps {
  api?: ApiFn
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

// Frozen for cron back-compat: the user's registered job keeps this name, and
// the reader resolves the run by name. The skill *content* is renamed to
// company-os-aggregator separately (see skills/productivity/company-os-aggregator).
export const COMPANY_OS_JOB_NAME = 'morning-briefing-aggregator'

// Light TTL cache so four pillar screens mounting at once don't quadruple the
// cron fetch. "Làm mới" buttons pass { force: true } to bypass it.
const CACHE_TTL_MS = 10_000
let cache: { value: CompanyOs | null; at: number } | null = null

export function __resetCompanyOsCache(): void { cache = null }

export async function readLatestCompanyOs(
  deps: ReadCompanyOsDeps = {},
  opts: { force?: boolean; now?: () => number } = {},
): Promise<CompanyOs | null> {
  const now = opts.now ?? Date.now

  if (!opts.force && cache && now() - cache.at < CACHE_TTL_MS) { return cache.value }

  const api =
    deps.api ??
    (<T>(request: Parameters<ApiFn>[0]) => window.aetherDesktop.api<T>(request))
  const getMessages = deps.getMessages ?? getSessionMessages
  const jobName = deps.jobName ?? COMPANY_OS_JOB_NAME
  const profile = deps.profile ?? 'default'

  const jobs = await api<CronJob[]>({ path: `/api/cron/jobs?profile=${encodeURIComponent(profile)}` })
  const job = jobs.find(j => j.name === jobName)

  if (!job) { cache = { value: null, at: now() }; return null }

  const runs = await api<CronRunsResponse>({ path: `/api/cron/jobs/${encodeURIComponent(job.id)}/runs?limit=1` })
  const latest = runs.runs?.[0]

  if (!latest) { cache = { value: null, at: now() }; return null }

  const { messages } = await getMessages(latest.id, profile)
  const parsed = parseBriefingFromMessages(messages) as CompanyOs | null

  cache = { value: parsed, at: now() }

  return parsed
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/company-os/read-company-os.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/desktop/src/aether/domain/briefing/parse-briefing.ts apps/desktop/src/aether/domain/company-os/read-company-os.ts apps/desktop/src/aether/domain/company-os/read-company-os.test.ts
git commit -m "feat(aether): cached readLatestCompanyOs reader over the unified cron artifact"
```

---

### Task 3: Point `read-briefing` at the shared reader (back-compat)

**Files:**
- Modify: `apps/desktop/src/aether/domain/briefing/read-briefing.ts` (rewrite as a wrapper)
- Test: `apps/desktop/src/aether/domain/briefing/read-briefing.test.ts` (existing — must stay green, no edit)

**Interfaces:**
- Consumes: `readLatestCompanyOs`, `COMPANY_OS_JOB_NAME` from `@/aether/domain/company-os/read-company-os`; `Briefing` from `./briefing-schema`.
- Produces: `readLatestBriefing(deps?: ReadBriefingDeps): Promise<Briefing | null>` (signature unchanged) and `BRIEFING_JOB_NAME` (unchanged value).

- [ ] **Step 1: Confirm the existing briefing test still describes the contract**

Run: `cd apps/desktop && npx vitest run src/aether/domain/briefing/read-briefing.test.ts`
Expected: PASS (current implementation). This is the contract the rewrite must preserve.

- [ ] **Step 2: Rewrite `read-briefing.ts` as a thin wrapper**

Replace the entire contents of `apps/desktop/src/aether/domain/briefing/read-briefing.ts` with:

```typescript
import { COMPANY_OS_JOB_NAME, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

import type { Briefing } from './briefing-schema'

export interface ReadBriefingDeps {
  api?: <T>(request: { path: string; method?: string; body?: unknown; timeoutMs?: number; profile?: string }) => Promise<T>
  getMessages?: (sessionId: string, profile?: string | null) => Promise<{ messages: { role: string; content?: unknown }[] }>
  jobName?: string
  profile?: string
}

// Kept for back-compat: same value, same name string. HUD/Brief and the cron
// setup doc still reference this; the reader resolves by this job name.
export const BRIEFING_JOB_NAME = COMPANY_OS_JOB_NAME

// The briefing IS the company-os artifact's top-level slice (a CompanyOs is a
// Briefing superset). Force-bypass the company-os TTL cache so the briefing read
// is always fresh and never observes a cache another surface populated — the
// existing read-briefing tests assert a live fetch each call.
export async function readLatestBriefing(deps: ReadBriefingDeps = {}): Promise<Briefing | null> {
  return readLatestCompanyOs(deps, { force: true })
}
```

- [ ] **Step 3: Run the briefing reader test to verify it still passes**

Run: `cd apps/desktop && npx vitest run src/aether/domain/briefing/read-briefing.test.ts`
Expected: PASS (2 tests) — `force: true` bypasses the cache so each call hits the injected `api`/`getMessages` exactly as before.

- [ ] **Step 4: Run the full briefing + company-os domain suites to verify no regression**

Run: `cd apps/desktop && npx vitest run src/aether/domain/briefing src/aether/domain/company-os`
Expected: PASS — including the HUD/Brief-facing `parse-briefing.test.ts` and `morning-brief.test.tsx` paths.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/aether/domain/briefing/read-briefing.ts
git commit -m "refactor(aether): read-briefing delegates to the shared company-os reader"
```

---

### Task 4: Rename + expand the aggregator skill and reference schema

**Files:**
- Move: `skills/productivity/morning-briefing-aggregator/SKILL.md` → `skills/productivity/company-os-aggregator/SKILL.md`
- Create: `skills/productivity/company-os-aggregator/references/company-os-schema.json`
- Modify: `docs/aether-briefing-cron-setup.md`

> This task is documentation for the cron-time LLM + operator; it has no unit test. Its deliverable is verified by `git` (the move) and by `node`-parsing the reference JSON.

- [ ] **Step 1: Git-move the skill directory (preserve history)**

```bash
git mv skills/productivity/morning-briefing-aggregator skills/productivity/company-os-aggregator
```

- [ ] **Step 2: Rewrite `SKILL.md` to emit the superset artifact**

Replace the entire contents of `skills/productivity/company-os-aggregator/SKILL.md` with:

```markdown
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
```

- [ ] **Step 3: Create the reference schema doc**

Create `skills/productivity/company-os-aggregator/references/company-os-schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CompanyOs",
  "type": "object",
  "required": ["generatedAt", "priorities", "servers", "bento", "feed", "vitals"],
  "properties": {
    "generatedAt": { "type": "string" },
    "greetingName": { "type": "string" },
    "priorities": { "type": "array", "items": { "type": "object" } },
    "servers": { "type": "array", "items": { "type": "object" } },
    "bento": { "type": "object" },
    "feed": { "type": "array" },
    "vitals": { "type": "object" },
    "dev": {
      "type": "object",
      "properties": {
        "servers": { "type": "array", "items": { "type": "object", "required": ["name", "status", "cpu", "mem", "disk"] } },
        "deploys": { "type": "array", "items": { "type": "object", "required": ["id", "service", "status", "at"] } },
        "incidents": { "type": "array", "items": { "type": "object", "required": ["id", "title", "severity"] } }
      }
    },
    "inbox": {
      "type": "object",
      "properties": {
        "threads": { "type": "array", "items": { "type": "object", "required": ["id", "sender", "subject"] } },
        "deals": { "type": "array", "items": { "type": "object", "required": ["id", "name", "stage"] } }
      }
    },
    "content": {
      "type": "object",
      "properties": {
        "calendar": { "type": "array", "items": { "type": "object", "required": ["id", "channel", "title", "at"] } },
        "ideas": { "type": "array", "items": { "type": "object", "required": ["id", "title", "stage"] } }
      }
    },
    "ops": {
      "type": "object",
      "properties": {
        "calendar": { "type": "array", "items": { "type": "object", "required": ["id", "title", "at"] } },
        "tasks": { "type": "array", "items": { "type": "object", "required": ["id", "title"] } },
        "finance": { "type": "object" },
        "notes": { "type": "array", "items": { "type": "object", "required": ["id", "title"] } }
      }
    }
  }
}
```

- [ ] **Step 4: Verify the reference JSON parses**

Run: `node -e "require('./skills/productivity/company-os-aggregator/references/company-os-schema.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 5: Update the cron-setup doc**

Replace the entire contents of `docs/aether-briefing-cron-setup.md` with:

```markdown
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
```

- [ ] **Step 6: Commit**

```bash
git add skills/productivity/company-os-aggregator docs/aether-briefing-cron-setup.md
git commit -m "feat(aether): rename briefing skill to company-os-aggregator + superset schema; keep cron job name"
```

---

## Notes for the implementer (deliberate decisions)

- **Parse-fail degrades to empty, not error.** `readLatestCompanyOs` returns `null` for *all* "no usable artifact" cases (no job, no run, or a newest assistant message with no valid JSON), exactly matching the SP-0 briefing reader. Pillar stores (plans 3–6) map `null → 'empty'` and a *thrown* REST/network failure → `'error'`. This keeps one parse path; the §7 "parse fail → error" intent is served honestly by the "Chưa có bản tổng hợp" empty-state.
- **No `parse-company-os.ts` file.** A `CompanyOs` is a `Briefing` superset, so `parseBriefingFromMessages` + `isBriefing` are reused verbatim. The cast `as CompanyOs` is safe because `JSON.parse` preserves the extra section keys.
- **Cache is module-global by design.** It is shared across the four pillar stores. Tests must call `__resetCompanyOsCache()` in `beforeEach`. The briefing wrapper force-bypasses it.

## Self-Review

- **Spec §4 / §5.5 unified artifact + superset:** Task 1 types + fixture, Task 4 schema. ✓
- **Spec §4 one reader, one parse path, light cache (decided here):** Task 2 reader + TTL cache + `__reset`. ✓
- **Spec §4 read-briefing generalized, HUD/Brief back-compat:** Task 3 wrapper; existing tests stay green. ✓
- **Spec §4 skill renamed to company-os-aggregator, cron job NAME frozen:** Task 4 git-move + frozen `COMPANY_OS_JOB_NAME`. ✓
- **Spec §8 parser/back-compat: new fixture validates, old briefing fixture still passes:** Task 1 Step 3 test. ✓
- **Global constraint: 0 Python changes, no fabricated data:** nothing here touches Python; the skill omits source-less sections. ✓
- **Placeholder scan:** every step has concrete code/commands. ✓
- **Type consistency:** `COMPANY_OS_JOB_NAME`, `readLatestCompanyOs(deps, opts)`, `__resetCompanyOsCache`, and the section type names are used identically here and referenced by plans 3–6. ✓
```
