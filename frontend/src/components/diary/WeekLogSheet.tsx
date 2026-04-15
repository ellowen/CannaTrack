import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { WeekLog } from '@/types/weekLog'
import { resizeImageFile } from '@/lib/image-utils'

interface WeekLogSheetProps {
  isOpen: boolean
  weekLabel: string
  /** Pre-fill when editing an existing log */
  existing?: WeekLog
  onSave: (data: { notes: string; photoDataUrl?: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export default function WeekLogSheet({
  isOpen,
  weekLabel,
  existing,
  onSave,
  onDelete,
  onClose,
}: WeekLogSheetProps) {
  const [notes, setNotes] = useState('')
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [loadingPhoto, setLoadingPhoto] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Sync form state when sheet opens
  useEffect(() => {
    if (isOpen) {
      setNotes(existing?.notes ?? '')
      setPhoto(existing?.photoDataUrl)
    }
  }, [isOpen, existing])

  // Lock body scroll
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingPhoto(true)
    try {
      const dataUrl = await resizeImageFile(file)
      setPhoto(dataUrl)
    } finally {
      setLoadingPhoto(false)
      // Reset so the same file can be selected again
      e.target.value = ''
    }
  }

  function handleSave() {
    onSave({ notes: notes.trim(), photoDataUrl: photo })
    onClose()
  }

  const isFlora = weekLabel.startsWith('FLORA')
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es })

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="bg-app-card rounded-t-3xl shadow-card-lg overflow-hidden">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-app-border" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-app-border">
            <div>
              <span
                className="inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full text-white"
                style={{ background: isFlora ? 'var(--gradient-flora)' : 'var(--gradient-vege)' }}
              >
                {weekLabel}
              </span>
              <p className="text-xs text-ink-3 mt-1 capitalize">{today}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-app-elevated flex items-center justify-center text-ink-3 tap-highlight-none active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Photo picker */}
            <div>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Foto de la semana</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-2xl border-2 border-dashed overflow-hidden tap-highlight-none active:scale-[0.98] transition-all"
                style={{ borderColor: photo ? 'transparent' : 'var(--app-border)' }}
              >
                {loadingPhoto ? (
                  <div className="aspect-[4/3] flex items-center justify-center bg-app-elevated">
                    <span className="text-2xl animate-pulse">📷</span>
                  </div>
                ) : photo ? (
                  <div className="relative aspect-[4/3]">
                    <img src={photo} alt="Foto semana" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 hover:opacity-100 text-white text-xs font-semibold bg-black/40 px-3 py-1.5 rounded-xl transition-opacity">
                        Cambiar foto
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] flex flex-col items-center justify-center gap-2 bg-app-elevated">
                    <span className="text-3xl">📷</span>
                    <span className="text-xs text-ink-3 font-medium">Tocar para agregar foto</span>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto(undefined)}
                  className="mt-1.5 text-xs text-ink-4 hover:text-red-500 transition-colors"
                >
                  Quitar foto
                </button>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2 block">
                Notas de la semana
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="¿Cómo va la planta? Altura, observaciones, problemas detectados..."
                rows={4}
                className="w-full rounded-xl border border-app-border bg-app-elevated text-ink-1 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-border placeholder:text-ink-4 transition-colors resize-none"
              />
            </div>

            {/* Actions */}
            <div className="space-y-2 pb-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!notes.trim() && !photo}
                className="w-full py-3.5 rounded-xl bg-brand-400 text-white font-bold text-sm tap-highlight-none active:scale-[0.98] transition-all shadow-glow-brand disabled:opacity-40 disabled:pointer-events-none"
              >
                {existing ? '✓ Guardar cambios' : '✓ Guardar entrada'}
              </button>
              {onDelete && existing && (
                <button
                  type="button"
                  onClick={() => { onDelete(); onClose() }}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors tap-highlight-none active:scale-[0.98]"
                >
                  Eliminar entrada
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
