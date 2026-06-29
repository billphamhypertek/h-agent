import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import type { AgentsView } from '@/aether/domain/agents/agents-view'
import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import { $briefing, $briefingStatus } from '@/aether/domain/briefing/briefing-store'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'
import { $graphSpec } from '@/aether/domain/motion/graph-store'

import { CommandCenter } from './command-center'

function view(over: Partial<AgentsView> = {}): AgentsView {
  return { runningCount: 1, sessions: [{ id: 's1', title: 'Phiên A', source: 'local', profile: 'default', model: null, isActive: true, lastActive: 1, messageCount: 1 }], cron: [], skills: [], enabledSkillCount: 0, ...over }
}

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  vi.stubGlobal('aetherDesktop', { getRemoteDisplayReason: vi.fn().mockResolvedValue(null) })
  $briefing.set(sample as Briefing)
  $briefingStatus.set('ready')
  $agents.set(view())
  // Non-idle so useAgentsPoll()'s idle-guard short-circuits (no real listSessions
  // fetch against the unstubbed aetherDesktop.api). Mirrors agents-screen.test.tsx.
  $agentsStatus.set('ready')
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); $graphSpec.set(null); $agents.set(null); $agentsStatus.set('idle') })

function renderHud() {
  return render(<MemoryRouter initialEntries={['/hud']}><CommandCenter /></MemoryRouter>)
}

describe('CommandCenter HUD (L2)', () => {
  it('greets from the briefing and reports the fleet', () => {
    renderHud()
    expect(screen.getByText(/Chào buổi sáng, Bình/)).toBeTruthy()
    expect(screen.getByText(/1 phiên đang chạy/)).toBeTruthy()
  })
  it('renders a node hit-target per session and no in-screen ⌘K bar', () => {
    renderHud()
    expect(screen.getByRole('button', { name: /Mở phiên: Phiên A/ })).toBeTruthy()
    expect(screen.queryByText('⌘K')).toBeNull()
  })
  it('clears the shared graph spec on unmount', () => {
    const { unmount } = renderHud()
    expect($graphSpec.get()?.nodes.length).toBeGreaterThan(0)
    unmount()
    expect($graphSpec.get()).toBeNull()
  })
})
