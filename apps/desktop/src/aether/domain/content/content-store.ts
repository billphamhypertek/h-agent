import { atom } from 'nanostores'

import type { CompanyOs, ContentSection } from '@/aether/domain/company-os/company-os-schema'
import { type ReadCompanyOsDeps, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $content = atom<ContentSection | null>(null)
export const $contentStatus = atom<PillarStatus>('idle')

// Content is mostly empty-state today: ready only when there's at least one
// calendar entry or idea. Each section still renders its own empty-state.
function isEmptyContent(content: ContentSection | undefined): boolean {
  return !content || (content.calendar.length === 0 && content.ideas.length === 0)
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadContent(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $contentStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyContent(os.content)) {
      $content.set(null)
      $contentStatus.set('empty')

      return
    }

    $content.set(os.content!)
    $contentStatus.set('ready')
  } catch {
    $contentStatus.set('error')
  }
}
