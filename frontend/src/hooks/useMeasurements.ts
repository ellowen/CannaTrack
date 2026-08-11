import { useMeasurementStore } from '@/store/measurementStore'
import { useUserStore } from '@/store/userStore'
import type { MeasurementLog } from '@/types/measurement'
import { syncMeasurementToSupabase, deleteMeasurementFromSupabase } from '@/lib/sync'
import { showErrorToast } from '@/store/toastStore'

export function useMeasurements(plantId: string) {
  const { logs, addLog: storeAddLog, deleteLog: storeDeleteLog } = useMeasurementStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  function addLogWithSync(data: Omit<MeasurementLog, 'id'>): MeasurementLog {
    const log = storeAddLog(data)
    const userId = useUserStore.getState().userId
    if (userId) {
      syncMeasurementToSupabase(log, userId).catch((err) => {
        console.error('Error sincronizando medicion:', err)
        showErrorToast('No se pudo sincronizar la medición. Revisá tu conexión.')
      })
    }
    return log
  }

  function deleteLogWithSync(id: string): void {
    storeDeleteLog(id)
    deleteMeasurementFromSupabase(id).catch((err) => {
      console.error('Error eliminando medicion:', err)
      showErrorToast('No se pudo eliminar la medición del servidor. Revisá tu conexión.')
    })
  }

  return { logs: plantLogs, addLog: addLogWithSync, deleteLog: deleteLogWithSync }
}
