import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import * as agentsStore from '@/aether/domain/agents/agents-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

function ReadOnlyBadge() {
  return (
    <span className="rounded-[8px] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)] ring-1 ring-[rgba(120,200,255,.22)]">
      Chỉ xem
    </span>
  )
}

export function AgentsScreen() {
  const status = useStore($agentsStatus)
  const agents = useStore($agents)

  useEffect(() => {
    if ($agentsStatus.get() === 'idle') { void agentsStore.loadAgents() }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-center justify-between gap-4">
        <div className="flex flex-col gap-[5px]">
          <div className="text-[24px] font-semibold leading-[1.05]">Mission control · Agent</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">
            Tổng quan agent/phiên đang &amp; đã chạy, lịch cron và năng lực — chỉ để quan sát, không tạo/sửa agent.
          </div>
        </div>
        <ReadOnlyBadge />
      </div>

      <div className="z-[2] mt-4 min-h-0 flex-1">
        {status === 'loading' && (
          <GlassSlab className="h-full" size="md">
            <div data-testid="ae-agents-skeleton" className="flex h-full flex-col gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="h-10 animate-pulse rounded-[11px] bg-[rgba(120,200,255,.08)]" />
              ))}
            </div>
          </GlassSlab>
        )}

        {status === 'empty' && (
          <GlassSlab className="grid h-full place-items-center text-center" size="lg">
            <div>
              <div className="text-[13px] font-semibold text-white">Chưa có agent nào đang chạy</div>
              <div className="mt-1 text-[12px] text-[color:var(--ae-dim)]">
                Khi có phiên, cron hoặc kỹ năng, chúng sẽ hiện ở đây.
              </div>
            </div>
          </GlassSlab>
        )}

        {status === 'error' && (
          <GlassSlab className="grid h-full place-items-center text-center" size="lg">
            <div>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--ae-warn)' }}>
                Không tải được dữ liệu agent
              </div>
              <button
                className="mt-3 rounded-[11px] px-4 py-2 text-[12px] font-semibold ring-1 ring-[rgba(120,200,255,.3)]"
                onClick={() => void agentsStore.loadAgents()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          </GlassSlab>
        )}

        {status === 'ready' && agents && <div data-testid="ae-agents-ready" />}
      </div>
    </div>
  )
}
