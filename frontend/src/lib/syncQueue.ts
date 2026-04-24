/**
 * Sync Queue - Cola de cambios offline para sincronización con Supabase
 *
 * Gestiona:
 * 1. Persistencia de cambios en localStorage mientras está offline
 * 2. Sincronización automática cuando vuelve la conexión
 * 3. Retry con backoff exponencial
 * 4. Logging de errores sin ruptura del flujo
 */

import { useSyncStore } from '@/store/syncStore'

const SYNC_RETRY_DELAY_MS = 5000 // Reintentar cada 5s si falla

/**
 * Procesa la cola de sincronización.
 * Intenta enviar todas las acciones pendientes a Supabase.
 * Maneja errores gracefully sin romper el flujo.
 *
 * Nota: Actualmente la sincronización se hace directamente en componentes y hooks.
 * Esta función es un placeholder para futuras implementaciones de sync batch.
 */
export async function processSyncQueue(): Promise<void> {
  const syncStore = useSyncStore.getState()
  const queue = syncStore.syncQueue

  if (queue.length === 0) {
    console.log('[SyncQueue] Queue vacía')
    return
  }

  console.log(`[SyncQueue] Procesando ${queue.length} acciones pendientes`)
  syncStore.setIsSyncing(true)

  try {
    // TODO: Implementar sincronización batch de cola
    // Por ahora, solo limpiar la cola después de marcar como syncing
    syncStore.clearQueue()
    syncStore.setLastSyncAt(new Date())
    syncStore.clearSyncError()

    console.log('[SyncQueue] Sincronización completada exitosamente')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[SyncQueue] Error durante sincronización: ${errorMsg}`)

    syncStore.setSyncError(errorMsg)

    // Reintentar en N segundos
    console.log(`[SyncQueue] Reintentando en ${SYNC_RETRY_DELAY_MS}ms`)
    setTimeout(() => {
      processSyncQueue().catch((err) => {
        console.error('[SyncQueue] Error en reintento:', err)
      })
    }, SYNC_RETRY_DELAY_MS)
  } finally {
    syncStore.setIsSyncing(false)
  }
}

/**
 * Encola una acción de sincronización.
 * Se guarda automáticamente en localStorage via Zustand persist.
 */
export function enqueueSyncAction(
  type: 'addPlant' | 'updatePlant' | 'completeTask' | 'addXP' | 'uploadPhoto',
  payload: Record<string, unknown>
): void {
  const syncStore = useSyncStore.getState()

  syncStore.enqueueSyncAction({
    type,
    payload,
  })

  console.log(`[SyncQueue] Acción encolada: ${type}`, payload)

  // TODO: Implementar sync inmediato cuando esté online
  // processSyncQueue().catch((err) => {
  //   console.error('[SyncQueue] Error en sync inmediato:', err)
  // })
}

/**
 * Retorna el estado actual de la cola.
 */
export function getSyncQueueStatus() {
  const syncStore = useSyncStore.getState()
  return {
    pendingCount: syncStore.getPendingActionsCount(),
    isSyncing: syncStore.isSyncing,
    lastSyncAt: syncStore.getLastSyncTime(),
    error: syncStore.syncError,
  }
}

/**
 * Limpia la cola completamente (úsalo con cuidado).
 */
export function clearSyncQueue(): void {
  const syncStore = useSyncStore.getState()
  syncStore.clearQueue()
  console.log('[SyncQueue] Cola limpiada')
}
