import { useSync } from '@/hooks/useSync'
import { useEffect, useState } from 'react'

/**
 * SyncStatus component muestra el estado de sincronización offline-first.
 * Indica:
 * - Número de acciones pending
 * - Si está sincronizando
 * - Última sincronización exitosa
 * - Errores de sync
 */
export function SyncStatus() {
  const { isSyncing, lastSync, syncError, pendingCount, sync } = useSync()
  const [formatTime, setFormatTime] = useState<string | null>(null)

  useEffect(() => {
    if (!lastSync) {
      setFormatTime(null)
      return
    }

    const diff = Date.now() - lastSync.getTime()
    const minutes = Math.floor(diff / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)

    if (minutes > 0) {
      setFormatTime(`${minutes}m ago`)
    } else if (seconds > 0) {
      setFormatTime(`${seconds}s ago`)
    } else {
      setFormatTime('just now')
    }
  }, [lastSync])

  return (
    <div className="flex items-center gap-2 text-sm">
      {pendingCount > 0 && (
        <button
          onClick={() => sync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-blue-700 border-t-transparent rounded-full animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <span className="inline-block w-2 h-2 bg-blue-700 rounded-full" />
              {pendingCount} pending
            </>
          )}
        </button>
      )}

      {syncError && (
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-100 text-red-700 text-xs">
          <span>Sync error</span>
        </div>
      )}

      {lastSync && !pendingCount && !isSyncing && (
        <div className="text-xs text-gray-500">
          Synced {formatTime}
        </div>
      )}
    </div>
  )
}
