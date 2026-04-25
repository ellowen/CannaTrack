import { useSync } from '@/hooks/useSync'
import { useEffect, useState } from 'react'

type SyncState = 'idle' | 'syncing' | 'success' | 'error'

/**
 * SyncStatus - Toast-like component en esquina inferior derecha.
 * Muestra:
 * - Spinner mientras syncroniza
 * - Checkmark cuando sync completa (desaparece en 2s)
 * - Error con botón retry si falla
 * - Siempre visible si hay items pending o error
 */
export function SyncStatus() {
  const { isSyncing, lastSync, syncError, pendingCount, sync } = useSync()
  const [state, setState] = useState<SyncState>('idle')
  const [showSuccess, setShowSuccess] = useState(false)
  const [formatTime, setFormatTime] = useState<string | null>(null)

  // Determinar estado visual
  useEffect(() => {
    if (syncError) {
      setState('error')
    } else if (isSyncing) {
      setState('syncing')
      setShowSuccess(false)
    } else if (showSuccess) {
      setState('success')
      // Auto-hide success después de 2 segundos
      const timer = setTimeout(() => setShowSuccess(false), 2000)
      return () => clearTimeout(timer)
    } else {
      setState('idle')
    }
  }, [isSyncing, syncError, showSuccess])

  // Actualizar lastSync con formato legible
  useEffect(() => {
    if (!lastSync) {
      setFormatTime(null)
      return
    }

    const diff = Date.now() - lastSync.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) {
      setFormatTime(`${minutes}m ago`)
    } else if (seconds > 0) {
      setFormatTime(`${seconds}s ago`)
    } else {
      setFormatTime('just now')
    }
  }, [lastSync])

  // Mostrar success cuando sync completa
  useEffect(() => {
    if (lastSync && !isSyncing && !syncError && pendingCount === 0) {
      setShowSuccess(true)
    }
  }, [lastSync, isSyncing, syncError, pendingCount])

  // No mostrar nada si todo está sincronizado y no hay errores
  if (state === 'idle' && !showSuccess) return null

  const handleRetry = async () => {
    try {
      await sync()
    } catch (error) {
      console.error('Retry failed:', error)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Syncing state - spinner */}
      {state === 'syncing' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-blue-50 border border-blue-200">
          <div className="flex-shrink-0">
            <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-blue-900">Sincronizando</p>
            <p className="text-xs text-blue-700">{pendingCount} cambios pendientes</p>
          </div>
        </div>
      )}

      {/* Success state - checkmark */}
      {state === 'success' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-green-50 border border-green-200 animate-pulse">
          <div className="flex-shrink-0 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-green-900">Sincronizado</p>
            {formatTime && <p className="text-xs text-green-700">{formatTime}</p>}
          </div>
        </div>
      )}

      {/* Error state - with retry button */}
      {state === 'error' && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-red-50 border border-red-200">
          <div className="flex-shrink-0 text-red-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <p className="text-sm font-medium text-red-900">Error de sincronización</p>
            <p className="text-xs text-red-700">{syncError}</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isSyncing}
            className="flex-shrink-0 px-3 py-1 rounded text-xs font-medium bg-red-200 text-red-900 hover:bg-red-300 disabled:opacity-50 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Pending state - no sync yet */}
      {state === 'idle' && pendingCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg bg-amber-50 border border-amber-200">
          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">{pendingCount} cambios pendientes</p>
            <p className="text-xs text-amber-700">Se sincronizarán cuando haya conexión</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isSyncing}
            className="flex-shrink-0 px-3 py-1 rounded text-xs font-medium bg-amber-200 text-amber-900 hover:bg-amber-300 disabled:opacity-50 transition-colors"
          >
            Sincronizar ahora
          </button>
        </div>
      )}
    </div>
  )
}
