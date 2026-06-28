import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

// FlowView reaches its store actions through the `onboarding.*` namespace, so
// `vi.spyOn` on the same namespace import intercepts them at the call site.
import * as onboarding from '@/store/onboarding'
import type { OAuthProvider, OAuthStartResponse } from '@/types/aether'

import { FlowView } from './flow-view'

// Minimal OAuthProvider helper (mirrors the legacy overlay test). `nous` makes
// providerTitle() resolve to "Nous Portal" via PROVIDER_DISPLAY.
function provider(id = 'nous', name = 'Nous Portal'): OAuthProvider {
  return {
    cli_command: `aether login ${id}`,
    docs_url: `https://example.com/${id}`,
    flow: 'pkce',
    id,
    name,
    status: { logged_in: false },
  }
}

// Minimal device_code start — FlowView's polling branch only reads user_code.
function deviceStart(user_code = 'WDJB-MJHT'): Extract<OAuthStartResponse, { flow: 'device_code' }> {
  return {
    expires_in: 900,
    flow: 'device_code',
    poll_interval: 5,
    session_id: 'sess-1',
    user_code,
    verification_url: 'https://example.com/device',
  }
}

// Minimal pkce start — the awaiting_user render doesn't read flow.start at all,
// but the discriminated union still requires it on that variant.
function pkceStart(): Extract<OAuthStartResponse, { flow: 'pkce' }> {
  return { auth_url: 'https://example.com/auth', expires_in: 900, flow: 'pkce', session_id: 'sess-1' }
}

const ctx: onboarding.OnboardingContext = { requestGateway: vi.fn() }

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlowView — error', () => {
  it('renders the message and "Chọn nhà cung cấp khác" calls cancelOnboardingFlow', () => {
    const spy = vi.spyOn(onboarding, 'cancelOnboardingFlow').mockImplementation(() => {})

    render(<FlowView ctx={ctx} flow={{ status: 'error', message: 'Mã không hợp lệ' }} />)

    expect(screen.getByText('Mã không hợp lệ')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Chọn nhà cung cấp khác' }))
    expect(spy).toHaveBeenCalled()
  })
})

describe('FlowView — awaiting_user', () => {
  it('renders the title and the code input drives setOnboardingCode', () => {
    const spy = vi.spyOn(onboarding, 'setOnboardingCode').mockImplementation(() => {})

    render(
      <FlowView
        ctx={ctx}
        flow={{ status: 'awaiting_user', provider: provider(), start: pkceStart(), code: '' }}
      />,
    )

    expect(screen.getByText('Đăng nhập với Nous Portal')).toBeTruthy()

    const input = screen.getByPlaceholderText('Dán mã xác thực')
    fireEvent.change(input, { target: { value: 'abc123' } })
    expect(spy).toHaveBeenCalledWith('abc123')
  })

  it('disables "Tiếp tục" while the code is empty', () => {
    render(
      <FlowView
        ctx={ctx}
        flow={{ status: 'awaiting_user', provider: provider(), start: pkceStart(), code: '' }}
      />,
    )

    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toHaveProperty('disabled', true)
  })
})

describe('FlowView — polling', () => {
  it('renders the device user_code and clicking it calls copyDeviceCode', () => {
    const spy = vi.spyOn(onboarding, 'copyDeviceCode').mockImplementation(async () => {})

    render(
      <FlowView
        ctx={ctx}
        flow={{ status: 'polling', provider: provider(), start: deviceStart('WDJB-MJHT'), copied: false }}
      />,
    )

    expect(screen.getByText('WDJB-MJHT')).toBeTruthy()

    fireEvent.click(screen.getByText('WDJB-MJHT'))
    expect(spy).toHaveBeenCalled()
  })
})

describe('FlowView — external_pending', () => {
  it('renders the cli_command, copy click calls copyExternalCommand, "Đã đăng nhập" calls recheckExternalSignin', () => {
    const copySpy = vi.spyOn(onboarding, 'copyExternalCommand').mockImplementation(async () => {})
    const recheckSpy = vi.spyOn(onboarding, 'recheckExternalSignin').mockImplementation(async () => {})

    const p = provider()
    render(<FlowView ctx={ctx} flow={{ status: 'external_pending', provider: p, copied: false }} />)

    expect(screen.getByText(p.cli_command)).toBeTruthy()

    fireEvent.click(screen.getByText(p.cli_command))
    expect(copySpy).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Đã đăng nhập' }))
    expect(recheckSpy).toHaveBeenCalled()
  })
})

describe('FlowView — spinner states', () => {
  // The wrapper carries role="status"; LivingOrb adds its own status node, so
  // assert the wrapper (the outermost status node) holds the connecting copy.
  const statusWrapper = () => screen.getAllByRole('status').find(el => el.tagName === 'DIV')

  it('starting → "Đang kết nối với <title>…"', () => {
    render(<FlowView ctx={ctx} flow={{ status: 'starting', provider: provider() }} />)

    expect(screen.getByText('Đang kết nối với Nous Portal…')).toBeTruthy()
    expect(statusWrapper()?.textContent).toContain('Đang kết nối với Nous Portal…')
  })

  it('submitting → "Đang xác minh mã từ <title>…"', () => {
    render(
      <FlowView
        ctx={ctx}
        flow={{ status: 'submitting', provider: provider(), start: pkceStart() }}
      />,
    )

    expect(screen.getByText('Đang xác minh mã từ Nous Portal…')).toBeTruthy()
    expect(statusWrapper()?.textContent).toContain('Đang xác minh mã từ Nous Portal…')
  })

  it('awaiting_browser → "Đang kết nối với <title>…"', () => {
    render(
      <FlowView
        ctx={ctx}
        flow={{
          status: 'awaiting_browser',
          provider: provider(),
          start: { auth_url: 'https://example.com/auth', expires_in: 900, flow: 'loopback', session_id: 'sess-1' },
        }}
      />,
    )

    expect(screen.getByText('Đang kết nối với Nous Portal…')).toBeTruthy()
    expect(statusWrapper()?.textContent).toContain('Đang kết nối với Nous Portal…')
  })
})
