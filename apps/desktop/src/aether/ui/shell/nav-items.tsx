import type { ReactNode } from 'react'

import { BRIEF_ROUTE, DEV_ROUTE, HUD_ROUTE, MEMORY_ROUTE } from '@/app/routes'

export interface NavItem {
  id: string
  route: string
  label: string
  icon: ReactNode
}

// Icons kept inline/simple; full set lifted from the mockup nav rail.
const I = (d: string): ReactNode => (
  <svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
    <path d={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} />
  </svg>
)

// In-slice routes are real; deferred items point at stub routes (Task 5).
export const AETHER_NAV_ITEMS: NavItem[] = [
  { id: 'home', route: HUD_ROUTE, label: 'Trang chủ', icon: I('M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9') },
  { id: 'chat', route: '/', label: 'Trò chuyện', icon: I('M4 5h16v11H8l-4 3z') },
  { id: 'brief', route: BRIEF_ROUTE, label: 'Brief sáng', icon: I('M5 4h14v16H5zM8 8h8M8 12h8M8 16h5') },
  { id: 'agents', route: '/agents', label: 'Agents', icon: I('M5 7h14v11H5zM12 4v3M9 12h.01M15 12h.01') },
  { id: 'skills', route: '/skills', label: 'Skills', icon: I('M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z') },
  { id: 'memory', route: MEMORY_ROUTE, label: 'Memory', icon: I('M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z') },
  { id: 'cron', route: '/cron', label: 'Cron', icon: I('M12 8v4l3 2') },
  { id: 'dev', route: DEV_ROUTE, label: 'Dev', icon: I('M9 7l-5 5 5 5M15 7l5 5-5 5') },
]
