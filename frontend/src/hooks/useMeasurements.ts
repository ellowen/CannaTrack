import { useMeasurementStore } from '@/store/measurementStore'
import { deleteMeasurementFromSupabase } from '@/lib/sync'

export function useMeasurements(plantId: string) {
  const { logs, addLog, deleteLog: storeDeleteLog } = useMeasurementStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  function deleteLogWithSync(id: string): void {
    storeDeleteLog(id)
    void deleteMeasurementFromSupabase(id)
  }

  return { logs: plantLogs, addLog, deleteLog: deleteLogWithSync }
}
