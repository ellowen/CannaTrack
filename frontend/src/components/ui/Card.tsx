import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export default function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-app-card rounded-2xl border border-app-border shadow-card p-4',
        'tap-highlight-none',
        onClick && [
          'cursor-pointer',
          'active:scale-[0.987] active:shadow-card',
          'hover:shadow-card-md transition-all duration-150',
        ],
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
