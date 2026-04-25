/**
 * Shared test helpers and utilities for integration tests
 */

import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import { createMockPlant, createMockTask } from './fixtures'
import type { Plant, ScheduledTask } from '@shared/types/plant'

/**
 * Test environment setup and teardown
 */
export class TestEnvironment {
  static resetAllStores(): void {
    const plantStore = usePlantStore.getState()
    const taskStore = useTaskStore.getState()
    const syncStore = useSyncStore.getState()

    plantStore.setPlants([])
    taskStore.setAllTasks([])
    syncStore.clearQueue()
    syncStore.setIsSyncing(false)
    syncStore.setSyncError(null)
  }

  static resetPlantStore(): void {
    const store = usePlantStore.getState()
    store.setPlants([])
    store.selectPlant(null)
  }

  static resetTaskStore(): void {
    const store = useTaskStore.getState()
    store.setAllTasks([])
  }

  static resetSyncStore(): void {
    const store = useSyncStore.getState()
    store.clearQueue()
    store.setIsSyncing(false)
    store.setSyncError(null)
  }
}

/**
 * Plant creation helpers
 */
export class PlantTestHelper {
  static createPlantWithTasks(overrides?: Partial<Plant>): {
    plant: Plant
    tasks: ScheduledTask[]
  } {
    const plant = createMockPlant(overrides)
    const nutritionStore = useNutritionStore.getState()
    const table = nutritionStore.tables.find((t) => t.id === 'revegetar')

    if (!table) {
      throw new Error('Nutrition table not found')
    }

    const tasks = generatePlantSchedule(plant, table)
    return { plant, tasks }
  }

  static addPlantToStore(plant: Plant): void {
    const plantStore = usePlantStore.getState()
    plantStore.addPlant(plant)
  }

  static addPlantWithTasksToStore(plant: Plant, tasks: ScheduledTask[]): void {
    const plantStore = usePlantStore.getState()
    const taskStore = useTaskStore.getState()

    plantStore.addPlant(plant)
    taskStore.setTasks(plant.id, tasks)
  }

  static getPlantTaskCount(plantId: string): number {
    const taskStore = useTaskStore.getState()
    return taskStore.tasks.filter((t) => t.plantId === plantId).length
  }

  static getPendingTaskCount(plantId: string): number {
    const taskStore = useTaskStore.getState()
    return taskStore.tasks.filter(
      (t) => t.plantId === plantId && !t.completed
    ).length
  }

  static getCompletedTaskCount(plantId: string): number {
    const taskStore = useTaskStore.getState()
    return taskStore.tasks.filter((t) => t.plantId === plantId && t.completed)
      .length
  }

  static startFloraPhase(plantId: string): void {
    const plantStore = usePlantStore.getState()
    const taskStore = useTaskStore.getState()
    const nutritionStore = useNutritionStore.getState()

    const plant = plantStore.getPlantById(plantId)
    if (!plant) return

    const floraStartDate = new Date()
    plantStore.updatePlant(plantId, { floraStartDate })

    const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
    if (table) {
      const updatedPlant = { ...plant, floraStartDate }
      const tasks = generatePlantSchedule(updatedPlant, table)
      taskStore.setTasks(plantId, tasks)
    }
  }

  static harvestPlant(plantId: string): void {
    const plantStore = usePlantStore.getState()
    plantStore.updatePlant(plantId, {
      status: 'harvested',
      endDate: new Date(),
    })
  }

  static discardPlant(plantId: string): void {
    const plantStore = usePlantStore.getState()
    const taskStore = useTaskStore.getState()

    plantStore.updatePlant(plantId, {
      status: 'discarded',
      endDate: new Date(),
    })
    taskStore.resetTasksForPlant(plantId)
  }
}

/**
 * Task completion helpers
 */
export class TaskTestHelper {
  static completeTask(taskId: string, notes?: string): void {
    const taskStore = useTaskStore.getState()
    taskStore.completeTask(taskId, notes)
  }

  static completeTasksForPlant(plantId: string, count: number = 1): void {
    const taskStore = useTaskStore.getState()
    const plantTasks = taskStore.tasks
      .filter((t) => t.plantId === plantId && !t.completed)
      .slice(0, count)

    plantTasks.forEach((task) => taskStore.completeTask(task.id))
  }

  static completeAllTasksForPlant(plantId: string): void {
    const taskStore = useTaskStore.getState()
    const plantTasks = taskStore.tasks.filter(
      (t) => t.plantId === plantId && !t.completed
    )

    plantTasks.forEach((task) => taskStore.completeTask(task.id))
  }

  static getTodayTasksForPlant(plantId: string): ScheduledTask[] {
    const taskStore = useTaskStore.getState()
    return taskStore.tasks.filter(
      (t) => t.plantId === plantId && isToday(t.scheduledDate)
    )
  }

  static getTasksInWeek(plantId: string, weekNumber: number): ScheduledTask[] {
    const taskStore = useTaskStore.getState()
    return taskStore.tasks.filter(
      (t) => t.plantId === plantId && t.week === weekNumber
    )
  }
}

/**
 * Sync helpers
 */
export class SyncTestHelper {
  static queuePlantCreation(plant: Plant): void {
    const syncStore = useSyncStore.getState()
    syncStore.enqueueAction({
      type: 'plant:create',
      plantId: plant.id,
      payload: plant,
      timestamp: new Date(),
    })
  }

  static queueTaskCompletion(task: ScheduledTask): void {
    const syncStore = useSyncStore.getState()
    syncStore.enqueueAction({
      type: 'task:complete',
      plantId: task.plantId,
      payload: task,
      timestamp: new Date(),
    })
  }

  static getQueuedActionsCount(): number {
    const syncStore = useSyncStore.getState()
    return syncStore.syncQueue.length
  }

  static getQueuedActionsForPlant(plantId: string): number {
    const syncStore = useSyncStore.getState()
    return syncStore.syncQueue.filter((a) => a.plantId === plantId).length
  }

  static setSyncError(error: string): void {
    const syncStore = useSyncStore.getState()
    syncStore.setSyncError(error)
  }

  static setSyncing(isSyncing: boolean): void {
    const syncStore = useSyncStore.getState()
    syncStore.setIsSyncing(isSyncing)
  }

  static clearSyncQueue(): void {
    const syncStore = useSyncStore.getState()
    syncStore.clearQueue()
  }
}

/**
 * Assertion helpers
 */
export class AssertionHelper {
  static assertPlantExists(plantId: string): void {
    const plantStore = usePlantStore.getState()
    const plant = plantStore.getPlantById(plantId)
    if (!plant) throw new Error(`Plant ${plantId} not found in store`)
  }

  static assertPlantActive(plantId: string): void {
    const plantStore = usePlantStore.getState()
    const plant = plantStore.getPlantById(plantId)
    if (!plant || plant.status !== 'active') {
      throw new Error(`Plant ${plantId} is not active`)
    }
  }

  static assertPlantHasTasks(plantId: string): void {
    const taskStore = useTaskStore.getState()
    const tasks = taskStore.tasks.filter((t) => t.plantId === plantId)
    if (tasks.length === 0) {
      throw new Error(`Plant ${plantId} has no tasks`)
    }
  }

  static assertTaskCompleted(taskId: string): void {
    const taskStore = useTaskStore.getState()
    const task = taskStore.tasks.find((t) => t.id === taskId)
    if (!task || !task.completed) {
      throw new Error(`Task ${taskId} is not completed`)
    }
  }

  static assertSyncQueueEmpty(): void {
    const syncStore = useSyncStore.getState()
    if (syncStore.syncQueue.length > 0) {
      throw new Error('Sync queue is not empty')
    }
  }

  static assertSyncQueueNotEmpty(): void {
    const syncStore = useSyncStore.getState()
    if (syncStore.syncQueue.length === 0) {
      throw new Error('Sync queue is empty')
    }
  }
}

/**
 * Date/time helpers
 */
export function isToday(date: Date): boolean {
  const today = new Date()
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  )
}

export function dateToStr(date: Date): string {
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${mm}-${dd}`
}

export function getTodayStr(): string {
  return dateToStr(new Date())
}

/**
 * Test data generators
 */
export class DataGenerator {
  static generatePlants(count: number): Plant[] {
    return Array.from({ length: count }, (_, i) =>
      createMockPlant({
        id: `plant-${i}`,
        name: `Plant ${i + 1}`,
      })
    )
  }

  static generateTasks(plantId: string, count: number): ScheduledTask[] {
    const now = new Date()
    return Array.from({ length: count }, (_, i) =>
      createMockTask(plantId, {
        id: `task-${i}`,
        scheduledDate: new Date(now.getTime() + i * 24 * 60 * 60 * 1000),
      })
    )
  }
}

/**
 * Timing/delay helpers (for async operations)
 */
export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function simulateNetworkDelay(): Promise<void> {
  return delay(100)
}

/**
 * Logging helpers for debugging tests
 */
export class TestLogger {
  static logStoreState(): void {
    const plantStore = usePlantStore.getState()
    const taskStore = useTaskStore.getState()
    const syncStore = useSyncStore.getState()

    console.log('=== Store State ===')
    console.log('Plants:', plantStore.plants.length)
    console.log('Tasks:', taskStore.tasks.length)
    console.log('Sync Queue:', syncStore.syncQueue.length)
  }

  static logPlants(): void {
    const plantStore = usePlantStore.getState()
    console.log('Plants:', plantStore.plants)
  }

  static logTasks(plantId?: string): void {
    const taskStore = useTaskStore.getState()
    const tasks = plantId
      ? taskStore.tasks.filter((t) => t.plantId === plantId)
      : taskStore.tasks
    console.log('Tasks:', tasks)
  }

  static logSyncQueue(): void {
    const syncStore = useSyncStore.getState()
    console.log('Sync Queue:', syncStore.syncQueue)
  }
}
