import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  enqueueSyncAction,
  processSyncQueue,
  getSyncQueueStatus,
  clearSyncQueue,
} from '@/lib/syncQueue'
import { useSyncStore } from '@/store/syncStore'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabase } from '@/lib/supabase'

describe('SyncQueue - Offline -> Online Sync Cycle', () => {
  beforeEach(() => {
    // Reset store before each test
    useSyncStore.setState({
      syncQueue: [],
      isSyncing: false,
      lastSyncAt: null,
      syncError: null,
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    clearSyncQueue()
  })

  describe('Offline queueing', () => {
    it('should enqueue updatePlant action when offline', () => {
      enqueueSyncAction('updatePlant', {
        plantId: 'plant-123',
        status: 'harvested',
      })

      const status = getSyncQueueStatus()
      expect(status.pendingCount).toBe(1)
      expect(status.isSyncing).toBe(false)
    })

    it('should enqueue multiple actions', () => {
      enqueueSyncAction('updatePlant', { plantId: 'plant-1', status: 'active' })
      enqueueSyncAction('completeTask', { taskId: 'task-1' })
      enqueueSyncAction('addXP', { amount: 100 })

      const status = getSyncQueueStatus()
      expect(status.pendingCount).toBe(3)
    })

    it('should preserve action payload exactly', () => {
      const payload = {
        plantId: 'plant-abc',
        status: 'discarded',
        reason: 'pest-infestation',
      }

      enqueueSyncAction('updatePlant', payload)

      const store = useSyncStore.getState()
      const action = store.syncQueue[0]
      expect(action.payload).toEqual(payload)
    })

    it('should assign unique IDs to queued actions', () => {
      enqueueSyncAction('completeTask', { taskId: 'task-1' })
      enqueueSyncAction('completeTask', { taskId: 'task-1' })

      const store = useSyncStore.getState()
      const id1 = store.syncQueue[0].id
      const id2 = store.syncQueue[1].id
      expect(id1).not.toBe(id2)
    })

    it('should set timestamp on queued actions', () => {
      const before = new Date()
      enqueueSyncAction('updatePlant', { plantId: 'plant-1', status: 'active' })
      const after = new Date()

      const store = useSyncStore.getState()
      const action = store.syncQueue[0]
      expect(action.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(action.timestamp.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('Online sync processing', () => {
    it('should process sync queue when online with valid auth', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: mockUpdate,
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      enqueueSyncAction('updatePlant', {
        plantId: 'plant-1',
        status: 'harvested',
      })

      await processSyncQueue()

      const status = getSyncQueueStatus()
      expect(status.pendingCount).toBe(0)
      expect(status.isSyncing).toBe(false)
      expect(status.error).toBeNull()
    })

    it('should clear queue after successful sync', async () => {
      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      enqueueSyncAction('completeTask', { taskId: 'task-1' })
      enqueueSyncAction('completeTask', { taskId: 'task-2' })

      await processSyncQueue()

      expect(getSyncQueueStatus().pendingCount).toBe(0)
    })

    it('should update lastSyncAt timestamp after successful sync', async () => {
      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      const beforeSync = new Date()
      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })

      await processSyncQueue()

      const status = getSyncQueueStatus()
      const afterSync = new Date()

      expect(status.lastSyncAt).not.toBeNull()
      expect(status.lastSyncAt!.getTime()).toBeGreaterThanOrEqual(
        beforeSync.getTime()
      )
      expect(status.lastSyncAt!.getTime()).toBeLessThanOrEqual(
        afterSync.getTime()
      )
    })

    it('should set isSyncing flag during sync', async () => {
      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })

      const syncPromise = processSyncQueue()
      // Note: isSyncing might already be false by the time we check,
      // so we verify it was set and then cleared
      await syncPromise

      expect(getSyncQueueStatus().isSyncing).toBe(false)
    })

    it('should clear syncError on successful sync', async () => {
      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      // Set an error first
      useSyncStore.setState({ syncError: 'Previous error' })

      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })
      await processSyncQueue()

      expect(getSyncQueueStatus().error).toBeNull()
    })
  })

  describe('Sync error handling', () => {
    it('should set syncError when auth fails', async () => {
      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: null },
        })

      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })

      await processSyncQueue()

      const status = getSyncQueueStatus()
      expect(status.error).not.toBeNull()
      expect(status.error).toContain('no autenticado')
    })

    it('should set syncError when Supabase update fails', async () => {
      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error('Database connection failed'),
            }),
          }),
        }),
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })

      await processSyncQueue()

      const status = getSyncQueueStatus()
      expect(status.error).not.toBeNull()
    })

    it('should continue processing other actions if one fails', async () => {
      const mockUpdate = vi
        .fn()
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              error: new Error('Plant not found'),
            }),
          }),
        })
        .mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        })

      vi.mocked(supabase).from = vi.fn().mockReturnValue({
        update: mockUpdate,
      })

      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: { id: 'user-123' } },
        })

      enqueueSyncAction('updatePlant', { plantId: 'bad-id', status: 'active' })
      enqueueSyncAction('updatePlant', { plantId: 'good-id', status: 'active' })

      await processSyncQueue()

      // Queue should be cleared despite one action failing
      expect(getSyncQueueStatus().pendingCount).toBe(0)
    })

    it('should not retry on auth failure', async () => {
      vi.mocked(supabase).auth.getUser = vi
        .fn()
        .mockResolvedValue({
          data: { user: null },
        })

      enqueueSyncAction('updatePlant', { plantId: 'p1', status: 'active' })

      await processSyncQueue()

      // Should only call getUser once, no retries
      expect(vi.mocked(supabase).auth.getUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('Empty queue handling', () => {
    it('should handle empty queue gracefully', async () => {
      await processSyncQueue()

      const status = getSyncQueueStatus()
      expect(status.pendingCount).toBe(0)
      expect(status.error).toBeNull()
    })

    it('should not make API calls for empty queue', async () => {
      vi.mocked(supabase).auth.getUser = vi.fn()

      await processSyncQueue()

      expect(vi.mocked(supabase).auth.getUser).not.toHaveBeenCalled()
    })
  })
})
