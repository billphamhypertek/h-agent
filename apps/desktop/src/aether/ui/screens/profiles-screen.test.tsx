import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as store from '@/aether/domain/profiles/profiles-store'
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

describe('ProfilesScreen mutations', () => {
  it('create flow calls createProfileAction with the typed name', async () => {
    const spy = vi.spyOn(store, 'createProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByRole('button', { name: /Tạo hồ sơ/ }))
    fireEvent.change(screen.getByTestId('ae-new-profile-name'), { target: { value: 'qa' } })
    fireEvent.click(screen.getByRole('button', { name: /^Tạo$/ }))
    expect(spy).toHaveBeenCalledWith('qa')
    spy.mockRestore()
  })

  it('rename flow calls renameProfileAction for the selected profile', () => {
    $activeProfile.set('coder')
    const spy = vi.spyOn(store, 'renameProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Đổi tên/ }))
    fireEvent.change(screen.getByTestId('ae-rename-profile-name'), { target: { value: 'coder2' } })
    fireEvent.click(screen.getByRole('button', { name: /^Lưu tên$/ }))
    expect(spy).toHaveBeenCalledWith('coder', 'coder2')
    spy.mockRestore()
  })

  it('delete flow calls deleteProfileAction for the selected profile', () => {
    const spy = vi.spyOn(store, 'deleteProfileAction').mockResolvedValue()
    render(<ProfilesScreen />)
    fireEvent.click(screen.getByTestId('ae-profile-row-coder'))
    fireEvent.click(screen.getByRole('button', { name: /Xoá/ }))
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận xoá/ }))
    expect(spy).toHaveBeenCalledWith('coder')
    spy.mockRestore()
  })
})
