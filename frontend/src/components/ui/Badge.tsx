import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'amber' | 'blue' | 'red' | 'gray' | 'purple'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-brand-subtle text-brand-500 border border-brand-border',
  amber:  'bg-flora-bg text-flora-text border border-flora-border',
  blue:   'bg-blue-50 text-blue-700 border border-blue-200',
  purple: 'bg-violet-50 text-violet-700 border border-violet-200',
  red:    'bg-red-50 text-red-600 border border-red-200',
  gray:   'bg-app-elevated text-ink-3 border border-app-border',
}

export default function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
