import { cn } from '@/lib/utils'

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export function Bar({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className={cn('ae-bar', warn && 'warn')}>
      <i style={{ width: `${clamp(value)}%` }} />
    </div>
  )
}

export function Gauge({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <div className={cn('ae-gauge', warn && 'warn')}>
      <i style={{ width: `${clamp(value)}%` }} />
    </div>
  )
}
