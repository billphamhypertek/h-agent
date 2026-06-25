// apps/desktop/src/aether/ui/screens/boot-sequence.test.tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $bootProgress } from '@/aether/domain/boot/boot-store'

import { BootSequence } from './boot-sequence'

beforeEach(() => $bootProgress.set(null))
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('BootSequence', () => {
  it('shows the platform tagline and current percentage', () => {
    $bootProgress.set({ error: null, fakeMode: true, message: 'Đang đồng bộ…', phase: 'backend.spawn', progress: 84, running: true, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
    expect(screen.getByText('84%')).toBeTruthy()
  })
  it('surfaces a boot error with a log affordance', () => {
    const revealLogs = vi.fn()
    vi.stubGlobal('aetherDesktop', { revealLogs })
    $bootProgress.set({ error: 'spawn failed', fakeMode: false, message: 'Lỗi', phase: 'backend.error', progress: 28, running: false, timestamp: 0 })
    render(<BootSequence />)
    expect(screen.getByText(/spawn failed/i)).toBeTruthy()
    expect(screen.getByText('Mở log')).toBeTruthy()
    fireEvent.click(screen.getByText('Mở log'))
    expect(revealLogs).toHaveBeenCalled()
  })
})
