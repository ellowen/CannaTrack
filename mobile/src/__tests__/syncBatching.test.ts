import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Sync queue with batching support.
 * Groups multiple updates to the same entity before sending.
 */
function createSyncQueueWithBatching() {
  interface SyncAction {
    id: string
    type: string
    entityId: string
    payload: Record<string, unknown>
    timestamp: number
  }

  interface Batch {
    plantId: string
    updates: Partial<Record<string, unknown>>
  }

  let queue: SyncAction[] = []
  let apiCallCount = 0

  function enqueue(
    type: string,
    entityId: string,
    payload: Record<string, unknown>
  ): void {
    const action: SyncAction = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      entityId,
      payload,
      timestamp: Date.now(),
    }
    queue.push(action)
  }

  function batchActionsForPlant(plantId: string): Batch {
    const plantActions = queue.filter((a) => a.entityId === plantId)
    const updates: Partial<Record<string, unknown>> = {}

    for (const action of plantActions) {
      Object.assign(updates, action.payload)
    }

    return {
      plantId,
      updates,
    }
  }

  async function processBatch(batch: Batch): Promise<void> {
    apiCallCount++
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 0))

    // Remove processed actions from queue
    queue = queue.filter(
      (a) =>
        !(
          a.entityId === batch.plantId &&
          a.type === 'updatePlant'
        )
    )
  }

  async function sync(): Promise<void> {
    // Get unique plant IDs with pending updates
    const plantIds = new Set(
      queue
        .filter((a) => a.type === 'updatePlant')
        .map((a) => a.entityId)
    )

    // Process one batch per plant
    for (const plantId of plantIds) {
      const batch = batchActionsForPlant(plantId)
      await processBatch(batch)
    }
  }

  function _getInternalState() {
    return {
      queueLength: queue.length,
      apiCallCount,
      queue: [...queue],
    }
  }

  return {
    enqueue,
    sync,
    batchActionsForPlant,
    _getInternalState,
  }
}

describe('Sync Queue Batching', () => {
  let syncQueue: ReturnType<typeof createSyncQueueWithBatching>

  beforeEach(() => {
    syncQueue = createSyncQueueWithBatching()
  })

  describe('Basic batching', () => {
    it('should batch multiple updates to same plant', () => {
      const plantId = 'plant-123'

      syncQueue.enqueue('updatePlant', plantId, { height: 20 })
      syncQueue.enqueue('updatePlant', plantId, { ph: 6.5 })
      syncQueue.enqueue('updatePlant', plantId, { ec: 0.8 })

      const batch = syncQueue.batchActionsForPlant(plantId)

      expect(batch.updates).toEqual({
        height: 20,
        ph: 6.5,
        ec: 0.8,
      })
    })

    it('should make only 1 API call for batched updates', async () => {
      const plantId = 'plant-123'

      syncQueue.enqueue('updatePlant', plantId, { status: 'flowering' })
      syncQueue.enqueue('updatePlant', plantId, { stage: 'F3' })
      syncQueue.enqueue('updatePlant', plantId, { lastChecked: '2026-04-24' })

      await syncQueue.sync()

      expect(syncQueue._getInternalState().apiCallCount).toBe(1)
    })

    it('should produce correct merged state after batching', async () => {
      const plantId = 'plant-abc'

      syncQueue.enqueue('updatePlant', plantId, { stage: 'S1' })
      syncQueue.enqueue('updatePlant', plantId, { height: 5 })
      syncQueue.enqueue('updatePlant', plantId, { leaves: 2 })

      const batch = syncQueue.batchActionsForPlant(plantId)

      expect(batch.updates.stage).toBe('S1')
      expect(batch.updates.height).toBe(5)
      expect(batch.updates.leaves).toBe(2)
    })
  })

  describe('Multiple plant batching', () => {
    it('should batch updates per plant separately', async () => {
      syncQueue.enqueue('updatePlant', 'plant-1', { height: 10 })
      syncQueue.enqueue('updatePlant', 'plant-1', { ph: 6.0 })
      syncQueue.enqueue('updatePlant', 'plant-2', { status: 'active' })
      syncQueue.enqueue('updatePlant', 'plant-2', { ec: 1.0 })

      await syncQueue.sync()

      // 2 API calls - one per plant
      expect(syncQueue._getInternalState().apiCallCount).toBe(2)
    })

    it('should send correct updates for each plant', async () => {
      const plant1Id = 'plant-1'
      const plant2Id = 'plant-2'

      syncQueue.enqueue('updatePlant', plant1Id, { height: 15 })
      syncQueue.enqueue('updatePlant', plant1Id, { ph: 6.2 })
      syncQueue.enqueue('updatePlant', plant2Id, { stage: 'flowering' })
      syncQueue.enqueue('updatePlant', plant2Id, { daysInStage: 5 })

      const batch1 = syncQueue.batchActionsForPlant(plant1Id)
      const batch2 = syncQueue.batchActionsForPlant(plant2Id)

      expect(batch1.updates).toEqual({ height: 15, ph: 6.2 })
      expect(batch2.updates).toEqual({ stage: 'flowering', daysInStage: 5 })
    })

    it('should handle 5 plants with 5 updates each efficiently', async () => {
      for (let plantIdx = 1; plantIdx <= 5; plantIdx++) {
        const plantId = `plant-${plantIdx}`
        for (let updateIdx = 1; updateIdx <= 5; updateIdx++) {
          syncQueue.enqueue('updatePlant', plantId, {
            [`field${updateIdx}`]: `value${updateIdx}`,
          })
        }
      }

      await syncQueue.sync()

      // 5 plants = 5 API calls (one batch per plant)
      expect(syncQueue._getInternalState().apiCallCount).toBe(5)
      // Queue should be empty
      expect(syncQueue._getInternalState().queueLength).toBe(0)
    })
  })

  describe('Payload merging', () => {
    it('should merge non-conflicting fields', () => {
      const plantId = 'plant-xyz'

      syncQueue.enqueue('updatePlant', plantId, { height: 20 })
      syncQueue.enqueue('updatePlant', plantId, { ph: 6.5 })
      syncQueue.enqueue('updatePlant', plantId, { ec: 0.9 })

      const batch = syncQueue.batchActionsForPlant(plantId)

      expect(Object.keys(batch.updates)).toHaveLength(3)
      expect(batch.updates.height).toBe(20)
      expect(batch.updates.ph).toBe(6.5)
      expect(batch.updates.ec).toBe(0.9)
    })

    it('should overwrite conflicting fields with latest value', () => {
      const plantId = 'plant-conflict'

      syncQueue.enqueue('updatePlant', plantId, { status: 'vegetative' })
      syncQueue.enqueue('updatePlant', plantId, { status: 'flowering' })
      syncQueue.enqueue('updatePlant', plantId, { status: 'harvested' })

      const batch = syncQueue.batchActionsForPlant(plantId)

      // Last value should win
      expect(batch.updates.status).toBe('harvested')
    })

    it('should handle nested object merging', () => {
      const plantId = 'plant-nested'

      syncQueue.enqueue('updatePlant', plantId, {
        measurements: {
          height: 25,
          width: 15,
        },
      })

      syncQueue.enqueue('updatePlant', plantId, {
        measurements: {
          height: 26, // This overwrites the previous height
          humidity: 65,
        },
      })

      const batch = syncQueue.batchActionsForPlant(plantId)

      // The second update overwrites the entire measurements object
      expect(batch.updates.measurements).toEqual({
        height: 26,
        humidity: 65,
      })
    })
  })

  describe('Queue cleanup after sync', () => {
    it('should remove synced actions from queue', async () => {
      const plantId = 'plant-cleanup'

      syncQueue.enqueue('updatePlant', plantId, { field1: 'value1' })
      syncQueue.enqueue('updatePlant', plantId, { field2: 'value2' })

      expect(syncQueue._getInternalState().queueLength).toBe(2)

      await syncQueue.sync()

      expect(syncQueue._getInternalState().queueLength).toBe(0)
    })

    it('should preserve non-update actions in queue', async () => {
      syncQueue.enqueue('updatePlant', 'plant-1', { height: 10 })
      syncQueue.enqueue('addXP', 'plant-1', { amount: 100 })
      syncQueue.enqueue('completeTask', 'task-1', { done: true })

      await syncQueue.sync()

      const state = syncQueue._getInternalState()
      // updatePlant should be synced, others remain
      expect(state.queueLength).toBe(2)
      expect(
        state.queue.every((a) => a.type !== 'updatePlant')
      ).toBe(true)
    })

    it('should handle syncing when queue is empty', async () => {
      expect(() => {
        syncQueue.sync()
      }).not.toThrow()
    })
  })

  describe('Batching benefits', () => {
    it('should reduce API calls vs one-call-per-update', async () => {
      const plantId = 'plant-benefit'
      const updateCount = 10

      // Queue 10 updates to same plant
      for (let i = 0; i < updateCount; i++) {
        syncQueue.enqueue('updatePlant', plantId, {
          [`metric${i}`]: i,
        })
      }

      await syncQueue.sync()

      // Batching: 1 API call
      expect(syncQueue._getInternalState().apiCallCount).toBe(1)
      // Without batching: 10 API calls
      expect(syncQueue._getInternalState().apiCallCount).toBeLessThan(
        updateCount
      )
    })

    it('should preserve all data in single batched request', async () => {
      const plantId = 'plant-data'

      const originalPayloads = [
        { height: 15, leaves: 4 },
        { ph: 6.3, ec: 0.85 },
        { stage: 'S3', lastWater: '2026-04-24' },
      ]

      for (const payload of originalPayloads) {
        syncQueue.enqueue('updatePlant', plantId, payload)
      }

      const batch = syncQueue.batchActionsForPlant(plantId)

      // All fields should be present in final batch
      expect(batch.updates.height).toBe(15)
      expect(batch.updates.leaves).toBe(4)
      expect(batch.updates.ph).toBe(6.3)
      expect(batch.updates.ec).toBe(0.85)
      expect(batch.updates.stage).toBe('S3')
      expect(batch.updates.lastWater).toBe('2026-04-24')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty batch', () => {
      const batch = syncQueue.batchActionsForPlant('nonexistent')

      expect(batch.updates).toEqual({})
    })

    it('should handle plants with special characters in ID', () => {
      const plantId = 'plant-123!@#$%'

      syncQueue.enqueue('updatePlant', plantId, { status: 'active' })

      const batch = syncQueue.batchActionsForPlant(plantId)

      expect(batch.plantId).toBe(plantId)
      expect(batch.updates.status).toBe('active')
    })

    it('should handle null/undefined values in payload', () => {
      const plantId = 'plant-nulls'

      syncQueue.enqueue('updatePlant', plantId, { field1: null })
      syncQueue.enqueue('updatePlant', plantId, { field2: undefined })

      const batch = syncQueue.batchActionsForPlant(plantId)

      expect(batch.updates.field1).toBeNull()
      expect(batch.updates.field2).toBeUndefined()
    })

    it('should batch large payloads efficiently', async () => {
      const plantId = 'plant-large'

      // Simulate large photo metadata
      const largePayload = {
        photoData: 'x'.repeat(10000),
        metadata: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: `data-${i}`,
        })),
      }

      syncQueue.enqueue('updatePlant', plantId, largePayload)
      syncQueue.enqueue('updatePlant', plantId, { height: 25 })

      await syncQueue.sync()

      // Still only 1 API call despite large payload
      expect(syncQueue._getInternalState().apiCallCount).toBe(1)
    })
  })
})
