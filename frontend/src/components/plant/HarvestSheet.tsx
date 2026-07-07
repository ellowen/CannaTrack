import { useState } from 'react'
import { format, differenceInDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { useTaskStore } from '@/store/taskStore'
import { useMeasurements } from '@/hooks/useMeasurements'
import { hapticSuccess, hapticWarning } from '@/lib/haptics'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import type { Plant } from '@/types/plant'

interface HarvestSheetProps {
  plant: Plant
  onConfirmHarvest: () => void
  onConfirmDiscard: () => void
  onClose: () => void
}

export default function HarvestSheet({
  plant,
  onConfirmHarvest,
  onConfirmDiscard,
  onClose,
}: HarvestSheetProps) {
  const [tab, setTab] = useState<'harvest' | 'discard'>('harvest')
  const { tasks } = useTaskStore()
  const { logs } = useMeasurements(plant.id)

  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToDismiss({ onDismiss: onClose })

  const plantTasks = tasks.filter((t) => t.plantId === plant.id)
  const completed  = plantTasks.filter((t) => t.completed).length
  const total      = plantTasks.length
  const pct        = total > 0 ? Math.round((completed / total) * 100) : 0

  const today = new Date()
  const growDays = differenceInDays(today, plant.startDate)

  const avgEc = logs.length > 0
    ? (logs.reduce((s, l) => s + l.ec, 0) / logs.length).toFixed(2)
    : null
  const avgPh = logs.length > 0
    ? (logs.reduce((s, l) => s + l.ph, 0) / logs.length).toFixed(2)
    : null

  function confirm() {
    if (tab === 'harvest') {
      hapticSuccess()
      onConfirmHarvest()
    } else {
      hapticWarning()
      onConfirmDiscard()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] lightbox-in" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg page-enter-up"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="bg-app-card rounded-t-3xl border-t border-app-border shadow-card-lg px-5 pt-4 overflow-y-auto max-h-[90vh]"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-app-border mx-auto mb-5" />

          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="text-lg font-black text-ink-1 leading-tight">{plant.name}</h2>
              <p className="text-xs text-ink-3 mt-0.5">{plant.genetics}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-app-elevated flex items-center justify-center text-ink-4 tap-highlight-none active:scale-90 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Stats del grow */}
          <div className="grid grid-cols-4 gap-2 mb-5">
            {[
              { value: `${growDays}d`, label: 'Grow total' },
              { value: `${pct}%`, label: 'Tareas ✓' },
              { value: avgEc ?? '—', label: 'EC media' },
              { value: avgPh ?? '—', label: 'pH medio' },
            ].map(({ value, label }) => (
              <div key={label} className="bg-app-elevated rounded-2xl border border-app-border p-3 text-center">
                <p className="text-lg font-black text-ink-1 tabular leading-none">{value}</p>
                <p className="text-[10px] text-ink-4 font-semibold mt-1 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Timeline mínima */}
          <div className="flex items-center gap-2 mb-5 text-xs text-ink-3">
            <span className="font-medium">
              📅 {format(plant.startDate, "d MMM yyyy", { locale: es })}
            </span>
            <div className="flex-1 h-px bg-app-border" />
            <span className="font-medium">
              🌸 {format(today, "d MMM yyyy", { locale: es })}
            </span>
          </div>

          {/* Tabs: Cosechar vs Descartar */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTab('harvest')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all tap-highlight-none active:scale-95 ${
                tab === 'harvest'
                  ? 'bg-brand-400 text-white shadow-glow-brand'
                  : 'bg-app-elevated border border-app-border text-ink-3'
              }`}
            >
              ✂️ Cosechar
            </button>
            <button
              onClick={() => setTab('discard')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all tap-highlight-none active:scale-95 ${
                tab === 'discard'
                  ? 'bg-red-500 text-white'
                  : 'bg-app-elevated border border-app-border text-ink-3'
              }`}
            >
              🗑️ Descartar
            </button>
          </div>

          {/* Descripción */}
          <p className="text-xs text-ink-3 mb-4 leading-relaxed">
            {tab === 'harvest'
              ? '🎉 ¡Excelente trabajo! La planta pasará al historial de cosechas.'
              : '⚠️ La planta se marcará como descartada. No se puede deshacer.'}
          </p>

          {/* Confirmar */}
          <button
            onClick={confirm}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all ${
              tab === 'harvest'
                ? 'bg-brand-400 text-white shadow-glow-brand'
                : 'bg-red-500 text-white'
            }`}
          >
            {tab === 'harvest' ? '✂️ Confirmar cosecha' : '🗑️ Confirmar descarte'}
          </button>
        </div>
      </div>
    </div>
  )
}
