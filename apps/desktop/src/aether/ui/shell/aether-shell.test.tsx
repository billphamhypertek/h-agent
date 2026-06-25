// apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $bootDone, $bootProgress } from '@/aether/domain/boot/boot-store'
import { $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import { HUD_ROUTE } from '@/app/routes'

import { AetherShell } from './aether-shell'

beforeEach(() => {
  vi.stubGlobal('hermesDesktop', { getBootProgress: vi.fn().mockResolvedValue(null), onBootProgress: () => () => {} })
  $bootDone.set(false)
  $bootProgress.set(null)
  $briefingStatus.set('ready')
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('AetherShell', () => {
  it('shows the Boot overlay until boot completes', () => {
    render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
  })
  it('reveals the shell + HUD once boot is done', () => {
    $bootDone.set(true)
    render(<MemoryRouter initialEntries={[HUD_ROUTE]}><AetherShell chatView={<div />} /></MemoryRouter>)
    // nav rail present (brand nav landmark) and HUD command bar visible
    expect(screen.getByRole('navigation', { name: 'HYPERTEK - AGENT PLATFORM' })).toBeTruthy()
    expect(screen.getByText('⌘K')).toBeTruthy()
  })
})
