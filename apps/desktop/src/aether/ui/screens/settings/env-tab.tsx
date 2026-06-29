import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $envStatus,
  $envVars,
  $revealed,
  loadEnvVars,
  removeEnvVar,
  revealKey,
  saveEnvVar
} from '@/aether/domain/settings/env-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function EnvTab({ onReveal }: { onReveal?: (key: string) => void }) {
  const status = useStore($envStatus)
  const vars = useStore($envVars)
  const revealed = useStore($revealed)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if ($envStatus.get() === 'idle') {
      void loadEnvVars()
    }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải khóa…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được khóa môi trường.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)]"
          onClick={() => void loadEnvVars()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  if (status === 'empty') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có khóa môi trường nào.</div>
      </GlassSlab>
    )
  }

  const entries = Object.entries(vars ?? {})

  return (
    <GlassSlab className="flex flex-col gap-3" size="md">
      <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">KHÓA MÔI TRƯỜNG</div>
      {entries.map(([key, info]) => {
        const draft = drafts[key] ?? ''
        const shown = revealed[key]
        const inputValue = shown ?? draft
        const inputType = info.is_password && !shown ? 'password' : 'text'

        return (
          <div className="flex flex-col gap-1.5 border-b border-[color:var(--ae-line)] pb-2.5" key={key}>
            <div className="flex items-center gap-2">
              <span className="flex-1 font-mono text-[12px] font-semibold text-[color:var(--ae-ink)]">{key}</span>
              {info.is_set && (
                <button
                  className="rounded-[8px] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--ae-azure-soft)]"
                  onClick={() => (onReveal ? onReveal(key) : void revealKey(key))}
                  type="button"
                >
                  {shown ? 'Ẩn' : 'Hiện'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-[color:var(--ae-dim)]">{info.description}</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-w-[220px] flex-1 rounded-[10px] bg-[var(--ae-fill)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)]"
                data-testid={`ae-env-${key}`}
                onChange={e => setDrafts(d => ({ ...d, [key]: e.target.value }))}
                placeholder={info.is_set ? info.redacted_value ?? '••••••••' : 'Nhập giá trị'}
                type={inputType}
                value={inputValue}
              />
              <button
                className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)] disabled:opacity-50"
                disabled={!draft.trim()}
                onClick={() => {
                  void saveEnvVar(key, draft.trim())
                  setDrafts(d => ({ ...d, [key]: '' }))
                }}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Lưu
              </button>
              {info.is_set && (
                <button
                  className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-warn)]"
                  onClick={() => void removeEnvVar(key)}
                  type="button"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        )
      })}
    </GlassSlab>
  )
}
