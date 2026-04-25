import { useMeasurementStore } from '@/store/measurementStore'
import { enqueueSyncAction } from '@/lib/syncQueue'
import type { MeasurementLog } from '@/types/measurement'

export function useMeasurements(plantId: string) {
  const { logs, addLog, deleteLog } = useMeasurementStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  function addLogWithSync(measurement: MeasurementLog): void {
    addLog(measurement)
    enqueueSyncAction('addXP', {
      userId: plantId, // Nota: esto debería ser el userId real, pero aquí va plantId como placeholder
      amount: measurement.ec ? 10 : 5, // XP variable según tipo de medición
      reason: `Medición registrada para planta ${plantId}`,
    })
  }

  return { logs: plantLogs, addLog: addLogWithSync, deleteLog }
}
