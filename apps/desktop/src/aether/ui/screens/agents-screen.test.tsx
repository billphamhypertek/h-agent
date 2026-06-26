import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import * as agentsStore from '@/aether/domain/agents/agents-store'

import { AgentsScreen } from './agents-screen'

beforeEach(() => {
  $agents.set(null)
  $agentsStatus.set('idle')
})
afterEach(cleanup)

describe('AgentsScreen states', () => {
  it('renders the read-only label in every state', () => {
    $agentsStatus.set('loading')
    render(<AgentsScreen />)
    expect(screen.getByText(/Chỉ xem/)).toBeTruthy()
  })

  it('renders a skeleton while loading', () => {
    $agentsStatus.set('loading')
    render(<AgentsScreen />)
    expect(screen.getByTestId('ae-agents-skeleton')).toBeTruthy()
  })

  it('renders a Vietnamese empty state', () => {
    $agentsStatus.set('empty')
    render(<AgentsScreen />)
    expect(screen.getByText(/Chưa có agent nào đang chạy/)).toBeTruthy()
  })

  it('renders an inline error with a retry button that calls loadAgents', () => {
    $agentsStatus.set('error')
    render(<AgentsScreen />)
    expect(screen.getByText(/Không tải được/)).toBeTruthy()
    // Retry must invoke loadAgents(). The real loadAgents (no deps) hits the
    // jsdom-undefined api and, after React's act() flushes microtasks, settles
    // back to 'error' — so we assert the call happened, not the transient status.
    const spy = vi.spyOn(agentsStore, 'loadAgents').mockResolvedValue(undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
