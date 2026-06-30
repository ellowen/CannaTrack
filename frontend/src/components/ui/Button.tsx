import { clsx } from 'clsx'
import React from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  isLoading?: boolean
  icon?: React.ReactNode
}

const variants: Record<Variant, string> = {
  primary:
    'bg-brand-400/90 text-white font-semibold shadow-glow-brand hover:bg-brand-400 active:bg-brand-500 active:scale-[0.98] backdrop-blur-md border border-white/20 [box-shadow:inset_0_1px_0_rgba(255,255,255,0.25),var(--shadow-glow-brand)]',
  secondary:
    'glass text-ink-2 hover:border-brand-border hover:text-brand-500 active:scale-[0.98]',
  ghost:
    'text-ink-3 hover:bg-white/10 hover:text-ink-2 active:scale-[0.98]',
  danger:
    'glass-pill glass-red text-red-500 hover:text-red-600 active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3.5 py-2 text-sm rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-2xl',
}

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  isLoading = false,
  icon,
  disabled,
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
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Spinner /> : icon}
      {children}
    </button>
  )
}
