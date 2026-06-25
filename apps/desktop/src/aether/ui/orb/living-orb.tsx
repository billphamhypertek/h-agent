// apps/desktop/src/aether/ui/orb/living-orb.tsx
import { cn } from '@/lib/utils'

export interface LivingOrbProps {
  state?: 'idle' | 'thinking' | 'listening'
  size?: number
  label?: string
  className?: string
}

export function LivingOrb({ state = 'idle', size = 170, label = 'Agent', className }: LivingOrbProps) {
  return (
    <div
      aria-label={label}
      className={cn('ae-orb-wrap inline-grid place-items-center', `ae-orb--${state}`, className)}
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
