import { cn } from '@/lib/utils'

export function GlassSlab({
  size = 'md',
  className,
  children,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('ae-slab', className)} style={{ ['--ae-slab-pad' as string]: `var(--ae-slab-pad-${size})` }}>
      {children}
    </div>
  )
}
