import { useWeekLogStore } from '@/store/weekLogStore'

/**
 * Returns logs for a single plant, sorted most-recent first.
 */
export function useWeekLog(plantId: string) {
  const { logs, addLog, updateLog, deleteLog } = useWeekLogStore()

  const plantLogs = logs
    .filter((l) => l.plantId === plantId)
    .sort((a, b) => b.logDate.getTime() - a.logDate.getTime())

  return { logs: plantLogs, addLog, updateLog, deleteLog }
}
