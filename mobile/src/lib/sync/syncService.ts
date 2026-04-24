import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncAction } from '@/store/syncStore'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'

/**
 * Resuelve conflictos entre versiones local y remota de una entidad.
 * Ganador: el timestamp más reciente. En caso de empate: local (user intent wins).
 */
function resolveConflict(local: { timestamp?: Date }, remote: { timestamp?: Date }): 'local' | 'remote' {
  if (!local.timestamp || !remote.timestamp) return 'local'
  return local.timestamp.getTime() >= remote.timestamp.getTime() ? 'local' : 'remote'
}

/**
 * Reintento exponencial. Máximo 3 intentos, espera: 1s, 2s, 4s.
 */
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts) {
        const delayMs = Math.pow(2, attempt - 1) * 1000
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError || new Error('Retry exhausted')
}

/**
 * SyncService maneja la sincronización bidireccional con Supabase (mobile).
 * Idéntica a la versión web pero adaptada a plataforma React Native.
 */
export class SyncService {
  /**
   * Envía todas las acciones pending al backend.
   */
  async flushQueue(supabase: SupabaseClient, actions: SyncAction[]): Promise<void> {
    if (actions.length === 0) return

    for (const action of actions) {
      try {
        await withRetry(async () => {
          await this.syncAction(supabase, action)
        })
      } catch (error) {
        console.error(`Sync action ${action.id} failed:`, error)
        throw error
      }
    }
  }

  /**
   * Sincroniza una acción individual con Supabase.
   */
  private async syncAction(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    switch (action.type) {
      case 'addPlant':
        await this.syncAddPlant(supabase, action)
        break
      case 'updatePlant':
        await this.syncUpdatePlant(supabase, action)
        break
      case 'completeTask':
        await this.syncCompleteTask(supabase, action)
        break
      case 'addXP':
        await this.syncAddXP(supabase, action)
        break
      case 'uploadPhoto':
        await this.syncUploadPhoto(supabase, action)
        break
      default:
        throw new Error(`Unknown sync action type: ${String(action.type)}`)
    }
  }

  private async syncAddPlant(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    const { data, error } = await supabase.from('plants').insert([action.payload]).select()

    if (error) throw error
    if (!data?.[0]) throw new Error('No data returned from insert')

    const plant = data[0]
    const plantStore = usePlantStore.getState()
    plantStore.updatePlant(action.payload.id, { id: plant.id })
  }

  private async syncUpdatePlant(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    const { id, ...updates } = action.payload as Record<string, any>

    const { data: remoteData, error: fetchError } = await supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError

    const remote = remoteData || { timestamp: null }
    const resolution = resolveConflict(
      { timestamp: action.timestamp },
      { timestamp: remote.timestamp ? new Date(remote.timestamp) : null }
    )

    const dataToUpdate = resolution === 'local' ? updates : {}

    if (Object.keys(dataToUpdate).length > 0) {
      const { error } = await supabase
        .from('plants')
        .update({
          ...dataToUpdate,
          timestamp: new Date(),
        })
        .eq('id', id)

      if (error) throw error
    }
  }

  private async syncCompleteTask(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    const { id, completedAt, completionNotes } = action.payload as Record<string, any>

    const { error } = await supabase
      .from('tasks')
      .update({
        completed: true,
        completed_at: completedAt || new Date(),
        completion_notes: completionNotes,
        timestamp: new Date(),
      })
      .eq('id', id)

    if (error) throw error
  }

  private async syncAddXP(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    const { userId, amount } = action.payload as Record<string, any>

    const { error } = await supabase.from('user_xp_logs').insert([
      {
        user_id: userId,
        amount,
        reason: action.payload.reason,
        timestamp: new Date(),
      },
    ])

    if (error) throw error
  }

  private async syncUploadPhoto(supabase: SupabaseClient, action: SyncAction): Promise<void> {
    const { plantId, photoData, timestamp: photoTimestamp } = action.payload as Record<string, any>

    const { error } = await supabase.from('plant_photos').insert([
      {
        plant_id: plantId,
        photo_url: photoData,
        timestamp: photoTimestamp || new Date(),
      },
    ])

    if (error) throw error
  }

  /**
   * Descarga cambios remotos más recientes que lastSyncAt.
   */
  async pullRemote(supabase: SupabaseClient, lastSyncAt: Date | null): Promise<void> {
    const since = lastSyncAt ? lastSyncAt.toISOString() : '2000-01-01T00:00:00Z'

    const { data: plants, error: plantsError } = await supabase
      .from('plants')
      .select('*')
      .gt('timestamp', since)

    if (plantsError) throw plantsError

    if (plants && plants.length > 0) {
      const plantStore = usePlantStore.getState()
      for (const remotePlant of plants) {
        const local = plantStore.getPlantById(remotePlant.id)
        const resolution = resolveConflict(
          { timestamp: local?.timestamp },
          { timestamp: new Date(remotePlant.timestamp) }
        )

        if (resolution === 'remote') {
          plantStore.updatePlant(remotePlant.id, remotePlant)
        }
      }
    }

    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .gt('timestamp', since)

    if (tasksError) throw tasksError

    if (tasks && tasks.length > 0) {
      const taskStore = useTaskStore.getState()
      for (const remoteTask of tasks) {
        taskStore.updateTask(remoteTask.id, remoteTask)
      }
    }
  }

  /**
   * Sincronización completa: envía pending + descarga remoto.
   */
  async fullSync(
    supabase: SupabaseClient,
    actions: SyncAction[],
    lastSyncAt: Date | null
  ): Promise<void> {
    await this.flushQueue(supabase, actions)
    await this.pullRemote(supabase, lastSyncAt)
  }
}

export const syncService = new SyncService()
