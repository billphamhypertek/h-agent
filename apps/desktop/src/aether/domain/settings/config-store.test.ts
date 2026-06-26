import { describe, expect, it, vi } from 'vitest'

import { $configRecord, $configSchema, $configStatus, loadConfig, saveConfig, setConfigField } from './config-store'

describe('config-store', () => {
  it('loadConfig fills schema + record and sets ready', async () => {
    $configStatus.set('idle')
    const getSchema = vi.fn(async () => ({ category_order: ['general'], fields: { 'display.skin': { type: 'string', category: 'general' } } }))
    const getRecord = vi.fn(async () => ({ display: { skin: 'aether' } }))
    await loadConfig({ getSchema: getSchema as never, getRecord: getRecord as never })
    expect($configStatus.get()).toBe('ready')
    expect($configSchema.get()?.fields['display.skin'].type).toBe('string')
    expect($configRecord.get()).toEqual({ display: { skin: 'aether' } })
  })

  it('setConfigField writes a nested dotted key into the record', () => {
    $configRecord.set({ display: { skin: 'aether' } })
    setConfigField('agent.reasoning_effort', 'high')
    expect($configRecord.get()).toEqual({ display: { skin: 'aether' }, agent: { reasoning_effort: 'high' } })
  })

  it('saveConfig posts the current record', async () => {
    $configRecord.set({ agent: { reasoning_effort: 'high' } })
    const save = vi.fn(async () => ({ ok: true }))
    await saveConfig({ save: save as never })
    expect(save).toHaveBeenCalledWith({ agent: { reasoning_effort: 'high' } })
  })
})
