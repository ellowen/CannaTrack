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
        'bg-white rounded-xl border border-gray-100 shadow-sm p-4',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
