import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'
import { useMeasurementStore } from '@/store/measurementStore'

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

interface CompleteTaskSheetProps {
  task: ScheduledTask | null
  onConfirm: (taskId: string, notes?: string) => void
  onClose: () => void
}

export default function CompleteTaskSheet({ task, onConfirm, onClose }: CompleteTaskSheetProps) {
  const [notes, setNotes]   = useState('')
  const [ec, setEc]         = useState('')
  const [ph, setPh]         = useState('')
  const textareaRef         = useRef<HTMLTextAreaElement>(null)
  const addMeasurement      = useMeasurementStore((s) => s.addLog)

  const isOpen        = task !== null
  const showMeasure   = task ? MEASUREMENT_TYPES.has(task.type) : false
  const ecNum         = parseFloat(ec)
  const phNum         = parseFloat(ph)
  const hasMeasure    = !isNaN(ecNum) && ecNum > 0 && !isNaN(phNum) && phNum > 0

  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } =
    useSwipeToDismiss({ onDismiss: onClose })

  useEffect(() => {
    if (task) {
      setNotes(''); setEc(''); setPh('')
      setTimeout(() => textareaRef.current?.focus(), 250)
    }
  }, [task?.id])

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleConfirm(skipAll = false) {
    if (!task) return
    hapticSuccess()

    // Guardar medición EC/pH si fue ingresada
    if (!skipAll && hasMeasure) {
      addMeasurement({ plantId: task.plantId, logDate: new Date(), ec: ecNum, ph: phNum })
    }

    onConfirm(task.id, skipAll ? undefined : (notes.trim() || undefined))
    onClose()
  }

  if (!isOpen) return null

  const icon      = TYPE_ICON[task.type]  ?? '📌'
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
      onClick={handleBackdrop}
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
        <div
          className="bg-app-card rounded-t-3xl border-t border-app-border shadow-card-lg px-5 pt-4"
          style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)' }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-app-border mx-auto mb-5" />

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

          {/* EC / pH — solo para riego y nutrición */}
          {showMeasure && (
            <div className="mb-4">
              <p className="text-xs font-bold text-ink-3 uppercase tracking-widest mb-2.5">
                💧 Medición (opcional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {/* EC */}
                <div>
                  <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center justify-between">
                    <span>EC</span>
                    {ec_st && (
                      <span className={`font-bold ${statusColors[ec_st]}`}>
                        {statusIcons[ec_st]} {ec_st === 'ok' ? 'Ideal' : ec_st === 'warn' ? 'Cerca' : 'Fuera'}
                      </span>
                    )}
                  </label>
                  <input
                    type="number" inputMode="decimal" step="0.1" min="0" max="5"
                    value={ec} onChange={(e) => setEc(e.target.value)}
                    placeholder="1.2"
                    className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-3 py-3 text-xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-brand-border focus:border-brand-border tabular"
                  />
                </div>
                {/* pH */}
                <div>
                  <label className="text-xs font-semibold text-ink-2 mb-1.5 flex items-center justify-between">
                    <span>pH</span>
                    {ph_st && (
                      <span className={`font-bold ${statusColors[ph_st]}`}>
                        {statusIcons[ph_st]} {ph_st === 'ok' ? 'Ideal' : ph_st === 'warn' ? 'Cerca' : 'Fuera'}
                      </span>
                    )}
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

          {/* Acciones */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => { hapticLight(); handleConfirm(true) }}
              className="flex-1 py-3 rounded-2xl border border-app-border text-sm font-semibold text-ink-3 bg-app-elevated tap-highlight-none active:scale-95 transition-all"
            >
              Saltar
            </button>
            <button
              onClick={() => handleConfirm(false)}
              className="flex-[2] py-3 rounded-2xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand"
            >
              {hasMeasure ? 'Guardar EC/pH ✓' : notes.trim() ? 'Guardar nota ✓' : 'Confirmar ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
