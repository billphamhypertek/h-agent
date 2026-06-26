import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import {
  $activeProfile,
  $modelOptions,
  $profiles,
  $profilesStatus,
  $profileSetup,
  $profileSoul,
  $profileSoulStatus,
  loadProfiles
} from '@/aether/domain/profiles/profiles-store'
// NOTE: mutation actions are called via this namespace import (not named
// bindings) so the screen tests can `vi.spyOn(store, 'createProfileAction'…)`
// and have the button clicks hit the spies. Same pattern as Cron/Agents.
import * as profilesStore from '@/aether/domain/profiles/profiles-store'
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
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const soul = useStore($profileSoul)
  const soulStatus = useStore($profileSoulStatus)
  const [soulDraft, setSoulDraft] = useState('')
  const modelOptions = useStore($modelOptions)
  const setup = useStore($profileSetup)
  const [modelChoice, setModelChoice] = useState('')

  useEffect(() => {
    if ($profilesStatus.get() === 'idle') { void loadProfiles() }
    void profilesStore.loadModelOptions()
  }, [])

  const rows: ProfileInfo[] = profiles ?? []
  const selectedName = selected ?? active

  useEffect(() => {
    if (selectedName) {
      void profilesStore.loadProfileSoul(selectedName)
      void profilesStore.loadProfileSetup(selectedName)
      setModelChoice('')
    }
  }, [selectedName])

  useEffect(() => {
    setSoulDraft(soul?.content ?? '')
  }, [soul])

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

          <div className="mb-2.5">
            <button
              className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
              onClick={() => setCreating(v => !v)}
              type="button"
            >
              Tạo hồ sơ
            </button>
            {creating && (
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                  data-testid="ae-new-profile-name"
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Tên hồ sơ mới"
                  value={newName}
                />
                <button
                  className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                  disabled={!newName.trim()}
                  onClick={async () => {
                    await profilesStore.createProfileAction(newName.trim())
                    setNewName('')
                    setCreating(false)
                  }}
                  type="button"
                >
                  Tạo
                </button>
              </div>
            )}
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
          <div className="mt-2 flex flex-col gap-3 overflow-auto">
            <div className="text-[13px] font-semibold text-white">
              {selectedName ? `Hồ sơ: ${selectedName}` : 'Chọn một hồ sơ để xem chi tiết.'}
            </div>

            {selectedName && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                  onClick={() => { setRenaming(v => !v); setRenameValue(selectedName) }}
                  type="button"
                >
                  Đổi tên
                </button>
                <button
                  className="rounded-[9px] border border-[rgba(255,176,32,.4)] px-3 py-1.5 text-[12px] text-[color:var(--ae-warn)]"
                  onClick={() => setConfirmingDelete(true)}
                  type="button"
                >
                  Xoá
                </button>
              </div>
            )}

            {selectedName && renaming && (
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                  data-testid="ae-rename-profile-name"
                  onChange={e => setRenameValue(e.target.value)}
                  value={renameValue}
                />
                <button
                  className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                  disabled={!renameValue.trim() || renameValue.trim() === selectedName}
                  onClick={async () => {
                    await profilesStore.renameProfileAction(selectedName, renameValue.trim())
                    setSelected(renameValue.trim())
                    setRenaming(false)
                  }}
                  type="button"
                >
                  Lưu tên
                </button>
              </div>
            )}

            {selectedName && confirmingDelete && (
              <div className="flex flex-col gap-2 rounded-[11px] border border-[rgba(255,176,32,.3)] p-2.5">
                <span className="text-[12px] text-[color:var(--ae-warn)]">
                  Xoá hồ sơ "{selectedName}"? Hành động này không thể hoàn tác.
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded-[9px] bg-[var(--ae-warn)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                    onClick={async () => {
                      await profilesStore.deleteProfileAction(selectedName)
                      setSelected(null)
                      setConfirmingDelete(false)
                    }}
                    type="button"
                  >
                    Xác nhận xoá
                  </button>
                  <button
                    className="rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                    onClick={() => setConfirmingDelete(false)}
                    type="button"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}

            {selectedName && selectedName !== active && (
              <button
                className="self-start rounded-[9px] border border-[rgba(120,210,255,.34)] px-3 py-1.5 text-[12px] text-white"
                onClick={() => void profilesStore.setActiveProfileAction(selectedName)}
                type="button"
              >
                Đặt làm mặc định
              </button>
            )}

            {selectedName && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  MODEL CHO HỒ SƠ
                </span>
                <div className="flex gap-2">
                  <select
                    className="min-w-0 flex-1 rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] px-2.5 py-1.5 text-[12px] text-white"
                    data-testid="ae-model-select"
                    onChange={e => setModelChoice(e.target.value)}
                    value={modelChoice}
                  >
                    <option value="">Chọn model…</option>
                    {(modelOptions?.providers ?? []).flatMap(provider =>
                      (provider.models ?? []).map(m => (
                        <option key={`${provider.slug}::${m}`} value={`${provider.slug}::${m}`}>
                          {provider.name} · {m}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    className="rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                    disabled={!modelChoice}
                    onClick={() => {
                      const [provider, model] = modelChoice.split('::')
                      if (provider && model) { void profilesStore.setProfileModelAction(selectedName, provider, model) }
                    }}
                    type="button"
                  >
                    Lưu model
                  </button>
                </div>
              </div>
            )}

            {selectedName && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  SOUL (BỐI CẢNH)
                </span>
                {soulStatus === 'loading' && (
                  <div className="h-[120px] animate-pulse rounded-[11px] bg-[rgba(120,195,245,.06)]" />
                )}
                {soulStatus === 'error' && (
                  <span className="text-[12px] text-[color:var(--ae-warn)]">Không tải được soul.</span>
                )}
                {soulStatus === 'ready' && (
                  <>
                    <textarea
                      className="min-h-[120px] w-full resize-y rounded-[11px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] p-2.5 text-[12px] leading-[1.5] text-white"
                      data-testid="ae-soul-editor"
                      onChange={e => setSoulDraft(e.target.value)}
                      value={soulDraft}
                    />
                    <button
                      className="self-start rounded-[9px] bg-[var(--ae-azure)] px-3 py-1.5 text-[12px] font-semibold text-[#06283c]"
                      disabled={soulDraft === (soul?.content ?? '')}
                      onClick={() => void profilesStore.saveProfileSoul(selectedName, soulDraft)}
                      type="button"
                    >
                      Lưu soul
                    </button>
                  </>
                )}
              </div>
            )}

            {selectedName && setup && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">
                  LỆNH THIẾT LẬP
                </span>
                <code className="block overflow-auto rounded-[9px] border border-[rgba(120,200,255,.2)] bg-[rgba(8,30,60,.5)] p-2.5 text-[11.5px] text-[#CFE2F7]">
                  {setup.command}
                </code>
              </div>
            )}
          </div>
        </GlassSlab>
      </div>
    </div>
  )
}
