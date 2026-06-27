// apps/desktop/src/app/command-palette/catalog.test.tsx
import { describe, expect, it, vi } from 'vitest'

import {
  AGENTS_ROUTE,
  ARTIFACTS_ROUTE,
  BRIEF_ROUTE,
  CONTENT_ROUTE,
  CRON_ROUTE,
  DEV_ROUTE,
  HUD_ROUTE,
  INBOX_ROUTE,
  MEMORY_ROUTE,
  MESSAGING_ROUTE,
  NEW_CHAT_ROUTE,
  OPS_ROUTE,
  PROFILES_ROUTE,
  SETTINGS_ROUTE,
  SKILLS_ROUTE,
  VOICE_ROUTE
} from '@/app/routes'
import * as onboarding from '@/store/onboarding'

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
      DEV_ROUTE,
      INBOX_ROUTE,
      OPS_ROUTE,
      CONTENT_ROUTE,
      VOICE_ROUTE,
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

  it('selecting the Dev item navigates to /dev', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const dev = aetherGoToItems(go, tStub).find(item => item.id === 'nav-dev')
    expect(dev).toBeTruthy()
    dev?.run?.()
    expect(navigate).toHaveBeenCalledWith(DEV_ROUTE)
  })

  it('selecting the Inbox item navigates to /inbox', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const inbox = aetherGoToItems(go, tStub).find(item => item.id === 'nav-inbox')
    expect(inbox).toBeTruthy()
    inbox?.run?.()
    expect(navigate).toHaveBeenCalledWith(INBOX_ROUTE)
  })

  it('selecting the Ops item navigates to /ops', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const ops = aetherGoToItems(go, tStub).find(item => item.id === 'nav-ops')
    expect(ops).toBeTruthy()
    ops?.run?.()
    expect(navigate).toHaveBeenCalledWith(OPS_ROUTE)
  })

  it('selecting the Content item navigates to /content', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const content = aetherGoToItems(go, tStub).find(item => item.id === 'nav-content')
    expect(content).toBeTruthy()
    content?.run?.()
    expect(navigate).toHaveBeenCalledWith(CONTENT_ROUTE)
  })

  it('selecting the Voice item navigates to /voice', () => {
    const navigate = vi.fn()
    const go = (path: string) => () => navigate(path)
    const voice = aetherGoToItems(go, tStub).find(item => item.id === 'nav-voice')
    expect(voice).toBeTruthy()
    voice?.run?.()
    expect(navigate).toHaveBeenCalledWith(VOICE_ROUTE)
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

  it('offers an action that reopens onboarding in manual mode', () => {
    const spy = vi.spyOn(onboarding, 'startManualOnboarding').mockImplementation(() => {})
    const item = aetherActionItems(go, t).find(i => i.id === 'action-onboarding')
    expect(item).toBeTruthy()
    item?.run?.()
    expect(spy).toHaveBeenCalled()
  })
})
