# Sync Layer — Quick Reference

Comandos, APIs y patrones más usados.

## Import Statements

```typescript
// Core
import { syncService } from '@/lib/sync/syncService'
import { useSync } from '@/hooks/useSync'
import { useSyncStore } from '@/store/syncStore'

// Network
import { isOnline, onOnline, onOffline } from '@/lib/network'

// Types
import type { SyncAction } from '@/store/syncStore'
import type { SyncActionType, SyncPayload } from '@/types/sync'

// UI
import { SyncStatus } from '@/components/sync/SyncStatus'
```

## Core APIs

### useSync() Hook

```typescript
const { sync, isSyncing, lastSync, syncError, pendingCount } = useSync()

// Trigger sync manually
await sync()

// State checks
if (isSyncing) { /* ... */ }
if (syncError) { console.error(syncError) }
if (pendingCount > 0) { /* offline data */ }
```

### useSyncStore() Store

```typescript
const store = useSyncStore.getState()

// Enqueue action
store.enqueueSyncAction({
  type: 'completeTask',
  payload: { id, completedAt, completionNotes }
})

// Clear queue (done by useSync automatically)
store.clearQueue()

// Set last sync time
store.setLastSyncAt(new Date())

// Get pending count
const count = store.getPendingActionsCount()
```

### Network Detection

```typescript
// Check online status
if (isOnline()) {
  // web only — synchronous
}

// Listen to online event
const cleanup = onOnline(() => {
  console.log('Back online!')
})

// Listen to offline event
const cleanup = onOffline(() => {
  console.log('Offline!')
})

// Remember to cleanup
cleanup()
```

## Common Patterns

### Pattern 1: Complete Task with Sync

```typescript
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'

export function TaskItem({ task }: Props) {
  const { completeTask } = useTaskStore()
  const { enqueueSyncAction } = useSyncStore()

  const handleComplete = () => {
    // Local
    completeTask(task.id, notes)

    // Queue for sync
    enqueueSyncAction({
      type: 'completeTask',
      payload: {
        id: task.id,
        completedAt: new Date(),
        completionNotes: notes,
      },
    })
  }

  return <button onClick={handleComplete}>Done</button>
}
```

### Pattern 2: Add Plant with Sync

```typescript
import { usePlantStore } from '@/store/plantStore'
import { useSyncStore } from '@/store/syncStore'
import { crypto } from 'expo-crypto' // or browser crypto

export function NewPlantForm() {
  const { addPlant } = usePlantStore()
  const { enqueueSyncAction } = useSyncStore()

  const handleSubmit = (formData: FormData) => {
    const newPlant = {
      id: crypto.randomUUID(),
      name: formData.name,
      genetics: formData.genetics,
      geneticType: formData.geneticType,
      location: formData.location,
      potCount: formData.potCount,
      nutritionTableId: formData.tableId,
      startDate: new Date(),
    }

    // Local
    addPlant(newPlant)

    // Queue
    enqueueSyncAction({
      type: 'addPlant',
      payload: newPlant,
    })

    navigate('/')
  }

  return <PlantForm onSubmit={handleSubmit} />
}
```

### Pattern 3: Show Sync Status

```typescript
import { SyncStatus } from '@/components/sync/SyncStatus'

export function Header() {
  return (
    <header className="flex items-center justify-between">
      <h1>CannaTrack</h1>
      <SyncStatus />
    </header>
  )
}
```

### Pattern 4: Custom Sync Status Display

```typescript
import { useSync } from '@/hooks/useSync'

export function CustomSyncIndicator() {
  const { isSyncing, syncError, pendingCount } = useSync()

  return (
    <div className="sync-indicator">
      {isSyncing && <span>Syncing...</span>}
      {syncError && <span className="error">{syncError}</span>}
      {pendingCount > 0 && <span>{pendingCount} pending</span>}
    </div>
  )
}
```

### Pattern 5: Offline Indicator

```typescript
import { useEffect, useState } from 'react'
import { onOnline, onOffline } from '@/lib/network'

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
  return <div className="offline-banner">You are offline</div>
}
```

## Action Types & Payloads

### addPlant

```typescript
enqueueSyncAction({
  type: 'addPlant',
  payload: {
    id: string,
    name: string,
    genetics: string,
    geneticType: 'feminized' | 'autoflower' | 'regular',
    location: 'indoor' | 'outdoor',
    potCount: number,
    nutritionTableId: string,
    startDate: Date | string,
  }
})
```

### updatePlant

```typescript
enqueueSyncAction({
  type: 'updatePlant',
  payload: {
    id: string,
    floraStartDate?: Date,
    status?: 'active' | 'harvested',
    // ... any other field
  }
})
```

### completeTask

```typescript
enqueueSyncAction({
  type: 'completeTask',
  payload: {
    id: string,
    completedAt: Date | string,
    completionNotes?: string,
  }
})
```

### addXP

```typescript
enqueueSyncAction({
  type: 'addXP',
  payload: {
    userId: string,
    amount: number,
    reason?: string,
  }
})
```

### uploadPhoto

```typescript
enqueueSyncAction({
  type: 'uploadPhoto',
  payload: {
    plantId: string,
    photoData: string, // URL or base64
    timestamp?: Date | string,
  }
})
```

## Debugging Commands

### Inspect Queue

```javascript
// Browser console
import { useSyncStore } from '@/store/syncStore'
useSyncStore.getState().syncQueue
```

### Get Store State

```javascript
import { useSyncStore } from '@/store/syncStore'
const state = useSyncStore.getState()
console.log('Queue:', state.syncQueue)
console.log('Last sync:', state.lastSyncAt)
console.log('Error:', state.syncError)
console.log('Syncing:', state.isSyncing)
```

### Force Sync

```javascript
import { useSync } from '@/hooks/useSync'
// En un component
const { sync } = useSync()
await sync() // Sync now
```

### Clear Queue (Development Only)

```javascript
import { useSyncStore } from '@/store/syncStore'
useSyncStore.getState().clearQueue()
```

### Check Online Status

```javascript
import { isOnline } from '@/lib/network'
console.log(isOnline()) // true/false
```

## localStorage Keys

```javascript
// Sync queue
localStorage.getItem('cannatrack-sync')

// Other stores (for reference)
localStorage.getItem('cannatrack-plants')
localStorage.getItem('cannatrack-tasks')
localStorage.getItem('cannatrack-measurements')
localStorage.getItem('cannatrack-user')
```

## Testing Offline/Online

### Chrome DevTools

```
1. F12 → Network tab
2. Check "Offline" checkbox
3. Perform actions
4. Uncheck "Offline"
5. Should auto-sync
```

### Expo Go (Mobile)

```
1. Airplane mode ON
2. Perform actions
3. Airplane mode OFF
4. Should auto-sync
```

## Files to Edit for Integration

```
Component                 What to add
─────────────────────────────────────────────────────
pages/NewPlant.tsx       enqueueSyncAction on submit
pages/PlantDetail.tsx    enqueueSyncAction on update
components/tasks/*       enqueueSyncAction on complete
pages/Home.tsx           <SyncStatus />
App.tsx                  useSync() call
```

## Performance Tips

1. **Batch actions** — Enqueue multiple, sync once
2. **Lazy sync** — Don't force sync, wait for online
3. **Error handling** — Show error, retry manually
4. **Optimistic updates** — Update local immediately
5. **Check online first** — Use `isOnline()` guard

## Common Issues

### Queue not persisting?
- Check localStorage enabled
- Check dateReviver is in storage config
- Check store name 'cannatrack-sync'

### Not syncing on reconnect?
- Check useSync() is called in component
- Check onOnline listener is registered
- Check supabase client available
- Check network.ts in lib/

### Conflicts not resolving?
- Check timestamps on actions
- Compare local vs remote timestamps
- Check winner logic (>= is local wins)

### Types not available?
- Import from `@/store/syncStore`
- Import from `@/types/sync`
- Check tsconfig paths

## Mobile Specific

### AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
// Stored in createAsyncStorage() adapter
```

### NetInfo
```typescript
import NetInfo from '@react-native-community/netinfo'
// Used in lib/network.ts
```

### Expo
```bash
expo install @react-native-community/netinfo
```

## TypeScript Strict Mode

All files use `strict: true`. Remember:
- No `any`
- Dates as Date, not string
- Exhaustive switch/if statements
- Handle all error cases

## Related Docs

- `frontend/src/lib/sync/README.md` — Technical details
- `frontend/src/lib/sync/FLOW.md` — Flow diagrams
- `SYNC_INTEGRATION.md` — Integration guide
- `SYNC_IMPLEMENTATION_SUMMARY.md` — Full summary

---

**Updated:** April 23, 2026
**Last modified by:** Claude
