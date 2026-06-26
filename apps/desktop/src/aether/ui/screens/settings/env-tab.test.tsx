import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $envStatus, $envVars, $revealed } from '@/aether/domain/settings/env-store'

import { EnvTab } from './env-tab'

const sample = {
  OPENAI_API_KEY: {
    advanced: false,
    category: 'provider',
    description: 'Khóa OpenAI',
    is_password: true,
    is_set: true,
    redacted_value: 'sk-…ab',
    provider_label: 'OpenAI',
    tools: [],
    url: null
  }
}

beforeEach(() => {
  $envStatus.set('ready')
  $revealed.set({})
  $envVars.set(sample as never)
})
afterEach(cleanup)

describe('EnvTab', () => {
  it('renders the key masked (password) by default', () => {
    render(<EnvTab />)
    expect(screen.getByText('OPENAI_API_KEY')).toBeTruthy()
    const input = screen.getByTestId('ae-env-OPENAI_API_KEY') as HTMLInputElement
    expect(input.type).toBe('password')
  })

  it('shows a Vietnamese empty state when status is empty', () => {
    $envStatus.set('empty')
    render(<EnvTab />)
    expect(screen.getByText(/Chưa có khóa môi trường/)).toBeTruthy()
  })

  it('calls onReveal when the reveal button is pressed', () => {
    const onReveal = vi.fn()
    render(<EnvTab onReveal={onReveal} />)
    fireEvent.click(screen.getByRole('button', { name: /Hiện/ }))
    expect(onReveal).toHaveBeenCalledWith('OPENAI_API_KEY')
  })
})
