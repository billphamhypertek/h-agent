import { describe, expect, it, vi } from 'vitest'

import {
  $auxiliaryModels,
  $modelInfo,
  $modelOptions,
  $modelStatus,
  applyAuxiliaryModel,
  applyMainModel,
  loadModel
} from './model-store'

describe('model-store', () => {
  it('loadModel populates atoms and sets ready', async () => {
    $modelStatus.set('idle')
    const getInfo = vi.fn(async () => ({ model: 'm1', provider: 'p1' }))
    const getOptions = vi.fn(async () => ({ model: 'm1', provider: 'p1', providers: [{ name: 'P1', slug: 'p1', models: ['m1', 'm2'] }] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm1', provider: 'p1' }, tasks: [] }))

    await loadModel({ getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect($modelStatus.get()).toBe('ready')
    expect($modelInfo.get()?.model).toBe('m1')
    expect($modelOptions.get()?.providers?.[0].slug).toBe('p1')
    expect($auxiliaryModels.get()?.main.provider).toBe('p1')
  })

  it('loadModel sets error when a call rejects', async () => {
    $modelStatus.set('idle')
    const getInfo = vi.fn(async () => { throw new Error('boom') })
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: '', provider: '' }, tasks: [] }))

    await loadModel({ getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect($modelStatus.get()).toBe('error')
  })

  it('applyMainModel calls setGlobalModel(provider, model) and reloads', async () => {
    const setMain = vi.fn(async () => ({ ok: true, provider: 'p2', model: 'm2' }))
    const getInfo = vi.fn(async () => ({ model: 'm2', provider: 'p2' }))
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm2', provider: 'p2' }, tasks: [] }))

    await applyMainModel('p2', 'm2', { setMain: setMain as never, getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect(setMain).toHaveBeenCalledWith('p2', 'm2')
    expect($modelInfo.get()?.provider).toBe('p2')
  })

  it('applyAuxiliaryModel calls setModelAssignment with scope auxiliary + task', async () => {
    const setAssign = vi.fn(async () => ({ ok: true }))
    const getInfo = vi.fn(async () => ({ model: 'm1', provider: 'p1' }))
    const getOptions = vi.fn(async () => ({ providers: [] }))
    const getAux = vi.fn(async () => ({ main: { model: 'm1', provider: 'p1' }, tasks: [] }))

    await applyAuxiliaryModel('p1', 'm1', 'vision', { setAssign: setAssign as never, getInfo: getInfo as never, getOptions: getOptions as never, getAux: getAux as never })

    expect(setAssign).toHaveBeenCalledWith({ provider: 'p1', model: 'm1', scope: 'auxiliary', task: 'vision' })
  })
})
