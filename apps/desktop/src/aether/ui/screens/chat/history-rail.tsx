// apps/desktop/src/aether/ui/screens/chat/history-rail.tsx
import { useStore } from '@nanostores/react'
import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { SessionInfo } from '@/aether-api'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { isNewChatRoute, NEW_CHAT_ROUTE, routeSessionId, sessionRoute } from '@/app/routes'
import { sessionTitle } from '@/lib/chat-runtime'
import { cn } from '@/lib/utils'
import { $pinnedSessionIds } from '@/store/layout'
import { $selectedStoredSessionId, $sessions, $workingSessionIds, sessionPinId } from '@/store/session'

// Compact, AETHER-tokenized recency unit (days / hours / minutes). Matches the
// legacy sidebar's intent but speaks the cockpit's terse Vietnamese.
const AGE_TICKS: ReadonlyArray<[number, string]> = [
  [86_400_000, ' ngày'],
  [3_600_000, ' giờ'],
  [60_000, ' phút'],
]

function formatAge(unixSeconds: number): string {
  const delta = Math.max(0, Date.now() - unixSeconds * 1000)

  for (const [ms, unit] of AGE_TICKS) {
    if (delta >= ms) {
      return `${Math.floor(delta / ms)}${unit}`
    }
  }

  return 'vừa xong'
}

// Utility glyphs — the shared Icon set is locked to the 16 nav destinations, so
// the cockpit's plus/search strokes live here. stroke=currentColor keeps them
// token-driven (callers colour via --ae-* text classes).
function PlusGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth={1.9} />
    </svg>
  )
}

function SearchGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg aria-hidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth={1.7} />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeLinecap="round" strokeWidth={1.7} />
    </svg>
  )
}

function dotStyle(active: boolean, working: boolean): React.CSSProperties {
  if (working) { return { background: 'var(--ae-energy)', boxShadow: '0 0 7px var(--ae-energy)' } }

  if (active) { return { background: 'var(--ae-on-accent)' } }

  return { background: 'var(--ae-state-dormant)', opacity: 0.7 }
}

function HistoryRow({ active, onOpen, session, working }: { active: boolean; onOpen: () => void; session: SessionInfo; working: boolean }) {
  const title = sessionTitle(session)
  const age = formatAge(session.last_active || session.started_at)

  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]',
        active
          ? 'text-[color:var(--ae-on-accent)] shadow-[0_6px_16px_-8px_var(--ae-glow-strong)]'
          : 'text-[color:var(--ae-dim)] hover:bg-[var(--ae-fill)] hover:text-[color:var(--ae-ink)]',
      )}
      onClick={onOpen}
      style={active ? { background: 'linear-gradient(160deg, var(--ae-azure-bright), var(--ae-navy))' } : undefined}
      title={title}
      type="button"
    >
      <span aria-hidden className="size-2 shrink-0 rounded-full" style={dotStyle(active, working)} />
      <span className={cn('min-w-0 flex-1 truncate text-[length:var(--ae-text-base)]', active ? 'font-semibold' : 'font-medium')}>{title}</span>
      <span className={cn('shrink-0 text-[length:var(--ae-text-xs)] tabular-nums', active ? 'text-[color:var(--ae-on-accent)] opacity-75' : 'text-[color:var(--ae-dim)]')}>{age}</span>
    </button>
  )
}

// Left pane of the Chat cockpit — the conversation-history rail the new AETHER
// shell dropped when it embedded only the thread column. Driven by $sessions,
// it lists past conversations (pinned first), filters by title, and navigates
// by react-router so the Chat view stays mounted (no remount across sessions).
export function HistoryRail() {
  const navigate = useNavigate()
  const location = useLocation()
  const sessions = useStore($sessions)
  const working = useStore($workingSessionIds)
  const pinned = useStore($pinnedSessionIds)
  const selected = useStore($selectedStoredSessionId)
  const [query, setQuery] = useState('')

  const activeId = routeSessionId(location.pathname) ?? selected
  const onNew = isNewChatRoute(location.pathname)
  const workingSet = useMemo(() => new Set(working), [working])
  const pinnedSet = useMemo(() => new Set(pinned), [pinned])

  const { pinnedRows, recentRows } = useMemo(() => {
    const q = query.trim().toLowerCase()
    const visible = q ? sessions.filter(s => sessionTitle(s).toLowerCase().includes(q)) : sessions
    const pin: SessionInfo[] = []
    const rest: SessionInfo[] = []

    for (const s of visible) {
      if (pinnedSet.has(sessionPinId(s))) { pin.push(s) } else { rest.push(s) }
    }

    return { pinnedRows: pin, recentRows: rest }
  }, [sessions, query, pinnedSet])

  const isActive = (s: SessionInfo) => activeId === s.id || activeId === s._lineage_root_id

  const rowFor = (s: SessionInfo) => (
    <HistoryRow active={isActive(s)} key={s.id} onOpen={() => navigate(sessionRoute(s.id))} session={s} working={workingSet.has(s.id)} />
  )

  const sectionLabel = (text: string) => (
    <div className="px-2.5 pb-1.5 pt-3 text-[length:var(--ae-text-xs)] font-semibold uppercase tracking-[var(--ae-tracking-widest)] text-[color:var(--ae-dim)] opacity-80">{text}</div>
  )

  return (
    <GlassSlab className="flex h-full min-h-0 w-[268px] shrink-0 flex-col" data-testid="ae-history-rail" size="md" style={{ borderRadius: '18px' }}>
      <div className="mb-3 flex items-center gap-2 px-0.5">
        <span className="flex-1 text-[length:var(--ae-text-lg)] font-semibold tracking-[var(--ae-tracking-tight)] text-[color:var(--ae-ink)]">Trò chuyện</span>
        <button
          aria-current={onNew ? 'page' : undefined}
          aria-label="Cuộc trò chuyện mới"
          className={cn(
            'grid size-8 place-items-center rounded-[11px] border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]',
            onNew
              ? 'border-transparent text-[color:var(--ae-on-accent)]'
              : 'border-[color:var(--ae-line)] text-[color:var(--ae-azure-soft)] hover:bg-[var(--ae-fill)]',
          )}
          onClick={() => navigate(NEW_CHAT_ROUTE)}
          style={onNew ? { background: 'linear-gradient(160deg, var(--ae-azure-bright), var(--ae-navy))' } : undefined}
          title="Cuộc trò chuyện mới"
          type="button"
        >
          <PlusGlyph size={17} />
        </button>
      </div>

      <label className="relative mb-1 block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--ae-dim)]"><SearchGlyph /></span>
        <input
          aria-label="Tìm cuộc trò chuyện"
          className="ae-field min-h-[38px] !pl-9 text-[length:var(--ae-text-base)]"
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm…"
          type="text"
          value={query}
        />
      </label>

      <div className="-mr-1.5 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-1.5">
        {pinnedRows.length > 0 && (
          <>
            {sectionLabel('Đã ghim')}
            {pinnedRows.map(rowFor)}
          </>
        )}
        {recentRows.length > 0 && (
          <>
            {pinnedRows.length > 0 && sectionLabel('Gần đây')}
            {recentRows.map(rowFor)}
          </>
        )}
        {pinnedRows.length === 0 && recentRows.length === 0 && (
          <div className="grid flex-1 place-items-center whitespace-pre-line px-4 py-8 text-center text-[length:var(--ae-text-sm)] leading-[var(--ae-leading-snug)] text-[color:var(--ae-dim)]">
            {query.trim() ? 'Không tìm thấy cuộc trò chuyện.' : 'Chưa có cuộc trò chuyện nào.\nNhấn + để bắt đầu.'}
          </div>
        )}
      </div>
    </GlassSlab>
  )
}
