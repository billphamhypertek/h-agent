import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionInfo } from '@/types/aether'
import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $previewStatus,
} from '@/aether/domain/artifacts/artifacts-store'

import { ArtifactsScreen } from './artifacts-screen'

function session(id: string, title: string): SessionInfo {
  return {
    id,
    title,
    preview: `preview ${id}`,
    archived: false,
    cwd: null,
    ended_at: null,
    input_tokens: 0,
    is_active: false,
    last_active: 1_700_000_000,
    message_count: 4,
    model: 'nous/hermes',
    output_tokens: 0,
    source: 'desktop',
    started_at: 1_700_000_000,
    tool_call_count: 0,
  }
}

beforeEach(() => {
  $artifacts.set([session('a1', 'Alpha'), session('a2', 'Beta')])
  $artifactsStatus.set('ready')
  $artifactQuery.set('')
  $selectedArtifact.set(null)
  $previewStatus.set('idle')
})
afterEach(cleanup)

describe('ArtifactsScreen', () => {
  it('renders a card per artifact with a search box and a read-only badge', () => {
    render(<ArtifactsScreen />)
    expect(screen.getAllByTestId('ae-artifact-card')).toHaveLength(2)
    expect(screen.getByText('Alpha')).toBeTruthy()
    expect(screen.getByPlaceholderText(/Tìm/)).toBeTruthy()
    expect(screen.getByText(/Chỉ đọc/)).toBeTruthy()
  })

  it('never carries a save/edit affordance (read-only library)', () => {
    render(<ArtifactsScreen />)
    expect(screen.queryByText(/Lưu/)).toBeNull()
    expect(screen.queryByText(/Sửa/)).toBeNull()
  })

  it('shows the Vietnamese empty state when there are no artifacts', () => {
    $artifacts.set([])
    $artifactsStatus.set('empty')
    render(<ArtifactsScreen />)
    expect(screen.getByText(/Chưa có/)).toBeTruthy()
    expect(screen.queryByTestId('ae-artifact-card')).toBeNull()
  })

  it('shows an inline error with a retry control', () => {
    $artifactsStatus.set('error')
    render(<ArtifactsScreen />)
    expect(screen.getByText(/Thử lại/)).toBeTruthy()
  })

  it('shows skeletons while loading', () => {
    $artifacts.set(null)
    $artifactsStatus.set('loading')
    render(<ArtifactsScreen />)
    expect(screen.getAllByTestId('ae-artifact-skeleton').length).toBeGreaterThan(0)
  })
})

describe('ArtifactsScreen search interaction', () => {
  afterEach(() => {
    // restore the global stub between cases
    // @ts-expect-error test shim
    delete globalThis.window.aetherDesktop
  })

  it('typing in the search box queries searchSessions with the text', async () => {
    const api = vi.fn(async (req: { path: string }) => {
      if (req.path.startsWith('/api/sessions/search')) {
        return { results: [] }
      }

      return { limit: 60, offset: 0, total: 0, sessions: [] }
    })
    // @ts-expect-error test shim — only the api method is exercised here
    globalThis.window.aetherDesktop = { api, readDir: vi.fn() }

    render(<ArtifactsScreen />)
    const box = screen.getByPlaceholderText(/Tìm/)
    fireEvent.change(box, { target: { value: 'design spec' } })

    // searchArtifacts is async; flush microtasks.
    await Promise.resolve()
    await Promise.resolve()

    expect($artifactQuery.get()).toBe('design spec')
    expect(api).toHaveBeenCalledWith(
      expect.objectContaining({ path: expect.stringContaining('/api/sessions/search?q=design%20spec') }),
    )
  })
})
