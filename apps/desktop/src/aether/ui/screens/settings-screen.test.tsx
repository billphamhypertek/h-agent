import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $modelInfo, $modelOptions, $modelStatus } from '@/aether/domain/settings/model-store'

import { SettingsScreen } from './settings-screen'

beforeEach(() => {
  $modelStatus.set('ready')
  $modelInfo.set({ model: 'm1', provider: 'p1' })
  $modelOptions.set({ providers: [{ name: 'Provider One', slug: 'p1', models: ['m1'] }] })
})
afterEach(cleanup)

describe('SettingsScreen', () => {
  it('renders the five tab labels in Vietnamese', () => {
    render(<SettingsScreen />)
    expect(screen.getByRole('button', { name: 'Mô hình' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Providers/OAuth' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Khóa môi trường' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Công cụ' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Giao diện' })).toBeTruthy()
  })

  it('shows the Model tab by default and keeps "Agent" untranslated nowhere mistranslated', () => {
    render(<SettingsScreen />)
    expect(screen.getByText('MÔ HÌNH CHÍNH')).toBeTruthy()
    expect(screen.queryByText(/Đại lý/)).toBeNull()
  })

  it('switches tabs when a tab button is clicked', () => {
    render(<SettingsScreen />)
    fireEvent.click(screen.getByRole('button', { name: 'Giao diện' }))
    expect(screen.queryByText('MÔ HÌNH CHÍNH')).toBeNull()
  })
})
