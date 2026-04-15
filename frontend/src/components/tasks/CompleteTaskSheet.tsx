import { useState, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import type { ScheduledTask } from '@/types/plant'
import { hapticSuccess, hapticLight } from '@/lib/haptics'
import { useSwipeToDismiss } from '@/hooks/useSwipeToDismiss'

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

interface CompleteTaskSheetProps {
  task: ScheduledTask | null   // null = cerrado
  onConfirm: (taskId: string, notes?: string) => void
  onClose: () => void
}

export default function CompleteTaskSheet({ task, onConfirm, onClose }: CompleteTaskSheetProps) {
  const [notes, setNotes] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isOpen = task !== null
  const { sheetRef, onTouchStart, onTouchMove, onTouchEnd } = useSwipeToDismiss({ onDismiss: onClose })

  // Limpiar notas al abrir con nueva tarea
  useEffect(() => {
    if (task) {
      setNotes('')
      // Focus en textarea con pequeño delay para que la animación termine
      setTimeout(() => textareaRef.current?.focus(), 250)
    }
  }, [task?.id])

  // Cerrar con backdrop click
  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleConfirm(skipNotes = false) {
    if (!task) return
    hapticSuccess()
    onConfirm(task.id, skipNotes ? undefined : (notes.trim() || undefined))
    onClose()
  }

  if (!isOpen) return null

  const icon  = TYPE_ICON[task.type]  ?? '📌'
  const label = TYPE_LABEL[task.type] ?? task.type
  const weekBadge = task.cycle === 'vege' ? `V${task.week}` : `F${task.week}`

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
        <div className="bg-app-card rounded-t-3xl border-t border-app-border shadow-card-lg px-5 pt-4 pb-8"
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
                <span className="text-xs text-ink-4">¿Querés dejar una nota?</span>
              </div>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="EC real, observaciones, estado de la planta... (opcional)"
            rows={3}
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
              {notes.trim() ? 'Guardar nota ✓' : 'Confirmar ✓'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
