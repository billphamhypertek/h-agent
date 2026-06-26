import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $inbox, $inboxStatus } from '@/aether/domain/inbox/inbox-store'
import * as inboxStore from '@/aether/domain/inbox/inbox-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

// Read-only CRM stages frame. No native CRM source yet → every column renders
// the honest empty-state; no fabricated deals.
const PIPELINE_STAGES = ['Tiềm năng', 'Đang trao đổi', 'Báo giá', 'Chốt'] as const

export function InboxScreen() {
  const inbox = useStore($inbox)
  const status = useStore($inboxStatus)

  useEffect(() => {
    if ($inboxStatus.get() === 'idle') { void inboxStore.loadInbox() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-inbox-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Inbox.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void inboxStore.loadInbox({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !inbox) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg" data-testid="ae-inbox-empty">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> (kèm skill <b>google-workspace</b>) để có email.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Inbox + CRM</div>
        <button
          className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
          data-testid="ae-inbox-refresh"
          onClick={() => void inboxStore.loadInbox({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>EMAIL CẦN XỬ LÝ · {inbox.threads.length}</div>
        {inbox.threads.map(t => (
          <div className="flex items-start gap-3 rounded-[11px] p-[9px_11px]" data-testid="ae-inbox-thread-row" key={t.id}
            style={{ background: 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))', border: '1px solid rgba(120,200,255,.1)' }}
          >
            {t.unread && (
              <span className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full" style={{ background: 'var(--ae-azure)', boxShadow: '0 0 8px var(--ae-azure)' }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[12.5px]">
                <span className="font-semibold text-white">{t.sender}</span>
                <span className="truncate text-[#CFE2F7]">{t.subject}</span>
              </div>
              {t.snippet && <div className="mt-0.5 truncate text-[11px] text-[color:var(--ae-dim)]">{t.snippet}</div>}
            </div>
          </div>
        ))}
      </GlassSlab>

      <GlassSlab className="flex min-h-0 flex-col" size="md">
        <div className={SECTION_TITLE}>DEAL PIPELINE</div>
        <div className="grid grid-cols-4 gap-2.5" data-testid="ae-inbox-deals-empty">
          {PIPELINE_STAGES.map(stage => (
            <div className="flex flex-col gap-1.5" key={stage}>
              <div className="text-[11px] font-semibold text-[#D7ECFA]">{stage}</div>
              <div className="rounded-[11px] border border-dashed border-[rgba(120,200,255,.18)] p-3 text-center text-[11px] text-[color:var(--ae-dim)]">
                Chưa có nguồn CRM
              </div>
            </div>
          ))}
        </div>
      </GlassSlab>
    </div>
  )
}
