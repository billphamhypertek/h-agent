import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { $agents } from '@/aether/domain/agents/agents-store'
import type { AgentsView } from '@/aether/domain/agents/agents-view'
import type { Briefing } from '@/aether/domain/briefing/briefing-schema'
import sample from '@/aether/domain/briefing/fixtures/briefing.sample.json'

import { FleetStatus } from './fleet-status'
import { GreetingCard } from './greeting-card'
import { PrioritiesPeek } from './priorities-peek'
import { SystemVitalsCard } from './system-vitals-card'

const briefing = sample as Briefing

beforeEach(() => { $agents.set(null) })
afterEach(cleanup)

describe('HUD ambient widgets', () => {
  it('GreetingCard greets by name and summarizes priorities + warn servers', () => {
    render(<GreetingCard briefing={briefing} />)
    expect(screen.getByText(/Chào buổi sáng, Bình/)).toBeTruthy()
    expect(screen.getByText(/4 ưu tiên/)).toBeTruthy()
    expect(screen.getByText(/1 server cảnh báo/)).toBeTruthy()
  })
  it('SystemVitalsCard shows the worst server', () => {
    render(<SystemVitalsCard briefing={briefing} />)
    expect(screen.getByText(/h-workspace/)).toBeTruthy()
    expect(screen.getByText(/CPU/)).toBeTruthy()
  })
  it('PrioritiesPeek shows up to 3 top priorities', () => {
    render(<PrioritiesPeek briefing={briefing} />)
    expect(screen.getByText(/3 email cần bạn trả lời/)).toBeTruthy()
    expect(screen.queryByText(/2 deadline hôm nay/)).toBeNull() // 4th item is trimmed
  })
  it('FleetStatus reports the running session count', () => {
    $agents.set({ runningCount: 2, sessions: [], cron: [], skills: [], enabledSkillCount: 0 } as AgentsView)
    render(<FleetStatus />)
    expect(screen.getByText(/SẴN SÀNG/)).toBeTruthy()
    expect(screen.getByText(/2 phiên đang chạy/)).toBeTruthy()
  })
})
