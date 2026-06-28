import { atom } from 'nanostores'

import type { CompanyOs, OpsSection } from '@/aether/domain/company-os/company-os-schema'
import { type ReadCompanyOsDeps, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $ops = atom<OpsSection | null>(null)
export const $opsStatus = atom<PillarStatus>('idle')

// Emptiness keyed on the wired sources (calendar/tasks/notes). A finance-less
// slice is still "ready" — the finance section renders its own empty-state.
function isEmptyOps(ops: OpsSection | undefined): boolean {
  return !ops || (ops.calendar.length === 0 && ops.tasks.length === 0 && ops.notes.length === 0)
}

// Read-only: REST + latest finished cron run only. No conversation socket, no deltas.
export async function loadOps(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $opsStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyOps(os.ops)) {
      $ops.set(null)
      $opsStatus.set('empty')

      return
    }

    $ops.set(os.ops!)
    $opsStatus.set('ready')
  } catch {
    $opsStatus.set('error')
  }
}
