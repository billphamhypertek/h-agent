// apps/desktop/src/aether/ui/components/command-bar.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CommandBar } from './command-bar'

afterEach(cleanup)

describe('CommandBar', () => {
  it('renders an enabled ⌘K chip (no "coming soon" inert state)', () => {
    render(<CommandBar />)
    const chip = screen.getByText('⌘K')
    expect(chip.getAttribute('aria-disabled')).toBeNull()
    expect(chip.getAttribute('title')).toBeNull()
    expect(chip.className).not.toMatch(/cursor-not-allowed/)
  })

  it('calls onActivate when the bar is clicked', () => {
    const onActivate = vi.fn()
    render(<CommandBar onActivate={onActivate} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onActivate).toHaveBeenCalledTimes(1)
  })

  it('calls onActivate on Enter', () => {
    const onActivate = vi.fn()
    render(<CommandBar onActivate={onActivate} />)
    fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
