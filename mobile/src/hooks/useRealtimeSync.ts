/**
 * Realtime sync multi-device via Supabase Realtime.
 * Escucha cambios en plants y scheduled_tasks y actualiza el store local.
 * Se activa solo cuando el usuario esta autenticado.
 */
import { useEffect, useRef } from 'react'
// usePlantStore y useTaskStore se usan via .getState() dentro de callbacks (no como hooks)
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useAuth } from './useAuth'
import type { Plant, ScheduledTask } from '@shared/types/plant'

// Mapea una fila de DB a Plant (mismo formato que loadPlantsFromSupabase)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPlant(p: any): Plant {
  return {
    id:                  p.id,
    name:                p.name,
    genetics:            p.genetics,
    geneticType:         p.genetic_type,
    sex:                 p.sex ?? 'unknown',
    startDate:           new Date(p.start_date),
    floraStartDate:      p.flora_start_date ? new Date(p.flora_start_date) : undefined,
    autoFlowerTotalDays: p.auto_flower_total_days ?? 77,
    location:            p.location ?? 'indoor',
    potCount:            p.pot_count ?? 1,
    potVolumeLiters:     p.pot_volume_liters ?? 11,
    nutritionTableId:    p.nutrition_table_id ?? 'revegetar',
    availableProducts:   p.available_products ?? [],
    status:              p.status ?? 'active',
    notes:               p.notes ?? '',
  }
}

// Mapea una fila de DB a ScheduledTask
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(t: any): ScheduledTask {
  return {
    id:            t.id,
    plantId:       t.plant_id,
    type:          t.type,
    scheduledDate: new Date(t.scheduled_date),
    completed:     t.completed ?? false,
    cycle:         t.cycle,
    week:          t.week,
    stage:         t.stage,
    products:      t.products ?? [],
    ecMin:         t.ec_min ?? undefined,
    ecMax:         t.ec_max ?? undefined,
    phMin:         t.ph_min ?? undefined,
    phMax:         t.ph_max ?? undefined,
  }
}

export function useRealtimeSync() {
  const { user } = useAuth()
  const channelRef = useRef<RealtimeChannel | null>(null)

  // No capturar plants/updateTask del hook — se obtienen del store dentro del callback
  // para evitar closures stale (H-01)
  useEffect(() => {
    if (!user) return

    // Limpiar canal previo si existe
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`realtime:user:${user.id}`)

      // ── Plants ──────────────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'plants', filter: `user_id=eq.${user.id}` },
        ({ new: row }) => {
          const { plants, addPlant } = usePlantStore.getState()
          const plant = rowToPlant(row)
          // Solo agregar si no existe ya (evita duplicados de la misma sesion)
          if (!plants.find(p => p.id === plant.id)) {
            addPlant(plant)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'plants', filter: `user_id=eq.${user.id}` },
        ({ new: row }) => {
          usePlantStore.getState().updatePlant(row.id as string, rowToPlant(row))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'plants', filter: `user_id=eq.${user.id}` },
        ({ old: row }) => {
          usePlantStore.getState().removePlant(row.id as string)
        }
      )

      // ── Scheduled tasks ─────────────────────────────────────────────────
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scheduled_tasks', filter: `user_id=eq.${user.id}` },
        ({ new: row }) => {
          useTaskStore.getState().updateTask(row.id as string, rowToTask(row))
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'scheduled_tasks', filter: `user_id=eq.${user.id}` },
        ({ old: row }) => {
          // Tarea eliminada del backend (ej: start_flora_phase borra y recrea) — remover del store (M-06)
          useTaskStore.getState().removeTask(row.id as string)
        }
      )

      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[realtime] conectado')
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn('[realtime] error de canal — reintentando...')
        }
      })

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [user?.id])
}
