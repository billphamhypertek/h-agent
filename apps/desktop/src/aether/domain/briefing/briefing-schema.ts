export type Severity = 'info' | 'warn' | 'error'

export interface BriefingItem { id: string; title: string; severity: Severity; sub?: string }
export interface ServerVital { name: string; status: 'ok' | 'warn' | 'error'; cpu: number }
export interface FeedEntry { time: string; text: string }
export interface BentoSummary {
  deals?: { active: number; valueLabel: string; sub?: string }
  calendar?: { count: number; next?: string }
  agents?: { headline: string; sub?: string }
}
export interface Briefing {
  generatedAt: string
  greetingName?: string
  priorities: BriefingItem[]
  servers: ServerVital[]
  bento: BentoSummary
  feed: FeedEntry[]
  vitals: { cpu: number; api: number; memory: number }
}
