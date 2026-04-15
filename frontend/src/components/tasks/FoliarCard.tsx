import type { ScheduledTask } from '@/types/plant'

interface FoliarCardProps {
  task: ScheduledTask
  potVolumeLiters: number
  potCount?: number
}

/** Volumen estándar para spray foliar: 200–300 ml por m² — usamos 0.3L por planta como default */
const ML_POR_PLANTA = 0.3

export default function FoliarCard({ task, potCount = 1 }: FoliarCardProps) {
  const sprayLiters = (ML_POR_PLANTA * potCount).toFixed(1)
  const hasProducts = task.products.length > 0

  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between bg-gradient-to-r from-violet-50/60 to-app-card dark:from-violet-950/20">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🌫️</span>
          <div>
            <p className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wide">
              Foliar
            </p>
            <p className="text-xs text-ink-3 mt-0.5">
              Aplicar con luces apagadas o temprano
            </p>
          </div>
        </div>

        {task.phMin !== undefined && (
          <div className="text-right bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/50 rounded-xl px-3 py-2">
            <p className="text-[11px] font-bold text-violet-700 dark:text-violet-300">
              pH {task.phMin}–{task.phMax}
            </p>
            <p className="text-[11px] text-ink-4">Spray</p>
          </div>
        )}
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-3">Volumen de spray</span>
          <span className="text-sm font-black text-ink-1 tabular">~{sprayLiters} L</span>
        </div>

        {potCount > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-3">Plantas</span>
            <span className="text-sm text-ink-2 tabular">{potCount} × {ML_POR_PLANTA}L</span>
          </div>
        )}

        {/* Productos foliares si hay */}
        {hasProducts && (
          <div className="mt-1 space-y-1.5">
            {task.products.map((p) => (
              <div key={p.name} className="flex items-center justify-between bg-violet-50/60 dark:bg-violet-950/20 rounded-xl px-3 py-2">
                <span className="text-xs font-semibold text-ink-2">{p.name}</span>
                <span className="text-xs font-bold text-violet-700 dark:text-violet-300 tabular">
                  {(p.maxDose * parseFloat(sprayLiters)).toFixed(1)} {p.unit}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Reminder */}
        <div className="flex items-center gap-2 mt-1 bg-violet-50/60 dark:bg-violet-950/20 rounded-xl px-3 py-2.5">
          <span className="text-base">💡</span>
          <p className="text-xs text-ink-2 leading-relaxed">
            Cubrir toda la hoja por ambas caras. Evitar goteo al sustrato.
          </p>
        </div>
      </div>
    </div>
  )
}
