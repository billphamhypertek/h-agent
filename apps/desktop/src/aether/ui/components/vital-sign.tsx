import { useConnectionStatus } from '@/aether/domain/connection/use-connection-status'
import { cn } from '@/lib/utils'

export type VitalStatus = 'online' | 'retrying' | 'down'

export function vitalStatus(c: 'connecting' | 'online' | 'paused'): VitalStatus {
  if (c === 'online') {return 'online'}

  if (c === 'connecting') {return 'retrying'}

  return 'down'
}

// ECG sparkline replacing the binary 7px dot + the ad-hoc "Mất kết nối" overlay.
// online = azure beat · retrying = amber fast beat · down = flat red line.
const TRACE: Record<VitalStatus, string> = {
  online: 'M0 8 H10 l3 -5 l3 10 l3 -5 H40',
  retrying: 'M0 8 H6 l2 -5 l2 9 l2 -4 H16 l2 -5 l2 9 l2 -4 H40',
  down: 'M0 8 H40',
}

const STROKE: Record<VitalStatus, string> = {
  online: 'var(--ae-state-online)',
  retrying: 'var(--ae-energy)',
  down: 'var(--ae-error)',
}

export function VitalSign({ className }: { className?: string }) {
  const status = vitalStatus(useConnectionStatus())

  return (
    <svg
      aria-label={`Trạng thái kết nối: ${status}`}
      className={cn('ae-vital', className)}
      data-status={status}
      data-testid="ae-vital"
      fill="none"
      height={16}
      role="img"
      viewBox="0 0 40 16"
      width={40}
    >
      <path d={TRACE[status]} stroke={STROKE[status]} strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} />
    </svg>
  )
}
