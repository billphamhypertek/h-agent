// apps/desktop/src/aether/ui/shell/top-bar.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $commandPaletteOpen, closeCommandPalette } from '@/store/command-palette'
import { $gatewayState } from '@/store/session'

import { formatAetherClock, TopBar } from './top-bar'

beforeEach(() => { closeCommandPalette(); $gatewayState.set('open') })
afterEach(() => { cleanup(); $gatewayState.set('idle') })

describe('TopBar', () => {
  it('formats the clock as Vietnamese weekday · DD.MM · HH:mm', () => {
    expect(formatAetherClock(new Date(2026, 5, 25, 9, 14))).toBe('Th 5 · 25.06 · 09:14')
  })
  it('renders the page title', () => {
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    expect(screen.getByRole('heading', { name: 'Trang chủ' })).toBeTruthy()
  })
  it('opens the command palette from the ⌘K bar', () => {
    expect($commandPaletteOpen.get()).toBe(false)
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    fireEvent.click(screen.getByTestId('ae-cmdk'))
    expect($commandPaletteOpen.get()).toBe(true)
  })
  it('renders the vital-sign and exactly one avatar', () => {
    render(<TopBar now={new Date(2026, 5, 25, 9, 14)} title="Trang chủ" />)
    expect(screen.getByTestId('ae-vital')).toBeTruthy()
    expect(screen.getAllByTestId('ae-avatar')).toHaveLength(1)
  })
})
