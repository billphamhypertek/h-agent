import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PaginatedSessions, SessionInfo, SessionSearchResponse } from '@/types/aether'

import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $previewStatus,
  loadArtifacts,
  searchArtifacts,
  openArtifact,
  type ArtifactsDeps,
} from './artifacts-store'

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
  $artifacts.set(null)
  $artifactsStatus.set('idle')
  $artifactQuery.set('')
  $selectedArtifact.set(null)
  $previewStatus.set('idle')
})

describe('artifacts-store', () => {
  it('loadArtifacts populates $artifacts from listSessions and sets ready', async () => {
    const paginated: PaginatedSessions = {
      limit: 40,
      offset: 0,
      total: 2,
      sessions: [session('a1', 'Alpha'), session('a2', 'Beta')],
    }
    const listSessions = vi.fn(async () => paginated)
    const deps: ArtifactsDeps = { listSessions: listSessions as never }

    await loadArtifacts(deps)

    expect(listSessions).toHaveBeenCalledTimes(1)
    expect($artifacts.get()?.map(s => s.id)).toEqual(['a1', 'a2'])
    expect($artifactsStatus.get()).toBe('ready')
  })

  it('loadArtifacts sets empty when no sessions exist', async () => {
    const listSessions = vi.fn(async (): Promise<PaginatedSessions> => ({
      limit: 40,
      offset: 0,
      total: 0,
      sessions: [],
    }))

    await loadArtifacts({ listSessions: listSessions as never })

    expect($artifactsStatus.get()).toBe('empty')
    expect($artifacts.get()).toEqual([])
  })

  it('loadArtifacts sets error when listSessions throws', async () => {
    const listSessions = vi.fn(async () => {
      throw new Error('boom')
    })

    await loadArtifacts({ listSessions: listSessions as never })

    expect($artifactsStatus.get()).toBe('error')
  })

  it('searchArtifacts maps SessionSearchResponse rows into artifact entries', async () => {
    const response: SessionSearchResponse = {
      results: [
        {
          session_id: 's9',
          snippet: 'hello world',
          model: 'nous/hermes',
          role: 'assistant',
          session_started: 1_700_000_500,
          source: 'desktop',
        },
      ],
    }
    const searchSessions = vi.fn(async () => response)

    await searchArtifacts('hello', { searchSessions: searchSessions as never })

    expect(searchSessions).toHaveBeenCalledWith('hello')
    expect($artifactQuery.get()).toBe('hello')
    expect($artifacts.get()?.[0]?.id).toBe('s9')
    expect($artifacts.get()?.[0]?.preview).toBe('hello world')
    expect($artifactsStatus.get()).toBe('ready')
  })

  it('searchArtifacts with a blank query falls back to loadArtifacts', async () => {
    const listSessions = vi.fn(async (): Promise<PaginatedSessions> => ({
      limit: 40,
      offset: 0,
      total: 1,
      sessions: [session('a1', 'Alpha')],
    }))
    const searchSessions = vi.fn()

    await searchArtifacts('   ', { listSessions: listSessions as never, searchSessions: searchSessions as never })

    expect(searchSessions).not.toHaveBeenCalled()
    expect(listSessions).toHaveBeenCalledTimes(1)
    expect($artifacts.get()?.[0]?.id).toBe('a1')
  })

  it('openArtifact loads static metadata via getSession + getSessionMessages (no stream)', async () => {
    const getSession = vi.fn(async () => session('a1', 'Alpha'))
    const getSessionMessages = vi.fn(async () => ({
      session_id: 'a1',
      messages: [{ role: 'user' as const, content: 'hi' }],
    }))

    await openArtifact('a1', { getSession: getSession as never, getSessionMessages: getSessionMessages as never })

    expect(getSession).toHaveBeenCalledWith('a1')
    expect(getSessionMessages).toHaveBeenCalledWith('a1')
    expect($selectedArtifact.get()?.id).toBe('a1')
    expect($previewStatus.get()).toBe('ready')
  })
})
