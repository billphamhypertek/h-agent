import { atom } from 'nanostores'

import {
  getComputerUseStatus,
  getToolsets,
  grantComputerUsePermissions,
  toggleToolset
} from '@/aether-api'
import type { ActionResponse, ComputerUseStatus, ToolsetInfo } from '@/aether-api'

export const $toolsets = atom<ToolsetInfo[] | null>(null)
export const $toolsetsStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
export const $computerUse = atom<ComputerUseStatus | null>(null)
export const $computerUseStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

interface ToolsetsDeps {
  get?: () => Promise<ToolsetInfo[]>
  toggle?: (name: string, enabled: boolean) => Promise<{ ok: boolean; name: string; enabled: boolean }>
  getCu?: () => Promise<ComputerUseStatus>
  grant?: () => Promise<ActionResponse>
}

export async function loadToolsets(deps: ToolsetsDeps = {}): Promise<void> {
  const get = deps.get ?? getToolsets
  $toolsetsStatus.set('loading')

  try {
    const list = await get()
    $toolsets.set(list)
    $toolsetsStatus.set(list.length === 0 ? 'empty' : 'ready')
  } catch {
    $toolsetsStatus.set('error')
  }
}

export async function setToolsetEnabled(name: string, enabled: boolean, deps: ToolsetsDeps = {}): Promise<void> {
  const toggle = deps.toggle ?? toggleToolset
  await toggle(name, enabled)
  const cur = $toolsets.get()

  if (cur) {
    $toolsets.set(cur.map(t => (t.name === name ? { ...t, enabled } : t)))
  }
}

export async function loadComputerUse(deps: ToolsetsDeps = {}): Promise<void> {
  const getCu = deps.getCu ?? getComputerUseStatus
  $computerUseStatus.set('loading')

  try {
    $computerUse.set(await getCu())
    $computerUseStatus.set('ready')
  } catch {
    $computerUseStatus.set('error')
  }
}

export async function grantComputerUse(deps: ToolsetsDeps = {}): Promise<void> {
  const grant = deps.grant ?? grantComputerUsePermissions
  await grant()
  await loadComputerUse(deps)
}
