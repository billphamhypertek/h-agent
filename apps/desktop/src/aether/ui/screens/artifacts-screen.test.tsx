import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SessionInfo } from '@/types/aether'
import {
  $artifacts,
  $artifactsStatus,
  $artifactQuery,
  $selectedArtifact,
  $previewStatus,
  $fileOutputs,
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
  $fileOutputs.set(null)
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

describe('ArtifactsScreen preview (static, prompt-cache safe)', () => {
  afterEach(() => {
    // @ts-expect-error test shim
    delete globalThis.window.aetherDesktop
  })

  it('clicking a card opens a static preview from getSession + getSessionMessages only', async () => {
    const calledPaths: string[] = []
    const api = vi.fn(async (req: { path: string }) => {
      calledPaths.push(req.path)

      if (req.path.endsWith('/messages')) {
        return { session_id: 'a1', messages: [{ role: 'assistant', content: 'static answer' }] }
      }

      // getSession (by id, no /messages suffix)
      return {
        id: 'a1',
        title: 'Alpha',
        preview: 'preview a1',
        message_count: 4,
        model: 'nous/hermes',
        started_at: 1_700_000_000,
        last_active: 1_700_000_000,
        source: 'desktop',
        is_active: false,
        ended_at: null,
        input_tokens: 0,
        output_tokens: 0,
        tool_call_count: 0,
        archived: false,
        cwd: null,
      }
    })
    // @ts-expect-error test shim
    globalThis.window.aetherDesktop = { api, readDir: vi.fn() }

    render(<ArtifactsScreen />)
    fireEvent.click(screen.getAllByTestId('ae-artifact-card')[0])

    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()

    // Preview shows the static transcript text and a read-only preview label.
    expect(await screen.findByText(/static answer/)).toBeTruthy()
    expect(screen.getByTestId('ae-artifact-preview')).toBeTruthy()

    // HARD prompt-cache guard: ONLY the by-id session read and its /messages
    // read were issued — no stream/resume/run path. getSessionMessages is a
    // one-shot REST read of stored content, never a live delta subscription;
    // there is no appendAssistantDelta in this module's import graph.
    expect(calledPaths.some(p => /\/api\/sessions\/[^/]+$/.test(p))).toBe(true)
    expect(calledPaths.some(p => p.endsWith('/messages'))).toBe(true)
    expect(calledPaths.some(p => /resume|stream|run|delta|invoke/i.test(p))).toBe(false)
  })

  it('source module never imports a conversation-delta appender (forbidden-import guard)', () => {
    // Static source-text assertion: the screen + store must not pull in any
    // streaming/delta machinery. Cheap and deterministic — justifies the HARD
    // prompt-cache rule without a brittle ws spy.
    //
    // NOTE: import.meta.url-based path resolution (fileURLToPath / URL.pathname)
    // was unreliable under this vitest config, so we use the proven __dirname +
    // readFileSync (node:fs / node:path) approach instead, matching the other
    // source-scan guard tests.
    const screenSrc = readFileSync(join(__dirname, 'artifacts-screen.tsx'), 'utf8')
    const storeSrc = readFileSync(
      join(__dirname, '..', '..', 'domain', 'artifacts', 'artifacts-store.ts'),
      'utf8',
    )
    for (const src of [screenSrc, storeSrc]) {
      expect(src).not.toMatch(/appendAssistantDelta/)
      expect(src).not.toMatch(/message\.delta|reasoning\.delta|thinking\./)
      // Word-boundary anchors so the forbidden streaming-callback tokens are not
      // false-matched by the legitimate REST import `getSessionMessages`
      // (which contains the substring "onMessage"). The forbidden set is intact:
      // a real `subscribe`/`onMessage`/`WebSocket`/`getGatewayWsUrl` still fails.
      expect(src).not.toMatch(/\bsubscribe\b|\bonMessage\b|\bWebSocket\b|\bgetGatewayWsUrl\b/)
    }
  })
})

describe('ArtifactsScreen file outputs', () => {
  it('lists file outputs when present', () => {
    $artifacts.set([])
    $artifactsStatus.set('empty')
    $fileOutputs.set([{ name: 'report.md', path: '/out/report.md', isDirectory: false }])
    render(<ArtifactsScreen />)
    expect(screen.getByText('report.md')).toBeTruthy()
  })
})
