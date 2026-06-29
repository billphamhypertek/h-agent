import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'

import {
  $oauthFlow,
  $oauthProviders,
  $oauthStatus,
  cancelFlow,
  disconnect,
  loadOAuthProviders,
  pollOnce,
  startFlow,
  submitCode
} from '@/aether/domain/settings/oauth-store'
import { GlassSlab } from '@/aether/ui/components/glass-slab'

export function ProvidersTab() {
  const status = useStore($oauthStatus)
  const data = useStore($oauthProviders)
  const flow = useStore($oauthFlow)
  const [code, setCode] = useState('')
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if ($oauthStatus.get() === 'idle') {
      void loadOAuthProviders()
    }
  }, [])

  // Poll ONLY the OAuth REST endpoint while a flow is awaiting. This does not
  // touch any conversation stream, so the prompt-cache rule is honored.
  useEffect(() => {
    if (flow.phase === 'awaiting') {
      timer.current = setInterval(() => void pollOnce(), 4000)
    }

    return () => {
      if (timer.current) {
        clearInterval(timer.current)
        timer.current = null
      }
    }
  }, [flow.phase, flow.sessionId])

  if (status === 'loading' || status === 'idle') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-dim)]">Đang tải providers…</div>
      </GlassSlab>
    )
  }

  if (status === 'error') {
    return (
      <GlassSlab size="md">
        <div className="text-[12px] text-[color:var(--ae-warn)]">Không tải được danh sách providers.</div>
        <button
          className="mt-2 rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)]"
          onClick={() => void loadOAuthProviders()}
          style={{ background: 'var(--ae-azure)' }}
          type="button"
        >
          Thử lại
        </button>
      </GlassSlab>
    )
  }

  const providers = data?.providers ?? []

  return (
    <div className="flex flex-col gap-3">
      {flow.phase === 'awaiting' && (
        <GlassSlab className="flex flex-col gap-2" size="md">
          <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">ĐANG XÁC THỰC</div>
          {flow.start && flow.start.flow === 'device_code' && (
            <div className="text-[12.5px] text-[color:var(--ae-ink)]">
              Mở <span className="font-mono">{flow.start.verification_url}</span> và nhập mã{' '}
              <b className="font-mono text-[color:var(--ae-ink)]">{flow.start.user_code}</b>.
            </div>
          )}
          {flow.start && (flow.start.flow === 'pkce' || flow.start.flow === 'loopback') && (
            <div className="text-[12.5px] text-[color:var(--ae-ink)]">
              Mở liên kết để đăng nhập: <span className="font-mono">{flow.start.auth_url}</span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="rounded-[10px] bg-[var(--ae-fill)] px-2.5 py-1.5 text-[12px] text-[color:var(--ae-ink)]"
              onChange={e => setCode(e.target.value)}
              placeholder="Dán mã xác thực (nếu có)"
              value={code}
            />
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-on-azure)] disabled:opacity-50"
              disabled={!code.trim()}
              onClick={() => void submitCode(code.trim())}
              style={{ background: 'var(--ae-azure)' }}
              type="button"
            >
              Gửi mã
            </button>
            <button
              className="rounded-[10px] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--ae-azure-soft)]"
              onClick={() => void cancelFlow()}
              type="button"
            >
              Hủy
            </button>
          </div>
        </GlassSlab>
      )}

      {flow.phase === 'error' && (
        <GlassSlab size="md">
          <div className="text-[12px] text-[color:var(--ae-warn)]">{flow.message ?? 'Xác thực thất bại.'}</div>
        </GlassSlab>
      )}

      <GlassSlab className="flex flex-col gap-2" size="md">
        <div className="text-[11px] font-semibold tracking-[.16em] text-[color:var(--ae-azure-soft)]">NHÀ CUNG CẤP</div>
        {providers.map(p => (
          <div className="flex items-center gap-2 text-[12.5px]" key={p.id}>
            <span className="flex-1 font-semibold text-[color:var(--ae-ink)]">{p.name}</span>
            {p.status.logged_in ? (
              <>
                <span className="text-[11px] font-semibold" style={{ color: 'var(--ae-ok)' }}>
                  Đã kết nối
                </span>
                <button
                  className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ae-azure-soft)]"
                  onClick={() => void disconnect(p.id)}
                  type="button"
                >
                  Ngắt kết nối
                </button>
              </>
            ) : (
              <button
                className="rounded-[8px] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--ae-on-azure)]"
                onClick={() => void startFlow(p.id)}
                style={{ background: 'var(--ae-azure)' }}
                type="button"
              >
                Kết nối
              </button>
            )}
          </div>
        ))}
      </GlassSlab>
    </div>
  )
}
