// apps/desktop/src/app/command-palette/catalog.test.tsx
import { describe, expect, it, vi } from 'vitest'

import {
  AGENTS_ROUTE,
  ARTIFACTS_ROUTE,
  BRIEF_ROUTE,
  CRON_ROUTE,
  HUD_ROUTE,
  MEMORY_ROUTE,
  MESSAGING_ROUTE,
  NEW_CHAT_ROUTE,
  PROFILES_ROUTE,
  SETTINGS_ROUTE,
  SKILLS_ROUTE
} from '@/app/routes'

import { aetherActionItems, aetherGoToItems } from './index'

// Minimal t stub: only the keys aetherGoToItems actually reads.
const tStub = {
  commandCenter: {
    nav: {
      newChat: { title: 'Trò chuyện' },
      settings: { title: 'Cài đặt' },
      skills: { title: 'Skills' },
      messaging: { title: 'Tin nhắn' },
      artifacts: { title: 'Artifacts' }
    }
  },
  keybinds: { actions: { 'view.showTerminal': 'Terminal' } },
  shell: { statusbar: { cron: 'Cron' } },
  profiles: { title: 'Hồ sơ' },
  agents: { title: 'Agents' }
} as never

describe('command palette AETHER catalog', () => {
  it('exposes a MEMORY_ROUTE constant', () => {
    expect(MEMORY_ROUTE).toBe('/memory')
  })

  it('contains a Go-to entry for every AETHER route', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)

    const routes = aetherGoToItems(go, tStub).map(item => {
      navigate.mockClear()
      item.run?.()
      return navigate.mock.calls[0]?.[0]
    })

    for (const route of [
      NEW_CHAT_ROUTE,
      HUD_ROUTE,
      BRIEF_ROUTE,
      SETTINGS_ROUTE,
      SKILLS_ROUTE,
      MEMORY_ROUTE,
      MESSAGING_ROUTE,
      ARTIFACTS_ROUTE,
      CRON_ROUTE,
      PROFILES_ROUTE,
      AGENTS_ROUTE
    ]) {
      expect(routes).toContain(route)
    }
  })

  it('selecting the Memory item navigates to /memory', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const memory = aetherGoToItems(go, tStub).find(item => item.id === 'nav-memory')
    expect(memory).toBeTruthy()
    memory?.run?.()
    expect(navigate).toHaveBeenCalledWith(MEMORY_ROUTE)
  })
})

describe('command palette per-screen actions', () => {
  const navigate = vi.fn()
  const go = (path: string) => () => navigate(path)
  const t = { } as never

  it('offers a "đổi model" action that deep-links into Settings', () => {
    navigate.mockClear()
    const item = aetherActionItems(go, t).find(i => i.id === 'act-settings-model')
    expect(item).toBeTruthy()
    item?.run?.()
    expect(navigate).toHaveBeenCalledWith('/settings?tab=config:model')
  })

  it('offers a Skills action that opens the Skills screen', () => {
    navigate.mockClear()
    const item = aetherActionItems(go, t).find(i => i.id === 'act-skills-open')
    expect(item).toBeTruthy()
    item?.run?.()
    expect(navigate).toHaveBeenCalledWith('/skills')
  })

  it('offers a Cron "tạo job" action', () => {
    navigate.mockClear()
    const item = aetherActionItems(go, t).find(i => i.id === 'act-cron-create')
    expect(item).toBeTruthy()
    item?.run?.()
    expect(navigate).toHaveBeenCalledWith('/cron?new=1')
  })
})
