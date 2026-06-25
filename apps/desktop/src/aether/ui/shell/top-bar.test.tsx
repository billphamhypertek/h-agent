// apps/desktop/src/aether/ui/shell/top-bar.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { formatAetherClock, TopBar } from './top-bar'

afterEach(cleanup)

describe('TopBar', () => {
  it('formats the clock as Vietnamese weekday · DD.MM · HH:mm', () => {
    // 2026-06-25 is a Thursday
    const out = formatAetherClock(new Date(2026, 5, 25, 9, 14))
    expect(out).toBe('Th 5 · 25.06 · 09:14')
  })
  it('renders the page title', () => {
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    expect(screen.getByRole('heading', { name: 'Trang chủ' })).toBeTruthy()
  })
})
