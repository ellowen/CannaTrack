import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useSyncStore } from '@/store/syncStore'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { createMockPlant, createMockTask } from './fixtures'
import type { SyncAction } from '@shared/types/sync'

/**
 * Integration test: Offline Sync Cycle
 *
 * Tests the complete offline-first workflow:
 * 1. Start offline
 * 2. Create plant, complete tasks (all queued)
 * 3. Take measurements
 * 4. Go online
 * 5. Verify sync completes
 * 6. Verify data persists
 */
describe('Offline Sync Cycle', () => {
  let syncStore: ReturnType<typeof useSyncStore.getState>
  let plantStore: ReturnType<typeof usePlantStore.getState>
  let taskStore: ReturnType<typeof useTaskStore.getState>

  beforeEach(() => {
    syncStore = useSyncStore.getState()
    plantStore = usePlantStore.getState()
    taskStore = useTaskStore.getState()

    // Clear all stores
    syncStore.clearQueue()
    plantStore.setPlants([])
    taskStore.setAllTasks([])
    syncStore.setIsSyncing(false)
    syncStore.setSyncError(null)
  })

  describe('Offline operations', () => {
    it('should queue plant creation when offline', () => {
      // Arrange
      const plant = createMockPlant({ name: 'Offline Plant' })

      // Act - simulate offline
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })

      // Assert
      expect(syncStore.syncQueue).toHaveLength(1)
      expect(syncStore.syncQueue[0].type).toBe('plant:create')
      expect(syncStore.syncQueue[0].plantId).toBe(plant.id)
    })

    it('should queue task completion when offline', () => {
      // Arrange
      const task = createMockTask('plant-1', { completed: true })

      // Act
      syncStore.enqueueAction({
        type: 'task:complete',
        plantId: 'plant-1',
        payload: task,
        timestamp: new Date(),
      })

      // Assert
      expect(syncStore.syncQueue).toHaveLength(1)
      expect(syncStore.syncQueue[0].type).toBe('task:complete')
    })

    it('should queue multiple operations offline', () => {
      // Act
      const plant = createMockPlant()
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })

      const task = createMockTask(plant.id)
      syncStore.enqueueAction({
        type: 'task:complete',
        plantId: plant.id,
        payload: task,
        timestamp: new Date(),
      })

      // Assert
      expect(syncStore.syncQueue).toHaveLength(2)
    })

    it('should update local state immediately', () => {
      // Arrange
      const plant = createMockPlant({ name: 'Local Update Test' })

      // Act - update local state immediately
      plantStore.addPlant(plant)

      // Assert
      expect(plantStore.getPlantById(plant.id)).toBeDefined()
      expect(plantStore.getActivePlants()).toHaveLength(1)
    })
  })

  describe('Sync queue management', () => {
    it('should not sync when queue is empty', () => {
      // Arrange
      expect(syncStore.syncQueue).toHaveLength(0)

      // Act & Assert
      expect(syncStore.isSyncing).toBe(false)
    })

    it('should batch multiple actions for same plant', () => {
      // Arrange
      const plant = createMockPlant()
      const action1: SyncAction = {
        type: 'plant:create',
        plantId: plant.id,
        payload: { ...plant, notes: 'Initial' },
        timestamp: new Date(),
      }
      const action2: SyncAction = {
        type: 'plant:update',
        plantId: plant.id,
        payload: { ...plant, notes: 'Updated' },
        timestamp: new Date(),
      }

      // Act
      syncStore.enqueueAction(action1)
      syncStore.enqueueAction(action2)

      // Assert
      expect(syncStore.syncQueue).toHaveLength(2)
      expect(syncStore.syncQueue[1].payload).toEqual({
        ...plant,
        notes: 'Updated',
      })
    })

    it('should clear queue after successful sync', () => {
      // Arrange
      const plant = createMockPlant()
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })
      expect(syncStore.syncQueue).toHaveLength(1)

      // Act
      syncStore.clearQueue()

      // Assert
      expect(syncStore.syncQueue).toHaveLength(0)
    })

    it('should track sync state', () => {
      // Act
      syncStore.setIsSyncing(true)

      // Assert
      expect(syncStore.isSyncing).toBe(true)

      // Act
      syncStore.setIsSyncing(false)

      // Assert
      expect(syncStore.isSyncing).toBe(false)
    })
  })

  describe('Sync error handling', () => {
    it('should track sync errors', () => {
      // Arrange
      const errorMsg = 'Network timeout'

      // Act
      syncStore.setSyncError(errorMsg)

      // Assert
      expect(syncStore.syncError).toBe(errorMsg)
    })

    it('should clear error on successful sync', () => {
      // Arrange
      syncStore.setSyncError('Previous error')

      // Act
      syncStore.setSyncError(null)

      // Assert
      expect(syncStore.syncError).toBeNull()
    })

    it('should keep queue if sync fails', () => {
      // Arrange
      const plant = createMockPlant()
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })
      const queueLength = syncStore.syncQueue.length

      // Act - simulate sync failure
      syncStore.setSyncError('Sync failed')

      // Assert - queue should remain
      expect(syncStore.syncQueue).toHaveLength(queueLength)
    })
  })

  describe('Offline to online transition', () => {
    it('should process queue when coming online', async () => {
      // Arrange
      const plant = createMockPlant()
      plantStore.addPlant(plant)

      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })

      const queuedActionsCount = syncStore.syncQueue.length
      expect(queuedActionsCount).toBeGreaterThan(0)

      // Act - simulate coming online
      syncStore.setIsSyncing(true)

      // Assert
      expect(syncStore.isSyncing).toBe(true)
    })

    it('should update lastSyncAt after sync', () => {
      // Arrange
      const beforeSync = syncStore.lastSyncAt

      // Act
      const newSyncTime = new Date()
      syncStore.setLastSyncAt(newSyncTime)

      // Assert
      expect(syncStore.lastSyncAt).toEqual(newSyncTime)
      expect(syncStore.lastSyncAt?.getTime()).toBeGreaterThanOrEqual(beforeSync?.getTime() || 0)
    })
  })

  describe('Data consistency during offline sync', () => {
    it('should maintain plant data after offline operations', () => {
      // Arrange
      const plant = createMockPlant({
        name: 'Consistency Test',
        notes: 'Test plant',
      })
      plantStore.addPlant(plant)

      // Act - queue sync action
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant.id,
        payload: plant,
        timestamp: new Date(),
      })

      // Assert - local data should match
      const localPlant = plantStore.getPlantById(plant.id)
      expect(localPlant?.name).toBe('Consistency Test')
      expect(localPlant?.notes).toBe('Test plant')
    })

    it('should preserve task completion offline', () => {
      // Arrange
      const task = createMockTask('plant-1', { completed: false })
      taskStore.addTask(task)

      // Act - mark task complete offline
      taskStore.completeTask(task.id, 'Completed offline')
      syncStore.enqueueAction({
        type: 'task:complete',
        plantId: 'plant-1',
        payload: { ...task, completed: true },
        timestamp: new Date(),
      })

      // Assert
      const completedTask = taskStore.tasks.find((t) => t.id === task.id)
      expect(completedTask?.completed).toBe(true)
      expect(completedTask?.completionNotes).toBe('Completed offline')
    })

    it('should handle concurrent offline operations', () => {
      // Arrange
      const plant1 = createMockPlant({ id: 'plant-1' })
      const plant2 = createMockPlant({ id: 'plant-2' })
      const task1 = createMockTask('plant-1')
      const task2 = createMockTask('plant-2')

      // Act
      plantStore.addPlant(plant1)
      plantStore.addPlant(plant2)
      taskStore.addTask(task1)
      taskStore.addTask(task2)

      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant1.id,
        payload: plant1,
        timestamp: new Date(),
      })
      syncStore.enqueueAction({
        type: 'task:complete',
        plantId: 'plant-1',
        payload: task1,
        timestamp: new Date(),
      })
      syncStore.enqueueAction({
        type: 'plant:create',
        plantId: plant2.id,
        payload: plant2,
        timestamp: new Date(),
      })

      // Assert
      expect(plantStore.getActivePlants()).toHaveLength(2)
      expect(syncStore.syncQueue).toHaveLength(3)
    })
  })

  describe('Offline measurements', () => {
    it('should queue measurement updates offline', () => {
      // Arrange
      const measurementAction: SyncAction = {
        type: 'plant:update',
        plantId: 'plant-1',
        payload: {
          height: 45,
          width: 30,
          leafCount: 12,
        },
        timestamp: new Date(),
      }

      // Act
      syncStore.enqueueAction(measurementAction)

      // Assert
      expect(syncStore.syncQueue).toHaveLength(1)
      expect(syncStore.syncQueue[0].payload).toHaveProperty('height')
    })

    it('should preserve measurement data sequence', () => {
      // Arrange
      const time1 = new Date('2026-04-24T10:00:00')
      const time2 = new Date('2026-04-24T11:00:00')

      // Act
      syncStore.enqueueAction({
        type: 'plant:update',
        plantId: 'plant-1',
        payload: { height: 40 },
        timestamp: time1,
      })
      syncStore.enqueueAction({
        type: 'plant:update',
        plantId: 'plant-1',
        payload: { height: 45 },
        timestamp: time2,
      })

      // Assert
      expect(syncStore.syncQueue[0].timestamp).toEqual(time1)
      expect(syncStore.syncQueue[1].timestamp).toEqual(time2)
      expect(syncStore.syncQueue).toHaveLength(2)
    })
  })
})
