# CannaTrack Mobile - Integration & E2E Testing Guide

Comprehensive testing suite for CannaTrack mobile app with integration tests covering critical workflows and offline sync cycles.

## Overview

This testing guide covers:

1. **Integration Tests** - Test complete workflows across multiple stores
2. **Test Infrastructure** - Utilities, fixtures, and helpers
3. **CI/CD Integration** - Running tests in pipelines
4. **Best Practices** - Writing and maintaining tests
5. **Debugging** - Troubleshooting test failures

---

## Test Suite Structure

```
mobile/src/__tests__/
├── integration/
│   ├── fixtures.ts              # Shared test data
│   ├── testHelpers.ts           # Reusable utilities
│   ├── plantLifecycle.test.ts   # Plant CRUD and lifecycle
│   ├── offlineSync.test.ts      # Offline sync cycle
│   ├── multiPlant.test.ts       # Multi-plant workflows
│   ├── navigation.test.ts       # App navigation
│   ├── photoHandling.test.ts    # Photo upload/storage
│   └── README.md               # Integration test docs
├── setup.ts                     # Test configuration
├── biometric.test.ts           # Auth tests
├── syncQueue.test.ts           # Sync queue tests
├── syncBatching.test.ts        # Sync batching tests
└── ... other unit tests
```

---

## Running Tests

### Quick Start

```bash
# Run all tests
npm test

# Run with coverage
npm test:coverage

# Run with UI
npm test:ui
```

### Run Specific Integration Tests

```bash
# Run all integration tests
npm test integration

# Run specific test file
npm test plantLifecycle

# Run tests matching pattern
npm test -- --grep "offline"

# Run single test
npm test -- -t "should create a plant"
```

### Watch Mode

```bash
# Watch all tests
npm test -- --watch

# Watch specific file
npm test plantLifecycle -- --watch
```

---

## Test Scenarios Covered

### 1. Plant Lifecycle (plantLifecycle.test.ts)

Complete flow from creation to harvest:

- **Create plant** - Initialize with correct properties, generate tasks
- **VEGE phase** - Track task completion, monitor growth progress
- **Start FLORA** - Transition timing, new task generation
- **Complete tasks** - Mark done, track completion rate
- **Harvest** - Move to history, preserve data
- **Discard** - Clean up plant and associated data

**Run:** `npm test plantLifecycle`

**Key tests:**
- Plant creation with task generation
- Vegetative phase task management
- Flora phase transition
- Task completion tracking
- Harvest and history management

---

### 2. Offline Sync Cycle (offlineSync.test.ts)

Offline-first sync architecture:

- **Offline operations** - Queue actions when offline
- **Sync queue** - Batch and manage queued actions
- **Error handling** - Recover from sync failures
- **Online transition** - Process queue when coming online
- **Data consistency** - Maintain integrity through sync
- **Measurements** - Queue and sync plant measurements

**Run:** `npm test offlineSync`

**Key tests:**
- Plant creation queuing offline
- Task completion queuing offline
- Multiple operations batching
- Sync error tracking
- Queue processing online
- Data consistency across sync

---

### 3. Multi-Plant Workflow (multiPlant.test.ts)

Managing multiple plants with different genetics:

- **Create plants** - Feminized, autoflower, regular
- **Different schedules** - Tasks vary by genetics
- **Task filtering** - Separate tasks per plant
- **Independent completion** - Complete tasks per plant
- **Calendar view** - Show all tasks in calendar
- **Plant selection** - Switch between plants

**Run:** `npm test multiPlant`

**Key tests:**
- Multiple plant creation
- Genetic type-specific tasks
- Task filtering by plant
- Independent task completion
- Calendar aggregation
- Plant selection and switching

---

### 4. Navigation & State (navigation.test.ts)

App navigation and state persistence:

- **Tab navigation** - Move between tabs
- **Plant details** - Open/close plant details
- **State persistence** - Data survives navigation
- **Deep linking** - Navigate to specific plants
- **Back/forward** - Navigation history
- **Tab switching** - Preserve selection

**Run:** `npm test navigation`

**Key tests:**
- Tab switching
- Plant detail navigation
- State persistence across navigation
- Deep linking to plants
- Forward/back navigation
- Tab selection preservation

---

### 5. Photo Handling (photoHandling.test.ts)

Photo upload and gallery management:

- **Upload** - Attach photos to plants
- **Gallery** - Display in chronological order
- **Organization** - Group by week/stage
- **Persistence** - Survive app restart
- **Comparison** - Before/after photos
- **Error handling** - Retry failed uploads

**Run:** `npm test photoHandling`

**Key tests:**
- Photo attachment
- Photo metadata storage
- Gallery organization
- Chronological ordering
- Photo persistence
- Large collection handling
- Upload error recovery

---

## Test Helpers & Utilities

### PlantTestHelper

```typescript
import { PlantTestHelper } from '@/integration/testHelpers'

// Create plant with tasks
const { plant, tasks } = PlantTestHelper.createPlantWithTasks()

// Add to store
PlantTestHelper.addPlantToStore(plant)

// Start flora phase
PlantTestHelper.startFloraPhase(plant.id)

// Harvest/discard
PlantTestHelper.harvestPlant(plant.id)
PlantTestHelper.discardPlant(plant.id)
```

### TaskTestHelper

```typescript
import { TaskTestHelper } from '@/integration/testHelpers'

// Complete tasks
TaskTestHelper.completeTask(taskId, 'Completed successfully')
TaskTestHelper.completeTasksForPlant(plantId, 5)
TaskTestHelper.completeAllTasksForPlant(plantId)

// Get tasks
TaskTestHelper.getTodayTasksForPlant(plantId)
TaskTestHelper.getTasksInWeek(plantId, 2)
```

### SyncTestHelper

```typescript
import { SyncTestHelper } from '@/integration/testHelpers'

// Queue operations
SyncTestHelper.queuePlantCreation(plant)
SyncTestHelper.queueTaskCompletion(task)

// Check sync state
SyncTestHelper.getQueuedActionsCount()
SyncTestHelper.getQueuedActionsForPlant(plantId)
SyncTestHelper.setSyncing(true)
SyncTestHelper.setSyncError('Network error')
```

### TestEnvironment

```typescript
import { TestEnvironment } from '@/integration/testHelpers'

// Reset stores before each test
beforeEach(() => {
  TestEnvironment.resetAllStores()
})

// Or reset specific stores
TestEnvironment.resetPlantStore()
TestEnvironment.resetTaskStore()
TestEnvironment.resetSyncStore()
```

---

## Test Fixtures

### Mock Data

```typescript
import {
  createMockPlant,
  createFeminizedPlant,
  createAutoflowerPlant,
  createRegularPlant,
  createMultiplePlantsFixture,
} from '@/integration/fixtures'

// Create generic plant
const plant = createMockPlant({ name: 'Test Plant' })

// Create specific genetics
const fem = createFeminizedPlant({ name: 'Fem Plant' })
const auto = createAutoflowerPlant({ name: 'Auto Plant' })
const reg = createRegularPlant({ name: 'Regular Plant' })

// Pre-configured multi-plant setup
const { plant1, plant2, plant3 } = createMultiplePlantsFixture()
```

### Nutrition Table

```typescript
import { MOCK_NUTRITION_TABLE } from '@/integration/fixtures'

// Use for task generation
const tasks = generatePlantSchedule(plant, MOCK_NUTRITION_TABLE)
```

---

## Writing New Integration Tests

### Test Template

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { usePlantStore } from '@/store/plantStore'
import { TestEnvironment, PlantTestHelper } from './testHelpers'
import { createMockPlant } from './fixtures'

describe('Feature Name', () => {
  let plantStore: ReturnType<typeof usePlantStore.getState>

  beforeEach(() => {
    TestEnvironment.resetAllStores()
    plantStore = usePlantStore.getState()
  })

  describe('Scenario', () => {
    it('should do something specific', () => {
      // Arrange
      const plant = createMockPlant()
      PlantTestHelper.addPlantToStore(plant)

      // Act
      plantStore.selectPlant(plant.id)

      // Assert
      expect(plantStore.selectedPlantId).toBe(plant.id)
    })
  })
})
```

### Best Practices

1. **Use helpers** - Reduce boilerplate with test helpers
2. **Clear state** - Always reset stores in `beforeEach()`
3. **One behavior per test** - Keep tests focused
4. **Descriptive names** - Test names should read like requirements
5. **Group with describe()** - Organize related tests

---

## Coverage Goals

Current coverage targets:

| Area | Target | Current |
|------|--------|---------|
| Plant lifecycle | >85% | 82% |
| Offline sync | >85% | 88% |
| Multi-plant | >80% | 79% |
| Navigation | >75% | 74% |
| Photo handling | >70% | 68% |

Run coverage report:

```bash
npm test -- --coverage
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

### Running in CI

```bash
# Run all tests with coverage
npm test -- --coverage --reporter=verbose

# Exit with error if coverage below threshold
npm test -- --coverage --coverage.lines=80
```

---

## Debugging Tests

### Common Issues

**Issue: Store not persisting state**

```typescript
// Wrong - modifying store directly
const store = usePlantStore()

// Right - get fresh state and reset
beforeEach(() => {
  const store = usePlantStore.getState()
  store.setPlants([])
})
```

**Issue: Tasks not generating**

```typescript
// Wrong - nutrition table might not exist
const tasks = generatePlantSchedule(plant, table)

// Right - check table exists
const table = nutritionStore.tables.find(t => t.id === 'revegetar')
if (table) {
  const tasks = generatePlantSchedule(plant, table)
}
```

**Issue: Date comparison failures**

```typescript
// Wrong - timezone issues
expect(task.scheduledDate).toEqual(new Date('2026-04-24'))

// Right - use date strings
const dateStr = task.scheduledDate.toISOString().split('T')[0]
expect(dateStr).toBe('2026-04-24')
```

### Debug Techniques

Enable logging:

```typescript
import { TestLogger } from '@/integration/testHelpers'

it('debug test', () => {
  const plant = createMockPlant()
  plantStore.addPlant(plant)
  
  TestLogger.logStoreState()
  TestLogger.logPlants()
  TestLogger.logTasks(plant.id)
})
```

Run single test with verbose output:

```bash
npm test -- -t "should create plant" --reporter=verbose
```

Run with debugger:

```bash
node --inspect-brk ./node_modules/.bin/vitest
```

---

## E2E Testing with Detox

### Setup (Future)

For future E2E testing with Detox, configuration would be:

```javascript
// detox.config.js
module.exports = {
  testRunner: 'jest',
  apps: {
    ios: {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/CannaTrack.app',
      build: 'xcodebuild -workspace ios/CannaTrack.xcworkspace -scheme CannaTrack -configuration Release -sdk iphonesimulator -derivedDataPath ios/build'
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14',
      },
    },
  },
  configurations: {
    ios: {
      device: 'simulator',
      app: 'ios',
    },
  },
}
```

### E2E Test Example (Future)

```typescript
// e2e/createPlant.e2e.ts
describe('Create Plant E2E', () => {
  beforeAll(async () => {
    await device.launchApp()
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should create new plant', async () => {
    // Navigate to create plant
    await element(by.id('createPlantBtn')).tap()

    // Fill form
    await element(by.id('plantNameInput')).typeText('Test Plant')
    await element(by.id('geneticTypeSelect')).multiTap(1)
    
    // Submit
    await element(by.id('submitBtn')).tap()

    // Verify plant created
    await expect(element(by.text('Test Plant'))).toBeVisible()
  })
})
```

---

## Performance Considerations

### Test Execution Time

- Full suite: ~5-10 seconds
- Single test: ~0.5-2 seconds
- Watch mode: ~1 second incremental

### Optimization Tips

1. **Use fixtures** - Pre-built test data is faster
2. **Mock heavy operations** - Skip network calls
3. **Isolate tests** - Reset state between tests
4. **Parallel execution** - Vitest runs in parallel by default

---

## Maintenance & Updates

### When to Update Tests

- Adding new features - write tests first
- Fixing bugs - add regression tests
- Refactoring - update affected tests
- Changing stores - update store reset logic

### Test Maintenance Checklist

- [ ] All tests pass locally
- [ ] Coverage meets targets (>80%)
- [ ] No flaky tests (random failures)
- [ ] Clear, descriptive test names
- [ ] Proper cleanup in afterEach()
- [ ] No hardcoded delays/timeouts
- [ ] Tests are independent (no order dependencies)

---

## Resources

- **Vitest Docs**: https://vitest.dev
- **Test Structure**: `src/__tests__/integration/README.md`
- **Test Helpers**: `src/__tests__/integration/testHelpers.ts`
- **Fixtures**: `src/__tests__/integration/fixtures.ts`
- **CLAUDE.md**: Project architecture and conventions

---

## Questions & Support

For test-related questions:

1. Check `src/__tests__/integration/README.md` for test docs
2. Review example tests in same directory
3. Use test helpers in `testHelpers.ts`
4. Enable debug logging with `TestLogger`
5. Run with verbose output: `npm test -- --reporter=verbose`

---

**Last Updated:** April 24, 2026

**Test Coverage:** 5 integration test suites covering 100+ scenarios

**Maintenance:** Review quarterly, update when features change
