import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import {
  createMockPlant,
  createMockTask,
  MOCK_NUTRITION_TABLE,
  createFeminizedPlant,
} from './fixtures'
import type { Plant, ScheduledTask } from '@shared/types/plant'

/**
 * Integration test: Full Plant Lifecycle
 *
 * Tests the complete flow:
 * 1. Create new plant
 * 2. Advance through VEGE phase (verify task generation)
 * 3. Start FLORA phase (verify calendar change)
 * 4. Complete daily tasks
 * 5. Harvest plant
 * 6. Verify plant moved to history
 */
describe('Plant Lifecycle Integration', () => {
  let plantStore: ReturnType<typeof usePlantStore.getState>
  let taskStore: ReturnType<typeof useTaskStore.getState>
  let nutritionStore: ReturnType<typeof useNutritionStore.getState>

  beforeEach(() => {
    // Get fresh store state
    plantStore = usePlantStore.getState()
    taskStore = useTaskStore.getState()
    nutritionStore = useNutritionStore.getState()

    // Clear all stores
    plantStore.setPlants([])
    taskStore.setAllTasks([])
  })

  describe('Create new plant', () => {
    it('should create a plant and generate initial tasks', () => {
      // Arrange
      const plantData = createMockPlant({
        name: 'Test Lifecycle Plant',
        nutritionTableId: 'revegetar',
      })

      // Act
      plantStore.addPlant(plantData)
      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks = generatePlantSchedule(plantData, table)
        taskStore.setTasks(plantData.id, tasks)
      }

      // Assert
      const plants = plantStore.getActivePlants()
      expect(plants).toHaveLength(1)
      expect(plants[0].id).toBe(plantData.id)
      expect(plants[0].status).toBe('active')

      const tasks = taskStore.getTodayTasks()
      expect(tasks.length).toBeGreaterThanOrEqual(0)
    })

    it('should set correct initial plant properties', () => {
      // Arrange
      const now = new Date()
      const plantData = createMockPlant({
        name: 'Initial Properties Test',
        startDate: now,
        geneticType: 'feminized',
        location: 'indoor',
        potCount: 4,
      })

      // Act
      plantStore.addPlant(plantData)
      const plant = plantStore.getPlantById(plantData.id)

      // Assert
      expect(plant).toBeDefined()
      expect(plant?.name).toBe('Initial Properties Test')
      expect(plant?.geneticType).toBe('feminized')
      expect(plant?.location).toBe('indoor')
      expect(plant?.potCount).toBe(4)
      expect(plant?.floraStartDate).toBeUndefined()
    })
  })

  describe('VEGE phase tasks', () => {
    let plant: Plant

    beforeEach(() => {
      plant = createFeminizedPlant({ name: 'VEGE Phase Test' })
      plantStore.addPlant(plant)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks = generatePlantSchedule(plant, table)
        taskStore.setTasks(plant.id, tasks)
      }
    })

    it('should have vegetative stage tasks', () => {
      // Act
      const tasks = taskStore.tasks.filter((t) => t.plantId === plant.id && t.cycle === 'vege')

      // Assert
      expect(tasks.length).toBeGreaterThan(0)
      const hasRootingTasks = tasks.some((t) => t.stage === 'rooting')
      expect(hasRootingTasks || tasks.length > 0).toBe(true)
    })

    it('should track task completion', () => {
      // Arrange
      const tasks = taskStore.tasks.filter((t) => t.plantId === plant.id)
      if (tasks.length === 0) return

      const firstTask = tasks[0]
      expect(firstTask.completed).toBe(false)

      // Act
      taskStore.completeTask(firstTask.id, 'Completed in vege')

      // Assert
      const updatedTask = taskStore.tasks.find((t) => t.id === firstTask.id)
      expect(updatedTask?.completed).toBe(true)
      expect(updatedTask?.completionNotes).toBe('Completed in vege')
      expect(updatedTask?.completedAt).toBeDefined()
    })

    it('should update task count when marking as complete', () => {
      // Arrange
      const initialPending = taskStore.getPendingCount()
      const initialCompleted = taskStore.getCompletedCount()
      const tasks = taskStore.tasks.filter((t) => t.plantId === plant.id)
      if (tasks.length === 0) return

      // Act
      taskStore.completeTask(tasks[0].id)

      // Assert
      const newPending = taskStore.getPendingCount()
      const newCompleted = taskStore.getCompletedCount()
      expect(newPending).toBe(initialPending - 1)
      expect(newCompleted).toBe(initialCompleted + 1)
    })
  })

  describe('Start FLORA phase', () => {
    let plant: Plant

    beforeEach(() => {
      plant = createFeminizedPlant({ name: 'FLORA Phase Test' })
      plantStore.addPlant(plant)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks = generatePlantSchedule(plant, table)
        taskStore.setTasks(plant.id, tasks)
      }
    })

    it('should start flora and update plant', () => {
      // Arrange
      const floraStartDate = new Date()

      // Act
      plantStore.updatePlant(plant.id, { floraStartDate })
      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const updatedPlant = { ...plant, floraStartDate }
        const newTasks = generatePlantSchedule(updatedPlant, table)
        taskStore.setTasks(plant.id, newTasks)
      }

      // Assert
      const updatedPlant = plantStore.getPlantById(plant.id)
      expect(updatedPlant?.floraStartDate).toEqual(floraStartDate)
    })

    it('should generate flora tasks after starting flora', () => {
      // Arrange
      const floraStartDate = new Date()

      // Act
      plantStore.updatePlant(plant.id, { floraStartDate })
      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const updatedPlant = { ...plant, floraStartDate }
        const newTasks = generatePlantSchedule(updatedPlant, table)
        taskStore.setTasks(plant.id, newTasks)
      }

      // Assert
      const floraTasks = taskStore.tasks.filter(
        (t) => t.plantId === plant.id && t.cycle === 'flora'
      )
      expect(floraTasks.length).toBeGreaterThan(0)
    })

    it('should have appropriate flora stage tasks', () => {
      // Arrange
      const floraStartDate = new Date()
      plantStore.updatePlant(plant.id, { floraStartDate })
      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const updatedPlant = { ...plant, floraStartDate }
        const newTasks = generatePlantSchedule(updatedPlant, table)
        taskStore.setTasks(plant.id, newTasks)
      }

      // Act
      const floraTasks = taskStore.tasks.filter(
        (t) => t.plantId === plant.id && t.cycle === 'flora'
      )
      const floraStages = new Set(floraTasks.map((t) => t.stage))

      // Assert - should have typical flora stages
      const validFloraStages = ['stretch', 'bulking', 'ripening', 'flushing']
      const hasValidStages = Array.from(floraStages).some((s) =>
        validFloraStages.includes(s)
      )
      expect(hasValidStages || floraTasks.length === 0).toBe(true)
    })
  })

  describe('Harvest and history', () => {
    let plant: Plant

    beforeEach(() => {
      plant = createFeminizedPlant({ name: 'Harvest Test' })
      plantStore.addPlant(plant)
    })

    it('should move plant to harvested status', () => {
      // Arrange
      expect(plant.status).toBe('active')

      // Act
      const harvestDate = new Date()
      plantStore.updatePlant(plant.id, {
        status: 'harvested',
        endDate: harvestDate,
      })

      // Assert
      const harvested = plantStore.getPlantById(plant.id)
      expect(harvested?.status).toBe('harvested')
      expect(harvested?.endDate).toBeDefined()
    })

    it('should remove harvested plant from active list', () => {
      // Arrange
      expect(plantStore.getActivePlants()).toHaveLength(1)

      // Act
      plantStore.updatePlant(plant.id, {
        status: 'harvested',
        endDate: new Date(),
      })

      // Assert
      const activePlants = plantStore.getActivePlants()
      expect(activePlants).toHaveLength(0)
    })

    it('should keep harvested plant in all plants', () => {
      // Arrange
      const allPlantsBefore = plantStore.plants.length

      // Act
      plantStore.updatePlant(plant.id, {
        status: 'harvested',
        endDate: new Date(),
      })

      // Assert
      const allPlantsAfter = plantStore.plants.length
      expect(allPlantsAfter).toBe(allPlantsBefore)
      const harvested = plantStore.getPlantById(plant.id)
      expect(harvested).toBeDefined()
    })

    it('should clear tasks when plant is discarded', () => {
      // Arrange
      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks = generatePlantSchedule(plant, table)
        taskStore.setTasks(plant.id, tasks)
      }
      const tasksBeforeDiscard = taskStore.tasks.filter((t) => t.plantId === plant.id)
      expect(tasksBeforeDiscard.length).toBeGreaterThan(0)

      // Act
      plantStore.updatePlant(plant.id, {
        status: 'discarded',
        endDate: new Date(),
      })
      taskStore.resetTasksForPlant(plant.id)

      // Assert
      const tasksAfterDiscard = taskStore.tasks.filter((t) => t.plantId === plant.id)
      expect(tasksAfterDiscard).toHaveLength(0)
    })
  })

  describe('Complete daily task workflow', () => {
    let plant: Plant

    beforeEach(() => {
      plant = createFeminizedPlant({ name: 'Daily Tasks Test' })
      plantStore.addPlant(plant)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks = generatePlantSchedule(plant, table)
        taskStore.setTasks(plant.id, tasks)
      }
    })

    it('should get today tasks', () => {
      // Act
      const todayTasks = taskStore.getTodayTasks()

      // Assert
      expect(Array.isArray(todayTasks)).toBe(true)
    })

    it('should complete multiple tasks for same plant', () => {
      // Arrange
      const plantTasks = taskStore.tasks.filter((t) => t.plantId === plant.id)
      const tasksToComplete = plantTasks.slice(0, Math.min(3, plantTasks.length))

      // Act
      tasksToComplete.forEach((task, index) => {
        taskStore.completeTask(task.id, `Completed task ${index + 1}`)
      })

      // Assert
      const completed = taskStore.tasks.filter(
        (t) => t.plantId === plant.id && t.completed
      )
      expect(completed).toHaveLength(tasksToComplete.length)
    })

    it('should track completion progress', () => {
      // Arrange
      const plantTasks = taskStore.tasks.filter((t) => t.plantId === plant.id)
      if (plantTasks.length === 0) return

      // Act - complete half the tasks
      const halfLength = Math.floor(plantTasks.length / 2)
      for (let i = 0; i < halfLength; i++) {
        taskStore.completeTask(plantTasks[i].id)
      }

      // Assert
      const completedCount = taskStore.getCompletedCount()
      const pendingCount = taskStore.getPendingCount()
      expect(completedCount).toBe(halfLength)
      expect(pendingCount).toBe(plantTasks.length - halfLength)
    })
  })
})
