import { useStore } from '@nanostores/react'
// apps/desktop/src/aether/ui/screens/morning-brief.tsx
import { useEffect } from 'react'

import { $briefing, $briefingStatus, loadBriefing } from '@/aether/domain/briefing/briefing-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Gauge } from '@/aether/ui/components/micro-viz'

export function MorningBrief({ onPlayVoice }: { onPlayVoice?: () => void }) {
  const briefing = useStore($briefing)

  useEffect(() => {
    if ($briefingStatus.get() === 'idle') {void loadBriefing()}
  }, [])

  const worstServer = (briefing?.servers ?? []).find(s => s.status !== 'ok')

  return (
    <div className="ae-screen flex h-full flex-col p-[16px_22px_18px]">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '14%', top: '34%' }} />
      <div className="ae-vignette" />

      {/* hero */}
      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[30px] font-semibold leading-[1.05]">
            Chào buổi sáng,{' '}
            <b
              style={{
                background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))',
                backgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 22px rgba(74,163,255,.35)',
                WebkitBackgroundClip: 'text',
              }}
            >
              {briefing?.greetingName ?? 'bạn'}
            </b>
          </div>
          <div className="text-[13px] text-[#CFE2F7]">
            {briefing?.priorities.length ?? 0} ưu tiên hôm nay
            {worstServer && (
              <span style={{ color: 'var(--ae-warn)', fontWeight: 600 }}>
                {' '}
                · {worstServer.name} CPU {worstServer.cpu}%
              </span>
            )}
          </div>
        </div>
        <button
          className="flex flex-none items-center gap-2.5 rounded-[13px] p-[11px_18px]"
          onClick={() => onPlayVoice?.()}
          style={{
            background:
              'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))',
            border: '1px solid rgba(120,210,255,.34)',
            boxShadow: '0 0 26px rgba(74,163,255,.18)',
          }}
          type="button"
        >
          <span
            className="grid h-[30px] w-[30px] place-items-center rounded-full"
            style={{
              background:
                'radial-gradient(circle at 35% 30%,#d7f4ff,var(--ae-azure) 70%,var(--ae-azure-bright))',
            }}
          >
            <svg fill="#06283c" height={12} viewBox="0 0 24 24" width={12}>
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
          <span className="flex flex-col">
            <b className="text-[13px]">Nghe brief</b>
            <span className="text-[10.5px] text-[color:var(--ae-dim)]">đọc bằng giọng</span>
          </span>
        </button>
      </div>

      {/* section cards */}
      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1.25fr_1fr_1fr] grid-rows-2 gap-3.5">
        <GlassSlab className="row-span-2 flex flex-col" size="md">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            ƯU TIÊN TRONG NGÀY
          </div>
          <div className="flex min-h-0 flex-col gap-[9px] overflow-auto">
            {(briefing?.priorities ?? []).map(p => (
              <div
                className="flex items-center gap-[11px] rounded-[11px] p-[9px_11px]"
                data-testid="ae-priority-row"
                key={p.id}
                style={{
                  background:
                    p.severity === 'warn'
                      ? 'linear-gradient(160deg,rgba(255,176,32,.08),rgba(255,176,32,.02))'
                      : 'linear-gradient(160deg,rgba(120,195,245,.07),rgba(120,195,245,.02))',
                  border: `1px solid ${p.severity === 'warn' ? 'rgba(255,176,32,.28)' : 'rgba(120,200,255,.1)'}`,
                }}
              >
                <span
                  className="h-[7px] w-[7px] flex-none rounded-full"
                  style={{
                    background: p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)',
                    boxShadow: `0 0 8px ${p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)'}`,
                  }}
                />
                <div className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.2] text-white">
                  {p.title}
                </div>
              </div>
            ))}
          </div>
        </GlassSlab>

        <GlassSlab className="flex flex-col" size="md">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            SERVERS
          </div>
          <div className="flex flex-col gap-2">
            {(briefing?.servers ?? []).map(s => (
              <div className="flex items-center gap-[9px] text-[11.5px]" key={s.name}>
                <span className="flex-1 font-semibold text-[#D7ECFA]">{s.name}</span>
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: s.status === 'ok' ? 'var(--ae-ok)' : 'var(--ae-warn)' }}
                >
                  {s.status === 'ok' ? '✓ ổn định' : `⚠ CPU ${s.cpu}%`}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto">
            <Gauge value={worstServer?.cpu ?? 0} warn={Boolean(worstServer)} />
          </div>
        </GlassSlab>

        <GlassSlab className="flex flex-col" size="md">
          <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            LỊCH HÔM NAY
          </div>
          <div className="text-[13px] font-semibold text-white">
            {briefing?.bento.calendar?.count ?? 0} sự kiện
          </div>
          <div className="mt-1 text-[11px] text-[color:var(--ae-dim)]">
            {briefing?.bento.calendar?.next}
          </div>
        </GlassSlab>
      </div>
    </div>
  )
}
