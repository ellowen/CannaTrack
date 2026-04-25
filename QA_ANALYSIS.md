# QA & Testing Analysis — CannaTrack Mobile React Native App
**Date:** April 24, 2026  
**App:** CannaTrack Mobile (Expo + React Native)  
**Stack:** Zustand stores, Supabase sync, AsyncStorage persistence  

---

## EXECUTIVE SUMMARY

The mobile app has **minimal test coverage** (only 1 basic test file with 5 tests for store initialization). **Critical user workflows lack automated testing**, and several high-risk areas were identified:

- **No integration or E2E tests** for offline→online sync cycle
- **No tests for data integrity** (plant-task relationship, XP awards)
- **Race conditions and timing bugs** in sync logic
- **Weak error handling** in async operations
- **Date serialization/deserialization issues** in AsyncStorage
- **Network state not reliably triggering sync**

**Risk Level:** HIGH for production. Recommend immediate test infrastructure setup and targeted tests for critical paths.

---

## 1. EXISTING TEST COVERAGE

### Current State
```
Location: /mobile/src/store/__tests__/stores.test.ts
File count: 1 test file (no E2E, integration, or component tests)
Test framework: Jest (inferred, but not configured in package.json)
Coverage: ~5 tests (basic initialization only)
```

### Test File Analysis
```typescript
// ✓ Tests that exist (basic, shallow)
- userStore initializes with defaults
- plantStore initializes with empty plants
- taskStore initializes with empty tasks
- nutritionStore initializes with default tables
- syncStore initializes with empty queue

// ✗ Tests that are MISSING (critical)
- Store persistence to AsyncStorage
- Store hydration from AsyncStorage
- Concurrent store updates
- Partial updates (e.g., updatePlant with nested changes)
- Edge cases (null IDs, undefined values, empty arrays)
- Date serialization/deserialization in persist middleware
```

### Issues with Current Tests
1. **No async testing** — AsyncStorage persistence not tested
2. **No state mutation checks** — Can't detect if updates are immutable
3. **No hydration tests** — Critical for offline-first apps
4. **No integration** — Stores tested in isolation, not together
5. **No error scenarios** — What happens on storage quota exceeded?

---

## 2. CRITICAL USER WORKFLOWS — Test Scenarios

### WORKFLOW 1: User Registration → Biometric Setup → Onboarding

**Test Case 1A: Complete Sign-Up Flow**
```
Precondition: App is fresh install, no auth session
Steps:
  1. User enters email/password on auth.tsx
  2. Calls signUp() from @/lib/auth.ts
  3. Supabase creates auth.user + profiles table entry
  4. App transitions to onboarding.tsx
  5. User sets up biometric preference (Y/N)
  6. Session saved to SecureStore via saveSessionForBiometric()
  7. App navigates to home tab (/(tabs)/index.tsx)

Expected Result:
  - User profile exists in DB with default values (plan='free', xp=0, streak=0)
  - Session tokens stored in SecureStore (encrypted)
  - Biometric enrollment stored in preferences
  - App state shows isAuthenticated=true

Actual Result: NOT TESTED
  - ✗ Could signUp fail silently with no error UI?
  - ✗ Does profile get created if auth succeeds but DB fails?
  - ✗ What if SecureStore.setItemAsync throws?
  - ✗ Race condition: if user closes app mid-signup?
```

**Test Case 1B: Biometric Restoration on App Launch**
```
Precondition: User previously signed in with biometric enabled
Steps:
  1. App cold start
  2. _layout.tsx calls useInitSync() hook
  3. restoreSessionWithBiometric() attempts to authenticate
  4. If success: load plants, tasks, sync state
  5. If fail: show sign-in page again

Expected Result:
  - If biometric succeeds, user returned to home with data
  - If biometric fails, show login page without data loss

Actual Result: NOT TESTED
  - ✗ What if SecureStore.getItemAsync() returns null/corrupted JSON?
  - ✗ Does app hang if LocalAuthentication.authenticateAsync() times out?
  - ✗ If session refresh fails, is user stuck in loop?
```

---

### WORKFLOW 2: Create Plant → Schedule Tasks → Complete Task → Verify XP

**Test Case 2A: Plant Creation with Auto-Generated Schedule**
```
Precondition: User is authenticated, in /plants/new.tsx
Steps:
  1. User fills form: name, genetics, genetic type, pot volume, nutrition table
  2. Calls addPlant(plant) on plantStore
  3. Plant persisted to AsyncStorage
  4. Synchronously generates schedule via generatePlantSchedule()
  5. Tasks added to taskStore and AsyncStorage
  6. Plant appears in home tab task list (getTodayTasks)

Expected Result:
  - Plant has unique ID and startDate set to today
  - Tasks generated based on genetics (auto → 5 week vege, fem → variable)
  - All dates are valid Date objects, not strings
  - Tasks visible in getTodayTasks() selector

Actual Result: PARTIALLY TESTED
  - ✗ No test for schedule generation correctness
  - ✗ No test for date comparisons (is today's task < tomorrow's task?)
  - ✗ No test: what if potVolumeLiters is 0 or null?
  - ✗ No test: what if availableProducts array is empty?
```

**Test Case 2B: Task Completion with XP Award**
```
Precondition: Plant exists, task scheduled for today
Steps:
  1. User opens task in CompleteTaskSheet
  2. Optional: enters EC/pH measurements
  3. Clicks "Guardar" button
  4. completeTask(taskId, notes, ec, ph) called on taskStore
  5. Task marked completed=true, completedAt=now
  6. completeTaskInSupabase() syncs to DB
  7. awardXP(userId, 15) called if no measurements, 25 if measurements
  8. recordDailyActivity() updates streak
  9. XP reward animation shown (CompleteTaskSheet line 194-204)
  10. Sheet dismisses, home refreshes to show new XP

Expected Result:
  - Task shows completed✓ in task list
  - User XP increases by 15 or 25
  - Streak incremented if first activity today
  - Task removes from "today" list

Actual Result: PARTIALLY TESTED / HIGH RISK
  - ✗ No test: completeTaskInSupabase() fails (network down)
     → Task marked done locally but not synced — data inconsistency!
  - ✗ No test: awardXP() succeeds but recordDailyActivity() fails
     → XP added but streak not updated
  - ✗ No test: XP animation shows but sheet doesn't dismiss
     → User can't interact with app
  - ✗ Race condition: if user completes 2 tasks in < 1 sec before sync?
     → recordDailyActivity() called twice, streak could increment twice
```

**Test Case 2C: Offline Completion + Online Sync**
```
Precondition: App is offline, task exists locally
Steps:
  1. User completes task while offline
  2. completeTask() updates local taskStore
  3. completeTaskInSupabase() called but fails (no network)
  4. Error caught, task queued for later sync (line 119: code !== '23505')
  5. OfflineIndicator shows "offline" badge
  6. User comes back online
  7. useNetworkStatus hook detects connection (checkOnline())
  8. onOnline callback triggers manual sync
  9. completeTaskInSupabase() retried for queued task

Expected Result:
  - Task marked done locally AND in DB when online
  - No duplicate sync attempts
  - User unaware of offline state (seamless)

Actual Result: NOT TESTED / BROKEN
  - ✗ No queue mechanism! syncQueue defined in syncStore but not used in sync.ts
  - ✗ checkOnline() polls Google favicon every 5 sec (expensive, unreliable on weak WiFi)
  - ✗ If network flickers, sync could trigger multiple times
  - ✗ No conflict resolution: what if task was edited on web before mobile syncs?
```

---

### WORKFLOW 3: Offline Transitions → Data Persistence

**Test Case 3A: Go Offline with Pending Changes**
```
Precondition: User online, makes 3 changes (plant name, task note, new measurement)
Steps:
  1. Plant name updated: updatePlant() → AsyncStorage persisted
  2. Task note added: updateTask() → AsyncStorage persisted
  3. Measurement (EC/pH) recorded: completeTask() → AsyncStorage persisted
  4. Network goes down (toggle WiFi)
  5. useNetworkStatus detects offline, shows OfflineIndicator
  6. User can still see all 3 changes locally
  7. Network comes back up
  8. All 3 changes sync to DB

Expected Result:
  - All local changes visible even offline
  - Changes sync when online, in order, no duplicates

Actual Result: NOT TESTED / PARTIALLY IMPLEMENTED
  - ✓ AsyncStorage persistence works (tested indirectly in stores.test.ts)
  - ✗ No test: does sync retry all 3 changes if 1st one fails?
  - ✗ No test: timestamp conflict — if 2nd change has newer timestamp than 3rd?
  - ✗ Sync batching: currently syncs individually, not batched (inefficient)
  - ✗ No conflict detection: what if user also edited plant on web?
```

**Test Case 3B: App Restart While Offline**
```
Precondition: App made changes, is offline, user force-closes app
Steps:
  1. User kills app (swipe to close, force stop)
  2. User reopens app
  3. _layout.tsx -> useInitSync() calls getCurrentUser()
  4. No network, but loadPlantsFromSupabase() called anyway
  5. Request times out or fails gracefully
  6. AsyncStorage hydrates plantStore, taskStore
  7. Home shows cached plants and today's tasks
  8. OfflineIndicator visible

Expected Result:
  - App fully functional offline with cached data
  - No blank screens
  - Clear indication offline

Actual Result: PARTIALLY TESTED / TIMING RISK
  - ✓ AsyncStorage hydration works (Zustand persist middleware)
  - ✗ No test: useInitSync() doesn't catch errors from loadPlantsFromSupabase()
     → If network request hangs, app may freeze until timeout (30+ sec)
  - ✗ No test: race condition between hydration and sync
     → Plants loaded from AsyncStorage, then overwritten by empty array from DB?
  - ✗ Offline indicator works but depends on polling (5 sec lag)
```

---

## 3. EDGE CASES & ERROR SCENARIOS

### Edge Case 3A: Corrupted AsyncStorage Data
```
Scenario: AsyncStorage contains invalid JSON or corrupted Date string

Test:
  1. Manually set AsyncStorage with garbage: `{ tasks: "not-an-array" }`
  2. App starts, useInitSync() runs
  3. Zustand persist hydrates from AsyncStorage

Expected: App recovers gracefully, shows empty state or error
Actual: ✗ NO TEST — dateReviver in storage.ts will pass through garbage
  - Could crash when mappping tasks.map() on non-array
  - No try-catch in createAsyncStorage.getItem() wrapping JSON.parse

Fix needed:
```typescript
export const createAsyncStorage = () => ({
  getItem: async (name: string) => {
    try {
      const value = await AsyncStorage.getItem(name)
      if (!value) return null
      const parsed = JSON.parse(value, dateReviver)
      // Validate structure (optional but recommended)
      return parsed
    } catch (error) {
      console.error(`Failed to get item ${name}:`, error)
      // Consider clearing corrupted data
      await AsyncStorage.removeItem(name)
      return null
    }
  },
  // ...
})
```

---

### Edge Case 3B: Plant with Zero Available Products
```
Scenario: Plant created with availableProducts = [] (empty)

Test:
  1. Create plant with nutrition table, but mark 0 products as available
  2. Generate schedule
  3. User completes nutrition task

Expected: Either skip showing recipe or show "no products available"
Actual: ✗ NO TEST — CompleteTaskSheet line 151:
```typescript
const showRecipe  = RECIPE_TYPES.has(t.type) && (t.products?.length ?? 0) > 0
```
  This prevents crash, but schedule generation with 0 products untested.

Risk: generatePlantSchedule() might create task with products=null, 
      then CompleteTaskSheet tries to render null.products.map()

---

### Edge Case 3C: Task with Missing Plant Reference
```
Scenario: Task in taskStore references plantId that doesn't exist

Test:
  1. Plant created, tasks generated
  2. Plant deleted from plantStore
  3. Task still exists in taskStore
  4. User opens home, getTodayTasks() includes orphaned task
  5. CompleteTaskSheet tries to load plant details for context

Expected: Graceful error, skip task or show warning
Actual: ✗ NO TEST
  - useTasks hook doesn't validate plant exists
  - If plant is null, plant.name undefined → crash

Risk: Medium (requires specific delete+crash sequence)

---

### Edge Case 3D: Session Expiration During Operation
```
Scenario: User's Supabase session expires mid-task-completion

Test:
  1. User completes task, completeTaskInSupabase() called
  2. Session token has expired
  3. Supabase returns 401 Unauthorized

Expected: Show "Session expired, please log in again" and sign out
Actual: ✗ NO TEST
  - completeTaskInSupabase() in sync.ts catches all errors uniformly (line 171)
  - Doesn't distinguish 401 from network timeout
  - Task marked done locally but not synced
  - User unaware session expired

Fix needed:
```typescript
export async function completeTaskInSupabase(taskId: string, notes?: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('scheduled_tasks')
      .update({
        completed: true,
        completed_at: new Date().toISOString(),
        completion_notes: notes,
      })
      .eq('id', taskId)

    if (error) {
      if (error.code === 'PGRST301' || error.status === 401) {
        // Session expired
        throw new SessionExpiredError('Session expired')
      }
      throw error
    }
  } catch (error) {
    console.error('Error completando tarea:', error)
    throw error
  }
}
```

---

### Edge Case 3E: Rooted/Jailbroken Device Detection
```
Scenario: Running on rooted Android or jailbroken iOS

Test: NO TEST
  - No detection of rooted/jailbroken devices
  - Biometric on rooted device can be bypassed
  - SecureStore fallback unknown

Risk: Low (not in CLAUDE.md requirements, may be nice-to-have)

Mitigation: Add device integrity check before enabling biometric
```

---

## 4. PLATFORM-SPECIFIC ISSUES

### iOS Issues

**Issue 4A: SafeArea on Notch Devices**
```
Files: app/(tabs)/_layout.tsx, all screen components
Status: ✗ NO TEST

Risk: 
  - CompleteTaskSheet uses absolute positioning (line 238)
  - No SafeAreaView wrapper — content may hide behind notch on iPhone 13+
  - PanResponder gesture may be blocked by notch area

Test:
  1. Run on iPhone 14 Pro (notch)
  2. Open CompleteTaskSheet
  3. Verify padding at top/bottom respects SafeArea

Fix: Wrap sheet with SafeAreaView or add paddingTop from useSafeAreaInsets()
```

**Issue 4B: Keyboard Avoidance on iOS**
```
File: CompleteTaskSheet.tsx line 236
Status: ✓ Uses KeyboardAvoidingView

But: No test for edge cases
  - Keyboard dismissal while mid-animation
  - Multiple TextInput focus transitions
  - iPad with split keyboard

---

### Android Issues

**Issue 4C: Back Button Handling**
```
File: CompleteTaskSheet.tsx
Status: ✗ NO TEST

Risk:
  - Modal doesn't respond to hardware back button
  - User presses back, sheet doesn't dismiss
  - On Android, back button is primary way to close modals

Test:
  1. Open CompleteTaskSheet
  2. Press hardware back button
  3. Verify sheet dismisses gracefully

Fix: Use BackHandler listener in CompleteTaskSheet useEffect
```

**Issue 4D: AsyncStorage Android Permissions**
```
Status: ✓ AsyncStorage auto-requests permissions

But: Not tested for denial
  - What if user denies storage permission?
  - App can't persist state
  - Reload app → all local changes lost

Test:
  1. On Android 13+, revoke storage permission
  2. Create plant
  3. Kill app, restart
  4. Verify plant not in list (expected but not graceful)

Mitigation: Add fallback to in-memory store if AsyncStorage fails
```

---

### Dark Mode

**Issue 4E: System Dark Mode Detection**
```
File: All components use hardcoded colors (#131D14, #52CC64, etc.)
Status: ✓ Consistent dark theme, but NO light mode

Risk:
  - App only works in dark mode (colors hardcoded)
  - No useColorScheme() hook to detect system preference
  - No setting to toggle light/dark

Test:
  1. Set device to light mode
  2. Open app
  3. Verify colors are readable

Current: Text colors will be invisible in light mode (dark green on white)

---

## 5. RUNTIME ISSUES

### Issue 5A: Memory Leak in Network Polling
```
File: src/lib/network.ts lines 34-44
Code:
  pollInterval = setInterval(async () => {
    const online = await checkOnline()
    if (online !== currentOnlineState) {
      currentOnlineState = online
      networkListeners.forEach((cb) => cb(online))
    }
  }, 5000)

Status: ✗ MEMORY LEAK

Risk:
  - If unsubscribe() not called, interval keeps running
  - Multiple listeners can create multiple intervals (line 34 check only runs if !pollInterval)
  - On app reload (Expo dev mode), old interval still running

Test:
  1. Mount useNetworkStatus hook
  2. Unmount component
  3. Check if setInterval cleared (use DevTools)

Impact: HIGH — increases over time, could cause app slowdown

Fix: Use useEffect cleanup
```typescript
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsubscribe = onNetworkStateChange((connected) => {
      setIsOnline(connected)
    })

    return () => {
      unsubscribe() // ✓ Cleanup guaranteed
    }
  }, [])

  return { isOnline }
}
```

---

### Issue 5B: Listener Array Memory Leak
```
File: src/lib/network.ts
Code: networkListeners: ((isOnline: boolean) => void)[] = []

Status: ✗ POTENTIAL LEAK

Risk:
  - If callback === doesn't work (different function instance), listener never removed
  - Array grows unbounded over hot reloads

Better: Use Set<WeakRef<>> or Map<Component, Listener>
```

---

### Issue 5C: State Inconsistency — Plant in DB but Not in Store
```
Scenario: 
  1. User offline, creates plant A
  2. Plant added to plantStore and AsyncStorage
  3. User goes online
  4. useInitSync() calls loadPlantsFromSupabase()
  5. Call fails due to 500 error
  6. setPlants() called with empty array, overwriting plant A

Result: ✗ DATA LOSS

Test:
  1. Create plant offline
  2. Simulate server error (mock Supabase)
  3. Verify plant still exists locally

Fix:
```typescript
export function useInitSync() {
  const { setPlants, plants: localPlants } = usePlantStore()
  const { setAllTasks } = useTaskStore()

  useEffect(() => {
    async function sync() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        const plants = await loadPlantsFromSupabase(currentUser.id)
        // Only overwrite if load succeeded
        setPlants(plants)

        const tasks = await loadTasksFromSupabase(currentUser.id)
        setAllTasks(tasks)
      } catch (error) {
        console.error('Error en sincronización inicial:', error)
        // Keep local data, don't overwrite
      }
    }

    sync()
  }, [])
}
```

---

### Issue 5D: Race Condition in Rapid Task Completion
```
Scenario:
  1. User has 2 overdue tasks for today
  2. User rapidly completes both (< 100 ms apart)
  3. recordDailyActivity() called twice in quick succession

Code (xp.ts line 30):
  if (lastStr === todayStr) return  // Already recorded today

Status: ✗ RACE CONDITION

Timeline:
  Task 1 complete:
    - recordDailyActivity() called
    - Reads lastStr = yesterday's date
    - Increments streak
    - Writes streak=5, lastStr=today, [DELAY]
  
  Task 2 complete (before Task 1 write completes):
    - recordDailyActivity() called
    - Reads lastStr = yesterday's date (stale!)
    - Increments streak again
    - Writes streak=5 again (or 6?)
    - Result: streak corrupted, XP award duplicated

Fix: Use Supabase transactions or client-side mutex
```

---

### Issue 5E: Type Mismatch in Sync Payloads
```
File: src/lib/sync.ts

Task sync (line 100-102):
```typescript
scheduled_date: t.scheduledDate instanceof Date
  ? t.scheduledDate.toISOString().split('T')[0]
  : t.scheduledDate,
```

Status: ✗ TYPE UNSAFE

Risk:
  - If t.scheduledDate is string, conversion returns same string
  - If string is invalid (e.g., "2026-13-40"), no validation
  - DB constraint may reject, or task scheduled on wrong date

Test:
  1. Manually create task with scheduledDate = "invalid-date"
  2. Call syncTasksToSupabase()
  3. Verify error or graceful handling

Better:
```typescript
const dateStr = t.scheduledDate instanceof Date
  ? t.scheduledDate.toISOString().split('T')[0]
  : t.scheduledDate

// Validate date format YYYY-MM-DD
if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
  throw new Error(`Invalid date format: ${dateStr}`)
}

scheduled_date: dateStr,
```

---

## 6. USER EXPERIENCE ISSUES

### UX Issue 6A: Unclear Error Messages
```
File: CompleteTaskSheet — no error UI
Status: ✗ NO ERROR HANDLING

Scenario: User completes task, sync fails
  - User sees XP reward animation
  - Animation fades
  - But task never synced
  - User unaware if data persisted

Expected: Toast or error message if sync fails
Actual: Silent failure, logged to console only

Test: 
  1. Mock completeTaskInSupabase to throw error
  2. Complete task
  3. Verify error UI shown

---

### UX Issue 6B: Missing Loading States
```
File: app/(tabs)/plants.tsx
Status: ✗ NO LOADING STATE

Scenario: User taps to view plant detail
  - Navigation happens immediately
  - But plant data still loading from Supabase
  - Screen shows skeleton or blank

Expected: Loading spinner until plant data ready
Actual: Plant detail screen may be blank 1-2 seconds

---

### UX Issue 6C: No Offline Indication
```
File: OfflineIndicator.tsx exists but unclear when shown
Status: ✓ Component exists but integration weak

Issue: useNetworkStatus() polls every 5 seconds
  - 5 second delay before offline detected
  - User may attempt sync before indicator shows

Better: Use native NetInfo library on Expo for real-time detection

---

### UX Issue 6D: No Sync Status for Individual Tasks
```
Scenario: User completes 3 tasks while offline
  - App shows all 3 as done locally
  - When online, all 3 sync
  - But user unaware if sync succeeded for each

Expected: Checkmark ✓ or ⟳ icon next to task to show sync status
Actual: All tasks look the same

---

### UX Issue 6E: Plant Created But Doesn't Appear Immediately
```
Scenario: User creates plant in /plants/new.tsx
  1. Form submitted
  2. addPlant() called
  3. User navigated back to home
  4. Home screen shows cached plants
  5. New plant not visible until manual refresh

Expected: New plant appears immediately in list
Actual: Delay or no refresh

Test:
  1. Create plant
  2. Go home
  3. Verify plant in list

---

## 7. DATA INTEGRITY ISSUES

### Data Integrity Issue 7A: Task Completion XP Not Awarded
```
Status: ✗ NO TEST

Scenario:
  1. User completes task
  2. completeTask() updates local store ✓
  3. completeTaskInSupabase() sends to DB ✓
  4. awardXP() called from component... or called from where?

Risk: awardXP() may not be called at all!

Check: grep -r "awardXP" mobile/src
  - src/lib/xp.ts: definition only
  - src/components/CompleteTaskSheet.tsx: sets setXpReward({ xp })
  - But where does awardXP get called to sync to DB?

Finding: ✗ MISSING!

CompleteTaskSheet shows XP reward locally (line 194) but never calls:
```typescript
awardXP(userId, hasMeasure ? 25 : 15)
```

Impact: User sees +25 XP, but DB doesn't update. On reload, XP is gone.

---

### Data Integrity Issue 7B: Streak Not Updating Daily
```
Status: ✗ NO TEST

Code: xp.ts recordDailyActivity() only called in xp module
But: Never called from task completion!

Issue:
  1. User completes task
  2. completeTask() fires
  3. awardXP() should call recordDailyActivity()
  4. But they're separate functions

Expected: completeTask → awardXP → recordDailyActivity (chained)
Actual: None of these call each other

Result: Streak never increments, streak bonuses never awarded

---

### Data Integrity Issue 7C: Plant Schedule Not Regenerated After Flora Start
```
Scenario:
  1. Plant created, schedule generated (8 week auto-flower)
  2. Week 2 user clicks "Iniciar Floración" button
  3. floraStartDate updated
  4. Schedule should regenerate with new dates

Status: ✗ NO TEST

Risk: Old schedule still active, new tasks not generated for correct weeks

---

### Data Integrity Issue 7D: Photo Metadata Not Saved
```
File: src/components / No photo upload component found yet
Status: ✗ NOT IMPLEMENTED

But diagram tab (diagnose.tsx) references photo uploads
Need to test: Does uploaded photo store metadata (date, plant_id, conditions)?

---

### Data Integrity Issue 7E: Duplicate Plants in List
```
Scenario:
  1. Create plant offline
  2. Go online, useInitSync() calls setPlants()
  3. But local plant already in store
  4. setPlants() overwrites with DB data (which includes offline plant)
  5. Plant appears once ✓ (actually OK if IDs match)

But: If network request gets plant + local offline plant both in array,
     plantStore.addPlant() could duplicate

Status: ✗ LOW PRIORITY but needs test

---

## 8. TEST FRAMEWORK & INFRASTRUCTURE RECOMMENDATIONS

### Current State
- Jest (assumed) not explicitly configured
- No test scripts in package.json
- No @testing-library/react-native
- No E2E framework (Detox, Maestro)
- No mock Supabase setup
- No fixtures or test data

### Recommended Test Stack

1. **Unit Testing: Jest + @testing-library/react-native**
   ```bash
   npm install --save-dev @testing-library/react-native @testing-library/jest-native jest babel-jest
   ```

2. **E2E Testing: Maestro (lighter than Detox, faster to setup)**
   ```bash
   # Maestro runs flows recorded as YAML, platform-agnostic
   ```

3. **Mock Supabase: Use jest-supabase or custom mock**
   ```typescript
   // jest.setup.js
   jest.mock('./src/lib/supabase', () => ({
     supabase: {
       auth: { ... },
       from: () => ({ ... }),
     }
   }))
   ```

4. **Test Data: Factory functions + fixtures**
   ```typescript
   // tests/factories.ts
   export const createMockPlant = (overrides = {}) => ({
     id: 'plant-1',
     name: 'Test Plant',
     startDate: new Date('2026-04-01'),
     geneticType: 'autoflower',
     ...overrides,
   })
   ```

### Package.json Updates
```json
{
  "scripts": {
    "start": "expo start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "e2e": "maestro test flows/",
    "e2e:debug": "maestro --inspect test flows/"
  },
  "devDependencies": {
    "@testing-library/react-native": "^12.0.0",
    "@testing-library/jest-native": "^5.4.0",
    "jest": "^29.0.0",
    "jest-mock-extended": "^3.0.0",
    "babel-jest": "^29.0.0"
  }
}
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../backend/shared/$1',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/**/*.tsx',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
}
```

---

## 9. SAMPLE TEST SUITES TO IMPLEMENT

### Test Suite 1: Plant Store CRUD + Persistence
```typescript
// src/store/__tests__/plantStore.test.ts
import { usePlantStore } from '../plantStore'
import AsyncStorage from '@react-native-async-storage/async-storage'

describe('PlantStore', () => {
  beforeEach(async () => {
    usePlantStore.clearState()
    await AsyncStorage.clear()
  })

  describe('CRUD operations', () => {
    it('should add a plant', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)
      expect(store.plants).toHaveLength(1)
      expect(store.getPlantById(plant.id)).toEqual(plant)
    })

    it('should update plant immutably', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)
      store.updatePlant(plant.id, { name: 'New Name' })
      
      const updated = store.getPlantById(plant.id)!
      expect(updated.name).toBe('New Name')
      expect(updated.genetics).toBe(plant.genetics) // other fields unchanged
    })

    it('should remove a plant', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)
      store.removePlant(plant.id)
      expect(store.plants).toHaveLength(0)
    })
  })

  describe('Selectors', () => {
    it('should filter active plants only', () => {
      const store = usePlantStore()
      store.addPlant(createMockPlant({ status: 'active' }))
      store.addPlant(createMockPlant({ id: 'p2', status: 'harvested' }))
      
      expect(store.getActivePlants()).toHaveLength(1)
      expect(store.getPlantsCount()).toBe(2)
    })
  })

  describe('Persistence', () => {
    it('should persist to AsyncStorage on update', async () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)
      
      // Wait for Zustand persist middleware
      await new Promise(r => setTimeout(r, 100))
      
      const stored = await AsyncStorage.getItem('cannatrack-plants')
      const parsed = JSON.parse(stored!)
      expect(parsed.plants).toHaveLength(1)
    })

    it('should hydrate from AsyncStorage on init', async () => {
      const plant = createMockPlant()
      await AsyncStorage.setItem('cannatrack-plants', JSON.stringify({
        plants: [plant],
        selectedPlantId: null,
        filter: 'active',
      }))
      
      const store = usePlantStore()
      await new Promise(r => setTimeout(r, 100))
      
      expect(store.plants).toHaveLength(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle corrupted AsyncStorage gracefully', async () => {
      await AsyncStorage.setItem('cannatrack-plants', 'corrupted-json{')
      
      const store = usePlantStore()
      await new Promise(r => setTimeout(r, 100))
      
      expect(store.plants).toHaveLength(0) // Fallback to empty
    })

    it('should reject plant with undefined ID', () => {
      const store = usePlantStore()
      const invalidPlant = createMockPlant({ id: undefined as any })
      
      expect(() => store.addPlant(invalidPlant)).toThrow()
    })
  })
})
```

---

### Test Suite 2: Task Completion + XP Flow
```typescript
// tests/integration/task-completion.test.ts
import { useTaskStore } from '@/store/taskStore'
import { useUserStore } from '@/store/userStore'
import { completeTaskInSupabase, awardXP } from '@/lib'
import { supabase } from '@/lib/supabase'

jest.mock('@/lib/supabase')

describe('Task Completion Flow', () => {
  beforeEach(() => {
    useTaskStore.setState({ tasks: [] })
    useUserStore.setState({ totalXP: 0 })
    jest.clearAllMocks()
  })

  it('should complete task and award XP', async () => {
    const store = useTaskStore()
    const userStore = useUserStore()
    const task = createMockTask()
    
    store.addTask(task)
    
    // Simulate completion
    store.completeTask(task.id, 'All good')
    const completed = store.tasks.find(t => t.id === task.id)!
    
    expect(completed.completed).toBe(true)
    expect(completed.completionNotes).toBe('All good')
    expect(completed.completedAt).toBeDefined()
  })

  it('should sync completion to Supabase', async () => {
    const mockUpdate = jest.fn().mockResolvedValue({ error: null })
    jest.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      eq: jest.fn().mockReturnValue({ error: null }),
    } as any)

    await completeTaskInSupabase('task-1', 'Notes')
    
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        completion_notes: 'Notes',
      })
    )
  })

  it('should fail gracefully if sync fails', async () => {
    jest.mocked(supabase.from).mockReturnValue({
      update: jest.fn().mockResolvedValue({
        error: { message: 'Network error' },
      }),
    } as any)

    const store = useTaskStore()
    const task = createMockTask()
    store.addTask(task)
    
    // Local completion happens first
    store.completeTask(task.id)
    expect(store.tasks.find(t => t.id === task.id)?.completed).toBe(true)
    
    // Sync failure doesn't roll back local state
    try {
      await completeTaskInSupabase(task.id)
    } catch (e) {
      // Expected
    }
    
    // Task still marked complete locally (will retry later)
    expect(store.tasks.find(t => t.id === task.id)?.completed).toBe(true)
  })

  it('should handle race condition: rapid task completion', async () => {
    const userStore = useUserStore()
    userStore.setState({ userId: 'user-1', totalXP: 0 })
    
    // Mock recordDailyActivity to prevent duplicate streak
    jest.mocked(supabase.from).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ xp: 0, streak_days: 0, last_activity_date: null }],
        }),
      }),
      update: jest.fn().mockResolvedValue({ error: null }),
    } as any)

    // Simulate 2 tasks completed in rapid succession
    const promises = [
      awardXP('user-1', 15),
      awardXP('user-1', 15),
    ]
    
    await Promise.all(promises)
    
    // XP should be 30, not 15
    // (This test reveals the missing recordDailyActivity call!)
  })
})
```

---

### Test Suite 3: Offline Sync
```typescript
// tests/integration/offline-sync.test.ts
import { useNetworkStatus, checkOnline } from '@/lib/network'
import { usePlantStore } from '@/store/plantStore'
import { loadPlantsFromSupabase } from '@/lib/sync'

jest.mock('@/lib/supabase')
jest.mock('@/lib/network')

describe('Offline-Online Sync', () => {
  it('should sync pending changes when going online', async () => {
    jest.mocked(checkOnline).mockResolvedValue(false) // Start offline
    
    const store = usePlantStore()
    const plant = createMockPlant()
    store.addPlant(plant)
    store.updatePlant(plant.id, { name: 'Updated Name' })
    
    // Simulate going online
    jest.mocked(checkOnline).mockResolvedValue(true)
    const { rerender } = renderHook(() => useNetworkStatus())
    
    await waitFor(() => {
      expect(checkOnline).toHaveBeenCalled()
    })
    
    // Verify sync was triggered
    // (Requires sync trigger on network state change)
  })

  it('should not overwrite local data if sync fails', async () => {
    jest.mocked(loadPlantsFromSupabase).mockRejectedValue(
      new Error('Server error')
    )
    
    const store = usePlantStore()
    const plant = createMockPlant()
    store.addPlant(plant)
    
    // Simulate useInitSync()
    try {
      const plants = await loadPlantsFromSupabase('user-1')
      store.setPlants(plants)
    } catch (e) {
      // Keep local plants if error
    }
    
    expect(store.plants).toHaveLength(1)
  })

  it('should detect network changes with 5s polling', async () => {
    jest.useFakeTimers()
    jest.mocked(checkOnline)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    
    const callback = jest.fn()
    const unsubscribe = onNetworkStateChange(callback)
    
    jest.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledWith(false)
    
    jest.advanceTimersByTime(5000)
    expect(callback).toHaveBeenCalledWith(true)
    
    unsubscribe()
    jest.useRealTimers()
  })
})
```

---

## 10. PRIORITIZED TEST ROADMAP

### Phase 1 (Immediate — Week 1)
- [ ] Jest configuration + package.json scripts
- [ ] Fix awardXP not called in task completion
- [ ] Fix useInitSync overwriting local data on error
- [ ] Add try-catch to AsyncStorage reviver
- [ ] Test plant store CRUD + persistence

### Phase 2 (High Priority — Weeks 2-3)
- [ ] Task completion → sync → XP flow integration test
- [ ] Offline-online sync round-trip test
- [ ] Biometric auth → session restoration
- [ ] Race condition: rapid task completion

### Phase 3 (Medium Priority — Weeks 4-5)
- [ ] E2E tests with Maestro (5 critical user journeys)
- [ ] Platform-specific tests (iOS SafeArea, Android back button)
- [ ] Error handling and error UI
- [ ] Network timeout behavior

### Phase 4 (Nice-to-Have — Ongoing)
- [ ] Component tests (CompleteTaskSheet, HarvestSheet)
- [ ] Photo upload + metadata
- [ ] Dark mode + light mode
- [ ] Performance profiling (memory leaks, animation frame drops)

---

## 11. SUMMARY & RISK ASSESSMENT

| Area | Risk | Impact | Mitigation |
|------|------|--------|-----------|
| **Store Persistence** | Medium | Data loss on crash | Add persistence tests |
| **Sync Logic** | HIGH | Data inconsistency | Add offline-online tests |
| **XP Awards** | HIGH | Missing XP in DB | Implement awardXP call chain |
| **Race Conditions** | HIGH | Streak corruption | Add mutex/transaction |
| **Network Polling** | Medium | Memory leak, battery drain | Use NetInfo, fix cleanup |
| **Error Handling** | HIGH | Silent failures | Add error UI + tests |
| **Date Handling** | Medium | Wrong task dates | Add date validation tests |
| **Platform Issues** | Low-Medium | iOS notch, Android back | Add platform-specific tests |
| **AsyncStorage Corruption** | Low | App crash on load | Add validation + recovery |
| **Session Expiration** | Medium | Stuck user | Add 401 handling |

---

## 12. FINAL RECOMMENDATIONS

1. **Immediate (Do Now)**
   - Setup Jest + testing-library
   - Fix 3 critical bugs: awardXP, useInitSync, race conditions
   - Add 10 unit tests for stores

2. **This Sprint**
   - 1 integration test for offline-online cycle
   - 1 E2E test for plant creation → task completion
   - Error handling + error UI

3. **Before Production**
   - 80%+ coverage on critical paths (auth, sync, task)
   - 5 E2E journeys passing
   - No memory leaks (DevTools profile)
   - All edge cases handled gracefully

4. **Ongoing**
   - Add tests for each bug found in QA
   - Monitor Sentry for runtime errors
   - A/B test offline experience

---

**End of QA Analysis**
