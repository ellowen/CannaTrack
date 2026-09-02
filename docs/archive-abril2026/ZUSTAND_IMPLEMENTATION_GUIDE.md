# Zustand Implementation Guide — Step by Step

Guía práctica para implementar la arquitectura diseñada.

---

## FASE 1: SETUP INICIAL (1-2 días)

### 1.1 Actualizar userStore (DONE → REFACTOR)

**Status:** El userStore ya existe pero falta gamificación completa.

**Cambios:**
- [x] Estructura básica existe
- [x] addXP implementado
- [ ] _setTotalXP y _setStreak (para Supabase sync)
- [ ] Persistencia completa (check dateReviver)

**Checklist:**

```typescript
// Verify: frontend/src/store/userStore.ts

// ✅ Tiene estos fields:
// - totalXP, streak, bestStreak, lastActivityDate
// - userId, email, name, plan

// ✅ Tiene addXP con XP.STREAK_7_BONUS y XP.STREAK_30_BONUS

// ✅ Persistencia:
// - persist() middleware
// - dateReviver para Date objects
// - partialize: solo los fields necesarios

// TODO: Agregar:
// - _setTotalXP(xp)
// - _setStreak(streak, bestStreak, lastActivityDate)
// - createdAt: Date | null
```

**Implementar:**

```typescript
// Add to UserStore interface & implementation

_setTotalXP: (xp: number) => set({ totalXP: xp }),
_setStreak: (streak, bestStreak, lastActivityDate) => {
  set({ streak, bestStreak, lastActivityDate })
},
```

### 1.2 Actualizar taskStore

**Status:** Existe pero falta `completeTask` metadata y getters.

**Cambios:**

```typescript
// Refactor completeTask para retornar metadata:

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

// Agregar getters:
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
```

### 1.3 Crear syncStore (NEW)

**File:** `frontend/src/store/syncStore.ts`

```typescript
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

      enqueueSyncAction: (action) => {
        set((s) => ({
          queue: [...s.queue, action],
        }))
      },

      flushSyncQueue: async () => {
        const { queue, isOnline } = get()
        if (!isOnline || queue.length === 0) return

        set({ isSyncing: true, syncError: null })

        try {
          // TODO: POST /api/sync
          const res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actions: queue }),
          })

          if (!res.ok) throw new Error(`Sync failed: ${res.status}`)

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

      setSyncing: (isSyncing) => set({ isSyncing }),
      setSyncError: (syncError) => set({ syncError }),
      setOnline: (isOnline) => set({ isOnline }),
      setLastSyncAt: (date) => set({ lastSyncAt: date }),

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
      partialize: (state) => ({
        queue: state.queue,
      }),
    }
  )
)
```

### 1.4 Crear tipos (types.ts)

**File:** `frontend/src/store/types.ts`

Copiar de ZUSTAND_ARCHITECTURE.md sección 1 (todas las interfaces).

### 1.5 Actualizar index.ts

**File:** `frontend/src/store/index.ts`

```typescript
export { useUserStore } from './userStore'
export { usePlantStore } from './plantStore'
export { useTaskStore } from './taskStore'
export { useNutritionStore } from './nutritionStore'
export { useSyncStore } from './syncStore'

export type * from './types'
```

---

## FASE 2: HOOKS DE SINCRONIZACIÓN (2-3 días)

### 2.1 Crear useGameificationSync Hook

**File:** `frontend/src/hooks/useGameificationSync.ts`

Copiar de ZUSTAND_EXAMPLES.md sección EJEMPLO 1.

**Tests:**

```bash
cd frontend
npm run test -- useGameificationSync.test.ts
```

### 2.2 Crear useSyncManager Hook

**File:** `frontend/src/hooks/useSyncManager.ts`

Copiar de ZUSTAND_EXAMPLES.md sección EJEMPLO 1.

**Tests:**

```bash
npm run test -- useSyncManager.test.ts
```

### 2.3 Integrar en App Root

**File:** `frontend/src/App.tsx`

```typescript
import { useGameificationSync } from '@/hooks/useGameificationSync'
import { useSyncManager } from '@/hooks/useSyncManager'

function AppContent() {
  useGameificationSync()
  useSyncManager()

  return <Routes>{/* ... */}</Routes>
}

export function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  )
}
```

---

## FASE 3: TESTING (2 días)

### 3.1 Unit Tests — Stores

**Files:**
- `frontend/src/store/__tests__/userStore.test.ts`
- `frontend/src/store/__tests__/taskStore.test.ts`
- `frontend/src/store/__tests__/plantStore.test.ts`
- `frontend/src/store/__tests__/nutritionStore.test.ts`
- `frontend/src/store/__tests__/syncStore.test.ts`

**Copy from:** ZUSTAND_EXAMPLES.md sección EJEMPLO 4.

**Run:**

```bash
npm run test
```

**Coverage target:** >85% para stores

### 3.2 Integration Tests

**File:** `frontend/src/store/__tests__/integration.test.ts`

Copiar de ZUSTAND_EXAMPLES.md.

**Scnearios:**
- Complete task → XP added → sync enqueued
- Offline: enqueue → queue persists → online: flush
- Level up detection
- Streak reset logic

### 3.3 Component Integration Tests

**Files:**
- `frontend/src/components/__tests__/TaskItemCard.test.tsx`
- `frontend/src/pages/__tests__/NewPlantPage.test.tsx`

```typescript
// Example: TaskItemCard.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { useGameificationSync } from '@/hooks/useGameificationSync'
import { TaskItemCard } from '@/components/TaskItemCard'
import type { ScheduledTask } from '@/types/plant'

describe('TaskItemCard Integration', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useUserStore.setState({ totalXP: 0 })
  })

  it('completeTask → useGameificationSync → addXP', async () => {
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

    useTaskStore.getState().addTask(task)

    const { rerender } = render(
      <TaskItemCard task={task} />
    )

    // Simula hook
    const { result } = renderHook(() => useGameificationSync())

    // Click completar
    const button = screen.getByText('Marcar Completada')
    fireEvent.click(button)

    // Wait for XP
    await waitFor(() => {
      const userStore = useUserStore.getState()
      expect(userStore.totalXP).toBeGreaterThan(0)
    })
  })
})
```

---

## FASE 4: BACKEND INTEGRATION (3-5 días)

### 4.1 Supabase Schema

**File:** `backend/supabase/migrations/001_create_sync_queue.sql`

```sql
-- Tabla para persistencia de sync queue si la DB es fuente de verdad
CREATE TABLE public.sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'plant.create', 'task.complete', etc
  action_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INT DEFAULT 0
);

CREATE INDEX sync_queue_user_status ON public.sync_queue(user_id, status);
```

### 4.2 Sync Endpoint

**File:** `backend/src/routes/sync.ts` (Node.js / Supabase Functions)

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  // Verify JWT token
  const { data: userData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !userData.user) {
    return new Response('Invalid token', { status: 401 })
  }

  const { actions } = await req.json()
  const userId = userData.user.id

  // Process each action
  const results = []
  for (const action of actions) {
    try {
      await processAction(userId, action)
      results.push({ actionType: action.type, status: 'ok' })
    } catch (error) {
      results.push({
        actionType: action.type,
        status: 'error',
        error: error.message,
      })
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

async function processAction(userId: string, action: any) {
  switch (action.type) {
    case 'task.complete':
      return await updateTaskInDB(userId, action.taskId, {
        completed: true,
        completed_at: action.completedAt,
      })

    case 'plant.create':
      return await insertPlantInDB(userId, action.payload)

    case 'plant.update':
      return await updatePlantInDB(userId, action.plantId, action.payload)

    default:
      throw new Error(`Unknown action type: ${action.type}`)
  }
}

// Helper functions...
async function updateTaskInDB(userId: string, taskId: string, data: any) {
  const { error } = await supabase
    .from('tasks')
    .update(data)
    .eq('id', taskId)
    .eq('user_id', userId)

  if (error) throw error
}

async function insertPlantInDB(userId: string, plantData: any) {
  const { error } = await supabase
    .from('plants')
    .insert({ ...plantData, user_id: userId })

  if (error) throw error
}

async function updatePlantInDB(userId: string, plantId: string, data: any) {
  const { error } = await supabase
    .from('plants')
    .update(data)
    .eq('id', plantId)
    .eq('user_id', userId)

  if (error) throw error
}
```

### 4.3 Auth Integration

**File:** `frontend/src/hooks/useAuth.ts`

```typescript
import { useEffect } from 'react'
import { useUserStore } from '@/store/userStore'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const userStore = useUserStore()

  useEffect(() => {
    // Check session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userStore.setUser({
          userId: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
          createdAt: new Date(session.user.created_at),
        })
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        userStore.setUser({
          userId: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || '',
          createdAt: new Date(session.user.created_at),
        })
      } else {
        userStore.clearUser()
      }
    })

    return () => subscription?.unsubscribe()
  }, [userStore])
}
```

---

## FASE 5: OFFLINE-FIRST FLOW (2 días)

### 5.1 Connection Monitor

**File:** `frontend/src/lib/connectionMonitor.ts`

```typescript
export interface ConnectionState {
  isOnline: boolean
  lastCheckAt: Date
  failedAttempts: number
}

export class ConnectionMonitor {
  private state: ConnectionState = {
    isOnline: navigator.onLine,
    lastCheckAt: new Date(),
    failedAttempts: 0,
  }

  private listeners: Set<(state: ConnectionState) => void> = new Set()

  constructor() {
    window.addEventListener('online', () => this.updateState(true))
    window.addEventListener('offline', () => this.updateState(false))
  }

  private updateState(isOnline: boolean) {
    this.state = {
      isOnline,
      lastCheckAt: new Date(),
      failedAttempts: isOnline ? 0 : this.state.failedAttempts + 1,
    }
    this.notify()
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.state))
  }

  subscribe(listener: (state: ConnectionState) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getState() {
    return this.state
  }
}

export const connectionMonitor = new ConnectionMonitor()
```

### 5.2 Offline UI Indicator

**File:** `frontend/src/components/OfflineIndicator.tsx`

```typescript
import { useEffect, useState } from 'react'
import { useSyncStore } from '@/store/syncStore'
import { connectionMonitor } from '@/lib/connectionMonitor'

export function OfflineIndicator() {
  const syncStore = useSyncStore()
  const [showOffline, setShowOffline] = useState(!navigator.onLine)

  useEffect(() => {
    return connectionMonitor.subscribe((state) => {
      setShowOffline(!state.isOnline)
    })
  }, [])

  if (!showOffline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-600 text-white px-4 py-2 text-sm">
      <span>📡 Sin conexión</span>
      {syncStore.queue.length > 0 && (
        <span className="ml-2">
          • {syncStore.queue.length} cambios pendientes de sincronizar
        </span>
      )}
    </div>
  )
}
```

---

## FASE 6: MOBILE ADAPTATIONS (3-4 días)

### 6.1 Mobile Storage Adapter

**File:** `mobile/src/lib/storage.ts`

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'

export const mobileStorageAdapter = {
  getItem: async (name: string) => {
    const str = await AsyncStorage.getItem(name)
    return str ? JSON.parse(str) : null
  },
  setItem: async (name: string, value: any) => {
    await AsyncStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: async (name: string) => {
    await AsyncStorage.removeItem(name)
  },
}
```

### 6.2 Shared Store Factory

**File:** `shared/src/store/createUserStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export function createUserStore(storage: any) {
  return create()(
    persist(
      (set, get) => ({
        // ... all actions (identical for web and mobile) ...
      }),
      {
        name: 'cannatrack-user',
        storage,
      }
    )
  )
}
```

### 6.3 Mobile App Integration

**File:** `mobile/src/App.tsx`

```typescript
import { useGameificationSync } from '@shared/hooks/useGameificationSync'
import { useSyncManager } from '@shared/hooks/useSyncManager'

export default function App() {
  useGameificationSync()
  useSyncManager()

  return <NavigationContainer>{/* ... */}</NavigationContainer>
}
```

---

## CHECKLIST FINAL

### Core Functionality
- [ ] userStore completo con gamificación
- [ ] taskStore con completeTask y getters
- [ ] plantStore con selection
- [ ] nutritionStore con getAllTables
- [ ] syncStore con queue y flush

### Hooks
- [ ] useGameificationSync implementado y testeado
- [ ] useSyncManager implementado y testeado
- [ ] useAuth para Supabase (si aplica)
- [ ] usePhotoUpload para Storage (si aplica)

### Tests
- [ ] Unit tests para cada store (>85% coverage)
- [ ] Integration tests para cross-slice communication
- [ ] Component tests para UI usando hooks

### Backend (Supabase)
- [ ] Supabase migrations: users, plants, tasks, photos
- [ ] /api/sync endpoint implementado y testado
- [ ] Auth middleware validando tokens

### Mobile
- [ ] Stores adaptados para AsyncStorage
- [ ] Hooks funcionan sin cambios
- [ ] Tests pasan para mobile

### Offline-First
- [ ] Online/offline indicator visible
- [ ] Queue persiste en storage
- [ ] Retry logic con backoff exponencial
- [ ] Rollback en caso de error

### Performance
- [ ] Memoización en getters (getTodayTasks, etc)
- [ ] No re-renders innecesarios (Zustand subscriptions ok)
- [ ] localStorage <5MB (monitorear)

---

## ESTIMADO DE TIEMPO

| Fase | Horas | Riesgo |
|------|-------|--------|
| 1. Setup | 8 | Bajo |
| 2. Hooks | 16 | Bajo |
| 3. Testing | 16 | Bajo |
| 4. Backend | 24 | Medio (API mocking) |
| 5. Offline | 8 | Bajo |
| 6. Mobile | 16 | Medio (AsyncStorage) |
| **TOTAL** | **88** | |

**Con team de 2:** 4-5 semanas
**Con team de 1:** 8-10 semanas

---

## REFERENCIAS

- [Zustand Docs](https://github.com/pmndrs/zustand)
- [Zustand Persist](https://github.com/pmndrs/zustand#async-actions)
- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/)

