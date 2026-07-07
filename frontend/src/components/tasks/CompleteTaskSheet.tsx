import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useMeasurementStore } from '@/store/measurementStore'
import { usePlantStore } from '@/store/plantStore'
import { useUserStore } from '@/store/userStore'
import { syncMeasurementToSupabase } from '@/lib/sync'
import { useNutritionStore } from '@/store/nutritionStore'
import { getLineColor, getLineName } from '@/lib/nutrition-utils'
import { XP } from '@/lib/gamification'

const TYPE_LABEL: Record<string, string> = {
  nutrition:   'Nutrición',
  irrigation:  'Riego',
  observation: 'Observación',
  foliar:      'Foliar',
  harvest:     'Cosecha',
}
const TYPE_ICON: Record<string, string> = {
  nutrition:   '🍃',
  irrigation:  '💧',
  observation: '🔍',
  foliar:      '🌫️',
  harvest:     '✂️',
}

/** Tipos de tarea donde tiene sentido registrar EC/pH */
const MEASUREMENT_TYPES = new Set(['nutrition', 'irrigation'])

/** Tipos de tarea donde mostramos la receta de productos */
const RECIPE_TYPES = new Set(['nutrition', 'foliar'])

function fmt(n: number) {
  return parseFloat(n.toFixed(1)).toString()
}

interface CompleteTaskSheetProps {
  task: ScheduledTask | null
  onConfirm: (taskId: string, notes?: string) => void
  onClose: () => void
}

export default function CompleteTaskSheet({ task, onConfirm, onClose }: CompleteTaskSheetProps) {
  const [notes, setNotes]         = useState('')
  const [ec, setEc]               = useState('')
  const [ph, setPh]               = useState('')
  const [recipeOpen, setRecipeOpen] = useState(false)
  const [xpReward, setXpReward]   = useState<{ xpGained: number; streakBonus: number; newStreak: number } | null>(null)
  const textareaRef               = useRef<HTMLTextAreaElement>(null)
  const addMeasurement            = useMeasurementStore((s) => s.addLog)
  const addXP                     = useUserStore((s) => s.addXP)
  const userId                    = useUserStore((s) => s.userId)
  const plants                    = usePlantStore((s) => s.plants)
  const nutritionTables           = useNutritionStore((s) => s.tables)
  const plant                     = task ? plants.find((p) => p.id === task.plantId) : undefined
  const table                     = plant ? nutritionTables.find((t) => t.id === plant.nutritionTableId) : undefined

  const isOpen        = task !== null
  const showMeasure   = task ? MEASUREMENT_TYPES.has(task.type) : false
  const showRecipe    = task ? RECIPE_TYPES.has(task.type) && task.products.length > 0 : false
  const liters        = plant ? (plant.potVolumeLiters ?? 10) * plant.potCount : 10
  const ecNum         = parseFloat(ec)
  const phNum         = parseFloat(ph)
  const hasMeasure    = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0

  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToDismiss({ onDismiss: onClose })

  useEffect(() => {
    if (task) {
      setNotes(''); setEc(''); setPh('')
      setRecipeOpen(false)
      setXpReward(null)
      setTimeout(() => textareaRef.current?.focus(), 250)
    }
  }, [task?.id])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleConfirm(skipAll = false) {
    if (!task) return
    hapticSuccess()

    if (!skipAll && hasMeasure) {
      const log = addMeasurement({ plantId: task.plantId, logDate: new Date(), ec: ecNum, ph: phNum })
      if (userId) void syncMeasurementToSupabase(log, userId)
    }

    const baseXP = !skipAll && hasMeasure ? XP.COMPLETE_WITH_MEASUREMENT : XP.COMPLETE_TASK
    const reward = addXP(baseXP)
    setXpReward(reward)

    onConfirm(task.id, skipAll ? undefined : (notes.trim() || undefined))

    // Resetear xpReward antes de cerrar para evitar el flash en la proxima apertura
    setTimeout(() => { setXpReward(null); onClose() }, 1400)
  }

  if (!isOpen) return null

  const icon = TYPE_ICON[task.type] ?? '📌'
  const label     = TYPE_LABEL[task.type] ?? task.type
  const weekBadge = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`

  // Feedback de rango
  function ecStatus() {
    if (!hasMeasure || !task?.ecMin) return null
    return ecNum >= task.ecMin && ecNum <= (task.ecMax ?? 99)  ? 'ok'
         : Math.abs(ecNum - (ecNum < task.ecMin ? task.ecMin : task.ecMax ?? task.ecMin)) < 0.3 ? 'warn'
         : 'bad'
  }
  function phStatus() {
    if (!hasMeasure || !task?.phMin) return null
    return phNum >= task.phMin && phNum <= (task.phMax ?? 99) ? 'ok'
         : Math.abs(phNum - (phNum < task.phMin ? task.phMin : task.phMax ?? task.phMin)) < 0.3 ? 'warn'
         : 'bad'
  }

  const statusColors = { ok: 'text-brand-400', warn: 'text-amber-500', bad: 'text-red-500' }
  const statusIcons  = { ok: '✓', warn: '~', bad: '✕' }

  const ec_st = ecStatus()
  const ph_st = phStatus()

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center"
      style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom, 0px) + 4rem)' }}
      onClick={xpReward ? onClose : handleBackdrop}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] lightbox-in" />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="relative w-full max-w-lg page-enter-up"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="bg-app-card rounded-t-3xl border-t border-app-border shadow-card-lg overflow-hidden">

          {/* XP reward — overlay absoluto */}
          {xpReward && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center bg-app-card rounded-t-3xl xp-reward-in z-10 cursor-pointer"
              onClick={onClose}
            >
              <div className="text-5xl mb-3 animate-bounce-once">✅</div>
              <p className="text-2xl font-black text-ink-1 mb-1">Tarea completada</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-3xl font-black text-brand-400 xp-pop">
                  +{xpReward.xpGained} XP
                </span>
              </div>
              {xpReward.streakBonus > 0 && (
                <p className="text-sm font-bold text-amber-500 mt-2">
                  🔥 Bonus de racha +{xpReward.streakBonus} XP
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-3 bg-app-elevated rounded-full px-4 py-2">
                <span className="text-lg">🔥</span>
                <span className="text-sm font-bold text-ink-1">
                  {xpReward.newStreak} {xpReward.newStreak === 1 ? 'día' : 'días'} seguidos
                </span>
              </div>
            </div>
          )}

          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-app-border mx-auto mt-4 mb-0" />

          {/* Contenido scrolleable — max-height = 80vh menos el espacio de los botones (~90px) */}
          <div
            className="overflow-y-auto px-5 pt-4 pb-2"
            style={{ maxHeight: 'calc(80vh - 90px)' }}
          >
            {/* Título */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-2xl">{icon}</span>
              <div>
                <p className="text-base font-black text-ink-1">{label} completada ✓</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                    task.cycle === 'flora' ? 'bg-flora-bg text-flora-text' : 'bg-vege-bg text-vege-text'
                  )}>
                    {weekBadge}
                  </span>
                  {task.ecMin && (
                    <span className="text-[10px] text-ink-4">
                      Objetivo: EC {task.ecMin}–{task.ecMax} · pH {task.phMin}–{task.phMax}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Receta */}
            {showRecipe && task && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setRecipeOpen((v) => !v)}
                  className="w-full flex items-center justify-between py-2 tap-highlight-none"
                >
                  <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">
                    🧪 Receta · {task.products.length} producto{task.products.length > 1 ? 's' : ''}
                  </p>
                  <svg
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                    className={`w-3.5 h-3.5 text-ink-4 transition-transform duration-200 ${recipeOpen ? 'rotate-180' : ''}`}
                  >
                    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {recipeOpen && (
                  <div className="bg-app-elevated rounded-2xl border border-app-border overflow-hidden task-in">
                    <p className="text-[10px] font-semibold text-ink-4 px-3.5 pt-2.5 pb-1">
                      Para {fmt(liters)}L ({plant?.potCount ?? 1} maceta{(plant?.potCount ?? 1) > 1 ? 's' : ''} × {plant?.potVolumeLiters ?? 10}L)
                    </p>
                    {task.products.map((p) => {
                      const minVol = fmt(p.minDose * liters)
                      const maxVol = fmt(p.maxDose * liters)
                      return (
                        <div key={p.name} className="flex items-center gap-2.5 px-3.5 py-2.5 border-t border-app-border first:border-t-0">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${getLineColor(p.line, table)}`}>
                            {getLineName(p.line, table)}
                          </span>
                          <span className="text-xs font-semibold text-ink-2 flex-1 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-ink-1 tabular shrink-0">
                            {minVol === maxVol ? `${minVol}` : `${minVol}–${maxVol}`} {p.unit}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* EC / pH */}
            {showMeasure && (
              <div className="mb-4">
                <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2.5">
                  💧 Medición (opcional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center justify-between">
                      <span>EC</span>
                      {ec_st && <span className={`font-bold ${statusColors[ec_st]}`}>{statusIcons[ec_st]} {ec_st === 'ok' ? 'Ideal' : ec_st === 'warn' ? 'Cerca' : 'Fuera'}</span>}
                    </label>
                    <input
                      type="number" inputMode="decimal" step="0.1" min="0" max="5"
                      value={ec} onChange={(e) => setEc(e.target.value)}
                      placeholder="1.2"
                      className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-3 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border tabular"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center justify-between">
                      <span>pH</span>
                      {ph_st && <span className={`font-bold ${statusColors[ph_st]}`}>{statusIcons[ph_st]} {ph_st === 'ok' ? 'Ideal' : ph_st === 'warn' ? 'Cerca' : 'Fuera'}</span>}
                    </label>
                    <input
                      type="number" inputMode="decimal" step="0.1" min="4" max="9"
                      value={ph} onChange={(e) => setPh(e.target.value)}
                      placeholder="6.2"
                      className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-3 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border tabular"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={showMeasure ? 'Observaciones adicionales... (opcional)' : 'Observaciones, estado de la planta... (opcional)'}
              rows={2}
              className="w-full rounded-2xl border border-app-border bg-app-elevated text-ink-1 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border placeholder:text-ink-4 transition-colors"
            />
          </div>

          {/* Botones — siempre visibles, fuera del scroll */}
          <div className="px-5 pt-3 pb-5 border-t border-app-border">
            <div className="flex gap-3">
              <button
                onClick={() => { hapticLight(); handleConfirm(true) }}
                className="flex-1 py-3.5 rounded-2xl border border-app-border text-sm font-semibold text-ink-3 bg-app-elevated tap-highlight-none active:scale-95 transition-all"
              >
                Saltar
              </button>
              <button
                onClick={() => handleConfirm(false)}
                className="flex-[2] py-3.5 rounded-2xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand"
              >
                {hasMeasure ? 'Guardar EC/pH ✓' : notes.trim() ? 'Guardar nota ✓' : 'Confirmar ✓'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
