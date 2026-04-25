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
  clearQueue: () => void
  setIsSyncing: (v: boolean) => void
  setSyncError: (error: string | null) => void
  setLastSyncAt: (date: Date | null) => void
  clearSyncError: () => void

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

      clearQueue: () => set({ syncQueue: [] }),
      setIsSyncing: (isSyncing) => set({ isSyncing }),
      setSyncError: (syncError) => set({ syncError }),
      setLastSyncAt: (lastSyncAt) => set({ lastSyncAt }),
      clearSyncError: () => set({ syncError: null }),

      getPendingActionsCount: () => get().syncQueue.length,
      getLastSyncTime: () => get().lastSyncAt,
    }),
    {
      name: 'cannatrack-sync',
      storage: createAsyncStorage(),
    }
  )
)
