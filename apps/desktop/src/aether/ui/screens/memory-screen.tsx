import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import {
  $memoryConfig,
  $memoryConfigStatus,
  $memoryEntries,
  $memoryEntriesStatus,
  $memoryOAuth,
  $memoryProvider,
  loadMemoryConfig,
  loadMemoryStatus
} from '@/aether/domain/memory/memory-store'
import * as memoryStore from '@/aether/domain/memory/memory-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { MemoryProviderField } from '@/types/aether'

// Sentinel select value for the built-in/default provider (avoid '' label maps).
const BUILTIN = '__aether_memory_builtin__'

function FieldInput({ field }: { field: MemoryProviderField }) {
  const common = {
    'data-testid': `ae-memory-field-${field.key}`,
    className:
      'w-full rounded-[10px] border border-[rgba(120,200,255,.18)] bg-[rgba(8,28,58,.45)] p-[8px_11px] text-[12.5px] text-white outline-none',
    placeholder: field.placeholder,
    defaultValue: field.value
  }

  if (field.kind === 'select') {
    return (
      <select {...common}>
        {field.options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    )
  }

  return <input {...common} type={field.kind === 'secret' ? 'password' : 'text'} />
}

export function MemoryScreen() {
  const entries = useStore($memoryEntries)
  const entriesStatus = useStore($memoryEntriesStatus)
  const provider = useStore($memoryProvider)
  const config = useStore($memoryConfig)
  const configStatus = useStore($memoryConfigStatus)
  const oauth = useStore($memoryOAuth)

  useEffect(() => {
    if ($memoryEntriesStatus.get() === 'idle') {
      void loadMemoryStatus()
    }
  }, [])

  // When the active provider resolves and we have no config yet, fetch it.
  useEffect(() => {
    if (provider && $memoryConfigStatus.get() === 'idle') {
      void loadMemoryConfig(provider)
    }
  }, [provider])

  // Probe the provider's OAuth flow once the active provider resolves.
  // Called via the namespace so tests can spy/no-op it (see screen tests) and
  // so a pre-set $memoryOAuth fixture isn't clobbered by a real REST probe.
  useEffect(() => {
    if (provider) { void memoryStore.loadMemoryOAuthStatus(provider) }
  }, [provider])

  if (entriesStatus === 'loading' || entriesStatus === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-memory-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (entriesStatus === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Memory.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void loadMemoryStatus()}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (entriesStatus === 'empty') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có provider bộ nhớ nào được cấu hình.</div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          PROVIDER BỘ NHỚ
        </div>
        <select
          className="w-full max-w-sm rounded-[10px] border border-[rgba(120,200,255,.18)] bg-[rgba(8,28,58,.45)] p-[8px_11px] text-[12.5px] text-white outline-none"
          data-testid="ae-memory-provider-select"
          onChange={e => {
            const v = e.target.value === BUILTIN ? '' : e.target.value
            $memoryConfigStatus.set('idle')
            void memoryStore.switchMemoryProvider(v)
          }}
          value={provider ?? BUILTIN}
        >
          <option value={BUILTIN}>(mặc định)</option>
          {(entries?.providers ?? []).map(p => (
            <option key={p.name} value={p.name}>
              {p.name}
              {p.configured ? '' : ' — chưa cấu hình'}
            </option>
          ))}
        </select>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          CẤU HÌNH {config?.label ? `· ${config.label}` : ''}
        </div>
        {configStatus === 'loading' && <div className="ae-skeleton h-5 w-32" />}
        {configStatus === 'ready' &&
          (config?.fields ?? []).map(field => (
            <label className="flex flex-col gap-1" key={field.key}>
              <span className="text-[11.5px] text-[#CFE2F7]">{field.label}</span>
              <FieldInput field={field} />
              {field.description && (
                <span className="text-[10.5px] text-[color:var(--ae-dim)]">{field.description}</span>
              )}
            </label>
          ))}
        {configStatus === 'ready' && (
          <button
            className="mt-1 w-fit rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            data-testid="ae-memory-save"
            onClick={() => {
              if (!provider) { return }
              const values: Record<string, string> = {}

              for (const field of config?.fields ?? []) {
                const el = document.querySelector<HTMLInputElement | HTMLSelectElement>(
                  `[data-testid="ae-memory-field-${field.key}"]`
                )

                if (el) { values[field.key] = el.value }
              }

              void memoryStore.saveMemoryConfig(provider, values)
            }}
            type="button"
          >
            Lưu cấu hình
          </button>
        )}
      </GlassSlab>

      {oauth?.auth === 'oauth' && (
        <GlassSlab className="flex flex-col gap-2" size="md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            KẾT NỐI OAUTH
          </div>
          <div className="text-[12px] text-[#D7ECFA]">{oauth.detail}</div>
          {!oauth.connected && (
            <button
              className="w-fit rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
              data-testid="ae-memory-oauth-start"
              disabled={oauth.state === 'pending'}
              onClick={() => { if (provider) { void memoryStore.startMemoryOAuth(provider) } }}
              type="button"
            >
              {oauth.state === 'pending' ? 'Đang kết nối…' : 'Kết nối'}
            </button>
          )}
        </GlassSlab>
      )}

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          BỘ NHỚ HIỆN TẠI
        </div>
        <div className="text-[12px] text-[#D7ECFA]" data-testid="ae-memory-builtin">
          Provider đang dùng: <b>{entries?.active || '(mặc định)'}</b> · {entries?.builtin_files.memory ?? 0} tệp
          memory · {entries?.builtin_files.user ?? 0} tệp user
        </div>
        <button
          className="w-fit rounded-[11px] border border-[rgba(255,176,32,.4)] p-[8px_16px] text-[12.5px] text-[color:var(--ae-warn)]"
          data-testid="ae-memory-reset"
          onClick={() => {
            if (window.confirm('Xoá toàn bộ bộ nhớ? Hành động này không thể hoàn tác.')) {
              void memoryStore.resetMemory('all')
            }
          }}
          type="button"
        >
          Đặt lại bộ nhớ
        </button>
      </GlassSlab>
    </div>
  )
}
