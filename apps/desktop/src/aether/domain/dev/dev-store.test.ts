import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'
import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'

import { $dev, $devStatus, loadDev } from './dev-store'

beforeEach(() => {
  $dev.set(null)
  $devStatus.set('idle')
})

describe('loadDev', () => {
  it('selects the dev slice and goes ready', async () => {
    await loadDev({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($devStatus.get()).toBe('ready')
    expect($dev.get()?.servers).toHaveLength(2)
  })

  it('maps a missing/empty dev section to empty', async () => {
    const empty = { ...(companyOs as unknown as CompanyOs), dev: { servers: [], deploys: [], incidents: [] } }
    await loadDev({ read: vi.fn().mockResolvedValue(empty) })
    expect($devStatus.get()).toBe('empty')
    expect($dev.get()).toBeNull()
  })

  it('maps a null artifact (no cron run yet) to empty', async () => {
    await loadDev({ read: vi.fn().mockResolvedValue(null) })
    expect($devStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadDev({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($devStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadDev({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
