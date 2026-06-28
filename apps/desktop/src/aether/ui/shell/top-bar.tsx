// apps/desktop/src/aether/ui/shell/top-bar.tsx
import { useStore } from '@nanostores/react'

import { Avatar } from '@/aether/ui/components/avatar'
import { VitalSign } from '@/aether/ui/components/vital-sign'
import { openCommandPalette } from '@/store/command-palette'
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
  // Windows/Linux render native min/max/close on the RIGHT via titleBarOverlay; reserve their width.
  const overlayWidth = connection?.windowButtonPosition == null ? (connection?.nativeOverlayWidth ?? 0) : 0

  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{ paddingRight: overlayWidth ? `${overlayWidth}px` : undefined, WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <h1 className="text-[length:var(--ae-text-lg)] font-semibold tracking-[var(--ae-tracking-tight)]">{title}</h1>
      <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="flex items-center gap-2 rounded-[var(--ae-radius-md)] border border-[color:var(--ae-line)] bg-[var(--ae-glass-2)] px-3 py-1.5 text-[length:var(--ae-text-sm)] text-[color:var(--ae-dim)] transition-colors hover:text-[color:var(--ae-azure-soft)]"
          data-testid="ae-cmdk"
          onClick={openCommandPalette}
          type="button"
        >
          <span>Tìm kiếm</span>
          <kbd className="font-mono text-[length:var(--ae-text-xs)] tracking-[var(--ae-tracking-wide)]">⌘K</kbd>
        </button>
        <VitalSign />
        <span className="font-mono text-[length:var(--ae-text-xs)] tracking-[var(--ae-tracking-wide)] text-[color:var(--ae-dim)]">{formatAetherClock(now)}</span>
        <Avatar />
      </div>
    </div>
  )
}
