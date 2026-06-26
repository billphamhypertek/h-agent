import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $skills, $skillsStatus } from '@/aether/domain/skills/skills-store'
import type { SkillInfo } from '@/types/aether'

import { SkillsScreen } from './skills-screen'

const SAMPLE: SkillInfo[] = [
  { name: 'deep-research', description: 'Nghiên cứu sâu', category: 'research', enabled: true },
  { name: 'code-review', description: 'Rà soát code', category: 'dev', enabled: false },
]

afterEach(cleanup)

describe('SkillsScreen — list states', () => {
  beforeEach(() => {
    $skills.set(SAMPLE)
    $skillsStatus.set('ready')
  })

  it('renders a card with name, description and category badge per skill', () => {
    render(<SkillsScreen />)
    expect(screen.getByText('deep-research')).toBeTruthy()
    expect(screen.getByText('Nghiên cứu sâu')).toBeTruthy()
    expect(screen.getAllByTestId('ae-skill-card')).toHaveLength(2)
    expect(screen.getByText('research')).toBeTruthy()
  })

  it('shows a Vietnamese empty state when there are no skills', () => {
    $skills.set([])
    $skillsStatus.set('empty')
    render(<SkillsScreen />)
    expect(screen.getByText(/Chưa có skill nào/)).toBeTruthy()
  })

  it('shows an inline error with a retry affordance on error', () => {
    $skills.set(null)
    $skillsStatus.set('error')
    render(<SkillsScreen />)
    expect(screen.getByText(/Không tải được/)).toBeTruthy()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeTruthy()
  })

  it('shows a skeleton while loading', () => {
    $skills.set(null)
    $skillsStatus.set('loading')
    render(<SkillsScreen />)
    expect(screen.getByTestId('ae-skills-skeleton')).toBeTruthy()
  })
})

describe('SkillsScreen — toggle interaction', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as { aetherDesktop?: unknown }).aetherDesktop
  })

  it('clicking a card switch calls /api/skills/toggle then re-fetches', async () => {
    // First call = toggle PUT; second call = re-fetch GET /api/skills.
    const api = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, name: 'code-review', enabled: true })
      .mockResolvedValueOnce(SAMPLE.map(s => (s.name === 'code-review' ? { ...s, enabled: true } : s)))
    ;(window as { aetherDesktop?: unknown }).aetherDesktop = { api }

    $skills.set(SAMPLE)
    $skillsStatus.set('ready')
    render(<SkillsScreen />)

    fireEvent.click(screen.getByRole('switch', { name: /code-review/ }))

    await waitFor(() => expect(api).toHaveBeenCalledTimes(2))
    expect(api.mock.calls[0][0]).toMatchObject({
      path: '/api/skills/toggle',
      method: 'PUT',
      body: { name: 'code-review', enabled: true },
    })
    expect(api.mock.calls[1][0]).toMatchObject({ path: '/api/skills' })
  })
})
