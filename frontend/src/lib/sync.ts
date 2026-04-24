/**
 * Sincronización offline-first con Supabase
 * - Guarda localmente primero (localStorage)
 * - Sincroniza con Supabase cuando hay conexión
 */

import { supabase } from './auth'
import type { Plant, ScheduledTask } from '@/types/plant'

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
