// apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $bootDone, $bootProgress } from '@/aether/domain/boot/boot-store'
import { $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import { $connection, $gatewayState } from '@/store/session'
import { HUD_ROUTE } from '@/app/routes'

import { AetherShell } from './aether-shell'

beforeEach(() => {
  vi.stubGlobal('aetherDesktop', { getBootProgress: vi.fn().mockResolvedValue(null), onBootProgress: () => () => {} })
  // jsdom has no matchMedia; the shell's useMotionEnabled() probes prefers-reduced-motion.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
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

function mountShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AetherShell chatView={<div data-testid="chat" />} />
    </MemoryRouter>,
  )
}

describe('AetherShell layering (regression b: shell-level double-pad)', () => {
  beforeEach(() => {
    $bootDone.set(true) // skip the Boot overlay so the real shell renders
    $gatewayState.set('open')
  })

  it('the content wrapper owns exactly one --ae-page-* gutter', () => {
    const { container } = mountShell(HUD_ROUTE)
    const gutters = container.querySelectorAll('[class*="--ae-page-"]')
    expect(gutters.length).toBe(1)
  })
  it('the screen root has no arbitrary p-[...] padding (no self-pad/double-pad)', () => {
    const { container } = mountShell(HUD_ROUTE)
    const screen = container.querySelector('.ae-screen-bare') as HTMLElement
    expect(screen).toBeTruthy()
    expect(screen.className).not.toMatch(/\bp-\[/)
  })
  it('regression a: nav rail padding-top is 34px on macOS windowed', () => {
    $connection.set({
      baseUrl: '', isFullscreen: false, nativeOverlayWidth: 0, token: '', wsUrl: '', logs: [],
      windowButtonPosition: { x: 24, y: 12 },
    } as never)
    const { container } = mountShell(HUD_ROUTE)
    const rail = container.querySelector('.ae-rail') as HTMLElement
    expect(rail.style.paddingTop).toBe('34px')
  })
  // In jsdom no onWindowStateChanged event fires, so useTitlebarInset's fullscreenOverride
  // stays null and the inset falls back to connection.isFullscreen — exactly what we set here.
  it('regression a: nav rail padding-top is 0 in fullscreen with non-null windowButtonPosition', () => {
    $connection.set({
      baseUrl: '', isFullscreen: true, nativeOverlayWidth: 0, token: '', wsUrl: '', logs: [],
      windowButtonPosition: { x: 24, y: 12 },
    } as never)
    const { container } = mountShell(HUD_ROUTE)
    const rail = container.querySelector('.ae-rail') as HTMLElement
    expect(rail.style.paddingTop).toBe('0px')
  })
})
