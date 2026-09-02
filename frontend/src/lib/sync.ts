/**
 * Sincronización offline-first con Supabase
 * - Guarda localmente primero (localStorage)
 * - Sincroniza con Supabase cuando hay conexión
 */

import { supabase } from './auth'
import type { Plant, ScheduledTask } from '@/types/plant'
import type { MeasurementLog } from '@/types/measurement'
import type { WeekLog } from '@/types/weekLog'
import { parseDateOnly, formatDateOnly } from './date-utils'

// ────────────────────────────────────────────────────────────────────
// PLANTAS
// ────────────────────────────────────────────────────────────────────

export async function syncPlantToSupabase(plant: Plant): Promise<void> {
  try {
    // upsert (no insert): si se reintenta desde la sync queue tras un
    // fallo parcial (planta ok, tareas no), no debe romper por PK duplicada.
    const { error } = await supabase.from('plants').upsert([{
      id: plant.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      name: plant.name,
      crop_type: plant.cropType ?? 'cannabis',
      genetics: plant.genetics,
      genetic_type: plant.geneticType,
      sex: plant.sex,
      start_date: formatDateOnly(plant.startDate),
      flora_start_date: plant.floraStartDate ? formatDateOnly(plant.floraStartDate) : null,
      auto_flower_total_days: plant.autoFlowerTotalDays,
      location: plant.location,
      grow_medium: plant.growMedium ?? 'soil',
      pot_count: plant.potCount,
      pot_volume_liters: plant.potVolumeLiters,
      nutrition_table_id: plant.nutritionTableId,
      available_products: plant.availableProducts ?? [],
      status: plant.status,
      notes: plant.notes,
    }])

    if (error) throw error
  } catch (error) {
    console.error('Error sincronizando planta:', error)
    throw error
  }
}

// `null` distingue una carga que fallo (error de red/servidor -- el
// caller debe conservar el cache local y mostrar un estado de error) de
// un array vacio genuino (el usuario realmente no tiene datos todavia).
// Antes ambos casos devolvian `[]`, y una pantalla de inicio sin datos
// por una falla de red se mostraba igual que "todavia no tenes plantas".
export async function loadPlantsFromSupabase(userId: string): Promise<Plant[] | null> {
  try {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    return data.map((p: any) => ({
      id: p.id,
      userId: p.user_id,
      name: p.name,
      cropType: p.crop_type ?? 'cannabis',
      genetics: p.genetics,
      geneticType: p.genetic_type,
      sex: p.sex,
      startDate: parseDateOnly(p.start_date),
      floraStartDate: p.flora_start_date ? parseDateOnly(p.flora_start_date) : undefined,
      autoFlowerTotalDays: p.auto_flower_total_days,
      location: p.location,
      growMedium: p.grow_medium ?? 'soil',
      potCount: p.pot_count,
      potVolumeLiters: p.pot_volume_liters,
      nutritionTableId: p.nutrition_table_id,
      availableProducts: p.available_products ?? [],
      status: p.status,
      notes: p.notes,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    })) as Plant[]
  } catch (error) {
    console.error('Error cargando plantas:', error)
    return null
  }
}

export async function updatePlantStatusInSupabase(plantId: string, status: 'active' | 'harvested' | 'discarded'): Promise<void> {
  try {
    const { error } = await supabase
      .from('plants')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', plantId)

    if (error) throw error
  } catch (error) {
    console.error('Error actualizando planta:', error)
    throw error
  }
}

export async function updatePlantInSupabase(plantId: string, changes: Record<string, unknown>): Promise<void> {
  try {
    // Convertir camelCase a snake_case para los campos conocidos
    const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if ('name' in changes)               row.name = changes.name
    if ('cropType' in changes)           row.crop_type = changes.cropType
    if ('genetics' in changes)           row.genetics = changes.genetics
    // ?? null (no undefined): un cultivo no-cannabis debe LIMPIAR estos
    // campos en Supabase, no dejarlos sin tocar. undefined se descarta
    // silenciosamente al serializar el PATCH (la columna no se actualiza);
    // null se envia explicitamente y borra el residuo de cannabis.
    if ('geneticType' in changes)        row.genetic_type = changes.geneticType ?? null
    if ('sex' in changes)                row.sex = changes.sex ?? null
    if ('status' in changes)             row.status = changes.status
    if ('floraStartDate' in changes)     row.flora_start_date = changes.floraStartDate instanceof Date
      ? formatDateOnly(changes.floraStartDate as Date)
      : changes.floraStartDate
    if ('notes' in changes)              row.notes = changes.notes
    if ('nutritionTableId' in changes)   row.nutrition_table_id = changes.nutritionTableId
    if ('growMedium' in changes)         row.grow_medium = changes.growMedium
    if ('potCount' in changes)           row.pot_count = changes.potCount
    if ('potVolumeLiters' in changes)    row.pot_volume_liters = changes.potVolumeLiters
    if ('availableProducts' in changes)  row.available_products = changes.availableProducts

    const { error } = await supabase.from('plants').update(row).eq('id', plantId)
    if (error) throw error
  } catch (error) {
    console.error('Error actualizando planta:', error)
    throw error
  }
}

// ────────────────────────────────────────────────────────────────────
// TAREAS
// ────────────────────────────────────────────────────────────────────

export async function syncTasksToSupabase(tasks: ScheduledTask[]): Promise<void> {
  try {
    // Obtener user_id del usuario autenticado
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('No user logged in')

    // Insertar todas las tareas
    const tasksToInsert = tasks.map((t) => ({
      id: t.id,
      user_id: authData.user!.id,
      plant_id: t.plantId,
      type: t.type,
      scheduled_date: t.scheduledDate instanceof Date
        ? formatDateOnly(t.scheduledDate)
        : t.scheduledDate,
      cycle: t.cycle,
      week: t.week,
      stage: t.stage,
      products: t.products,
      ec_min: t.ecMin,
      ec_max: t.ecMax,
      ph_min: t.phMin,
      ph_max: t.phMax,
      completed: t.completed,
      completed_at: t.completedAt?.toISOString(),
      completion_notes: t.completionNotes,
      xp_awarded: t.xpAwarded ?? false,
    }))

    const { error } = await supabase.from('scheduled_tasks').insert(tasksToInsert)
    if (error && error.code !== '23505') throw error // 23505 = unique constraint violation (ok, ya existe)
  } catch (error) {
    console.error('Error sincronizando tareas:', error)
    throw error
  }
}

/**
 * Reemplaza el calendario de una planta en Supabase: borra las tareas
 * viejas y sube las regeneradas. Sin esto, regenerar tareas (editar
 * planta, boton Regenerar) deja las tareas anteriores huerfanas en la
 * DB y reaparecen duplicadas al recargar desde la nube.
 */
export async function replaceTasksForPlantInSupabase(plantId: string, tasks: ScheduledTask[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('scheduled_tasks')
      .delete()
      .eq('plant_id', plantId)
    if (error) throw error
    await syncTasksToSupabase(tasks)
  } catch (error) {
    console.error('Error reemplazando tareas:', error)
    throw error
  }
}

/**
 * Igual que replaceTasksForPlantInSupabase, pero SOLO toca tareas
 * pendientes (completed = false). Las tareas ya completadas son historial
 * y nunca deben borrarse/reinsertarse -- ademas de perder su estado,
 * user_xp_log.task_id tiene "on delete set null", asi que borrar una tarea
 * completada rompe el vinculo con el XP que ya se otorgo por ella. Usar
 * esto (no replaceTasksForPlantInSupabase) al regenerar el calendario como
 * efecto secundario de editar una planta.
 */
export async function replacePendingTasksForPlantInSupabase(plantId: string, pendingTasks: ScheduledTask[]): Promise<void> {
  try {
    const { error } = await supabase
      .from('scheduled_tasks')
      .delete()
      .eq('plant_id', plantId)
      .eq('completed', false)
    if (error) throw error
    if (pendingTasks.length > 0) await syncTasksToSupabase(pendingTasks)
  } catch (error) {
    console.error('Error reemplazando tareas pendientes:', error)
    throw error
  }
}

export async function loadTasksFromSupabase(userId: string): Promise<ScheduledTask[] | null> {
  try {
    const { data, error } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    return data.map((t: any) => ({
      id: t.id,
      plantId: t.plant_id,
      userId: t.user_id,
      type: t.type,
      scheduledDate: parseDateOnly(t.scheduled_date),
      cycle: t.cycle,
      week: t.week,
      stage: t.stage,
      products: t.products ?? [],
      ecMin: t.ec_min,
      ecMax: t.ec_max,
      phMin: t.ph_min,
      phMax: t.ph_max,
      completed: t.completed,
      completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
      completionNotes: t.completion_notes,
      xpAwarded: t.xp_awarded ?? false,
      createdAt: new Date(t.created_at),
    })) as ScheduledTask[]
  } catch (error) {
    console.error('Error cargando tareas:', error)
    return null
  }
}

export interface TaskCompletionReward {
  /** null cuando la tarea ya habia otorgado XP antes (deshacer/rehacer) — sin premio nuevo. */
  xpGained: number | null
  newStreak: number | null
}

/**
 * Completa la tarea y devuelve el premio REAL otorgado por la DB
 * (handle_task_completion -> log_xp/update_streak), no un calculo local.
 * Supabase es la fuente de verdad del XP/racha — el caller debe usar este
 * valor para actualizar la UI/cache local, nunca inventar un numero propio.
 */
export async function completeTaskInSupabase(taskId: string, notes?: string): Promise<TaskCompletionReward> {
  try {
    // handle_task_completion() otorga XP real en la DB (log_xp/update_streak)
    // y marca completed=true — pero solo la primera vez que la tarea se
    // completa, para no farmear XP completando/deshaciendo la misma tarea.
    const { data: existing, error: fetchError } = await supabase
      .from('scheduled_tasks')
      .select('xp_awarded, user_id')
      .eq('id', taskId)
      .single()
    if (fetchError) throw fetchError

    let reward: TaskCompletionReward = { xpGained: null, newStreak: null }
    if (!existing.xp_awarded) {
      const { data: rpcData, error: rpcError } = await supabase.rpc('handle_task_completion', {
        task_id_param: taskId,
        user_id_param: existing.user_id,
      })
      if (rpcError) throw rpcError
      reward = { xpGained: rpcData?.xp_gained ?? 0, newStreak: rpcData?.new_streak ?? null }
    }

    const { error } = await supabase
      .from('scheduled_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        xp_awarded: true,
      })
      .eq('id', taskId)

    if (error) throw error
    return reward
  } catch (error) {
    console.error('Error completando tarea:', error)
    throw error
  }
}

export async function uncompleteTaskInSupabase(taskId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('scheduled_tasks')
      .update({ completed: false, completed_at: null, completion_notes: null })
      .eq('id', taskId)
    if (error) throw error
  } catch (error) {
    console.error('Error deshaciendo tarea:', error)
  }
}

export async function deleteMeasurementFromSupabase(measurementId: string): Promise<void> {
  try {
    const { error } = await supabase.from('measurements').delete().eq('id', measurementId)
    if (error) throw error
  } catch (error) {
    console.error('Error eliminando medicion:', error)
    throw error
  }
}

// ────────────────────────────────────────────────────────────────────
// MEDICIONES
// ────────────────────────────────────────────────────────────────────

export async function syncMeasurementToSupabase(log: MeasurementLog, userId: string): Promise<void> {
  try {
    const { error } = await supabase.from('measurements').insert([{
      id:          log.id,
      user_id:     userId,
      plant_id:    log.plantId,
      ec:          log.ec,
      ph:          log.ph,
      water_temp:  log.tempCelsius ?? null,
      measured_at: log.logDate instanceof Date ? log.logDate.toISOString() : log.logDate,
    }])
    if (error) throw error
  } catch (error) {
    console.error('Error sincronizando medicion:', error)
    throw error
  }
}

export async function loadMeasurementsFromSupabase(userId: string): Promise<MeasurementLog[] | null> {
  try {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
    if (error) throw error
    return data.map((m: any) => ({
      id:          m.id,
      plantId:     m.plant_id,
      logDate:     new Date(m.measured_at),
      ec:          m.ec,
      ph:          m.ph,
      tempCelsius: m.water_temp ?? undefined,
    })) as MeasurementLog[]
  } catch (error) {
    console.error('Error cargando mediciones:', error)
    return null
  }
}

// ────────────────────────────────────────────────────────────────────
// WEEK LOGS
// ────────────────────────────────────────────────────────────────────

// plant-photos es un bucket privado (ver
// 20260810010002_make_plant_photos_private.sql -- antes era publico y
// cualquiera sin autenticarse podia listar/descargar fotos ajenas).
// uploadPhotoToStorage devuelve el PATH del objeto (para persistir en
// week_logs.photo_url) y una signed URL (para mostrarla ya mismo). La
// signed URL expira -- nunca guardarla como si fuera estable, generar
// una nueva on-demand via getSignedPhotoUrl() cuando haga falta.
const PHOTO_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60

export async function uploadPhotoToStorage(
  userId: string,
  plantId: string,
  logId: string,
  dataUrl: string
): Promise<{ path: string; signedUrl: string } | null> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const path = `${userId}/${plantId}/${logId}.${ext}`
    const { error } = await supabase.storage
      .from('plant-photos')
      .upload(path, blob, { upsert: true, contentType: blob.type })
    if (error) throw error
    const signedUrl = await getSignedPhotoUrl(path)
    if (!signedUrl) return null
    return { path, signedUrl }
  } catch (error) {
    console.error('Error subiendo foto:', error)
    return null
  }
}

// Acepta tanto un path nuevo (userId/plantId/logId.ext) como, por
// compatibilidad con filas viejas de antes de este fix, una URL publica
// completa ya guardada -- le extrae el path real en ese caso.
function extractPhotoStoragePath(pathOrLegacyUrl: string): string {
  const marker = '/plant-photos/'
  const idx = pathOrLegacyUrl.indexOf(marker)
  return idx >= 0 ? pathOrLegacyUrl.slice(idx + marker.length).split('?')[0] : pathOrLegacyUrl
}

export async function getSignedPhotoUrl(pathOrLegacyUrl: string): Promise<string | undefined> {
  try {
    const path = extractPhotoStoragePath(pathOrLegacyUrl)
    const { data, error } = await supabase.storage
      .from('plant-photos')
      .createSignedUrl(path, PHOTO_SIGNED_URL_TTL_SECONDS)
    if (error) throw error
    return data?.signedUrl
  } catch (error) {
    console.error('Error generando signed URL de foto:', error)
    return undefined
  }
}

export async function syncWeekLogToSupabase(log: WeekLog, userId: string): Promise<void> {
  try {
    const { error } = await supabase.from('week_logs').upsert([{
      id:         log.id,
      user_id:    userId,
      plant_id:   log.plantId,
      week_label: log.weekLabel,
      log_date:   log.logDate instanceof Date
        ? formatDateOnly(log.logDate)
        : log.logDate,
      notes:      log.notes ?? '',
      photo_url:  log.photoUrl ?? null,
    }])
    if (error) throw error
  } catch (error) {
    console.error('Error sincronizando week log:', error)
  }
}

export async function updateWeekLogInSupabase(logId: string, changes: { notes?: string; photoUrl?: string | null }): Promise<void> {
  try {
    const update: Record<string, unknown> = {}
    if ('notes' in changes)    update.notes = changes.notes
    if ('photoUrl' in changes) update.photo_url = changes.photoUrl ?? null
    const { error } = await supabase.from('week_logs').update(update).eq('id', logId)
    if (error) throw error
  } catch (error) {
    console.error('Error actualizando week log:', error)
  }
}

export async function deleteWeekLogFromSupabase(logId: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('week_logs').delete().eq('id', logId).select('photo_url')
    if (error) throw error
    // Limpiar la foto en Storage -- si no se borra aca queda huerfana
    // (nadie mas la referencia una vez borrada la fila de week_logs).
    const photoUrl = data?.[0]?.photo_url as string | undefined
    if (photoUrl) {
      const path = extractPhotoStoragePath(photoUrl)
      const { error: storageError } = await supabase.storage.from('plant-photos').remove([path])
      if (storageError) console.error('Error eliminando foto huerfana de Storage:', storageError)
    }
  } catch (error) {
    console.error('Error eliminando week log:', error)
  }
}

export async function loadWeekLogsFromSupabase(userId: string): Promise<WeekLog[] | null> {
  try {
    const { data, error } = await supabase
      .from('week_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
    if (error) throw error
    return await Promise.all(data.map(async (l: any) => ({
      id:           l.id,
      plantId:      l.plant_id,
      weekLabel:    l.week_label,
      logDate:      parseDateOnly(l.log_date),
      notes:        l.notes ?? '',
      photoDataUrl: undefined,
      photoUrl:     l.photo_url ? await getSignedPhotoUrl(l.photo_url) : undefined,
    }))) as WeekLog[]
  } catch (error) {
    console.error('Error cargando week logs:', error)
    return null
  }
}
