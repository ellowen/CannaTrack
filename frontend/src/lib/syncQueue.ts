/**
 * Sync Queue - Cola de cambios offline para sincronización con Supabase
 *
 * Gestiona:
 * 1. Persistencia de cambios en localStorage mientras está offline
 * 2. Sincronización automática cuando vuelve la conexión
 * 3. Retry con backoff cuando falla
 * 4. Logging de errores sin ruptura del flujo
 */

import { useSyncStore, type SyncAction, type SyncActionType } from '@/store/syncStore'
import { isOnline } from '@/lib/network'
import {
  syncPlantToSupabase,
  syncTasksToSupabase,
  updatePlantStatusInSupabase,
  updatePlantInSupabase,
  replaceTasksForPlantInSupabase,
  replacePendingTasksForPlantInSupabase,
  completeTaskInSupabase,
  skipTaskInSupabase,
  restoreTaskInSupabase,
  rescheduleTaskInSupabase,
  syncMeasurementToSupabase,
  deleteMeasurementFromSupabase,
} from '@/lib/sync'
import type { Plant, ScheduledTask } from '@/types/plant'
import type { MeasurementLog } from '@/types/measurement'

const SYNC_RETRY_DELAY_MS = 5000 // Reintentar cada 5s si falla

/** Campos de fecha de los payloads encolados (plantas, tareas, mediciones). */
const DATE_KEYS = new Set([
  'startDate', 'floraStartDate', 'endDate', 'newDate', 'originalDate',
  'scheduledDate', 'completedAt',
  'logDate', 'measuredAt', 'createdAt', 'updatedAt',
])

/**
 * La cola se persiste como JSON: al volver a leerla, los Date quedan como
 * strings ISO y los sync* (que llaman a date.getFullYear()) fallarian para
 * siempre. Revive los campos de fecha conocidos, en cualquier nivel.
 */
export function reviveDates<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => reviveDates(v)) as unknown as T
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = DATE_KEYS.has(k) && typeof v === 'string' ? new Date(v) : reviveDates(v)
    }
    return out as T
  }
  return value
}

/**
 * Ejecuta la accion de sync correspondiente segun su tipo.
 * Tira si falla -- el caller decide que hacer con la accion fallida.
 */
async function runAction(action: SyncAction): Promise<void> {
  const p = reviveDates(action.payload)

  switch (action.type) {
    case 'addPlant': {
      const plant = p.plant as Plant
      await syncPlantToSupabase(plant)
      if (p.tasks) await syncTasksToSupabase(p.tasks as ScheduledTask[])
      return
    }
    case 'updatePlantStatus':
      await updatePlantStatusInSupabase(
        p.plantId as string,
        p.status as 'active' | 'harvested' | 'discarded'
      )
      return
    case 'updatePlantData':
      await updatePlantInSupabase(p.plantId as string, p.changes as Record<string, unknown>)
      return
    case 'replaceTasks':
      await replaceTasksForPlantInSupabase(p.plantId as string, p.tasks as ScheduledTask[])
      return
    case 'replacePendingTasks':
      await replacePendingTasksForPlantInSupabase(p.plantId as string, p.tasks as ScheduledTask[])
      return
    case 'completeTask':
      await completeTaskInSupabase(p.taskId as string, p.notes as string | undefined)
      return
    case 'skipTask':
      await skipTaskInSupabase(p.taskId as string, p.reason as string | undefined)
      return
    case 'restoreTask':
      await restoreTaskInSupabase(p.taskId as string)
      return
    case 'rescheduleTask':
      await rescheduleTaskInSupabase(p.taskId as string, p.newDate as Date, p.originalDate as Date)
      return
    case 'syncMeasurement':
      await syncMeasurementToSupabase(p.log as MeasurementLog, p.userId as string)
      return
    case 'deleteMeasurement':
      await deleteMeasurementFromSupabase(p.measurementId as string)
      return
  }
}

/**
 * Procesa la cola de sincronización.
 * Intenta enviar todas las acciones pendientes a Supabase, en orden.
 * Las que fallan quedan en la cola para el proximo intento; las que
 * tienen exito se remueven individualmente (no se pierde ni se
 * reintenta de mas).
 */
export async function processSyncQueue(): Promise<void> {
  const syncStore = useSyncStore.getState()
  const queue = syncStore.syncQueue

  if (queue.length === 0) {
    console.log('[SyncQueue] Queue vacía')
    return
  }

  if (!isOnline()) {
    console.log('[SyncQueue] Sin conexión, no se procesa la cola')
    return
  }

  console.log(`[SyncQueue] Procesando ${queue.length} acciones pendientes`)
  syncStore.setIsSyncing(true)

  const succeededIds: string[] = []
  let hasAnyFailure = false

  for (const action of queue) {
    try {
      await runAction(action)
      succeededIds.push(action.id)
    } catch (error) {
      hasAnyFailure = true
      console.error(`[SyncQueue] Error en acción ${action.type} (${action.id}):`, error)
    }
  }

  if (succeededIds.length > 0) {
    syncStore.removeActionsFromQueue(succeededIds)
    syncStore.setLastSyncAt(new Date())
  }

  syncStore.setIsSyncing(false)

  if (!hasAnyFailure) {
    syncStore.clearSyncError()
    console.log('[SyncQueue] Sincronización completada exitosamente')
    return
  }

  const errorMsg = `${queue.length - succeededIds.length} acción(es) fallaron`
  syncStore.setSyncError(errorMsg)
  console.log(`[SyncQueue] Reintentando en ${SYNC_RETRY_DELAY_MS}ms`)
  setTimeout(() => {
    processSyncQueue().catch((err) => {
      console.error('[SyncQueue] Error en reintento:', err)
    })
  }, SYNC_RETRY_DELAY_MS)
}

/**
 * Encola una acción de sincronización y, si hay conexión, intenta
 * procesarla ya mismo en vez de esperar al proximo evento 'online'.
 */
export function enqueueSyncAction(type: SyncActionType, payload: Record<string, unknown>): void {
  const syncStore = useSyncStore.getState()

  syncStore.enqueueSyncAction({ type, payload })

  console.log(`[SyncQueue] Acción encolada: ${type}`, payload)

  if (isOnline()) {
    processSyncQueue().catch((err) => {
      console.error('[SyncQueue] Error en sync inmediato:', err)
    })
  }
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
