import { clsx } from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-400 text-white font-semibold shadow-glow-brand hover:bg-brand-500 active:bg-brand-600 active:scale-[0.98]',
  secondary:
    'bg-app-card text-ink-2 border border-app-border-strong hover:border-brand-border hover:text-brand-500 active:scale-[0.98] shadow-card',
  ghost:
    'text-ink-3 hover:bg-app-elevated hover:text-ink-2 active:scale-[0.98]',
  danger:
    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30',
        'disabled:opacity-40 disabled:pointer-events-none',
        'tap-highlight-none select-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
