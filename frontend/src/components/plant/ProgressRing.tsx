interface ProgressRingProps {
  progress: number  // 0–1
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  label?: string
  sublabel?: string
  centerEmoji?: string
}

/**
 * Anillo circular SVG de progreso con emoji en el centro.
 * Usado en PlantDetail para mostrar el avance del ciclo actual.
 */
export default function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 10,
  color = 'var(--brand-400)',
  bgColor = 'var(--app-elevated)',
  label,
  sublabel,
  centerEmoji,
}: ProgressRingProps) {
  const r = (size - strokeWidth * 2) / 2
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - Math.min(Math.max(progress, 0), 1))

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className={`-rotate-90${progress >= 1 ? ' ring-glow' : ''}`}>
          {/* Track */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={cx} cy={cx} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerEmoji && (
            <span className="text-4xl leading-none mb-1 select-none">{centerEmoji}</span>
          )}
          {label && (
            <span className="text-xl font-black text-ink-1 tabular leading-none">{label}</span>
          )}
          {sublabel && (
            <span className="text-[11px] text-ink-3 font-semibold mt-0.5 leading-none">{sublabel}</span>
          )}
        </div>
      </div>
    </div>
  )
}
