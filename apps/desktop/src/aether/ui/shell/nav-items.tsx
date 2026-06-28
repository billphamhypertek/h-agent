import type { IconName } from '@/aether/ui/components/icon/icon'
import {
  AGENTS_ROUTE, ARTIFACTS_ROUTE, BRIEF_ROUTE, CONTENT_ROUTE, CRON_ROUTE, DEV_ROUTE, HUD_ROUTE,
  INBOX_ROUTE, MEMORY_ROUTE, MESSAGING_ROUTE, NEW_CHAT_ROUTE, OPS_ROUTE, PROFILES_ROUTE,
  SETTINGS_ROUTE, SKILLS_ROUTE, VOICE_ROUTE,
} from '@/app/routes'

export type NavGroupId = 'core' | 'pillars' | 'agentsys' | 'channels' | 'system'

export interface NavGroup {
  id: NavGroupId
  label: string
}

export interface NavItem {
  id: string
  route: string
  label: string
  iconName: IconName
  group: NavGroupId
  /** Numeric badge (e.g. Inbox count). Wired to real data in later screen work-items. */
  badge?: number
  /** Amber "đang làm" dot. */
  busy?: boolean
}

// Group order is the spec §5.1 order; the expanded rail renders these headers.
export const AETHER_NAV_GROUPS: NavGroup[] = [
  { id: 'core', label: 'Lõi' },
  { id: 'pillars', label: 'Trụ cột' },
  { id: 'agentsys', label: 'Hệ agent' },
  { id: 'channels', label: 'Kênh' },
  { id: 'system', label: 'System' },
]

export const AETHER_NAV_ITEMS: NavItem[] = [
  { id: 'home', route: HUD_ROUTE, label: 'Trang chủ', iconName: 'home', group: 'core' },
  { id: 'chat', route: NEW_CHAT_ROUTE, label: 'Trò chuyện', iconName: 'chat', group: 'core' },
  { id: 'brief', route: BRIEF_ROUTE, label: 'Brief sáng', iconName: 'brief', group: 'core' },
  { id: 'dev', route: DEV_ROUTE, label: 'Dev', iconName: 'dev', group: 'pillars' },
  { id: 'inbox', route: INBOX_ROUTE, label: 'Inbox · CRM', iconName: 'inbox', group: 'pillars' },
  { id: 'content', route: CONTENT_ROUTE, label: 'Content', iconName: 'content', group: 'pillars' },
  { id: 'ops', route: OPS_ROUTE, label: 'Vận hành', iconName: 'ops', group: 'pillars' },
  { id: 'agents', route: AGENTS_ROUTE, label: 'Agents', iconName: 'agents', group: 'agentsys' },
  { id: 'skills', route: SKILLS_ROUTE, label: 'Skills', iconName: 'skills', group: 'agentsys' },
  { id: 'memory', route: MEMORY_ROUTE, label: 'Memory', iconName: 'memory', group: 'agentsys' },
  { id: 'cron', route: CRON_ROUTE, label: 'Cron', iconName: 'cron', group: 'agentsys' },
  { id: 'messaging', route: MESSAGING_ROUTE, label: 'Messaging', iconName: 'messaging', group: 'channels' },
  { id: 'artifacts', route: ARTIFACTS_ROUTE, label: 'Artifacts', iconName: 'artifacts', group: 'channels' },
  { id: 'voice', route: VOICE_ROUTE, label: 'Voice', iconName: 'voice', group: 'channels' },
  { id: 'profiles', route: PROFILES_ROUTE, label: 'Profiles', iconName: 'profiles', group: 'system' },
  { id: 'settings', route: SETTINGS_ROUTE, label: 'Cài đặt', iconName: 'settings', group: 'system' },
]
