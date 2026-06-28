// One consistent stroke-icon set for the AETHER nav. Stroke inherits currentColor
// so callers control hue via tokens; width/caps are fixed for visual consistency.
export type IconName =
  | 'home' | 'chat' | 'brief' | 'dev' | 'inbox' | 'content' | 'ops' | 'agents'
  | 'skills' | 'memory' | 'cron' | 'messaging' | 'artifacts' | 'voice' | 'profiles' | 'settings'

export const AETHER_ICONS: Record<IconName, string> = {
  home: 'M3 11.5 12 4l9 7.5M5 10v9h5v-5h4v5h5v-9',
  chat: 'M4 5h16v11H8l-4 3z',
  brief: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  dev: 'M9 7l-5 5 5 5M15 7l5 5-5 5',
  inbox: 'M4 6h16v12H4zM4 13h5l1 2h4l1-2h5',
  content: 'M4 5h16v14H4zM4 9h16M9 9v10',
  ops: 'M4 19h16M6 19V9m4 10V5m4 14v-7m4 7V8',
  agents: 'M5 7h14v11H5zM12 4v3M9 12h.01M15 12h.01',
  skills: 'M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z',
  memory: 'M12 4a4 4 0 0 0-4 4 3.5 3.5 0 0 0-1 6.5V18a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-3.5A3.5 3.5 0 0 0 16 8a4 4 0 0 0-4-4z',
  cron: 'M12 7a5 5 0 1 0 5 5M12 8v4l3 2',
  messaging: 'M4 5h16v10H9l-5 4zM8 9h8M8 12h5',
  artifacts: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  voice: 'M12 4a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0M12 17v3',
  profiles: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 20a7 7 0 0 1 14 0',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.6H9.5l-.4 2.6a7 7 0 0 0-1.7 1l-2.3-1-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.6h5l.4-2.6a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z',
}

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path d={AETHER_ICONS[name]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} />
    </svg>
  )
}
