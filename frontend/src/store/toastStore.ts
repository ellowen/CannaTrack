import { create } from 'zustand'

export type ToastVariant = 'error' | 'success' | 'info'

export interface ToastMessage {
  id: string
  text: string
  variant: ToastVariant
}

interface ToastState {
  toasts: ToastMessage[]
  show: (text: string, variant?: ToastVariant) => void
  dismiss: (id: string) => void
}

const TOAST_DURATION_MS = 5000

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  show: (text, variant = 'error') => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, text, variant }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// Punto unico para reportar errores visibles al usuario desde fuera de
// componentes React (hooks, lib/sync.ts, etc.) -- mismo patron que el
// resto de la app usa con `useXStore.getState()` para leer/escribir
// estado desde codigo no-componente.
export function showErrorToast(text: string): void {
  useToastStore.getState().show(text, 'error')
}

export function showSuccessToast(text: string): void {
  useToastStore.getState().show(text, 'success')
}
