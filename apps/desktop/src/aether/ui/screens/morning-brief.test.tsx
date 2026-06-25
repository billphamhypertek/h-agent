// apps/desktop/src/aether/ui/screens/morning-brief.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import { $briefing, $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'

import { MorningBrief } from './morning-brief'

beforeEach(() => {
  $briefing.set(sample as unknown as Briefing)
  $briefingStatus.set('ready')
})
afterEach(cleanup)

describe('MorningBrief', () => {
  it('greets by name and lists every priority', () => {
    render(<MorningBrief />)
    expect(screen.getByText(/Bình/)).toBeTruthy()
    expect(screen.getAllByTestId('ae-priority-row')).toHaveLength(4)
  })
  it('renders a warn-styled row for the abnormal server', () => {
    render(<MorningBrief />)
    expect(screen.getAllByText(/CPU 82%/).length).toBeGreaterThan(0)
  })
})
