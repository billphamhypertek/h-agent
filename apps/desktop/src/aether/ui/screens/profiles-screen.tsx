import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $activeProfile,
  $profiles,
  $profilesStatus,
  loadProfiles
} from '@/aether/domain/profiles/profiles-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { ProfileInfo } from '@/types/aether'

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" data-testid="ae-profiles-skeleton">
      {[0, 1, 2].map(i => (
        <div className="h-[58px] animate-pulse rounded-[13px] bg-[rgba(120,195,245,.06)]" key={i} />
      ))}
    </div>
  )
}

export function ProfilesScreen() {
  const profiles = useStore($profiles)
  const status = useStore($profilesStatus)
  const active = useStore($activeProfile)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    if ($profilesStatus.get() === 'idle') { void loadProfiles() }
  }, [])

  const rows: ProfileInfo[] = profiles ?? []
  const selectedName = selected ?? active

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex items-end justify-between gap-4">
        <div className="flex flex-col gap-[7px]">
          <div className="text-[26px] font-semibold leading-[1.05]">Hồ sơ</div>
          <div className="text-[12px] text-[color:var(--ae-dim)]">
            Mỗi hồ sơ có cấu hình, model và soul riêng.
          </div>
        </div>
      </div>

      <div className="z-[2] mt-4 grid min-h-0 flex-1 grid-cols-[1fr_1.2fr] gap-3.5">
        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="mb-[11px] flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
              DANH SÁCH HỒ SƠ
            </span>
          </div>

          {status === 'loading' && <ProfileSkeleton />}

          {status === 'error' && (
            <div className="flex flex-col items-start gap-2 text-[12.5px] text-[color:var(--ae-warn)]">
              <span>Không tải được danh sách hồ sơ.</span>
              <button
                className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                onClick={() => void loadProfiles()}
                type="button"
              >
                Thử lại
              </button>
            </div>
          )}

          {status === 'empty' && (
            <div className="text-[12.5px] text-[color:var(--ae-dim)]">
              Chưa có hồ sơ nào. Tạo hồ sơ đầu tiên để bắt đầu.
            </div>
          )}

          {status === 'ready' && (
            <div className="flex min-h-0 flex-col gap-2.5 overflow-auto">
              {rows.map(p => {
                const isActive = p.name === active
                const isSelected = p.name === selectedName

                return (
                  <button
                    className="flex items-center gap-[11px] rounded-[13px] p-[11px_13px] text-left"
                    data-active={isActive ? 'true' : 'false'}
                    data-testid={`ae-profile-row-${p.name}`}
                    key={p.name}
                    onClick={() => setSelected(p.name)}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(160deg,rgba(74,163,255,.14),rgba(120,195,245,.04))'
                        : 'linear-gradient(160deg,rgba(120,195,245,.05),rgba(120,195,245,.01))',
                      border: `1px solid ${isSelected ? 'rgba(120,210,255,.4)' : 'rgba(120,200,255,.1)'}`
                    }}
                    type="button"
                  >
                    <span
                      className="h-[7px] w-[7px] flex-none rounded-full"
                      style={{
                        background: isActive ? 'var(--ae-ok)' : 'var(--ae-dim)',
                        boxShadow: isActive ? '0 0 8px var(--ae-ok)' : 'none'
                      }}
                    />
                    <span className="min-w-0 flex-1" data-testid="ae-profile-row">
                      <span className="block truncate text-[13px] font-semibold text-white">{p.name}</span>
                      <span className="block truncate text-[10.5px] text-[color:var(--ae-dim)]">
                        {p.model ? `${p.provider ?? '?'} · ${p.model}` : 'Chưa chọn model'}
                      </span>
                    </span>
                    {isActive && (
                      <span className="flex-none text-[10px] font-semibold text-[color:var(--ae-ok)]">
                        đang dùng
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </GlassSlab>

        <GlassSlab className="flex min-h-0 flex-col" size="md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
            CHI TIẾT
          </div>
          <div className="mt-2 text-[12px] text-[color:var(--ae-dim)]">
            {selectedName ? `Hồ sơ: ${selectedName}` : 'Chọn một hồ sơ để xem chi tiết.'}
          </div>
        </GlassSlab>
      </div>
    </div>
  )
}
