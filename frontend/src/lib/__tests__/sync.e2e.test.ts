/**
 * TEST MASIVO DE SINCRONIZACION (e2e contra Supabase real)
 *
 * Parte A — siempre corre: seguridad RLS. Un cliente anonimo NO debe
 * poder leer ni escribir datos de usuarios.
 *
 * Parte B — corre solo si hay credenciales de un usuario de prueba en
 * frontend/.env.local (gitignored):
 *   VITE_TEST_USER_EMAIL=...
 *   VITE_TEST_USER_PASSWORD=...
 * Ejercita el ciclo completo contra la DB real usando las MISMAS
 * funciones de sync que usa la app: crear planta, tareas, completar,
 * deshacer (xp_awarded no se resetea), regenerar (reemplazo sin
 * duplicados), editar, cosechar, mediciones y diario. Limpia todo al final.
 *
 * Correr: npx vitest run src/lib/__tests__/sync.e2e.test.ts
 */
import { describe, it, expect, afterAll } from 'vitest'
import type { Plant, ScheduledTask } from '@/types/plant'

// Node 20 no tiene WebSocket global; supabase-js lo referencia al construir
// el cliente (realtime, que estos tests no usan). Stub minimo ANTES de importar.
;(globalThis as Record<string, unknown>).WebSocket ??= class {}

const { supabase } = await import('@/lib/auth')
const {
  syncPlantToSupabase,
  loadPlantsFromSupabase,
  updatePlantInSupabase,
  updatePlantStatusInSupabase,
  syncTasksToSupabase,
  replaceTasksForPlantInSupabase,
  loadTasksFromSupabase,
  completeTaskInSupabase,
  uncompleteTaskInSupabase,
  syncMeasurementToSupabase,
  loadMeasurementsFromSupabase,
  deleteMeasurementFromSupabase,
  syncWeekLogToSupabase,
  updateWeekLogInSupabase,
  deleteWeekLogFromSupabase,
  loadWeekLogsFromSupabase,
} = await import('@/lib/sync')

const TEST_EMAIL = import.meta.env.VITE_TEST_USER_EMAIL as string | undefined
const TEST_PASSWORD = import.meta.env.VITE_TEST_USER_PASSWORD as string | undefined
const hasCreds = Boolean(TEST_EMAIL && TEST_PASSWORD)

const PLANT_ID = crypto.randomUUID()

function mkTask(overrides: Partial<ScheduledTask> = {}): ScheduledTask {
  return {
    id: crypto.randomUUID(),
    plantId: PLANT_ID,
    type: 'nutrition',
    scheduledDate: new Date(),
    cycle: 'vege',
    week: 1,
    stage: 'growth',
    products: [],
    completed: false,
    ...overrides,
  }
}

// ────────────────────────────────────────────────────────────────────
// PARTE A — RLS: anonimo no lee ni escribe
// ────────────────────────────────────────────────────────────────────
describe('RLS: cliente anonimo bloqueado', () => {
  it('no puede insertar plantas', async () => {
    const { error } = await supabase.from('plants').insert([{
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(),
      name: 'hack', genetics: 'x', genetic_type: 'feminized',
      start_date: '2026-01-01',
    }])
    expect(error).not.toBeNull()
  })

  it('no puede insertar tareas', async () => {
    const { error } = await supabase.from('scheduled_tasks').insert([{
      id: crypto.randomUUID(), user_id: crypto.randomUUID(),
      plant_id: crypto.randomUUID(), type: 'nutrition',
      scheduled_date: '2026-01-01', cycle: 'vege', week: 1,
    }])
    expect(error).not.toBeNull()
  })

  it('no puede leer plantas de otros usuarios', async () => {
    const { data } = await supabase.from('plants').select('id').limit(5)
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede leer tareas de otros usuarios', async () => {
    const { data } = await supabase.from('scheduled_tasks').select('id').limit(5)
    expect(data ?? []).toHaveLength(0)
  })

  it('no puede leer mediciones ni diario de otros usuarios', async () => {
    const { data: m } = await supabase.from('measurements').select('id').limit(5)
    const { data: w } = await supabase.from('week_logs').select('id').limit(5)
    expect(m ?? []).toHaveLength(0)
    expect(w ?? []).toHaveLength(0)
  })
})

// ────────────────────────────────────────────────────────────────────
// PARTE B — Ciclo completo autenticado (requiere credenciales de test)
// ────────────────────────────────────────────────────────────────────
describe.runIf(hasCreds)('Ciclo completo contra la DB real', () => {
  let userId = ''

  it('login del usuario de prueba', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL!, password: TEST_PASSWORD!,
    })
    expect(error).toBeNull()
    userId = data.user!.id
  })

  it('crear planta (indoor + hidro) y leerla desde la DB', async () => {
    const plant: Plant = {
      id: PLANT_ID, name: 'E2E Masivo', genetics: 'Test Kush',
      geneticType: 'feminized', sex: 'unknown',
      startDate: new Date(), location: 'indoor', growMedium: 'hydro',
      potCount: 2, potVolumeLiters: 11,
      nutritionTableId: 'revegetar-v1', status: 'active',
    }
    await syncPlantToSupabase(plant)
    const plants = await loadPlantsFromSupabase(userId)
    const found = plants.find((p) => p.id === PLANT_ID)
    expect(found).toBeDefined()
    expect(found!.growMedium).toBe('hydro')
    expect(found!.location).toBe('indoor')
  })

  it('sincronizar 3 tareas y leerlas', async () => {
    await syncTasksToSupabase([mkTask(), mkTask({ week: 2 }), mkTask({ type: 'irrigation' })])
    const tasks = (await loadTasksFromSupabase(userId)).filter((t) => t.plantId === PLANT_ID)
    expect(tasks).toHaveLength(3)
  })

  it('completar tarea: completed=true y xp_awarded=true en la DB', async () => {
    const tasks = (await loadTasksFromSupabase(userId)).filter((t) => t.plantId === PLANT_ID)
    await completeTaskInSupabase(tasks[0].id, 'nota e2e')
    const after = (await loadTasksFromSupabase(userId)).find((t) => t.id === tasks[0].id)!
    expect(after.completed).toBe(true)
    expect(after.xpAwarded).toBe(true)
    expect(after.completionNotes).toBe('nota e2e')
  })

  it('deshacer tarea: completed=false pero xp_awarded SIGUE true (exploit cerrado)', async () => {
    const done = (await loadTasksFromSupabase(userId)).find((t) => t.plantId === PLANT_ID && t.completed)!
    await uncompleteTaskInSupabase(done.id)
    const after = (await loadTasksFromSupabase(userId)).find((t) => t.id === done.id)!
    expect(after.completed).toBe(false)
    expect(after.xpAwarded).toBe(true)
  })

  it('regenerar tareas: reemplaza sin dejar duplicados en la DB', async () => {
    await replaceTasksForPlantInSupabase(PLANT_ID, [mkTask({ week: 9 }), mkTask({ week: 10 })])
    const tasks = (await loadTasksFromSupabase(userId)).filter((t) => t.plantId === PLANT_ID)
    expect(tasks).toHaveLength(2) // si quedaran las 3 viejas serian 5
    expect(tasks.map((t) => t.week).sort()).toEqual([10, 9].sort())
  })

  it('editar planta: nombre y sustrato se actualizan en la DB', async () => {
    await updatePlantInSupabase(PLANT_ID, { name: 'E2E Editada', growMedium: 'coco' })
    const found = (await loadPlantsFromSupabase(userId)).find((p) => p.id === PLANT_ID)!
    expect(found.name).toBe('E2E Editada')
    expect(found.growMedium).toBe('coco')
  })

  it('cosechar y reactivar: el status viaja a la DB', async () => {
    await updatePlantStatusInSupabase(PLANT_ID, 'harvested')
    let found = (await loadPlantsFromSupabase(userId)).find((p) => p.id === PLANT_ID)!
    expect(found.status).toBe('harvested')
    await updatePlantStatusInSupabase(PLANT_ID, 'active')
    found = (await loadPlantsFromSupabase(userId)).find((p) => p.id === PLANT_ID)!
    expect(found.status).toBe('active')
  })

  it('medicion EC/pH: alta y baja contra la DB', async () => {
    const m = { id: crypto.randomUUID(), plantId: PLANT_ID, logDate: new Date(), ec: 1.2, ph: 6.1 }
    await syncMeasurementToSupabase(m, userId)
    let logs = (await loadMeasurementsFromSupabase(userId)).filter((l) => l.plantId === PLANT_ID)
    expect(logs).toHaveLength(1)
    expect(logs[0].ec).toBe(1.2)
    await deleteMeasurementFromSupabase(m.id)
    logs = (await loadMeasurementsFromSupabase(userId)).filter((l) => l.plantId === PLANT_ID)
    expect(logs).toHaveLength(0)
  })

  it('diario: crear, editar notas y borrar contra la DB', async () => {
    const log = { id: crypto.randomUUID(), plantId: PLANT_ID, weekLabel: 'V1', logDate: new Date(), notes: 'original' }
    await syncWeekLogToSupabase(log, userId)
    let logs = (await loadWeekLogsFromSupabase(userId)).filter((l) => l.plantId === PLANT_ID)
    expect(logs).toHaveLength(1)
    await updateWeekLogInSupabase(log.id, { notes: 'editada' })
    logs = (await loadWeekLogsFromSupabase(userId)).filter((l) => l.plantId === PLANT_ID)
    expect(logs[0].notes).toBe('editada')
    await deleteWeekLogFromSupabase(log.id)
    logs = (await loadWeekLogsFromSupabase(userId)).filter((l) => l.plantId === PLANT_ID)
    expect(logs).toHaveLength(0)
  })

  afterAll(async () => {
    // Limpieza total: borrar la planta cascadea tareas/mediciones/diario
    if (userId) {
      await supabase.from('plants').delete().eq('id', PLANT_ID)
      await supabase.auth.signOut()
    }
  })
})
