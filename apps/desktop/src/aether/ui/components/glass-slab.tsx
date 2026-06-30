import { cn } from '@/lib/utils'

export function GlassSlab({
  size = 'md',
  className,
  children,
  style,
  'data-testid': dataTestid,
}: {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
  'data-testid'?: string
}) {
  return (
    <div
      className={cn('ae-slab', className)}
      data-testid={dataTestid}
      style={{ ['--ae-slab-pad' as string]: `var(--ae-slab-pad-${size})`, ...style }}
    >
      {children}
    </div>
  )
}
