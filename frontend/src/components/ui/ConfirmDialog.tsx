import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/** Confirmacion para acciones masivas (varias tareas de una vez). Portal: queda por encima de la barra de navegacion. */
export default function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel }: ConfirmDialogProps) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px] lightbox-in" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="relative w-full max-w-sm bg-app-card border border-app-border rounded-3xl shadow-card-lg p-5 xp-reward-in"
      >
        <h2 id="confirm-title" className="text-lg text-ink-1">{title}</h2>
        <p className="text-sm text-ink-3 mt-1.5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-app-elevated border border-app-border text-sm font-bold text-ink-2 tap-highlight-none active:scale-[0.98] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-brand-400 text-white text-sm font-bold tap-highlight-none active:scale-[0.98] transition-all"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
