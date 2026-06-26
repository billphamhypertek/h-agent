import { describe, expect, it, vi } from 'vitest'

import {
  $computerUse,
  $computerUseStatus,
  $toolsets,
  $toolsetsStatus,
  grantComputerUse,
  loadComputerUse,
  loadToolsets,
  setToolsetEnabled
} from './toolsets-store'

const toolset = { name: 'web', label: 'Web', description: 'd', enabled: false, configured: true, tools: ['search'] }

describe('toolsets-store', () => {
  it('loadToolsets fills atom + ready', async () => {
    $toolsetsStatus.set('idle')
    const get = vi.fn(async () => [toolset])
    await loadToolsets({ get: get as never })
    expect($toolsetsStatus.get()).toBe('ready')
    expect($toolsets.get()?.[0].name).toBe('web')
  })

  it('loadToolsets sets empty on empty list', async () => {
    $toolsetsStatus.set('idle')
    const get = vi.fn(async () => [])
    await loadToolsets({ get: get as never })
    expect($toolsetsStatus.get()).toBe('empty')
  })

  it('setToolsetEnabled toggles and updates the atom', async () => {
    $toolsets.set([toolset] as never)
    const toggle = vi.fn(async () => ({ ok: true, name: 'web', enabled: true }))
    await setToolsetEnabled('web', true, { toggle: toggle as never })
    expect(toggle).toHaveBeenCalledWith('web', true)
    expect($toolsets.get()?.[0].enabled).toBe(true)
  })

  it('loadComputerUse fills status atom', async () => {
    $computerUseStatus.set('idle')
    const get = vi.fn(async () => ({ platform: 'darwin', installed: true, ready: true, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: true, screen_recording: true, screen_recording_capturable: true, source: null, error: null }))
    await loadComputerUse({ getCu: get as never })
    expect($computerUseStatus.get()).toBe('ready')
    expect($computerUse.get()?.ready).toBe(true)
  })

  it('grantComputerUse calls grant then reloads status', async () => {
    const grant = vi.fn(async () => ({ name: 'grant', ok: true, pid: 1 }))
    const get = vi.fn(async () => ({ platform: 'darwin', installed: true, ready: true, can_grant: true, checks: [], platform_supported: true, version: null, accessibility: true, screen_recording: true, screen_recording_capturable: true, source: null, error: null }))
    await grantComputerUse({ grant: grant as never, getCu: get as never })
    expect(grant).toHaveBeenCalled()
    expect(get).toHaveBeenCalled()
  })
})
