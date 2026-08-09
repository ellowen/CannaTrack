/**
 * Motivo grafico propio de CultiTrack: una linea organica unica que
 * representa raiz -> tallo -> ramificacion -> crecimiento. Reutilizable
 * en el Hero, separadores de seccion y fondo del CTA final -- nunca
 * decorativo porque si, siempre la misma metafora visual.
 */
interface GrowthLinesProps {
  variant?: 'hero' | 'divider' | 'background'
  className?: string
  opacity?: number
}

const GREEN = '#3DCC63'

export function GrowthLines({ variant = 'hero', className, opacity }: GrowthLinesProps) {
  if (variant === 'divider') {
    return (
      <svg
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
        className={className}
        style={{ width: '100%', height: '60px', display: 'block' }}
        aria-hidden="true"
      >
        <path
          d="M 0 30 C 150 30, 180 10, 300 10 C 420 10, 450 50, 600 50 C 700 50, 730 30, 800 30"
          fill="none"
          stroke={GREEN}
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity={opacity ?? 0.18}
        />
        <circle cx="300" cy="10" r="3" fill={GREEN} opacity={(opacity ?? 0.18) * 1.6} />
        <circle cx="600" cy="50" r="3" fill={GREEN} opacity={(opacity ?? 0.18) * 1.6} />
      </svg>
    )
  }

  if (variant === 'background') {
    return (
      <svg
        viewBox="0 0 1200 800"
        className={className}
        style={{ width: '100%', height: '100%', display: 'block' }}
        aria-hidden="true"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M 100 800 C 100 600, 180 560, 200 420 C 215 320, 160 260, 190 140"
          fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity={opacity ?? 0.05}
        />
        <path
          d="M 200 420 C 280 400, 340 340, 420 320"
          fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" opacity={opacity ?? 0.05}
        />
        <path
          d="M 190 140 C 260 120, 300 60, 380 40"
          fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" opacity={opacity ?? 0.05}
        />
        <path
          d="M 1050 800 C 1040 650, 970 600, 960 480 C 952 380, 1010 330, 990 220"
          fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity={opacity ?? 0.05}
        />
        <path
          d="M 960 480 C 880 460, 830 400, 760 390"
          fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" opacity={opacity ?? 0.05}
        />
      </svg>
    )
  }

  // variant === 'hero' — composicion principal, mas detallada, con nodos.
  return (
    <svg
      viewBox="0 0 480 560"
      className={className}
      style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '420px' }}
      aria-hidden="true"
    >
      {/* raiz */}
      <path
        d="M 240 540 C 236 500, 244 470, 238 430"
        fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" opacity="0.55"
      />
      <path
        d="M 238 430 C 220 445, 200 448, 180 465"
        fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.32"
      />
      <path
        d="M 238 430 C 258 442, 272 442, 292 462"
        fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.32"
      />

      {/* tallo */}
      <path
        d="M 240 430 C 236 370, 244 330, 238 270"
        fill="none" stroke={GREEN} strokeWidth="3" strokeLinecap="round" opacity="0.6"
      />

      {/* ramificacion 1 */}
      <path
        d="M 238 340 C 200 330, 170 300, 128 288"
        fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.4"
      />
      <circle cx="128" cy="288" r="5" fill={GREEN} opacity="0.6" />

      {/* ramificacion 2 */}
      <path
        d="M 238 300 C 280 288, 316 258, 360 250"
        fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.4"
      />
      <circle cx="360" cy="250" r="5" fill={GREEN} opacity="0.6" />

      {/* crecimiento — tramo superior, mas delicado */}
      <path
        d="M 238 270 C 232 220, 244 190, 236 140"
        fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"
      />
      <path
        d="M 236 190 C 210 180, 190 155, 160 148"
        fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" opacity="0.45"
      />
      <circle cx="160" cy="148" r="4" fill={GREEN} opacity="0.65" />
      <path
        d="M 236 170 C 262 158, 284 132, 314 122"
        fill="none" stroke={GREEN} strokeWidth="1.5" strokeLinecap="round" opacity="0.45"
      />
      <circle cx="314" cy="122" r="4" fill={GREEN} opacity="0.65" />

      {/* brote final */}
      <path
        d="M 236 140 C 232 110, 240 90, 236 62"
        fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" opacity="0.85"
      />
      <circle cx="236" cy="56" r="7" fill={GREEN} opacity="0.9" />
      <circle cx="236" cy="56" r="14" fill={GREEN} opacity="0.15" />
    </svg>
  )
}
