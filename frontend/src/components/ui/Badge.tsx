import { clsx } from 'clsx'
import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'
type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-app-elevated text-ink-2 border border-app-border',
  success: 'bg-green-50 text-green-700 border border-green-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-red-50 text-red-600 border border-red-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
}

const sizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

export default function Badge({
  variant = 'default',
  size = 'sm',
  icon,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {icon}
      {children}
    </span>
  )
}
