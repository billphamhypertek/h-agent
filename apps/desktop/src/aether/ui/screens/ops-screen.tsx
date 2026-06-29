import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $ops, $opsStatus } from '@/aether/domain/ops/ops-store'
import * as opsStore from '@/aether/domain/ops/ops-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

// Finance has no live source yet → tiles render the honest empty-state label,
// no fabricated numbers.
const FINANCE_TILES = ['Doanh thu', 'Chi phí', 'Số dư'] as const

export function OpsScreen() {
  const ops = useStore($ops)
  const status = useStore($opsStatus)

  useEffect(() => {
    if ($opsStatus.get() === 'idle') { void opsStore.loadOps() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-ops-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Vận hành.</div>
          <button
            className="mt-3 rounded-[11px] border border-[color:var(--ae-line-strong)] p-[8px_16px] text-[12.5px] text-[color:var(--ae-ink)]"
            onClick={() => void opsStore.loadOps({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !ops) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" data-testid="ae-ops-empty" size="lg">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> để cockpit có dữ liệu.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Vận hành &amp; Tài chính</div>
        <button
          className="rounded-[11px] border border-[color:var(--ae-line-strong)] p-[6px_14px] text-[12px] text-[color:var(--ae-ink)]"
          data-testid="ae-ops-refresh"
          onClick={() => void opsStore.loadOps({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3" data-testid="ae-ops-finance-empty">
        {FINANCE_TILES.map(tile => (
          <GlassSlab className="flex flex-col gap-1" key={tile} size="sm">
            <div className="text-[10.5px] font-semibold tracking-[.14em] text-[color:var(--ae-azure-soft)]">{tile.toUpperCase()}</div>
            <div className="text-[12px] text-[color:var(--ae-dim)]">Chưa có nguồn tài chính</div>
          </GlassSlab>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <GlassSlab className="flex flex-col gap-2.5" size="md">
          <div className={SECTION_TITLE}>LỊCH HÔM NAY · {ops.calendar.length}</div>
          {ops.calendar.map(c => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-ops-calendar-row" key={c.id}>
              <span className="w-12 flex-none font-semibold text-[color:var(--ae-ink)]">{c.at}</span>
              <span className="min-w-0 flex-1 text-[color:var(--ae-ink)]">{c.title}</span>
              {c.sub && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{c.sub}</span>}
            </div>
          ))}
        </GlassSlab>

        <GlassSlab className="flex flex-col gap-2.5" size="md">
          <div className={SECTION_TITLE}>TASK &amp; DEADLINE · {ops.tasks.length}</div>
          {ops.tasks.map(k => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-ops-task-row" key={k.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: k.severity === 'warn' || k.severity === 'error' ? 'var(--ae-warn)' : 'var(--ae-azure)' }}
              />
              <span className="min-w-0 flex-1 text-[color:var(--ae-ink)]">{k.title}</span>
              {k.due && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{k.due}</span>}
            </div>
          ))}
        </GlassSlab>
      </div>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>SECOND BRAIN</div>
        {ops.notes.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-ops-notes-empty">Chưa có ghi chú</div>
        ) : (
          ops.notes.map(n => (
            <div className="flex items-center gap-2 text-[12px]" key={n.id}>
              <span className="min-w-0 flex-1 text-[color:var(--ae-ink)]">{n.title}</span>
              {n.sub && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{n.sub}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
