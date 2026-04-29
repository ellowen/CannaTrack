# Zustand Architecture — CannaTrack

Diseño completo de state management con Zustand. Todos los ejemplos son TypeScript strict.

---

## 1. TIPOS BASE Y INTERFACES

### 1.1 User Slice — Autenticación + Gamificación

```typescript
// frontend/src/store/types.ts

import type { AccessTier } from '@/types/plant'

// ── User Store ──────────────────────────────────────────────
export interface UserState {
  // Autenticación
  userId: string | null
  email: string | null
  name: string
  plan: AccessTier
  potVolumeLiters: number
  theme: 'system' | 'light' | 'dark'
  notificationsEnabled: boolean
  onboarded: boolean
  createdAt: Date | null

  // Gamificación
  totalXP: number
  streak: number
  bestStreak: number
  lastActivityDate: Date | null
}

export interface UserActions {
  // Auth
  setUser: (user: {
    userId: string
    email: string
    name: string
    createdAt: Date
  }) => void
  clearUser: () => void

  // Profile
  setName: (name: string) => void
  setPlan: (plan: AccessTier) => void
  setPotVolume: (liters: number) => void
  setTheme: (theme: 'system' | 'light' | 'dark') => void
  setNotificationsEnabled: (enabled: boolean) => void
  setOnboarded: (onboarded: boolean) => void

  // Gamificación — retorna dados para toast/UI
  addXP: (base: number) => {
    xpGained: number
    streakBonus: number
    newStreak: number
    leveledUp: boolean
    newLevel?: number
  }

  // Internal: usado por sync desde Supabase
  _setTotalXP: (xp: number) => void
  _setStreak: (streak: number, bestStreak: number, lastActivity: Date | null) => void
}

export type UserStore = UserState & UserActions
```

### 1.2 Plant Slice — CRUD + Selection

```typescript
export interface PlantState {
  plants: Plant[]
  selectedPlantId: string | null
  loading: boolean
  error: string | null
  syncedPlantIds: Set<string> // O(1) lookup — cuáles están synced a Supabase
}

export interface PlantActions {
  // CRUD
  addPlant: (plant: Plant) => void
  updatePlant: (id: string, changes: Partial<Plant>) => void
  removePlant: (id: string) => void

  // Selection
  selectPlant: (id: string | null) => void

  // Status
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Sync tracking
  markSynced: (id: string) => void
  getPendingSyncPlants: () => Plant[]
}

export type PlantStore = PlantState & PlantActions
```

### 1.3 Task Slice — Tareas + Historial

```typescript
export interface TaskState {
  tasks: ScheduledTask[]
  filter: 'all' | 'today' | 'overdue'
  loading: boolean
  error: string | null
}

export interface TaskActions {
  // CRUD
  addTask: (task: ScheduledTask) => void
  updateTask: (id: string, changes: Partial<ScheduledTask>) => void
  removeTask: (id: string) => void

  // Completion — retorna XP info para dar feedback
  completeTask: (id: string, notes?: string) => {
    taskId: string
    plantId: string
    taskType: TaskType
    completedAt: Date
  }

  // Filtering
  setFilter: (filter: 'all' | 'today' | 'overdue') => void

  // Status
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Query — getter helpers (no mutate)
  getTasksByPlantId: (plantId: string) => ScheduledTask[]
  getTodayTasks: () => ScheduledTask[]
  getOverdueTasks: () => ScheduledTask[]
}

export type TaskStore = TaskState & TaskActions
```

### 1.4 Nutrition Slice — Tablas Nutricionales

```typescript
export interface NutritionState {
  customTables: NutritionTable[] // User-created, persisted
  loading: boolean
  error: string | null
  lastSyncAt: Date | null
}

export interface NutritionActions {
  // CRUD custom
  addCustomTable: (table: NutritionTable) => void
  updateCustomTable: (id: string, changes: Partial<NutritionTable>) => void
  removeCustomTable: (id: string) => void

  // Status
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void

  // Query — getter (sin mutate, memoizado)
  getAllTables: () => NutritionTable[] // Official + custom merged
  getTableById: (id: string) => NutritionTable | null
  getOfficialTables: () => NutritionTable[]
}

export type NutritionStore = NutritionState & NutritionActions
```

### 1.5 Sync Slice — Control de Sincronización

```typescript
export type SyncAction =
  | { type: 'plant.create'; payload: Plant }
  | { type: 'plant.update'; plantId: string; payload: Partial<Plant> }
  | { type: 'plant.delete'; plantId: string }
  | { type: 'task.complete'; taskId: string; completedAt: Date; notes?: string }
  | { type: 'nutrition.create'; payload: NutritionTable }
  | { type: 'nutrition.update'; tableId: string; payload: Partial<NutritionTable> }

export interface SyncState {
  queue: SyncAction[]
  isSyncing: boolean
  lastSyncAt: Date | null
  syncError: string | null
  isOnline: boolean // Monitorea conectividad
}

export interface SyncActions {
  // Enqueue — llamado por otros slices cuando offline
  enqueueSyncAction: (action: SyncAction) => void

  // Flush — llamado cuando conecta internet
  flushSyncQueue: () => Promise<void>

  // Status
  setSyncing: (syncing: boolean) => void
  setSyncError: (error: string | null) => void
  setOnline: (online: boolean) => void
  setLastSyncAt: (date: Date) => void

  // Query
  getQueueSize: () => number
  hasPendingSync: () => boolean
}

export type SyncStore = SyncState & SyncActions
```

---

## 2. IMPLEMENTACIÓN DETALLADA

### 2.1 User Store Completo

```typescript
// frontend/src/store/userStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLevelInfo, computeStreak, XP } from '@/lib/gamification'
import { dateReviver, dateReplacer } from '@/lib/storage'
import type { UserStore, UserState, UserActions } from './types'

const INITIAL_STATE: UserState = {
  userId: null,
  email: null,
  name: '',
  plan: 'free',
  potVolumeLiters: 11,
  theme: 'system',
  notificationsEnabled: false,
  onboarded: false,
  createdAt: null,
  totalXP: 0,
  streak: 0,
  bestStreak: 0,
  lastActivityDate: null,
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Auth ────────────────────────────────────
      setUser: ({ userId, email, name, createdAt }) => {
        set({ userId, email, name, createdAt })
      },

      clearUser: () => {
        set(INITIAL_STATE)
      },

      // ── Profile ─────────────────────────────────
      setName: (name) => set({ name }),
      setPlan: (plan) => set({ plan }),
      setPotVolume: (potVolumeLiters) => set({ potVolumeLiters }),
      setTheme: (theme) => set({ theme }),
      setNotificationsEnabled: (notificationsEnabled) => set({ notificationsEnabled }),
      setOnboarded: (onboarded) => set({ onboarded }),

      // ── XP & Gamification ───────────────────────
      /**
       * Suma XP base, aplica streak bonus, actualiza streak.
       * NO llama a otros stores — retorna data para que el caller
       * dispare eventos/triggers.
       */
      addXP: (base: number) => {
        const { streak, bestStreak, lastActivityDate, totalXP } = get()
        const today = new Date()
        const { newStreak } = computeStreak(streak, lastActivityDate, today)

        let streakBonus = 0
        if (newStreak === 7) streakBonus = XP.STREAK_7_BONUS
        if (newStreak === 30) streakBonus = XP.STREAK_30_BONUS

        const xpGained = base + streakBonus
        const nextTotalXP = totalXP + xpGained
        const oldLevel = getLevelInfo(totalXP).current.level
        const newLevel = getLevelInfo(nextTotalXP).current.level
        const leveledUp = newLevel > oldLevel

        set({
          totalXP: nextTotalXP,
          streak: newStreak,
          bestStreak: Math.max(bestStreak, newStreak),
          lastActivityDate: today,
        })

        return {
          xpGained,
          streakBonus,
          newStreak,
          leveledUp,
          newLevel: leveledUp ? newLevel : undefined,
        }
      },

      // ── Internal: sync desde Supabase ─────────
      _setTotalXP: (xp) => set({ totalXP: xp }),
      _setStreak: (streak, bestStreak, lastActivityDate) => {
        set({ streak, bestStreak, lastActivityDate })
      },
    }),

    {
      name: 'cannatrack-user',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Solo persistimos estos fields
      partialize: (state) => ({
        userId: state.userId,
        email: state.email,
        name: state.name,
        plan: state.plan,
        potVolumeLiters: state.potVolumeLiters,
        theme: state.theme,
        notificationsEnabled: state.notificationsEnabled,
        onboarded: state.onboarded,
        createdAt: state.createdAt,
        totalXP: state.totalXP,
        streak: state.streak,
        bestStreak: state.bestStreak,
        lastActivityDate: state.lastActivityDate,
      }),
    }
  )
)
```

### 2.2 Plant Store Completo

```typescript
// frontend/src/store/plantStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Plant } from '@/types/plant'
import { dateReviver, dateReplacer } from '@/lib/storage'
import type { PlantStore, PlantState } from './types'

const INITIAL_STATE: PlantState = {
  plants: [],
  selectedPlantId: null,
  loading: false,
  error: null,
  syncedPlantIds: new Set(),
}

export const usePlantStore = create<PlantStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addPlant: (plant) => {
        set((s) => ({
          plants: [...s.plants, plant],
        }))
      },

      updatePlant: (id, changes) => {
        set((s) => ({
          plants: s.plants.map((p) => (p.id === id ? { ...p, ...changes } : p)),
        }))
      },

      removePlant: (id) => {
        set((s) => ({
          plants: s.plants.filter((p) => p.id !== id),
          selectedPlantId: s.selectedPlantId === id ? null : s.selectedPlantId,
        }))
      },

      selectPlant: (id) => {
        set({ selectedPlantId: id })
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      markSynced: (id) => {
        set((s) => ({
          syncedPlantIds: new Set([...s.syncedPlantIds, id]),
        }))
      },

      getPendingSyncPlants: () => {
        const { plants, syncedPlantIds } = get()
        return plants.filter((p) => !syncedPlantIds.has(p.id))
      },
    }),

    {
      name: 'cannatrack-plants',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Solo persistimos plants y selectedPlantId, no syncedPlantIds
      partialize: (state) => ({
        plants: state.plants,
        selectedPlantId: state.selectedPlantId,
      }),
    }
  )
)
```

### 2.3 Task Store Completo

```typescript
// frontend/src/store/taskStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ScheduledTask, TaskType } from '@/types/plant'
import { dateReviver, dateReplacer } from '@/lib/storage'
import type { TaskStore, TaskState } from './types'

const INITIAL_STATE: TaskState = {
  tasks: [],
  filter: 'all',
  loading: false,
  error: null,
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addTask: (task) => {
        set((s) => ({
          tasks: [...s.tasks, task],
        }))
      },

      updateTask: (id, changes) => {
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...changes } : t)),
        }))
      },

      removeTask: (id) => {
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
        }))
      },

      /**
       * Marca tarea como completada. Retorna metadata para trigger
       * automático en otros stores (userStore.addXP, etc).
       */
      completeTask: (id, notes) => {
        const task = get().tasks.find((t) => t.id === id)
        if (!task) throw new Error(`Task ${id} not found`)

        const completedAt = new Date()
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, completed: true, completedAt, completionNotes: notes }
              : t
          ),
        }))

        return {
          taskId: id,
          plantId: task.plantId,
          taskType: task.type,
          completedAt,
        }
      },

      setFilter: (filter) => set({ filter }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // ── Query helpers (getters, no mutate) ─────
      getTasksByPlantId: (plantId) => {
        return get().tasks.filter((t) => t.plantId === plantId)
      },

      getTodayTasks: () => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return get().tasks.filter((t) => {
          const scheduled = new Date(t.scheduledDate)
          const taskDay = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate())
          return taskDay.getTime() === today.getTime()
        })
      },

      getOverdueTasks: () => {
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return get().tasks.filter((t) => {
          const scheduled = new Date(t.scheduledDate)
          const taskDay = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate())
          return taskDay < today && !t.completed
        })
      },
    }),

    {
      name: 'cannatrack-tasks',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        tasks: state.tasks,
      }),
    }
  )
)
```

### 2.4 Nutrition Store Completo

```typescript
// frontend/src/store/nutritionStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { NutritionTable } from '@/types/plant'
import { REVEGETAR_TABLE } from '@/data/revegetar-table'
import { TOPCROP_TABLE } from '@/data/topcrop-table'
import { dateReviver, dateReplacer } from '@/lib/storage'
import type { NutritionStore, NutritionState } from './types'

const OFFICIAL_TABLES: NutritionTable[] = [REVEGETAR_TABLE, TOPCROP_TABLE]

const INITIAL_STATE: NutritionState = {
  customTables: [],
  loading: false,
  error: null,
  lastSyncAt: null,
}

/**
 * Merge oficial + custom. Oficiales no se pueden editar/eliminar desde UI,
 * pero se pueden usar en plantas.
 */
function mergeTables(customTables: NutritionTable[]): NutritionTable[] {
  const officialIds = new Set(OFFICIAL_TABLES.map((t) => t.id))
  const uniqueCustom = customTables.filter((t) => !officialIds.has(t.id))
  return [...OFFICIAL_TABLES, ...uniqueCustom]
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      addCustomTable: (table) => {
        if (table.isOfficial) return
        set((s) => ({
          customTables: [...s.customTables, table],
        }))
      },

      updateCustomTable: (id, changes) => {
        const isOfficial = OFFICIAL_TABLES.some((t) => t.id === id)
        if (isOfficial) return

        set((s) => ({
          customTables: s.customTables.map((t) =>
            t.id === id ? { ...t, ...changes } : t
          ),
        }))
      },

      removeCustomTable: (id) => {
        const isOfficial = OFFICIAL_TABLES.some((t) => t.id === id)
        if (isOfficial) return

        set((s) => ({
          customTables: s.customTables.filter((t) => t.id !== id),
        }))
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      // ── Query helpers (getters) ──────────────
      getAllTables: () => {
        return mergeTables(get().customTables)
      },

      getTableById: (id) => {
        const all = mergeTables(get().customTables)
        return all.find((t) => t.id === id) ?? null
      },

      getOfficialTables: () => {
        return OFFICIAL_TABLES
      },
    }),

    {
      name: 'cannatrack-nutrition',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({
        customTables: state.customTables,
      }),
    }
  )
)
```

### 2.5 Sync Store Completo

```typescript
// frontend/src/store/syncStore.ts

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SyncAction, SyncStore, SyncState } from './types'
import { dateReviver, dateReplacer } from '@/lib/storage'

const INITIAL_STATE: SyncState = {
  queue: [],
  isSyncing: false,
  lastSyncAt: null,
  syncError: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      // ── Queueing ────────────────────────────────
      enqueueSyncAction: (action) => {
        set((s) => ({
          queue: [...s.queue, action],
        }))
      },

      /**
       * Flush: procesa la queue. En real, esto sería async,
       * pero aquí mostramos la interfaz. Implementación real
       * va en un hook personalizado o en middleware.
       */
      flushSyncQueue: async () => {
        const { queue, isOnline } = get()
        if (!isOnline || queue.length === 0) return

        set({ isSyncing: true, syncError: null })

        try {
          // TODO: implementar batch POST a /api/sync
          // const res = await fetch('/api/sync', { method: 'POST', body: JSON.stringify(queue) })
          // if (!res.ok) throw new Error('Sync failed')

          set({
            queue: [],
            lastSyncAt: new Date(),
            isSyncing: false,
          })
        } catch (error) {
          set({
            syncError: error instanceof Error ? error.message : 'Unknown error',
            isSyncing: false,
          })
          throw error
        }
      },

      // ── Status ──────────────────────────────────
      setSyncing: (isSyncing) => set({ isSyncing }),
      setSyncError: (syncError) => set({ syncError }),
      setOnline: (isOnline) => set({ isOnline }),
      setLastSyncAt: (date) => set({ lastSyncAt: date }),

      // ── Query helpers ───────────────────────────
      getQueueSize: () => get().queue.length,
      hasPendingSync: () => get().queue.length > 0,
    }),

    {
      name: 'cannatrack-sync',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // Queue persiste; status no persiste
      partialize: (state) => ({
        queue: state.queue,
      }),
    }
  )
)
```

---

## 3. CROSS-SLICE COMMUNICATION

### 3.1 Trigger Pattern — Cómo Evitar Circular Dependencies

**PROBLEMA:** taskStore.completeTask necesita disparar userStore.addXP, pero no puede importar useUserStore (circular).

**SOLUCIÓN:** Event-driven via custom hook.

```typescript
// frontend/src/hooks/useGameificationSync.ts

import { useEffect } from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { XP } from '@/lib/gamification'

/**
 * Hook que escucha cambios en taskStore.tasks y dispara
 * gamificación automáticamente. Va en la raíz de la app.
 *
 * Flujo:
 * 1. UI llama taskStore.completeTask(id) → task se marca completed
 * 2. Este hook detecta el cambio (subscription a taskStore)
 * 3. Calcula XP basado en taskType
 * 4. Llama userStore.addXP()
 * 5. Retorna evento con toast data
 */
export function useGameificationSync() {
  const tasks = useTaskStore((s) => s.tasks)
  const userStore = useUserStore()

  // Rastrear qué tareas ya procesamos (evitar dobles)
  const lastProcessedRef = React.useRef<Set<string>>(new Set())

  useEffect(() => {
    const completedNow = tasks.filter((t) => {
      const isNewlyCompleted = t.completed && !lastProcessedRef.current.has(t.id)
      return isNewlyCompleted
    })

    completedNow.forEach((task) => {
      // Determinar XP base según tipo de tarea
      let baseXP = XP.COMPLETE_TASK // 15 por defecto
      if (task.type === 'observation') baseXP = 10
      if (task.type === 'harvest') baseXP = XP.HARVEST

      // Disparar XP
      const result = userStore.addXP(baseXP)

      // Registrar en lastProcessed
      lastProcessedRef.current.add(task.id)

      // TODO: Disparar toast con resultado
      console.log(`+${result.xpGained} XP (streak: ${result.newStreak})`)
    })
  }, [tasks, userStore])
}
```

**Uso en App:**

```typescript
// frontend/src/App.tsx

import { useGameificationSync } from '@/hooks/useGameificationSync'

function App() {
  useGameificationSync()

  return <Routes>{/* ... */}</Routes>
}
```

### 3.2 Listener Pattern Alternativo (sin hook)

Si prefieres pub/sub más explícito:

```typescript
// frontend/src/lib/eventBus.ts

export type GameEvent =
  | { type: 'task.completed'; taskId: string; taskType: TaskType }
  | { type: 'plant.harvested'; plantId: string }
  | { type: 'photo.uploaded'; plantId: string }

type Listener = (event: GameEvent) => void

const listeners: Listener[] = []

export const eventBus = {
  emit(event: GameEvent) {
    listeners.forEach((l) => l(event))
  },
  subscribe(listener: Listener) {
    listeners.push(listener)
    return () => {
      const idx = listeners.indexOf(listener)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  },
}
```

**Uso:**

```typescript
// En taskStore.completeTask:
completeTask: (id, notes) => {
  // ... marcar como completed ...
  const task = get().tasks.find((t) => t.id === id)!
  eventBus.emit({ type: 'task.completed', taskId: id, taskType: task.type })
},

// En useGameificationSync:
useEffect(() => {
  return eventBus.subscribe((event) => {
    if (event.type === 'task.completed') {
      const baseXP = event.taskType === 'observation' ? 10 : 15
      userStore.addXP(baseXP)
    }
  })
}, [userStore])
```

---

## 4. PERSISTENCIA STRATEGY

### 4.1 Storage Adapter — Web vs Mobile

```typescript
// frontend/src/lib/storage.ts

interface StorageAdapter {
  getItem(key: string): Promise<string | null>
  setItem(key: string, value: string): Promise<void>
  removeItem(key: string): Promise<void>
}

// Web — localStorage sync
export const webStorageAdapter: StorageAdapter = {
  async getItem(key) {
    return localStorage.getItem(key)
  },
  async setItem(key, value) {
    localStorage.setItem(key, value)
  },
  async removeItem(key) {
    localStorage.removeItem(key)
  },
}

// Mobile — AsyncStorage async
import AsyncStorage from '@react-native-async-storage/async-storage'

export const mobileStorageAdapter: StorageAdapter = AsyncStorage

// Selector de runtime
export const getStorageAdapter = (): StorageAdapter => {
  if (typeof window === 'undefined' || typeof AsyncStorage !== 'undefined') {
    return mobileStorageAdapter
  }
  return webStorageAdapter
}

// Date serialization
export function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }
  return value
}

export function dateReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString()
  }
  return value
}
```

### 4.2 Persistencia Multi-Store

Cada store persiste su propia key — facilita debugging y upgrades:

```
localStorage:
  cannatrack-user        → { userId, email, name, totalXP, ... }
  cannatrack-plants      → { plants: [], selectedPlantId: null }
  cannatrack-tasks       → { tasks: [] }
  cannatrack-nutrition   → { customTables: [] }
  cannatrack-sync        → { queue: [] }
```

---

## 5. ERROR HANDLING

### 5.1 Task Completion — Rollback Pattern

```typescript
completeTask: (id, notes) => {
  const state = get() // snapshot before
  const task = state.tasks.find((t) => t.id === id)
  if (!task) throw new Error(`Task ${id} not found`)

  // Optimistic update
  set((s) => ({
    tasks: s.tasks.map((t) =>
      t.id === id ? { ...t, completed: true, completedAt: new Date() } : t
    ),
  }))

  // Si sync falla, rollback (en hook):
  // try {
  //   await syncStore.enqueueSyncAction({ type: 'task.complete', taskId: id, ... })
  //   await syncStore.flushSyncQueue()
  // } catch {
  //   set((s) => ({ tasks: state.tasks })) // rollback
  //   throw
  // }
}
```

### 5.2 Sync Retry Logic

```typescript
// frontend/src/hooks/useSyncManager.ts

export function useSyncManager() {
  const syncStore = useSyncStore()
  const maxRetries = 3
  const retryDelays = [1000, 3000, 10000] // ms

  async function retryableFlush(retryCount = 0) {
    try {
      await syncStore.flushSyncQueue()
    } catch (error) {
      if (retryCount < maxRetries) {
        await new Promise((r) => setTimeout(r, retryDelays[retryCount]))
        return retryableFlush(retryCount + 1)
      }
      // Max retries reached — syncStore.syncError ya está set
    }
  }

  // Monitor conectividad
  useEffect(() => {
    const handleOnline = () => {
      syncStore.setOnline(true)
      retryableFlush() // Intenta flush cuando vuelve internet
    }
    const handleOffline = () => {
      syncStore.setOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncStore])
}
```

---

## 6. EJEMPLO COMPLETO: "Usuario Completa Tarea de Nutrición"

```typescript
// UI Component
function TaskItemCard({ task }: { task: ScheduledTask }) {
  const taskStore = useTaskStore()
  const syncStore = useSyncStore()
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // 1. Mark as complete locally
      const { taskId, plantId, taskType, completedAt } = taskStore.completeTask(task.id)

      // 2. Enqueue sync (si offline, quedará en queue; si online, se procesará pronto)
      syncStore.enqueueSyncAction({
        type: 'task.complete',
        taskId,
        completedAt,
        notes: '', // o lo que sea
      })

      // 3. Si online, intenta flush ahora (sino espera a useGameificationSync)
      if (syncStore.isOnline) {
        // Nota: flushSyncQueue es async pero no esperamos aquí
        // (o sí, según UX que quieras)
        syncStore.flushSyncQueue().catch(console.error)
      }

      // 4. useGameificationSync hook va a detectar el cambio en taskStore
      // y va a disparar userStore.addXP automáticamente

      setIsSubmitting(false)
    } catch (error) {
      console.error('Failed to complete task', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      <p>{task.products.map((p) => p.name).join(', ')}</p>
      <button onClick={handleComplete} disabled={isSubmitting || task.completed}>
        {task.completed ? '✅ Completada' : 'Completar'}
      </button>
    </div>
  )
}
```

**Flujo completo:**

1. ✅ UI: tap "Completar"
2. ✅ taskStore.completeTask(id) → tasks[i].completed = true, completedAt = now
3. ✅ syncStore.enqueueSyncAction({ type: 'task.complete', ... })
4. ✅ useGameificationSync hook detecta cambio en tasks
5. ✅ userStore.addXP(15) → totalXP += 15, streak actualizado
6. ✅ UI re-renders automáticamente (Zustand subscriptions)
7. ✅ Toast muestra: "+15 XP • Streak: 5 días 🔥"
8. ✅ Si offline: action queda en syncStore.queue
9. ✅ Cuando conecta: useSyncManager detecta 'online' → flushSyncQueue

---

## 7. MOBILE ADAPTATIONS (React Native / Expo)

### 7.1 Mobile Stores — Same Logic, Different Storage

```typescript
// mobile/src/store/userStore.ts
// Idéntico al web, pero:

import AsyncStorage from '@react-native-async-storage/async-storage'

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      // ... identical actions ...
    }),
    {
      name: 'cannatrack-user',
      storage: {
        getItem: async (name) => {
          const str = await AsyncStorage.getItem(name)
          return str ? JSON.parse(str, dateReviver) : null
        },
        setItem: async (name, value) => {
          await AsyncStorage.setItem(name, JSON.stringify(value, dateReplacer))
        },
        removeItem: async (name) => {
          await AsyncStorage.removeItem(name)
        },
      },
    }
  )
)
```

### 7.2 Shared Store Factories

Para no duplicar código:

```typescript
// shared/src/store/createUserStore.ts

export function createUserStore<S extends Storage>(storage: S) {
  return create<UserStore>()(
    persist(
      (set, get) => ({
        // ... actions (identical for web and mobile) ...
      }),
      {
        name: 'cannatrack-user',
        storage, // ← inyecta adapter
      }
    )
  )
}

// web/src/store/userStore.ts
import { createUserStore } from '@shared/store'
export const useUserStore = createUserStore(webStorageAdapter)

// mobile/src/store/userStore.ts
import { createUserStore } from '@shared/store'
export const useUserStore = createUserStore(mobileStorageAdapter)
```

---

## 8. TESTING

### 8.1 Unit Test — addXP

```typescript
// frontend/src/store/__tests__/userStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useUserStore } from '../userStore'

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.getState().clearUser()
  })

  it('addXP: suma XP base sin streak bonus', () => {
    const store = useUserStore.getState()
    const result = store.addXP(15)

    expect(result.xpGained).toBe(15)
    expect(result.streakBonus).toBe(0)
    expect(store.totalXP).toBe(15)
  })

  it('addXP: aplica streak bonus en día 7', () => {
    const store = useUserStore.getState()

    // Simula 7 días de actividad
    for (let i = 0; i < 7; i++) {
      store.addXP(15)
    }

    const result = store.addXP(15) // Día 8
    expect(result.streakBonus).toBe(200) // XP.STREAK_7_BONUS
    expect(result.newStreak).toBe(8)
  })

  it('addXP: reseta streak si salta un día', () => {
    const store = useUserStore.getState()
    store.addXP(15)

    // Simula 2 días de actividad
    useUserStore.setState({
      lastActivityDate: new Date(Date.now() - 2 * 86400000), // hace 2 días
    })

    const result = store.addXP(15)
    expect(result.newStreak).toBe(1) // Reset
  })
})
```

---

## 9. CHECKLISTS Y GUIDELINES

### 9.1 Antes de Agregar una Acción Nueva a un Store

- [ ] Retorna datos que otros slices necesitan? → Usa event bus
- [ ] Mutea state? → Hazlo con `set(s => ({ ... }))`
- [ ] Necesita persistencia? → Agrega a `partialize`
- [ ] Es async? → Considerá un hook custom, no el action
- [ ] Afecta otros stores? → Documenta el trigger en el action

### 9.2 Antes de Sincronizar a Supabase

- [ ] Queue persiste? → Sí, en `partialize`
- [ ] Retry logic? → En `useSyncManager` hook
- [ ] Rollback en caso de error? → Snapshot antes de optimistic update
- [ ] Tests offline→online? → Checkear en integration tests

### 9.3 Antes de Agregar Persistencia a localStorage

- [ ] ¿Realmente necesita persistir? → Preguntar "¿Pierdo data importante si la app resetea?"
- [ ] dateReviver/dateReplacer? → Sí, para Date objects
- [ ] partialize correcto? → No persistir: loading, error, runtime state
- [ ] Size check? → localStorage tiene ~5MB límite

---

## 10. DIAGRAMA DE DEPENDENCIAS

```
┌─────────────────────────────────────────────────────────┐
│                      React App                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Components (UI)                                 │   │
│  │  - TaskItemCard.tsx                              │   │
│  │  - PlantDetail.tsx                               │   │
│  └──────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┬─┘
                                                         │
         ┌─────────────────────────────────────────────┘
         │
         v
    ┌────────────────────────────┐
    │   Custom Hooks             │
    ├────────────────────────────┤
    │ useGameificationSync()      │  ← Escucha taskStore
    │ useSyncManager()            │  ← Monitor conectividad
    │ useXXX() others             │
    └──────┬───────────┬──────────┘
           │           │
      ┌────v────┐  ┌───v────┐
      │ Stores  │  │ Event   │
      │ (Zustand│  │ Bus     │
      │  )      │  └─────────┘
      ├─────────┤
      │ - User  │
      │ - Plant │
      │ - Task  │  (No circular deps — van via hooks)
      │ -Nutri. │
      │ - Sync  │
      └────┬────┘
           │
           v
    ┌─────────────────────┐
    │ localStorage/       │
    │ AsyncStorage        │
    │ (Persistencia)      │
    └─────────────────────┘
```

---

## 11. PRÓXIMAS FASES

1. **Fase 1** (MVP)
   - Implementar userStore, plantStore, taskStore, nutritionStore
   - Hook useGameificationSync funcional
   - Tests unitarios para addXP y completeTask
   
2. **Fase 2** (Backend)
   - syncStore functional con retry
   - Supabase schema mapping (camelCase ↔ snake_case)
   - Batch sync endpoint `/api/sync`
   
3. **Fase 3** (Mobile)
   - Factorizar stores para mobile (AsyncStorage)
   - useGameificationSync funciona igual
   - Persistencia offline-first
   
4. **Fase 4** (Advanced)
   - Event bus / pub-sub si crece complexity
   - Caching layer en sync
   - Optimistic updates con rollback

