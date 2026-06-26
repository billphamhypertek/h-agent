// apps/desktop/src/aether/ui/shell/top-bar.tsx
import { useStore } from '@nanostores/react'

import { $connection } from '@/store/session'

const WEEKDAYS_VI = ['CN', 'Th 2', 'Th 3', 'Th 4', 'Th 5', 'Th 6', 'Th 7'] // 0=Sunday

export function formatAetherClock(d: Date): string {
  const wd = WEEKDAYS_VI[d.getDay()]
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')

  return `${wd} · ${dd}.${mm} · ${hh}:${mi}`
}

export function TopBar({ title, now = new Date() }: { title: string; now?: Date }) {
  const connection = useStore($connection)
  // Windows/Linux render native min/max/close on the RIGHT via titleBarOverlay; reserve their width
  // so the right cluster never slides under the native buttons. macOS: windowButtonPosition != null ⇒ 0.
  const overlayWidth = connection?.windowButtonPosition == null ? (connection?.nativeOverlayWidth ?? 0) : 0
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ paddingRight: overlayWidth ? `${overlayWidth}px` : undefined, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-[17px] font-semibold tracking-[.01em]">{title}</h1>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="font-mono text-xs tracking-[.04em] text-[color:var(--ae-dim)]">{formatAetherClock(now)}</span>
        <div
          className="grid h-[34px] w-[34px] place-items-center rounded-full text-[13px] font-bold text-[#06283c]"
          style={{ background: 'radial-gradient(circle at 35% 30%,#cdf2ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}
        >
          B
        </div>
      </div>
    </div>
  )
}
