import DoseList from './DoseList'
import type { ScheduledTask } from '@/types/plant'
import { STAGE_LABELS, STAGE_EMOJIS } from '@/types/plant'

interface NutritionCardProps {
  task: ScheduledTask
  potVolumeLiters: number
}

export default function NutritionCard({ task, potVolumeLiters }: NutritionCardProps) {
  const weekLabel = task.cycle === 'vege' ? `Semana V${task.week}` : `Semana F${task.week}`
  const isFlora = task.cycle === 'flora'
  const emoji = STAGE_EMOJIS[task.stage] ?? '🌱'

  return (
    <div className="bg-app-card rounded-2xl border border-app-border shadow-card overflow-hidden">
      {/* Header con mini gradient */}
      <div
        className="px-4 pt-3 pb-3 flex items-center justify-between"
        style={{
          background: isFlora ? 'var(--gradient-flora-card)' : 'var(--gradient-vege-card)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{emoji}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wide ${isFlora ? 'text-flora-text' : 'text-brand-500'}`}>
              {weekLabel}
            </p>
            <p className="text-xs text-ink-3 mt-0.5">
              {STAGE_LABELS[task.stage] ?? task.stage}
            </p>
          </div>
        </div>
        {task.ecMin !== undefined && (
          <div className="text-right bg-white/60 rounded-xl px-3 py-2">
            <p className="text-[11px] font-semibold text-ink-2">EC {task.ecMin}–{task.ecMax}</p>
            <p className="text-[11px] text-ink-3">pH {task.phMin}–{task.phMax}</p>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="px-4 py-3.5">
        {task.products.length > 0 ? (
          <DoseList products={task.products} liters={potVolumeLiters} />
        ) : (
          <p className="text-sm text-ink-3 py-1 flex items-center gap-2">
            <span className="text-xl">💧</span>
            Solo agua — semana de limpieza
          </p>
        )}
      </div>
      <div className="px-4 pb-3">
        <p className="text-[11px] text-ink-4">Para {potVolumeLiters}L por maceta</p>
      </div>
    </div>
  )
}
