import { useRef } from 'react'
import { useUserStore } from '@/store/userStore'
import type { WeekLog } from '@/types/weekLog'

interface PhotoGalleryProps {
  logs: WeekLog[]
  onAddPhoto: (photoDataUrl: string, logDate?: Date) => void
  onDeletePhoto: (logId: string) => void
}

export default function PhotoGallery({ logs, onAddPhoto, onDeletePhoto }: PhotoGalleryProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const plan = useUserStore((s) => s.plan)
  const photosOnly = logs.filter((l) => l.photoDataUrl || l.photoUrl)

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      if (evt.target?.result) {
        onAddPhoto(evt.target.result as string, new Date())
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload button — solo Pro */}
      {plan === 'pro' ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-2xl border-2 border-dashed border-app-border p-6 text-center tap-highlight-none active:scale-[0.98] transition-all hover:border-brand-border group"
        >
          <p className="text-3xl mb-2">📷</p>
          <p className="text-sm font-semibold text-ink-3 group-hover:text-ink-2 transition-colors">
            Agregar foto
          </p>
          <p className="text-xs text-ink-4 mt-1">Foto semanal de tu cultivo</p>
        </button>
      ) : (
        <div className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
          <p className="text-3xl mb-2">🔒</p>
          <p className="text-sm font-bold text-amber-400">Fotos del cultivo — Plan Pro</p>
          <p className="text-xs text-ink-3 mt-1">Actualizate a Pro para subir fotos semanales de tus plantas</p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Photo grid */}
      {photosOnly.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-ink-3 uppercase tracking-widest">
            📸 Galería ({photosOnly.length})
          </p>
          <div className="grid grid-cols-2 gap-3">
            {photosOnly.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.photoDataUrl ?? photo.photoUrl}
                  alt={`Foto - ${photo.weekLabel}`}
                  className="w-full aspect-square object-cover rounded-xl border border-app-border shadow-card"
                />
                <button
                  onClick={() => onDeletePhoto(photo.id)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-500/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity tap-highlight-none active:scale-90"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
