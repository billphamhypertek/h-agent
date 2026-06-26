import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { MessagingPlatformInfo } from '@/types/aether'
import { $platforms, $platformsStatus } from '@/aether/domain/messaging/messaging-store'

import { MessagingScreen } from './messaging-screen'

const telegram: MessagingPlatformInfo = {
  id: 'telegram', name: 'Telegram', description: 'Bot chat', docs_url: 'https://x',
  enabled: true, configured: true, state: 'connected', gateway_running: true, env_vars: []
}
const slack: MessagingPlatformInfo = {
  id: 'slack', name: 'Slack', description: 'Workspace', docs_url: 'https://x',
  enabled: false, configured: false, state: 'disabled', gateway_running: true, env_vars: []
}

afterEach(cleanup)

describe('MessagingScreen', () => {
  it('renders a card with status badge per platform when ready', () => {
    $platforms.set([telegram, slack])
    $platformsStatus.set('ready')

    render(<MessagingScreen />)

    expect(screen.getAllByTestId('ae-messaging-card')).toHaveLength(2)
    expect(screen.getByText('Telegram')).toBeTruthy()
    expect(screen.getByText('Slack')).toBeTruthy()
    expect(screen.getAllByTestId('ae-messaging-status-badge').length).toBe(2)
  })

  it('renders a skeleton while loading', () => {
    $platforms.set(null)
    $platformsStatus.set('loading')

    render(<MessagingScreen />)

    expect(screen.getByTestId('ae-messaging-skeleton')).toBeTruthy()
  })

  it('renders a Vietnamese empty state', () => {
    $platforms.set([])
    $platformsStatus.set('empty')

    render(<MessagingScreen />)

    expect(screen.getByText(/Chưa có nền tảng/)).toBeTruthy()
  })

  it('renders an inline error with a retry control', () => {
    $platforms.set(null)
    $platformsStatus.set('error')

    render(<MessagingScreen />)

    expect(screen.getByText(/Không tải được/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeTruthy()
  })
})
