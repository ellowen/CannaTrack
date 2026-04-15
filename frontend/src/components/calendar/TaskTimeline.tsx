import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'

const TYPE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  nutrition:   { icon: '🍃', label: 'Nutrición',   color: '#22C55E', bg: 'rgba(34,197,94,0.1)'  },
  irrigation:  { icon: '💧', label: 'Riego',        color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
  observation: { icon: '🔍', label: 'Observación',  color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  foliar:      { icon: '🌫️', label: 'Foliar',       color: '#A855F7', bg: 'rgba(168,85,247,0.1)' },
  harvest:     { icon: '✂️', label: 'Cosecha',      color: '#EF4444', bg: 'rgba(239,68,68,0.1)'  },
}
const FALLBACK = { icon: '📌', label: 'Tarea', color: '#9CA3AF', bg: 'rgba(156,163,175,0.1)' }

function getDetail(task: ScheduledTask): string | null {
  if (task.type !== 'nutrition') return null
  if (task.products.length === 0) return 'Solo agua — semana de limpieza'
  if (task.products.length <= 3) return task.products.map((p) => p.name).join(' · ')
  return `${task.products.slice(0, 2).map((p) => p.name).join(' · ')} +${task.products.length - 2} más`
}

interface TaskTimelineProps {
  tasks: ScheduledTask[]
  getPlantName: (id: string) => string
  onComplete?: (id: string) => void
}

export default function TaskTimeline({ tasks, getPlantName, onComplete }: TaskTimelineProps) {
  if (tasks.length === 0) return null

  const pending   = tasks.filter((t) => !t.completed)
  const completed = tasks.filter((t) => t.completed)
  const ordered   = [...pending, ...completed]

  return (
    <div className="relative pl-6">
      {/* Línea vertical */}
      <div className="absolute left-2.5 top-3 bottom-3 w-px bg-app-border" />

      <div className="space-y-3">
        {ordered.map((task, i) => {
          const cfg = TYPE_CONFIG[task.type] ?? FALLBACK
          const detail = getDetail(task)
          const weekBadge = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`
          const isDone = task.completed

          return (
            <div
              key={task.id}
              className="task-in relative"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Nodo en la línea */}
              <div
                className={clsx(
                  'absolute -left-[22px] top-3.5 w-4 h-4 rounded-full border-2 border-app-bg flex items-center justify-center transition-all',
                  isDone ? 'bg-brand-200' : ''
                )}
                style={!isDone ? { backgroundColor: cfg.color } : undefined}
              >
                {isDone && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-2.5 h-2.5">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Card */}
              <div
                className={clsx(
                  'rounded-2xl border border-app-border overflow-hidden transition-all',
                  isDone ? 'opacity-50' : 'shadow-card hover:shadow-card-md'
                )}
              >
                {/* Franja de color superior */}
                <div
                  className="h-[3px]"
                  style={{ backgroundColor: isDone ? 'transparent' : cfg.color }}
                />

                <div className="bg-app-card px-4 py-3">
                  {/* Fila principal */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base leading-none shrink-0">{cfg.icon}</span>
                      <span className={clsx(
                        'text-sm font-bold',
                        isDone ? 'line-through text-ink-4' : 'text-ink-1'
                      )}>
                        {cfg.label}
                      </span>
                    </div>

                    {/* Badges derecha */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={clsx(
                        'text-[10px] font-bold px-2 py-0.5 rounded-full',
                        task.cycle === 'flora' ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text'
                      )}>
                        {weekBadge}
                      </span>
                    </div>
                  </div>

                  {/* Detalle de productos */}
                  {detail && (
                    <p className={clsx(
                      'text-xs mt-1.5 leading-relaxed',
                      isDone ? 'text-ink-4' : 'text-ink-3'
                    )}>
                      {detail}
                    </p>
                  )}

                  {/* Planta + acción */}
                  <div className="flex items-center justify-between mt-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px]">🌿</span>
                      <span className="text-[11px] font-semibold text-ink-3 truncate max-w-[130px]">
                        {getPlantName(task.plantId)}
                      </span>
                    </div>

                    {!isDone && onComplete ? (
                      <button
                        onClick={() => onComplete(task.id)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all tap-highlight-none active:scale-95"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      >
                        Hecho ✓
                      </button>
                    ) : isDone ? (
                      <span className="text-[11px] font-semibold text-brand-400">Completado</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
