/**
 * Sync Queue - Offline sync queue for mobile
 * Enqueues local changes and processes them when online
 */

import { supabase } from './supabase'
import { useSyncStore } from '@/store/syncStore'
import { useTaskStore } from '@/store/taskStore'
import { usePlantStore } from '@/store/plantStore'

const SYNC_RETRY_DELAY_MS = 5000
const SYNC_RETRY_MAX_ATTEMPTS = 3

let retryAttempts = 0

interface SyncAction {
  id: string
  type: 'addPlant' | 'updatePlant' | 'completeTask' | 'addXP' | 'uploadPhoto'
  payload: Record<string, unknown>
  timestamp: number
}

/**
 * Enqueue a sync action to be processed when online
 */
export function enqueueSyncAction(
  type: SyncAction['type'],
  payload: Record<string, unknown>
): void {
  const syncStore = useSyncStore.getState()

  syncStore.enqueueSyncAction({
    type,
    payload,
  })

  console.log(`[SyncQueue] Acción encolada: ${type}`, payload)
}

/**
 * Process all queued sync actions when online
 * Called from OfflineIndicator or manually by user
 */
export async function processSyncQueue(): Promise<void> {
  const syncStore = useSyncStore.getState()
  const queue = syncStore.syncQueue

  if (queue.length === 0) {
    console.log('[SyncQueue] Queue vacía')
    retryAttempts = 0
    return
  }

  console.log(`[SyncQueue] Procesando ${queue.length} acciones pendientes`)
  syncStore.setIsSyncing(true)

  try {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) {
      throw new Error('Usuario no autenticado')
    }

    // Process each action in queue
    for (const action of queue) {
      try {
        await processSyncAction(action, authData.user.id)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`[SyncQueue] Error procesando acción ${action.id}:`, errorMsg)
        // Continue with next actions even if one fails
      }
    }

    // Clear queue after processing all actions
    syncStore.clearQueue()
    syncStore.setLastSyncAt(new Date())
    syncStore.clearSyncError()
    retryAttempts = 0

    console.log('[SyncQueue] Sincronización completada exitosamente')
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`[SyncQueue] Error durante sincronización: ${errorMsg}`)

    syncStore.setSyncError(errorMsg)

    // Retry with exponential backoff
    if (retryAttempts < SYNC_RETRY_MAX_ATTEMPTS) {
      retryAttempts++
      const delayMs = SYNC_RETRY_DELAY_MS * Math.pow(2, retryAttempts - 1)
      console.log(
        `[SyncQueue] Reintentando en ${delayMs}ms (intento ${retryAttempts}/${SYNC_RETRY_MAX_ATTEMPTS})`
      )

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
 * Process a single sync action by type
 */
async function processSyncAction(
  action: SyncAction,
  userId: string
): Promise<void> {
  switch (action.type) {
    case 'addPlant': {
      const plant = action.payload as any
      // Plant should already exist in supabase from creation
      console.log('[SyncQueue] Plant already synced during creation')
      break
    }

    case 'updatePlant': {
      const { plantId, status } = action.payload as {
        plantId: string
        status: 'active' | 'harvested' | 'discarded'
      }
      if (plantId && status) {
        const { error } = await supabase
          .from('plants')
          .update({ status })
          .eq('id', plantId)
          .eq('user_id', userId)

        if (error) throw error
        console.log(`[SyncQueue] Plant ${plantId} status updated to ${status}`)
      }
      break
    }

    case 'completeTask': {
      const { taskId, notes } = action.payload as { taskId: string; notes?: string }
      if (taskId) {
        const { error } = await supabase
          .from('scheduled_tasks')
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            completion_notes: notes,
          })
          .eq('id', taskId)

        if (error) throw error
        console.log(`[SyncQueue] Task ${taskId} marked as completed`)
      }
      break
    }

    case 'addXP': {
      // TODO: Implement XP sync when XP table is added to Supabase
      console.log('[SyncQueue] XP sync not implemented yet:', action.payload)
      break
    }

    case 'uploadPhoto': {
      // TODO: Implement photo sync when storage is set up in Supabase
      console.log('[SyncQueue] Photo upload not implemented yet:', action.payload)
      break
    }

    default:
      console.warn(`[SyncQueue] Tipo de acción desconocido: ${action.type}`)
  }
}

/**
 * Get current sync queue status
 */
export function getSyncQueueStatus() {
  const syncStore = useSyncStore.getState()
  return {
    pendingCount: syncStore.syncQueue.length,
    isSyncing: syncStore.isSyncing,
    lastSyncAt: syncStore.lastSyncAt,
    error: syncStore.syncError,
  }
}

/**
 * Clear sync queue (use with caution)
 */
export function clearSyncQueue(): void {
  const syncStore = useSyncStore.getState()
  syncStore.clearQueue()
  retryAttempts = 0
  console.log('[SyncQueue] Cola limpiada')
}
