import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $activeProfile, $profiles, $profilesStatus } from '@/aether/domain/profiles/profiles-store'
import type { ProfileInfo } from '@/types/aether'

import { ProfilesScreen } from './profiles-screen'

const ROWS: ProfileInfo[] = [
  { name: 'default', path: '/h/default', is_default: true, has_env: true, model: 'sonnet', provider: 'anthropic', skill_count: 3 },
  { name: 'coder', path: '/h/coder', is_default: false, has_env: false, model: null, provider: null, skill_count: 0 }
]

beforeEach(() => {
  $profiles.set(ROWS)
  $profilesStatus.set('ready')
  $activeProfile.set('coder')
})
afterEach(cleanup)

describe('ProfilesScreen', () => {
  it('renders one card per profile', () => {
    render(<ProfilesScreen />)
    expect(screen.getAllByTestId('ae-profile-row')).toHaveLength(2)
    expect(screen.getByText('default')).toBeTruthy()
    expect(screen.getByText('coder')).toBeTruthy()
  })

  it('marks the active profile', () => {
    render(<ProfilesScreen />)
    const active = screen.getByTestId('ae-profile-row-coder')
    expect(active.getAttribute('data-active')).toBe('true')
    expect(screen.getByTestId('ae-profile-row-default').getAttribute('data-active')).toBe('false')
  })

  it('shows a Vietnamese empty state', () => {
    $profiles.set([])
    $profilesStatus.set('empty')
    render(<ProfilesScreen />)
    expect(screen.getByText(/Chưa có hồ sơ nào/)).toBeTruthy()
  })

  it('shows an error state with a retry control', () => {
    $profilesStatus.set('error')
    render(<ProfilesScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })
})
