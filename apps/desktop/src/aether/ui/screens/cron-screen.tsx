import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { $cronJobs, $cronJobsStatus, $cronRuns, $cronRunsStatus, loadCronDeliveryTargets, loadCronJobs } from '@/aether/domain/cron/cron-store'
import * as cronStore from '@/aether/domain/cron/cron-store'
import { useCronPoll } from '@/aether/domain/cron/use-cron-poll'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { CronForm } from '@/aether/ui/screens/cron-form'
import type { CronJob, CronJobCreatePayload } from '@/types/aether'

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
  const runs = useStore($cronRuns)
  const runsStatus = useStore($cronRunsStatus)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if ($cronJobsStatus.get() === 'idle') { void loadCronJobs() }
    void loadCronDeliveryTargets()
  }, [])

  useCronPoll()

  const handleCreate = (payload: CronJobCreatePayload) => {
    void cronStore.createCronJobAction(payload)
    setShowForm(false)
  }

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="text-[22px] font-semibold leading-tight text-white">Tác vụ định kỳ</div>
        <div className="flex items-center gap-3">
          <div className="text-[12px] text-[color:var(--ae-dim)]">{jobs?.length ?? 0} tác vụ</div>
          <button
            className="rounded-[10px] border border-[color:var(--ae-azure-soft)] px-3 py-1.5 text-[12px] text-[color:var(--ae-azure-soft)]"
            onClick={() => setShowForm(v => !v)}
            type="button"
          >
            {showForm ? 'Đóng' : 'Tạo tác vụ'}
          </button>
        </div>
      </div>

      <div className="z-[2] mt-4 flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
        {showForm && <CronForm onCancel={() => setShowForm(false)} onSubmit={handleCreate} />}

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
                    <button className="truncate text-left text-[13.5px] font-semibold text-white" onClick={() => void cronStore.loadCronRuns(job.id)} type="button">
                      {jobTitle(job)}
                    </button>
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
                <div className="flex flex-none items-center gap-1.5">
                  {state === 'paused' ? (
                    <button
                      aria-label="Tiếp tục"
                      className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-ok)]"
                      onClick={() => void cronStore.resumeCronJobAction(job.id)}
                      type="button"
                    >
                      Tiếp tục
                    </button>
                  ) : (
                    <button
                      aria-label="Tạm dừng"
                      className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-warn)]"
                      onClick={() => void cronStore.pauseCronJobAction(job.id)}
                      type="button"
                    >
                      Tạm dừng
                    </button>
                  )}
                  <button
                    aria-label="Chạy ngay"
                    className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-azure-soft)]"
                    onClick={() => void cronStore.triggerCronJobAction(job.id)}
                    type="button"
                  >
                    Chạy ngay
                  </button>
                  <button
                    aria-label="Xóa"
                    className="rounded-[9px] px-2.5 py-1 text-[11px] text-[color:var(--ae-dim)] hover:text-[color:var(--ae-warn)]"
                    onClick={() => void cronStore.deleteCronJobAction(job.id)}
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </GlassSlab>
            )
          })}

        {runsStatus !== 'idle' && (
          <GlassSlab className="flex flex-col gap-2" size="sm">
            <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">LỊCH SỬ CHẠY</div>
            {runsStatus === 'loading' && <div className="text-[11px] text-[color:var(--ae-dim)]">Đang tải…</div>}
            {runsStatus === 'empty' && <div className="text-[11px] text-[color:var(--ae-dim)]">Chưa có lần chạy nào.</div>}
            {runsStatus === 'error' && <div className="text-[11px] text-[color:var(--ae-warn)]">Không tải được lịch sử.</div>}
            {runsStatus === 'ready' &&
              (runs ?? []).map(run => (
                <div className="flex items-center justify-between text-[11px]" key={run.id}>
                  <span className="truncate text-[#D7ECFA]">{run.title ?? run.id}</span>
                  <span className="flex-none text-[color:var(--ae-dim)]">
                    {run.is_active ? 'đang chạy' : `${run.message_count} tin`} · {formatTime(new Date(run.started_at * 1000).toISOString())}
                  </span>
                </div>
              ))}
          </GlassSlab>
        )}
      </div>
    </div>
  )
}
