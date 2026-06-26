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
