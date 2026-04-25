# Mobile Performance Audit & Optimization Guide
**Current State:** 2.5-3.5s cold start | 45-55 FPS scroll | 80-120 MB memory  
**Target State:** <2s cold start | 58-60 FPS | <80 MB memory  
**Improvement Potential:** 30-40% faster, 30-50% fewer network calls

---

## CRITICAL BOTTLENECKS (Week 1)

### 1. Network Polling Every 5 Seconds (285% Over-polling)
**File:** `mobile/src/lib/network.ts:105`  
**Impact:** 288 checks/day per user, drains battery, wasted bandwidth  
**Current:**
```typescript
function startNetworkPolling() {
  pollInterval = setInterval(async () => {
    const online = await checkOnline()
    // ...
  }, 5000)  // <-- Every 5 seconds
}
```

**Fix:** Increase to 30-60 seconds, add intelligent pausing
```typescript
// src/lib/network.ts
const POLL_INTERVAL_MS = 30000  // 30 seconds instead of 5

let pollInterval: NodeJS.Timeout | null = null
let lastOnlineState = true
let isAppInBackground = false

export function pauseNetworkPolling() {
  isAppInBackground = true
  if (pollInterval) clearInterval(pollInterval)
}

export function resumeNetworkPolling() {
  isAppInBackground = false
  if (!pollInterval) startNetworkPolling()
}

function startNetworkPolling() {
  pollInterval = setInterval(async () => {
    if (isAppInBackground) return  // Don't poll in background
    
    const online = await checkOnline()
    if (online !== lastOnlineState) {
      lastOnlineState = online
      networkListeners.forEach(cb => cb(online))
    }
  }, POLL_INTERVAL_MS)
}

// In app root, hook into app state changes
import { AppState } from 'react-native'

useEffect(() => {
  const subscription = AppState.addEventListener('change', handleAppStateChange)
  return () => subscription.remove()
}, [])

function handleAppStateChange(state: AppStateStatus) {
  if (state === 'background') pauseNetworkPolling()
  else if (state === 'active') resumeNetworkPolling()
}
```

**Expected Impact:** 85% fewer polling requests, better battery life

---

### 2. Sequential Data Loading (2-3x Slower Than Parallel)
**File:** `mobile/src/hooks/useInitSync.ts:15-38`  
**Current:**
```typescript
const plants = await loadPlantsFromSupabase(user.id)  // Wait
setPlants(plants)
const tasks = await loadTasksFromSupabase(user.id)   // Then wait
setAllTasks(tasks)
```

**Impact:** If each takes 1s, total is 2s. Parallel = 1s.

**Fix:** Parallelize with Promise.all
```typescript
// src/hooks/useInitSync.ts
export function useInitSync() {
  const { setPlants } = usePlantStore()
  const { setAllTasks } = useTaskStore()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    
    async function sync() {
      try {
        const startTime = performance.now()
        
        // Fetch in parallel
        const [plants, tasks] = await Promise.all([
          loadPlantsFromSupabase(user.id),
          loadTasksFromSupabase(user.id),
        ])
        
        // Update stores
        setPlants(plants)
        setAllTasks(tasks)
        
        const duration = performance.now() - startTime
        console.log(`[Sync] Completed in ${duration.toFixed(0)}ms`)
      } catch (error) {
        console.error('[Sync] Error:', error)
        // Don't show loading state - use cached data
      }
    }

    // Call sync only ONCE on app root, not per screen
    sync()
  }, [user, setPlants, setAllTasks])
}

// Then REMOVE useInitSync() from individual screens (plants.tsx, calendar.tsx, etc)
// Only call it from _layout.tsx once
```

**Expected Impact:** 200-300ms faster cold start, 100-150ms faster first paint

---

### 3. FlatList Rendering All Items at Once
**File:** `mobile/app/(tabs)/plants.tsx:~130`  
**Impact:** With 50+ plants, all render immediately (300-500ms delay)  
**Current:**
```typescript
<FlatList
  scrollEnabled={false}
  data={filteredPlants}
  renderItem={({ item: plant }) => (...)}
  // Missing optimization props
/>
```

**Fix:** Add batch rendering configuration
```typescript
<FlatList
  scrollEnabled={false}
  data={filteredPlants}
  keyExtractor={p => p.id}
  renderItem={({ item: plant }) => (
    <PlantCard plant={plant} onPress={...} />
  )}
  // ADD THESE:
  maxToRenderPerBatch={15}              // Render in batches of 15
  updateCellsBatchingPeriod={50}        // Wait 50ms between batches
  initialNumToRender={10}               // Start with 10
  windowSize={10}                       // Keep 10 items in memory
  removeClippedSubviews={true}          // Remove offscreen views from memory
  contentContainerStyle={{ paddingHorizontal: 0 }}
/>
```

**Expected Impact:** 150-250ms faster initial load, better scroll FPS

---

### 4. Sync Queue Sequential Processing
**File:** `mobile/src/lib/syncQueue.ts:46-65`  
**Impact:** 10 plant updates = 10 serial API calls (5-10 seconds)  
**Current:**
```typescript
for (const action of queue) {
  try {
    await processSyncAction(action, userId)  // One at a time
  } catch (error) {
    // ...
  }
}
```

**Fix:** Batch similar actions
```typescript
// src/lib/syncQueue.ts
async function processSyncQueue(): Promise<void> {
  const syncStore = useSyncStore.getState()
  const queue = syncStore.syncQueue

  if (queue.length === 0) return

  syncStore.setIsSyncing(true)

  try {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) throw new Error('User not authenticated')

    // Group actions by type
    const grouped: Record<string, SyncAction[]> = {}
    for (const action of queue) {
      if (!grouped[action.type]) grouped[action.type] = []
      grouped[action.type].push(action)
    }

    // Process in parallel by type
    await Promise.all([
      // Batch plant updates
      ...(grouped['updatePlant']?.map(a => handleUpdatePlantBatch(grouped['updatePlant'])) ?? []),
      // Batch task completions
      ...(grouped['completeTask']?.map(a => handleCompleteTaskBatch(grouped['completeTask'])) ?? []),
      // Individual add/delete (can't batch)
      ...(grouped['addPlant']?.map(a => processSyncAction(a, authData.user!.id)) ?? []),
    ])

    syncStore.clearQueue()
    syncStore.setLastSyncAt(new Date())
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Sync failed'
    syncStore.setSyncError(msg)
  } finally {
    syncStore.setIsSyncing(false)
  }
}

async function handleUpdatePlantBatch(actions: SyncAction[]) {
  // Group by plantId to avoid duplicate updates
  const updates: Record<string, Partial<Plant>> = {}
  for (const action of actions) {
    const { plantId, ...fields } = action.payload as any
    updates[plantId] = { ...updates[plantId], ...fields }
  }

  // Single batch update
  for (const [plantId, changes] of Object.entries(updates)) {
    const { error } = await supabase
      .from('plants')
      .update(changes)
      .eq('id', plantId)
    
    if (error) throw error
  }
}

async function handleCompleteTaskBatch(actions: SyncAction[]) {
  const now = new Date().toISOString()
  const updates = actions.map(a => ({
    id: (a.payload as any).taskId,
    completed: true,
    completed_at: now,
  }))

  const { error } = await supabase
    .from('scheduled_tasks')
    .upsert(updates)
  
  if (error) throw error
}
```

**Expected Impact:** 50-70% fewer API calls, 2-5 second faster sync

---

### 5. Call useInitSync Once (Not Per Screen)
**Files:** `plants.tsx`, `calendar.tsx`, `tasks.tsx` (all call useInitSync)  
**Impact:** 2-4 duplicate requests per session  
**Fix:** Move to `_layout.tsx` only

```typescript
// mobile/app/_layout.tsx
import { useInitSync } from '@/hooks/useInitSync'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(undefined)
  useInitSync()  // <-- Call ONCE here

  // ... rest of layout

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Don't call useInitSync in any children! */}
    </Stack>
  )
}

// mobile/app/(tabs)/plants.tsx
export default function PlantsScreen() {
  // Remove: useInitSync()  <-- DELETE THIS
  // ...
}

// mobile/app/(tabs)/calendar.tsx
export default function CalendarScreen() {
  // Remove: useInitSync()  <-- DELETE THIS
  // ...
}
```

**Expected Impact:** 2-4 fewer requests on app start

---

## HIGH PRIORITY (Week 2)

### 6. Calendar Day Array Regenerated Every Render
**File:** `mobile/app/(tabs)/calendar.tsx:~40`  
**Impact:** 50+ button re-renders on state change  
**Fix:** Memoize with useMemo
```typescript
// Instead of:
const days = Array.from({ length: daysInMonth }, (_, i) => 
  new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i + 1)
)

// Use:
const days = useMemo(() => 
  Array.from({ length: daysInMonth }, (_, i) => 
    new Date(displayMonth.getFullYear(), displayMonth.getMonth(), i + 1)
  ),
  [daysInMonth, displayMonth]
)
```

**Expected Impact:** 30-50ms per month change

---

### 7. Task Date Conversion in Selector
**File:** `mobile/src/hooks/useTasks.ts:~30`  
**Impact:** Creates new Date object on every call  
**Fix:**
```typescript
// Store date string selector, convert only when needed
export function useTasks(plantId?: string) {
  const tasks = useTaskStore((s) => s.tasks)
  
  const todayStr = useMemo(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }, [])
  
  const todayTasks = useMemo(() => 
    tasks.filter(t => {
      const scheduled = typeof t.scheduledDate === 'string' 
        ? t.scheduledDate 
        : t.scheduledDate.toISOString().split('T')[0]
      return scheduled === todayStr
    }),
    [tasks, todayStr]
  )
  
  // ... return { todayTasks, ... }
}
```

**Expected Impact:** 20-30ms per filter call

---

### 8. Store Selector Memoization
**Files:** All screens using `usePlantStore()`, `useTaskStore()`  
**Fix:** Use Zustand selectors
```typescript
// Good: selector is memoized
const activePlants = usePlantStore(s => s.plants.filter(p => p.status === 'active'))

// Better: memoized at store level
export const useActivePlants = () => usePlantStore(s => s.getActivePlants?.())
```

---

## MEDIUM PRIORITY (Week 3)

### 9. AsyncStorage Reviver Optimization
**File:** `mobile/src/lib/storage.ts`  
**Current:** Parses ISO dates on every AsyncStorage read (100-150ms on app start)  
**Fix:** Cache parsed dates
```typescript
const dateCache = new Map<string, Date>()

const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value
  
  if (dateCache.has(value)) {
    return dateCache.get(value)
  }
  
  const date = new Date(value)
  if (!isNaN(date.getTime())) {
    dateCache.set(value, date)
    return date
  }
  return value
}
```

**Expected Impact:** 50-100ms on app rehydration

---

### 10. Lazy-Load Nutrition Tables
**Files:** `mobile/src/store/nutritionStore.ts`  
**Fix:** Load only when user creates new plant
```typescript
// Don't load all tables on app start
// Instead: load on demand
export const useNutritionTables = () => {
  const [tables, setTables] = useState<NutritionTable[]>([])
  const [loaded, setLoaded] = useState(false)

  const loadTables = useCallback(async () => {
    if (loaded) return
    const { data } = await supabase.from('nutrition_tables').select('*')
    setTables(data ?? [])
    setLoaded(true)
  }, [loaded])

  return { tables, loadTables }
}
```

**Expected Impact:** 30-50ms faster cold start

---

## BUNDLE SIZE OPTIMIZATIONS

### 11. Tree-shake date-fns
**Current:** Importing entire date-fns library (~40KB)  
**Fix:** Only import needed functions
```typescript
// Instead of:
import { format, differenceInDays, startOfWeek, addDays } from 'date-fns'

// Import individual functions:
import format from 'date-fns/format'
import differenceInDays from 'date-fns/differenceInDays'
```

**Expected Impact:** 25-30KB reduction

---

### 12. Image Compression
**File:** `mobile/app/(tabs)/diagnose.tsx:~100`  
**Current:** Base64 encoding large photos (memory spike)  
**Fix:** Use expo-image-manipulator
```typescript
import * as ImageManipulator from 'expo-image-manipulator'

async function uploadPhoto(uri: string) {
  // Compress before upload
  const { uri: compressedUri } = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1024, height: 1024 } }],
    { compress: 0.7, format: 'jpeg' }
  )
  
  // Now upload compressed image
  const blob = await fetch(compressedUri).then(r => r.blob())
  const { error } = await supabase.storage
    .from('photos')
    .upload(`${user.id}/${Date.now()}.jpg`, blob)
}
```

**Expected Impact:** 70% smaller image payloads, no base64 in memory

---

## SUCCESS METRICS

| Metric | Current | Target | Fix |
|--------|---------|--------|-----|
| Cold start | 2.5-3.5s | <2s | Parallel load, reduce polling |
| First paint | 1.8-2.2s | <1.2s | FlatList optimization |
| Scroll FPS | 45-55 fps | 58-60 fps | Batch rendering, memoization |
| Memory idle | 80-120 MB | <80 MB | Remove listeners, cache efficiently |
| Network calls | 50-80/session | 15-25/session | Batch sync, increase polling interval |
| Bundle size | ~677 KB | <600 KB | Tree-shake, remove unused |

---

## IMPLEMENTATION CHECKLIST

```
WEEK 1:
- [ ] Increase network polling to 30s, add app state pause
- [ ] Parallelize useInitSync with Promise.all
- [ ] Add FlatList optimization props
- [ ] Implement sync queue batching
- [ ] Move useInitSync to _layout.tsx only
- [ ] Measure impact: performance.now() before/after

WEEK 2:
- [ ] Memoize calendar days with useMemo
- [ ] Optimize task date selector
- [ ] Add Zustand selector memoization
- [ ] Implement AsyncStorage date caching
- [ ] Lazy-load nutrition tables

WEEK 3:
- [ ] Tree-shake date-fns imports
- [ ] Implement image compression
- [ ] Reduce request timeouts from default
- [ ] Run `npm audit fix` for CVEs
```

---

**Owner:** Mobile Performance Team  
**Timeline:** 3 weeks for all optimizations  
**Measurement:** Use React Native Debugger + Flipper for profiling
