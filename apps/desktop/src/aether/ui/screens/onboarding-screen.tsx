import { useStore } from '@nanostores/react'
import { useEffect, useMemo, useRef } from 'react'

import { GlassSlab } from '@/aether/ui/components/glass-slab'
import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { isProviderSetupErrorMessage } from '@/lib/provider-setup-errors'
// The SPIED store actions must be reached through a namespace import so
// `vi.spyOn(onboarding, 'dismissFirstRunOnboarding')` intercepts the call site.
// We route every store action + the atom through the same namespace for
// consistency. Constants are pulled in by name (never spied).
import * as onboarding from '@/store/onboarding'
import { DEFAULT_MANUAL_ONBOARDING_REASON, DEFAULT_ONBOARDING_REASON } from '@/store/onboarding'

import { FlowView } from './onboarding/flow-view'
import { PickerView } from './onboarding/picker-view'
import { PreparingView } from './onboarding/preparing-view'

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

  // Ported from the legacy onboarding overlay (now removed) to preserve the
  // Settings "connect a specific provider" deep-link: when the Providers/Model settings page
  // asked to connect a SPECIFIC provider, the store stashed its id. Once the
  // provider list has loaded and we're back at an idle picker, auto-launch that
  // exact OAuth flow so the user lands directly in sign-in instead of the full
  // picker they just clicked through.
  useEffect(() => {
    if (!state.manual || state.providers === null || state.flow.status !== 'idle') {
      return
    }

    const pendingId = onboarding.peekPendingProviderOAuth()

    if (!pendingId) {
      return
    }

    const provider = state.providers.find(p => p.id === pendingId)

    if (provider) {
      // Only clear once we've committed to launching it, so a failed/empty
      // provider fetch doesn't silently drop the hand-off.
      onboarding.clearPendingProviderOAuth()
      void onboarding.startProviderOAuth(provider, ctx)
    } else if (state.providers.length > 0) {
      // The list loaded but the id isn't a real provider — drop the stale
      // hand-off. An empty list means the fetch isn't ready yet, so keep it
      // and let a later refresh retry.
      onboarding.clearPendingProviderOAuth()
    }
  }, [ctx, state.flow.status, state.manual, state.providers])

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
            <h2 className="font-[family-name:var(--ae-font-display)] text-[18px] tracking-[.12em] text-[color:var(--ae-ink)]">
              HYPERTEK · AGENT PLATFORM
            </h2>
            <p className="text-[12.5px] text-[color:var(--ae-dim)]">
              Thiết lập nhà cung cấp suy luận để bắt đầu.
            </p>
          </div>
        </div>

        {reason ? (
          <div className="mb-3 rounded-[12px] border border-[color:var(--ae-line-strong)] p-3 text-[12.5px] text-[color:var(--ae-dim)]">
            {reason}
          </div>
        ) : null}

        {ready ? (
          showPicker ? (
            <PickerView ctx={ctx} />
          ) : (
            <FlowView ctx={ctx} flow={flow} />
          )
        ) : (
          <PreparingView />
        )}

        <div className="mt-4 flex justify-center border-t border-[color:var(--ae-line)] pt-3">
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
