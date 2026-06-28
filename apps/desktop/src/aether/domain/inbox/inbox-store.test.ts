import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'
import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'

import { $inbox, $inboxStatus, loadInbox } from './inbox-store'

beforeEach(() => {
  $inbox.set(null)
  $inboxStatus.set('idle')
})

describe('loadInbox', () => {
  it('selects the inbox slice and goes ready when there are threads', async () => {
    await loadInbox({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($inboxStatus.get()).toBe('ready')
    expect($inbox.get()?.threads).toHaveLength(1)
    expect($inbox.get()?.deals).toHaveLength(0)
  })

  it('maps a missing/empty (no threads) inbox section to empty', async () => {
    const empty = { ...(companyOs as unknown as CompanyOs), inbox: { threads: [], deals: [] } }
    await loadInbox({ read: vi.fn().mockResolvedValue(empty) })
    expect($inboxStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadInbox({ read: vi.fn().mockResolvedValue(null) })
    expect($inboxStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadInbox({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($inboxStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadInbox({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
