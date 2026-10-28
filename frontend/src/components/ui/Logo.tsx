/** Marca de CultiTrack: hoja con un arco de ciclo (verde = vegetativo, dorado = floracion). */
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
      <radialGradient id="ct-bg" cx="50%" cy="32%" r="75%"><stop offset="0" stopColor="#1D2D1B"/><stop offset="1" stopColor="#0F160E"/></radialGradient>
      <linearGradient id="ct-leaf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F4F8EF"/><stop offset="1" stopColor="#BFE3C4"/></linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="177" height="177" rx="41" fill="url(#ct-bg)" stroke="#31402B" strokeWidth="3"/>
      <path d="M 90.00 28.00 A 62 62 0 0 1 113.23 147.49" fill="none" stroke="#5CC76C" strokeWidth="8" strokeLinecap="round"/>
      <path d="M 105.00 150.16 A 62 62 0 0 1 28.00 90.00" fill="none" stroke="#D9A441" strokeWidth="8" strokeLinecap="round"/>
      <g transform="translate(90,113) scale(1.42)" fill="url(#ct-leaf)"><path transform="rotate(0)" d="M 0 0 C -4.8 -13.8, -4.8 -33.1, 0 -46 C 4.8 -33.1, 4.8 -13.8, 0 0 Z"/><path transform="rotate(27)" d="M 0 0 C -4.2 -12.0, -4.2 -28.8, 0 -40 C 4.2 -28.8, 4.2 -12.0, 0 0 Z"/><path transform="rotate(-27)" d="M 0 0 C -4.2 -12.0, -4.2 -28.8, 0 -40 C 4.2 -28.8, 4.2 -12.0, 0 0 Z"/><path transform="rotate(55)" d="M 0 0 C -3.4 -9.0, -3.4 -21.6, 0 -30 C 3.4 -21.6, 3.4 -9.0, 0 0 Z"/><path transform="rotate(-55)" d="M 0 0 C -3.4 -9.0, -3.4 -21.6, 0 -30 C 3.4 -21.6, 3.4 -9.0, 0 0 Z"/><path transform="rotate(80)" d="M 0 0 C -3.4 -5.7, -3.4 -13.7, 0 -19 C 3.4 -13.7, 3.4 -5.7, 0 0 Z"/><path transform="rotate(-80)" d="M 0 0 C -3.4 -5.7, -3.4 -13.7, 0 -19 C 3.4 -13.7, 3.4 -5.7, 0 0 Z"/><line x1="0" y1="-3" x2="0" y2="-40" stroke="#0D110C" strokeOpacity=".16" strokeWidth="1.1" strokeLinecap="round"/><rect x="-2.6" y="-1" width="5.2" height="13" rx="2.6"/></g>
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
            fontWeight: 500,
            color: textColor,
            lineHeight: 1,
            letterSpacing: '-0.3px',
            fontFamily: "'Fraunces Variable', Fraunces, 'Iowan Old Style', Georgia, serif",
          }}
        >
          Culti
          <span style={{ fontWeight: 700, color: dark ? '#5CC76C' : '#2B7D38' }}>Track</span>
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
