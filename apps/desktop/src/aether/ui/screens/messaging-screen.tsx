import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import type { MessagingPlatformInfo } from '@/types/aether'
import { $platforms, $platformsStatus, loadPlatforms } from '@/aether/domain/messaging/messaging-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

type BadgeTone = 'good' | 'warn' | 'bad' | 'muted'

function statusTone(platform: MessagingPlatformInfo): BadgeTone {
  if (!platform.enabled) { return 'muted' }

  if (platform.state === 'connected') { return 'good' }

  if (platform.state === 'fatal' || platform.state === 'startup_failed') { return 'bad' }

  return 'warn'
}

function statusLabel(platform: MessagingPlatformInfo): string {
  if (!platform.enabled) { return 'Đã tắt' }

  if (platform.state === 'connected') { return 'Đã kết nối' }

  if (platform.state === 'fatal' || platform.state === 'startup_failed') { return 'Lỗi' }

  return platform.configured ? 'Chờ khởi động lại' : 'Cần thiết lập'
}

const TONE_COLOR: Record<BadgeTone, string> = {
  good: 'var(--ae-ok)',
  warn: 'var(--ae-warn)',
  bad: 'var(--ae-bad, var(--ae-warn))',
  muted: 'var(--ae-dim)',
}

function StatusBadge({ platform }: { platform: MessagingPlatformInfo }) {
  const tone = statusTone(platform)

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
      data-testid="ae-messaging-status-badge"
      style={{ border: `1px solid ${TONE_COLOR[tone]}`, color: TONE_COLOR[tone] }}
    >
      <span className="h-[6px] w-[6px] rounded-full" style={{ background: TONE_COLOR[tone] }} />
      {statusLabel(platform)}
    </span>
  )
}

export function MessagingScreen() {
  const platforms = useStore($platforms)
  const status = useStore($platformsStatus)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if ($platformsStatus.get() === 'idle') { void loadPlatforms() }
  }, [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex flex-col gap-[6px]">
        <div className="text-[24px] font-semibold leading-[1.05]">Nhắn tin</div>
        <div className="text-[12.5px] text-[#CFE2F7]">Kết nối AETHER với các nền tảng nhắn tin của bạn</div>
      </div>

      <div className="z-[2] mt-4 flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto">
        {status === 'loading' && (
          <div className="flex flex-col gap-2.5" data-testid="ae-messaging-skeleton">
            {[0, 1, 2].map(i => (
              <div className="ae-slab h-[64px] animate-pulse" key={i} style={{ ['--ae-slab-pad' as string]: 'var(--ae-slab-pad-md)' }} />
            ))}
          </div>
        )}

        {status === 'empty' && (
          <GlassSlab className="text-center" size="lg">
            <div className="text-sm text-[color:var(--ae-dim)]">Chưa có nền tảng nhắn tin nào khả dụng.</div>
          </GlassSlab>
        )}

        {status === 'error' && (
          <GlassSlab className="flex flex-col items-center gap-3 text-center" size="lg">
            <div className="text-sm text-[color:var(--ae-warn)]">Không tải được danh sách nền tảng.</div>
            <button
              className="rounded-[11px] px-[16px] py-[8px] text-[12.5px] font-semibold"
              onClick={() => void loadPlatforms()}
              style={{ background: 'linear-gradient(180deg,rgba(74,163,255,.16),rgba(120,195,245,.05))', border: '1px solid rgba(120,210,255,.34)' }}
              type="button"
            >
              Thử lại
            </button>
          </GlassSlab>
        )}

        {status === 'ready' && (platforms ?? []).map(platform => (
          <GlassSlab className="flex flex-col gap-2" key={platform.id} size="md">
            <button
              className="flex w-full items-center justify-between gap-3 text-left"
              data-testid="ae-messaging-card"
              onClick={() => setSelectedId(current => (current === platform.id ? null : platform.id))}
              type="button"
            >
              <div className="flex min-w-0 flex-col">
                <div className="text-[14px] font-semibold text-white">{platform.name}</div>
                <div className="truncate text-[11.5px] text-[color:var(--ae-dim)]">{platform.description}</div>
              </div>
              <StatusBadge platform={platform} />
            </button>
            {selectedId === platform.id && (
              <div className="border-t border-[rgba(120,200,255,.12)] pt-2 text-[11.5px] text-[color:var(--ae-dim)]" data-testid="ae-messaging-detail">
                {/* Per-platform config form is added in Task 3. */}
              </div>
            )}
          </GlassSlab>
        ))}
      </div>
    </div>
  )
}
