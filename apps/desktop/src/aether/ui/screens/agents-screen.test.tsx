import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import * as agentsStore from '@/aether/domain/agents/agents-store'
import type { AgentsView } from '@/aether/domain/agents/agents-view'
import { $busy, $gatewayState } from '@/store/session'

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

function readyView(): AgentsView {
  return {
    runningCount: 1,
    sessions: [
      { id: 'live', title: 'Phiên trực tiếp', source: 'desktop', profile: 'default', model: 'sonnet', isActive: true, lastActive: 900, messageCount: 4 },
      { id: 'past', title: 'Phiên cũ', source: 'cron', profile: 'work', model: null, isActive: false, lastActive: 100, messageCount: 2 },
    ],
    cron: [{ id: 'j1', name: 'Brief sáng', schedule: 'Mỗi 8h', enabled: true, nextRunAt: '2026-06-27T08:00:00Z', lastError: null }],
    skills: [{ name: 'web-search', category: 'core', enabled: true }],
    enabledSkillCount: 1,
  }
}

describe('AgentsScreen ready sections', () => {
  beforeEach(() => {
    $agents.set(readyView())
    $agentsStatus.set('ready')
    $busy.set(false)
    $gatewayState.set('open')
  })

  it('renders sessions, cron and skills sections', () => {
    render(<AgentsScreen />)
    expect(screen.getByTestId('ae-agents-sessions')).toBeTruthy()
    expect(screen.getByTestId('ae-agents-cron')).toBeTruthy()
    expect(screen.getByTestId('ae-agents-skills')).toBeTruthy()
    expect(screen.getByText('Phiên trực tiếp')).toBeTruthy()
    expect(screen.getByText('Brief sáng')).toBeTruthy()
    expect(screen.getByText('web-search')).toBeTruthy()
  })

  it('presence indicator reflects $orbState (idle when connected & not busy)', () => {
    render(<AgentsScreen />)
    expect(screen.getByTestId('ae-agents-presence').getAttribute('data-orb')).toBe('idle')
  })

  it('presence indicator flips to thinking when busy', () => {
    $busy.set(true)
    render(<AgentsScreen />)
    expect(screen.getByTestId('ae-agents-presence').getAttribute('data-orb')).toBe('thinking')
  })

  it('still shows the read-only badge and no CRUD buttons in ready state', () => {
    render(<AgentsScreen />)
    expect(screen.getByText(/Chỉ xem/)).toBeTruthy()

    // The only button on the ready screen must NOT be a create/edit/delete control.
    for (const btn of screen.queryAllByRole('button')) {
      expect(btn.textContent ?? '').not.toMatch(/Tạo|Sửa|Xóa|Xoá|Create|Edit|Delete/)
    }
  })
})
