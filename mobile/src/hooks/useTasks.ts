import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { startOfDay, endOfDay } from 'date-fns'
import type { ScheduledTask } from '@shared/types/plant'

export function useTodayTasks() {
  const { user } = useAuth()
  const [tasks, setTasks]     = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const today = new Date()
    const { data } = await supabase
      .from('scheduled_tasks')
      .select('*')
      .eq('user_id', user.id)
      .gte('scheduled_date', startOfDay(today).toISOString())
      .lte('scheduled_date', endOfDay(today).toISOString())
      .order('type')

    setTasks((data ?? []).map(rowToTask))
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  async function completeTask(taskId: string, notes?: string) {
    await supabase
      .from('scheduled_tasks')
      .update({ completed: true, completed_at: new Date().toISOString(), completion_notes: notes })
      .eq('id', taskId)
    setTasks(t => t.map(x => x.id === taskId ? { ...x, completed: true } : x))
  }

  return { tasks, loading, completeTask, refetch: fetch }
}

function rowToTask(row: Record<string, unknown>): ScheduledTask {
  return {
    id:            row.id as string,
    plantId:       row.plant_id as string,
    type:          row.type as ScheduledTask['type'],
    scheduledDate: new Date(row.scheduled_date as string),
    cycle:         row.cycle as ScheduledTask['cycle'],
    week:          row.week as number,
    stage:         (row.stage as string) ?? '',
    products:      (row.products as ScheduledTask['products']) ?? [],
    ecMin:         (row.ec_min as number) ?? undefined,
    ecMax:         (row.ec_max as number) ?? undefined,
    phMin:         (row.ph_min as number) ?? undefined,
    phMax:         (row.ph_max as number) ?? undefined,
    completed:     (row.completed as boolean) ?? false,
  }
}
