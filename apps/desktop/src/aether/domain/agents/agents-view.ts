import type { CronJob, SessionInfo, SkillInfo } from '@/types/aether'

export interface AgentSessionRow {
  id: string
  title: string
  source: string
  profile: string
  model: string | null
  isActive: boolean
  lastActive: number
  messageCount: number
}

export interface AgentCronRow {
  id: string
  name: string
  schedule: string
  enabled: boolean
  nextRunAt: string | null
  lastError: string | null
}

export interface AgentSkillRow {
  name: string
  category: string
  enabled: boolean
}

export interface AgentsView {
  runningCount: number
  sessions: AgentSessionRow[]
  cron: AgentCronRow[]
  skills: AgentSkillRow[]
  enabledSkillCount: number
}

function sessionTitle(session: SessionInfo): string {
  const candidate = (session.title ?? session.preview ?? '').trim()

  return candidate || 'Phiên không tên'
}

function cronSchedule(job: CronJob): string {
  return job.schedule_display?.trim() || job.schedule?.display?.trim() || job.schedule?.expr?.trim() || '—'
}

export function composeAgentsView(
  sessions: SessionInfo[],
  cronJobs: CronJob[],
  skills: SkillInfo[],
): AgentsView {
  const rows: AgentSessionRow[] = sessions
    .map(session => ({
      id: session.id,
      title: sessionTitle(session),
      source: session.source ?? 'local',
      profile: session.profile ?? 'default',
      model: session.model,
      isActive: session.is_active,
      lastActive: session.last_active,
      messageCount: session.message_count,
    }))
    .sort((a, b) => b.lastActive - a.lastActive)

  return {
    runningCount: rows.filter(row => row.isActive).length,
    sessions: rows,
    cron: cronJobs.map(job => ({
      id: job.id,
      name: job.name?.trim() || 'Cron không tên',
      schedule: cronSchedule(job),
      enabled: job.enabled,
      nextRunAt: job.next_run_at ?? null,
      lastError: job.last_error ?? null,
    })),
    skills: skills.map(skill => ({ name: skill.name, category: skill.category, enabled: skill.enabled })),
    enabledSkillCount: skills.filter(skill => skill.enabled).length,
  }
}
