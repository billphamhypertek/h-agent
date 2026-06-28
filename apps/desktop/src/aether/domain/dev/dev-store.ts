import { atom } from 'nanostores'

import type { CompanyOs, DevSection } from '@/aether/domain/company-os/company-os-schema'
import { type ReadCompanyOsDeps, readLatestCompanyOs } from '@/aether/domain/company-os/read-company-os'

export type PillarStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

// Injected in tests; real callers use the shared cached reader.
export type CompanyOsReader = (deps?: ReadCompanyOsDeps, opts?: { force?: boolean }) => Promise<CompanyOs | null>

export const $dev = atom<DevSection | null>(null)
export const $devStatus = atom<PillarStatus>('idle')

function isEmptyDev(dev: DevSection | undefined): boolean {
  return !dev || (dev.servers.length === 0 && dev.deploys.length === 0 && dev.incidents.length === 0)
}

// Read-only: REST + the latest finished cron run only. No conversation socket,
// no deltas. `force` re-reads past the company-os TTL cache (the "Làm mới" button).
export async function loadDev(opts: { force?: boolean; read?: CompanyOsReader } = {}): Promise<void> {
  const read = opts.read ?? readLatestCompanyOs
  $devStatus.set('loading')

  try {
    const os = await read(undefined, { force: opts.force })

    if (!os || isEmptyDev(os.dev)) {
      $dev.set(null)
      $devStatus.set('empty')

      return
    }

    $dev.set(os.dev!)
    $devStatus.set('ready')
  } catch {
    $devStatus.set('error')
  }
}
