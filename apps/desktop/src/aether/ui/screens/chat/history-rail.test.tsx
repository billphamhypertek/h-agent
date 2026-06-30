import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { SessionInfo } from '@/aether-api'
import { $pinnedSessionIds } from '@/store/layout'
import { $selectedStoredSessionId, $sessions, $workingSessionIds } from '@/store/session'

import { HistoryRail } from './history-rail'

function mkSession(partial: Partial<SessionInfo> & Pick<SessionInfo, 'id'>): SessionInfo {
  return {
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: Math.floor(Date.now() / 1000),
    message_count: 2,
    model: null,
    output_tokens: 0,
    preview: null,
    source: 'desktop',
    started_at: Math.floor(Date.now() / 1000),
    title: null,
    tool_call_count: 0,
    ...partial,
  }
}

function renderRail(initialEntry = '/') {
  return render(<MemoryRouter initialEntries={[initialEntry]}><HistoryRail /></MemoryRouter>)
}

beforeEach(() => {
  $sessions.set([])
  $workingSessionIds.set([])
  $pinnedSessionIds.set([])
  $selectedStoredSessionId.set(null)
})
afterEach(cleanup)

describe('HistoryRail', () => {
  it('shows an empty state when there are no conversations', () => {
    renderRail()
    expect(screen.getByText(/Chưa có cuộc trò chuyện nào/)).toBeTruthy()
  })

  it('lists conversation titles from $sessions', () => {
    $sessions.set([mkSession({ id: 's1', title: 'Kế hoạch quý 3' }), mkSession({ id: 's2', title: 'Sửa bug login' })])
    renderRail()
    expect(screen.getByText('Kế hoạch quý 3')).toBeTruthy()
    expect(screen.getByText('Sửa bug login')).toBeTruthy()
  })

  it('filters by the search query', () => {
    $sessions.set([mkSession({ id: 's1', title: 'Kế hoạch quý 3' }), mkSession({ id: 's2', title: 'Sửa bug login' })])
    renderRail()
    fireEvent.change(screen.getByLabelText('Tìm cuộc trò chuyện'), { target: { value: 'login' } })
    expect(screen.queryByText('Kế hoạch quý 3')).toBeNull()
    expect(screen.getByText('Sửa bug login')).toBeTruthy()
  })

  it('marks the row for the current session route as active', () => {
    $sessions.set([mkSession({ id: 's1', title: 'A' }), mkSession({ id: 's2', title: 'B' })])
    renderRail('/s2')
    expect(screen.getByRole('button', { name: /B/ }).getAttribute('aria-current')).toBe('page')
    expect(screen.getByRole('button', { name: /A/ }).getAttribute('aria-current')).toBeNull()
  })

  it('marks the new-chat button active on the index route', () => {
    renderRail('/')
    expect(screen.getByRole('button', { name: 'Cuộc trò chuyện mới' }).getAttribute('aria-current')).toBe('page')
  })

  it('groups pinned conversations under a "Đã ghim" header', () => {
    $sessions.set([mkSession({ id: 'p1', title: 'Ghim' }), mkSession({ id: 's2', title: 'Thường' })])
    $pinnedSessionIds.set(['p1'])
    renderRail()
    expect(screen.getByText('Đã ghim')).toBeTruthy()
    expect(screen.getByText('Gần đây')).toBeTruthy()
  })
})
