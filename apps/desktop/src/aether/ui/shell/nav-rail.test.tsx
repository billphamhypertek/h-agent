// apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HUD_ROUTE } from '@/app/routes'

import { AETHER_NAV_ITEMS } from './nav-items'
import { NavRail } from './nav-rail'

afterEach(cleanup)

describe('NavRail', () => {
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })

  it('renders the living glyph as the Home button (vital-state orb, role=status)', () => {
    const onNavigate = vi.fn()
    render(<NavRail activeRoute="/" onNavigate={onNavigate} />)
    const home = screen.getByRole('button', { name: 'Trang chủ' })
    expect(home.querySelector('[role="status"]')).toBeTruthy() // the living orb
    fireEvent.click(home)
    expect(onNavigate).toHaveBeenCalledWith(HUD_ROUTE)
  })

  it('no longer renders the binary azure online dot (moved to VitalSign)', () => {
    render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    expect(screen.queryByTestId('ae-online-dot')).toBeNull()
  })

  it('shows group headers only when expanded (hover)', () => {
    const { container } = render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    expect(screen.queryByText('Trụ cột')).toBeNull()
    fireEvent.mouseEnter(container.querySelector('nav') as HTMLElement)
    expect(screen.getByText('Trụ cột')).toBeTruthy()
    expect(screen.getByText('Hệ agent')).toBeTruthy()
  })

  it('marks the active item and fires onNavigate on click', () => {
    const onNavigate = vi.fn()
    render(<NavRail activeRoute="/agents" onNavigate={onNavigate} />)
    const agents = screen.getByRole('button', { name: 'Agents' })
    expect(agents.getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Skills' }))
    expect(onNavigate).toHaveBeenCalledWith('/skills')
  })

  it('renders a numeric badge when an item provides one', () => {
    const items = AETHER_NAV_ITEMS.map(i => (i.id === 'inbox' ? { ...i, badge: 3 } : i))
    render(<NavRail activeRoute="/" items={items} onNavigate={vi.fn()} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
