# Sync Layer — Offline-First Synchronization

CannaTrack implementa un sistema de sincronización bidireccional offline-first que mantiene los datos consistentes entre cliente y servidor Supabase, incluso cuando el dispositivo está offline.

## Arquitectura

### Flujo de sincronización

```
User action (online/offline)
  ↓
Store acción local (inmediato)
Enqueue en syncQueue (localStorage/AsyncStorage)
  ↓
¿Online?
  ├─ NO → esperar online event
  └─ SÍ → dispara sync automáticamente
       ↓
     flushQueue() — envía pending a Supabase
       ├─ Retry exponencial en errores (1s, 2s, 4s)
       └─ Conflict resolution: gana timestamp más reciente
     pullRemote() — descarga cambios desde Supabase
       └─ Remote gana si es más reciente
     clearQueue() — limpia pendientes exitosos
```

## Componentes

### 1. SyncService (`src/lib/sync/syncService.ts`)

Lógica pura, sin dependencias de React. Contiene:
- `flushQueue()`: envía acciones pending a Supabase con retry
- `pullRemote()`: descarga cambios recientes
- `fullSync()`: sincronización completa (flush + pull)

Métodos privados por tipo de acción:
- `syncAddPlant()`
- `syncUpdatePlant()`
- `syncCompleteTask()`
- `syncAddXP()`
- `syncUploadPhoto()`

**Conflict Resolution**: Si timestamp_local >= timestamp_remote → local gana. Caso de empate → local (user intent wins).

### 2. SyncStore (`src/store/syncStore.ts`)

Zustand store con persistencia en localStorage/AsyncStorage:

```typescript
{
  syncQueue: SyncAction[]        // acciones pending
  isSyncing: boolean             // sync en progreso
  lastSyncAt: Date | null        // último sync exitoso
  syncError: string | null       // error del último intento

  enqueueSyncAction()            // añade acción a queue
  clearQueue()                   // limpia queue (tras sync exitoso)
  setIsSyncing()                 // actualiza estado
  setSyncError()                 // registra error
  setLastSyncAt()                // actualiza último sync
}
```

### 3. useSync Hook (`src/hooks/useSync.ts`)

React hook que coordina sincronización:

```typescript
const { sync, isSyncing, lastSync, syncError, pendingCount } = useSync()
```

Características:
- Auto-sync cuando navegador vuelve online
- Manejo de errores con retry exponencial
- Disponible en web y mobile (mismo código)

### 4. Network Detection (`src/lib/network.ts`)

Detectores de conectividad:
- `isOnline()`: boolean sincrónico (web: navigator.onLine)
- `onOnline(callback)`: listener cuando vuelve online
- `onOffline(callback)`: listener cuando se desconecta

**Mobile**: Usa `@react-native-community/netinfo` para detectar cambios.

## Flujo de una acción sincronizada

### 1. Usuario completa una tarea (offline)

```typescript
// En tu componente
const { completeTask } = useTaskStore()
completeTask(taskId, notes)

// Automáticamente se enqueues:
useSyncStore.enqueueSyncAction({
  type: 'completeTask',
  payload: { id: taskId, completedAt, completionNotes }
})
```

Resultado: Tarea completada inmediatamente en UI (optimistic update), enqueued en syncQueue, persistida en localStorage.

### 2. Dispositivo vuelve online

```
onOnline event dispara
  ↓
useSync().sync() llamado automáticamente
  ↓
flushQueue():
  POST /api/sync → Supabase
    ├─ RLS valida user_id
    ├─ 200 OK → remueve de queue
    ├─ 409 Conflict → resuelve con timestamps
    └─ 5xx → retry exponencial
  ↓
pullRemote():
  GET /api/data?since=lastSyncAt
    └─ Mergea cambios remotos si son más recientes
  ↓
clearQueue()
  ↓
lastSyncAt actualizado
```

## Tipos de SyncAction

```typescript
type SyncAction = {
  id: string          // único: ${Date.now()}-${random()}
  type: string        // ver lista abajo
  payload: Record     // datos según tipo
  timestamp: Date     // cuándo se creó la acción
}
```

Tipos soportados:
- `'addPlant'` — añadir nueva planta
- `'updatePlant'` — actualizar propiedades de planta
- `'completeTask'` — marcar tarea como completada
- `'addXP'` — registrar XP ganado
- `'uploadPhoto'` — subir foto a storage

## Conflict Resolution

Cuando un cambio local entra en conflicto con uno remoto:

1. Comparar `timestamp` local vs remoto
2. Si local.timestamp >= remote.timestamp → **usar local** (más reciente o simultáneo)
3. Si local.timestamp < remote.timestamp → **usar remote** (más reciente)

Lógica: El timestamp más reciente "gana". En empate (timestamp igual), local gana porque representa la intención del usuario en su dispositivo.

```typescript
function resolveConflict(local, remote): 'local' | 'remote' {
  if (!local.timestamp || !remote.timestamp) return 'local'
  return local.timestamp.getTime() >= remote.timestamp.getTime()
    ? 'local'
    : 'remote'
}
```

## Retry Exponencial

Ante error en sync:
- Intento 1: espera 1s (2^0)
- Intento 2: espera 2s (2^1)
- Intento 3: espera 4s (2^2)
- Si falla 3 veces: error persistente, usuario ve notificación

El sync se reintentar automáticamente cuando vuelve online.

## Integración con Stores

Cada store (plantStore, taskStore) ya tiene métodos para actualizar datos. SyncService llama a estos métodos tras sincronización exitosa:

```typescript
// En syncService.syncAddPlant()
const plantStore = usePlantStore.getState()
plantStore.updatePlant(localId, { id: serverId }) // mapear IDs

// En syncService.pullRemote()
const taskStore = useTaskStore.getState()
taskStore.updateTask(remoteTask.id, remoteTask) // mergear remote
```

## Uso en Componentes

### Ejemplo: Completar tarea

```typescript
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'

export function TaskItem({ task }) {
  const { completeTask } = useTaskStore()
  const { enqueueSyncAction } = useSyncStore()

  const handleComplete = () => {
    // 1. Actualizar store localmente (optimistic)
    completeTask(task.id, 'User notes')

    // 2. Enqueue para sync
    enqueueSyncAction({
      type: 'completeTask',
      payload: {
        id: task.id,
        completedAt: new Date(),
        completionNotes: 'User notes',
      },
    })
  }

  return (
    <button onClick={handleComplete}>
      Complete Task
    </button>
  )
}
```

### Ejemplo: Mostrar estado de sync

```typescript
import { SyncStatus } from '@/components/sync/SyncStatus'

export function Header() {
  return (
    <header>
      <h1>CannaTrack</h1>
      <SyncStatus /> {/* muestra pending count, último sync, errores */}
    </header>
  )
}
```

## Configuración Requerida

### Frontend (Vite/React)

1. Supabase client ya configurado (useSupabaseClient disponible)
2. Zustand stores en `/store/`
3. Hooks en `/hooks/`

### Mobile (Expo/React Native)

1. `@supabase/supabase-js` en dependencies
2. `@react-native-community/netinfo` para detectar conectividad
3. AsyncStorage para persistencia

Instalación:
```bash
npm install @react-native-community/netinfo
# o
expo install @react-native-community/netinfo
```

## Debugging

### Inspeccionar queue

```typescript
// En consola
import { useSyncStore } from '@/store/syncStore'
useSyncStore.getState().syncQueue
```

### Forzar sync manual

```typescript
import { useSync } from '@/hooks/useSync'

const { sync } = useSync()
sync() // sincronizar ahora
```

### Ver últimos errores

```typescript
const { syncError } = useSyncStore()
console.log(syncError) // último error
```

## Limitaciones Actuales

- Max 3 reintentos por acción (configurable en `withRetry()`)
- Timeout de reintento es fijo (1s/2s/4s)
- No hay queue de prioridades (FIFO)
- Conflict resolution es timestamp-only (no hay merge inteligente)

Mejoras futuras:
- Conflict resolution heurístico (mergear por campos)
- Persistencia de sync histórico
- Priorizar ciertas acciones
- Configurar timeouts
- Webhooks para notificar conflictos al usuario

## Testing

Ver `/src/lib/__tests__/` para tests de syncService.
