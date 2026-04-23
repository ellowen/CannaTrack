import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createAsyncStorage } from '@/lib/storage'

export type SyncAction = {
  id: string
  type: 'addPlant' | 'updatePlant' | 'completeTask' | 'addXP' | 'uploadPhoto'
  payload: Record<string, unknown>
  timestamp: Date
}

interface SyncStore {
  syncQueue: SyncAction[]
  isSyncing: boolean
  lastSyncAt: Date | null
  syncError: string | null

  // Acciones
  enqueueSyncAction: (action: Omit<SyncAction, 'id' | 'timestamp'>) => void
  flushSyncQueue: (onlineActions?: SyncAction[]) => Promise<SyncAction[]>
  setSyncError: (error: string | null) => void
  clearQueue: () => void
  setIsSyncing: (v: boolean) => void

  // Selectors
  getPendingActionsCount: () => number
  getLastSyncTime: () => Date | null
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      syncQueue: [],
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,

      enqueueSyncAction: (action) =>
        set((s) => ({
          syncQueue: [
            ...s.syncQueue,
            {
              ...action,
              id: `${Date.now()}-${Math.random()}`,
              timestamp: new Date(),
            },
          ],
        })),

      flushSyncQueue: async (onlineActions?: SyncAction[]) => {
        set({ isSyncing: true, syncError: null })
        try {
          const actionsToSync = onlineActions || get().syncQueue
          // Aquí va la lógica real de sincronización con Supabase
          // Por ahora, limpiamos la queue en el cliente
          set({
            syncQueue: [],
            lastSyncAt: new Date(),
            isSyncing: false,
          })
          return actionsToSync
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : 'Sync failed',
            isSyncing: false,
          })
          return []
        }
      },

      setSyncError: (syncError) => set({ syncError }),
      clearQueue: () => set({ syncQueue: [] }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),

      getPendingActionsCount: () => get().syncQueue.length,
      getLastSyncTime: () => get().lastSyncAt,
    }),
    {
      name: 'cannatrack-sync',
      storage: createAsyncStorage(),
    }
  )
)
