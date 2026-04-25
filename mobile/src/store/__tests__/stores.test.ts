import { useUserStore } from '../userStore'
import { usePlantStore } from '../plantStore'
import { useTaskStore } from '../taskStore'
import { useNutritionStore } from '../nutritionStore'
import { useSyncStore } from '../syncStore'

describe('Stores', () => {
  test('userStore initializes with correct defaults', () => {
    const store = useUserStore()
    expect(store.userId).toBe(null)
    expect(store.email).toBe(null)
    expect(store.plan).toBe('free')
    expect(store.totalXP).toBe(0)
  })

  test('plantStore initializes with empty plants', () => {
    const store = usePlantStore()
    expect(store.plants).toEqual([])
    expect(store.selectedPlantId).toBe(null)
  })

  test('taskStore initializes with empty tasks', () => {
    const store = useTaskStore()
    expect(store.tasks).toEqual([])
  })

  test('nutritionStore initializes with default tables', () => {
    const store = useNutritionStore()
    expect(store.tables.length).toBeGreaterThan(0)
    expect(store.selectedTableId).toBe('revegetar')
  })

  test('syncStore initializes with empty queue', () => {
    const store = useSyncStore()
    expect(store.syncQueue).toEqual([])
    expect(store.isSyncing).toBe(false)
  })
})
