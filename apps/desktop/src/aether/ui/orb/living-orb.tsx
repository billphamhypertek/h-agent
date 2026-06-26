// apps/desktop/src/aether/ui/orb/living-orb.tsx
import { useStore } from '@nanostores/react'

import { $orbState } from '@/aether/domain/motion/motion-store'
import { cn } from '@/lib/utils'

export interface LivingOrbProps {
  /** Force a specific state (Boot uses this). When omitted, the orb tracks the runtime `$orbState`. */
  state?: 'idle' | 'thinking' | 'listening' | 'paused'
  size?: number
  label?: string
  className?: string
}

export function LivingOrb({ state, size = 170, label = 'Agent', className }: LivingOrbProps) {
  // No explicit `state` ⇒ follow the live runtime store; an explicit prop is a forced override.
  const live = useStore($orbState)
  const effective = state ?? live

  return (
    <div
      aria-label={label}
      className={cn('ae-orb-wrap inline-grid place-items-center', `ae-orb--${effective}`, className)}
      role="status"
    >
      <div className="ae-orb-stage" style={{ '--ae-orb-size': `${size}px` } as React.CSSProperties}>
        <div className="ae-orb-ring" />
        <div className="ae-orb-ring r2" />
        <div className="ae-orb" />
      </div>
    </div>
  )
}
