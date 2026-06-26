// apps/desktop/src/aether/domain/skills/skills-types.ts
// Hub + content response shapes. Mirrors the contract in web/src/lib/api.ts
// (logic source of truth) — desktop has no named hub/content API helpers, so
// the stores call window.aetherDesktop.api({ path }) directly and type the
// result with these. Do NOT import from web/*.

export interface SkillHubResult {
  name: string
  description: string
  source: string
  identifier: string
  trust_level: string
  repo: string | null
  tags: string[]
}

export interface SkillHubInstalledEntry {
  name: string | null
  trust_level: string | null
  scan_verdict: string | null
}

export interface SkillHubSearchResponse {
  results: SkillHubResult[]
  source_counts: Record<string, number>
  timed_out: string[]
  installed: Record<string, SkillHubInstalledEntry>
}

export interface SkillHubActionResponse {
  name: string
  ok: boolean
  pid: number | null
  error?: string
  message?: string
  update_command?: string
}

export interface SkillContent {
  name: string
  content: string
  path: string
}

export interface SkillWriteResult {
  success: boolean
  message?: string
  path?: string
  error?: string
}
