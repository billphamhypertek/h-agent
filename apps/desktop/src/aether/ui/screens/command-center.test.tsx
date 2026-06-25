// apps/desktop/src/aether/ui/screens/command-center.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import { $briefing, $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'

import { CommandCenter } from './command-center'

beforeEach(() => {
  $briefing.set(sample as Briefing)
  $briefingStatus.set('ready')
})
afterEach(cleanup)

describe('CommandCenter HUD', () => {
  it('renders bento tiles from the briefing', () => {
    render(<CommandCenter />)
    expect(screen.getByText(/142M ₫/)).toBeTruthy()
    expect(screen.getByText(/BMad story 4.2/)).toBeTruthy()
    expect(screen.getAllByText(/h-workspace/).length).toBeGreaterThan(0)
  })
  it('shows the command bar with the ⌘K hint', () => {
    render(<CommandCenter />)
    expect(screen.getByText('⌘K')).toBeTruthy()
  })
})
