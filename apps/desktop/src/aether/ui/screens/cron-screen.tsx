import { useStore } from '@nanostores/react'
import { useEffect } from 'react'

import { $cronJobs, $cronJobsStatus, loadCronJobs } from '@/aether/domain/cron/cron-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { CronJob } from '@/types/aether'

function asText(v?: null | string): string {
  return typeof v === 'string' ? v.trim() : ''
}
function truncate(v: string, n: number): string {
  return v.length > n ? `${v.slice(0, n)}…` : v
}
function jobTitle(job: CronJob): string {
  return asText(job.name) || truncate(asText(job.prompt), 60) || truncate(asText(job.script), 60) || job.id
}
function jobState(job: CronJob): string {
  return asText(job.state) || (job.enabled === false ? 'disabled' : 'scheduled')
}
function stateLabel(state: string): string {
  const map: Record<string, string> = {
    scheduled: 'Đã lên lịch',
    enabled: 'Đang chạy',
    paused: 'Tạm dừng',
    disabled: 'Tắt',
    error: 'Lỗi',
    completed: 'Hoàn tất',
  }
  return map[state] ?? state
}
function stateColor(state: string): string {
  if (state === 'error' || state === 'completed') { return 'var(--ae-warn)' }
  if (state === 'paused' || state === 'disabled') { return 'var(--ae-dim)' }
  return 'var(--ae-ok)'
}
function formatTime(iso?: null | string): string {
  if (!iso) { return '—' }
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('vi-VN')
}
function scheduleText(job: CronJob): string {
  return asText(job.schedule_display) || asText(job.schedule?.display) || asText(job.schedule?.expr) || '—'
}

export function CronScreen() {
  const jobs = useStore($cronJobs)
  const status = useStore($cronJobsStatus)

  useEffect(() => {
    if ($cronJobsStatus.get() === 'idle') { void loadCronJobs() }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="text-[22px] font-semibold leading-tight text-white">Tác vụ định kỳ</div>
        <div className="text-[12px] text-[color:var(--ae-dim)]">{jobs?.length ?? 0} tác vụ</div>
      </div>

      <div className="z-[2] mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {status === 'loading' && (
          <div className="flex flex-col gap-3" data-testid="ae-cron-skeleton">
            {[0, 1, 2].map(i => (
              <GlassSlab className="h-[78px] animate-pulse opacity-60" key={i} size="sm">
                <span className="sr-only">Đang tải…</span>
              </GlassSlab>
            ))}
          </div>
        )}

        {status === 'empty' && (
          <GlassSlab className="text-center" size="lg">
            <div className="text-sm text-[color:var(--ae-dim)]">Chưa có tác vụ định kỳ nào.</div>
          </GlassSlab>
        )}

        {status === 'error' && (
          <GlassSlab className="flex items-center justify-between gap-4" size="md">
            <div className="text-sm text-[color:var(--ae-warn)]">Không tải được danh sách tác vụ.</div>
            <button
              className="rounded-[10px] border border-[color:var(--ae-azure-soft)] px-3 py-1.5 text-[12px] text-[color:var(--ae-azure-soft)]"
              onClick={() => void loadCronJobs()}
              type="button"
            >
              Thử lại
            </button>
          </GlassSlab>
        )}

        {status === 'ready' &&
          (jobs ?? []).map(job => {
            const state = jobState(job)
            return (
              <GlassSlab className="flex items-start justify-between gap-4" data-testid="ae-cron-row" key={job.id} size="sm">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13.5px] font-semibold text-white">{jobTitle(job)}</span>
                    <span
                      className="rounded-full px-2 py-[2px] text-[10px] font-semibold"
                      style={{ background: 'rgba(120,200,255,.08)', color: stateColor(state) }}
                    >
                      {stateLabel(state)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-[color:var(--ae-dim)]">
                    <span className="font-mono">{scheduleText(job)}</span>
                    <span>Lần tới: {formatTime(job.next_run_at)}</span>
                    <span>Gần nhất: {formatTime(job.last_run_at)}</span>
                  </div>
                  {job.last_error && <div className="mt-1 text-[11px] text-[color:var(--ae-warn)]">{job.last_error}</div>}
                </div>
              </GlassSlab>
            )
          })}
      </div>
    </div>
  )
}
