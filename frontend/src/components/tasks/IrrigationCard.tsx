import type { ScheduledTask } from '@/types/plant'

interface IrrigationCardProps {
  task: ScheduledTask
  potVolumeLiters: number
  potCount?: number
}

export default function IrrigationCard({ task, potVolumeLiters, potCount = 1 }: IrrigationCardProps) {
  const totalLiters = potVolumeLiters * potCount
  const isFlushing  = task.stage === 'flushing'

  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between bg-gradient-to-r from-blue-50/60 to-app-card dark:from-blue-950/20">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">💧</span>
          <div>
            <p className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">
              {isFlushing ? 'Limpieza' : 'Riego'}
            </p>
            <p className="text-xs text-ink-3 mt-0.5">
              {isFlushing ? 'Solo agua — sin nutrientes' : 'Agua sin nutrientes'}
            </p>
          </div>
        </div>

        {task.phMin !== undefined && (
          <div className="text-right bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 rounded-xl px-3 py-2">
            <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">
              pH {task.phMin}–{task.phMax}
            </p>
            <p className="text-[11px] text-ink-4">Ajustar agua</p>
          </div>
        )}
      </div>

      {/* Cuerpo */}
      <div className="px-4 py-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-3">Volumen a preparar</span>
          <span className="text-sm font-black text-ink-1 tabular">{totalLiters} L</span>
        </div>

        {potCount > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-3">Distribución</span>
            <span className="text-sm text-ink-2 tabular">{potCount} × {potVolumeLiters}L</span>
          </div>
        )}

        {task.phMin !== undefined && (
          <div className="flex items-center gap-2 mt-1 bg-blue-50/60 dark:bg-blue-950/20 rounded-xl px-3 py-2.5">
            <span className="text-base">🧪</span>
            <p className="text-xs text-ink-2 leading-relaxed">
              Ajustar pH del agua entre <span className="font-bold text-ink-1">{task.phMin}</span> y <span className="font-bold text-ink-1">{task.phMax}</span> antes de regar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
