import { describe, test, expect } from 'vitest'
import { useUserStore } from '../userStore'
import { usePlantStore } from '../plantStore'
import { useTaskStore } from '../taskStore'
import { useNutritionStore } from '../nutritionStore'
import { useSyncStore } from '../syncStore'

// .getState(), no el hook invocado como funcion -- un hook de Zustand llama
// a React.useCallback/useSyncExternalStore por dentro, que requiere un
// render de React real. Fuera de un componente (como aca) el dispatcher de
// React es null y explota. .getState() lee el store directo, sin React de
// por medio -- mismo patron que ya usa el codigo real de la app.
describe('Stores', () => {
  test('userStore initializes with correct defaults', () => {
    const store = useUserStore.getState()
    expect(store.userId).toBe(null)
    expect(store.email).toBe(null)
    expect(store.plan).toBe('free')
    expect(store.totalXP).toBe(0)
  })

  test('plantStore initializes with empty plants', () => {
    const store = usePlantStore.getState()
    expect(store.plants).toEqual([])
    expect(store.selectedPlantId).toBe(null)
  })

  test('taskStore initializes with empty tasks', () => {
    const store = useTaskStore.getState()
    expect(store.tasks).toEqual([])
  })

  test('nutritionStore starts with no tables loaded (lazy-load by design)', () => {
    const store = useNutritionStore.getState()
    expect(store.tables).toEqual([])
    expect(store.tablesLoaded).toBe(false)
    expect(store.selectedTableId).toBe('revegetar')
  })

  test('nutritionStore loads the official tables once ensureTablesLoaded runs', () => {
    useNutritionStore.getState().ensureTablesLoaded()
    const store = useNutritionStore.getState()
    expect(store.tables.length).toBeGreaterThan(0)
    expect(store.tablesLoaded).toBe(true)
  })

  test('syncStore initializes with empty queue', () => {
    const store = useSyncStore.getState()
    expect(store.syncQueue).toEqual([])
    expect(store.isSyncing).toBe(false)
  })
})
