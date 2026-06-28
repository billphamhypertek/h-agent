import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { InboxSection } from '@/aether/domain/company-os/company-os-schema'
import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import { $inbox, $inboxStatus } from '@/aether/domain/inbox/inbox-store'
import * as inboxStore from '@/aether/domain/inbox/inbox-store'

import { InboxScreen } from './inbox-screen'

const INBOX = (companyOs as unknown as { inbox: InboxSection }).inbox

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  $inbox.set(null)
  $inboxStatus.set('idle')
})

describe('InboxScreen — ready', () => {
  beforeEach(() => {
    $inbox.set(INBOX)
    $inboxStatus.set('ready')
  })

  it('renders one row per email thread with sender + subject', () => {
    render(<InboxScreen />)
    expect(screen.getAllByTestId('ae-inbox-thread-row')).toHaveLength(1)
    expect(screen.getByText('ACME')).toBeTruthy()
    expect(screen.getByText(/Báo giá website/)).toBeTruthy()
  })

  it('renders the deal-pipeline empty-state when there is no CRM source', () => {
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-deals-empty')).toBeTruthy()
    expect(screen.getAllByText(/Chưa có nguồn CRM/i)).toHaveLength(4)
  })
})

describe('InboxScreen — non-ready states', () => {
  it('renders a skeleton while loading', () => {
    $inboxStatus.set('loading')
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-skeleton')).toBeTruthy()
  })

  it('renders a whole-screen empty-state when there is no artifact', () => {
    $inboxStatus.set('empty')
    render(<InboxScreen />)
    expect(screen.getByTestId('ae-inbox-empty')).toBeTruthy()
  })

  it('renders an error state with a retry control', () => {
    $inboxStatus.set('error')
    render(<InboxScreen />)
    expect(screen.getByRole('button', { name: /Thử lại/i })).toBeTruthy()
  })
})

describe('InboxScreen — interactions', () => {
  it('mounts idle → triggers loadInbox once', () => {
    const spy = vi.spyOn(inboxStore, 'loadInbox').mockResolvedValue()
    $inboxStatus.set('idle')
    render(<InboxScreen />)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('"Làm mới" force re-reads', () => {
    const spy = vi.spyOn(inboxStore, 'loadInbox').mockResolvedValue()
    $inbox.set(INBOX)
    $inboxStatus.set('ready')
    render(<InboxScreen />)
    fireEvent.click(screen.getByTestId('ae-inbox-refresh'))
    expect(spy).toHaveBeenCalledWith({ force: true })
  })
})
