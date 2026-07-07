/** Marca de CannaTrack — hoja geometrica con arco de tracking. */
import { useTranslation } from '@/i18n'

interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="ct-bg" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#142B18" />
          <stop offset="100%" stopColor="#050E07" />
        </radialGradient>
        <linearGradient id="ct-leaf" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBEDCF" />
        </linearGradient>
      </defs>
      {/* Fondo redondeado */}
      <rect width="180" height="180" rx="42" fill="url(#ct-bg)" />
      {/* Halo central */}
      <ellipse cx="90" cy="88" rx="62" ry="55" fill="#2EBD52" opacity="0.07" />
      {/* Arco de tracking (270° horario, de arriba hacia izquierda) */}
      <path
        d="M 90 28 A 62 62 0 1 1 28 90"
        fill="none"
        stroke="#3DCC63"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.38"
      />
      {/* Dot al final del arco */}
      <circle cx="28" cy="90" r="4" fill="#3DCC63" opacity="0.6" />
      {/* Hojas */}
      <g transform="translate(90,108)" fill="url(#ct-leaf)">
        <path d="M 0 0 C -7.5 -10, -7.5 -33, 0 -44 C 7.5 -33, 7.5 -10, 0 0 Z" />
        <path transform="rotate(27)"  d="M 0 0 C -6.5 -9, -6.5 -28, 0 -37 C 6.5 -28, 6.5 -9, 0 0 Z" />
        <path transform="rotate(-27)" d="M 0 0 C -6.5 -9, -6.5 -28, 0 -37 C 6.5 -28, 6.5 -9, 0 0 Z" />
        <path transform="rotate(56)"  d="M 0 0 C -5 -6.5, -5 -19, 0 -26 C 5 -19, 5 -6.5, 0 0 Z" />
        <path transform="rotate(-56)" d="M 0 0 C -5 -6.5, -5 -19, 0 -26 C 5 -19, 5 -6.5, 0 0 Z" />
        <path transform="rotate(82)"  d="M 0 0 C -3.5 -4.5, -3.5 -11, 0 -15 C 3.5 -11, 3.5 -4.5, 0 0 Z" />
        <path transform="rotate(-82)" d="M 0 0 C -3.5 -4.5, -3.5 -11, 0 -15 C 3.5 -11, 3.5 -4.5, 0 0 Z" />
        {/* Vena central */}
        <line x1="0" y1="-2" x2="0" y2="-38" stroke="rgba(5,14,7,0.18)" strokeWidth="1.2" strokeLinecap="round" />
        {/* Tallo */}
        <rect x="-2.8" y="0" width="5.6" height="12" rx="2.8" />
      </g>
    </svg>
  )
}

interface LogoFullProps {
  iconSize?: number
  /** true = fondo oscuro (default), false = fondo claro */
  dark?: boolean
  showTagline?: boolean
  className?: string
}

export function LogoFull({ iconSize = 48, dark = true, showTagline = false, className = '' }: LogoFullProps) {
  const { t } = useTranslation()
  const textColor = dark ? '#FFFFFF' : '#0A1A0D'
  const taglineColor = dark ? 'rgba(255,255,255,0.45)' : 'rgba(10,26,13,0.45)'

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <LogoMark size={iconSize} />
      <div>
        <div
          style={{
            fontSize: iconSize * 0.58,
            fontWeight: 300,
            color: textColor,
            lineHeight: 1,
            letterSpacing: '-0.3px',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}
        >
          Canna
          <span style={{ fontWeight: 800, color: '#3DCC63' }}>Track</span>
        </div>
        {showTagline && (
          <div
            style={{
              fontSize: iconSize * 0.22,
              fontWeight: 600,
              color: taglineColor,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginTop: 3,
            }}
          >
            {t('common.app_tagline')}
          </div>
        )}
      </div>
    </div>
  )
}
