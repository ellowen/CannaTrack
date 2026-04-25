# Sync Layer Integration Guide

Guía paso a paso para integrar el sistema de sincronización offline-first en componentes y páginas existentes.

## 1. Preparación

### 1.1 App.tsx — Inicializar sync

Agregar el hook useSync en la raíz de la app:

```typescript
// App.tsx
import { useSync } from '@/hooks/useSync'
import { SyncStatus } from '@/components/sync/SyncStatus'

export default function App() {
  // ... existing code ...

  // Inicializar sync (automáticamente escucha online events)
  useSync()

  return (
    <AuthProvider>
      <header>
        <h1>CannaTrack</h1>
        <SyncStatus />  {/* Mostrar estado */}
      </header>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
```

### 1.2 Verificar AccurateLy que Supabase está configurado

El hook `useSupabaseClient()` debe estar disponible (viene de @supabase/auth-helpers-react):

```typescript
import { useSupabaseClient } from '@supabase/auth-helpers-react'
```

Si no está, seguir guía de setup en el archivo `.env`:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[public-key]
```

## 2. Enqueue Acciones

Para cada acción del usuario que deba sincronizarse, enqueue en syncStore.

### Ejemplo: Completar Tarea

**Antes** (sin sync):
```typescript
const { completeTask } = useTaskStore()
completeTask(taskId)
```

**Después** (con sync):
```typescript
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'

export function TaskItem({ task }) {
  const { completeTask } = useTaskStore()
  const { enqueueSyncAction } = useSyncStore()

  const handleComplete = () => {
    // 1. Actualizar store localmente (optimistic)
    completeTask(task.id, notes)

    // 2. Enqueue para sync
    enqueueSyncAction({
      type: 'completeTask',
      payload: {
        id: task.id,
        completedAt: new Date(),
        completionNotes: notes,
      },
    })
  }

  return <button onClick={handleComplete}>Complete</button>
}
```

### Ejemplo: Añadir Planta

**Antes**:
```typescript
const { addPlant } = usePlantStore()
const newPlant = { id: randomUUID(), name: 'Planta 1', ... }
addPlant(newPlant)
```

**Después**:
```typescript
const { addPlant } = usePlantStore()
const { enqueueSyncAction } = useSyncStore()

const newPlant = { id: randomUUID(), name: 'Planta 1', ... }
addPlant(newPlant)  // Local inmediatamente

enqueueSyncAction({
  type: 'addPlant',
  payload: newPlant,  // Se sinc al servidor después
})
```

### Ejemplo: Actualizar Planta

```typescript
const { updatePlant } = usePlantStore()
const { enqueueSyncAction } = useSyncStore()

const handleUpdatePlant = (changes: Partial<Plant>) => {
  updatePlant(plantId, changes)

  enqueueSyncAction({
    type: 'updatePlant',
    payload: { id: plantId, ...changes },
  })
}
```

## 3. Componentes Sync-Aware

### 3.1 Mostrar estado de sync (SyncStatus.tsx)

Ya existe en `/src/components/sync/SyncStatus.tsx`. Solo agregar a header o donde sea visible:

```typescript
import { SyncStatus } from '@/components/sync/SyncStatus'

export function Header() {
  return (
    <header className="flex justify-between items-center">
      <h1>CannaTrack</h1>
      <SyncStatus />
    </header>
  )
}
```

### 3.2 Crear componente custom con sync

```typescript
import { useSync } from '@/hooks/useSync'

export function MyComponent() {
  const { sync, isSyncing, syncError, pendingCount } = useSync()

  return (
    <div>
      <p>Pending: {pendingCount}</p>
      <p>Error: {syncError}</p>

      <button
        onClick={() => sync()}
        disabled={isSyncing}
      >
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>
    </div>
  )
}
```

## 4. Manejar Offline

### 4.1 Mostrar notificación si offline

```typescript
import { useEffect, useState } from 'react'
import { onOffline, onOnline } from '@/lib/network'

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const cleanupOff = onOffline(() => setOffline(true))
    const cleanupOn = onOnline(() => setOffline(false))

    return () => {
      cleanupOff()
      cleanupOn()
    }
  }, [])

  if (!offline) return null

  return (
    <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded">
      No internet connection. Changes will sync when you're back online.
    </div>
  )
}
```

### 4.2 Desactivar botones online-only

```typescript
import { useOnlineStatus } from '@/hooks/useOnlineStatus' // crear si no existe

export function SyncButton() {
  const isOnline = useOnlineStatus()
  const { sync, isSyncing } = useSync()

  return (
    <button
      onClick={() => sync()}
      disabled={!isOnline || isSyncing}
      title={!isOnline ? 'You are offline' : ''}
    >
      {isSyncing ? 'Syncing...' : 'Sync Now'}
    </button>
  )
}
```

Para esto, crear el hook:

```typescript
// src/hooks/useOnlineStatus.ts
import { useEffect, useState } from 'react'
import { isOnline, onOnline, onOffline } from '@/lib/network'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => isOnline())

  useEffect(() => {
    const cleanupOn = onOnline(() => setOnline(true))
    const cleanupOff = onOffline(() => setOnline(false))

    return () => {
      cleanupOn()
      cleanupOff()
    }
  }, [])

  return online
}
```

## 5. Testing Manual

### 5.1 Simular offline en DevTools

Chrome DevTools → Network → Offline

```
1. Completar una tarea mientras offline
2. Abrir DevTools Network → marcar Offline
3. Ver que se enqueues en syncStore
4. Volver online (desmarcar Offline)
5. Ver que sync se ejecuta automáticamente
6. Verificar que queue se limpia en localStorage
```

### 5.2 Inspeccionar queue en consola

```javascript
// En console
import { useSyncStore } from '@/store/syncStore'
useSyncStore.getState().syncQueue
// Ver acciones pending
```

### 5.3 Simular conflict

1. Completar tarea en device A → offline
2. Completar MISMA tarea en device B → online
3. Volver device A online
4. Ver que conflict se resuelve correctamente

## 6. Debugging

### 6.1 Verificar sync en logs

```typescript
// En consola browser o terminal mobile
import { useSyncStore } from '@/store/syncStore'

const store = useSyncStore.getState()
console.log('Pending actions:', store.syncQueue)
console.log('Last sync:', store.lastSyncAt)
console.log('Error:', store.syncError)
console.log('Syncing:', store.isSyncing)
```

### 6.2 Forzar sync

```javascript
import { useSync } from '@/hooks/useSync'

const { sync } = useSync()
await sync()  // Sincronizar ahora (si online)
```

## 7. Integración por Página

### Pages/NewPlant.tsx

```typescript
import { usePlantStore } from '@/store/plantStore'
import { useSyncStore } from '@/store/syncStore'

export function NewPlant() {
  const { addPlant } = usePlantStore()
  const { enqueueSyncAction } = useSyncStore()

  const handleSubmit = (plant: Plant) => {
    // Generar ID localmente
    const newPlant = { ...plant, id: crypto.randomUUID() }

    // Añadir a store
    addPlant(newPlant)

    // Enqueue para sync
    enqueueSyncAction({
      type: 'addPlant',
      payload: newPlant,
    })

    // Navegar
    navigate('/')
  }

  return (
    <PlantForm onSubmit={handleSubmit} />
  )
}
```

### Pages/PlantDetail.tsx

```typescript
import { usePlantStore } from '@/store/plantStore'
import { useSyncStore } from '@/store/syncStore'
import { SyncStatus } from '@/components/sync/SyncStatus'

export function PlantDetail() {
  const { updatePlant } = usePlantStore()
  const { enqueueSyncAction } = useSyncStore()
  const plant = usePlantStore(s => s.getPlantById(plantId))

  const handleStartFlowering = () => {
    const floraStartDate = new Date()

    updatePlant(plantId, { floraStartDate })

    enqueueSyncAction({
      type: 'updatePlant',
      payload: {
        id: plantId,
        floraStartDate,
      },
    })
  }

  return (
    <div>
      <SyncStatus />
      <PlantCard plant={plant} />
      <button onClick={handleStartFlowering}>
        Start Flowering
      </button>
    </div>
  )
}
```

## 8. Próximos Pasos

Una vez integrado sync:

1. [ ] Test offline/online transitions manualmente
2. [ ] Configurar Supabase RLS (row level security) para validar user_id
3. [ ] Crear migrations SQL para tablas (plants, tasks, measurements)
4. [ ] Implementar endpoint /api/sync en backend (Supabase functions)
5. [ ] Agregar logging para monitorear sync failures en producción
6. [ ] Expandir conflict resolution a más campos
7. [ ] Agregar compression para queue si crece mucho
8. [ ] Mobile: testar con Expo Go

## Checklist de Completitud

- [ ] App.tsx inicializa useSync()
- [ ] SyncStatus mostrado en header
- [ ] Todas las acciones usuario enqueue correctamente
- [ ] localStorage persiste syncQueue
- [ ] Offline mode funciona
- [ ] Online reconexión dispara sync automático
- [ ] Conflict resolution funciona
- [ ] Errores se muestran al usuario
- [ ] Mobile tiene @react-native-community/netinfo
- [ ] Tests para syncService pasan
