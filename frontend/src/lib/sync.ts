/**
 * Sincronización offline-first con Supabase
 * - Guarda localmente primero (localStorage)
 * - Sincroniza con Supabase cuando hay conexión
 */

import { supabase } from './auth'
import type { Plant, ScheduledTask } from '@/types/plant'
import type { MeasurementLog } from '@/types/measurement'
import type { WeekLog } from '@/types/weekLog'

// ────────────────────────────────────────────────────────────────────
// PLANTAS
// ────────────────────────────────────────────────────────────────────

export async function syncPlantToSupabase(plant: Plant): Promise<void> {
  try {
    const { error } = await supabase.from('plants').insert([{
      id: plant.id,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      name: plant.name,
      genetics: plant.genetics,
      genetic_type: plant.geneticType,
      sex: plant.sex,
      start_date: plant.startDate,
      flora_start_date: plant.floraStartDate,
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

export async function loadPlantsFromSupabase(userId: string): Promise<Plant[]> {
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
      genetics: p.genetics,
      geneticType: p.genetic_type,
      sex: p.sex,
      startDate: new Date(p.start_date),
      floraStartDate: p.flora_start_date ? new Date(p.flora_start_date) : undefined,
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
    return []
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
    if ('genetics' in changes)           row.genetics = changes.genetics
    if ('geneticType' in changes)        row.genetic_type = changes.geneticType
    if ('status' in changes)             row.status = changes.status
    if ('floraStartDate' in changes)     row.flora_start_date = changes.floraStartDate instanceof Date
      ? (changes.floraStartDate as Date).toISOString().split('T')[0]
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
        ? t.scheduledDate.toISOString().split('T')[0]
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
    }))

    const { error } = await supabase.from('scheduled_tasks').insert(tasksToInsert)
    if (error && error.code !== '23505') throw error // 23505 = unique constraint violation (ok, ya existe)
  } catch (error) {
    console.error('Error sincronizando tareas:', error)
    throw error
  }
}

export async function loadTasksFromSupabase(userId: string): Promise<ScheduledTask[]> {
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
      scheduledDate: new Date(t.scheduled_date),
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
      createdAt: new Date(t.created_at),
    })) as ScheduledTask[]
  } catch (error) {
    console.error('Error cargando tareas:', error)
    return []
  }
}

export async function completeTaskInSupabase(taskId: string, notes?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('scheduled_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completion_notes: notes,
      })
      .eq('id', taskId)

    if (error) throw error
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
  }
}

export async function loadMeasurementsFromSupabase(userId: string): Promise<MeasurementLog[]> {
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
    return []
  }
}

// ────────────────────────────────────────────────────────────────────
// WEEK LOGS
// ────────────────────────────────────────────────────────────────────

export async function uploadPhotoToStorage(
  userId: string,
  plantId: string,
  logId: string,
  dataUrl: string
): Promise<string | null> {
  try {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const ext = blob.type.includes('png') ? 'png' : 'jpg'
    const path = `${userId}/${plantId}/${logId}.${ext}`
    const { error } = await supabase.storage
      .from('plant-photos')
      .upload(path, blob, { upsert: true, contentType: blob.type })
    if (error) throw error
    const { data } = supabase.storage.from('plant-photos').getPublicUrl(path)
    return data.publicUrl
  } catch (error) {
    console.error('Error subiendo foto:', error)
    return null
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
        ? log.logDate.toISOString().split('T')[0]
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
    const { error } = await supabase.from('week_logs').delete().eq('id', logId)
    if (error) throw error
  } catch (error) {
    console.error('Error eliminando week log:', error)
  }
}

export async function loadWeekLogsFromSupabase(userId: string): Promise<WeekLog[]> {
  try {
    const { data, error } = await supabase
      .from('week_logs')
      .select('*')
      .eq('user_id', userId)
      .order('log_date', { ascending: false })
    if (error) throw error
    return data.map((l: any) => ({
      id:           l.id,
      plantId:      l.plant_id,
      weekLabel:    l.week_label,
      logDate:      new Date(l.log_date),
      notes:        l.notes ?? '',
      photoDataUrl: undefined,
      photoUrl:     l.photo_url ?? undefined,
    })) as WeekLog[]
  } catch (error) {
    console.error('Error cargando week logs:', error)
    return []
  }
}
