import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as onboarding from '@/store/onboarding'

import { AetherOnboarding } from './onboarding-screen'

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
