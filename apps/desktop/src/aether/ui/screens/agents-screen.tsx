import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $agents, $agentsStatus } from '@/aether/domain/agents/agents-store'
import * as agentsStore from '@/aether/domain/agents/agents-store'
import { $orbState } from '@/aether/domain/motion/motion-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

function ReadOnlyBadge() {
  return (
    <span className="rounded-[8px] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[.16em] text-[color:var(--ae-azure-soft)] ring-1 ring-[rgba(120,200,255,.22)]">
      Chỉ xem
    </span>
  )
}

const ORB_LABEL: Record<'thinking' | 'idle' | 'paused', string> = {
  thinking: 'Đang xử lý',
  idle: 'Sẵn sàng',
  paused: 'Mất kết nối',
}

const ORB_COLOR: Record<'thinking' | 'idle' | 'paused', string> = {
  thinking: 'var(--ae-azure)',
  idle: 'var(--ae-ok)',
  paused: 'var(--ae-warn)',
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-[11px] text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
      {children}
    </div>
  )
}

export function AgentsScreen() {
  const status = useStore($agentsStatus)
  const agents = useStore($agents)
  const orbState = useStore($orbState)

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

        {status === 'ready' && agents && (
          <div className="grid h-full min-h-0 grid-cols-[1.4fr_1fr] grid-rows-[auto_1fr] gap-3.5">
            {/* presence + running summary spans the top */}
            <GlassSlab className="col-span-2 flex items-center justify-between" size="sm">
              <div className="flex items-center gap-[11px]">
                <span
                  data-testid="ae-agents-presence"
                  data-orb={orbState}
                  className="h-[9px] w-[9px] flex-none rounded-full"
                  style={{ background: ORB_COLOR[orbState], boxShadow: `0 0 9px ${ORB_COLOR[orbState]}` }}
                />
                <span className="text-[12.5px] font-semibold text-white">{ORB_LABEL[orbState]}</span>
              </div>
              <div className="text-[12px] text-[color:var(--ae-dim)]">
                <b className="text-white">{agents.runningCount}</b> agent đang chạy ·{' '}
                <b className="text-white">{agents.cron.length}</b> lịch ·{' '}
                <b className="text-white">{agents.enabledSkillCount}</b> năng lực bật
              </div>
            </GlassSlab>

            {/* sessions */}
            <GlassSlab className="row-span-2 flex min-h-0 flex-col" size="md">
              <SectionTitle>AGENT / PHIÊN</SectionTitle>
              <div data-testid="ae-agents-sessions" className="flex min-h-0 flex-col gap-[9px] overflow-auto">
                {agents.sessions.map(session => (
                  <div
                    key={session.id}
                    className="flex items-center gap-[11px] rounded-[11px] p-[9px_11px] ring-1 ring-[rgba(120,200,255,.1)]"
                  >
                    <span
                      className="h-[7px] w-[7px] flex-none rounded-full"
                      style={{
                        background: session.isActive ? 'var(--ae-ok)' : 'var(--ae-dim)',
                        boxShadow: session.isActive ? '0 0 8px var(--ae-ok)' : 'none',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-white">{session.title}</div>
                      <div className="text-[10.5px] text-[color:var(--ae-dim)]">
                        {session.source} · {session.profile}
                        {session.model ? ` · ${session.model}` : ''}
                      </div>
                    </div>
                    <span className="text-[10.5px] text-[color:var(--ae-dim)]">{session.messageCount} tin</span>
                  </div>
                ))}
              </div>
            </GlassSlab>

            {/* cron */}
            <GlassSlab className="flex min-h-0 flex-col" size="md">
              <SectionTitle>LỊCH (CRON)</SectionTitle>
              <div data-testid="ae-agents-cron" className="flex min-h-0 flex-col gap-2 overflow-auto">
                {agents.cron.map(job => (
                  <div key={job.id} className="flex items-center gap-[9px] text-[11.5px]">
                    <span
                      className="h-[6px] w-[6px] flex-none rounded-full"
                      style={{ background: job.enabled ? 'var(--ae-ok)' : 'var(--ae-dim)' }}
                    />
                    <span className="flex-1 truncate font-semibold text-[#D7ECFA]">{job.name}</span>
                    <span className="text-[10px] text-[color:var(--ae-dim)]">{job.schedule}</span>
                  </div>
                ))}
              </div>
            </GlassSlab>

            {/* skills */}
            <GlassSlab className="flex min-h-0 flex-col" size="md">
              <SectionTitle>NĂNG LỰC (SKILLS)</SectionTitle>
              <div data-testid="ae-agents-skills" className="flex min-h-0 flex-wrap content-start gap-[7px] overflow-auto">
                {agents.skills.map(skill => (
                  <span
                    key={skill.name}
                    className="rounded-[9px] px-[9px] py-[5px] text-[11px] font-semibold ring-1"
                    style={{
                      color: skill.enabled ? '#D7ECFA' : 'var(--ae-dim)',
                      ['--tw-ring-color' as string]: skill.enabled ? 'rgba(120,200,255,.28)' : 'rgba(120,200,255,.1)',
                    }}
                  >
                    {skill.name}
                  </span>
                ))}
              </div>
            </GlassSlab>
          </div>
        )}
      </div>
    </div>
  )
}
