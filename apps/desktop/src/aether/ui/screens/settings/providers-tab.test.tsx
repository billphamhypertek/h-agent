import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $oauthFlow, $oauthProviders, $oauthStatus } from '@/aether/domain/settings/oauth-store'

import { ProvidersTab } from './providers-tab'

beforeEach(() => {
  $oauthStatus.set('ready')
  $oauthFlow.set({ phase: 'idle' })
  $oauthProviders.set({
    providers: [
      { id: 'anthropic', name: 'Anthropic', flow: 'device_code', cli_command: '', docs_url: '', status: { logged_in: true } },
      { id: 'openai', name: 'OpenAI', flow: 'pkce', cli_command: '', docs_url: '', status: { logged_in: false } }
    ]
  })
})
afterEach(cleanup)

describe('ProvidersTab', () => {
  it('lists providers with connected state in Vietnamese', () => {
    render(<ProvidersTab />)
    expect(screen.getByText('Anthropic')).toBeTruthy()
    expect(screen.getByText('OpenAI')).toBeTruthy()
    expect(screen.getByText(/Đã kết nối/)).toBeTruthy()
  })

  it('shows a connect button for a disconnected provider', () => {
    render(<ProvidersTab />)
    const buttons = screen.getAllByRole('button', { name: /Kết nối/ })
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('renders the device-code instructions when a flow is awaiting', () => {
    $oauthFlow.set({
      phase: 'awaiting',
      providerId: 'anthropic',
      sessionId: 's1',
      start: { flow: 'device_code', session_id: 's1', user_code: 'WXYZ-1234', verification_url: 'https://verify', expires_in: 600, poll_interval: 5 }
    })
    render(<ProvidersTab />)
    expect(screen.getByText(/WXYZ-1234/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Hủy/ })).toBeTruthy()
  })
})
