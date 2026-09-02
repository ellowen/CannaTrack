# Zustand Architecture — Ejemplos de Uso

Implementaciones concretas mostrando cross-slice communication.

---

## EJEMPLO 1: Completar Tarea (Flow Completo)

### Flujo

```
1. User tap "Completar tarea"
   ↓
2. TaskStore.completeTask(taskId)
   - tasks[i].completed = true
   - tasks[i].completedAt = now
   ↓
3. useGameificationSync hook detecta cambio
   ↓
4. UserStore.addXP(base) → suma XP + streak
   ↓
5. SyncStore.enqueueSyncAction({ type: 'task.complete', ... })
   ↓
6. Si online → flushSyncQueue (POST /api/sync)
   Si offline → queda en queue
   ↓
7. UI re-render automático (Zustand subscriptions)
   Toast: "+15 XP • Streak: 5 días 🔥"
```

### UI Component

```typescript
// frontend/src/components/TaskItemCard.tsx

import React from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'
import { useUserStore } from '@/store/userStore'
import type { ScheduledTask } from '@/types/plant'

interface TaskItemCardProps {
  task: ScheduledTask
  onCompleteCallback?: (xpGained: number) => void // Para mostrar toast
}

export function TaskItemCard({ task, onCompleteCallback }: TaskItemCardProps) {
  const taskStore = useTaskStore()
  const syncStore = useSyncStore()
  const userStore = useUserStore()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleComplete = async () => {
    if (task.completed) return
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Mark as complete in taskStore
      //    (useGameificationSync hook va a escuchar este cambio)
      const metadata = taskStore.completeTask(task.id, '')

      // 2. Enqueue sync action
      syncStore.enqueueSyncAction({
        type: 'task.complete',
        taskId: task.id,
        completedAt: metadata.completedAt,
        notes: '',
      })

      // 3. Si online, intenta sync ahora (no esperamos respuesta)
      if (syncStore.isOnline) {
        syncStore.flushSyncQueue().catch((err) => {
          console.warn('Sync failed, will retry:', err)
          // Queue persiste, se reintentará en useSyncManager
        })
      }

      // 4. Callback para mostrar toast
      //    (El XP ya fue agregado por useGameificationSync hook)
      const newTotal = userStore.totalXP
      onCompleteCallback?.(newTotal)

      setIsSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="task-card border rounded-lg p-4 mb-2">
      {/* Productos */}
      <div className="products mb-3">
        {task.products.map((prod) => (
          <span key={prod.name} className="badge mr-2">
            {prod.name}: {prod.minDose}-{prod.maxDose} {prod.unit}
          </span>
        ))}
      </div>

      {/* EC/PH si existen */}
      {(task.ecMin || task.phMin) && (
        <div className="params text-sm text-gray-600 mb-2">
          {task.ecMin && `EC: ${task.ecMin}-${task.ecMax}`}
          {task.phMin && ` • PH: ${task.phMin}-${task.phMax}`}
        </div>
      )}

      {/* Status */}
      {task.completed ? (
        <div className="status text-green-600 text-sm font-semibold">
          ✅ Completada {task.completedAt && `el ${task.completedAt.toLocaleDateString()}`}
        </div>
      ) : (
        <button
          onClick={handleComplete}
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? 'Guardando...' : 'Marcar Completada'}
        </button>
      )}

      {error && <div className="error text-red-600 text-sm mt-2">{error}</div>}
    </div>
  )
}
```

### Hook — useGameificationSync

```typescript
// frontend/src/hooks/useGameificationSync.ts

import React from 'react'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { XP } from '@/lib/gamification'
import type { TaskType } from '@/types/plant'

/**
 * Escucha cambios en taskStore.tasks y dispara automáticamente
 * gamificación (XP, streak) en userStore.
 *
 * Se agrega en App root para escuchar globalmente.
 */
export function useGameificationSync() {
  const tasks = useTaskStore((s) => s.tasks)
  const taskStore = useTaskStore()
  const userStore = useUserStore()
  const processedRef = React.useRef<Set<string>>(new Set())

  React.useEffect(() => {
    // Detectar tareas completadas recientemente
    const newlyCompleted = tasks.filter((t) => {
      const isCompleted = t.completed
      const notProcessed = !processedRef.current.has(t.id)
      return isCompleted && notProcessed
    })

    newlyCompleted.forEach((task) => {
      // Determinar XP base según tipo
      let baseXP = XP.COMPLETE_TASK // 15 por defecto

      if (task.type === 'observation') {
        baseXP = 10
      } else if (task.type === 'harvest') {
        baseXP = XP.HARVEST // 100
      } else if (task.type === 'nutrition') {
        baseXP = XP.COMPLETE_TASK // 15
      }

      // Disparar XP
      const result = userStore.addXP(baseXP)

      // Registrar como procesada
      processedRef.current.add(task.id)

      // Emitir evento para UI (toast, notificación, etc)
      window.dispatchEvent(
        new CustomEvent('xp-gained', {
          detail: {
            taskId: task.id,
            xpGained: result.xpGained,
            streakBonus: result.streakBonus,
            newStreak: result.newStreak,
            leveledUp: result.leveledUp,
            newLevel: result.newLevel,
          },
        })
      )

      console.log(
        `[Gamification] Task ${task.id} completed: +${result.xpGained} XP, streak: ${result.newStreak}`
      )
    })
  }, [tasks, userStore])

  // Cleanup: si app resetea, limpiar ref
  React.useEffect(() => {
    return () => {
      processedRef.current.clear()
    }
  }, [])
}
```

### Hook — useSyncManager (Conectividad)

```typescript
// frontend/src/hooks/useSyncManager.ts

import React from 'react'
import { useSyncStore } from '@/store/syncStore'

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 10000] // ms

/**
 * Monitorea conectividad y reintenta sync automáticamente.
 * Se agrega en App root.
 */
export function useSyncManager() {
  const syncStore = useSyncStore()

  // Monitor online/offline
  React.useEffect(() => {
    const handleOnline = () => {
      syncStore.setOnline(true)
      console.log('[Sync] Online — flushing queue')
      retryableFlush()
    }

    const handleOffline = () => {
      syncStore.setOnline(false)
      console.log('[Sync] Offline — queue persists')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Check initial state
    syncStore.setOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncStore])

  async function retryableFlush(retryCount = 0): Promise<void> {
    try {
      await syncStore.flushSyncQueue()
      console.log('[Sync] Flushed successfully')
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount]
        console.warn(`[Sync] Failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`)
        await new Promise((r) => setTimeout(r, delay))
        return retryableFlush(retryCount + 1)
      } else {
        console.error('[Sync] Max retries reached', error)
        syncStore.setSyncError('No se pudo sincronizar. Reintentaremos más tarde.')
      }
    }
  }
}
```

### App Root

```typescript
// frontend/src/App.tsx

import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useGameificationSync } from '@/hooks/useGameificationSync'
import { useSyncManager } from '@/hooks/useSyncManager'
import { HomePage } from '@/pages/HomePage'
import { PlantDetailPage } from '@/pages/PlantDetailPage'

function AppContent() {
  // Estos hooks activan listeners globales
  useGameificationSync()
  useSyncManager()

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/plant/:id" element={<PlantDetailPage />} />
      {/* ... más rutas ... */}
    </Routes>
  )
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
```

### Toast Component (Escucha el evento)

```typescript
// frontend/src/components/XPToast.tsx

import React from 'react'

interface XPGainedEvent {
  taskId: string
  xpGained: number
  streakBonus: number
  newStreak: number
  leveledUp: boolean
  newLevel?: number
}

export function XPToast() {
  const [event, setEvent] = React.useState<XPGainedEvent | null>(null)

  React.useEffect(() => {
    const handler = (e: Event) => {
      if (e instanceof CustomEvent) {
        setEvent(e.detail)
        // Auto-hide después de 3s
        const timer = setTimeout(() => setEvent(null), 3000)
        return () => clearTimeout(timer)
      }
    }

    window.addEventListener('xp-gained', handler)
    return () => window.removeEventListener('xp-gained', handler)
  }, [])

  if (!event) return null

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
      <div className="font-bold">+{event.xpGained} XP</div>
      <div className="text-sm">Streak: {event.newStreak} días 🔥</div>
      {event.leveledUp && (
        <div className="text-sm mt-1 bg-orange-600 px-2 py-1 rounded">
          ¡Leveleaste! Nivel {event.newLevel}
        </div>
      )}
    </div>
  )
}

// Agregrar en App:
// <XPToast />
```

---

## EJEMPLO 2: Agregar Planta (Multi-Store)

### Flujo

```
1. Form (NewPlantPage) → plantStore.addPlant(plant)
2. plantStore actualiza: plants = [...plants, plant]
3. taskStore genera tareas: taskStore.setTasks(plantId, scheduledTasks)
4. Si offline:
   - syncStore.enqueueSyncAction({ type: 'plant.create', payload: plant })
   - syncStore.enqueueSyncAction({ type: 'task.create', ... })
5. Si online → flushSyncQueue → POST /api/plants + POST /api/tasks
6. Toast: "Planta 'Genética XYZ' creada ✅"
```

### Component

```typescript
// frontend/src/pages/NewPlantPage.tsx

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useNutritionStore } from '@/store/nutritionStore'
import { useSyncStore } from '@/store/syncStore'
import { useUserStore } from '@/store/userStore'
import { generatePlantSchedule } from '@/lib/schedule'
import type { Plant, GeneticType } from '@/types/plant'

export function NewPlantPage() {
  const navigate = useNavigate()
  const plantStore = usePlantStore()
  const taskStore = useTaskStore()
  const nutritionStore = useNutritionStore()
  const syncStore = useSyncStore()
  const userStore = useUserStore()

  // Form state
  const [formData, setFormData] = React.useState({
    name: 'Planta 1',
    genetics: 'OG Kush',
    geneticType: 'feminized' as GeneticType,
    location: 'indoor' as const,
    tableId: 'revegetar-bio',
  })
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Crear objeto Plant
      const plant: Plant = {
        id: `plant-${Date.now()}`,
        name: formData.name,
        genetics: formData.genetics,
        geneticType: formData.geneticType,
        sex: 'unknown',
        startDate: new Date(),
        location: formData.location,
        potCount: 1,
        potVolumeLiters: userStore.potVolumeLiters,
        nutritionTableId: formData.tableId,
        status: 'active',
      }

      // 2. Agregar a plantStore
      plantStore.addPlant(plant)

      // 3. Generar schedule de tareas
      const table = nutritionStore.getTableById(formData.tableId)
      if (!table) throw new Error('Nutrition table not found')

      const schedule = generatePlantSchedule(plant, table)

      // 4. Agregar tareas
      taskStore.setTasks(plant.id, schedule.tasks)

      // 5. Enqueue sync actions
      syncStore.enqueueSyncAction({
        type: 'plant.create',
        payload: plant,
      })

      // Nota: tareas se sincan implícitamente como parte del plant schedule

      // 6. Si online, flush
      if (syncStore.isOnline) {
        await syncStore.flushSyncQueue()
      }

      // 7. Navigate
      plantStore.selectPlant(plant.id)
      navigate(`/plant/${plant.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="new-plant-page p-4">
      <h1 className="text-2xl font-bold mb-4">Nueva Planta</h1>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">
            <span className="label-text">Nombre</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Genética</span>
          </label>
          <input
            type="text"
            value={formData.genetics}
            onChange={(e) => setFormData({ ...formData, genetics: e.target.value })}
            className="input input-bordered w-full"
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text">Tipo Genético</span>
          </label>
          <select
            value={formData.geneticType}
            onChange={(e) =>
              setFormData({ ...formData, geneticType: e.target.value as GeneticType })
            }
            className="select select-bordered w-full"
          >
            <option value="feminized">Feminizada</option>
            <option value="autoflower">Autofloreciente</option>
            <option value="regular">Regular</option>
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Ubicación</span>
          </label>
          <select
            value={formData.location}
            onChange={(e) =>
              setFormData({ ...formData, location: e.target.value as 'indoor' | 'outdoor' })
            }
            className="select select-bordered w-full"
          >
            <option value="indoor">Interior</option>
            <option value="outdoor">Exterior</option>
          </select>
        </div>

        <div>
          <label className="label">
            <span className="label-text">Tabla Nutricional</span>
          </label>
          <select
            value={formData.tableId}
            onChange={(e) => setFormData({ ...formData, tableId: e.target.value })}
            className="select select-bordered w-full"
          >
            {nutritionStore.getAllTables().map((table) => (
              <option key={table.id} value={table.id}>
                {table.name} ({table.brandId || 'Custom'})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? 'Creando...' : 'Crear Planta'}
        </button>
      </form>
    </div>
  )
}
```

---

## EJEMPLO 3: Upload Foto (Async + Sync)

### Flujo

```
1. User selecciona foto
2. Upload a CloudStorage (Supabase)
3. Agregar measurement record a measurementStore
4. Enqueue sync: { type: 'photo.uploaded', plantId, url }
5. Disparar XP: userStore.addXP(XP.UPLOAD_PHOTO)
```

### Hook

```typescript
// frontend/src/hooks/usePhotoUpload.ts

import React from 'react'
import { usePlantStore } from '@/store/plantStore'
import { useUserStore } from '@/store/userStore'
import { useSyncStore } from '@/store/syncStore'
import { XP } from '@/lib/gamification'

export interface PhotoUploadResult {
  url: string
  plantId: string
  uploadedAt: Date
}

export function usePhotoUpload() {
  const plantStore = usePlantStore()
  const userStore = useUserStore()
  const syncStore = useSyncStore()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const uploadPhoto = React.useCallback(
    async (file: File, plantId: string): Promise<PhotoUploadResult> => {
      setLoading(true)
      setError(null)

      try {
        // 1. Upload a Storage (simulado)
        const uploadedUrl = await uploadToStorage(file)

        // 2. Enqueue sync
        syncStore.enqueueSyncAction({
          type: 'photo.uploaded',
          payload: {
            plantId,
            url: uploadedUrl,
            uploadedAt: new Date(),
          },
        })

        // 3. Dispara XP
        userStore.addXP(XP.UPLOAD_PHOTO)

        // 4. Retorna dato
        const result: PhotoUploadResult = {
          url: uploadedUrl,
          plantId,
          uploadedAt: new Date(),
        }

        // 5. Si online, sync ahora
        if (syncStore.isOnline) {
          syncStore.flushSyncQueue().catch(console.warn)
        }

        return result
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [plantStore, userStore, syncStore]
  )

  return { uploadPhoto, loading, error }
}

async function uploadToStorage(file: File): Promise<string> {
  // TODO: Implementar con Supabase storage
  // const { data, error } = await supabase.storage
  //   .from('plant-photos')
  //   .upload(`${plantId}/${Date.now()}.jpg`, file)
  return `https://example.com/photos/${Date.now()}.jpg`
}
```

---

## EJEMPLO 4: Unit Tests

### Tests — userStore

```typescript
// frontend/src/store/__tests__/userStore.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useUserStore } from '../userStore'
import { XP, getLevelInfo } from '@/lib/gamification'

describe('useUserStore', () => {
  beforeEach(() => {
    // Reset store
    useUserStore.setState({
      userId: null,
      email: null,
      name: '',
      totalXP: 0,
      streak: 0,
      bestStreak: 0,
      lastActivityDate: null,
    })
  })

  describe('addXP', () => {
    it('suma XP base', () => {
      const store = useUserStore.getState()
      const result = store.addXP(15)

      expect(result.xpGained).toBe(15)
      expect(result.streakBonus).toBe(0)
      expect(store.totalXP).toBe(15)
    })

    it('no da bonus sin streak', () => {
      const store = useUserStore.getState()
      store.addXP(15)

      expect(store.streak).toBe(1)
      expect(store.bestStreak).toBe(1)
    })

    it('incrementa streak si actividad ayer', () => {
      const store = useUserStore.getState()

      // Día 1
      store.addXP(15)
      expect(store.streak).toBe(1)

      // Simular: yesterday
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      useUserStore.setState({ lastActivityDate: yesterday })

      // Día 2
      const result = store.addXP(15)
      expect(result.newStreak).toBe(2)
      expect(store.streak).toBe(2)
    })

    it('reseta streak si saltó un día', () => {
      const store = useUserStore.getState()

      store.addXP(15) // Día 1, streak = 1

      // Simular: 2 días atrás
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      useUserStore.setState({ lastActivityDate: twoDaysAgo })

      // Día 3 (saltó 1 día)
      const result = store.addXP(15)
      expect(result.newStreak).toBe(1) // Reset
      expect(store.streak).toBe(1)
    })

    it('aplica STREAK_7_BONUS en día 7', () => {
      const store = useUserStore.getState()

      // Simular: 6 días consecutivos ya completados
      useUserStore.setState({
        streak: 6,
        lastActivityDate: new Date(), // Hoy
      })

      // Día 7
      const result = store.addXP(15)
      expect(result.newStreak).toBe(7)
      expect(result.streakBonus).toBe(XP.STREAK_7_BONUS) // 200
      expect(result.xpGained).toBe(15 + 200)
    })

    it('aplica STREAK_30_BONUS en día 30', () => {
      const store = useUserStore.getState()

      useUserStore.setState({
        streak: 29,
        lastActivityDate: new Date(),
      })

      const result = store.addXP(15)
      expect(result.newStreak).toBe(30)
      expect(result.streakBonus).toBe(XP.STREAK_30_BONUS) // 1000
      expect(result.xpGained).toBe(15 + 1000)
    })

    it('marca levelUp cuando cruza threshold', () => {
      const store = useUserStore.getState()
      const currentLevel = getLevelInfo(0).current.level

      // Agregar suficiente XP para subir nivel
      const targetLevel = currentLevel + 1
      const levelDef = getLevelInfo(targetLevel * 10000).current // Hack para encontrar level
      const xpNeeded = levelDef.xpRequired - 0
      const result = store.addXP(xpNeeded)

      expect(result.leveledUp).toBe(true)
      expect(result.newLevel).toBeDefined()
    })
  })

  describe('setUser', () => {
    it('establece user data', () => {
      const store = useUserStore.getState()
      const now = new Date()

      store.setUser({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: now,
      })

      expect(store.userId).toBe('user-123')
      expect(store.email).toBe('test@example.com')
      expect(store.name).toBe('Test User')
      expect(store.createdAt).toEqual(now)
    })
  })

  describe('clearUser', () => {
    it('resetea state a initial', () => {
      const store = useUserStore.getState()
      store.setUser({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: new Date(),
      })

      store.clearUser()

      expect(store.userId).toBeNull()
      expect(store.email).toBeNull()
      expect(store.totalXP).toBe(0)
    })
  })
})
```

### Tests — taskStore

```typescript
// frontend/src/store/__tests__/taskStore.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '../taskStore'
import type { ScheduledTask } from '@/types/plant'

describe('useTaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
  })

  describe('completeTask', () => {
    it('marca tarea como completada', () => {
      const task: ScheduledTask = {
        id: 'task-1',
        plantId: 'plant-1',
        type: 'nutrition',
        scheduledDate: new Date(),
        cycle: 'vege',
        week: 1,
        stage: 'growth',
        products: [],
        completed: false,
      }

      const store = useTaskStore.getState()
      store.addTask(task)

      const metadata = store.completeTask(task.id)

      expect(metadata.taskId).toBe('task-1')
      expect(metadata.completedAt).toBeInstanceOf(Date)

      const completed = store.tasks.find((t) => t.id === 'task-1')
      expect(completed?.completed).toBe(true)
      expect(completed?.completedAt).toBeInstanceOf(Date)
    })

    it('agrega notas de completación', () => {
      const task: ScheduledTask = {
        id: 'task-1',
        plantId: 'plant-1',
        type: 'nutrition',
        scheduledDate: new Date(),
        cycle: 'vege',
        week: 1,
        stage: 'growth',
        products: [],
        completed: false,
      }

      const store = useTaskStore.getState()
      store.addTask(task)
      store.completeTask(task.id, 'Usé 100ml del producto XYZ')

      const completed = store.tasks.find((t) => t.id === 'task-1')
      expect(completed?.completionNotes).toBe('Usé 100ml del producto XYZ')
    })

    it('lanza error si tarea no existe', () => {
      const store = useTaskStore.getState()
      expect(() => store.completeTask('nonexistent')).toThrow()
    })
  })

  describe('getTodayTasks', () => {
    it('retorna solo tareas de hoy', () => {
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      const tasks: ScheduledTask[] = [
        {
          id: 'task-today',
          plantId: 'plant-1',
          type: 'nutrition',
          scheduledDate: today,
          cycle: 'vege',
          week: 1,
          stage: 'growth',
          products: [],
          completed: false,
        },
        {
          id: 'task-tomorrow',
          plantId: 'plant-1',
          type: 'irrigation',
          scheduledDate: tomorrow,
          cycle: 'vege',
          week: 1,
          stage: 'growth',
          products: [],
          completed: false,
        },
        {
          id: 'task-yesterday',
          plantId: 'plant-1',
          type: 'observation',
          scheduledDate: yesterday,
          cycle: 'vege',
          week: 1,
          stage: 'growth',
          products: [],
          completed: false,
        },
      ]

      const store = useTaskStore.getState()
      tasks.forEach((t) => store.addTask(t))

      const todayTasks = store.getTodayTasks()
      expect(todayTasks).toHaveLength(1)
      expect(todayTasks[0].id).toBe('task-today')
    })
  })
})
```

### Tests — Integración (cross-slice)

```typescript
// frontend/src/store/__tests__/integration.test.ts

import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskStore } from '../taskStore'
import { useUserStore } from '../userStore'
import { useSyncStore } from '../syncStore'
import type { ScheduledTask } from '@/types/plant'

/**
 * Simula el flujo completo:
 * 1. User completa tarea
 * 2. userStore suma XP
 * 3. syncStore enqueue action
 */
describe('Cross-Slice Integration', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useUserStore.setState({
      totalXP: 0,
      streak: 0,
      lastActivityDate: null,
    })
    useSyncStore.setState({ queue: [] })
  })

  it('flujo: completar tarea → XP → sync', () => {
    const task: ScheduledTask = {
      id: 'task-1',
      plantId: 'plant-1',
      type: 'nutrition',
      scheduledDate: new Date(),
      cycle: 'vege',
      week: 1,
      stage: 'growth',
      products: [],
      completed: false,
    }

    // 1. Agregar tarea
    const taskStore = useTaskStore.getState()
    taskStore.addTask(task)

    // 2. Completar tarea
    const metadata = taskStore.completeTask(task.id)
    expect(taskStore.tasks[0].completed).toBe(true)

    // 3. Simular addXP (en real, lo hace useGameificationSync hook)
    const userStore = useUserStore.getState()
    const xpResult = userStore.addXP(15)
    expect(xpResult.xpGained).toBe(15)
    expect(userStore.totalXP).toBe(15)

    // 4. Simular enqueue sync
    const syncStore = useSyncStore.getState()
    syncStore.enqueueSyncAction({
      type: 'task.complete',
      taskId: task.id,
      completedAt: metadata.completedAt,
    })

    expect(syncStore.queue).toHaveLength(1)
    expect(syncStore.queue[0].type).toBe('task.complete')
  })

  it('offline: queue persiste, sync cuando conecta', async () => {
    const syncStore = useSyncStore.getState()
    syncStore.setOnline(false)

    // Enqueue while offline
    syncStore.enqueueSyncAction({
      type: 'task.complete',
      taskId: 'task-1',
      completedAt: new Date(),
    })

    expect(syncStore.queue).toHaveLength(1)
    expect(syncStore.isSyncing).toBe(false)

    // Mock: conecta
    syncStore.setOnline(true)
    expect(syncStore.isOnline).toBe(true)

    // En real, useSyncManager detectaría esto y llamaría flushSyncQueue
  })
})
```

