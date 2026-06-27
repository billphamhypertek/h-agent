import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { isProviderSetupErrorMessage } from '@/lib/provider-setup-errors'
// The SPIED store actions must be reached through a namespace import so
// `vi.spyOn(onboarding, 'dismissFirstRunOnboarding')` intercepts the call site.
// We route every store action + the atom through the same namespace for
// consistency. Constants are pulled in by name (never spied).
import * as onboarding from '@/store/onboarding'
import { DEFAULT_MANUAL_ONBOARDING_REASON, DEFAULT_ONBOARDING_REASON } from '@/store/onboarding'
import type { OAuthProvider } from '@/types/aether'

// Restyled provider ordering — mirrors the legacy overlay's PROVIDER_DISPLAY so
// Nous anchors the top of the list and the Anthropic paths sink to the bottom.
const PROVIDER_DISPLAY: Record<string, { order: number; title: string }> = {
  nous: { order: 0, title: 'Nous Portal' },
  'openai-codex': { order: 1, title: 'OpenAI OAuth (ChatGPT)' },
  'minimax-oauth': { order: 2, title: 'MiniMax' },
  'qwen-oauth': { order: 3, title: 'Qwen Code' },
  'xai-oauth': { order: 4, title: 'xAI Grok' },
  anthropic: { order: 5, title: 'Anthropic API Key' },
  'claude-code': { order: 6, title: 'Anthropic OAuth: Required Extra Usage Credits to Use Subscription' },
}

const FEATURED_ID = 'nous'

const providerTitle = (p: OAuthProvider) => PROVIDER_DISPLAY[p.id]?.title ?? p.name
const orderOf = (p: OAuthProvider) => PROVIDER_DISPLAY[p.id]?.order ?? 99

const sortProviders = (providers: OAuthProvider[]) =>
  [...providers].sort((a, b) => orderOf(a) - orderOf(b) || a.name.localeCompare(b.name))

// Curated API-key providers (static — no network catalog in the onboarding
// scaffold). Each carries the env var the store writes plus a docs link.
interface ApiKeyOption {
  docsUrl: string
  envKey: string
  id: string
  name: string
  placeholder?: string
}

const API_KEY_OPTIONS: ApiKeyOption[] = [
  { id: 'openrouter', name: 'OpenRouter', envKey: 'OPENROUTER_API_KEY', docsUrl: 'https://openrouter.ai/keys' },
  { id: 'openai', name: 'OpenAI', envKey: 'OPENAI_API_KEY', docsUrl: 'https://platform.openai.com/api-keys' },
  { id: 'gemini', name: 'Google Gemini', envKey: 'GEMINI_API_KEY', docsUrl: 'https://aistudio.google.com/app/apikey' },
  { id: 'xai', name: 'xAI Grok', envKey: 'XAI_API_KEY', docsUrl: 'https://console.x.ai/' },
  {
    id: 'local',
    name: 'Local / custom endpoint',
    envKey: 'OPENAI_BASE_URL',
    docsUrl: 'https://github.com/NousResearch/hermes-agent#bring-your-own-endpoint',
    placeholder: 'http://127.0.0.1:8000/v1',
  },
]

const ROW_CLASS =
  'group flex w-full items-center justify-between gap-3 rounded-[10px] border border-[rgba(120,200,255,.18)] bg-[rgba(120,200,255,.05)] p-[10px_14px] text-left transition-colors hover:bg-[rgba(120,200,255,.1)]'

export function AetherOnboarding({
  enabled,
  onCompleted,
  requestGateway,
}: {
  enabled: boolean
  onCompleted?: () => void
  requestGateway: onboarding.OnboardingContext['requestGateway']
}) {
  const state = useStore(onboarding.$desktopOnboarding)
  const ctxRef = useRef<onboarding.OnboardingContext>({ requestGateway, onCompleted })
  ctxRef.current = { requestGateway, onCompleted }

  const ctx = useMemo<onboarding.OnboardingContext>(
    () => ({
      requestGateway: (...args) => ctxRef.current.requestGateway(...args),
      onCompleted: () => ctxRef.current.onCompleted?.(),
    }),
    [],
  )

  useEffect(() => {
    if (enabled || state.requested) {
      void onboarding.refreshOnboarding(ctx)
    }
  }, [ctx, enabled, state.requested])

  // Gate logic — mirrors legacy overlay lines 273–301 verbatim.
  if (state.configured === true && !state.manual) {
    return null
  }

  if (state.firstRunSkipped && !state.manual) {
    return null
  }

  const { flow } = state
  const ready = state.manual || (enabled && state.configured === false)
  const showPicker = flow.status === 'idle' || flow.status === 'success'

  // Only surface a meaningful, caller-supplied reason — suppress the generic
  // defaults and provider-setup errors (those belong to the flow, not a banner).
  const rawReason = state.reason?.trim() || null

  const reason =
    rawReason &&
    !isProviderSetupErrorMessage(rawReason) &&
    rawReason !== DEFAULT_ONBOARDING_REASON &&
    rawReason !== DEFAULT_MANUAL_ONBOARDING_REASON
      ? rawReason
      : null

  return (
    <div
      className="fixed inset-0 z-[1300] grid place-items-center p-[var(--ae-page-t)_var(--ae-page-x)]"
      data-aether-theme="aether"
      data-testid="ae-onboarding"
    >
      <div className="ae-shell-bg" />
      <GlassSlab className="relative z-[1] w-full max-w-[46rem]" size="lg">
        <div className="mb-4 flex items-center gap-3">
          <LivingOrb label="AETHER" size={64} state="idle" />
          <div>
            <h2 className="font-[family-name:var(--ae-font-display)] text-[18px] tracking-[.12em] text-white">
              HYPERTEK · AGENT PLATFORM
            </h2>
            <p className="text-[12.5px] text-[color:var(--ae-dim)]">
              Thiết lập nhà cung cấp suy luận để bắt đầu.
            </p>
          </div>
        </div>

        {reason ? (
          <div className="mb-3 rounded-[12px] border border-[rgba(120,200,255,.25)] p-3 text-[12.5px] text-[color:var(--ae-dim)]">
            {reason}
          </div>
        ) : null}

        {ready ? (
          showPicker ? (
            <PickerView ctx={ctx} />
          ) : (
            <FlowPlaceholder />
          )
        ) : (
          <PreparingView />
        )}

        <div className="mt-4 flex justify-center border-t border-[rgba(120,200,255,.16)] pt-3">
          {state.manual ? (
            <button
              className="text-[12px] text-[color:var(--ae-dim)] underline"
              onClick={() => onboarding.closeManualOnboarding()}
              type="button"
            >
              Đóng
            </button>
          ) : (
            <button
              className="text-[12px] text-[color:var(--ae-dim)] underline"
              data-testid="ae-onboarding-skip"
              onClick={() => onboarding.dismissFirstRunOnboarding()}
              type="button"
            >
              Bỏ qua, để sau
            </button>
          )}
        </div>
      </GlassSlab>
    </div>
  )
}

// Readiness placeholder while the runtime check resolves (configured === null).
function PreparingView() {
  return (
    <div className="grid place-items-center gap-2 py-6 text-center" role="status">
      <LivingOrb label="Đang chuẩn bị" size={48} state="thinking" />
      <p className="text-[12.5px] text-[color:var(--ae-dim)]">Đang kiểm tra môi trường…</p>
    </div>
  )
}

// Non-idle/non-success flow states (starting, polling, awaiting_*, error,
// confirming_model) are restyled in Task 2's FlowPanel. Until then, keep the
// scaffold honest with a neutral waiting state rather than a blank panel.
function FlowPlaceholder() {
  return (
    <div className="grid place-items-center gap-2 py-6 text-center" role="status">
      <LivingOrb label="Đang đăng nhập" size={48} state="thinking" />
      <p className="text-[12.5px] text-[color:var(--ae-dim)]">Đang xử lý đăng nhập…</p>
    </div>
  )
}

// Restyled legacy Picker (overlay lines 431+). Provider rows launch OAuth; the
// "Dùng API key" affordance flips to the key form; ApiKeyForm saves via the
// store. Bindings are fixed by the brief — only the chrome is re-skinned.
function PickerView({ ctx }: { ctx: onboarding.OnboardingContext }) {
  const { localEndpoint, mode, providers } = useStore(onboarding.$desktopOnboarding)
  const [showAll, setShowAll] = useState(false)
  const ordered = useMemo(() => (providers ? sortProviders(providers) : []), [providers])
  const hasOauth = ordered.length > 0

  // localEndpoint / explicit apikey mode / no OAuth providers → the key form.
  if (localEndpoint || mode === 'apikey' || !hasOauth) {
    return (
      <ApiKeyForm
        canGoBack={hasOauth && !localEndpoint}
        initialEnvKey={localEndpoint ? 'OPENAI_BASE_URL' : undefined}
        onBack={() => onboarding.setOnboardingMode('oauth')}
        onSave={(envKey, value, name, apiKey) =>
          onboarding.saveOnboardingApiKey(envKey, value, name, ctx, apiKey)
        }
      />
    )
  }

  if (providers === null) {
    return (
      <div className="grid place-items-center gap-2 py-6 text-center" role="status">
        <LivingOrb label="Đang tải" size={48} state="thinking" />
        <p className="text-[12.5px] text-[color:var(--ae-dim)]">Đang tìm nhà cung cấp…</p>
      </div>
    )
  }

  const select = (p: OAuthProvider) => void onboarding.startProviderOAuth(p, ctx)
  const featured = ordered.find(p => p.id === FEATURED_ID) ?? null
  const rest = featured ? ordered.filter(p => p.id !== FEATURED_ID) : ordered
  const collapsible = Boolean(featured) && rest.length > 0
  const showRest = !collapsible || showAll

  return (
    <div className="grid gap-2">
      <div className="grid max-h-[60dvh] gap-2 overflow-y-auto p-1">
        {featured ? <ProviderRow featured onSelect={select} provider={featured} /> : null}
        {showRest ? (
          <>
            {rest.map(p => (
              <ProviderRow key={p.id} onSelect={select} provider={p} />
            ))}
            <button className={ROW_CLASS} onClick={() => onboarding.setOnboardingMode('apikey')} type="button">
              <div className="min-w-0">
                <span className="text-[13px] font-semibold text-white">OpenRouter</span>
                <p className="mt-0.5 text-[11.5px] text-[color:var(--ae-dim)]">
                  Dán API key để truy cập hàng trăm mô hình.
                </p>
              </div>
              <span aria-hidden className="text-[color:var(--ae-azure-soft)]">→</span>
            </button>
          </>
        ) : null}
      </div>

      {collapsible ? (
        <button
          className="mt-1 self-center text-[12px] font-medium text-[color:var(--ae-azure-soft)]"
          onClick={() => setShowAll(v => !v)}
          type="button"
        >
          {showAll ? 'Thu gọn' : 'Nhà cung cấp khác'}
        </button>
      ) : null}

      <div className="flex items-center justify-end pt-1">
        <button
          className="text-[12px] font-medium text-[color:var(--ae-azure-soft)]"
          onClick={() => onboarding.setOnboardingMode('apikey')}
          type="button"
        >
          Dùng API key
        </button>
      </div>
    </div>
  )
}

function ProviderRow({
  featured,
  onSelect,
  provider,
}: {
  featured?: boolean
  onSelect: (provider: OAuthProvider) => void
  provider: OAuthProvider
}) {
  const loggedIn = provider.status?.logged_in

  return (
    <button
      className={
        featured
          ? 'group flex w-full items-center justify-between gap-4 rounded-[12px] border border-[rgba(120,200,255,.35)] bg-[rgba(120,200,255,.08)] p-[12px_16px] text-left transition-colors hover:bg-[rgba(120,200,255,.14)]'
          : ROW_CLASS
      }
      onClick={() => onSelect(provider)}
      type="button"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-white">{providerTitle(provider)}</span>
          {loggedIn ? (
            <span className="rounded-[6px] bg-[rgba(120,200,255,.16)] px-2 py-0.5 text-[10.5px] font-medium text-[color:var(--ae-azure-soft)]">
              Đã kết nối
            </span>
          ) : featured ? (
            <span className="rounded-[6px] bg-[color:var(--ae-azure)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[.16em] text-[#06121f]">
              Đề xuất
            </span>
          ) : null}
        </div>
        {featured ? (
          <p className="mt-1 text-[11.5px] text-[color:var(--ae-dim)]">
            Đăng nhập một lần — truy cập trọn bộ mô hình của Nous.
          </p>
        ) : null}
      </div>
      <span aria-hidden className="text-[color:var(--ae-azure-soft)]">→</span>
    </button>
  )
}

// Restyled legacy ApiKeyForm. Presentational — onboarding feeds it a ctx-bound
// save (see PickerView). Keeps the curated option grid + a single entry field.
function ApiKeyForm({
  canGoBack,
  initialEnvKey,
  onBack,
  onSave,
}: {
  canGoBack: boolean
  initialEnvKey?: string
  onBack: () => void
  onSave: (
    envKey: string,
    value: string,
    name: string,
    apiKey?: string,
  ) => Promise<{ message?: string; ok: boolean }>
}) {
  const [option, setOption] = useState<ApiKeyOption>(
    () => API_KEY_OPTIONS.find(o => o.envKey === initialEnvKey) ?? API_KEY_OPTIONS[0],
  )

  const [value, setValue] = useState('')
  const [localKey, setLocalKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const isLocal = option.envKey === 'OPENAI_BASE_URL'
  const canSave = value.trim().length >= 1

  const pick = (o: ApiKeyOption) => {
    setOption(o)
    setValue('')
    setLocalKey('')
    setError(null)
  }

  const submit = async () => {
    if (!canSave || saving) {
      return
    }

    setSaving(true)
    setError(null)
    const result = await onSave(option.envKey, value, option.name, isLocal ? localKey : undefined)

    if (result.ok) {
      setValue('')
      setLocalKey('')
    } else {
      setError(result.message ?? 'Không lưu được. Hãy thử lại.')
    }

    setSaving(false)
  }

  return (
    <div className="grid gap-3">
      {canGoBack ? (
        <button
          className="-mt-1 self-start text-[12px] font-medium text-[color:var(--ae-azure-soft)]"
          onClick={onBack}
          type="button"
        >
          ← Quay lại đăng nhập
        </button>
      ) : null}

      <div className="grid max-h-[42dvh] gap-2 overflow-y-auto p-1 sm:grid-cols-2">
        {API_KEY_OPTIONS.map(o => (
          <button
            className={
              option.envKey === o.envKey
                ? 'rounded-[10px] border border-[rgba(120,200,255,.45)] bg-[rgba(120,200,255,.08)] p-3 text-left'
                : 'rounded-[10px] border border-[rgba(120,200,255,.14)] bg-[rgba(120,200,255,.03)] p-3 text-left transition-colors hover:bg-[rgba(120,200,255,.07)]'
            }
            key={o.envKey}
            onClick={() => pick(o)}
            type="button"
          >
            <span className="text-[12.5px] font-medium text-white">{o.name}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <input
          autoComplete="off"
          className="rounded-[10px] border border-[rgba(120,200,255,.22)] bg-[rgba(8,18,32,.5)] p-[9px_12px] font-mono text-[13px] text-white outline-none focus:border-[rgba(120,200,255,.5)]"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void submit()}
          placeholder={isLocal ? option.placeholder || 'http://127.0.0.1:8000/v1' : 'Dán API key'}
          type={isLocal ? 'text' : 'password'}
          value={value}
        />
        {isLocal ? (
          <input
            autoComplete="off"
            className="rounded-[10px] border border-[rgba(120,200,255,.22)] bg-[rgba(8,18,32,.5)] p-[9px_12px] font-mono text-[13px] text-white outline-none focus:border-[rgba(120,200,255,.5)]"
            onChange={e => setLocalKey(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && void submit()}
            placeholder="API key (không bắt buộc)"
            type="password"
            value={localKey}
          />
        ) : null}
        {error ? <p className="text-[11.5px] text-[color:var(--ae-error)]">{error}</p> : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        {option.docsUrl ? (
          <a
            className="text-[12px] text-[color:var(--ae-azure-soft)] underline"
            href={option.docsUrl}
            rel="noreferrer"
            target="_blank"
          >
            Lấy key
          </a>
        ) : (
          <span />
        )}
        <button
          className="rounded-[10px] border border-[rgba(120,200,255,.35)] p-[8px_18px] text-[13px] font-semibold text-white disabled:opacity-50"
          disabled={!canSave || saving}
          onClick={() => void submit()}
          type="button"
        >
          {saving ? 'Đang kết nối…' : 'Kết nối'}
        </button>
      </div>
    </div>
  )
}
