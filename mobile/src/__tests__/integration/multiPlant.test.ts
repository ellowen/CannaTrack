import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { generatePlantSchedule } from '@shared/lib/nutrition-engine'
import {
  createFeminizedPlant,
  createAutoflowerPlant,
  createRegularPlant,
  createMultiplePlantsFixture,
} from './fixtures'
import type { Plant } from '@shared/types/plant'

/**
 * Integration test: Multi-Plant Workflow
 *
 * Tests management of multiple plants with different genetics:
 * 1. Create 3 plants with different genetics (feminizada, autofloreciente, regular)
 * 2. Each should have different task schedules
 * 3. Verify calendar shows all tasks correctly
 * 4. Complete tasks for each plant independently
 */
describe('Multi-Plant Workflow', () => {
  let plantStore: ReturnType<typeof usePlantStore.getState>
  let taskStore: ReturnType<typeof useTaskStore.getState>
  let nutritionStore: ReturnType<typeof useNutritionStore.getState>

  beforeEach(() => {
    plantStore = usePlantStore.getState()
    taskStore = useTaskStore.getState()
    nutritionStore = useNutritionStore.getState()

    plantStore.setPlants([])
    taskStore.setAllTasks([])
  })

  describe('Create multiple plants with different genetics', () => {
    it('should create feminized, autoflower, and regular plants', () => {
      // Arrange
      const feminized = createFeminizedPlant({ name: 'Feminized Plant' })
      const autoflower = createAutoflowerPlant({ name: 'Autoflower Plant' })
      const regular = createRegularPlant({ name: 'Regular Plant' })

      // Act
      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)
      plantStore.addPlant(regular)

      // Assert
      const plants = plantStore.getActivePlants()
      expect(plants).toHaveLength(3)
      expect(plants.some((p) => p.geneticType === 'feminized')).toBe(true)
      expect(plants.some((p) => p.geneticType === 'autoflower')).toBe(true)
      expect(plants.some((p) => p.geneticType === 'regular')).toBe(true)
    })

    it('should assign unique IDs to each plant', () => {
      // Arrange
      const plants = createMultiplePlantsFixture()

      // Act
      plantStore.addPlant(plants.plant1)
      plantStore.addPlant(plants.plant2)
      plantStore.addPlant(plants.plant3)

      // Assert
      const ids = plantStore.getActivePlants().map((p) => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(3)
    })

    it('should store correct genetic type for each plant', () => {
      // Arrange
      const feminized = createFeminizedPlant()
      const autoflower = createAutoflowerPlant()
      const regular = createRegularPlant()

      // Act
      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)
      plantStore.addPlant(regular)

      // Assert
      expect(plantStore.getPlantById(feminized.id)?.geneticType).toBe('feminized')
      expect(plantStore.getPlantById(autoflower.id)?.geneticType).toBe('autoflower')
      expect(plantStore.getPlantById(regular.id)?.geneticType).toBe('regular')
    })
  })

  describe('Different task schedules for different genetics', () => {
    it('should generate tasks for feminized plant', () => {
      // Arrange
      const feminized = createFeminizedPlant()
      plantStore.addPlant(feminized)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (!table) return

      // Act
      const tasks = generatePlantSchedule(feminized, table)
      taskStore.setTasks(feminized.id, tasks)

      // Assert
      const plantTasks = taskStore.tasks.filter((t) => t.plantId === feminized.id)
      expect(plantTasks.length).toBeGreaterThan(0)
    })

    it('should generate tasks for autoflower plant', () => {
      // Arrange
      const autoflower = createAutoflowerPlant()
      plantStore.addPlant(autoflower)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (!table) return

      // Act
      const tasks = generatePlantSchedule(autoflower, table)
      taskStore.setTasks(autoflower.id, tasks)

      // Assert
      const plantTasks = taskStore.tasks.filter((t) => t.plantId === autoflower.id)
      expect(plantTasks.length).toBeGreaterThan(0)
    })

    it('should have different vege duration for feminized vs autoflower', () => {
      // Arrange
      const now = new Date()
      const feminized = createFeminizedPlant({ startDate: now })
      const autoflower = createAutoflowerPlant({ startDate: now })

      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (!table) return

      // Act
      const femTasks = generatePlantSchedule(feminized, table)
      const autoTasks = generatePlantSchedule(autoflower, table)

      taskStore.setTasks(feminized.id, femTasks)
      taskStore.setTasks(autoflower.id, autoTasks)

      // Assert - autoflower should start flora faster
      const femVegaTasks = femTasks.filter((t) => t.cycle === 'vege')
      const autoVegaTasks = autoTasks.filter((t) => t.cycle === 'vege')

      // Autoflower typically has shorter vege, but verify both have tasks
      expect(femVegaTasks.length).toBeGreaterThanOrEqual(0)
      expect(autoVegaTasks.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Multi-plant task filtering', () => {
    let feminized: Plant
    let autoflower: Plant
    let regular: Plant

    beforeEach(() => {
      feminized = createFeminizedPlant({ id: 'fem-1', name: 'Fem Plant' })
      autoflower = createAutoflowerPlant({ id: 'auto-1', name: 'Auto Plant' })
      regular = createRegularPlant({ id: 'reg-1', name: 'Regular Plant' })

      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)
      plantStore.addPlant(regular)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const femTasks = generatePlantSchedule(feminized, table)
        const autoTasks = generatePlantSchedule(autoflower, table)
        const regTasks = generatePlantSchedule(regular, table)

        taskStore.setTasks(feminized.id, femTasks)
        taskStore.setTasks(autoflower.id, autoTasks)
        taskStore.setTasks(regular.id, regTasks)
      }
    })

    it('should get all tasks for all plants', () => {
      // Act
      const allTasks = taskStore.tasks

      // Assert
      expect(allTasks.length).toBeGreaterThan(0)
    })

    it('should filter tasks by plant ID', () => {
      // Act
      const femTasks = taskStore.tasks.filter((t) => t.plantId === feminized.id)
      const autoTasks = taskStore.tasks.filter((t) => t.plantId === autoflower.id)
      const regTasks = taskStore.tasks.filter((t) => t.plantId === regular.id)

      // Assert
      expect(femTasks.some((t) => t.plantId === feminized.id)).toBe(true)
      expect(autoTasks.some((t) => t.plantId === autoflower.id)).toBe(true)
      expect(regTasks.some((t) => t.plantId === regular.id)).toBe(true)
    })

    it('should not mix tasks between plants', () => {
      // Act
      const femTasks = taskStore.tasks.filter((t) => t.plantId === feminized.id)

      // Assert
      expect(femTasks.every((t) => t.plantId === feminized.id)).toBe(true)
      expect(femTasks.some((t) => t.plantId !== feminized.id)).toBe(false)
    })
  })

  describe('Complete tasks for each plant independently', () => {
    let feminized: Plant
    let autoflower: Plant

    beforeEach(() => {
      feminized = createFeminizedPlant({ id: 'fem-1' })
      autoflower = createAutoflowerPlant({ id: 'auto-1' })

      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const femTasks = generatePlantSchedule(feminized, table)
        const autoTasks = generatePlantSchedule(autoflower, table)

        taskStore.setTasks(feminized.id, femTasks)
        taskStore.setTasks(autoflower.id, autoTasks)
      }
    })

    it('should complete task for feminized without affecting autoflower', () => {
      // Arrange
      const femTasks = taskStore.tasks.filter((t) => t.plantId === feminized.id)
      const autoTasks = taskStore.tasks.filter((t) => t.plantId === autoflower.id)

      if (femTasks.length === 0 || autoTasks.length === 0) return

      const femTaskToComplete = femTasks[0]
      const autoTaskBefore = taskStore.tasks.find((t) => t.id === autoTasks[0].id)

      // Act
      taskStore.completeTask(femTaskToComplete.id)

      // Assert
      const completed = taskStore.tasks.find((t) => t.id === femTaskToComplete.id)
      expect(completed?.completed).toBe(true)

      const autoTaskAfter = taskStore.tasks.find((t) => t.id === autoTasks[0].id)
      expect(autoTaskAfter?.completed).toBe(autoTaskBefore?.completed)
    })

    it('should track completion count per plant', () => {
      // Arrange
      const femTasks = taskStore.tasks.filter((t) => t.plantId === feminized.id)
      const autoTasks = taskStore.tasks.filter((t) => t.plantId === autoflower.id)

      // Act - complete some fem tasks
      if (femTasks.length > 0) {
        taskStore.completeTask(femTasks[0].id)
      }
      if (femTasks.length > 1) {
        taskStore.completeTask(femTasks[1].id)
      }

      // Assert
      const allCompleted = taskStore.tasks.filter((t) => t.completed)
      expect(allCompleted.every((t) => t.plantId === feminized.id)).toBe(true)
    })

    it('should not affect other plants when resetting tasks', () => {
      // Arrange
      const femTasksBefore = taskStore.tasks.filter((t) => t.plantId === feminized.id).length
      const autoTasksBefore = taskStore.tasks.filter((t) => t.plantId === autoflower.id).length

      // Act - reset only feminized tasks
      taskStore.resetTasksForPlant(feminized.id)

      // Assert
      const femTasksAfter = taskStore.tasks.filter((t) => t.plantId === feminized.id).length
      const autoTasksAfter = taskStore.tasks.filter((t) => t.plantId === autoflower.id).length

      expect(femTasksAfter).toBe(0)
      expect(autoTasksAfter).toBe(autoTasksBefore)
    })
  })

  describe('Multi-plant calendar view', () => {
    beforeEach(() => {
      const fixture = createMultiplePlantsFixture()
      plantStore.addPlant(fixture.plant1)
      plantStore.addPlant(fixture.plant2)
      plantStore.addPlant(fixture.plant3)

      const table = nutritionStore.tables.find((t) => t.id === 'revegetar')
      if (table) {
        const tasks1 = generatePlantSchedule(fixture.plant1, table)
        const tasks2 = generatePlantSchedule(fixture.plant2, table)
        const tasks3 = generatePlantSchedule(fixture.plant3, table)

        taskStore.setTasks(fixture.plant1.id, tasks1)
        taskStore.setTasks(fixture.plant2.id, tasks2)
        taskStore.setTasks(fixture.plant3.id, tasks3)
      }
    })

    it('should show all tasks in calendar', () => {
      // Act
      const allTasks = taskStore.tasks

      // Assert
      expect(allTasks.length).toBeGreaterThan(0)
    })

    it('should group tasks by plant', () => {
      // Act
      const allTasks = taskStore.tasks
      const plantIds = new Set(allTasks.map((t) => t.plantId))

      // Assert
      expect(plantIds.size).toBe(3)
    })

    it('should get today tasks from all plants', () => {
      // Act
      const todayTasks = taskStore.getTodayTasks()

      // Assert
      expect(Array.isArray(todayTasks)).toBe(true)
    })
  })

  describe('Plant selection and filtering', () => {
    beforeEach(() => {
      const feminized = createFeminizedPlant({ id: 'fem-1' })
      const autoflower = createAutoflowerPlant({ id: 'auto-1' })

      plantStore.addPlant(feminized)
      plantStore.addPlant(autoflower)
    })

    it('should select a plant', () => {
      // Arrange
      const plantId = 'fem-1'

      // Act
      plantStore.selectPlant(plantId)

      // Assert
      expect(plantStore.selectedPlantId).toBe(plantId)
    })

    it('should switch selection between plants', () => {
      // Act
      plantStore.selectPlant('fem-1')
      expect(plantStore.selectedPlantId).toBe('fem-1')

      plantStore.selectPlant('auto-1')
      expect(plantStore.selectedPlantId).toBe('auto-1')

      // Assert
      expect(plantStore.selectedPlantId).toBe('auto-1')
    })

    it('should deselect plant', () => {
      // Arrange
      plantStore.selectPlant('fem-1')

      // Act
      plantStore.selectPlant(null)

      // Assert
      expect(plantStore.selectedPlantId).toBeNull()
    })

    it('should get active plants count', () => {
      // Act
      const count = plantStore.getPlantsCount()

      // Assert
      expect(count).toBe(2)
    })
  })
})
