# Zustand Architecture — Decisiones y Troubleshooting

Justificaciones de diseño y soluciones a problemas comunes.

---

## DECISIONES ARQUITECTÓNICAS

### 1. EVENT-DRIVEN vs DIRECT IMPORTS

**Decision:** Event-driven via hooks (useGameificationSync) en lugar de circular imports.

**Alternativas consideradas:**
1. **Direct imports:** `taskStore -> userStore` → Circular dependency ❌
2. **Middleware personalizado en Zustand** → Overkill, difícil testear
3. **Event bus global** → Ok, pero requiere boilerplate
4. **Custom hook que escucha ambos stores** ← **ELEGIDA**

**Por qué:**
- Sin circular dependencies
- Fácil testear aisladamente
- Fácil de debuggear (console.logs en un lugar)
- Patrón estándar en React (similar a useEffect)
- Funciona identicamente en web y mobile

**Código comparativa:**

```typescript
// ❌ MALO: Circular dependency
// taskStore.ts
import { useUserStore } from './userStore'
completeTask: (id) => {
  // ... mark complete ...
  useUserStore.getState().addXP(15) // ← CIRCULAR!
}

// ✅ BUENO: Event-driven
// hooks/useGameificationSync.ts
useEffect(() => {
  const completedNow = tasks.filter(t => t.completed && !processed.has(t.id))
  completedNow.forEach(task => {
    userStore.addXP(15)
  })
}, [tasks, userStore])
```

---

### 2. PERSISTENCIA: TODOS LOS CAMPOS vs SELECTIVOS

**Decision:** Cada store persiste SOLO lo que es critical con `partialize`.

**Alternativas:**
1. Persistir todo → localStorage inflado, lento
2. Persistir nada → pierde data en F5, peor UX
3. **Persistir selectivo con partialize** ← **ELEGIDA**

**Strategy:**

| Store | Persiste | No Persiste | Razón |
|-------|----------|-------------|-------|
| user | userId, email, name, XP, streak | loading, error | Data crítica vs runtime |
| plant | plants, selectedId | syncedIds | Array vs ephemeral tracking |
| task | tasks array | filter, loading | Array vs UI state |
| nutrition | customTables | loading, error | User creations vs runtime |
| sync | queue | isSyncing, lastSyncAt | Queue crítica vs transient |

**Ejemplo implementado:**

```typescript
{
  partialize: (state) => ({
    userId: state.userId,
    email: state.email,
    name: state.name,
    totalXP: state.totalXP,
    streak: state.streak,
    bestStreak: state.bestStreak,
    lastActivityDate: state.lastActivityDate,
    // NO persistir: loading, error, theme (se resetea cada sesión)
  }),
}
```

---

### 3. SYNC QUEUE: PERSIST ACTIONS vs PERSIST STATE

**Decision:** Persistir la **queue de acciones**, no el estado final.

**Alternativas:**
1. Persistir estado completo → Difícil de sincronizar, puede divergir
2. **Persistir queue de acciones** ← **ELEGIDA**
3. Usar SQLite local (overkill para MVP)

**Por qué:**
- La verdad está en la queue
- Al sincronizar, replicas las acciones en Supabase
- Si hay conflicto, aplicas replay
- Más robusto que "último estado gana"

**Ejemplo:**

```typescript
// Offline: usuario completa 3 tareas
syncStore.enqueueSyncAction({ type: 'task.complete', taskId: '1', ... })
syncStore.enqueueSyncAction({ type: 'task.complete', taskId: '2', ... })
syncStore.enqueueSyncAction({ type: 'task.complete', taskId: '3', ... })

// localStorage:
// { queue: [...3 actions...] }

// Cuando conecta:
// POST /api/sync { actions: [...] }
// Server aplica las 3 y confirma

// En caso de fallo de una:
// Rollback toda la batch O retry individual
```

---

### 4. CROSS-SLICE COMMUNICATION: PATRÓN ELEGIDO

**Decision:** Hook listeners (useGameificationSync) en lugar de pub/sub complejo.

**Comparison:**

```typescript
// ✅ Hook listeners (ELEGIDO)
function useGameificationSync() {
  const tasks = useTaskStore(s => s.tasks)
  const userStore = useUserStore()
  
  useEffect(() => {
    // detectar cambios, disparar XP
  }, [tasks, userStore])
}

// ❌ Pub/Sub global (overkill)
const eventBus = new EventEmitter()
eventBus.on('task.completed', (task) => {
  userStore.addXP(15)
})

// ✅ También ok, pero más boilerplate
// Solo si hay MUCHOS listeners (5+)
```

**Patrón:**
- <3 slices que interactúan: Hook listeners
- 3+ slices: Considerar event bus
- Ciclos complejos: Middleware personalizado (Zustand)

---

### 5. MOBILE: SAME STORES, DIFFERENT STORAGE

**Decision:** Factory pattern para compartir logic, inyectar storage adapter.

**Alternativas:**
1. Duplicar stores para web y mobile → DRY violation
2. **Factory pattern** ← **ELEGIDA**
3. Conditional imports (si web: localStorage; si mobile: AsyncStorage) → Confuso

**Implementación:**

```typescript
// shared/src/store/createUserStore.ts
export function createUserStore(storage: StorageAdapter) {
  return create<UserStore>()(
    persist((set, get) => ({
      // ... actions identical ...
    }), {
      name: 'cannatrack-user',
      storage, // ← inyectado
    })
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

### 6. ERROR HANDLING: OPTIMISTIC UPDATES + ROLLBACK

**Decision:** Optimistic update local, enqueue sync, retry si falla.

**Flujo:**

```typescript
// 1. Optimistic: marcar task como completada YA
taskStore.completeTask(id)

// 2. Enqueue: agregar a sync queue
syncStore.enqueueSyncAction({ type: 'task.complete', ... })

// 3. Si online, intenta sync
// 4. Si falla, queue persiste → reintentará en useSyncManager

// NO hacemos rollback a menos que error sea fatal
```

**Cuándo hacer rollback:**

```typescript
// Only if error is authoritative (401, 403, data constraint)
try {
  await syncStore.flushSyncQueue()
} catch (error) {
  if (error.status === 401) {
    // Auth error → rollback todo, fuerza re-login
    taskStore.updateTask(id, { completed: false })
  } else if (error.status === 400) {
    // Validation error → rollback individual action
    taskStore.updateTask(id, { completed: false })
  }
  // Otros errores (500, network) → queue persiste, reintenta
}
```

---

## TROUBLESHOOTING

### Issue 1: "useGameificationSync no se dispara"

**Síntomas:** Completo tarea, pero no suma XP.

**Causa probable:** Hook no está mounted en App root.

**Solución:**

```typescript
// ✅ Correcto
function App() {
  useGameificationSync() // ← DEBE estar aquí
  return <Routes>...</Routes>
}

// ❌ Incorrecto
export function TaskComponent() {
  useGameificationSync() // ← Muy profundo, puede no estar mounted
}
```

**Debug:**

```typescript
// Agrega console en el hook
export function useGameificationSync() {
  const tasks = useTaskStore(s => s.tasks)
  console.log('[Gamification Hook] tasks changed:', tasks.length)

  useEffect(() => {
    console.log('[Gamification Hook] running effect')
  }, [tasks])
}

// Verifica en DevTools: ¿ves los logs?
```

---

### Issue 2: "Storage persists incorrectly después de stringify"

**Síntomas:** Después de F5, las Dates son strings, no Date objects.

**Causa:** dateReviver no está en persist storage.

**Solución:**

```typescript
// ❌ Malo
persist((set, get) => ({...}), {
  storage: {
    getItem: (name) => {
      const str = localStorage.getItem(name)
      return str ? JSON.parse(str) : null // ← Sin reviver!
    },
    setItem: (name, value) => {
      localStorage.setItem(name, JSON.stringify(value))
    },
  }
})

// ✅ Correcto
persist((set, get) => ({...}), {
  storage: {
    getItem: (name) => {
      const str = localStorage.getItem(name)
      return str ? JSON.parse(str, dateReviver) : null // ← Reviver!
    },
    setItem: (name, value) => {
      localStorage.setItem(name, JSON.stringify(value, dateReplacer))
    },
  }
})
```

---

### Issue 3: "Sync queue crece sin límite"

**Síntomas:** localStorage incha (>5MB), app lenta.

**Causa:** flushSyncQueue no ejecuta (offline permanente? error silencioso?).

**Solución:**

```typescript
// 1. Monitorea queueSize en DevTools
const syncStore = useSyncStore.getState()
console.log('Queue size:', syncStore.getQueueSize())

// 2. Revisa lastSyncAt
console.log('Last sync:', syncStore.lastSyncAt)

// 3. Verifica connectionMonitor
console.log('Is online:', navigator.onLine)

// 4. Intenta flush manual
await syncStore.flushSyncQueue().catch(console.error)

// 5. Si persiste, limpia queue manual (último recurso)
useSyncStore.setState({ queue: [] })

// Para futura:
// - Agregar límite de queue (max 500 acciones)
// - Comprimir viejas acciones
// - Log a servidor si flush falla 10x
```

---

### Issue 4: "XP suma pero streak no actualiza"

**Síntomas:** addXP({ xpGained, streakBonus, newStreak }) retorna newStreak = 0.

**Causa:** lastActivityDate null o computeStreak lógica rota.

**Solución:**

```typescript
// En userStore.addXP:
addXP: (base) => {
  const { streak, lastActivityDate } = get()
  console.log('[addXP] before:', { streak, lastActivityDate })

  const { newStreak } = computeStreak(streak, lastActivityDate)
  console.log('[addXP] after computeStreak:', newStreak)

  set({
    streak: newStreak,
    lastActivityDate: new Date(),
  })

  console.log('[addXP] state updated:', {
    streak: newStreak,
    lastActivityDate: new Date(),
  })
}

// Verifica:
// 1. computeStreak retorna valor esperado?
// 2. set() se ejecuta?
// 3. Estado persiste después de F5?
```

---

### Issue 5: "Mobile: AsyncStorage no persiste"

**Síntomas:** Datos se pierden después de cerrar app.

**Causa:** AsyncStorage adapter tiene error, o no está configurado.

**Solución:**

```typescript
// 1. Verifica que AsyncStorage esté importado
import AsyncStorage from '@react-native-async-storage/async-storage'

// 2. Test el adapter aislado
const test = async () => {
  await AsyncStorage.setItem('test-key', 'test-value')
  const value = await AsyncStorage.getItem('test-key')
  console.log('Test:', value) // ¿'test-value'?
}

// 3. Si Zustand no persiste, verifica que el adapter sea async
const mobileStorageAdapter = {
  getItem: async (name) => { // ← async!
    const str = await AsyncStorage.getItem(name)
    return str ? JSON.parse(str) : null
  },
  setItem: async (name, value) => { // ← async!
    await AsyncStorage.setItem(name, JSON.stringify(value))
  },
  removeItem: async (name) => { // ← async!
    await AsyncStorage.removeItem(name)
  },
}

// 4. Verifica que persist() espere promises
// (Zustand 4+ soporta async storage natively)
```

---

### Issue 6: "Circular dependency warning"

**Síntomas:** `Module has circular dependency`

**Causa probable:** Importaste userStore en taskStore (o vice versa).

**Solución:**

```typescript
// ❌ En taskStore.ts
import { useUserStore } from './userStore' // ← Circular!

completeTask: (id) => {
  useUserStore.getState().addXP(15)
}

// ✅ Usa hook en App layer
// En App.tsx
useGameificationSync() // ← Hook maneja la cross-slice communication

// En taskStore.ts
completeTask: (id) => {
  // Solo actualiza tasks, NO importa userStore
}
```

---

### Issue 7: "App rerenderea infinitamente"

**Síntomas:** App freezes, CPU al 100%.

**Causa:** useEffect sin dependency array, o bad Zustand selector.

**Solución:**

```typescript
// ❌ Malo: rerender infinito
useEffect(() => {
  const allTasks = taskStore.tasks // ← referencia nueva cada render
  userStore.addXP(10)
}, [taskStore.tasks]) // ← taskStore objeto nuevo cada render

// ✅ Bueno: selector específico
const tasks = useTaskStore(s => s.tasks) // ← select solo tasks

useEffect(() => {
  // procesar tasks
}, [tasks]) // ← array específico

// ✅ Mejor: no necesites effect
const tasks = useTaskStore(s => s.tasks)
// Render usa tasks directamente
```

---

### Issue 8: "Tests fallan con 'state is not a function'"

**Síntomas:** Error en test de useGameificationSync.

**Causa:** No reseteas store state entre tests.

**Solución:**

```typescript
// ✅ En beforeEach
beforeEach(() => {
  useTaskStore.setState({
    tasks: [],
    filter: 'all',
    loading: false,
    error: null,
  })

  useUserStore.setState({
    totalXP: 0,
    streak: 0,
    bestStreak: 0,
    lastActivityDate: null,
  })

  useSyncStore.setState({
    queue: [],
    isSyncing: false,
    lastSyncAt: null,
    syncError: null,
  })
})

// O crea helper
function resetStores() {
  useTaskStore.setState({ tasks: [] })
  useUserStore.setState({ totalXP: 0 })
  useSyncStore.setState({ queue: [] })
}

beforeEach(() => resetStores())
```

---

## PERFORMANCE TIPS

### 1. Memoización de Getters

```typescript
// ❌ Recalcula every render
getTodayTasks: () => {
  return get().tasks.filter(t => /* expensive logic */)
}

// ✅ Memoiza con useMemo
const todayTasks = useMemo(() => {
  return taskStore.getTodayTasks()
}, [taskStore.tasks])
```

### 2. Zustand Selectors

```typescript
// ❌ Trae todo, rerender on any change
const state = useTaskStore()

// ✅ Trae solo lo que necesitas
const tasks = useTaskStore(s => s.tasks)
const filter = useTaskStore(s => s.filter)
```

### 3. Batched Updates

```typescript
// ❌ 3 renders
taskStore.updateTask(id1, { ... })
taskStore.updateTask(id2, { ... })
taskStore.updateTask(id3, { ... })

// ✅ 1 render
useTaskStore.setState((s) => ({
  tasks: s.tasks
    .map(t => t.id === id1 ? { ...t, ... } : t)
    .map(t => t.id === id2 ? { ...t, ... } : t)
    .map(t => t.id === id3 ? { ...t, ... } : t),
}))

// ✅ Mejor: helper batch
taskStore.updateTasks([
  { id: id1, changes: { ... } },
  { id: id2, changes: { ... } },
  { id: id3, changes: { ... } },
])
```

---

## ANTI-PATTERNS (NO HAGAS ESTO)

### 1. Importar Store en Otro Store

```typescript
// ❌ NEVER
// taskStore.ts
import { useUserStore } from './userStore'

completeTask: (id) => {
  useUserStore.getState().addXP(15) // ← Circular!
}
```

### 2. Usar Store Actions Sin Serialization

```typescript
// ❌ NEVER
syncStore.enqueueSyncAction({
  type: 'task.complete',
  callback: () => console.log('done'), // ← Functions no se serializan!
})
```

### 3. Persistir State Runtime

```typescript
// ❌ NEVER
persist((set, get) => ({...}), {
  partialize: (state) => ({
    ...state, // ← TODO, incluyendo loading, error
  }),
})

// ✅ Seleccionar critical
partialize: (state) => ({
  userId: state.userId,
  tasks: state.tasks,
  // NO: loading, error, isSyncing
})
```

### 4. No Testear Cross-Slice Communication

```typescript
// ❌ Test solo taskStore
test('completeTask marks as done', () => {
  taskStore.completeTask(id)
  expect(taskStore.tasks[0].completed).toBe(true) // ✓
  // Pero: ¿se agregó XP? No sabes!
})

// ✅ Test integration
test('completeTask triggers XP', () => {
  const beforeXP = userStore.totalXP
  taskStore.completeTask(id)
  // Simula hook
  useGameificationSync() // o manualmente addXP
  expect(userStore.totalXP).toBeGreaterThan(beforeXP)
})
```

---

## ROADMAP DE MEJORAS

### MVP (NOW)
- [x] Stores básicos funcionales
- [x] Persistencia localStorage
- [x] useGameificationSync hook
- [x] Unit tests

### Post-MVP (SEMANA 3)
- [ ] Supabase sync funcional
- [ ] Retry logic robusto
- [ ] Mobile stores (AsyncStorage)
- [ ] Integration tests completos

### Future (SEMANA 5+)
- [ ] Event bus si >5 slices
- [ ] Middleware personalizado para lógica compleja
- [ ] Offline-first con conflict resolution
- [ ] Time-travel debugging (Zustand devtools)

