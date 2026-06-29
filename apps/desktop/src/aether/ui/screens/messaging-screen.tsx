import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'

import { $platforms, $platformsStatus, loadPlatforms } from '@/aether/domain/messaging/messaging-store'
import * as messagingStore from '@/aether/domain/messaging/messaging-store'
// Namespace import so screen tests can vi.spyOn(tgStore, 'startTelegramOnboarding')
// and vi.spyOn(tgStore, 'stopTelegramPoll') and have the panel + screen-level
// poll-guard cleanup go through the intercepted bindings.
import * as tgStore from '@/aether/domain/messaging/telegram-onboarding-store'
import { $telegramOnboarding } from '@/aether/domain/messaging/telegram-onboarding-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'
import type { MessagingPlatformInfo, MessagingPlatformTestResponse } from '@/types/aether'

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

function PlatformConfig({ platform }: { platform: MessagingPlatformInfo }) {
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [testResult, setTestResult] = useState<MessagingPlatformTestResponse | null>(null)
  const [testing, setTesting] = useState(false)

  const trimmed = Object.fromEntries(
    Object.entries(edits).map(([k, v]) => [k, v.trim()]).filter(([, v]) => v)
  )

  const hasEdits = Object.keys(trimmed).length > 0

  async function onSave() {
    if (!hasEdits) { return }

    setSaving(true)

    try {
      await messagingStore.updatePlatform(platform.id, { env: trimmed })
      setEdits({})
    } finally {
      setSaving(false)
    }
  }

  async function onTest() {
    setTesting(true)

    try {
      setTestResult(await messagingStore.testPlatform(platform.id))
    } catch {
      setTestResult({ ok: false, state: null, message: 'Kiểm tra thất bại.' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {platform.error_message && (
        <div className="rounded-[10px] px-2.5 py-1.5 text-[11px]" style={{ border: '1px solid var(--ae-warn)', color: 'var(--ae-warn)' }}>
          {platform.error_message}
        </div>
      )}
      {platform.env_vars.map(field => {
        const fieldId = `ae-msg-${platform.id}-${field.key}`

        return (
          <label className="flex flex-col gap-1" htmlFor={fieldId} key={field.key}>
            <span className="text-[11px] font-semibold text-[color:var(--ae-ink)]">
              {field.prompt || field.key}
              {field.required && <span style={{ color: 'var(--ae-warn)' }}> *</span>}
            </span>
            <input
              aria-label={field.prompt || field.key}
              className="rounded-[9px] bg-[var(--ae-well)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)] outline-none"
              id={fieldId}
              onChange={event => setEdits(current => ({ ...current, [field.key]: event.target.value }))}
              placeholder={field.is_set ? field.redacted_value ?? 'Đã lưu — nhập để thay thế' : field.prompt}
              style={{ border: '1px solid var(--ae-line)' }}
              type={field.is_password ? 'password' : 'text'}
              value={edits[field.key] ?? ''}
            />
          </label>
        )
      })}
      {testResult && (
        <div className="text-[11px]" style={{ color: testResult.ok ? 'var(--ae-ok)' : 'var(--ae-warn)' }}>
          {testResult.message}
        </div>
      )}
      <div className="flex items-center justify-end gap-2">
        <button
          className="rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
          disabled={testing}
          onClick={() => void onTest()}
          style={{ border: '1px solid var(--ae-line-strong)' }}
          type="button"
        >
          {testing ? 'Đang kiểm tra…' : 'Kiểm tra kết nối'}
        </button>
        <button
          className="rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
          disabled={!hasEdits || saving}
          onClick={() => void onSave()}
          style={{ background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))', border: '1px solid var(--ae-line-strong)' }}
          type="button"
        >
          {saving ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  )
}

function TelegramPairingPanel({ onApplied }: { onApplied: () => void }) {
  const state = useStore($telegramOnboarding)
  const [allowedIds, setAllowedIds] = useState<string[]>([])
  const [newId, setNewId] = useState('')

  // Poll guard: ensure any in-flight light poll is cleared if the panel
  // unmounts (platform deselected / screen left). REST-only, no socket.
  // Goes through the namespace so screen tests can spy on stopTelegramPoll.
  useEffect(() => () => tgStore.stopTelegramPoll(), [])

  useEffect(() => {
    if (state.fsm === 'done' && state.ownerId && allowedIds.length === 0) {
      setAllowedIds([state.ownerId])
    }
  }, [state.fsm, state.ownerId])

  function addId() {
    const trimmed = newId.trim()

    if (!/^\d+$/.test(trimmed)) { return }

    setAllowedIds(ids => (ids.includes(trimmed) ? ids : [...ids, trimmed]))
    setNewId('')
  }

  async function apply() {
    if (allowedIds.length === 0) { return }

    await tgStore.applyTelegramOnboarding(allowedIds)
    onApplied()
  }

  return (
    <div className="mt-2 flex flex-col gap-2.5 border-t border-[color:var(--ae-line)] pt-2.5">
      <div className="text-[11px] font-semibold tracking-[.14em] text-[color:var(--ae-azure-soft)]">
        GHÉP NỐI QR
      </div>

      {(state.fsm === 'idle' || state.fsm === 'error') && (
        <>
          {state.error && <div className="text-[11px]" style={{ color: 'var(--ae-warn)' }}>{state.error}</div>}
          <button
            className="self-start rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold"
            onClick={() => void tgStore.startTelegramOnboarding()}
            style={{ background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))', border: '1px solid var(--ae-line-strong)' }}
            type="button"
          >
            Ghép nối bằng QR
          </button>
        </>
      )}

      {state.fsm === 'starting' && <div className="text-[11.5px] text-[color:var(--ae-dim)]">Đang khởi tạo…</div>}

      {state.fsm === 'pending' && state.setup && (
        <div className="flex flex-col gap-2">
          <div className="text-[11.5px] text-[color:var(--ae-dim)]">
            Mở liên kết này trên điện thoại để ghép nối, đang chờ xác nhận…
          </div>
          <a className="break-all text-[11px] text-[color:var(--ae-azure-soft)] underline" href={state.setup.deep_link} rel="noreferrer" target="_blank">
            {state.setup.deep_link}
          </a>
          <button
            className="self-start rounded-[10px] px-[12px] py-[6px] text-[11.5px] font-semibold"
            onClick={() => void tgStore.cancelTelegramOnboarding()}
            style={{ border: '1px solid var(--ae-line-strong)' }}
            type="button"
          >
            Hủy
          </button>
        </div>
      )}

      {state.fsm === 'done' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11.5px]" style={{ color: 'var(--ae-ok)' }}>
            Đã ghép nối{state.botUsername ? ` với @${state.botUsername}` : ''}.
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {allowedIds.map(id => (
              <span className="rounded-full px-2 py-0.5 text-[11px]" key={id} style={{ border: '1px solid var(--ae-line-strong)' }}>{id}</span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="rounded-[9px] bg-[var(--ae-well)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)] outline-none"
              onChange={event => setNewId(event.target.value)}
              placeholder="ID người dùng được phép"
              style={{ border: '1px solid var(--ae-line)' }}
              value={newId}
            />
            <button
              className="rounded-[10px] px-[12px] py-[7px] text-[12px] font-semibold"
              onClick={addId}
              style={{ border: '1px solid var(--ae-line-strong)' }}
              type="button"
            >
              Thêm
            </button>
          </div>
          <button
            className="self-start rounded-[10px] px-[14px] py-[7px] text-[12px] font-semibold disabled:opacity-50"
            disabled={allowedIds.length === 0}
            onClick={() => void apply()}
            style={{ background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))', border: '1px solid var(--ae-line-strong)' }}
            type="button"
          >
            Hoàn tất ghép nối
          </button>
        </div>
      )}
    </div>
  )
}

export function MessagingScreen() {
  const platforms = useStore($platforms)
  const status = useStore($platformsStatus)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    if ($platformsStatus.get() === 'idle') { void loadPlatforms() }
  }, [])

  // Screen-level poll guard: clear any in-flight Telegram pairing poll when the
  // Messaging screen unmounts, even if the Telegram detail panel was never
  // expanded. Routed through the namespace so tests can spy on stopTelegramPoll.
  useEffect(() => () => tgStore.stopTelegramPoll(), [])

  return (
    <div className="ae-screen-bare flex h-full min-w-0 flex-col">
      <div className="ae-grid-floor" />
      <div className="ae-vignette" />

      <div className="z-[2] mt-[18px] flex flex-col gap-[6px]">
        <div className="text-[24px] font-semibold leading-[1.05]">Nhắn tin</div>
        <div className="text-[12.5px] text-[color:var(--ae-ink)]">Kết nối AETHER với các nền tảng nhắn tin của bạn</div>
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
              style={{ background: 'linear-gradient(180deg,var(--ae-fill-strong),var(--ae-fill))', border: '1px solid var(--ae-line-strong)' }}
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
                <div className="text-[14px] font-semibold text-[color:var(--ae-ink)]">{platform.name}</div>
                <div className="truncate text-[11.5px] text-[color:var(--ae-dim)]">{platform.description}</div>
              </div>
              <StatusBadge platform={platform} />
            </button>
            {selectedId === platform.id && (
              <div className="border-t border-[color:var(--ae-line)] pt-2 text-[11.5px] text-[color:var(--ae-dim)]" data-testid="ae-messaging-detail">
                <PlatformConfig platform={platform} />
                {platform.id === 'telegram' && <TelegramPairingPanel onApplied={() => void loadPlatforms()} />}
              </div>
            )}
          </GlassSlab>
        ))}
      </div>
    </div>
  )
}
