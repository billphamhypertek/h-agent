import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as AetherApi from '@/aether-api'
import * as onboarding from '@/store/onboarding'

import { PickerView } from './picker-view'

// Partial-mock @/aether-api so the namespace-spy store + any other functions the
// screen/store reach for still resolve to the real implementations. We only
// override the two REST reads the augmented key form consumes:
//   - getGlobalModelOptions → drives useApiKeyCatalog augmentation
//   - getEnvVars            → drives the is_set / redacted_value affordance
const getGlobalModelOptions = vi.fn()
const getEnvVars = vi.fn()

vi.mock('@/aether-api', async importActual => {
  const actual = await importActual<typeof AetherApi>()

  return {
    ...actual,
    getGlobalModelOptions: (...args: unknown[]) => getGlobalModelOptions(...args),
    getEnvVars: (...args: unknown[]) => getEnvVars(...args),
  }
})

const ctx: onboarding.OnboardingContext = { requestGateway: vi.fn() }

// Force the key form by seeding apikey mode with no OAuth providers.
const apikeyState = {
  configured: false as boolean | null,
  flow: { status: 'idle' as const },
  mode: 'apikey' as const,
  providers: [] as never[],
  reason: null,
  requested: false,
  firstRunSkipped: false,
  manual: false,
  localEndpoint: false,
}

beforeEach(() => {
  getGlobalModelOptions.mockResolvedValue({ providers: [] })
  getEnvVars.mockResolvedValue({})
  onboarding.$desktopOnboarding.set({ ...apikeyState })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PickerView ApiKeyForm — augmented catalog', () => {
  it('renders the curated options synchronously and augments with extra api_key providers', async () => {
    getGlobalModelOptions.mockResolvedValue({
      providers: [
        { slug: 'deepseek', name: 'DeepSeek', auth_type: 'api_key', key_env: 'DEEPSEEK_API_KEY' },
      ],
    })

    render(<PickerView ctx={ctx} />)

    // Curated entries render on the first synchronous pass.
    expect(screen.getByText('OpenRouter')).toBeTruthy()
    expect(screen.getByText('OpenAI')).toBeTruthy()

    // The extra api_key provider flows in once the async fetch resolves.
    expect(await screen.findByText('DeepSeek')).toBeTruthy()
  })
})

describe('PickerView ApiKeyForm — redacted-key affordance', () => {
  it('shows a set-indicator and surfaces the redacted value as the placeholder', async () => {
    getEnvVars.mockResolvedValue({
      OPENAI_API_KEY: {
        advanced: false,
        category: 'provider',
        description: 'OpenAI API key',
        is_password: true,
        is_set: true,
        redacted_value: 'sk-12…wxyz',
        tools: [],
        url: null,
      },
    })

    render(<PickerView ctx={ctx} />)

    // Select the OpenAI option (curated, renders synchronously).
    fireEvent.click(screen.getByText('OpenAI'))

    // (a) the OpenAI option shows the set-indicator once env state resolves.
    await waitFor(() => expect(screen.getByTestId('ae-key-set-OPENAI_API_KEY')).toBeTruthy())

    // (b) the redacted value is surfaced as the input placeholder.
    await waitFor(() => {
      const input = document.querySelector('input[type="password"]') as HTMLInputElement | null
      expect(input?.placeholder).toBe('sk-12…wxyz')
    })
  })

  // Negative path (folded in from F2 review): with the default getEnvVars mock
  // returning no set keys ({}), the set-indicator must NOT render — proving the
  // affordance is gated on is_set, not always present.
  it('omits the set-indicator when the key is not set', () => {
    // beforeEach already seeds getEnvVars.mockResolvedValue({}).
    render(<PickerView ctx={ctx} />)

    expect(screen.queryByTestId('ae-key-set-OPENAI_API_KEY')).toBeNull()
  })
})
