import type { Plant, ScheduledTask } from '@/types/plant'

interface PlantTaskGroupProps {
  plant: Plant | undefined
  tasks: ScheduledTask[]
  /** "V2 · D13" ya resuelto por quien conoce el ciclo; vacio si no aplica (cultivos no-cannabis). */
  phaseLabel: string
  isFlora: boolean
  completingIds: Set<string>
  /** Abre la hoja de la tarea (receta, EC/pH, notas, cancelar/mover). */
  onOpen: (task: ScheduledTask) => void
  /** Marca hecha sin pasar por la hoja. */
  onQuickComplete: (task: ScheduledTask) => void
  onCompleteAll: (tasks: ScheduledTask[]) => void
  onOpenPlant: () => void
  renderIcon: (type: string) => React.ReactNode
  typeLabel: Record<string, string>
  typeColor: Record<string, string>
}

const fmtRange = (min?: number, max?: number) =>
  min == null ? '' : `${min}${max != null && max !== min ? `-${max}` : ''}`

/** Una linea corta con lo esencial de la tarea: EC/pH y productos con su dosis. */
function summary(task: ScheduledTask): string {
  const parts: string[] = []
  if (task.ecMin != null) parts.push(`EC ${fmtRange(task.ecMin, task.ecMax)}`)
  if (task.phMin != null) parts.push(`pH ${fmtRange(task.phMin, task.phMax)}`)
  const prods = (task.products ?? []).map((p) => `${p.name} ${fmtRange(p.minDose, p.maxDose)}${p.unit ?? 'ml'}/L`)
  return [...parts, ...prods].join(' · ')
}

/**
 * Todo lo pendiente de una planta en una sola tarjeta: la planta se nombra una
 * vez, cada tarea es una fila de un toque (check) y "Todo" resuelve la planta entera.
 */
export default function PlantTaskGroup({
  plant, tasks, phaseLabel, isFlora, completingIds,
  onOpen, onQuickComplete, onCompleteAll, onOpenPlant, renderIcon, typeLabel, typeColor,
}: PlantTaskGroupProps) {
  const name = plant?.name ?? '—'
  return (
    <div data-testid="plant-task-group">
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-1.5">
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: isFlora ? '#D9A441' : '#5CC76C' }} />
        <button onClick={onOpenPlant} className="min-w-0 flex-1 text-left tap-highlight-none">
          <h3 className="text-base text-ink-1 leading-tight truncate">{name}</h3>
          {phaseLabel && <p className="text-[11px] text-ink-3 tracking-wide mt-0.5">{phaseLabel}</p>}
        </button>
        {tasks.length > 1 && (
          <button
            onClick={() => onCompleteAll(tasks)}
            aria-label={`Marcar todo hecho en ${name}`}
            className="shrink-0 text-xs font-bold text-brand-text bg-brand-subtle border border-brand-border px-3 py-1.5 rounded-full tap-highlight-none active:scale-95 transition-all"
          >
            ✓ Todo
          </button>
        )}
      </div>

      {tasks.map((task) => {
        const line = summary(task)
        return (
          <div
            key={task.id}
            className={`flex items-center gap-3 pl-4 pr-3 py-2 ${completingIds.has(task.id) ? 'task-completing' : ''}`}
          >
            <button
              onClick={() => onOpen(task)}
              aria-label={`${typeLabel[task.type] ?? task.type} de ${name}: ver detalle`}
              className="flex-1 min-w-0 flex items-center gap-3 text-left tap-highlight-none py-1"
            >
              {renderIcon(task.type)}
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight" style={{ color: typeColor[task.type] }}>
                  {typeLabel[task.type] ?? task.type}
                </span>
                {line && <span className="block text-[11px] text-ink-3 leading-snug truncate">{line}</span>}
              </span>
            </button>
            <button
              onClick={() => onQuickComplete(task)}
              aria-label={`${typeLabel[task.type] ?? task.type} de ${name}: marcar hecha`}
              className="shrink-0 w-11 h-11 rounded-full border border-brand-border bg-brand-subtle text-brand-text flex items-center justify-center tap-highlight-none active:scale-90 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            </button>
          </div>
        )
      })}
      <div className="h-1.5" />
    </div>
  )
}
