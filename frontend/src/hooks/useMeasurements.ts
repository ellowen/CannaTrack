import { useMeasurementStore } from '@/store/measurementStore'
import { useUserStore } from '@/store/userStore'
import type { MeasurementLog } from '@/types/measurement'
import { syncMeasurementToSupabase, deleteMeasurementFromSupabase } from '@/lib/sync'

export function useMeasurements(plantId: string) {
  const { logs, addLog: storeAddLog, deleteLog: storeDeleteLog } = useMeasurementStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  function addLogWithSync(data: Omit<MeasurementLog, 'id'>): MeasurementLog {
    const log = storeAddLog(data)
    const userId = useUserStore.getState().userId
    if (userId) void syncMeasurementToSupabase(log, userId)
    return log
  }

  function deleteLogWithSync(id: string): void {
    storeDeleteLog(id)
    void deleteMeasurementFromSupabase(id)
  }

  return { logs: plantLogs, addLog: addLogWithSync, deleteLog: deleteLogWithSync }
}
