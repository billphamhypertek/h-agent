import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $content, $contentStatus } from '@/aether/domain/content/content-store'
import * as contentStore from '@/aether/domain/content/content-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

const IDEA_STAGE_LABEL: Record<'idea' | 'draft' | 'scheduled', string> = {
  idea: 'Ý tưởng',
  draft: 'Nháp',
  scheduled: 'Đã lên lịch'
}

export function ContentScreen() {
  const content = useStore($content)
  const status = useStore($contentStatus)

  useEffect(() => {
    if ($contentStatus.get() === 'idle') { void contentStore.loadContent() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-content-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được Content.</div>
          <button
            className="mt-3 rounded-[11px] border border-[color:var(--ae-line-strong)] p-[8px_16px] text-[12.5px] text-[color:var(--ae-ink)]"
            onClick={() => void contentStore.loadContent({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !content) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" data-testid="ae-content-empty" size="lg">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có nguồn nội dung.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Lịch đa kênh và bảng ý tưởng sẽ hiện ở đây khi có nguồn nội dung.
          </div>
        </GlassSlab>
      </div>
    )
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Content engine</div>
        <button
          className="rounded-[11px] border border-[color:var(--ae-line-strong)] p-[6px_14px] text-[12px] text-[color:var(--ae-ink)]"
          data-testid="ae-content-refresh"
          onClick={() => void contentStore.loadContent({ force: true })}
          type="button"
        >
          Làm mới
        </button>
      </div>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>LỊCH ĐA KÊNH</div>
        {content.calendar.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-content-calendar-empty">Chưa có nguồn nội dung</div>
        ) : (
          content.calendar.map(c => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-content-calendar-row" key={c.id}>
              <span className="w-14 flex-none font-semibold text-[color:var(--ae-ink)]">{c.at}</span>
              <span className="rounded-[8px] border border-[color:var(--ae-line)] px-2 py-0.5 text-[10.5px] text-[color:var(--ae-azure-soft)]">{c.channel}</span>
              <span className="min-w-0 flex-1 text-[color:var(--ae-ink)]">{c.title}</span>
              {c.status && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{c.status}</span>}
            </div>
          ))
        )}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2.5" size="md">
        <div className={SECTION_TITLE}>Ý TƯỞNG → NHÁP → LỊCH</div>
        {content.ideas.length === 0 ? (
          <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid="ae-content-ideas-empty">Chưa có nguồn nội dung</div>
        ) : (
          content.ideas.map(i => (
            <div className="flex items-center gap-2.5 text-[12px]" data-testid="ae-content-idea-row" key={i.id}>
              <span className="rounded-[8px] border border-[color:var(--ae-line)] px-2 py-0.5 text-[10.5px] text-[color:var(--ae-azure-soft)]">{IDEA_STAGE_LABEL[i.stage]}</span>
              <span className="min-w-0 flex-1 text-[color:var(--ae-ink)]">{i.title}</span>
              {i.channel && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{i.channel}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
