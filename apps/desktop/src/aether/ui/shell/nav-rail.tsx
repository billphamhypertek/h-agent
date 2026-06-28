import { useState } from 'react'

import { Avatar } from '@/aether/ui/components/avatar'
import { Icon } from '@/aether/ui/components/icon/icon'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { GEOMETRY } from '@/aether/ui/theme/geometry'
import { HUD_ROUTE } from '@/app/routes'
import { cn } from '@/lib/utils'

import { AETHER_NAV_GROUPS, AETHER_NAV_ITEMS, type NavItem } from './nav-items'
import { navIndicatorTransform } from './use-nav-indicator'
import { useTitlebarInset } from './use-titlebar-inset'

const ITEM_H = GEOMETRY.nav.item
const GAP = GEOMETRY.nav.gap

export interface NavRailProps {
  items?: NavItem[]
  activeRoute: string
  onNavigate: (route: string) => void
}

export function NavRail({ items = AETHER_NAV_ITEMS, activeRoute, onNavigate }: NavRailProps) {
  const [expanded, setExpanded] = useState(false)
  const titlebarInset = useTitlebarInset()
  const activeIndex = items.findIndex(i => i.route === activeRoute)
  const transform = navIndicatorTransform(activeIndex, ITEM_H, GAP)

  return (
    <nav
      aria-label="HYPERTEK - AGENT PLATFORM"
      className="ae-rail relative flex flex-none flex-col gap-1.5 pb-3.5"
      data-expanded={expanded || undefined}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
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
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {transform && <div className="ae-nav-indicator" style={{ transform, ['--ae-nav-item-h' as string]: `${ITEM_H}px` }} />}
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
                      'relative z-[1] flex h-[38px] items-center gap-2.5 rounded-[11px] px-2 transition-colors',
                      active ? 'text-white' : 'text-[color:var(--ae-dim)] hover:text-[color:var(--ae-azure-soft)]',
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
      <div className="self-center" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Avatar />
      </div>
    </nav>
  )
}
