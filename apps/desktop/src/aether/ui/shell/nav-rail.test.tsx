// apps/desktop/src/aether/ui/shell/nav-rail.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AETHER_NAV_ITEMS } from './nav-items'
import { NavRail } from './nav-rail'

afterEach(cleanup)

describe('NavRail', () => {
  it('never translates "Agent" to "Đại lý"', () => {
    const labels = AETHER_NAV_ITEMS.map(i => i.label).join(' ')
    expect(labels).not.toMatch(/Đại lý/i)
    expect(AETHER_NAV_ITEMS.some(i => /Agent/.test(i.label))).toBe(true)
  })
  it('renders a small pulsing online dot on the brand glyph (not a big status pill)', () => {
    render(<NavRail activeRoute="/" online onNavigate={vi.fn()} />)
    expect(screen.getByTestId('ae-online-dot')).toBeTruthy()
    expect(screen.queryByText(/online/i)).toBeNull() // no text pill
  })
  it('marks the active item and fires onNavigate on click', () => {
    const onNavigate = vi.fn()
    // item[0] is Home (route HUD_ROUTE); make it active, then click item[1] (Chat).
    render(<NavRail activeRoute={AETHER_NAV_ITEMS[0].route} onNavigate={onNavigate} />)
    const home = screen.getByRole('button', { name: AETHER_NAV_ITEMS[0].label })
    expect(home.getAttribute('aria-current')).toBe('page')
    const chat = screen.getByRole('button', { name: AETHER_NAV_ITEMS[1].label })
    fireEvent.click(chat)
    expect(onNavigate).toHaveBeenCalledWith(AETHER_NAV_ITEMS[1].route)
  })
})
