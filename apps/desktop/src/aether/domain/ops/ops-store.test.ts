import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $ops, $opsStatus, loadOps } from './ops-store'

beforeEach(() => {
  $ops.set(null)
  $opsStatus.set('idle')
})

describe('loadOps', () => {
  it('selects the ops slice and goes ready', async () => {
    await loadOps({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($opsStatus.get()).toBe('ready')
    expect($ops.get()?.calendar).toHaveLength(1)
    expect($ops.get()?.tasks).toHaveLength(1)
  })

  it('maps an ops section with no calendar/tasks/notes to empty', async () => {
    const empty = {
      ...(companyOs as unknown as CompanyOs),
      ops: { calendar: [], tasks: [], finance: {}, notes: [] }
    }
    await loadOps({ read: vi.fn().mockResolvedValue(empty) })
    expect($opsStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadOps({ read: vi.fn().mockResolvedValue(null) })
    expect($opsStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadOps({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($opsStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadOps({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
