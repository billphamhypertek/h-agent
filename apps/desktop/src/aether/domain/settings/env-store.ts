import { atom } from 'nanostores'

import {
  deleteEnvVar,
  getEnvVars,
  revealEnvVar as revealEnvVarApi,
  setEnvVar,
  validateProviderCredential
} from '@/aether-api'
import type { EnvVarInfo } from '@/types/aether'

export const $envVars = atom<Record<string, EnvVarInfo> | null>(null)
export const $envStatus = atom<'idle' | 'loading' | 'ready' | 'empty' | 'error'>('idle')
export const $revealed = atom<Record<string, string>>({})

interface EnvDeps {
  get?: () => Promise<Record<string, EnvVarInfo>>
  set?: (key: string, value: string) => Promise<{ ok: boolean }>
  del?: (key: string) => Promise<{ ok: boolean }>
  reveal?: (key: string) => Promise<{ key: string; value: string }>
  validate?: (
    key: string,
    value: string,
    apiKey?: string
  ) => Promise<{ ok: boolean; reachable: boolean; message: string; models?: string[] }>
}

function patch(key: string, p: Partial<EnvVarInfo>): void {
  const cur = $envVars.get()

  if (!cur || !cur[key]) {
    return
  }

  $envVars.set({ ...cur, [key]: { ...cur[key], ...p } })
}

export async function loadEnvVars(deps: EnvDeps = {}): Promise<void> {
  const get = deps.get ?? getEnvVars
  $envStatus.set('loading')

  try {
    const vars = await get()
    $envVars.set(vars)
    $envStatus.set(Object.keys(vars).length === 0 ? 'empty' : 'ready')
  } catch {
    $envStatus.set('error')
  }
}

export async function saveEnvVar(key: string, value: string, deps: EnvDeps = {}): Promise<void> {
  const set = deps.set ?? setEnvVar
  await set(key, value)
  patch(key, { is_set: true, redacted_value: maskValue(value) })
}

export async function removeEnvVar(key: string, deps: EnvDeps = {}): Promise<void> {
  const del = deps.del ?? deleteEnvVar
  await del(key)
  patch(key, { is_set: false, redacted_value: null })
  const next = { ...$revealed.get() }
  delete next[key]
  $revealed.set(next)
}

export async function revealKey(key: string, deps: EnvDeps = {}): Promise<void> {
  const reveal = deps.reveal ?? revealEnvVarApi
  const res = await reveal(key)
  $revealed.set({ ...$revealed.get(), [key]: res.value })
}

export async function validateKey(
  key: string,
  value: string,
  deps: EnvDeps = {},
  apiKey?: string
): Promise<{ ok: boolean; reachable: boolean; message: string; models?: string[] }> {
  const validate = deps.validate ?? validateProviderCredential

  return validate(key, value, apiKey)
}

function maskValue(value: string): string {
  if (value.length <= 4) {
    return '••••'
  }

  return `${'•'.repeat(4)}${value.slice(-2)}`
}
