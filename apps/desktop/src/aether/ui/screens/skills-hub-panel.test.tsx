import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $hubResults, $hubStatus } from '@/aether/domain/skills/skills-hub-store'
import type { SkillHubResult } from '@/aether/domain/skills/skills-types'

import { SkillsHubPanel } from './skills-hub-panel'

const RESULT: SkillHubResult = {
  name: 'pdf-tools',
  description: 'Đọc/ghi PDF',
  source: 'aether-index',
  identifier: 'official/pdf-tools',
  trust_level: 'official',
  repo: null,
  tags: ['pdf'],
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (window as { aetherDesktop?: unknown }).aetherDesktop
})

describe('SkillsHubPanel', () => {
  beforeEach(() => {
    $hubResults.set([])
    $hubStatus.set('idle')
  })

  it('submitting the search box GETs the hub search endpoint', async () => {
    const api = vi.fn().mockResolvedValue({ results: [RESULT], source_counts: {}, timed_out: [], installed: {} })

    ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

    render(<SkillsHubPanel />)
    fireEvent.change(screen.getByPlaceholderText(/Tìm skill/), { target: { value: 'pdf' } })
    fireEvent.submit(screen.getByTestId('ae-hub-search-form'))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(1))
    expect(api.mock.calls[0][0].path).toContain('/api/skills/hub/search?q=pdf')
  })

  it('renders a result row with an install button and trust badge', () => {
    $hubResults.set([RESULT])
    $hubStatus.set('ready')
    render(<SkillsHubPanel />)
    expect(screen.getByText('pdf-tools')).toBeTruthy()
    expect(screen.getByText('official')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Cài đặt/ })).toBeTruthy()
  })

  it('clicking install POSTs the install endpoint', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ name: 'install', ok: true, pid: 1 }) // install
      .mockResolvedValueOnce([]) // loadSkills re-fetch GET /api/skills

    ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

    $hubResults.set([RESULT])
    $hubStatus.set('ready')
    render(<SkillsHubPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Cài đặt/ }))

    await waitFor(() => expect(api.mock.calls[0][0].path).toBe('/api/skills/hub/install'))
    expect(api.mock.calls[0][0].body).toEqual({ identifier: 'official/pdf-tools' })
  })

  it('the Update-all button POSTs the update endpoint', async () => {
    const api = vi
      .fn()
      .mockResolvedValueOnce({ name: 'update', ok: true, pid: 2 })
      .mockResolvedValueOnce([])

    ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

    render(<SkillsHubPanel />)
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật tất cả/ }))

    await waitFor(() => expect(api.mock.calls[0][0].path).toBe('/api/skills/hub/update'))
  })
})
