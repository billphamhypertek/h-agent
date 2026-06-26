import { atom } from 'nanostores'

import {
  getAuxiliaryModels,
  getGlobalModelInfo,
  getGlobalModelOptions,
  setGlobalModel,
  setModelAssignment
} from '@/aether-api'
import type {
  AuxiliaryModelsResponse,
  ModelAssignmentResponse,
  ModelInfoResponse,
  ModelOptionsResponse
} from '@/aether-api'

export const $modelInfo = atom<ModelInfoResponse | null>(null)
export const $modelOptions = atom<ModelOptionsResponse | null>(null)
export const $auxiliaryModels = atom<AuxiliaryModelsResponse | null>(null)
export const $modelStatus = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')

export interface ModelDeps {
  getInfo?: () => Promise<ModelInfoResponse>
  getOptions?: (opts?: { refresh?: boolean }) => Promise<ModelOptionsResponse>
  getAux?: () => Promise<AuxiliaryModelsResponse>
  setMain?: (provider: string, model: string) => Promise<{ ok: boolean; provider: string; model: string }>
  setAssign?: (body: {
    provider: string
    model: string
    scope: 'auxiliary' | 'main'
    task?: string
  }) => Promise<ModelAssignmentResponse>
}

function resolve(deps: ModelDeps) {
  return {
    getInfo: deps.getInfo ?? getGlobalModelInfo,
    getOptions: deps.getOptions ?? getGlobalModelOptions,
    getAux: deps.getAux ?? getAuxiliaryModels,
    setMain: deps.setMain ?? setGlobalModel,
    setAssign: deps.setAssign ?? setModelAssignment
  }
}

export async function loadModel(deps: ModelDeps = {}, opts?: { refresh?: boolean }): Promise<void> {
  const api = resolve(deps)
  $modelStatus.set('loading')

  try {
    const [info, options, aux] = await Promise.all([api.getInfo(), api.getOptions(opts), api.getAux()])
    $modelInfo.set(info)
    $modelOptions.set(options)
    $auxiliaryModels.set(aux)
    $modelStatus.set('ready')
  } catch {
    $modelStatus.set('error')
  }
}

export async function applyMainModel(provider: string, model: string, deps: ModelDeps = {}): Promise<void> {
  const api = resolve(deps)
  await api.setMain(provider, model)
  await loadModel(deps)
}

export async function applyAuxiliaryModel(
  provider: string,
  model: string,
  task: string,
  deps: ModelDeps = {}
): Promise<void> {
  const api = resolve(deps)
  await api.setAssign({ provider, model, scope: 'auxiliary', task })
  await loadModel(deps)
}
