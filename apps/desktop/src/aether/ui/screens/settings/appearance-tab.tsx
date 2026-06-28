import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import type { ConfigFieldSchema } from '@/aether-api'
import {
  $configRecord,
  $configSchema,
  $configStatus,
  getConfigField,
  loadConfig,
  saveConfig,
  setConfigField
} from '@/aether/domain/settings/config-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { useTheme } from '@/themes/context'

const MODES: { id: 'dark' | 'light' | 'system'; label: string }[] = [
  { id: 'light', label: 'Sáng' },
  { id: 'dark', label: 'Tối' },
  { id: 'system', label: 'Theo hệ thống' }
]

function ConfigField({ dottedKey, schema }: { dottedKey: string; schema: ConfigFieldSchema }) {
  useStore($configRecord)
  const value = getConfigField(dottedKey)

  const commit = (v: unknown) => {
    setConfigField(dottedKey, v)
    void saveConfig()
  }

  const testId = `ae-config-${dottedKey}`

  if (schema.type === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <input checked={Boolean(value)} data-testid={testId} onChange={e => commit(e.target.checked)} type="checkbox" />
        <span className="text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
      </label>
    )
  }

  if (schema.type === 'number') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
        <input
          className="w-28 rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
          data-testid={testId}
          onChange={e => commit(Number(e.target.value))}
          type="number"
          value={value === undefined ? '' : Number(value)}
        />
      </label>
    )
  }

  if (schema.type === 'select') {
    return (
      <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
        <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
        <select
          className="rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
          data-testid={testId}
          onChange={e => commit(e.target.value)}
          value={String(value ?? '')}
        >
          {(schema.options ?? []).map(opt => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </label>
    )
  }

  // string | text | list | undefined → text input
  return (
    <label className="flex items-center gap-2 text-[12.5px]" key={dottedKey}>
      <span className="flex-1 text-[#D7ECFA]">{schema.description ?? dottedKey}</span>
      <input
        className="min-w-[200px] flex-1 rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-white"
        data-testid={testId}
        defaultValue={String(value ?? '')}
        onBlur={e => commit(e.target.value)}
        type="text"
      />
    </label>
  )
}

export function AppearanceTab() {
  const { themeName, mode, setMode, setTheme, availableThemes } = useTheme()
  const status = useStore($configStatus)
  const schema = useStore($configSchema)

  useEffect(() => {
    if ($configStatus.get() === 'idle') {
      void loadConfig()
    }
  }, [])

  const categoryOrder = schema?.category_order ?? []
  const fieldEntries = Object.entries(schema?.fields ?? {})
  const byCategory = (cat: string) => fieldEntries.filter(([, f]) => (f.category ?? 'general') === cat)

  const categories = categoryOrder.length
    ? categoryOrder
    : Array.from(new Set(fieldEntries.map(([, f]) => f.category ?? 'general')))

  return (
    <div className="flex flex-col gap-3">
      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          Chế độ màu
        </div>
        <div className="flex gap-1.5">
          {MODES.map(m => (
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
              key={m.id}
              onClick={() => setMode(m.id)}
              style={
                mode === m.id
                  ? { background: 'var(--ae-azure)', color: '#fff' }
                  : { background: 'rgba(120,195,245,.07)', color: 'var(--ae-azure-soft)' }
              }
              type="button"
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          Giao diện (skin)
        </div>
        <select
          className="self-start rounded-[10px] bg-[rgba(120,195,245,.07)] px-2.5 py-1.5 text-[12px] text-white"
          data-testid="ae-skin-select"
          onChange={e => setTheme(e.target.value)}
          value={themeName}
        >
          {availableThemes.map(t => (
            <option key={t.name} value={t.name}>
              {t.label}
            </option>
          ))}
        </select>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          Cấu hình
        </div>
        {(status === 'loading' || status === 'idle') && (
          <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải cấu hình…</div>
        )}
        {status === 'error' && (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được cấu hình.</div>
            <button
              className="self-start rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-white"
              onClick={() => void loadConfig()}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Thử lại
            </button>
          </div>
        )}
        {status === 'ready' &&
          categories.map(cat => {
            const fields = byCategory(cat)

            if (!fields.length) {
              return null
            }

            return (
              <div className="flex flex-col gap-2" key={cat}>
                <div className="text-[10.5px] uppercase tracking-[.12em] text-[color:var(--ae-dim)]">{cat}</div>
                {fields.map(([key, fieldSchema]) => (
                  <ConfigField dottedKey={key} key={key} schema={fieldSchema} />
                ))}
              </div>
            )
          })}
      </GlassSlab>
    </div>
  )
}
