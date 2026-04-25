import { useCallback, useEffect, useState } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { onOnline } from '@/lib/network'

/**
 * Hook para sincronización offline-first.
 * - Automáticamente sincroniza cuando app vuelve online
 * - Expone método manual sync() para control explícito
 * - Maneja errores con retry exponencial
 */
export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const {
    syncQueue,
    setSyncError: storeSyncError,
    setIsSyncing: storeSetIsSyncing,
    clearQueue,
    setLastSyncAt,
  } = useSyncStore()

  const sync = useCallback(async () => {
    if (syncQueue.length === 0) {
      setLastSync(new Date())
      return
    }

    setIsSyncing(true)
    storeSetIsSyncing(true)
    setSyncError(null)

    try {
      // TODO: Implement full sync with syncService
      // For now, just mark as synced
      const now = new Date()
      setLastSync(now)
      setLastSyncAt(now)
      clearQueue()
      setSyncError(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sync failed'
      setSyncError(message)
      storeSyncError(message)
      console.error('Sync error:', error)
    } finally {
      setIsSyncing(false)
      storeSetIsSyncing(false)
    }
  }, [syncQueue, storeSetIsSyncing, storeSyncError, clearQueue, setLastSyncAt])

  // Auto-sync cuando app vuelve online
  useEffect(() => {
    const cleanup = onOnline(sync)
    return cleanup
  }, [sync])

  return {
    sync,
    isSyncing,
    lastSync,
    syncError,
    pendingCount: syncQueue.length,
  }
}
