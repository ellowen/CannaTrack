/**
 * Iconografia propia de la landing -- reemplaza los emoji nativos (que
 * cambian de aspecto segun OS/navegador). Todos comparten stroke-width,
 * viewBox 24x24 y currentColor, para verse como un solo lenguaje grafico
 * coherente con las Growth Lines.
 */
interface IconProps {
  size?: number
  className?: string
}

const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function CalendarIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" {...common} />
      <path d="M3.5 9.5h17" {...common} />
      <path d="M8 3v3.5M16 3v3.5" {...common} />
      <circle cx="8" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="14" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17.3" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function ChartIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 20.5V5" {...common} />
      <path d="M4 20.5h16.5" {...common} />
      <path d="M7.5 20.5v-6M12 20.5V9M16.5 20.5v-9.5" {...common} />
    </svg>
  )
}

export function DropletIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.5c3 3.6 6 7.4 6 11a6 6 0 1 1-12 0c0-3.6 3-7.4 6-11Z" {...common} />
    </svg>
  )
}

export function FlaskIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M10 3h4" {...common} />
      <path d="M10.5 3v6l-5 9.2c-.7 1.4.3 3 1.9 3h9.2c1.6 0 2.6-1.6 1.9-3l-5-9.2V3" {...common} />
      <path d="M7.3 15.5h9.4" {...common} />
    </svg>
  )
}

export function CameraIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" {...common} />
      <circle cx="12" cy="12.5" r="3.4" {...common} />
    </svg>
  )
}

export function SproutIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 21v-8" {...common} />
      <path d="M12 13c0-4 -3-6-7-6 0 4 3 6 7 6Z" {...common} />
      <path d="M12 10c0-3.2 2.4-5 6-5 0 3.2-2.4 5-6 5Z" {...common} />
    </svg>
  )
}

export function SignalOffIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M3 8.5c5.5-4.2 12.5-4.2 18 0" {...common} opacity="0.35" />
      <path d="M6 12.3c3.4-2.4 8.6-2.4 12 0" {...common} opacity="0.6" />
      <path d="M9.2 16c1.7-1.1 3.9-1.1 5.6 0" {...common} />
      <circle cx="12" cy="19.3" r="1.1" fill="currentColor" stroke="none" />
      <path d="M3 3l18 18" {...common} />
    </svg>
  )
}

export function SmartphoneIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" {...common} />
      <path d="M10.5 18.2h3" {...common} />
    </svg>
  )
}

export function TrophyIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" {...common} />
      <path d="M7 5.5H4.5a2 2 0 0 0 0 4H6M17 5.5h2.5a2 2 0 0 1 0 4H16" {...common} />
      <path d="M12 14v3M9 20.5h6M10.5 17.5h3v3h-3z" {...common} />
    </svg>
  )
}

export function ShieldIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.2 5 5.8v5.4c0 4.6 3 8.1 7 9.6 4-1.5 7-5 7-9.6V5.8L12 3.2Z" {...common} />
      <path d="M9 12.2l2 2 4-4.2" {...common} />
    </svg>
  )
}

export function CheckBadgeIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 3.5l2.1 1.2 2.4-.3 1.1 2.2 2.2 1.1-.3 2.4L20.7 12l-1.2 2.1.3 2.4-2.2 1.1-1.1 2.2-2.4-.3L12 20.7l-2.1-1.2-2.4.3-1.1-2.2-2.2-1.1.3-2.4L3.3 12l1.2-2.1-.3-2.4 2.2-1.1 1.1-2.2 2.4.3L12 3.5Z" {...common} />
      <path d="M8.7 12.3l2.1 2.1 4.3-4.5" {...common} />
    </svg>
  )
}

export function LeafBadgeIcon({ size = 22, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M5 19c-1-6 1.5-13 14-14 1 8-4 13-14 14Z" {...common} />
      <path d="M6.5 17.5c3-3 6-5.5 10-9.5" {...common} />
    </svg>
  )
}
