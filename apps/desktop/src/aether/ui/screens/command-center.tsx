// apps/desktop/src/aether/ui/screens/command-center.tsx
import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $briefing, $briefingStatus, loadBriefing } from '@/aether/domain/briefing/briefing-store'
import { CommandBar } from '@/aether/ui/components/command-bar'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Bar, Gauge } from '@/aether/ui/components/micro-viz'
import { LivingOrb } from '@/aether/ui/orb/living-orb'

export function CommandCenter({ onCommandPalette }: { onCommandPalette?: () => void }) {
  const briefing = useStore($briefing)
  const status = useStore($briefingStatus)

  useEffect(() => {
    if ($briefingStatus.get() === 'idle') { void loadBriefing() }
  }, [])

  const servers = briefing?.servers ?? []
  const worstServer = servers.find(s => s.status !== 'ok')

  return (
    <div className="ae-screen flex h-full flex-col p-[18px_22px]">
      <div className="ae-grid-floor" />
      <div className="ae-bloom" style={{ left: '8%', top: '30%' }} />
      <div className="ae-vignette" />

      <div className="z-[2] grid min-h-0 flex-1 grid-cols-[26%_44%_30%] gap-[18px]">
        {/* LEFT — orb + chips */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="flex flex-1 flex-col items-center justify-center gap-3.5 p-[6px_0]">
            <LivingOrb label="Agent sẵn sàng" size={170} state="idle" />
            <div className="text-[12.5px] font-semibold tracking-[.18em] text-[color:var(--ae-azure-soft)]">SẴN SÀNG</div>
          </GlassSlab>
          <div className="flex flex-col gap-2">
            <div className="ae-slab flex items-center justify-between p-[10px_13px] text-xs text-[color:var(--ae-dim)]">
              Tập trung <b className="text-white">{briefing?.priorities.length ?? 0} việc</b>
            </div>
            <div className="ae-slab flex items-center justify-between p-[10px_13px] text-xs text-[color:var(--ae-dim)]">
              Năng lượng hệ thống <b style={{ color: 'var(--ae-ok)' }}>{100 - (briefing?.vitals.cpu ?? 0)}%</b>
            </div>
          </div>
        </div>

        {/* CENTER — brief + bento */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="p-[16px_18px]">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-bold">Brief sáng</h3>
              <span className="font-mono text-[11px] text-[color:var(--ae-dim)]">{status === 'ready' ? '·' : status}</span>
            </div>
            <div className="flex flex-col gap-[9px]">
              {(briefing?.priorities ?? []).map(p => (
                <div
                  className="flex items-start gap-2.5 text-[12.5px] leading-[1.35]"
                  key={p.id}
                  style={{ color: p.severity === 'warn' ? '#FFE6BE' : '#D7ECFA' }}
                >
                  <span
                    className="mt-[5px] h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)', boxShadow: `0 0 8px ${p.severity === 'warn' ? 'var(--ae-warn)' : 'var(--ae-azure)'}` }}
                  />
                  {p.title}
                </div>
              ))}
            </div>
          </GlassSlab>

          <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-[13px]">
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">SERVERS</span>
              <span className="text-[13px] font-semibold leading-[1.3] text-white">
                {servers.map(s => `${s.name} ${s.status === 'ok' ? '✓' : `⚠ ${s.cpu}%`}`).join(' · ')}
              </span>
              <div className="mt-auto"><Gauge value={worstServer?.cpu ?? 0} warn={Boolean(worstServer)} /></div>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">DEALS</span>
              <span className="text-[13px] font-semibold text-white">
                {briefing?.bento.deals ? `${briefing.bento.deals.active} đang chạy · ` : 'Chưa có dữ liệu'}
                {briefing?.bento.deals && <span style={{ background: 'linear-gradient(180deg,#fff,var(--ae-azure-soft))', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{briefing.bento.deals.valueLabel}</span>}
              </span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.deals?.sub}</span>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">LỊCH</span>
              <span className="text-[13px] font-semibold text-white">{briefing?.bento.calendar?.count ?? 0} sự kiện</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.calendar?.next}</span>
            </GlassSlab>
            <GlassSlab className="flex flex-col gap-1.5 p-[13px_14px]">
              <span className="text-[10px] font-semibold tracking-[.2em] text-[color:var(--ae-azure-soft)]">AGENTS</span>
              <span className="text-[13px] font-semibold leading-[1.3] text-white">{briefing?.bento.agents?.headline}</span>
              <span className="text-[11px] text-[color:var(--ae-dim)]">{briefing?.bento.agents?.sub}</span>
            </GlassSlab>
          </div>
        </div>

        {/* RIGHT — feed + vitals */}
        <div className="flex min-h-0 flex-col gap-[13px]">
          <GlassSlab className="p-[15px_16px]">
            <h4 className="mb-3 text-xs font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">HOẠT ĐỘNG TRỰC TIẾP</h4>
            {(briefing?.feed ?? []).map((f, i) => (
              <div className="flex items-start gap-[11px] border-b border-[rgba(120,200,255,.08)] py-[7px] last:border-0" key={i}>
                <span className="w-[42px] flex-none font-mono text-[11px] text-[color:var(--ae-azure)]">{f.time}</span>
                <span className="text-xs leading-[1.3] text-[#D7ECFA]">{f.text}</span>
              </div>
            ))}
          </GlassSlab>
          <GlassSlab className="flex flex-1 flex-col p-[15px_16px]">
            <h4 className="mb-3 text-xs font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">VITALS</h4>
            {([['CPU', briefing?.vitals.cpu ?? 0, (briefing?.vitals.cpu ?? 0) >= 80], ['API', briefing?.vitals.api ?? 0, false], ['Bộ nhớ', briefing?.vitals.memory ?? 0, false]] as const).map(([label, val, warn]) => (
              <div className="mb-[13px] flex flex-col gap-1.5 last:mb-0" key={label}>
                <div className="flex justify-between text-[11px] text-[color:var(--ae-dim)]"><span>{label}</span><b className="text-white">{val}%</b></div>
                <Bar value={val} warn={warn} />
              </div>
            ))}
          </GlassSlab>
        </div>
      </div>

      <div className="z-[2] mt-4"><CommandBar onActivate={onCommandPalette} /></div>
    </div>
  )
}
