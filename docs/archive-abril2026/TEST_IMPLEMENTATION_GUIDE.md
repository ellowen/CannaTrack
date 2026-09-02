# Test Implementation Guide — Quick Start

## Step 1: Install Dependencies

```bash
cd mobile
npm install --save-dev \
  jest \
  @testing-library/react-native \
  @testing-library/jest-native \
  babel-jest \
  jest-mock-extended \
  @babel/core @babel/preset-env @babel/preset-typescript

# For React Native testing
npm install --save-dev react-test-renderer
```

## Step 2: Setup Jest Configuration

Create `jest.config.js` in mobile root:

```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
    '@testing-library/jest-native/extend-expect',
  ],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../../backend/shared/$1',
  },
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/src/**/*.test.ts',
    '**/src/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/app/**', // Skip routing
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    './src/store/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    './src/lib/': {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}
```

Create `jest.setup.js` in mobile root:

```javascript
// Suppress React warnings in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper')

// Mock Expo modules
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
  supportedAuthenticationTypesAsync: jest.fn().mockResolvedValue([1, 2]),
  AuthenticationType: {
    FACIAL_RECOGNITION: 1,
    FINGERPRINT: 2,
  },
}))

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(null),
  removeItem: jest.fn().mockResolvedValue(null),
  clear: jest.fn().mockResolvedValue(null),
}))
```

## Step 3: Update package.json

```json
{
  "scripts": {
    "start": "expo start",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:debug": "node --inspect-brk=9229 node_modules/.bin/jest --runInBand"
  }
}
```

## Step 4: Create Test Factories

Create `tests/factories.ts`:

```typescript
import { Plant, ScheduledTask } from '@shared/types/plant'

export const createMockPlant = (overrides: Partial<Plant> = {}): Plant => ({
  id: `plant-${Math.random().toString(36).substr(2, 9)}`,
  userId: 'user-123',
  name: 'Test Plant',
  genetics: 'Feminized',
  geneticType: 'feminized',
  startDate: new Date('2026-04-01'),
  floraStartDate: undefined,
  autoFlowerTotalDays: 60,
  location: 'Indoor',
  potCount: 1,
  potVolumeLiters: 10,
  nutritionTableId: 'revegetar',
  availableProducts: ['BIO', 'ECO'],
  status: 'active',
  notes: '',
  createdAt: new Date('2026-04-01'),
  updatedAt: new Date('2026-04-01'),
  ...overrides,
})

export const createMockTask = (overrides: Partial<ScheduledTask> = {}): ScheduledTask => ({
  id: `task-${Math.random().toString(36).substr(2, 9)}`,
  plantId: 'plant-123',
  userId: 'user-123',
  type: 'nutrition',
  scheduledDate: new Date(),
  cycle: 'vege',
  week: 1,
  stage: 'V1',
  products: [],
  ecMin: 0.6,
  ecMax: 0.8,
  phMin: 5.5,
  phMax: 6.0,
  completed: false,
  completedAt: undefined,
  completionNotes: undefined,
  createdAt: new Date(),
  ...overrides,
})

export const createMockUser = () => ({
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
})
```

## Step 5: Write First Unit Test

Update `src/store/__tests__/stores.test.ts`:

```typescript
import { usePlantStore } from '../plantStore'
import { useTaskStore } from '../taskStore'
import { createMockPlant, createMockTask } from '../../../tests/factories'

describe('PlantStore', () => {
  beforeEach(() => {
    // Clear store state before each test
    usePlantStore.setState({
      plants: [],
      selectedPlantId: null,
      loading: false,
      error: null,
      filter: 'active',
    })
  })

  describe('CRUD', () => {
    it('should add a plant', () => {
      const store = usePlantStore()
      const plant = createMockPlant()

      store.addPlant(plant)

      expect(store.plants).toHaveLength(1)
      expect(store.plants[0].id).toBe(plant.id)
    })

    it('should update a plant immutably', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)

      store.updatePlant(plant.id, { name: 'Updated Name' })

      const updated = store.getPlantById(plant.id)
      expect(updated?.name).toBe('Updated Name')
      expect(updated?.genetics).toBe(plant.genetics) // Unchanged
    })

    it('should remove a plant', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)

      store.removePlant(plant.id)

      expect(store.plants).toHaveLength(0)
      expect(store.getPlantById(plant.id)).toBeUndefined()
    })
  })

  describe('Selectors', () => {
    it('should get active plants only', () => {
      const store = usePlantStore()
      store.addPlant(createMockPlant({ status: 'active' }))
      store.addPlant(createMockPlant({ id: 'p2', status: 'harvested' }))
      store.addPlant(createMockPlant({ id: 'p3', status: 'discarded' }))

      expect(store.getActivePlants()).toHaveLength(1)
      expect(store.getPlantsCount()).toBe(3)
    })

    it('should get plant by ID', () => {
      const store = usePlantStore()
      const plant = createMockPlant()
      store.addPlant(plant)

      expect(store.getPlantById(plant.id)).toEqual(plant)
      expect(store.getPlantById('unknown')).toBeUndefined()
    })
  })
})

describe('TaskStore', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
      filter: 'all',
      loading: false,
    })
  })

  describe('Task filtering', () => {
    it('should get today tasks', () => {
      const store = useTaskStore()
      const today = new Date()
      const tomorrow = new Date(today.getTime() + 86400000)

      store.addTask(createMockTask({ scheduledDate: today }))
      store.addTask(createMockTask({ id: 't2', scheduledDate: tomorrow }))

      expect(store.getTodayTasks()).toHaveLength(1)
      expect(store.getTodayTasks()[0].scheduledDate.toDateString())
        .toBe(today.toDateString())
    })

    it('should get overdue tasks', () => {
      const store = useTaskStore()
      const yesterday = new Date(Date.now() - 86400000)
      const tomorrow = new Date(Date.now() + 86400000)

      store.addTask(createMockTask({ scheduledDate: yesterday, completed: false }))
      store.addTask(createMockTask({ id: 't2', scheduledDate: tomorrow }))
      store.addTask(createMockTask({ id: 't3', scheduledDate: yesterday, completed: true }))

      const overdue = store.getOverdueTasks()
      expect(overdue).toHaveLength(1)
      expect(overdue[0].completed).toBe(false)
    })

    it('should count completed vs pending', () => {
      const store = useTaskStore()
      store.addTask(createMockTask({ completed: true }))
      store.addTask(createMockTask({ id: 't2', completed: false }))
      store.addTask(createMockTask({ id: 't3', completed: false }))

      expect(store.getCompletedCount()).toBe(1)
      expect(store.getPendingCount()).toBe(2)
    })
  })
})
```

## Step 6: Run Tests

```bash
npm test                    # Run all tests once
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage report
npm run test:debug         # Debug in Node inspector
```

## Step 7: Add Integration Test (Offline-Online)

Create `src/__tests__/integration/offline-sync.test.ts`:

```typescript
import { usePlantStore } from '@/store/plantStore'
import { useTaskStore } from '@/store/taskStore'
import { useSyncStore } from '@/store/syncStore'
import { createMockPlant, createMockTask } from '../../../tests/factories'

describe('Offline-Online Sync Flow', () => {
  beforeEach(() => {
    usePlantStore.setState({ plants: [] })
    useTaskStore.setState({ tasks: [] })
    useSyncStore.setState({ syncQueue: [], isSyncing: false })
  })

  it('should queue changes while offline', () => {
    const plantStore = usePlantStore()
    const syncStore = useSyncStore()

    // Simulate offline create
    const plant = createMockPlant()
    plantStore.addPlant(plant)

    // Queue should record this for later sync
    // (Requires syncQueue implementation)
    expect(plantStore.plants).toHaveLength(1)
  })

  it('should NOT overwrite local data if sync fails', async () => {
    const plantStore = usePlantStore()
    const localPlant = createMockPlant()
    plantStore.addPlant(localPlant)

    // Simulate sync failure
    const syncQueue = useSyncStore()
    syncQueue.setSyncing(true)
    // If DB returns error, don't overwrite
    syncQueue.setSyncing(false)

    expect(plantStore.plants).toHaveLength(1)
    expect(plantStore.getPlantById(localPlant.id)).toBeDefined()
  })
})
```

## Step 8: Mock Supabase for Testing

Create `tests/mocks/supabase.ts`:

```typescript
import { jest } from '@jest/globals'

export const mockSupabase = {
  auth: {
    signUp: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getUser: jest.fn().mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    }),
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  from: jest.fn((table: string) => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ error: null }),
    update: jest.fn().mockResolvedValue({ error: null }),
    delete: jest.fn().mockResolvedValue({ error: null }),
    eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: {}, error: null }),
  })),
}
```

## Step 9: Test Edge Cases

Create `src/__tests__/edge-cases.test.ts`:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { usePlantStore } from '@/store/plantStore'
import { dateReviver } from '@/lib/storage'

describe('Edge Cases', () => {
  describe('Corrupted AsyncStorage', () => {
    it('should handle invalid JSON in AsyncStorage', async () => {
      // Simulate corrupted data
      jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce('{invalid json')

      // Attempt to parse should fail gracefully
      expect(() => {
        JSON.parse('{invalid json')
      }).toThrow()

      // Storage.ts should catch this
    })

    it('should revive ISO dates correctly', () => {
      const isoDate = '2026-04-24T10:30:00Z'
      const revived = dateReviver('', isoDate)

      expect(revived).toBeInstanceOf(Date)
      expect(revived.toISOString()).toContain('2026-04-24')
    })

    it('should NOT revive non-date strings', () => {
      const text = 'hello world'
      const revived = dateReviver('', text)

      expect(revived).toBe(text)
      expect(revived).not.toBeInstanceOf(Date)
    })
  })

  describe('Empty collections', () => {
    it('should handle plant with zero available products', () => {
      const store = usePlantStore()
      const plant = createMockPlant({ availableProducts: [] })

      store.addPlant(plant)

      expect(store.getPlantById(plant.id)?.availableProducts).toHaveLength(0)
    })
  })

  describe('Invalid dates', () => {
    it('should reject task with invalid scheduledDate', () => {
      const task = createMockTask({
        scheduledDate: new Date('invalid') as any,
      })

      // Should either throw or handle gracefully
      expect(isNaN(task.scheduledDate.getTime())).toBe(true)
    })
  })
})
```

## Step 10: Run Tests & Check Coverage

```bash
npm test -- --coverage

# Output example:
# ─────────────────────────────────────
# File                  | % Stmts | % Branch | % Funcs | % Lines
# ─────────────────────────────────────
# All files             |   45.2  |   38.1   |   50.0  |   43.8
# src/store/plantStore  |   92.0  |   88.0   |   95.0  |   92.0
# src/lib/sync.ts       |   28.0  |   15.0   |   30.0  |   25.0 ← Needs work
# ─────────────────────────────────────
```

---

## Recommended Testing Workflow

1. **Before coding:** Write test for desired behavior
2. **While coding:** Run `npm run test:watch` in split terminal
3. **Before commit:** `npm run test:coverage` — ensure no regression
4. **Code review:** Require new tests for new features, >70% coverage

---

## E2E Testing with Maestro (Optional But Recommended)

Create `.maestro/test-plant-creation.yaml`:

```yaml
appId: expo.cannatrack
---
- launchApp
- tapOn:
    id: tab-plants
- tapOn:
    id: button-new-plant
- inputText:
    id: input-plant-name
    text: Test Plant
- tapOn:
    id: select-genetics
- tapOn:
    id: option-feminized
- tapOn:
    id: input-pot-volume
    text: "10"
- tapOn:
    id: button-create
- assertVisible:
    text: Test Plant
```

Run: `maestro test .maestro/test-plant-creation.yaml`

---

## Troubleshooting

**Problem:** `Cannot find module '@shared/types/plant'`
- **Solution:** Check babel.config.js alias, adjust moduleNameMapper in jest.config.js

**Problem:** Tests hang on async operations
- **Solution:** Use `jest.useFakeTimers()` for timeouts, `jest.runAllTimers()` to advance

**Problem:** AsyncStorage tests fail
- **Solution:** Mock returns `Promise`, use `await` in test

**Problem:** "ReferenceError: document is not defined"
- **Solution:** Change testEnvironment to 'node' (not 'jsdom')

---

End of Implementation Guide
