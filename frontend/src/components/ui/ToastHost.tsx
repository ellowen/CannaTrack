import { clsx } from 'clsx'
import { useToastStore } from '@/store/toastStore'

export default function ToastHost() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none safe-bottom">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={clsx(
            'pointer-events-auto w-full max-w-md rounded-xl px-4 py-3 text-sm font-medium shadow-card-md flex items-start gap-3',
            toast.variant === 'error' && 'bg-red-600 text-white',
            toast.variant === 'success' && 'bg-brand-500 text-white',
            toast.variant === 'info' && 'bg-app-elevated border border-app-border text-ink-1'
          )}
        >
          <span className="flex-1 leading-relaxed">{toast.text}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            aria-label="Cerrar"
            className="shrink-0 opacity-80 hover:opacity-100 tap-highlight-none"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
