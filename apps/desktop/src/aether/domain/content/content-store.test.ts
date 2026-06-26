import { beforeEach, describe, expect, it, vi } from 'vitest'

import companyOs from '@/aether/domain/company-os/fixtures/company-os.sample.json'
import type { CompanyOs } from '@/aether/domain/company-os/company-os-schema'

import { $content, $contentStatus, loadContent } from './content-store'

beforeEach(() => {
  $content.set(null)
  $contentStatus.set('idle')
})

describe('loadContent', () => {
  it('goes ready when the content section has calendar entries or ideas', async () => {
    const seeded = {
      ...(companyOs as unknown as CompanyOs),
      content: {
        calendar: [{ id: 'c1', channel: 'facebook', title: 'Bài Q3', at: '09:00', status: 'scheduled' as const }],
        ideas: [{ id: 'i1', title: 'Reels giới thiệu sản phẩm', stage: 'idea' as const }]
      }
    }
    await loadContent({ read: vi.fn().mockResolvedValue(seeded) })
    expect($contentStatus.get()).toBe('ready')
    expect($content.get()?.calendar).toHaveLength(1)
    expect($content.get()?.ideas).toHaveLength(1)
  })

  it('maps the default empty content section (fixture) to empty', async () => {
    await loadContent({ read: vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs) })
    expect($contentStatus.get()).toBe('empty')
  })

  it('maps a null artifact to empty', async () => {
    await loadContent({ read: vi.fn().mockResolvedValue(null) })
    expect($contentStatus.get()).toBe('empty')
  })

  it('maps a thrown reader error to error', async () => {
    await loadContent({ read: vi.fn().mockRejectedValue(new Error('REST down')) })
    expect($contentStatus.get()).toBe('error')
  })

  it('forwards force to the reader', async () => {
    const read = vi.fn().mockResolvedValue(companyOs as unknown as CompanyOs)
    await loadContent({ read, force: true })
    expect(read).toHaveBeenCalledWith(undefined, { force: true })
  })
})
