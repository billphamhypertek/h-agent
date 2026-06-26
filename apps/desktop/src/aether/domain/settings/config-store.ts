import { atom } from 'nanostores'

import { getAetherConfigRecord, getAetherConfigSchema, saveAetherConfig } from '@/aether-api'
import type { AetherConfigRecord, ConfigSchemaResponse } from '@/aether-api'

export const $configSchema = atom<ConfigSchemaResponse | null>(null)
export const $configRecord = atom<AetherConfigRecord>({})
export const $configStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

interface ConfigDeps {
  getSchema?: () => Promise<ConfigSchemaResponse>
  getRecord?: () => Promise<AetherConfigRecord>
  save?: (config: AetherConfigRecord) => Promise<{ ok: boolean }>
}

export async function loadConfig(deps: ConfigDeps = {}): Promise<void> {
  const getSchema = deps.getSchema ?? getAetherConfigSchema
  const getRecord = deps.getRecord ?? getAetherConfigRecord
  $configStatus.set('loading')

  try {
    const [schema, record] = await Promise.all([getSchema(), getRecord()])
    $configSchema.set(schema)
    $configRecord.set(record)
    $configStatus.set('ready')
  } catch {
    $configStatus.set('error')
  }
}

// Writes a dotted key (e.g. "agent.reasoning_effort") into the record,
// cloning each level so nanostores sees a new reference.
export function setConfigField(dottedKey: string, value: unknown): void {
  const parts = dottedKey.split('.')
  const next: AetherConfigRecord = { ...$configRecord.get() }
  let cursor = next as Record<string, unknown>

  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    const existing = cursor[part]
    const cloned = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {}
    cursor[part] = cloned
    cursor = cloned
  }

  cursor[parts[parts.length - 1]] = value
  $configRecord.set(next)
}

export function getConfigField(dottedKey: string): unknown {
  const parts = dottedKey.split('.')
  let cursor: unknown = $configRecord.get()

  for (const part of parts) {
    if (cursor && typeof cursor === 'object') {
      cursor = (cursor as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return cursor
}

export async function saveConfig(deps: ConfigDeps = {}): Promise<void> {
  const save = deps.save ?? saveAetherConfig
  await save($configRecord.get())
}
