import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $configRecord, $configSchema, $configStatus } from '@/aether/domain/settings/config-store'

const setMode = vi.fn()
const setTheme = vi.fn()

vi.mock('@/themes/context', () => ({
  useTheme: () => ({
    themeName: 'aether',
    mode: 'dark',
    resolvedMode: 'dark',
    setMode,
    setTheme,
    availableThemes: [
      { name: 'aether', label: 'AETHER', description: '' },
      { name: 'nous', label: 'Nous', description: '' }
    ]
  })
}))

beforeEach(() => {
  setMode.mockClear()
  setTheme.mockClear()
  $configStatus.set('ready')
  $configSchema.set({ category_order: ['general'], fields: { 'display.personality': { type: 'string', category: 'general', description: 'Tính cách' } } })
  $configRecord.set({ display: { personality: 'calm' } })
})
afterEach(cleanup)

describe('AppearanceTab', () => {
  it('renders mode + skin controls', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    expect(screen.getByText(/Chế độ màu/)).toBeTruthy()
    expect(screen.getByText(/Giao diện \(skin\)/)).toBeTruthy()
  })

  it('changes color mode through the theme store', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    fireEvent.click(screen.getByRole('button', { name: 'Sáng' }))
    expect(setMode).toHaveBeenCalledWith('light')
  })

  it('renders a schema-driven field from the config schema', async () => {
    const { AppearanceTab } = await import('./appearance-tab')
    render(<AppearanceTab />)
    expect(screen.getByTestId('ae-config-display.personality')).toBeTruthy()
  })
})
