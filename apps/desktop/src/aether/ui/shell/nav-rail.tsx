import { cn } from '@/lib/utils'

import { AETHER_NAV_ITEMS, type NavItem } from './nav-items'
import { navIndicatorTransform } from './use-nav-indicator'

const ITEM_H = 38
const GAP = 5

export interface NavRailProps {
  items?: NavItem[]
  activeRoute: string
  onNavigate: (route: string) => void
  online?: boolean
}

export function NavRail({ items = AETHER_NAV_ITEMS, activeRoute, onNavigate, online = false }: NavRailProps) {
  const activeIndex = items.findIndex(i => i.route === activeRoute)
  const transform = navIndicatorTransform(activeIndex, ITEM_H, GAP)

  return (
    <nav
      aria-label="HYPERTEK - AGENT PLATFORM"
      className="ae-rail relative flex w-[62px] flex-none flex-col items-center gap-1.5 py-3.5"
      style={{ borderRight: '1px solid var(--ae-line)', background: 'linear-gradient(180deg,rgba(120,190,240,.07),rgba(120,190,240,.02))' }}
    >
      {/* brand glyph + online dot */}
      <div className="relative mb-2 grid h-[34px] w-[34px] place-items-center rounded-[10px]"
        style={{ background: 'linear-gradient(145deg,rgba(120,210,255,.35),rgba(7,57,125,.15))', border: '1px solid rgba(150,220,255,.4)' }}>
        <svg fill="none" height={17} style={{ filter: 'drop-shadow(0 0 6px var(--ae-azure))' }} viewBox="0 0 24 24" width={17}>
          <path d="M12 2 L21 20 H15 L12 13 L9 20 H3 Z" fill="rgba(74,163,255,.25)" stroke="var(--ae-ink)" strokeLinejoin="round" strokeWidth={1.6} />
        </svg>
        {online && (
          <span
            className="absolute -right-0.5 -top-0.5 h-[7px] w-[7px] rounded-full"
            data-testid="ae-online-dot"
            style={{ background: 'var(--ae-ok)', boxShadow: '0 0 8px var(--ae-ok)' }}
          />
        )}
      </div>

      {/* item column with sliding indicator */}
      <div className="relative flex w-full flex-col items-center gap-[5px]">
        {transform && <div className="ae-nav-indicator" style={{ transform, ['--ae-nav-item-h' as string]: `${ITEM_H}px` }} />}
        {items.map(item => {
          const active = item.route === activeRoute

          return (
            <button
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              className={cn(
                'relative z-[1] grid h-[38px] w-10 place-items-center rounded-[11px] transition-colors',
                active ? 'text-white' : 'text-[color:var(--ae-dim)] hover:text-[color:var(--ae-azure-soft)]',
              )}
              key={item.id}
              onClick={() => onNavigate(item.route)}
              title={item.label}
              type="button"
            >
              {item.icon}
            </button>
          )
        })}
      </div>

      <div className="flex-1" />
      <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-[#06283c]"
        style={{ background: 'radial-gradient(circle at 35% 30%,#cdf2ff,var(--ae-azure) 70%,var(--ae-azure-bright))' }}>
        B
      </div>
    </nav>
  )
}
