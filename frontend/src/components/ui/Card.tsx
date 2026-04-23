import { clsx } from 'clsx'

type Variant = 'default' | 'elevated' | 'outlined'
type Padding = 'sm' | 'md' | 'lg'
type Highlight = 'none' | 'success' | 'warning' | 'danger'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  variant?: Variant
  padding?: Padding
  highlight?: Highlight
}

const variants: Record<Variant, string> = {
  default: 'bg-app-card rounded-2xl border border-app-border shadow-card',
  elevated: 'bg-app-card rounded-2xl border border-app-border shadow-card-lg',
  outlined: 'bg-transparent rounded-2xl border-2 border-app-border-strong',
}

const paddings: Record<Padding, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

const highlights: Record<Highlight, string> = {
  none: '',
  success: 'border-l-4 border-l-green-500 bg-green-50',
  warning: 'border-l-4 border-l-amber-500 bg-amber-50',
  danger: 'border-l-4 border-l-red-500 bg-red-50',
}

export default function Card({
  children,
  className,
  onClick,
  variant = 'default',
  padding = 'md',
  highlight = 'none',
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl transition-all duration-150',
        'tap-highlight-none',
        variants[variant],
        paddings[padding],
        highlights[highlight] && highlights[highlight],
        onClick && [
          'cursor-pointer',
          'active:scale-[0.987]',
          'hover:shadow-card-md',
        ],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
