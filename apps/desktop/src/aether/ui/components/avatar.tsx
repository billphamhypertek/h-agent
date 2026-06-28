import { useStore } from '@nanostores/react'

import { $activeProfile } from '@/aether/domain/profiles/profiles-store'
import { cn } from '@/lib/utils'

export function profileInitial(name: string | null | undefined): string {
  const ch = (name ?? '').trim()[0]
  return ch ? ch.toUpperCase() : 'A'
}

// The single AETHER avatar. Sized by --ae-avatar, derives its initial from the
// active profile — replaces the two divergent hardcoded "B" avatars (nav + top-bar).
export function Avatar({ className }: { className?: string }) {
  const profile = useStore($activeProfile)
  return (
    <div
      className={cn('grid place-items-center rounded-full text-[length:var(--ae-text-base)] font-bold', className)}
      data-testid="ae-avatar"
      style={{
        height: 'var(--ae-avatar)',
        width: 'var(--ae-avatar)',
        color: 'var(--ae-navy)',
        background: 'radial-gradient(circle at 35% 30%,var(--ae-azure-soft),var(--ae-azure) 70%,var(--ae-azure-bright))',
      }}
    >
      {profileInitial(profile)}
    </div>
  )
}
