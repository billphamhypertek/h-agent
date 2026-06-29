import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $modelInfo,
  $modelOptions,
  $modelStatus,
  applyMainModel,
  loadModel
} from '@/aether/domain/settings/model-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ModelTab({ onApplyMain }: { onApplyMain?: (provider: string, model: string) => void }) {
  const status = useStore($modelStatus)
  const info = useStore($modelInfo)
  const options = useStore($modelOptions)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')

  useEffect(() => {
    if ($modelStatus.get() === 'idle') {
      void loadModel()
    }
  }, [])

  useEffect(() => {
    if (info) {
      setProvider(prev => prev || info.provider)
      setModel(prev => prev || info.model)
    }
  }, [info])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải mô hình…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được cấu hình mô hình.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)]"
          onClick={() => void loadModel()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  const providers = options?.providers ?? []
  const selectedModels = providers.find(p => p.slug === provider)?.models ?? []

  const apply = () => {
    if (!provider || !model) {
      return
    }

    if (onApplyMain) {
      onApplyMain(provider, model)
    } else {
      void applyMainModel(provider, model)
    }
  }

  return (
    <GlassSlab className="flex flex-col gap-3" size="md">
      <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">MÔ HÌNH CHÍNH</div>
      <div className="text-[12.5px] text-[color:var(--ae-ink)]">
        Hiện tại: <b className="text-[color:var(--ae-ink)]">{providers.find(p => p.slug === info?.provider)?.name ?? info?.provider}</b>
        {' · '}
        <span className="font-mono">{info?.model}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-[10px] bg-[var(--ae-fill)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)]"
          data-testid="ae-model-provider"
          onChange={e => {
            setProvider(e.target.value)
            setModel('')
          }}
          value={provider}
        >
          {providers.map(p => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          className="rounded-[10px] bg-[var(--ae-fill)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)]"
          data-testid="ae-model-model"
          onChange={e => setModel(e.target.value)}
          value={model}
        >
          {selectedModels.map(mdl => (
            <option key={mdl} value={mdl}>
              {mdl}
            </option>
          ))}
        </select>
        <button
          className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)] disabled:opacity-50"
          disabled={!provider || !model}
          onClick={apply}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Áp dụng
        </button>
      </div>
    </GlassSlab>
  )
}
