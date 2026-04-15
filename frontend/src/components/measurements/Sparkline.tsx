/** Sparkline SVG minimalista para EC y pH */

interface Point { value: number; date: Date }

interface SparklineProps {
  points: Point[]
  /** Valor mínimo del rango objetivo */
  rangeMin?: number
  /** Valor máximo del rango objetivo */
  rangeMax?: number
  /** Color de la línea (hex o CSS var) */
  color?: string
  width?: number
  height?: number
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

export default function Sparkline({
  points,
  rangeMin,
  rangeMax,
  color = '#2A8E39',
  width = 120,
  height = 40,
}: SparklineProps) {
  if (points.length < 2) return null

  const pad = 4
  const w = width  - pad * 2
  const h = height - pad * 2

  const values = points.map((p) => p.value)
  const minV   = Math.min(...values)
  const maxV   = Math.max(...values)
  // Expandir un poco el dominio para que la línea no esté pegada al borde
  const span   = Math.max(maxV - minV, 0.1)
  const lo     = minV - span * 0.15
  const hi     = maxV + span * 0.15

  function toX(i: number) {
    return pad + (i / (points.length - 1)) * w
  }
  function toY(v: number) {
    return pad + h - ((v - lo) / (hi - lo)) * h
  }

  // Polyline path
  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`)
    .join(' ')

  // Area fill path (línea + cierre inferior)
  const areaPath = [
    ...points.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.value).toFixed(1)}`),
    `L${toX(points.length - 1).toFixed(1)},${(pad + h).toFixed(1)}`,
    `L${pad.toFixed(1)},${(pad + h).toFixed(1)}`,
    'Z',
  ].join(' ')

  // Líneas de rango objetivo
  const rangeMinY = rangeMin != null ? toY(clamp(rangeMin, lo, hi)) : null
  const rangeMaxY = rangeMax != null ? toY(clamp(rangeMax, lo, hi)) : null

  const gradientId = `spark-grad-${color.replace(/[^a-z0-9]/gi, '')}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Rango objetivo — zona sombreada entre min y max */}
      {rangeMinY != null && rangeMaxY != null && (
        <rect
          x={pad}
          y={rangeMaxY}
          width={w}
          height={rangeMinY - rangeMaxY}
          fill={color}
          opacity={0.07}
          rx={2}
        />
      )}

      {/* Línea de rango mín */}
      {rangeMinY != null && (
        <line
          x1={pad} y1={rangeMinY}
          x2={pad + w} y2={rangeMinY}
          stroke={color} strokeWidth={1}
          strokeDasharray="3 3" opacity={0.35}
        />
      )}
      {/* Línea de rango máx */}
      {rangeMaxY != null && (
        <line
          x1={pad} y1={rangeMaxY}
          x2={pad + w} y2={rangeMaxY}
          stroke={color} strokeWidth={1}
          strokeDasharray="3 3" opacity={0.35}
        />
      )}

      {/* Área de relleno */}
      <path d={areaPath} fill={`url(#${gradientId})`} />

      {/* Línea principal */}
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {/* Último punto — dot destacado */}
      <circle
        cx={toX(points.length - 1)}
        cy={toY(points[points.length - 1].value)}
        r={3}
        fill={color}
        stroke="white"
        strokeWidth={1.5}
      />
    </svg>
  )
}
