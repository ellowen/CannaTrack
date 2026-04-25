import { useCallback, useEffect, useState } from 'react'
import { useSupabaseClient } from '@supabase/auth-helpers-react'
import { useSyncStore } from '@/store/syncStore'
import { syncService } from '@/lib/sync/syncService'
import { isOnline, onOnline } from '@/lib/network'

/**
 * Hook para sincronización offline-first (mobile).
 * - Automáticamente sincroniza cuando dispositivo vuelve online
 * - Expone método manual sync() para control explícito
 * - Maneja errores con retry exponencial
 */
export function useSync() {
  const supabase = useSupabaseClient()
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  const {
    syncQueue,
    lastSyncAt,
    setSyncError: storeSyncError,
    setIsSyncing: storeSetIsSyncing,
    clearQueue,
    setLastSyncAt,
  } = useSyncStore()

  const sync = useCallback(async () => {
    const online = await isOnline()
    if (!online) {
      setSyncError('No internet connection')
      return
    }

    if (syncQueue.length === 0) {
      setLastSync(new Date())
      return
    }

    setIsSyncing(true)
    storeSetIsSyncing(true)
    setSyncError(null)

    try {
      await syncService.fullSync(supabase, syncQueue, lastSyncAt)
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
  }, [supabase, syncQueue, lastSyncAt, storeSetIsSyncing, storeSyncError, clearQueue, setLastSyncAt])

  // Auto-sync cuando dispositivo vuelve online
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
