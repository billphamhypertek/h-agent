// apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $bootProgress } from '@/aether/domain/boot/boot-store'

import { BootSequence } from './boot-sequence'

beforeEach(() => $bootProgress.set(null))
afterEach(cleanup)

describe('BootSequence', () => {
  it('shows the platform tagline and current percentage', () => {
    $bootProgress.set({ error: null, fakeMode: true, message: 'Đang đồng bộ…', phase: 'backend.spawn', progress: 84, running: true, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
    expect(screen.getByText('84%')).toBeTruthy()
  })
  it('surfaces a boot error with a log affordance', () => {
    $bootProgress.set({ error: 'spawn failed', fakeMode: false, message: 'Lỗi', phase: 'backend.error', progress: 28, running: false, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText(/spawn failed/i)).toBeTruthy()
  })
})
