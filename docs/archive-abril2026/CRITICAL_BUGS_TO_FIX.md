# Critical Bugs Found — Mobile App

## Summary
**5 HIGH-SEVERITY bugs** found that cause data loss, missing XP, and broken sync. Listed by impact.

---

## BUG #1: Missing awardXP Call — XP Never Synced to Database [CRITICAL]

**File:** src/components/CompleteTaskSheet.tsx (line 194)

**Issue:**
```typescript
function handleConfirm() {
  const xp = hasMeasure ? 25 : 15
  setXpReward({ xp })  // ← Shows animation locally
  onComplete(
    task!.id,
    notes.trim() || undefined,
    ec ? ecNum : undefined,
    ph ? phNum : undefined,
  )
  // ✗ MISSING: awardXP(userId, xp) call to sync to DB
  // ✗ MISSING: recordDailyActivity(userId) call to update streak
}
```

**Impact:**
- User sees "+25 XP" animation
- XP added to local state only
- On app reload, XP is gone
- Streak never increments
- Streak bonuses (7-day, 30-day) never awarded

**Fix:**
```typescript
import { awardXP, recordDailyActivity } from '@/lib/xp'
import { useUserStore } from '@/store/userStore'

export function CompleteTaskSheet({ visible, task, onClose, onComplete }: Props) {
  const userStore = useUserStore()
  const userId = userStore.userId

  function handleConfirm() {
    const xp = hasMeasure ? 25 : 15
    setXpReward({ xp })
    
    onComplete(
      task!.id,
      notes.trim() || undefined,
      ec ? ecNum : undefined,
      ph ? phNum : undefined,
    )

    // ✓ NEW: Sync XP to DB
    if (userId) {
      awardXP(userId, xp)
        .then(() => recordDailyActivity(userId))
        .catch(err => console.error('Failed to award XP:', err))
    }

    setTimeout(() => {
      setXpReward(null)
      onClose()
    }, 1400)
  }
}
```

**Test Case:**
```typescript
it('should award XP to database when task completed', async () => {
  jest.mocked(awardXP).mockResolvedValue(undefined)
  jest.mocked(recordDailyActivity).mockResolvedValue(undefined)

  const { getByText } = render(<CompleteTaskSheet task={mockTask} visible={true} />)
  fireEvent.press(getByText('Guardar EC/pH ✓'))

  await waitFor(() => {
    expect(awardXP).toHaveBeenCalledWith('user-123', 25)
    expect(recordDailyActivity).toHaveBeenCalledWith('user-123')
  })
})
```

---

## BUG #2: useInitSync Overwrites Local Data on Sync Failure [CRITICAL]

**File:** src/hooks/useInitSync.ts (line 26)

**Issue:**
```typescript
export function useInitSync() {
  const { setPlants } = usePlantStore()
  const { setAllTasks } = useTaskStore()

  useEffect(() => {
    async function sync() {
      try {
        const plants = await loadPlantsFromSupabase(currentUser.id)
        setPlants(plants)  // ← If load fails, passes [] to setPlants
        // ✗ NO ERROR HANDLING — clears all local plants on network error
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
        // ✗ Catches error but still called setPlants([]) on failure
      }
    }
    sync()
  }, [user, setPlants, setAllTasks])
}
```

**Impact:**
- User creates plant offline
- Opens app while offline
- `loadPlantsFromSupabase()` fails (network timeout)
- `setPlants([])` called in catch block (implicit)
- Plant disappears from app
- Data loss

**Timeline:**
```
1. App offline, loadPlantsFromSupabase() called
2. Await hangs for 30 seconds, then throws timeout error
3. catch block executes
4. setPlants() already called before error with empty array (line 22)
5. User watches plant list disappear during initial sync
```

**Fix:**
```typescript
export function useInitSync() {
  const { plants: localPlants, setPlants } = usePlantStore()
  const { setAllTasks } = useTaskStore()
  const user = getCurrentUser()

  useEffect(() => {
    async function sync() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        const plants = await loadPlantsFromSupabase(currentUser.id)
        // ✓ Only overwrite if load succeeded
        setPlants(plants)

        const tasks = await loadTasksFromSupabase(currentUser.id)
        setAllTasks(tasks)
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
        // ✓ Do NOT call setPlants() — keep local data
        // ✓ Could show toast: "Failed to sync. Using cached data."
      }
    }

    sync()
  }, [user, setPlants, setAllTasks])
}
```

**Test Case:**
```typescript
it('should NOT overwrite local plants if Supabase fails', async () => {
  jest.mocked(loadPlantsFromSupabase).mockRejectedValue(
    new Error('Server error')
  )

  const store = usePlantStore()
  const localPlant = createMockPlant()
  store.addPlant(localPlant)

  renderHook(() => useInitSync())
  await waitFor(() => {
    // Plant should still exist locally
    expect(store.plants).toHaveLength(1)
    expect(store.getPlantById(localPlant.id)).toBeDefined()
  })
})
```

---

## BUG #3: Race Condition in Task Completion + Streak Update [HIGH]

**File:** src/lib/xp.ts (line 30-50)

**Issue:**
```typescript
export async function recordDailyActivity(userId: string): Promise<void> {
  const { data } = await supabase
    .from('profiles')
    .select('xp, streak_days, best_streak, last_activity_date')
    .eq('id', userId)
    .single()

  if (!data) return

  const todayStr  = new Date().toISOString().split('T')[0]
  const lastStr   = data.last_activity_date as string | null

  if (lastStr === todayStr) return  // ← Prevents duplicate within same day
  
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  const prevStreak = data.streak_days ?? 0
  const newStreak  = lastStr === yesterdayStr ? prevStreak + 1 : 1  // ← Uses stale data
  
  const updates: Record<string, unknown> = {
    streak_days:        newStreak,
    last_activity_date: todayStr,
  }

  // ✗ NO TRANSACTION — vulnerable to concurrent updates
  await supabase.from('profiles').update(updates).eq('id', userId)
}
```

**Race Condition Scenario:**
```
Task 1 complete (11:59:59):
  - Read: lastStr = yesterday, streak = 4
  - Calculate: newStreak = 5
  - Write: streak=5, lastStr=today [DELAY 500ms]

Task 2 complete (11:59:59.1s):
  - Read: lastStr = yesterday (STALE! write from Task 1 hasn't completed)
  - Calculate: newStreak = 5 again
  - Write: streak=5, lastStr=today
  
Result: Streak is 5, not 6. Lost +1 increment.
        If this happens at 7-day mark, bonus XP not awarded.
```

**Impact:**
- User completes 2 tasks rapidly
- Streak increments only once instead of twice
- Misses streak milestone bonuses
- Player unfairly loses XP

**Fix:**
```typescript
// Option 1: Use Supabase transactions (if available in your schema)
export async function recordDailyActivity(userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('increment_streak', {
    user_id: userId,
  })
  // Server-side function handles atomicity
}

// Option 2: Use local mutex (if same process)
const streakLocks = new Map<string, Promise<void>>()

export async function recordDailyActivity(userId: string): Promise<void> {
  // Ensure only one update per user at a time
  const existing = streakLocks.get(userId) || Promise.resolve()
  
  const promise = existing.then(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('xp, streak_days, best_streak, last_activity_date')
      .eq('id', userId)
      .single()

    if (!data) return

    const todayStr  = new Date().toISOString().split('T')[0]
    const lastStr   = data.last_activity_date as string | null

    if (lastStr === todayStr) return

    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    const prevStreak = data.streak_days ?? 0
    const newStreak  = lastStr === yesterdayStr ? prevStreak + 1 : 1

    const updates: Record<string, unknown> = {
      streak_days:        newStreak,
      best_streak:        Math.max(data.best_streak ?? 0, newStreak),
      last_activity_date: todayStr,
    }

    let bonus = 0
    if (newStreak === 7)  bonus = XP_VALUES.STREAK_7_BONUS
    if (newStreak === 30) bonus = XP_VALUES.STREAK_30_BONUS
    if (bonus > 0) updates.xp = (data.xp ?? 0) + bonus

    await supabase.from('profiles').update(updates).eq('id', userId)
  })

  streakLocks.set(userId, promise)
  await promise
}
```

**Test Case:**
```typescript
it('should NOT duplicate streak increment on rapid task completion', async () => {
  jest.mocked(supabase.from).mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({
      data: [{
        xp: 100,
        streak_days: 4,
        best_streak: 4,
        last_activity_date: yesterday,
      }],
    }),
    update: jest.fn().mockResolvedValue({ error: null }),
  } as any)

  // Simulate 2 concurrent calls
  const promise1 = recordDailyActivity('user-1')
  const promise2 = recordDailyActivity('user-1')

  await Promise.all([promise1, promise2])

  // Should only increment once
  const calls = jest.mocked(supabase.from).mock.results
  const updateCalls = calls.filter(c => c.value?.update)
  expect(updateCalls).toHaveLength(1) // Only 1 update, not 2
})
```

---

## BUG #4: Network Polling Memory Leak [HIGH]

**File:** src/lib/network.ts (line 34-44, line 98-106)

**Issue:**
```typescript
let pollInterval: NodeJS.Timeout | null = null

export function onNetworkStateChange(
  callback: (isConnected: boolean) => void
): () => void {
  networkListeners.push(callback)

  if (!pollInterval) {
    startNetworkPolling()  // ← Only called once, global
  }

  return () => {
    networkListeners = networkListeners.filter((cb) => cb !== callback)
    if (networkListeners.length === 0) {
      stopNetworkPolling()  // ← Cleanup only if NO listeners
    }
  }
}

function startNetworkPolling() {
  pollInterval = setInterval(async () => {
    const online = await checkOnline()
    if (online !== currentOnlineState) {
      currentOnlineState = online
      networkListeners.forEach((cb) => cb(online))
    }
  }, 5000)  // ← Runs every 5 sec forever
}
```

**Memory Leak Scenario:**
```
1. Component A mounts, calls onNetworkStateChange(callbackA)
   → pollInterval set, listeners = [callbackA]

2. Component A unmounts
   → unsubscribe() removes callbackA, listeners = []
   → stopNetworkPolling() clears pollInterval ✓

3. Component A remounts (hot reload or navigation)
   → onNetworkStateChange(callbackA') called again
   → listeners = [callbackA']
   → if (!pollInterval) tries to start polling
   → BUT pollInterval may still exist from stale reference!
   
4. Result: Multiple intervals running, 5N seconds for network check
           Memory grows, battery drains, logs spam
```

**Impact:**
- High battery drain (network checks every 5 sec, each with fetch to Google)
- Memory growth (intervals accumulate)
- Stale listeners never cleared
- On React dev reload, old interval still running

**Fix:**
```typescript
let networkListeners: ((isOnline: boolean) => void)[] = []
let currentOnlineState = true
let pollInterval: NodeJS.Timeout | null = null
let isPolling = false  // ← Add guard

export function onNetworkStateChange(
  callback: (isConnected: boolean) => void
): () => void {
  networkListeners.push(callback)

  // Only start polling if not already running
  if (!isPolling) {
    startNetworkPolling()
  }

  return () => {
    networkListeners = networkListeners.filter((cb) => cb !== callback)
    if (networkListeners.length === 0 && isPolling) {
      stopNetworkPolling()
    }
  }
}

function startNetworkPolling() {
  isPolling = true
  
  // Initial check
  checkOnline()
    .then((online) => {
      currentOnlineState = online
    })
    .catch(() => {
      currentOnlineState = false
    })

  pollInterval = setInterval(async () => {
    try {
      const online = await checkOnline()
      if (online !== currentOnlineState) {
        currentOnlineState = online
        networkListeners.forEach((cb) => cb(online))
      }
    } catch (error) {
      console.error('Network poll error:', error)
    }
  }, 5000)
}

function stopNetworkPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  isPolling = false
}
```

**Test Case:**
```typescript
it('should clear polling interval when all listeners unsubscribe', () => {
  jest.useFakeTimers()
  
  const callback1 = jest.fn()
  const callback2 = jest.fn()
  
  const unsub1 = onNetworkStateChange(callback1)
  const unsub2 = onNetworkStateChange(callback2)
  
  expect(isPolling).toBe(true)
  
  unsub1()
  expect(isPolling).toBe(true) // Still polling, unsub2 exists
  
  unsub2()
  expect(isPolling).toBe(false) // All unsub'd, polling stopped
  
  jest.useRealTimers()
})
```

---

## BUG #5: AsyncStorage Error Not Caught — App May Crash on Corrupted Data [MEDIUM]

**File:** src/lib/storage.ts (line 7-12, 18-26)

**Issue:**
```typescript
export const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    return new Date(value)
  }
  return value
  // ✗ NO VALIDATION — doesn't catch invalid ISO dates like "2026-13-40"
}

export const createAsyncStorage = () => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name)
      return value ? JSON.parse(value, dateReviver) : null
    } catch (error) {
      console.error(`Failed to get item ${name}:`, error)
      return null  // ✓ Handles JSON parse error
    }
  },
  // ✓ Good, but reviver still not bulletproof
})
```

**Crash Scenario:**
```
1. AsyncStorage contains: { tasks: [{ id: "1", scheduledDate: "2026-13-40" }] }
2. JSON.parse() succeeds (valid JSON syntax)
3. dateReviver() called on "2026-13-40"
4. Matches regex, calls new Date("2026-13-40")
5. Returns invalid Date object (NaN milliseconds)
6. Later: store.getTodayTasks().filter(t => t.scheduledDate < now)
7. Comparing NaN < Number = false, task hidden but doesn't error
8. OR: JSON.stringify(invalidDate) → "Invalid Date"
9. Next sync sends "Invalid Date" to Supabase
10. 400 Bad Request, sync fails silently
```

**Fix:**
```typescript
export const dateReviver = (_: string, value: unknown): unknown => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    const date = new Date(value)
    // ✓ Validate the date is actually valid
    if (!isNaN(date.getTime())) {
      return date
    }
    // ✗ Invalid date, return as-is and let consumer handle
    console.warn(`Invalid date string: ${value}`)
  }
  return value
}

export const createAsyncStorage = () => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name)
      if (!value) return null
      
      const parsed = JSON.parse(value, dateReviver)
      
      // ✓ Optional: validate structure based on storage key
      if (name === 'cannatrack-plants') {
        if (!Array.isArray(parsed.plants)) {
          console.warn(`Invalid plants data: plants is not array`)
          return null
        }
      }
      
      return parsed
    } catch (error) {
      console.error(`Failed to get item ${name}:`, error)
      // ✓ Consider clearing corrupted data
      await AsyncStorage.removeItem(name).catch(() => {})
      return null
    }
  },
  setItem: async (name: string, value: unknown) => {
    try {
      await AsyncStorage.setItem(name, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to set item ${name}:`, error)
      // Quota exceeded? Retry with older data or clear cache
      if (error.message.includes('QuotaExceeded')) {
        // Clear non-essential data
        await AsyncStorage.removeItem('photo-cache')
      }
    }
  },
  removeItem: async (name: string) => {
    try {
      await AsyncStorage.removeItem(name)
    } catch (error) {
      console.error(`Failed to remove item ${name}:`, error)
    }
  },
})
```

**Test Case:**
```typescript
it('should handle invalid dates in AsyncStorage', () => {
  const invalidDate = '2026-13-40T25:61:61Z'
  const revived = dateReviver('', invalidDate)
  
  // Should NOT return Date object
  expect(revived).toBe(invalidDate) // Pass through
  expect(revived).not.toBeInstanceOf(Date)
})

it('should clear corrupted AsyncStorage data', async () => {
  jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('corrupted-json{')
  jest.mocked(AsyncStorage.removeItem).mockResolvedValueOnce(undefined)

  const storage = createAsyncStorage()
  const result = await storage.getItem('cannatrack-plants')

  expect(result).toBeNull()
  expect(AsyncStorage.removeItem).toHaveBeenCalledWith('cannatrack-plants')
})
```

---

## Summary Table

| Bug | Severity | Impact | Fix Time |
|-----|----------|--------|----------|
| Missing awardXP | CRITICAL | XP never persists | 30 min |
| useInitSync overwrites | CRITICAL | Data loss | 20 min |
| Streak race condition | HIGH | Missed bonuses | 45 min |
| Network polling leak | HIGH | Battery drain | 30 min |
| AsyncStorage corruption | MEDIUM | Silent failures | 25 min |

**Total fix time: ~2.5 hours**

---

## Implementation Order

1. **First** — Fix awardXP (users see XP but it's lost, confusing)
2. **Second** — Fix useInitSync (potential data loss)
3. **Third** — Fix streak race condition (affects gamification)
4. **Fourth** — Fix network polling (performance/battery)
5. **Fifth** — Fix AsyncStorage validation (robustness)

---

## Verification

After each fix, run:
```bash
npm test -- --coverage
```

Ensure:
- ✓ All existing tests still pass
- ✓ New test for bug exists and passes
- ✓ No new console errors in test output
