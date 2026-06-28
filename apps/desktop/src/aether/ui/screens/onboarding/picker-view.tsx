import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useState } from 'react'

import { getEnvVars } from '@/aether-api'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { type ApiKeyOption, useApiKeyCatalog } from '@/components/provider-setup'
import { Check } from '@/lib/icons'
// The store actions are reached through a namespace import so `vi.spyOn` can
// intercept them at the call site. Constants/types may be named imports.
import * as onboarding from '@/store/onboarding'
import type { EnvVarInfo, OAuthProvider } from '@/types/aether'

import { FEATURED_ID, providerTitle, ROW_CLASS, sortProviders } from './shared'

// Best-effort env-state read for the onboarding key form. Mirrors
// useApiKeyCatalog's pattern (plain useEffect+useState, NO react-query) so the
// onboarding unit tests can render the screen bare — without a
// QueryClientProvider — without crashing. On failure the form simply renders
// without the "đã đặt" affordance.
function useEnvVars(): Record<string, EnvVarInfo> {
  const [env, setEnv] = useState<Record<string, EnvVarInfo>>({})

  useEffect(() => {
    let cancelled = false

    // Promise.resolve().then funnels a synchronous throw (e.g. no desktop
    // bridge in tests) into the same .catch instead of escaping.
    void Promise.resolve()
      .then(() => getEnvVars())
      .then(r => {
        if (!cancelled) {
          setEnv(r)
        }
      })
      .catch(() => {
        // Ignore — render the form without the set/redacted affordance.
      })

    return () => {
      cancelled = true
    }
  }, [])

  return env
}

// Restyled legacy Picker (overlay lines 431+). Provider rows launch OAuth; the
// "Dùng API key" affordance flips to the key form; ApiKeyForm saves via the
// store. Bindings are fixed by the brief — only the chrome is re-skinned.
export function PickerView({ ctx }: { ctx: onboarding.OnboardingContext }) {
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
  // The augmented catalog returns the curated list synchronously on first
  // render, then appends every other backend api_key provider once the async
  // fetch resolves — so `catalog[0]` is always defined.
  const catalog = useApiKeyCatalog()
  const env = useEnvVars()
  const isSet = (envKey: string) => env[envKey]?.is_set ?? false
  const redactedValue = (envKey: string) => env[envKey]?.redacted_value ?? null

  const [option, setOption] = useState<ApiKeyOption>(
    () => catalog.find(o => o.envKey === initialEnvKey) ?? catalog[0],
  )

  const [value, setValue] = useState('')
  const [localKey, setLocalKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<null | string>(null)

  const isLocal = option.envKey === 'OPENAI_BASE_URL'
  const alreadySet = isSet(option.envKey)
  // When set, surface the backend's redacted value (e.g. "sk-12…wxyz") as the
  // placeholder so the user can eyeball the current key, falling back to a
  // "replace current" hint.
  const currentRedacted = alreadySet ? (redactedValue(option.envKey) ?? null) : null
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
        {catalog.map(o => (
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
            <span className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-white">{o.name}</span>
              {isSet(o.envKey) ? (
                <Check
                  aria-label="Đã đặt"
                  className="size-3.5 text-[color:var(--ae-azure-soft)]"
                  data-testid={`ae-key-set-${o.envKey}`}
                />
              ) : null}
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        <input
          autoComplete="off"
          className="rounded-[10px] border border-[rgba(120,200,255,.22)] bg-[rgba(8,18,32,.5)] p-[9px_12px] font-mono text-[13px] text-white outline-none focus:border-[rgba(120,200,255,.5)]"
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void submit()}
          placeholder={
            currentRedacted ??
            (alreadySet
              ? 'Thay khoá hiện tại'
              : isLocal
                ? option.placeholder || 'http://127.0.0.1:8000/v1'
                : 'Dán API key')
          }
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
