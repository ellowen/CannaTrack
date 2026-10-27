import { addDays } from 'date-fns'
import { useTaskStore } from '@/store/taskStore'
import { showErrorToast } from '@/store/toastStore'
import { enqueueSyncAction } from '@/lib/syncQueue'
import { rescheduleTaskInSupabase, restoreTaskInSupabase, skipTaskInSupabase } from '@/lib/sync'
import type { ScheduledTask } from '@/types/plant'

/** Motivos rapidos para cancelar una tarea. */
export const SKIP_REASONS = ['Llovió', 'No hacía falta', 'Ya la hice por fuera'] as const

/** 'YYYY-MM-DD' -> Date local a medianoche. */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Cancelar, restaurar y reprogramar tareas. Cada accion actualiza primero el estado
 * local (la UI responde al instante, tambien sin conexion) y despues sincroniza con
 * Supabase; si falla, queda en la cola y se reintenta al volver la conexion.
 */
export function useTaskActions() {
  const { skipTask, restoreTask, rescheduleTask } = useTaskStore()

  async function skip(task: ScheduledTask, reason?: string): Promise<void> {
    const motivo = reason?.trim() || undefined
    skipTask(task.id, motivo)
    try {
      await skipTaskInSupabase(task.id, motivo)
    } catch (error) {
      console.error('[skipTask] Error sincronizando:', error)
      showErrorToast('La tarea se canceló en este dispositivo, pero no se pudo sincronizar. Revisá tu conexión.')
      enqueueSyncAction('skipTask', { taskId: task.id, reason: motivo })
    }
  }

  async function restore(task: ScheduledTask): Promise<void> {
    restoreTask(task.id)
    try {
      await restoreTaskInSupabase(task.id)
    } catch (error) {
      console.error('[restoreTask] Error sincronizando:', error)
      showErrorToast('La tarea se restauró en este dispositivo, pero no se pudo sincronizar. Revisá tu conexión.')
      enqueueSyncAction('restoreTask', { taskId: task.id })
    }
  }

  async function reschedule(task: ScheduledTask, newDate: Date): Promise<void> {
    const original = task.rescheduledFrom ?? task.scheduledDate
    rescheduleTask(task.id, newDate)
    try {
      await rescheduleTaskInSupabase(task.id, newDate, original)
    } catch (error) {
      console.error('[rescheduleTask] Error sincronizando:', error)
      showErrorToast('La tarea se movió en este dispositivo, pero no se pudo sincronizar. Revisá tu conexión.')
      enqueueSyncAction('rescheduleTask', { taskId: task.id, newDate, originalDate: original })
    }
  }

  /** Atajo: mover la tarea N dias desde hoy. */
  function rescheduleInDays(task: ScheduledTask, days: number): Promise<void> {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    return reschedule(task, addDays(hoy, days))
  }

  return { skip, restore, reschedule, rescheduleInDays }
}
