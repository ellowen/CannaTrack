/**
 * Sync Queue - Placeholder para sincronización offline (Mobile)
 *
 * TODO: Implementar cuando sea necesario
 * Por ahora, los cambios se sincronizan directamente sin queue
 */

// Placeholder exports para evitar errores de import
export function enqueueSyncAction() {
  console.log('[SyncQueue] Placeholder - sync will be implemented later')
}

export function processSyncQueue() {
  console.log('[SyncQueue] Placeholder - no queue to process')
}
 * Intenta enviar todas las acciones pendientes a Supabase.
 * Maneja errores gracefully sin romper el flujo.
 */
export async function processSyncQueue(): Promise<void> {
  // Solo procesar si hay conexión
  const online = await isOnline()
  if (!online) {
    console.log('[SyncQueue] Offline - skipping sync')
    // Registrar listener para cuando vuelva online
    if (!unsubscribeOnline) {
      unsubscribeOnline = onOnline(() => {
        console.log('[SyncQueue] Online detected - processing queue')
        processSyncQueue().catch((err) => {
          console.error('[SyncQueue] Error en sync automático:', err)
        })
      })
    }
    return
  }

  const syncStore = useSyncStore.getState()
  const queue = syncStore.syncQueue

  if (queue.length === 0) {
    console.log('[SyncQueue] Queue vacía')
    // Resetear retry counter cuando la cola está vacía
    retryAttempts = 0
    return
  }

  console.log(`[SyncQueue] Procesando ${queue.length} acciones pendientes`)
  syncStore.setIsSyncing(true)

  try {
    // Obtener user ID del usuario autenticado
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      throw new Error('Usuario no autenticado')
    }

    // Procesar cada acción en la cola
    for (const action of queue) {
      try {
        await processSyncAction(action, authData.user.id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[SyncQueue] Error procesando acción ${action.id}:`, errorMsg)
        // Continuar con las siguientes acciones incluso si una falla
      }
    }

    // Limpiar cola después de procesar todas las acciones
    syncStore.clearQueue()
    syncStore.setLastSyncAt(new Date())
    syncStore.clearSyncError()
    retryAttempts = 0

    console.log('[SyncQueue] Sincronización completada exitosamente')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[SyncQueue] Error durante sincronización: ${errorMsg}`)

    syncStore.setSyncError(errorMsg)

    // Reintentar con backoff exponencial
    if (retryAttempts < SYNC_RETRY_MAX_ATTEMPTS) {
      retryAttempts++
      const delayMs = SYNC_RETRY_DELAY_MS * Math.pow(2, retryAttempts - 1)
      console.log(`[SyncQueue] Reintentando en ${delayMs}ms (intento ${retryAttempts}/${SYNC_RETRY_MAX_ATTEMPTS})`)

      setTimeout(() => {
        processSyncQueue().catch((err) => {
          console.error('[SyncQueue] Error en reintento:', err)
        })
      }, delayMs)
    } else {
      console.error('[SyncQueue] Máximo de reintentos alcanzado')
      retryAttempts = 0
    }
  } finally {
    syncStore.setIsSyncing(false)
  }
}

/**
 * Procesa una acción individual según su tipo.
 */
async function processSyncAction(
  action: { id: string; type: string; payload: Record<string, unknown> },
  userId: string
): Promise<void> {
  switch (action.type) {
    case 'addPlant': {
      const plant = action.payload as any
      await syncPlantToSupabase(plant)
      break
    }

    case 'updatePlant': {
      const { plantId, status } = action.payload as { plantId: string; status: 'active' | 'harvested' | 'discarded' }
      if (plantId && status) {
        await updatePlantStatusInSupabase(plantId, status)
      }
      break
    }

    case 'completeTask': {
      const { taskId, notes } = action.payload as { taskId: string; notes?: string }
      if (taskId) {
        await completeTaskInSupabase(taskId, notes)
      }
      break
    }

    case 'addXP': {
      // TODO: Implementar sync de XP cuando se agregue tabla XP a Supabase
      console.log('[SyncQueue] XP sync no implementado aún:', action.payload)
      break
    }

    case 'uploadPhoto': {
      // TODO: Implementar sync de fotos cuando se agregue storage a Supabase
      console.log('[SyncQueue] Photo upload no implementado aún:', action.payload)
      break
    }

    default:
      console.warn(`[SyncQueue] Tipo de acción desconocido: ${action.type}`)
  }
}

/**
 * Encola una acción de sincronización.
 * Se guarda automáticamente en AsyncStorage via Zustand persist.
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

  // Si estamos online, intentar sincronizar inmediatamente
  isOnline()
    .then((online) => {
      if (online) {
        processSyncQueue().catch((err) => {
          console.error('[SyncQueue] Error en sync inmediato:', err)
        })
      }
    })
    .catch((err) => {
      console.error('[SyncQueue] Error verificando conectividad:', err)
    })
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
  retryAttempts = 0
  console.log('[SyncQueue] Cola limpiada')
}

/**
 * Desuscribe los listeners de red y limpia recursos.
 * Llamar en cleanup de useEffect o al desmontar la app.
 */
export function cleanupSyncQueue(): void {
  if (unsubscribeOnline) {
    unsubscribeOnline()
    unsubscribeOnline = null
  }
  console.log('[SyncQueue] Listeners limpiados')
}
