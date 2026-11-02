import { getCycleStrip } from '@/lib/flora-cycle'

/** Una marca por semana del ciclo: verde = vegetativo, ambar = floracion; llenas las ya transcurridas. */
export default function CycleStrip({ plant, className = '' }: { plant: Parameters<typeof getCycleStrip>[0]; className?: string }) {
  const strip = getCycleStrip(plant)
  if (!strip) return null
  const total = strip.vegeWeeks + strip.floraWeeks
  const shown = Math.min(strip.currentIndex + 1, total)
  return (
    <div
      role="img"
      aria-label={strip.currentIndex < 0 ? `Ciclo de ${total} semanas, todavia sin sembrar` : `Semana ${shown} de ${total}`}
      className={`flex items-end gap-[3px] h-3 ${className}`}
    >
      {Array.from({ length: total }, (_, i) => {
        const flora = i >= strip.vegeWeeks
        const color = flora ? '#D9A441' : 'var(--brand-400)'
        const done = i < strip.currentIndex
        const current = i === strip.currentIndex
        return (
          <span
            key={i}
            className="flex-1 rounded-full transition-all"
            style={{
              height: current ? 12 : 6,
              backgroundColor: done || current ? color : 'transparent',
              border: done || current ? 'none' : `1px solid ${flora ? 'rgba(217,164,65,0.35)' : 'var(--app-border-strong)'}`,
              opacity: done ? 0.7 : 1,
            }}
          />
        )
      })}
    </div>
  )
}
