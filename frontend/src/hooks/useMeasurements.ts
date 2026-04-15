import { useMeasurementStore } from '@/store/measurementStore'

export function useMeasurements(plantId: string) {
  const { logs, addLog, deleteLog } = useMeasurementStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  return { logs: plantLogs, addLog, deleteLog }
}
