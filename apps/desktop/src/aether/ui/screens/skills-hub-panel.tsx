// apps/desktop/src/aether/ui/screens/skills-hub-panel.tsx
import { useStore } from '@nanostores/react'
import { useState } from 'react'

import {
  $hubBusy,
  $hubResults,
  $hubStatus,
  installFromHub,
  searchHub,
  updateHub,
} from '@/aether/domain/skills/skills-hub-store'
import type { SkillHubResult } from '@/aether/domain/skills/skills-types'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

function HubRow({ result }: { result: SkillHubResult }) {
  const busy = useStore($hubBusy)
  const installing = busy === result.identifier

  return (
    <div
      className="flex items-center gap-3 rounded-[11px] p-[9px_11px]"
      data-testid="ae-hub-row"
      style={{
        background: 'linear-gradient(160deg,var(--ae-fill),var(--ae-fill-2))',
        border: '1px solid var(--ae-line)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[12.5px] font-semibold text-[color:var(--ae-ink)]">{result.name}</span>
          <span
            className="flex-none rounded-full px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[.1em]"
            style={{ background: 'var(--ae-fill)', color: 'var(--ae-azure-soft)' }}
          >
            {result.trust_level}
          </span>
        </div>
        <div className="mt-0.5 line-clamp-1 text-[11px] text-[color:var(--ae-dim)]">
          {result.description}
        </div>
      </div>
      <button
        className="flex-none rounded-[9px] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
        disabled={installing}
        onClick={() => void installFromHub(result.identifier)}
        style={{
          background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))',
          border: '1px solid var(--ae-line-strong)',
          color: 'var(--ae-azure-soft)',
        }}
        type="button"
      >
        {installing ? 'Đang cài…' : 'Cài đặt'}
      </button>
    </div>
  )
}

export function SkillsHubPanel() {
  const results = useStore($hubResults)
  const status = useStore($hubStatus)
  const busy = useStore($hubBusy)
  const [query, setQuery] = useState('')

  return (
    <GlassSlab className="z-[2] mt-4 flex min-h-0 flex-col gap-3" size="md">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">
          Hub skill
        </div>
        <button
          className="flex-none rounded-[9px] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50"
          disabled={busy === '__update__'}
          onClick={() => void updateHub()}
          style={{ background: 'var(--ae-fill)', border: '1px solid var(--ae-line)' }}
          type="button"
        >
          {busy === '__update__' ? 'Đang cập nhật…' : 'Cập nhật tất cả'}
        </button>
      </div>

      <form
        className="flex items-center gap-2"
        data-testid="ae-hub-search-form"
        onSubmit={e => {
          e.preventDefault()
          void searchHub(query)
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-[10px] px-3 py-1.5 text-[12px] text-[color:var(--ae-ink)] outline-none"
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm skill trong Hub…"
          style={{ background: 'var(--ae-well)', border: '1px solid var(--ae-line)' }}
          value={query}
        />
        <button
          className="flex-none rounded-[10px] px-3 py-1.5 text-[12px] font-semibold"
          style={{
            background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))',
            border: '1px solid var(--ae-line-strong)',
            color: 'var(--ae-azure-soft)',
          }}
          type="submit"
        >
          Tìm
        </button>
      </form>

      <div className="flex min-h-0 flex-col gap-2 overflow-auto">
        {status === 'searching' && (
          <div className="text-[11.5px] text-[color:var(--ae-dim)]">Đang tìm…</div>
        )}
        {status === 'empty' && (
          <div className="text-[11.5px] text-[color:var(--ae-dim)]">Không tìm thấy skill phù hợp.</div>
        )}
        {status === 'error' && (
          <div className="text-[11.5px]" style={{ color: 'var(--ae-warn)' }}>
            Lỗi tìm kiếm Hub. Thử lại.
          </div>
        )}
        {status === 'ready' && results.map(r => <HubRow key={r.identifier} result={r} />)}
      </div>
    </GlassSlab>
  )
}
