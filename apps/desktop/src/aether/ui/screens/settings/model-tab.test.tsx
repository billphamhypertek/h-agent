import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $modelInfo, $modelOptions, $modelStatus } from '@/aether/domain/settings/model-store'

import { ModelTab } from './model-tab'

beforeEach(() => {
  $modelStatus.set('ready')
  $modelInfo.set({ model: 'm1', provider: 'p1' })
  $modelOptions.set({
    model: 'm1',
    provider: 'p1',
    providers: [{ name: 'Provider One', slug: 'p1', models: ['m1', 'm2'] }]
  })
})
afterEach(cleanup)

describe('ModelTab', () => {
  it('shows the current model', () => {
    render(<ModelTab />)
    expect(screen.getAllByText(/Provider One/).length).toBeGreaterThan(0)
    expect(screen.getAllByText('m1').length).toBeGreaterThan(0)
  })

  it('renders a Vietnamese error + retry when status is error', () => {
    $modelStatus.set('error')
    render(<ModelTab />)
    expect(screen.getByText(/Không tải được/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })

  it('applies a model selection via the Apply button', () => {
    const onApply = vi.fn()
    render(<ModelTab onApplyMain={onApply} />)
    fireEvent.change(screen.getByTestId('ae-model-provider'), { target: { value: 'p1' } })
    fireEvent.change(screen.getByTestId('ae-model-model'), { target: { value: 'm2' } })
    fireEvent.click(screen.getByRole('button', { name: /Áp dụng/ }))
    expect(onApply).toHaveBeenCalledWith('p1', 'm2')
  })
})
