import { describe, expect, it, vi } from 'vitest'

import {
  $envStatus,
  $envVars,
  $revealed,
  loadEnvVars,
  removeEnvVar,
  revealKey,
  saveEnvVar,
  validateKey
} from './env-store'

const sample = {
  OPENAI_API_KEY: {
    advanced: false,
    category: 'provider',
    description: 'OpenAI key',
    is_password: true,
    is_set: true,
    redacted_value: 'sk-…ab',
    tools: [],
    url: null
  }
}

describe('env-store', () => {
  it('loadEnvVars fills atom + ready', async () => {
    $envStatus.set('idle')
    const get = vi.fn(async () => sample)
    await loadEnvVars({ get: get as never })
    expect($envStatus.get()).toBe('ready')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(true)
  })

  it('loadEnvVars sets empty on empty catalog', async () => {
    $envStatus.set('idle')
    const get = vi.fn(async () => ({}))
    await loadEnvVars({ get: get as never })
    expect($envStatus.get()).toBe('empty')
  })

  it('saveEnvVar calls setEnvVar and marks is_set', async () => {
    $envVars.set(sample as never)
    const set = vi.fn(async () => ({ ok: true }))
    await saveEnvVar('OPENAI_API_KEY', 'sk-new', { set: set as never })
    expect(set).toHaveBeenCalledWith('OPENAI_API_KEY', 'sk-new')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(true)
  })

  it('removeEnvVar calls deleteEnvVar and clears is_set + reveal', async () => {
    $envVars.set(sample as never)
    $revealed.set({ OPENAI_API_KEY: 'sk-real' })
    const del = vi.fn(async () => ({ ok: true }))
    await removeEnvVar('OPENAI_API_KEY', { del: del as never })
    expect(del).toHaveBeenCalledWith('OPENAI_API_KEY')
    expect($envVars.get()?.OPENAI_API_KEY.is_set).toBe(false)
    expect($revealed.get().OPENAI_API_KEY).toBeUndefined()
  })

  it('revealKey stores the real value', async () => {
    $revealed.set({})
    const reveal = vi.fn(async () => ({ key: 'OPENAI_API_KEY', value: 'sk-real' }))
    await revealKey('OPENAI_API_KEY', { reveal: reveal as never })
    expect(reveal).toHaveBeenCalledWith('OPENAI_API_KEY')
    expect($revealed.get().OPENAI_API_KEY).toBe('sk-real')
  })

  it('validateKey forwards (key, value)', async () => {
    const validate = vi.fn(async () => ({ ok: true, reachable: true, message: 'ok' }))
    const out = await validateKey('OPENAI_API_KEY', 'sk-x', { validate: validate as never })
    expect(validate).toHaveBeenCalledWith('OPENAI_API_KEY', 'sk-x', undefined)
    expect(out.reachable).toBe(true)
  })
})
