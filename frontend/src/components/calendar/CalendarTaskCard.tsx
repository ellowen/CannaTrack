import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'

// Configuración visual por tipo — clases completas para que Tailwind las incluya
const TYPE_CONFIG: Record<string, { icon: string; label: string; accent: string; bg: string; text: string }> = {
  nutrition:   { icon: '🍃', label: 'Nutrición',   accent: 'border-l-task-nutrition',   bg: 'bg-task-nutrition/8',   text: 'text-task-nutrition' },
  irrigation:  { icon: '💧', label: 'Riego',        accent: 'border-l-task-irrigation',  bg: 'bg-task-irrigation/8',  text: 'text-task-irrigation' },
  observation: { icon: '🔍', label: 'Observación',  accent: 'border-l-task-observation', bg: 'bg-task-observation/8', text: 'text-task-observation' },
  foliar:      { icon: '🌫️', label: 'Foliar',       accent: 'border-l-task-foliar',      bg: 'bg-task-foliar/8',      text: 'text-task-foliar' },
  harvest:     { icon: '✂️', label: 'Cosecha',      accent: 'border-l-task-harvest',     bg: 'bg-task-harvest/8',     text: 'text-task-harvest' },
}

const FALLBACK = { icon: '📌', label: 'Tarea', accent: 'border-l-app-border-strong', bg: '', text: 'text-ink-2' }

function getDetail(task: ScheduledTask): string {
  if (task.type === 'nutrition') {
    if (task.products.length === 0) return 'Solo agua — semana de limpieza'
    if (task.products.length <= 2) return task.products.map((p) => p.name).join(' · ')
    return `${task.products.slice(0, 2).map((p) => p.name).join(' · ')} +${task.products.length - 2}`
  }
  return ''
}

interface CalendarTaskCardProps {
  task: ScheduledTask
  plantName: string
  onComplete?: (id: string) => void
}

export default function CalendarTaskCard({ task, plantName, onComplete }: CalendarTaskCardProps) {
  const cfg = TYPE_CONFIG[task.type] ?? FALLBACK
  const detail = getDetail(task)
  const weekBadge = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`

  return (
    <div className={clsx(
      'flex items-stretch rounded-2xl border border-app-border overflow-hidden transition-all',
      task.completed ? 'opacity-50' : 'shadow-card hover:shadow-card-md'
    )}>
      {/* Accent bar */}
      <div className={clsx('w-1 shrink-0', cfg.accent.replace('border-l-', 'bg-'))} />

      {/* Content */}
      <div className={clsx('flex-1 px-4 py-3.5 bg-app-card')}>
        {/* Top row */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg leading-none">{cfg.icon}</span>
          <span className={clsx(
            'text-sm font-bold',
            task.completed ? 'line-through text-ink-4' : 'text-ink-1'
          )}>
            {cfg.label}
          </span>
          <span className={clsx(
            'ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full',
            task.cycle === 'flora' ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text'
          )}>
            {weekBadge}
          </span>
        </div>

        {/* Detail */}
        {detail && (
          <p className={clsx(
            'text-xs mb-2 leading-relaxed',
            task.completed ? 'text-ink-4' : 'text-ink-3'
          )}>
            {detail}
          </p>
        )}

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs">🌿</span>
            <span className="text-xs font-semibold text-ink-3 truncate max-w-[140px]">{plantName}</span>
          </div>

          {task.completed ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Hecho
            </span>
          ) : onComplete ? (
            <button
              onClick={() => onComplete(task.id)}
              className={clsx(
                'text-xs font-bold px-3 py-1.5 rounded-xl border transition-all tap-highlight-none active:scale-95',
                'bg-brand-subtle text-brand-400 border-brand-border hover:bg-brand-dim'
              )}
            >
              Marcar hecho
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
