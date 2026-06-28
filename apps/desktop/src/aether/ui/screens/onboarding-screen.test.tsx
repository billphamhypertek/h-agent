import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as onboarding from '@/store/onboarding'
import type { OAuthProvider } from '@/types/aether'

import { AetherOnboarding } from './onboarding-screen'

function provider(id: string, name = id): OAuthProvider {
  return {
    cli_command: `aether login ${id}`,
    docs_url: `https://example.com/${id}`,
    flow: 'pkce',
    id,
    name,
    status: { logged_in: false },
  }
}

const base = {
  configured: false as boolean | null,
  flow: { status: 'idle' as const },
  mode: 'oauth' as const,
  providers: [] as never[],
  reason: null,
  requested: false,
  firstRunSkipped: false,
  manual: false,
  localEndpoint: false,
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  // The pending-provider hand-off is module-level state in the store; clear it
  // so the C1 deep-link test can't leak a stashed id into other tests.
  onboarding.clearPendingProviderOAuth()
})

describe('AetherOnboarding gate', () => {
  beforeEach(() => onboarding.$desktopOnboarding.set({ ...base }))

  it('renders nothing once configured (and not manual)', () => {
    onboarding.$desktopOnboarding.set({ ...base, configured: true })
    const { container } = render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the wizard on first run (configured === false, enabled)', () => {
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    expect(screen.getByTestId('ae-onboarding')).toBeTruthy()
  })

  it('"Bỏ qua" dismisses the first-run gate', () => {
    const spy = vi.spyOn(onboarding, 'dismissFirstRunOnboarding').mockImplementation(() => {})
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ae-onboarding-skip'))
    expect(spy).toHaveBeenCalled()
  })
})

describe('AetherOnboarding provider deep-link (C1)', () => {
  it('auto-launches the stashed provider OAuth flow once the list loads', () => {
    const spy = vi.spyOn(onboarding, 'startProviderOAuth').mockImplementation(async () => {})
    const nous = provider('nous', 'Nous Portal')

    // Stash a pending id exactly the way the Settings deep-link callers do.
    // This flips the store into manual mode + kicks an async provider refresh,
    // so we immediately seed the precise state the effect needs.
    onboarding.startManualProviderOAuth('nous')
    onboarding.$desktopOnboarding.set({
      ...base,
      configured: true,
      manual: true,
      providers: [nous] as never,
      flow: { status: 'idle' },
    })

    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)

    expect(spy).toHaveBeenCalled()
    expect(spy).toHaveBeenCalledWith(nous, expect.anything())
  })
})

describe('AetherOnboarding finish', () => {
  it('confirming_model → "Bắt đầu" calls confirmOnboardingModel', () => {
    const spy = vi.spyOn(onboarding, 'confirmOnboardingModel').mockImplementation(() => {})
    onboarding.$desktopOnboarding.set({
      ...base,
      configured: false,
      flow: { status: 'confirming_model', currentModel: 'nous-1', label: 'Nous', providerSlug: 'nous', saving: false },
    })
    render(<AetherOnboarding enabled requestGateway={vi.fn()} />)
    fireEvent.click(screen.getByTestId('ae-onboarding-begin'))
    expect(spy).toHaveBeenCalled()
  })
})
