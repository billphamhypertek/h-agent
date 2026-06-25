import { cn } from '@/lib/utils'

export function GlassSlab({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('ae-slab', className)}>{children}</div>
}
