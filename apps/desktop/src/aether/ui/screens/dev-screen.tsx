import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $dev, $devStatus } from '@/aether/domain/dev/dev-store'
import * as devStore from '@/aether/domain/dev/dev-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { Gauge } from '@/aether/ui/components/micro-viz'

const SECTION_TITLE = 'mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]'

function RefreshButton() {
  return (
    <button
      className="rounded-[11px] border border-[rgba(120,200,255,.3)] p-[6px_14px] text-[12px] text-white"
      data-testid="ae-dev-refresh"
      onClick={() => void devStore.loadDev({ force: true })}
      type="button"
    >
      Làm mới
    </button>
  )
}

function SectionEmpty({ testid, message }: { testid: string; message: string }) {
  return (
    <div className="text-[12px] text-[color:var(--ae-dim)]" data-testid={testid}>
      {message}
    </div>
  )
}

export function DevScreen() {
  const dev = useStore($dev)
  const status = useStore($devStatus)

  useEffect(() => {
    if ($devStatus.get() === 'idle') { void devStore.loadDev() }
  }, [])

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="ae-screen-bare flex h-full min-w-0 flex-col">
        <GlassSlab size="lg">
          <div className="ae-skeleton h-6 w-40" data-testid="ae-dev-skeleton" />
        </GlassSlab>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" size="lg">
          <div className="text-sm text-[color:var(--ae-warn)]">Không tải được dữ liệu Dev.</div>
          <button
            className="mt-3 rounded-[11px] border border-[rgba(120,200,255,.3)] p-[8px_16px] text-[12.5px] text-white"
            onClick={() => void devStore.loadDev({ force: true })}
            type="button"
          >
            Thử lại
          </button>
        </GlassSlab>
      </div>
    )
  }

  if (status === 'empty' || !dev) {
    return (
      <div className="ae-screen-bare grid h-full place-items-center">
        <GlassSlab className="text-center" data-testid="ae-dev-empty" size="lg">
          <div className="text-sm text-[color:var(--ae-dim)]">Chưa có bản tổng hợp — cron chưa chạy.</div>
          <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
            Bật cron <b>company-os-aggregator</b> để cockpit có dữ liệu.
          </div>
        </GlassSlab>
      </div>
    )
  }

  const worst = dev.servers.find(s => s.status !== 'ok')

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col gap-3.5 overflow-auto">
      <div className="flex items-center justify-between">
        <div className="text-[13px] uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)]">Dev &amp; DevOps</div>
        <RefreshButton />
      </div>

      <GlassSlab className="flex flex-col gap-3" size="md">
        <div className={SECTION_TITLE}>SERVER VITALS</div>
        <div className="flex flex-col gap-2.5">
          {dev.servers.map(s => (
            <div className="flex items-center gap-3 text-[11.5px]" data-testid="ae-dev-server-row" key={s.name}>
              <span className="w-28 flex-none font-semibold text-[#D7ECFA]">{s.name}</span>
              <span
                className="text-[10px] font-semibold"
                style={{ color: s.status === 'ok' ? 'var(--ae-ok)' : 'var(--ae-warn)' }}
              >
                {s.status === 'ok' ? '✓ ổn định' : `⚠ ${s.status}`}
              </span>
              <span className="ml-auto text-[10.5px] text-[color:var(--ae-dim)]">
                CPU {s.cpu}% · RAM {s.mem}% · Disk {s.disk}%
              </span>
            </div>
          ))}
        </div>
        <div className="mt-1">
          <Gauge value={worst?.cpu ?? dev.servers[0]?.cpu ?? 0} warn={Boolean(worst)} />
        </div>
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>DEPLOY GẦN NHẤT</div>
        {dev.deploys.length === 0 ? (
          <SectionEmpty message="Chưa có nguồn deploy" testid="ae-dev-deploys-empty" />
        ) : (
          dev.deploys.map(d => (
            <div className="flex items-center gap-2 text-[12px]" key={d.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: d.status === 'failed' ? 'var(--ae-warn)' : 'var(--ae-ok)' }}
              />
              <span className="font-semibold text-white">{d.service}</span>
              <span className="text-[color:var(--ae-dim)]">{d.sub}</span>
              <span className="ml-auto text-[10.5px] text-[color:var(--ae-dim)]">{d.at}</span>
            </div>
          ))
        )}
      </GlassSlab>

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className={SECTION_TITLE}>SỰ CỐ</div>
        {dev.incidents.length === 0 ? (
          <SectionEmpty message="Chưa có nguồn sự cố" testid="ae-dev-incidents-empty" />
        ) : (
          dev.incidents.map(i => (
            <div className="flex items-center gap-2 text-[12px]" key={i.id}>
              <span
                className="h-[7px] w-[7px] flex-none rounded-full"
                style={{ background: i.severity === 'error' ? 'var(--ae-warn)' : 'var(--ae-azure)' }}
              />
              <span className="min-w-0 flex-1 text-white">{i.title}</span>
              {i.at && <span className="text-[10.5px] text-[color:var(--ae-dim)]">{i.at}</span>}
            </div>
          ))
        )}
      </GlassSlab>
    </div>
  )
}
