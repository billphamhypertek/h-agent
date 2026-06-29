import { useLayoutEffect, useRef, useState } from 'react'

import { Avatar } from '@/aether/ui/components/avatar'
import { Icon } from '@/aether/ui/components/icon/icon'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { GEOMETRY } from '@/aether/ui/theme/geometry'
import { HUD_ROUTE } from '@/app/routes'
import { persistBoolean, storedBoolean } from '@/lib/storage'
import { cn } from '@/lib/utils'

import { AETHER_NAV_GROUPS, AETHER_NAV_ITEMS, type NavItem } from './nav-items'
import { useTitlebarInset } from './use-titlebar-inset'

const ITEM_H = GEOMETRY.nav.item
// Collapse/expand is an explicit user choice (default collapsed), persisted across
// sessions. Replaces the old hover-to-expand, which felt jumpy as the cursor crossed it.
const NAV_EXPANDED_KEY = 'aether-nav-expanded'

export interface NavRailProps {
  items?: NavItem[]
  activeRoute: string
  onNavigate: (route: string) => void
}

export function NavRail({ items = AETHER_NAV_ITEMS, activeRoute, onNavigate }: NavRailProps) {
  const [expanded, setExpanded] = useState(() => storedBoolean(NAV_EXPANDED_KEY, false))
  const titlebarInset = useTitlebarInset()

  const toggleExpanded = () =>
    setExpanded(prev => {
      const next = !prev
      persistBoolean(NAV_EXPANDED_KEY, next)

      return next
    })

  // The sliding "focus pill" tracks the REAL position of the highlighted button by
  // measuring its offsetTop within the column. This stays correct regardless of the
  // home-filter, group gaps, and (when expanded) group headers — flat index math
  // can't account for those. JS only sets the offset; the spring easing lives in CSS.
  const columnRef = useRef<HTMLDivElement>(null)
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null)

  useLayoutEffect(() => {
    const active = columnRef.current?.querySelector<HTMLElement>('[aria-current="page"]')
    setIndicatorTop(active ? active.offsetTop : null)
  }, [activeRoute, expanded, items])

  return (
    <nav
      aria-label="HYPERTEK - AGENT PLATFORM"
      className="ae-rail relative flex flex-none flex-col gap-1.5 pb-3.5"
      data-expanded={expanded || undefined}
      style={{
        width: expanded ? 'var(--ae-nav-w-expanded)' : 'var(--ae-nav-w)',
        paddingTop: `${titlebarInset}px`,
        WebkitAppRegion: 'drag',
        borderRight: '1px solid var(--ae-line)',
        background: 'linear-gradient(180deg,var(--ae-glass),var(--ae-glass-2))',
      } as React.CSSProperties}
    >
      {/* living glyph orb = Home button (collapsed-orb, vital-state) */}
      <button
        aria-label="Trang chủ"
        className="relative mb-1 grid h-[42px] w-[42px] flex-none place-items-center self-center"
        onClick={() => onNavigate(HUD_ROUTE)}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title="Trang chủ"
        type="button"
      >
        <LivingOrb className="pointer-events-none" label="Trang chủ" size={42} />
      </button>

      {/* grouped item column with sliding indicator */}
      <div
        className="relative flex w-full flex-col gap-[var(--ae-nav-gap)] px-2"
        ref={columnRef}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {indicatorTop != null && (
          <div
            className="ae-nav-indicator"
            style={{ transform: `translateY(${indicatorTop}px)`, ['--ae-nav-item-h' as string]: `${ITEM_H}px` }}
          />
        )}
        {AETHER_NAV_GROUPS.map(group => {
          // The living glyph above IS the Home affordance, so the HUD/home route is not
          // also rendered as a duplicate labeled list button (which would collide on the
          // "Trang chủ" accessible name). All other items render normally.
          const groupItems = items.filter(i => i.group === group.id && i.route !== HUD_ROUTE)

          if (groupItems.length === 0) {return null}

          return (
            <div className="flex flex-col gap-[var(--ae-nav-gap)]" key={group.id}>
              {expanded && (
                <div className="ae-nav-group-header px-1 pt-1.5 text-[length:var(--ae-text-xs)] font-semibold uppercase tracking-[var(--ae-tracking-wider)] text-[color:var(--ae-dim)]">
                  {group.label}
                </div>
              )}
              {groupItems.map(item => {
                const active = item.route === activeRoute

                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                    className={cn(
                      'relative z-[1] flex h-[38px] cursor-pointer items-center gap-2.5 rounded-[11px] px-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]',
                      active ? 'font-semibold text-[color:var(--ae-ink)]' : 'text-[color:var(--ae-dim)] hover:text-[color:var(--ae-azure-soft)]',
                    )}
                    key={item.id}
                    onClick={() => onNavigate(item.route)}
                    title={item.label}
                    type="button"
                  >
                    <span className="relative grid h-5 w-6 flex-none place-items-center">
                      <Icon name={item.iconName} />
                      {item.busy && (
                        <span className="absolute -right-0.5 -top-0.5 h-[6px] w-[6px] rounded-full" style={{ background: 'var(--ae-energy)', boxShadow: '0 0 6px var(--ae-energy)' }} />
                      )}
                    </span>
                    {expanded && <span className="truncate text-[length:var(--ae-text-sm)]">{item.label}</span>}
                    {item.badge != null && (
                      <span
                        className={cn('grid h-[16px] min-w-[16px] place-items-center rounded-full px-1 text-[length:var(--ae-text-xs)] font-bold text-[color:var(--ae-navy)]', expanded ? 'ml-auto' : 'absolute -right-0.5 -top-0.5')}
                        style={{ background: 'var(--ae-azure)' }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="flex-1" />

      {/* explicit collapse/expand — replaces hover-to-expand (default collapsed, persisted) */}
      <button
        aria-expanded={expanded}
        aria-label={expanded ? 'Thu gọn thanh điều hướng' : 'Mở rộng thanh điều hướng'}
        className="mb-1 grid h-[34px] w-[34px] flex-none cursor-pointer place-items-center self-center rounded-[10px] text-[color:var(--ae-dim)] transition-colors hover:bg-[var(--ae-fill)] hover:text-[color:var(--ae-azure-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ae-azure)]"
        onClick={toggleExpanded}
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        title={expanded ? 'Thu gọn' : 'Mở rộng'}
        type="button"
      >
        <svg
          aria-hidden
          fill="none"
          height={18}
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s var(--ae-ease)' }}
          viewBox="0 0 24 24"
          width={18}
        >
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.7} />
        </svg>
      </button>

      <div className="self-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Avatar />
      </div>
    </nav>
  )
}
