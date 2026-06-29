import { useState } from 'react'

import { LivingOrb } from '@/aether/ui/orb/living-orb'
import { ModelPickerDialog } from '@/components/model-picker'
// The store actions are reached through a namespace import so `vi.spyOn` can
// intercept them at the call site (notably confirmOnboardingModel). Constants/
// types may be named imports.
import * as onboarding from '@/store/onboarding'

import { providerTitle } from './shared'

// Restyled legacy FlowPanel (overlay lines 817+). Renders every non-idle /
// non-success OAuth + API-key + confirm-model sub-state. Bindings (which store
// action each control calls) are FIXED by the brief — only the chrome is
// re-skinned with --ae-* tokens. Narrows on flow.status so TS types each
// variant's fields; no casts.
export function FlowView({ ctx, flow }: { ctx: onboarding.OnboardingContext; flow: onboarding.OnboardingFlow }) {
  // Spinner-only "đang xử lý" states: starting a sign-in, exchanging a code, or
  // waiting on an auto/loopback browser round-trip. Reuse LivingOrb (motion gate
  // respects prefers-reduced-motion).
  if (flow.status === 'starting' || flow.status === 'submitting' || flow.status === 'awaiting_browser') {
    const title = 'provider' in flow ? providerTitle(flow.provider) : ''

    return (
      <div className="grid place-items-center gap-2 py-6 text-center" role="status">
        <LivingOrb label="Đang xử lý" size={48} state="thinking" />
        <p className="text-[12.5px] text-[color:var(--ae-dim)]">
          {flow.status === 'submitting'
            ? `Đang xác minh mã từ ${title}…`
            : `Đang kết nối với ${title}…`}
        </p>
      </div>
    )
  }

  if (flow.status === 'error') {
    return (
      <div className="grid gap-3">
        <p className="text-[12.5px] text-[color:var(--ae-error)]">
          {flow.message || 'Đăng nhập thất bại.'}
        </p>
        <div className="flex justify-end">
          <button
            className="rounded-[10px] border border-[color:var(--ae-line-strong)] p-[8px_18px] text-[13px] font-semibold text-[color:var(--ae-ink)]"
            onClick={() => onboarding.cancelOnboardingFlow()}
            type="button"
          >
            Chọn nhà cung cấp khác
          </button>
        </div>
      </div>
    )
  }

  if (flow.status === 'awaiting_user') {
    return (
      <FlowStep title={`Đăng nhập với ${providerTitle(flow.provider)}`}>
        <ol className="list-decimal space-y-1 pl-5 text-[12.5px] text-[color:var(--ae-dim)]">
          <li>Đã mở trình duyệt tới {providerTitle(flow.provider)}.</li>
          <li>Cho phép truy cập trong trình duyệt.</li>
          <li>Sao chép mã xác thực và dán vào đây.</li>
        </ol>
        <input
          autoComplete="off"
          autoFocus
          className="rounded-[10px] border border-[color:var(--ae-line-strong)] bg-[var(--ae-well)] p-[9px_12px] font-mono text-[13px] text-[color:var(--ae-ink)] outline-none focus:border-[color:var(--ae-line-strong)]"
          onChange={e => onboarding.setOnboardingCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && void onboarding.submitOnboardingCode(ctx)}
          placeholder="Dán mã xác thực"
          value={flow.code}
        />
        <FlowFooter>
          <CancelButton />
          <button
            className="rounded-[10px] border border-[color:var(--ae-line-strong)] p-[8px_18px] text-[13px] font-semibold text-[color:var(--ae-ink)] disabled:opacity-50"
            disabled={!flow.code.trim()}
            onClick={() => void onboarding.submitOnboardingCode(ctx)}
            type="button"
          >
            Tiếp tục
          </button>
        </FlowFooter>
      </FlowStep>
    )
  }

  if (flow.status === 'polling') {
    return (
      <FlowStep title={`Đăng nhập với ${providerTitle(flow.provider)}`}>
        <p className="text-[12.5px] text-[color:var(--ae-dim)]">
          Đã mở trang xác thực. Nhập mã sau vào trình duyệt:
        </p>
        <CopyableCode copied={flow.copied} onCopy={() => void onboarding.copyDeviceCode()} text={flow.start.user_code} />
        <FlowFooter>
          <WaitingHint />
          <CancelButton />
        </FlowFooter>
      </FlowStep>
    )
  }

  if (flow.status === 'external_pending') {
    return (
      <FlowStep title={`Đăng nhập với ${providerTitle(flow.provider)}`}>
        <p className="text-[12.5px] text-[color:var(--ae-dim)]">
          Chạy lệnh sau trong terminal để đăng nhập, rồi quay lại đây:
        </p>
        <CopyableCode
          copied={flow.copied}
          onCopy={() => void onboarding.copyExternalCommand()}
          text={flow.provider.cli_command}
        />
        <FlowFooter>
          <CancelButton />
          <button
            className="rounded-[10px] border border-[color:var(--ae-line-strong)] p-[8px_18px] text-[13px] font-semibold text-[color:var(--ae-ink)]"
            onClick={() => void onboarding.recheckExternalSignin(ctx)}
            type="button"
          >
            Đã đăng nhập
          </button>
        </FlowFooter>
      </FlowStep>
    )
  }

  if (flow.status === 'confirming_model') {
    return <ConfirmModelView ctx={ctx} flow={flow} />
  }

  // 'idle' / 'success' are handled by the picker branch upstream; nothing else
  // remains in the union, but keep a safe fallback rather than rendering blank.
  return null
}

function FlowStep({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="grid gap-3">
      <h3 className="text-[13px] font-semibold text-[color:var(--ae-ink)]">{title}</h3>
      {children}
    </div>
  )
}

function FlowFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-end gap-3 pt-1">{children}</div>
}

function CancelButton() {
  return (
    <button
      className="text-[12px] font-medium text-[color:var(--ae-azure-soft)]"
      onClick={() => onboarding.cancelOnboardingFlow()}
      type="button"
    >
      Huỷ
    </button>
  )
}

function WaitingHint() {
  return (
    <span className="mr-auto flex items-center gap-2 text-[11.5px] text-[color:var(--ae-dim)]" role="status">
      <LivingOrb label="Đang chờ" size={20} state="thinking" />
      Đang chờ xác thực…
    </span>
  )
}

// Click-to-copy code/command box: the whole block is the copy button; on copy
// it flashes to confirm (the store toggles flow.copied for COPY_FLASH_MS).
function CopyableCode({ copied, onCopy, text }: { copied: boolean; onCopy: () => void; text: string }) {
  return (
    <button
      className={
        copied
          ? 'w-full rounded-[10px] border border-[color:var(--ae-line-strong)] bg-[var(--ae-fill-strong)] p-[10px_14px] text-left font-mono text-[13px] text-[color:var(--ae-ink)] transition-colors'
          : 'w-full rounded-[10px] border border-[color:var(--ae-line-strong)] bg-[var(--ae-well)] p-[10px_14px] text-left font-mono text-[13px] text-[color:var(--ae-ink)] transition-colors hover:bg-[var(--ae-fill)]'
      }
      onClick={onCopy}
      title="Bấm để sao chép"
      type="button"
    >
      <span className="break-all">{text}</span>
      <span className="ml-2 text-[11px] text-[color:var(--ae-azure-soft)]">
        {copied ? '✓ Đã sao chép' : 'Sao chép'}
      </span>
    </button>
  )
}

// Restyled legacy ConfirmingModelPanel (overlay lines 1189+). Shows the chosen
// default model + a "Đổi" affordance that opens the SAME ModelPickerDialog the
// chat shell uses (it fetches its own list via REST /api/model/options). The
// primary "Bắt đầu" button finalizes onboarding via confirmOnboardingModel.
function ConfirmModelView({
  ctx,
  flow,
}: {
  ctx: onboarding.OnboardingContext
  flow: Extract<onboarding.OnboardingFlow, { status: 'confirming_model' }>
}) {
  const [pickerOpen, setPickerOpen] = useState(false)

  return (
    <div className="grid place-items-center gap-5 py-4 text-center">
      <p className="text-[13px] text-[color:var(--ae-dim)]">
        Đã kết nối <span className="font-semibold text-[color:var(--ae-ink)]">{flow.label}</span>.
      </p>

      <div className="grid justify-items-center gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.2em] text-[color:var(--ae-dim)]">
          Mô hình mặc định
        </span>
        <p className="font-mono text-[15px] text-[color:var(--ae-ink)]">{flow.currentModel}</p>
        <button
          className="mt-0.5 text-[12px] font-medium text-[color:var(--ae-azure-soft)] disabled:opacity-50"
          disabled={flow.saving}
          onClick={() => setPickerOpen(true)}
          type="button"
        >
          Đổi
        </button>
      </div>

      <button
        className="rounded-[10px] border border-[color:var(--ae-line-strong)] bg-[var(--ae-fill-strong)] p-[10px_28px] text-[14px] font-semibold text-[color:var(--ae-ink)] disabled:opacity-50"
        data-testid="ae-onboarding-begin"
        disabled={flow.saving}
        onClick={() => onboarding.confirmOnboardingModel(ctx)}
        type="button"
      >
        Bắt đầu
      </button>

      {/*
        Mount the picker only while open. ModelPickerDialog fetches via
        useQuery (REST /api/model/options), which needs a QueryClientProvider
        ancestor; gating the mount keeps the closed confirm card free of that
        dependency (and a disabled query) and matches the dialog's own
        `enabled: open` fetch gate — no behavioral change vs the legacy overlay,
        which always mounts it but never fetches until opened.
      */}
      {pickerOpen ? (
        <ModelPickerDialog
          contentClassName="z-[1310]"
          currentModel={flow.currentModel}
          currentProvider={flow.providerSlug}
          onOpenChange={setPickerOpen}
          onSelect={({ model }) => {
            void onboarding.setOnboardingModel(model)
            setPickerOpen(false)
          }}
          open={pickerOpen}
        />
      ) : null}
    </div>
  )
}
