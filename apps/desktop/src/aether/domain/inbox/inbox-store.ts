import { atom } from 'nanostores'

import type { CompanyOs, InboxSection } from '@/aether/domain/company-os/company-os-schema'
import { type ReadCompanyOsDeps, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $inbox = atom<InboxSection | null>(null)
export const $inboxStatus = atom<PillarStatus>('idle')

// Emptiness is keyed on the wired source (email threads). A deals-less inbox is
// still "ready" — the pipeline frame renders its own "Chưa có nguồn CRM" state.
function isEmptyInbox(inbox: InboxSection | undefined): boolean {
  return !inbox || inbox.threads.length === 0
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadInbox(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $inboxStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyInbox(os.inbox)) {
      $inbox.set(null)
      $inboxStatus.set('empty')

      return
    }

    $inbox.set(os.inbox!)
    $inboxStatus.set('ready')
  } catch {
    $inboxStatus.set('error')
  }
}
