// apps/desktop/src/aether/ui/shell/aether-shell.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import type { AgentsView } from '@/aether/domain/agents/agents-view'
import { $bootDone, $bootProgress } from '@/aether/domain/boot/boot-store'
import { $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import { HUD_ROUTE } from '@/app/routes'
import { $commandPaletteOpen, closeCommandPalette } from '@/store/command-palette'
import { $connection, $gatewayState } from '@/store/session'

import { AetherShell } from './aether-shell'
import { $overlay } from './overlay-host'

beforeEach(() => {
  vi.stubGlobal('aetherDesktop', { getBootProgress: vi.fn().mockResolvedValue(null), onBootProgress: () => () => {} })
  // jsdom has no matchMedia; the shell's useMotionEnabled() probes prefers-reduced-motion.
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  // jsdom has no ResizeObserver; cmdk (inside the shell-mounted <CommandPalette/>) needs it.
  vi.stubGlobal('ResizeObserver', class { disconnect() {} observe() {} unobserve() {} })
  // cmdk scrolls the selected item into view on open; jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn()
  $bootDone.set(false)
  $bootProgress.set(null)
  $briefingStatus.set('ready')
  closeCommandPalette()
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

// The shell now mounts <CommandPalette/> at shell scope, which calls useQuery
// unconditionally — so every AetherShell render needs a QueryClient in scope
// (the real app provides one at the <main> root).
function renderShell(initialPath: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <AetherShell chatView={<div data-testid="chat" />} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AetherShell', () => {
  it('shows the Boot overlay until boot completes', () => {
    renderShell(HUD_ROUTE)
    expect(screen.getByText('HYPERTEK - AGENT PLATFORM')).toBeTruthy()
  })
  it('reveals the shell + HUD once boot is done', () => {
    $bootDone.set(true)
    renderShell(HUD_ROUTE)
    // nav rail present (brand nav landmark) and the top-bar ⌘K chip visible
    expect(screen.getByRole('navigation', { name: 'HYPERTEK - AGENT PLATFORM' })).toBeTruthy()
    expect(screen.getByTestId('ae-cmdk')).toBeTruthy()
  })
})

const mountShell = renderShell

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

describe('AetherShell ⌘K wiring', () => {
  beforeEach(() => { $bootDone.set(true); closeCommandPalette() })

  it('the top-bar ⌘K opens the command palette store on click', () => {
    expect($commandPaletteOpen.get()).toBe(false)
    renderShell(HUD_ROUTE)
    // The top-bar ⌘K chip (ae-cmdk) calls openCommandPalette() on click.
    fireEvent.click(screen.getByTestId('ae-cmdk'))
    expect($commandPaletteOpen.get()).toBe(true)
  })

  it('mounts the command palette dialog when the store is open', () => {
    $commandPaletteOpen.set(true)
    renderShell(HUD_ROUTE)
    // radix Dialog renders the palette search input once open.
    expect(screen.getByPlaceholderText(/Search sessions, views, and actions/i)).toBeTruthy()
  })
})

describe('AetherShell Agents route', () => {
  beforeEach(() => {
    $bootDone.set(true)
    $gatewayState.set('open')
    $agentsStatus.set('ready')
    $agents.set({
      runningCount: 0,
      sessions: [],
      cron: [{ id: 'j1', name: 'Brief sáng', schedule: 'Mỗi 8h', enabled: true, nextRunAt: null, lastError: null }],
      skills: [],
      enabledSkillCount: 0,
    } satisfies AgentsView)
  })

  it('renders the AgentsScreen (read-only mission control) on /agents', () => {
    renderShell('/agents')
    expect(screen.getByText(/Mission control · Agent/)).toBeTruthy()
    expect(screen.getByText(/Chỉ xem/)).toBeTruthy()
  })
})

describe('AetherShell connection overlay (vital-driven, host-rendered)', () => {
  beforeEach(() => { $bootDone.set(true); $overlay.set(null) })
  afterEach(() => { $overlay.set(null) })

  it('opens a non-dismissable connection overlay when the gateway is down', () => {
    $gatewayState.set('error')
    renderShell(HUD_ROUTE)
    expect(screen.getByTestId('ae-overlay').getAttribute('data-kind')).toBe('connection')
  })
  it('shows no overlay while online', () => {
    $gatewayState.set('open')
    renderShell(HUD_ROUTE)
    expect(screen.queryByTestId('ae-overlay')).toBeNull()
  })
})
