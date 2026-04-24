/**
 * Tipos para el sistema de sincronización offline-first.
 */

/**
 * Tipos de acciones que pueden sincronizarse.
 */
export type SyncActionType = 'addPlant' | 'updatePlant' | 'completeTask' | 'addXP' | 'uploadPhoto'

/**
 * Payloads específicos por tipo de acción.
 */
export type SyncPayload =
  | AddPlantPayload
  | UpdatePlantPayload
  | CompleteTaskPayload
  | AddXPPayload
  | UploadPhotoPayload

/**
 * Agregar nueva planta.
 */
export interface AddPlantPayload {
  id: string
  name: string
  genetics: string
  geneticType: 'feminized' | 'autoflower' | 'regular'
  location: 'indoor' | 'outdoor'
  potCount: number
  nutritionTableId: string
  startDate: Date | string
}

/**
 * Actualizar propiedades de planta.
 */
export interface UpdatePlantPayload {
  id: string
  [key: string]: any // Partial updates
}

/**
 * Marcar tarea como completada.
 */
export interface CompleteTaskPayload {
  id: string
  completedAt: Date | string
  completionNotes?: string
}

/**
 * Registrar XP ganado.
 */
export interface AddXPPayload {
  userId: string
  amount: number
  reason?: string
}

/**
 * Subir foto de planta.
 */
export interface UploadPhotoPayload {
  plantId: string
  photoData: string // URL o base64
  timestamp?: Date | string
}

/**
 * Estado de sincronización general.
 */
export type SyncState = 'idle' | 'syncing' | 'success' | 'error'

/**
 * Resultado de sincronización.
 */
export interface SyncResult {
  success: boolean
  actionsProcessed: number
  actionsSkipped: number
  conflictsResolved: number
  errors: string[]
  lastSyncAt: Date
}

/**
 * Contexto de resolución de conflictos.
 */
export interface ConflictContext {
  actionId: string
  type: SyncActionType
  localTimestamp: Date
  remoteTimestamp: Date
  winner: 'local' | 'remote'
  reason: string
}
