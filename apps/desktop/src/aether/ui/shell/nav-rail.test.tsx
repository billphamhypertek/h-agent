// apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HUD_ROUTE } from '@/app/routes'

import { AETHER_NAV_ITEMS } from './nav-items'
import { NavRail } from './nav-rail'

afterEach(() => {
  cleanup()
  // Collapse state is persisted to localStorage; clear it so tests don't leak.
  localStorage.clear()
})

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

  it('is collapsed by default and expands via the explicit toggle (no hover dependency)', () => {
    render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    // Default collapsed → group headers hidden.
    expect(screen.queryByText('Trụ cột')).toBeNull()
    const toggle = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' })
    expect(toggle.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(toggle)
    expect(screen.getByText('Trụ cột')).toBeTruthy()
    expect(screen.getByText('Hệ agent')).toBeTruthy()
    // Toggle now offers to collapse.
    expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' }).getAttribute('aria-expanded')).toBe('true')
  })

  it('persists the expanded choice across remounts', () => {
    const { unmount } = render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' }))
    unmount()
    render(<NavRail activeRoute="/" onNavigate={vi.fn()} />)
    // Remembered as expanded → headers visible immediately, toggle shows collapse.
    expect(screen.getByText('Trụ cột')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toBeTruthy()
  })

  it('marks the active item and fires onNavigate on click', () => {
    const onNavigate = vi.fn()
    render(<NavRail activeRoute="/agents" onNavigate={onNavigate} />)
    const agents = screen.getByRole('button', { name: 'Agents' })
    expect(agents.getAttribute('aria-current')).toBe('page')
    fireEvent.click(screen.getByRole('button', { name: 'Skills' }))
    expect(onNavigate).toHaveBeenCalledWith('/skills')
  })

  it('renders the focus-pill indicator for an active rendered route, hides it when no item matches', () => {
    // jsdom has no layout (offsetTop reads 0), so we assert presence/absence + the
    // active button's aria-current marker — NOT an exact pixel transform.
    const { container, rerender } = render(<NavRail activeRoute="/agents" onNavigate={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Agents' }).getAttribute('aria-current')).toBe('page')
    expect(container.querySelector('.ae-nav-indicator')).toBeTruthy()

    // A route that maps to no RENDERED button (HUD/home is filtered out of the list,
    // its affordance is the living glyph) → no highlighted button → indicator hidden.
    rerender(<NavRail activeRoute="/no-such-route" onNavigate={vi.fn()} />)
    expect(container.querySelector('[aria-current="page"]')).toBeNull()
    expect(container.querySelector('.ae-nav-indicator')).toBeNull()
  })

  it('renders a numeric badge when an item provides one', () => {
    const items = AETHER_NAV_ITEMS.map(i => (i.id === 'inbox' ? { ...i, badge: 3 } : i))
    render(<NavRail activeRoute="/" items={items} onNavigate={vi.fn()} />)
    expect(screen.getByText('3')).toBeTruthy()
  })
})
